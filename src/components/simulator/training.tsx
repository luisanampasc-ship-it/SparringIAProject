"use client";

import { Check, Clock, Hand, Mic, MicOff, Phone, PhoneOff, Play, Users, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/app-state";
import { PersonaDetails } from "@/components/persona-details";
import { PersonaAvatar } from "@/components/persona-face";
import { Badge, Button, Modal } from "@/components/ui";
import { CURRENT_USER } from "@/lib/catalog";
import { minutesUsedThisMonth } from "@/lib/insights";
import { simulateAnalyzedSession } from "@/lib/demo-data";
import type { CallType, Persona, TranscriptLine } from "@/lib/types";
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
      <div className="rounded-xl border border-border p-3">
        <div className="flex gap-3">
          <PersonaAvatar persona={persona} className="size-12" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text">
              {persona.role} · {persona.company}
              <Badge className="bg-primary-soft text-primary-text">{persona.segment}</Badge>
              {persona.sector && persona.sector !== "Por confirmar" && <Badge className="bg-primary-soft text-primary-text">{persona.sector}</Badge>}
            </p>
            {!more && <p className="mt-1 line-clamp-2 text-xs text-muted">{persona.situation ?? persona.description}</p>}
          </div>
          <button onClick={() => setMore((m) => !m)} className="h-fit text-xs font-medium whitespace-nowrap text-primary-text">
            {more ? "Ver menos ↑" : "Ver ficha ↓"}
          </button>
        </div>
        {more && (
          <div className="mt-3 border-t border-border pt-3">
            <PersonaDetails persona={persona} />
          </div>
        )}
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

/** Detección de turnos (modo demo). En producción la hace OpenAI Realtime con `turn_detection: { type: "server_vad" }`. */
const VOICE_THRESHOLD = 0.12; // nivel de micrófono a partir del cual consideramos que el comercial habla
const END_OF_TURN_MS = 1300; // silencio necesario para dar por terminado el turno del comercial
const MIN_SPEECH_MS = 500; // el comercial debe hablar al menos esto para que cuente como turno
const BARGE_IN_THRESHOLD = 0.28; // mientras habla el prospecto exigimos más volumen (evita que su propia voz por el altavoz cuente como interrupción)
const BARGE_IN_MS = 400; // y que la interrupción dure un mínimo

type Turn = "prospect" | "rep" | "thinking";

/*
 * Voz del prospecto según su género. En modo demo usamos las voces del navegador;
 * en producción se sustituye por ElevenLabs (una voz por prospecto) o por la voz de OpenAI Realtime.
 */
const FEMALE_VOICES = /(m[oó]nica|paulina|helena|laura|luc[ií]a|elvira|sabina|dalia|paloma|marisol|conchita|esperanza|isabela|female|mujer|femenin)/i;
const MALE_VOICES = /(jorge|diego|pablo|juan|[aá]lvaro|ra[uú]l|enrique|carlos|miguel|andr[eé]s|alonso|male|hombre|masculin)/i;

function pickVoice(gender: Persona["gender"]) {
  try {
    const es = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("es"));
    const re = gender === "masculino" ? MALE_VOICES : FEMALE_VOICES;
    const other = gender === "masculino" ? FEMALE_VOICES : MALE_VOICES;
    const voice = es.find((v) => re.test(v.name)) ?? es.find((v) => !other.test(v.name)) ?? es[0] ?? null;
    // Si la voz elegida no es claramente del género buscado, ajustamos el tono para acercarla.
    const pitch = voice && re.test(voice.name) ? 1 : gender === "masculino" ? 0.7 : 1.25;
    return { voice, pitch, label: voice ? `${voice.name}${pitch !== 1 ? " (tono ajustado)" : ""}` : `Voz del navegador (${gender === "masculino" ? "grave" : "aguda"})` };
  } catch {
    return { voice: null, pitch: 1, label: "Voz del navegador" };
  }
}

/** Tono de una intervención a partir del volumen medio y las pausas medidas por el micrófono. */
function toneLabel(avgLevel: number, pauses: number, seconds: number) {
  if (seconds > 3 && pauses >= 3) return "Dubitativo";
  if (avgLevel >= 0.38) return "Enérgico";
  if (avgLevel < 0.2) return "Bajo / poco seguro";
  return "Seguro y tranquilo";
}

// Reconocimiento de voz del navegador (Chrome/Edge). En producción: transcripción del audio con diarización.
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function createRecognition(): Recognition | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Pantalla de pre-llamada + llamada en vivo (modo demo). */
export function CallScreen({ persona, config, onExit }: { persona: Persona; config: { difficulty: Difficulty; callType: CallType }; onExit: () => void }) {
  const { spendCredits, addSession, rubrics, pushNotification, toast, sessions, minuteLimits } = useApp();
  const router = useRouter();
  const [phase, setPhase] = useState<"ready" | "live" | "ending">("ready");
  const [seconds, setSeconds] = useState(0); // duración total de la llamada
  const [billable, setBillable] = useState(0); // segundos que cuentan para créditos y límite
  const billableMs = useRef(0);
  const [muted, setMuted] = useState(false);
  const [turn, setTurn] = useState<Turn>("prospect");
  const [repTalking, setRepTalking] = useState(false);
  const [lines, setLines] = useState<{ who: "prospect" | "rep"; text: string; tone?: string }[]>([]);
  const [level, setLevel] = useState(0);
  const [micOk, setMicOk] = useState(true);
  const [interim, setInterim] = useState("");
  const stream = useRef<MediaStream | null>(null);
  const recognition = useRef<Recognition | null>(null);
  const live = useRef(false);
  const callStart = useRef(0);
  const repText = useRef(""); // texto reconocido del turno actual del comercial
  const captured = useRef<TranscriptLine[]>([]);
  const pendingRep = useRef<{ t: number; seconds: number; tone: string } | null>(null);
  const turnStats = useRef({ sum: 0, frames: 0, pauses: 0, silentSince: 0 });
  const totals = useRef({ voiceMs: 0, levelSum: 0, levelFrames: 0, longPauses: 0 });
  const voice = useRef(pickVoice(persona.gender));
  const audioCtx = useRef<AudioContext | null>(null);
  const vad = useRef({ speechStart: 0, lastVoice: 0, heard: false });
  const turnRef = useRef<Turn>("prospect");
  const nextLine = useRef(0);
  const mutedRef = useRef(false);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const diffLabel = { facil: "fácil", medio: "medio", dificil: "difícil" }[config.difficulty];

  const limit = minuteLimits[CURRENT_USER.id] ?? 0;
  const used = minutesUsedThisMonth(sessions, CURRENT_USER.id);
  const remainingMin = Math.max(0, limit - used);
  const remainingSec = remainingMin * 60 - billable;

  const setTurnBoth = (t: Turn) => {
    turnRef.current = t;
    setTurn(t);
  };

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({ block: "nearest" });
  }, [lines]);

  useEffect(() => {
    if (phase !== "live") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Minutos facturables: solo cuenta la conversación. El tiempo en que la IA prepara su
  // respuesta (turno "thinking", incluida la conexión inicial) no se descuenta.
  useEffect(() => {
    if (phase !== "live") return;
    let last = performance.now();
    const t = setInterval(() => {
      const now = performance.now();
      if (turnRef.current !== "thinking") billableMs.current += now - last;
      last = now;
      setBillable(Math.floor(billableMs.current / 1000));
    }, 250);
    return () => clearInterval(t);
  }, [phase]);

  // Cada minuto de conversación consume un crédito.
  useEffect(() => {
    if (phase === "live" && billable > 0 && billable % 60 === 0) spendCredits(1);
  }, [billable, phase, spendCredits]);

  // Límite de minutos del colaborador: avisa al final y cuelga al llegar a cero.
  useEffect(() => {
    if (phase !== "live") return;
    if (remainingSec === 60) toast("Te queda 1 minuto de tu límite mensual de simulador");
    if (remainingSec <= 0) {
      toast("Has alcanzado tu límite mensual de minutos. La llamada se ha cerrado.");
      hangUp();
    }
  }, [remainingSec, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  /** El prospecto habla. Solo se llama cuando el comercial ha terminado su turno. */
  function prospectSpeaks() {
    // Si el comercial ha retomado la palabra mientras el prospecto "pensaba", no le pisamos: seguimos escuchando.
    if (performance.now() - vad.current.lastVoice < 400) {
      setTurnBoth("rep");
      return;
    }
    flushRepTurn();
    const idx = nextLine.current;
    if (idx >= PROSPECT_LINES.length) {
      setTurnBoth("rep");
      return;
    }
    nextLine.current = idx + 1;
    const text = PROSPECT_LINES[idx];
    setTurnBoth("prospect");
    setLines((l) => [...l, { who: "prospect", text }]);
    captured.current.push({ t: elapsed(), speaker: "prospect", text });
    const done = () => {
      if (turnRef.current === "prospect") setTurnBoth("rep");
    };
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "es-ES";
      if (voice.current.voice) u.voice = voice.current.voice;
      u.pitch = voice.current.pitch;
      u.onend = done;
      u.onerror = done;
      speechSynthesis.speak(u);
      // Por si el navegador no emite onend.
      setTimeout(done, 1200 + text.length * 70);
    } catch {
      setTimeout(done, 1200 + text.length * 60);
    }
  }

  /** El comercial cede el turno: marcamos su intervención y el prospecto "piensa" antes de responder. */
  function endRepTurn() {
    if (turnRef.current !== "rep") return;
    const spoken = vad.current.heard ? Math.max(1, Math.round((vad.current.lastVoice - vad.current.speechStart) / 1000)) : 0;
    vad.current.heard = false;
    const st = turnStats.current;
    const avgLevel = st.frames ? st.sum / st.frames : 0;
    // Acumulamos: si el comercial retoma la palabra antes de que el prospecto responda, sigue siendo el mismo turno.
    pendingRep.current = {
      t: pendingRep.current?.t ?? Math.max(0, elapsed() - spoken),
      seconds: (pendingRep.current?.seconds ?? 0) + spoken,
      tone: spoken ? toneLabel(avgLevel, st.pauses, spoken) : pendingRep.current?.tone ?? "",
    };
    setTurnBoth("thinking");
    // Pequeña espera: deja que lleguen las últimas palabras reconocidas antes de que el prospecto responda.
    setTimeout(prospectSpeaks, 700 + Math.random() * 500);
  }

  /** Escribe en la transcripción lo que dijo el comercial en su turno (texto reconocido + tono medido). */
  function flushRepTurn() {
    const p = pendingRep.current;
    const text = repText.current.trim();
    if (!p && !text) return;
    const line: TranscriptLine = {
      t: p?.t ?? elapsed(),
      speaker: "rep",
      text: text || `(intervención de ${p?.seconds ?? 0} s sin transcribir)`,
      tone: p?.tone || undefined,
    };
    captured.current.push(line);
    setLines((l) => [...l, { who: "rep", text: line.text, tone: line.tone }]);
    repText.current = "";
    setInterim("");
    pendingRep.current = null;
    turnStats.current = { sum: 0, frames: 0, pauses: 0, silentSince: 0 };
  }

  function elapsed() {
    return callStart.current ? Math.round((performance.now() - callStart.current) / 1000) : 0;
  }

  // Bucle de detección de voz: decide cuándo ha terminado de hablar el comercial y gestiona las interrupciones.
  useEffect(() => {
    if (phase !== "live") return;
    const tick = setInterval(() => {
      const now = performance.now();
      const v = vad.current;
      const talking = now - v.lastVoice < 250;
      setRepTalking(talking);
      // Interrupción: si el comercial habla mientras el prospecto habla, el prospecto se calla y escucha.
      if (talking && turnRef.current === "prospect" && v.lastVoice - v.speechStart > BARGE_IN_MS) {
        try {
          speechSynthesis.cancel();
        } catch {
          /* noop */
        }
        setLines((l) => (l.length && l[l.length - 1].who === "prospect" ? [...l.slice(0, -1), { ...l[l.length - 1], text: `${l[l.length - 1].text} [interrumpido]` }] : l));
        const last = captured.current[captured.current.length - 1];
        if (last?.speaker === "prospect" && !last.text.endsWith("[interrumpido]")) last.text += " [interrumpido]";
        setTurnBoth("rep");
      }
      // Fin de turno: ha hablado lo suficiente y lleva un rato en silencio.
      if (turnRef.current === "rep" && v.heard && now - v.lastVoice > END_OF_TURN_MS && v.lastVoice - v.speechStart > MIN_SPEECH_MS) {
        endRepTurn();
      }
    }, 150);
    return () => clearInterval(tick);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    if (remainingMin <= 0) {
      toast("Has alcanzado tu límite mensual de minutos de simulador");
      return;
    }
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const analyser = ctx.createAnalyser();
      ctx.createMediaStreamSource(stream.current).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!stream.current) return;
        analyser.getByteFrequencyData(data);
        const lv = mutedRef.current ? 0 : data.reduce((a, b) => a + b, 0) / data.length / 128;
        setLevel(lv);
        const now = performance.now();
        const st = turnStats.current;
        if (turnRef.current === "rep" && lv > VOICE_THRESHOLD) {
          // Estadísticas para el análisis de tono: volumen medio y pausas dentro del turno.
          st.sum += lv;
          st.frames += 1;
          totals.current.levelSum += lv;
          totals.current.levelFrames += 1;
          totals.current.voiceMs += 16;
          if (st.silentSince && now - st.silentSince > 600) {
            st.pauses += 1;
            if (now - st.silentSince > 1000) totals.current.longPauses += 1;
          }
          st.silentSince = 0;
        } else if (turnRef.current === "rep" && st.frames && !st.silentSince) {
          st.silentSince = now;
        }
        if (lv > (turnRef.current === "prospect" ? BARGE_IN_THRESHOLD : VOICE_THRESHOLD)) {
          if (!vad.current.heard || now - vad.current.lastVoice > END_OF_TURN_MS) vad.current.speechStart = now;
          vad.current.heard = true;
          vad.current.lastVoice = now;
        }
        requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setMicOk(false);
      toast("No se pudo acceder al micrófono: usa el botón «He terminado» para ceder el turno");
    }
    // Transcripción en directo de lo que dice el comercial.
    const rec = createRecognition();
    if (rec) {
      rec.lang = "es-ES";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        if (mutedRef.current) return;
        let partial = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) repText.current += `${r[0].transcript.trim()} `;
          else partial += r[0].transcript;
        }
        setInterim(partial);
      };
      // Chrome corta el reconocimiento tras unos segundos de silencio: lo reanudamos mientras dure la llamada.
      rec.onend = () => {
        if (live.current) {
          try {
            rec.start();
          } catch {
            /* ya iniciado */
          }
        }
      };
      rec.onerror = () => undefined;
      try {
        rec.start();
        recognition.current = rec;
      } catch {
        recognition.current = null;
      }
    }
    voice.current = pickVoice(persona.gender);
    live.current = true;
    callStart.current = performance.now();
    setPhase("live");
    // El prospecto descuelga y saluda; a partir de aquí siempre espera a que el comercial termine.
    // Mientras conecta, el turno es "thinking" y no cuenta como minutos.
    setTurnBoth("thinking");
    setTimeout(prospectSpeaks, 900);
  }

  function hangUp() {
    live.current = false;
    recognition.current?.stop();
    recognition.current = null;
    flushRepTurn();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    audioCtx.current?.close().catch(() => undefined);
    try {
      speechSynthesis.cancel();
    } catch {
      /* noop */
    }
    setPhase("ending");
    // La sesión registra los minutos de conversación (sin las esperas de la IA).
    const minutes = Math.max(1, Math.ceil(Math.floor(billableMs.current / 1000) / 60));
    const id = `rp${Date.now()}`;
    const transcript = [...captured.current];
    const transcribed = transcript.some((l) => l.speaker === "rep" && !l.text.startsWith("("));
    const tot = totals.current;
    const callSec = Math.max(1, seconds);
    setTimeout(() => {
      const base = simulateAnalyzedSession({ id, type: "roleplay", callType: config.callType, prospectName: persona.name, repId: CURRENT_USER.id, hasAudio: true, durationMin: minutes, personaId: persona.id, rubrics });
      // Lo medido en la llamada sustituye a los valores simulados.
      const tone = base.analysis?.tone && tot.levelFrames
        ? {
            ...base.analysis.tone,
            talkRatio: Math.min(100, Math.round((tot.voiceMs / 1000 / callSec) * 100)),
            pauses: tot.longPauses,
            energy: Math.min(100, Math.round((tot.levelSum / tot.levelFrames) * 180)),
          }
        : base.analysis?.tone;
      const s = {
        ...base,
        // Siempre la transcripción real de la llamada, aunque sea corta: nunca texto de ejemplo.
        transcript,
        analysis: base.analysis ? { ...base.analysis, tone } : null,
        capture: { prospectVoice: voice.current.label, transcribed },
      };
      addSession(s);
      pushNotification({ title: `Análisis de ${persona.name} listo`, body: `Puntuación: ${s.score}/100. Pulsa para ver la transcripción y el análisis.`, sessionId: id });
      router.push(`/llamadas?id=${id}&vista=transcripcion`);
    }, 2200);
  }

  const mm = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const status = turn === "prospect" ? "Hablando…" : turn === "thinking" ? "Pensando su respuesta…" : repTalking ? "Te está escuchando…" : "Tu turno: habla cuando quieras";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      {phase === "ready" && (
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-2xl">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left">
            <PersonaAvatar persona={persona} className="size-14" />
            <div>
              <p className="text-sm font-semibold text-text">{persona.name}</p>
              <p className="text-[11px] text-muted">
                {persona.role} · {persona.company}
              </p>
            </div>
          </div>
          <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary-text">
            <Mic className="size-3" /> Sesión de voz · <b>{diffLabel}</b>
          </span>
          <p className="mt-4 text-sm text-muted">Al pulsar el botón se activará el micrófono y empezará la sesión. Habla con naturalidad: el prospecto esperará a que termines antes de responder.</p>
          <p className={cn("mt-2 text-xs", remainingMin > 0 ? "text-faint" : "font-semibold text-bad")}>
            {remainingMin > 0 ? `Te quedan ${remainingMin} min de tu límite mensual` : "Has alcanzado tu límite mensual de minutos"}
          </p>
          <Button variant="primary" disabled={remainingMin <= 0} className="mt-5 h-11 w-full rounded-full text-base shadow-lg shadow-primary/30" onClick={start}>
            <Play className="size-4" /> Iniciar entrenamiento
          </Button>
          <button onClick={onExit} className="mt-3 text-xs text-faint hover:text-text">
            ← Volver al simulador
          </button>
        </div>
      )}

      {phase === "live" && (
        <div className="flex w-full max-w-md flex-col items-center rounded-2xl border border-border bg-surface p-6 shadow-2xl">
          <div className="flex w-full items-center justify-between text-xs">
            <p className="font-medium text-good">
              ● En llamada · {mm}
              <span className="block text-[10px] font-normal text-faint" title="No cuenta el tiempo que la IA tarda en responder">
                Minutos contados: {Math.floor(billable / 60)}:{String(billable % 60).padStart(2, "0")}
              </span>
            </p>
            <p className={cn(remainingSec <= 120 ? "font-semibold text-bad" : "text-faint")}>
              Límite: {Math.floor(Math.max(0, remainingSec) / 60)}:{String(Math.max(0, remainingSec) % 60).padStart(2, "0")} restantes
            </p>
          </div>
          <div className="relative my-8">
            {turn === "prospect" && <span className="pulse-ring absolute inset-0 rounded-full bg-primary" />}
            <PersonaAvatar persona={persona} className="relative size-28" />
          </div>
          <p className="font-semibold text-text">{persona.name}</p>
          <p className="text-xs text-muted">{status}</p>
          <div className="mt-4 flex h-6 items-end gap-0.5" aria-label="Nivel de tu micrófono">
            {Array.from({ length: 16 }, (_, i) => (
              <span key={i} className={cn("w-1 rounded-full transition-all", repTalking ? "bg-primary" : "bg-faint")} style={{ height: `${muted ? 2 : Math.max(2, Math.min(24, level * 24 * (0.5 + Math.abs(Math.sin(i + seconds)))))}px` }} />
            ))}
          </div>
          <div className="mt-5 h-36 w-full space-y-1.5 overflow-y-auto rounded-lg bg-surface-2 p-3 text-xs">
            {lines.map((l, i) => (
              <p key={i} className={l.who === "prospect" ? "text-text" : "text-primary-text"}>
                <b>{l.who === "prospect" ? persona.name.split(" ")[0] : "Tú"}:</b> {l.text}
                {l.tone && <span className="ml-1.5 rounded bg-surface px-1 text-[10px] text-muted">{l.tone}</span>}
              </p>
            ))}
            {interim && (
              <p className="text-primary-text/70 italic">
                <b>Tú:</b> {interim}…
              </p>
            )}
            <div ref={transcriptEnd} />
          </div>
          <div className="mt-6 flex items-center gap-4">
            <button onClick={() => setMuted((m) => !m)} className={cn("grid size-12 place-items-center rounded-full border border-border", muted ? "bg-bad-soft text-bad" : "text-text")} aria-label="Silenciar">
              {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
            </button>
            <button
              onClick={endRepTurn}
              disabled={turn !== "rep"}
              className="flex h-12 items-center gap-1.5 rounded-full border border-border px-4 text-xs font-medium text-text hover:bg-surface-2 disabled:opacity-40"
              title="Úsalo si el prospecto no detecta que has terminado de hablar"
            >
              <Hand className="size-4" /> He terminado
            </button>
            <button onClick={hangUp} className="grid size-12 place-items-center rounded-full bg-bad text-white" aria-label="Colgar">
              <PhoneOff className="size-5" />
            </button>
          </div>
          <p className="mt-4 text-center text-[10px] text-faint">
            {micOk ? "El prospecto responde cuando haces una pausa de ~1 segundo. Si le interrumpes, se calla y te escucha." : "Sin micrófono: pulsa «He terminado» para que el prospecto responda."}
            <br />
            Voz del prospecto: {voice.current.label}. Al colgar verás la transcripción y el tono de tu llamada.
            <br />
            Modo demo: conecta OpenAI Realtime para conversar con el prospecto de verdad (ver README).
          </p>
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
