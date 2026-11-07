"use client";

import {
  AlertCircle, ArrowLeft, Check, Clock, Copy, FileDown, History, Link2, Loader2, Pencil, RotateCw, Search, Sparkles, Star, Target, Thermometer, User, XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-state";
import { ObjectionScript } from "@/components/objection-script";
import { Badge, Button, Card, InfoTip, Modal, ProgressBar, ScoreBadge, SectionLabel, Select, Tabs } from "@/components/ui";
import { CALL_TYPES, callTypeLabel, OUTCOMES, REPS, skillDescription } from "@/lib/catalog";
import type { CallType, Outcome, Session } from "@/lib/types";
import { cn, formatLongDate, formatTime, scoreTone, toneText } from "@/lib/utils";
import { WaveformPlayer, type PlayerHandle } from "./player";

type Tab = "resumen" | "feedback" | "transcripcion";

export function CallDetail({ session, onBack }: { session: Session; onBack: () => void }) {
  const { rubrics, setOutcome, updateSession, toast, notes, setNote } = useApp();
  const [tab, setTab] = useState<Tab>("resumen");
  const [outcomeOpen, setOutcomeOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const player = useRef<PlayerHandle>(null);
  const outcome = OUTCOMES.find((o) => o.id === session.outcome)!;
  const a = session.analysis;
  const rubric = rubrics[session.callType];

  useEffect(() => setTab("resumen"), [session.id]);

  const copy = (text: string, msg: string) => {
    navigator.clipboard?.writeText(text).then(() => toast(msg), () => toast("No se pudo copiar"));
  };

  const reanalyze = () => {
    updateSession(session.id, { status: "procesando" });
    toast("Reanalizando con los criterios actuales…");
    setTimeout(() => {
      const jitter = Math.round((Math.random() - 0.5) * 6);
      updateSession(session.id, { status: "analizada", versions: session.versions + 1, score: Math.max(0, Math.min(100, session.score + jitter)) });
      toast("Nueva versión del análisis lista");
    }, 2500);
  };

  if (session.status === "procesando") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="font-medium text-text">Analizando la llamada con {session.prospectName}…</p>
        <p className="max-w-sm text-sm text-muted">Transcribiendo, identificando hablantes y evaluando con tu rúbrica. Te avisaremos en la campana cuando esté listo.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-6">
      {/* Cabecera */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex gap-2">
          <Button size="sm" onClick={onBack}>
            <ArrowLeft className="size-3.5" /> Volver
          </Button>
          <Button size="sm" onClick={reanalyze}>
            <RotateCw className="size-3.5" /> Reanalizar
          </Button>
        </div>
        {session.status === "analizada" && <ScoreBadge score={session.score} size="lg" />}
      </div>
      <div className="mt-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-text">
          {session.prospectName}
          <button onClick={() => setEditOpen(true)} className="text-faint hover:text-text" aria-label="Editar nombre">
            <Pencil className="size-3.5" />
          </button>
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>
            {formatLongDate(session.date)} a las {formatTime(session.date)} · {callTypeLabel(session.callType)} · {REPS.find((r) => r.id === session.repId)?.name ?? "Sin asignar"}
          </span>
          <div className="relative">
            <button onClick={() => setOutcomeOpen((o) => !o)}>
              <Badge className={outcome.badge}>{outcome.label}</Badge>
            </button>
            {outcomeOpen && (
              <div className="absolute top-full left-0 z-30 mt-2 w-64 rounded-xl border border-border bg-surface p-3 shadow-xl">
                <p className="text-xs font-semibold text-text">Cambiar resultado</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">
                  La IA solo conoce lo que ocurre durante la llamada. Úsalo cuando el deal se cierre o se pierda <b>después</b> (email, WhatsApp, otra reunión). Las métricas se actualizan al instante.
                </p>
                <p className="mt-3 mb-1 text-[10px] font-semibold tracking-wider text-faint uppercase">Marcar como</p>
                {OUTCOMES.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setOutcome(session.id, o.id as Outcome);
                      setOutcomeOpen(false);
                      toast(`Resultado actualizado a "${o.label}"`);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-text hover:bg-surface-2"
                  >
                    <span className={cn("size-2 rounded-full", o.dot)} />
                    <span className="flex-1 text-left">{o.label}</span>
                    {session.outcome === o.id && <Check className="size-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {session.outcomeSource === "manual" && <span className="text-[10px] font-bold tracking-wider text-primary-text">MANUAL</span>}
          <button onClick={() => setEditOpen(true)} className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] hover:text-text">
            <Pencil className="size-3" /> Editar
          </button>
        </div>
      </div>

      {session.versions > 1 && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-primary-soft/60 px-4 py-2 text-xs text-text">
          Hay {session.versions - 1} versión{session.versions > 2 ? "es" : ""} anterior{session.versions > 2 ? "es" : ""} de este análisis.
          <Button size="sm" onClick={() => setHistoryOpen(true)} className="border-primary/40 text-primary-text">
            <History className="size-3.5" /> Ver historial
          </Button>
        </div>
      )}

      <div className="mt-4">
        <WaveformPlayer ref={player} audioUrl={session.audioUrl} durationSec={session.durationMin * 60} seed={session.id} />
        {!session.hasAudio && <p className="mt-1 text-[11px] text-faint">Analizada desde transcripción: sin análisis de tono.</p>}
      </div>

      {!a ? (
        <Card className="mt-6 flex flex-col items-center gap-3 p-10 text-center">
          <AlertCircle className="size-6 text-bad" />
          <p className="font-medium text-text">Esta llamada todavía no tiene análisis</p>
          <Button variant="primary" onClick={reanalyze}>
            <Sparkles className="size-4" /> Analizar ahora
          </Button>
        </Card>
      ) : (
        <>
          <Tabs
            className="mt-6"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "resumen", label: "Resumen" },
              { value: "feedback", label: "Feedback" },
              { value: "transcripcion", label: "Transcripción" },
            ]}
          />

          {tab === "resumen" && (
            <div className="mt-4 space-y-4">
              <Block title="Contexto de la llamada">{a.context}</Block>
              <Block title="Fortalezas observadas" dot="bg-good" titleClass="text-good">
                {a.strengths}
              </Block>
              <Block title="Respuesta del cliente" dot="bg-warn">
                {a.clientResponse}
              </Block>
              <Block title="Impresión general" dot="bg-primary">
                {a.overall}
              </Block>

              {a.tone && (
                <Card className="p-5">
                  <h3 className="mb-3 text-sm font-semibold text-text">Análisis de tono</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                    <ToneStat label="Ratio de habla" value={`${a.tone.talkRatio}%`} hint="del comercial" />
                    <ToneStat label="Pausas largas" value={a.tone.pauses} />
                    <ToneStat label="Energía" value={`${a.tone.energy}%`} />
                    <ToneStat label="Cercanía" value={`${a.tone.warmth}%`} />
                    <ToneStat label="Control" value={`${a.tone.control}%`} />
                  </div>
                </Card>
              )}

              <Card className="p-5">
                <h3 className="mb-4 text-sm font-semibold text-text">Puntuaciones</h3>
                <div className="space-y-4">
                  {rubric.map((c) => {
                    const v = session.subScores[c.key];
                    return (
                      <div key={c.key}>
                        <div className="flex justify-between text-sm">
                          <span className="text-text">
                            {c.name} <span className="text-[11px] text-faint">· peso {c.weight}%</span>
                          </span>
                          <span className={cn("font-semibold", toneText[scoreTone((v / 25) * 100)])}>{v}/25</span>
                        </div>
                        <ProgressBar value={v} max={25} className="mt-1.5" />
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-5">
                <SectionLabel>Acciones rápidas</SectionLabel>
                <div className="space-y-0.5">
                  <Action icon={Link2} label="Copiar enlace" onClick={() => copy(`${location.origin}/llamadas?id=${session.id}`, "Enlace copiado")} />
                  <Action icon={Copy} label="Copiar transcripción" onClick={() => copy(session.transcript.map((l) => `${l.speaker === "rep" ? "Comercial" : "Prospecto"}: ${l.text}`).join("\n"), "Transcripción copiada")} />
                  <Action icon={Sparkles} label="Resumen de sesión (IA)" onClick={() => setSummaryOpen((o) => !o)} active={summaryOpen} />
                  <Action icon={FileDown} label="Exportar PDF" onClick={() => window.print()} />
                  <Action icon={Copy} label="Copiar resumen del análisis" onClick={() => copy([a.context, a.overall, a.globalFeedback, a.nextStep].join("\n\n"), "Resumen del análisis copiado")} />
                </div>
                {summaryOpen && (
                  <div className="mt-3 rounded-lg border-l-2 border-primary bg-primary-soft/40 p-4 text-sm leading-relaxed text-text">
                    {a.summary}
                    <button onClick={() => copy(a.summary, "Resumen copiado")} className="mt-2 block text-xs font-medium text-primary-text">
                      Copiar resumen
                    </button>
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <h3 className="mb-2 text-sm font-semibold text-text">Notas</h3>
                <textarea
                  value={notes[session.id] ?? ""}
                  onChange={(e) => setNote(session.id, e.target.value)}
                  placeholder="Añade notas o comentarios sobre esta llamada (se guardan automáticamente)."
                  className="h-24 w-full resize-y rounded-lg border border-border bg-surface-2 p-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30"
                />
              </Card>
            </div>
          )}

          {tab === "feedback" && (
            <div className="mt-4 space-y-4">
              <Card className="border-warn/40 bg-warn-soft/50 p-5">
                <div className="flex gap-3">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-warn" />
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed font-semibold text-text">Evaluación global: {a.globalFeedback}</p>
                    <p className="mt-2 text-sm text-muted">
                      {a.priority.split(a.prioritySkill)[0]}
                      <span className="font-medium text-primary-text">
                        {a.prioritySkill} <InfoTip label={a.prioritySkill} text={skillDescription(a.prioritySkill)} />
                      </span>
                      {a.priority.split(a.prioritySkill)[1]}
                    </p>
                  </div>
                  <Badge className="h-fit bg-warn-soft text-warn">{session.score}/100</Badge>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-warn">
                  <Clock className="size-4" /> Áreas en desarrollo
                </h3>
                <div className="space-y-4">
                  {a.developmentAreas.map((d) => (
                    <div key={d.skill}>
                      <p className="text-sm font-semibold text-text">
                        Exploración de <span className="text-primary-text">{d.skill}</span> <InfoTip label={d.skill} text={skillDescription(d.skill)} />
                      </p>
                      <p className="mt-1 text-xs text-muted italic">&ldquo;{d.quote}&rdquo;</p>
                      <p className="mt-1 text-xs text-muted">
                        <b className="text-text">Impacto:</b> {d.impact}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-primary-text">
                  <span className="flex items-center gap-2">
                    <Star className="size-4" /> Momentos clave
                  </span>
                  <span className="text-xs text-faint">{session.moments.length}</span>
                </h3>
                <div className="space-y-3">
                  {session.moments.map((m, i) => (
                    <div key={i} className="rounded-lg border border-border p-4">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">
                        <Badge className={m.level === "Alta" ? "bg-bad-soft text-bad" : m.level === "Media" ? "bg-warn-soft text-warn" : "bg-good-soft text-good"}>{m.level}</Badge>
                        <Badge className={m.kind === "fuerte" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}>{m.kind === "fuerte" ? "Fuerte" : "A mejorar"}</Badge>
                        {m.title}
                        <button onClick={() => player.current?.seek(m.t)} className="ml-auto text-[11px] font-normal text-primary-text">
                          ▶ {Math.floor(m.t / 60)}:{String(m.t % 60).padStart(2, "0")}
                        </button>
                      </p>
                      <div className="mt-3 space-y-2">
                        <Quote who="Comercial" text={m.repQuote} cls="border-primary bg-primary-soft/40" />
                        {m.prospectQuote && <Quote who="Prospecto" text={m.prospectQuote} cls="border-good bg-good-soft/50" />}
                      </div>
                      <p className="mt-2 text-xs text-muted">{m.explanation}</p>
                      <p className="mt-1 text-xs text-text">
                        <b className="text-primary-text">Sugerencia:</b> {m.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-warn">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="size-4" /> Auditoría de objeciones
                  </span>
                  <span className="text-xs text-faint">{session.objections.length}</span>
                </h3>
                <div className="space-y-4">
                  {session.objections.map((o, i) => (
                    <div key={i}>
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text">
                          {o.category} <span className="text-[11px] font-normal text-faint">vía {o.detectedVia}</span>
                        </p>
                        <Badge className={o.quality === "bien" ? "bg-good-soft text-good" : o.quality === "regular" ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad"}>{o.quality.toUpperCase()}</Badge>
                      </div>
                      <ObjectionScript script={o.script} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-bad/40 p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-bad">
                  <XCircle className="size-4" /> Oportunidades perdidas
                </h3>
                {a.missedOpportunities.map((m, i) => (
                  <p key={i} className="rounded-lg bg-bad-soft/60 p-3 text-sm text-text">
                    {m}
                  </p>
                ))}
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
                  <Thermometer className="size-4 text-primary" /> Calidad del prospecto
                </h3>
                <div className="flex items-center gap-3">
                  <Badge className={session.prospectQuality === "caliente" ? "bg-good-soft text-good" : session.prospectQuality === "tibio" ? "bg-warn-soft text-warn" : "bg-bad-soft text-bad"}>
                    {session.prospectQuality.toUpperCase()}
                  </Badge>
                  <ProgressBar value={session.prospectQuality === "caliente" ? 85 : session.prospectQuality === "tibio" ? 55 : 20} className="flex-1" />
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="mb-3 flex items-center justify-between text-sm font-semibold text-warn">
                  <span className="flex items-center gap-2">
                    <Clock className="size-4" /> Análisis del resultado
                  </span>
                  <Badge className={outcome.badge}>{outcome.label}</Badge>
                </h3>
                <SectionLabel>Razonamiento</SectionLabel>
                <p className="mb-3 text-sm text-text">{a.outcomeReasoning}</p>
                <SectionLabel>Próximo paso recomendado</SectionLabel>
                <p className="text-sm text-text">{a.nextStep}</p>
              </Card>

              <Card className="border-primary/40 bg-primary-soft/30 p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-primary-text">
                  <Target className="size-4" /> Cómo podrías haber aumentado las probabilidades de cierre
                </h3>
                <p className="mt-1 text-[11px] text-muted">Sugerencias basadas en el análisis. No son garantías, sino palancas con buen fundamento.</p>
                <p className="mt-3 text-sm text-text">
                  <b>Objetivo:</b> {a.closeObjective}
                </p>
                <SectionLabel>
                  <span className="mt-3 block">Razón principal del fallo</span>
                </SectionLabel>
                <p className="text-sm text-text">{a.mainFailure}</p>
                <SectionLabel>
                  <span className="mt-3 block">Palancas</span>
                </SectionLabel>
                <ul className="space-y-1.5">
                  {a.levers.map((l) => (
                    <li key={l} className="flex gap-2 text-sm text-text">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {l}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {tab === "transcripcion" && <Transcript session={session} onSeek={(t) => player.current?.seek(t)} />}
        </>
      )}

      <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} session={session} />
      <EditModal open={editOpen} onClose={() => setEditOpen(false)} session={session} />
    </div>
  );
}

function Block({ title, children, dot, titleClass }: { title: string; children: React.ReactNode; dot?: string; titleClass?: string }) {
  return (
    <Card className="p-5">
      <h3 className={cn("mb-2 flex items-center gap-2 text-sm font-semibold text-text", titleClass)}>
        {dot && <span className={cn("size-2 rounded-full", dot)} />}
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted">{children}</p>
    </Card>
  );
}

function ToneStat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-lg font-bold text-text">{value}</p>
      {hint && <p className="text-[10px] text-faint">{hint}</p>}
    </div>
  );
}

function Action({ icon: Icon, label, onClick, active }: { icon: React.ElementType; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm hover:bg-surface-2", active ? "text-primary-text" : "text-text")}>
      <Icon className="size-4 text-muted" /> {label}
    </button>
  );
}

function Quote({ who, text, cls }: { who: string; text: string; cls: string }) {
  return (
    <div className={cn("rounded-md border-l-2 px-3 py-2", cls)}>
      <p className="text-[10px] font-bold text-muted">{who}</p>
      <p className="text-xs text-text italic">&ldquo;{text}&rdquo;</p>
    </div>
  );
}

function Transcript({ session, onSeek }: { session: Session; onSeek: (t: number) => void }) {
  const [q, setQ] = useState("");
  const objQuotes = session.objections.map((o) => o.quote);
  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-surface px-3">
        <Search className="size-4 text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en la transcripción…" className="h-9 flex-1 bg-transparent text-sm text-text outline-none" />
      </div>
      <Card className="divide-y divide-border">
        {session.transcript
          .filter((l) => !q || l.text.toLowerCase().includes(q.toLowerCase()))
          .map((l, i) => {
            const isObj = objQuotes.includes(l.text);
            return (
              <div key={i} className={cn("flex gap-3 px-4 py-3", isObj && "bg-warn-soft/50")}>
                <button onClick={() => onSeek(l.t)} className="w-10 shrink-0 pt-0.5 text-left text-[11px] text-primary-text tabular-nums">
                  {Math.floor(l.t / 60)}:{String(l.t % 60).padStart(2, "0")}
                </button>
                <div>
                  <p className={cn("flex items-center gap-1 text-[11px] font-semibold", l.speaker === "rep" ? "text-primary-text" : "text-good")}>
                    <User className="size-3" /> {l.speaker === "rep" ? "Comercial" : "Prospecto"}
                    {isObj && <Badge className="ml-1 bg-warn-soft text-warn">Objeción</Badge>}
                  </p>
                  <p className="text-sm text-text">{l.text}</p>
                </div>
              </div>
            );
          })}
      </Card>
    </div>
  );
}

function HistoryModal({ open, onClose, session }: { open: boolean; onClose: () => void; session: Session }) {
  const versions = Array.from({ length: session.versions }, (_, i) => {
    const d = new Date(session.date);
    d.setHours(d.getHours() + i * 5);
    return { n: i + 1, date: d, score: i === session.versions - 1 ? session.score : Math.max(0, session.score - 4 + i * 2) };
  }).reverse();
  return (
    <Modal open={open} onClose={onClose} title="Historial de análisis" subtitle="Cada vez que reanalizas se guarda una versión nueva.">
      <div className="space-y-2">
        {versions.map((v, i) => (
          <div key={v.n} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <ScoreBadge score={v.score} size="sm" />
            <div className="flex-1">
              <p className="text-sm font-medium text-text">
                Versión {v.n} {i === 0 && <Badge className="ml-1 bg-primary-soft text-primary-text">Actual</Badge>}
              </p>
              <p className="text-[11px] text-muted">
                {formatLongDate(v.date)} · {formatTime(v.date)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function EditModal({ open, onClose, session }: { open: boolean; onClose: () => void; session: Session }) {
  const { updateSession, toast } = useApp();
  const [name, setName] = useState(session.prospectName);
  const [rep, setRep] = useState(session.repId ?? "none");
  const [ct, setCt] = useState<CallType>(session.callType);
  useEffect(() => {
    setName(session.prospectName);
    setRep(session.repId ?? "none");
    setCt(session.callType);
  }, [session]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Editar llamada"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              updateSession(session.id, { prospectName: name, repId: rep === "none" ? null : rep, callType: ct });
              toast("Cambios guardados");
              onClose();
            }}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block text-xs text-muted">
          Nombre del prospecto
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30" />
        </label>
        <Select label="Comercial" value={rep} onChange={setRep} options={[...REPS.map((r) => ({ value: r.id, label: r.name })), { value: "none", label: "Sin asignar" }]} />
        <div>
          <Select label="Tipo" value={ct} onChange={setCt} options={CALL_TYPES.map((c) => ({ value: c.id, label: c.label }))} />
        </div>
      </div>
    </Modal>
  );
}
