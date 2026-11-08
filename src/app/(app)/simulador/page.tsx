"use client";

import { Copy, MoreVertical, Pencil, Play, Search, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useApp } from "@/components/app-state";
import { CreateProspectMenu } from "@/components/simulator/create-prospect";
import { CallScreen, TrainingConfigModal, type Difficulty } from "@/components/simulator/training";
import { PersonaAvatar } from "@/components/persona-face";
import { Badge, Card, Modal, PageHeader, Popover, ProgressBar, Select } from "@/components/ui";
import { CURRENT_USER, REPS } from "@/lib/catalog";
import { minutesUsedThisMonth } from "@/lib/insights";
import type { CallType, Persona } from "@/lib/types";

function SimuladorInner() {
  const { personas, removePersona, addPersona, toast, sessions, minuteLimits } = useApp();
  const limit = minuteLimits[CURRENT_USER.id] ?? 0;
  const used = minutesUsedThisMonth(sessions, CURRENT_USER.id);
  const params = useSearchParams();
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("all");
  const [sector, setSector] = useState("all");
  const [configFor, setConfigFor] = useState<Persona | null>(() => personas.find((p) => p.id === params.get("persona")) ?? null);
  const [call, setCall] = useState<{ persona: Persona; config: { difficulty: Difficulty; callType: CallType } } | null>(null);
  const [guide, setGuide] = useState(false);
  const focus = params.get("focus");

  const sectors = useMemo(() => [...new Set(personas.map((p) => p.sector))], [personas]);
  const list = personas.filter(
    (p) =>
      (owner === "all" || p.createdBy === owner) &&
      (sector === "all" || p.sector === sector) &&
      (!q || `${p.name} ${p.role} ${p.sector} ${p.company}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      <PageHeader
        title="Simulador IA"
        subtitle={
          <>
            Practica tu pitch de ventas con prospectos de IA realistas.
            <br />
            <button onClick={() => setGuide(true)} className="text-primary-text hover:underline">
              ¿Necesitas ayuda con el simulador? Ver guía
            </button>
          </>
        }
        right={<CreateProspectMenu />}
      />

      <Card className="mb-4 flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">
            Tus minutos de simulador este mes: <b className="text-text">{used}</b> de <b className="text-text">{limit} min</b>
            {used >= limit && <span className="ml-2 font-semibold text-bad">· Límite alcanzado: pide a tu manager que lo amplíe en Equipo</span>}
          </p>
          <ProgressBar value={used} max={Math.max(1, limit)} tone={used >= limit ? "bad" : used / Math.max(1, limit) > 0.8 ? "warn" : "primary"} className="mt-1.5" />
        </div>
      </Card>

      {focus && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-primary-soft/50 px-4 py-2 text-sm text-text">
          🎯 Práctica sugerida: <b>{focus}</b>. Elige un prospecto y configura la dificultad en &ldquo;Difícil&rdquo; para entrenarla.
        </div>
      )}

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="flex min-w-60 flex-1 items-center gap-2 px-2">
          <Search className="size-4 text-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, cargo, sector…" className="h-8 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-faint" />
        </div>
        <Select value={owner} onChange={setOwner} options={[{ value: "all", label: "Todo el equipo" }, ...REPS.map((r) => ({ value: r.id, label: `Creados por ${r.name.split(" ")[0]}` }))]} />
        <Select value={sector} onChange={setSector} options={[{ value: "all", label: "Todos los sectores" }, ...sectors.map((s) => ({ value: s, label: s }))]} />
      </Card>
      <p className="mb-3 text-xs text-faint">
        Mostrando {list.length} de {personas.length} prospectos
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <Card key={p.id} className="group overflow-hidden transition hover:border-primary/40 hover:shadow-lg">
            <div className="relative grid h-24 place-items-center bg-primary-soft">
              <Badge className="absolute top-2 left-2 bg-surface text-primary-text">{p.segment}</Badge>
              <div className="absolute top-2 right-2">
                <Popover
                  className="w-40 p-1"
                  trigger={(_, toggle) => (
                    <button onClick={toggle} className="rounded-md bg-surface p-1 text-muted" aria-label="Opciones">
                      <MoreVertical className="size-3.5" />
                    </button>
                  )}
                >
                  {(close) => (
                    <div className="text-xs">
                      <button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-text hover:bg-surface-2" onClick={() => { setConfigFor(p); close(); }}>
                        <Pencil className="size-3" /> Ver / editar
                      </button>
                      <button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-text hover:bg-surface-2" onClick={() => { addPersona({ ...p, id: `p${Date.now()}`, name: `${p.name} (copia)` }); toast("Prospecto duplicado"); close(); }}>
                        <Copy className="size-3" /> Duplicar
                      </button>
                      <button className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-bad hover:bg-bad-soft" onClick={() => { removePersona(p.id); toast("Prospecto eliminado"); close(); }}>
                        <Trash2 className="size-3" /> Eliminar
                      </button>
                    </div>
                  )}
                </Popover>
              </div>
              <PersonaAvatar persona={p} ring className="absolute -bottom-7 left-4 size-16" />
            </div>
            <div className="p-4 pt-9">
              <p className="font-semibold text-text">{p.name}</p>
              <Badge className="mt-1 bg-primary-soft text-primary-text">{p.role}</Badge>
              <p className="mt-2 line-clamp-2 text-xs text-muted">{p.description}</p>
              <p className="mt-2 text-[10px] tracking-wide text-faint uppercase">
                {p.company} · {p.segment}
              </p>
            </div>
            <button onClick={() => setConfigFor(p)} className="flex w-full items-center justify-center gap-1.5 border-t border-border py-2.5 text-xs font-medium text-text hover:bg-primary-soft hover:text-primary-text">
              <Play className="size-3" /> Iniciar sesión
            </button>
          </Card>
        ))}
      </div>

      <TrainingConfigModal
        persona={configFor}
        onClose={() => setConfigFor(null)}
        onStart={(config) => {
          if (configFor) setCall({ persona: configFor, config });
          setConfigFor(null);
        }}
      />
      {call && <CallScreen persona={call.persona} config={call.config} onExit={() => setCall(null)} />}

      <Modal open={guide} onClose={() => setGuide(false)} title="Cómo usar el simulador">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
          <li>Elige un prospecto de la lista o crea uno nuevo (con IA, a mano, desde una web o desde una grabación).</li>
          <li>Configura la dificultad y el tipo de llamada que quieres practicar.</li>
          <li>Pulsa &ldquo;Iniciar entrenamiento&rdquo;, permite el micrófono y habla como en una llamada real.</li>
          <li>Al colgar, la IA analiza la sesión con los mismos criterios que tus llamadas reales.</li>
          <li>Cuando termines de hablar, haz una breve pausa: el prospecto espera a que acabes antes de responder. Si le interrumpes, se calla y te escucha.</li>
          <li>Cada minuto de práctica consume un minuto de créditos y cuenta para tu límite mensual de minutos.</li>
        </ol>
      </Modal>
    </div>
  );
}

export default function SimuladorPage() {
  return (
    <Suspense>
      <SimuladorInner />
    </Suspense>
  );
}
