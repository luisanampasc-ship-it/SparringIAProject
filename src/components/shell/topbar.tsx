"use client";

import { Archive, Bell, CheckCircle2, Menu, Moon, RefreshCw, Search, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/app-state";
import { Popover } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";
import { DateRangePicker } from "./date-range";
import { NAV_ITEMS } from "./sidebar";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
      aria-label="Cambiar tema"
    >
      {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}

function Notifications() {
  const { notifications, archiveNotification, toast } = useApp();
  const [tab, setTab] = useState<"activas" | "archivadas">("activas");
  const router = useRouter();
  const active = notifications.filter((n) => !n.archived);
  const list = notifications.filter((n) => (tab === "activas" ? !n.archived : n.archived));
  return (
    <Popover
      className="w-80"
      trigger={(_, toggle) => (
        <button onClick={toggle} className="relative grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text" aria-label="Notificaciones">
          <Bell className="size-4" />
          {active.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[9px] font-bold text-white">
              {active.length > 9 ? "9+" : active.length}
            </span>
          )}
        </button>
      )}
    >
      {(close) => (
        <div>
          <div className="flex items-center justify-between px-4 pt-3">
            <p className="text-sm font-semibold text-text">Notificaciones</p>
            <button onClick={() => toast("Notificaciones actualizadas")} className="flex items-center gap-1 text-xs text-muted hover:text-text">
              <RefreshCw className="size-3" /> Actualizar
            </button>
          </div>
          <div className="mt-2 grid grid-cols-2 border-b border-border text-xs">
            {(["activas", "archivadas"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("-mb-px border-b-2 py-2 capitalize", tab === t ? "border-primary font-medium text-primary-text" : "border-transparent text-muted")}>
                {t}
              </button>
            ))}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {list.length === 0 && <p className="p-6 text-center text-xs text-muted">No hay notificaciones.</p>}
            {list.map((n) => (
              <div key={n.id} className="group flex gap-3 border-b border-border px-4 py-3 hover:bg-surface-2">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-good" />
                <button
                  className="flex-1 text-left"
                  onClick={() => {
                    if (n.sessionId) router.push(`/llamadas?id=${n.sessionId}`);
                    close();
                  }}
                >
                  <p className="text-xs font-semibold text-text">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                  <p className="mt-1 text-[11px] text-faint">{timeAgo(n.date)}</p>
                </button>
                <button onClick={() => archiveNotification(n.id)} className="h-fit rounded p-1 text-faint opacity-0 group-hover:opacity-100 hover:text-text" title={n.archived ? "Restaurar" : "Archivar"}>
                  <Archive className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Popover>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { sessions, personas } = useApp();
  const [q, setQ] = useState("");
  const router = useRouter();
  const results = useMemo(() => {
    const s = q.toLowerCase().trim();
    const pages = NAV_ITEMS.filter((p) => !s || p.label.toLowerCase().includes(s)).map((p) => ({ id: p.href, label: p.label, kind: "Página", href: p.href }));
    const calls = sessions
      .filter((x) => s && x.prospectName.toLowerCase().includes(s))
      .slice(0, 6)
      .map((x) => ({ id: x.id, label: `${x.prospectName} · ${x.score}/100`, kind: x.type === "real" ? "Llamada" : "Roleplay", href: `/llamadas?id=${x.id}` }));
    const ps = personas
      .filter((p) => s && (p.name + p.role + p.sector).toLowerCase().includes(s))
      .slice(0, 4)
      .map((p) => ({ id: p.id, label: `${p.name} — ${p.role}`, kind: "Prospecto IA", href: `/simulador?persona=${p.id}` }));
    return [...calls, ...ps, ...pages];
  }, [q, sessions, personas]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search className="size-4 text-muted" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                router.push(results[0].href);
                onClose();
              }
            }}
            placeholder="Buscar llamadas, sesiones, prospectos o páginas…"
            className="h-12 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-faint"
          />
          <kbd className="rounded border border-border px-1.5 text-[10px] text-faint">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {results.map((r) => (
            <button
              key={r.kind + r.id}
              onClick={() => {
                router.push(r.href);
                onClose();
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-surface-2"
            >
              {r.label}
              <span className="text-[11px] text-faint">{r.kind}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Topbar({ onMenu, showRange = true }: { onMenu: () => void; showRange?: boolean }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur lg:px-6">
      <button className="rounded p-1.5 text-muted lg:hidden" onClick={onMenu} aria-label="Abrir menú">
        <Menu className="size-5" />
      </button>
      <button
        onClick={() => setPaletteOpen(true)}
        className="flex h-8 w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs text-faint hover:border-primary/40"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Buscar llamadas y sesiones…</span>
        <kbd className="hidden rounded border border-border px-1 text-[10px] sm:inline">⌘K</kbd>
      </button>
      <div className="ml-auto flex items-center gap-1.5">
        {showRange && <DateRangePicker />}
        <ThemeToggle />
        <Notifications />
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}
