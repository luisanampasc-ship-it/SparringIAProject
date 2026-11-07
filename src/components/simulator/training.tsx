"use client";

import { Check, Clock, Mic, MicOff, Phone, PhoneOff, Play, Users, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-state";
import { Avatar, Badge, Button, Modal } from "@/components/ui";
import { CURRENT_USER } from "@/lib/catalog";
import { simulateAnalyzedSession } from "@/lib/demo-data";
import type { CallType, Persona } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Difficulty = "facil" | "medio" | "dificil";

const DIFFICULTIES: { id: Difficulty; label: string; sub: string; dot: string }[] = [
  { id: "facil", label: "Fácil", sub: "Receptivo, pocas objeciones", dot: "bg-good" },
  { id: "medio", label: "Medio", sub: "Dudas reales, pide argumentos", dot: "bg-warn" },
  { id: "dificil", label: "Difícil", sub: "Escéptico y resistente", dot: "bg-bad" },
];

const CALL_CARDS: { id: CallType; icon: React.ElementType; title: string; en: string; time: string; intensity: string; intensityCls: string; text: string; checks: string[] }[] = [
  {
    id: "cold_call", icon: Phone, title: "Llamada en frío", en: "Cold call", time: "5-10 min", intensity: "ALTA", intensityCls: "text-bad",
    text: "No te conoce ni sabe por qué llamas. Tienes diez segundos para captar su atención y conseguir una reunión o la venta.",
    checks: ["Apertura en 10 segundos", "Gancho relevante y directo", "Manejar el rechazo inicial", "Agendar o cerrar en la llamada"],
  },
  {
    id: "cualificacion", icon: Users, title: "Llamada de cualificación", en: "Inbound / qualification", time: "15-20 min", intensity: "MEDIA", intensityCls: "text-warn",
    text: "Dejó sus datos en un formulario o en redes. Sabe quién eres, pero nunca habéis hablado. Cualifica el encaje y agenda la reunión de cierre.",
    checks: ["Preguntar por qué dejó sus datos", "Entender la situación actual", "Cualificar el encaje", "Agendar la videollamada de cierre"],
  },
  {
    id: "videollamada", icon: Video, title: "Videollamada de cierre", en: "Demo / closing call", time: "30-40 min", intensity: "BAJA", intensityCls: "text-good",
    text: "Reservó la reunión en tu agenda y ya hubo un primer contacto. Rompe el hielo, haz el diagnóstico, presenta y cierra.",
    checks: ["Romper el hielo", "Diagnóstico de situación y objetivo", "Pitch adaptado a sus dolores", "Cerrar en la misma llamada"],
  },
];

export function TrainingConfigModal({ persona, onClose, onStart }: { persona: Persona | null; onClose: () => void; onStart: (cfg: { difficulty: Difficulty; callType: CallType }) => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("medio");
  const [callType, setCallType] = useState<CallType | null>(null);
  const [more, setMore] = useState(false);
  if (!persona) return null;
  return (
    <Modal
      open
      wide
      onClose={onClose}
      title="Configurar entrenamiento"
      subtitle={
        <>
          Practicando con <span className="font-medium text-primary-text">{persona.name}</span> — elige cómo quieres entrenar
        </>
      }
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!callType} onClick={() => callType && onStart({ difficulty, callType })}>
            <Play className="size-4" /> Iniciar llamada
          </Button>
        </>
      }
    >
      <div className="flex gap-3 rounded-xl border border-border p-3">
        <Avatar name={persona.name} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">
            {persona.role} · {persona.company}
            <Badge className="bg-primary-soft text-primary-text">{persona.segment}</Badge>
            <Badge className="bg-primary-soft text-primary-text">{persona.tags.join(", ")}</Badge>
          </p>
          <p className={cn("mt-1 text-xs text-muted", !more && "line-clamp-2")}>
            {persona.description} {more && <span className="block pt-1">Personalidad: {persona.personality}. Objeciones típicas: {persona.objections.join(" · ")}.</span>}
          </p>
        </div>
        <button onClick={() => setMore((m) => !m)} className="h-fit text-xs font-medium whitespace-nowrap text-primary-text">
          {more ? "Ver menos ↑" : "Ver más ↓"}
        </button>
      </div>

      <p className="mt-5 mb-2 text-[10px] font-semibold tracking-wider text-faint uppercase">Nivel de dificultad</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {DIFFICULTIES.map((d) => (
          <button key={d.id} onClick={() => setDifficulty(d.id)} className={cn("flex items-start gap-2 rounded-lg border p-3 text-left", difficulty === d.id ? "border-warn ring-2 ring-warn/20" : "border-border hover:border-primary/40")}>
            <span className={cn("mt-1.5 size-2 rounded-full", d.dot)} />
            <span className="flex-1">
              <span className="block text-sm font-medium text-text">{d.label}</span>
              <span className="block text-[11px] text-faint">{d.sub}</span>
            </span>
            {difficulty === d.id && <Check className="size-4 text-warn" />}
          </button>
        ))}
      </div>

      <p className="mt-5 mb-2 text-[10px] font-semibold tracking-wider text-faint uppercase">Tipo de llamada</p>
      <div className="grid gap-3 md:grid-cols-3">
        {CALL_CARDS.map((c) => (
          <button key={c.id} onClick={() => setCallType(c.id)} className={cn("rounded-xl border p-4 text-left transition", callType === c.id ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40")}>
            <div className="flex items-start justify-between">
              <c.icon className="size-6 text-primary" />
              <span className="text-right text-[10px] text-faint">
                <span className="flex items-center gap-1"><Clock className="size-3" /> {c.time}</span>
                <span className={cn("font-bold", c.intensityCls)}>{c.intensity}</span>
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-text">{c.title}</p>
            <p className="text-[10px] text-faint italic">{c.en}</p>
            <p className="mt-2 text-xs text-muted">{c.text}</p>
            <ul className="mt-3 space-y-1">
              {c.checks.map((x) => (
                <li key={x} className="flex items-center gap-1.5 rounded bg-surface-2 px-2 py-1 text-[11px] text-muted">
                  <Check className="size-3 text-good" /> {x}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </Modal>
  );
}

const PROSPECT_LINES = [
  "¿Sí? ¿Quién es?",
  "Mira, ahora mismo estoy bastante liado, ¿de qué se trata?",
  "Ya, bueno… eso me lo dicen muchos. ¿Y en qué se diferencia lo vuestro?",
  "¿Y de cuánto estamos hablando?",
  "Uf, no sé. Lo tendría que consultar.",
  "Vale, mándame algo y lo vemos.",
];

/** Pantalla de pre-llamada + llamada en vivo (modo demo). */
export function CallScreen({ persona, config, onExit }: { persona: Persona; config: { difficulty: Difficulty; callType: CallType }; onExit: () => void }) {
  const { spendCredits, addSession, rubrics, pushNotification, toast } = useApp();
  const router = useRouter();
  const [phase, setPhase] = useState<"ready" | "live" | "ending">("ready");
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState<"prospect" | "rep" | null>(null);
  const [lines, setLines] = useState<{ who: "prospect" | "rep"; text: string }[]>([]);
  const [level, setLevel] = useState(0);
  const stream = useRef<MediaStream | null>(null);
  const diffLabel = { facil: "fácil", medio: "medio", dificil: "difícil" }[config.difficulty];

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Cada minuto consume un crédito.
  useEffect(() => {
    if (phase === "live" && seconds > 0 && seconds % 60 === 0) spendCredits(1);
  }, [seconds, phase, spendCredits]);

  // Demo: el prospecto "habla" cada pocos segundos. En producción aquí va la sesión WebRTC con OpenAI Realtime.
  useEffect(() => {
    if (phase !== "live") return;
    const idx = Math.floor(seconds / 7);
    if (seconds % 7 === 1 && idx < PROSPECT_LINES.length) {
      setSpeaking("prospect");
      setLines((l) => [...l, { who: "prospect", text: PROSPECT_LINES[idx] }]);
      try {
        const u = new SpeechSynthesisUtterance(PROSPECT_LINES[idx]);
        u.lang = "es-ES";
        speechSynthesis.speak(u);
      } catch {
        /* sin síntesis de voz */
      }
    }
    if (seconds % 7 === 4) setSpeaking("rep");
  }, [seconds, phase]);

  async function start() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream.current).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!stream.current) return;
        analyser.getByteFrequencyData(data);
        setLevel(data.reduce((a, b) => a + b, 0) / data.length / 128);
        requestAnimationFrame(loop);
      };
      loop();
    } catch {
      toast("No se pudo acceder al micrófono: la sesión seguirá en modo demo");
    }
    setPhase("live");
  }

  function hangUp() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    try {
      speechSynthesis.cancel();
    } catch {
      /* noop */
    }
    setPhase("ending");
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    const id = `rp${Date.now()}`;
    setTimeout(() => {
      const s = simulateAnalyzedSession({ id, type: "roleplay", callType: config.callType, prospectName: persona.name, repId: CURRENT_USER.id, hasAudio: true, durationMin: minutes, personaId: persona.id, rubrics });
      addSession(s);
      pushNotification({ title: `Análisis de ${persona.name} listo`, body: `Puntuación: ${s.score}/100. Pulsa para ver el análisis completo.`, sessionId: id });
      router.push(`/llamadas?id=${id}`);
    }, 2200);
  }

  const mm = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      {phase === "ready" && (
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-2xl">
          <div className="flex items-center gap-3 rounded-xl border border-border p-3 text-left">
            <Avatar name={persona.name} className="size-10" />
            <div>
              <p className="text-sm font-semibold text-text">{persona.name}</p>
              <p className="text-[11px] text-muted">
                {persona.role} · {persona.company}
              </p>
            </div>
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-text">
            <Mic className="size-3" /> Sesión de voz · {diffLabel}
          </span>
          <p className="mt-4 text-sm text-muted">Al pulsar el botón se activará el micrófono y empezará la sesión. Habla con naturalidad.</p>
          <Button variant="primary" className="mt-5 h-11 w-full text-base shadow-lg shadow-primary/30" onClick={start}>
            <Play className="size-4" /> Iniciar entrenamiento
          </Button>
          <button onClick={onExit} className="mt-3 text-xs text-faint hover:text-text">
            ← Volver al simulador
          </button>
        </div>
      )}

      {phase === "live" && (
        <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-border bg-surface p-6 shadow-2xl">
          <p className="text-xs font-medium text-good">● En llamada · {mm}</p>
          <div className="relative my-8">
            {speaking === "prospect" && <span className="pulse-ring absolute inset-0 rounded-full bg-primary" />}
            <Avatar name={persona.name} className="relative size-24 text-2xl" />
          </div>
          <p className="font-semibold text-text">{persona.name}</p>
          <p className="text-xs text-muted">{speaking === "prospect" ? "Hablando…" : "Escuchando"}</p>
          <div className="mt-4 flex h-6 items-end gap-0.5">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className="w-1 rounded-full bg-primary transition-all" style={{ height: `${muted ? 2 : Math.max(2, Math.min(24, level * 24 * (0.5 + Math.abs(Math.sin(i + seconds)))))}px` }} />
            ))}
          </div>
          <div className="mt-5 h-36 w-full space-y-1.5 overflow-y-auto rounded-lg bg-surface-2 p-3 text-xs">
            {lines.map((l, i) => (
              <p key={i} className={l.who === "prospect" ? "text-text" : "text-primary-text"}>
                <b>{l.who === "prospect" ? persona.name.split(" ")[0] : "Tú"}:</b> {l.text}
              </p>
            ))}
          </div>
          <div className="mt-6 flex gap-4">
            <button onClick={() => setMuted((m) => !m)} className={cn("grid size-12 place-items-center rounded-full border border-border", muted ? "bg-bad-soft text-bad" : "text-text")} aria-label="Silenciar">
              {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>
            <button onClick={hangUp} className="grid size-12 place-items-center rounded-full bg-bad text-white" aria-label="Colgar">
              <PhoneOff className="size-5" />
            </button>
          </div>
          <p className="mt-4 text-[10px] text-faint">Modo demo: conecta OpenAI Realtime para conversar con el prospecto de verdad (ver README).</p>
        </div>
      )}

      {phase === "ending" && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-2xl">
          <div className="mx-auto size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 font-medium text-text">Analizando tu sesión…</p>
          <p className="mt-1 text-sm text-muted">En unos segundos verás tu puntuación y el feedback.</p>
        </div>
      )}
    </div>
  );
}
