"use client";

import { CheckSquare, RefreshCw, Square, Trash2, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-state";
import { Button, Select } from "@/components/ui";
import { CALL_TYPES, callTypeColor, callTypeLabel, OUTCOMES, REPS } from "@/lib/catalog";
import type { CallType, Outcome, Session } from "@/lib/types";
import { cn, formatLongDate, formatTime, scoreTone, toneSoft } from "@/lib/utils";

export type LibTab = "real" | "roleplay" | "subir";

function dayLabel(d: Date) {
  const today = new Date();
  const y = new Date();
  y.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "HOY";
  if (d.toDateString() === y.toDateString()) return "AYER";
  return formatLongDate(d).toUpperCase();
}

export function Library({ tab, setTab, selectedId, onSelect }: { tab: LibTab; setTab: (t: LibTab) => void; selectedId: string | null; onSelect: (id: string) => void }) {
  const { sessions, removeSessions, updateSession, toast } = useApp();
  const [scoreF, setScoreF] = useState("all");
  const [repF, setRepF] = useState("all");
  const [more, setMore] = useState(false);
  const [ctF, setCtF] = useState<CallType | "all">("all");
  const [outF, setOutF] = useState<Outcome | "all">("all");
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);

  const list = useMemo(() => {
    const type = tab === "subir" ? "real" : tab;
    return sessions.filter((s) => {
      if (s.type !== type) return false;
      if (repF !== "all" && (repF === "none" ? s.repId !== null : s.repId !== repF)) return false;
      if (ctF !== "all" && s.callType !== ctF) return false;
      if (outF !== "all" && s.outcome !== outF) return false;
      if (scoreF === "high" && s.score < 70) return false;
      if (scoreF === "mid" && (s.score < 50 || s.score >= 70)) return false;
      if (scoreF === "low" && (s.score >= 50 || s.status !== "analizada")) return false;
      return true;
    });
  }, [sessions, tab, repF, ctF, outF, scoreF]);

  const groups = useMemo(() => {
    const m = new Map<string, Session[]>();
    list.forEach((s) => {
      const k = dayLabel(s.date);
      m.set(k, [...(m.get(k) ?? []), s]);
    });
    return [...m.entries()];
  }, [list]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 p-4 pb-2">
        <div>
          <h2 className="font-semibold text-text">Biblioteca de llamadas</h2>
          <p className="text-[11px] text-faint">Grabaciones, sesiones IA y subidas</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => {
              setSelecting((s) => !s);
              setPicked([]);
            }}
            className={cn("flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px]", selecting ? "bg-primary-soft text-primary-text" : "text-muted")}
          >
            <CheckSquare className="size-3" /> Seleccionar
          </button>
          <button onClick={() => toast("Biblioteca actualizada")} className="rounded-md p-1.5 text-muted hover:bg-surface-2" aria-label="Refrescar">
            <RefreshCw className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="flex gap-1 px-4">
        {(
          [
            ["real", "Llamadas reales"],
            ["roleplay", "Roleplays IA"],
            ["subir", "Subir"],
          ] as const
        ).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={cn("flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap", tab === v ? "bg-primary text-white" : "text-muted hover:bg-surface-2")}
          >
            {v === "subir" && <Upload className="size-3" />}
            {l}
          </button>
        ))}
      </div>

      {tab === "subir" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <Upload className="size-6 text-faint" />
          <p className="text-sm font-medium text-text">Sube tu llamada</p>
          <p className="text-xs text-muted">Arrastra un audio o pega una transcripción en el panel de la derecha.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 px-4 pt-3">
            <Select
              className="w-full [&_select]:w-full"
              value={scoreF}
              onChange={setScoreF}
              options={[
                { value: "all", label: "Todas las puntuaciones" },
                { value: "high", label: "70 – 100 (buenas)" },
                { value: "mid", label: "50 – 69 (regulares)" },
                { value: "low", label: "0 – 49 (a revisar)" },
              ]}
            />
            <Select
              className="w-full [&_select]:w-full"
              value={repF}
              onChange={setRepF}
              options={[{ value: "all", label: "Todos los comerciales" }, ...REPS.map((r) => ({ value: r.id, label: r.name })), { value: "none", label: "Sin asignar" }]}
            />
            <button onClick={() => setMore((m) => !m)} className="w-full rounded-lg border border-border px-3 py-1.5 text-left text-xs text-muted">
              {more ? "− Menos filtros" : "+ Más filtros"}
            </button>
            {more && (
              <>
                <Select className="w-full [&_select]:w-full" value={ctF} onChange={setCtF} options={[{ value: "all", label: "Todos los tipos" }, ...CALL_TYPES.map((c) => ({ value: c.id, label: c.label }))]} />
                <Select className="w-full [&_select]:w-full" value={outF} onChange={setOutF} options={[{ value: "all", label: "Todos los resultados" }, ...OUTCOMES.map((o) => ({ value: o.id, label: o.label }))]} />
              </>
            )}
            <p className="text-center text-[11px] text-faint">{list.length} sesiones</p>
          </div>

          {selecting && picked.length > 0 && (
            <div className="mx-4 mb-2 flex items-center justify-between rounded-lg bg-primary-soft px-3 py-2 text-xs text-primary-text">
              <span>{picked.length} seleccionadas</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => {
                    picked.forEach((id) => {
                      const s = sessions.find((x) => x.id === id);
                      if (s) updateSession(id, { versions: s.versions + 1 });
                    });
                    toast(`${picked.length} sesiones enviadas a reanalizar`);
                    setPicked([]);
                  }}
                >
                  Reanalizar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    removeSessions(picked);
                    toast(`${picked.length} sesiones eliminadas`);
                    setPicked([]);
                  }}
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {groups.map(([label, items]) => (
              <div key={label}>
                <p className="px-2 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-faint">{label}</p>
                {items.map((s) => {
                  const rep = REPS.find((r) => r.id === s.repId);
                  const isPicked = picked.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => (selecting ? setPicked((p) => (isPicked ? p.filter((x) => x !== s.id) : [...p, s.id])) : onSelect(s.id))}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border-l-2 px-2 py-2 text-left transition",
                        selectedId === s.id ? "border-primary bg-primary-soft/50" : "border-transparent hover:bg-surface-2",
                      )}
                    >
                      {selecting && (isPicked ? <CheckSquare className="size-4 text-primary" /> : <Square className="size-4 text-faint" />)}
                      {s.status === "analizada" ? (
                        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-xs font-bold", toneSoft[scoreTone(s.score)])}>{s.score}</span>
                      ) : (
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-xs text-faint">{s.status === "procesando" ? "…" : "—"}</span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text">{s.prospectName}</span>
                        <span className="block text-[11px] text-primary-text">{rep?.name ?? "Sin asignar"}</span>
                        <span className={cn("block text-[11px] font-medium", callTypeColor[s.callType])}>{callTypeLabel(s.callType)}</span>
                        {s.status === "sin_analisis" && <span className="block text-[10px] font-bold text-bad">SIN ANÁLISIS</span>}
                        {s.status === "procesando" && <span className="block text-[10px] font-bold text-warn">PROCESANDO…</span>}
                        <span className="block text-[10px] text-faint">{formatTime(s.date)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
