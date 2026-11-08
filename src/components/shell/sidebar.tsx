"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap, LayoutDashboard, Mic, Phone, Plug, Settings, ClipboardList, Users, X,
} from "lucide-react";
import { useApp } from "@/components/app-state";
import { CURRENT_USER } from "@/lib/catalog";
import { minutesUsedThisMonth } from "@/lib/insights";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

const GROUPS = [
  { label: "Módulo 1 · Entrenamiento", items: [{ href: "/simulador", label: "Simulador IA", icon: Mic }] },
  {
    label: "Módulo 2 · Resultados",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/entrenamiento", label: "Centro de Entrenamiento", icon: GraduationCap },
      { href: "/llamadas", label: "Centro de Llamadas", icon: Phone },
    ],
  },
  {
    label: "Gestionar",
    items: [
      { href: "/integraciones", label: "Integraciones", icon: Plug },
      { href: "/criterios", label: "Criterios", icon: ClipboardList },
      { href: "/equipo", label: "Equipo", icon: Users },
      { href: "/cuenta", label: "Cuenta", icon: Settings },
    ],
  },
];

export const NAV_ITEMS = GROUPS.flatMap((g) => g.items);

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { credits, sessions, minuteLimits } = useApp();
  const total = 300;
  const myLimit = minuteLimits[CURRENT_USER.id] ?? 0;
  const myUsed = minutesUsedThisMonth(sessions, CURRENT_USER.id);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-sidebar text-sidebar-text transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
          <Logo />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Sparring IA</p>
            <p className="text-[11px] text-sidebar-text/70">Administrador</p>
          </div>
          <button className="ml-auto rounded p-1 lg:hidden" onClick={onClose} aria-label="Cerrar menú">
            <X className="size-4" />
          </button>
        </div>

        <div className="px-3">
          <Link
            href="/simulador"
            onClick={onClose}
            className="flex h-9 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-medium text-on-primary shadow-lg shadow-primary/30 hover:brightness-110"
          >
            <Mic className="size-4" /> Simulador IA
          </Link>
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto px-3">
          {GROUPS.map((g) => (
            <div key={g.label} className="mb-4">
              <p className="mb-1 px-2 text-[10px] font-semibold tracking-wider text-sidebar-text/50 uppercase">{g.label}</p>
              {g.items.map((it) => {
                const active = pathname.startsWith(it.href);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={onClose}
                    className={cn(
                      "mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition",
                      active ? "bg-sidebar-active font-medium text-white" : "hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <Icon className="size-4" />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mx-3 mb-3 rounded-lg border border-white/10 p-3">
          <p className="text-[10px] font-semibold tracking-wider text-sidebar-text/50 uppercase">Créditos</p>
          <div className="mt-1 flex justify-between text-xs">
            <span>Saldo</span>
            <span className="font-semibold text-white">{credits} min</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(credits / total) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-sidebar-text/60">Se renueva el día 24</p>
          <div className="mt-2.5 flex justify-between border-t border-white/10 pt-2 text-xs">
            <span>Tu límite mensual</span>
            <span className={cn("font-semibold", myUsed >= myLimit ? "text-bad" : "text-white")}>
              {Math.min(myUsed, myLimit)}/{myLimit} min
            </span>
          </div>
        </div>

        <Link href="/cuenta" onClick={onClose} className="flex items-center gap-2.5 border-t border-white/10 px-4 py-3 hover:bg-white/5">
          <span className="grid size-7 place-items-center rounded-full bg-primary text-[11px] font-semibold text-on-primary">{CURRENT_USER.initials}</span>
          <span className="text-sm font-medium text-white">{CURRENT_USER.name}</span>
        </Link>
      </aside>
    </>
  );
}
