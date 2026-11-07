"use client";

import { FileText, Mic, Search, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "@/components/app-state";
import { Badge, Button, Pills, Select } from "@/components/ui";
import { CURRENT_USER, REPS } from "@/lib/catalog";
import { simulateAnalyzedSession } from "@/lib/demo-data";
import type { CallType, Session } from "@/lib/types";
import { cn } from "@/lib/utils";

const ACCEPT = ["mp3", "mp4", "m4a", "wav", "webm", "ogg", "mov"];
const MAX_MB = 18;
const TYPE_OPTS: { value: CallType; label: string }[] = [
  { value: "videollamada", label: "Videollamada" },
  { value: "cold_call", label: "Llamada en frío" },
  { value: "cualificacion", label: "Cualificación" },
];

export function UploadPanel({ onCreated }: { onCreated: (id: string) => void }) {
  const { addSession, updateSession, spendCredits, pushNotification, toast, rubrics, credits } = useApp();
  const [audioType, setAudioType] = useState<CallType>("videollamada");
  const [textType, setTextType] = useState<CallType>("videollamada");
  const [text, setText] = useState("");
  const [drag, setDrag] = useState(false);
  const [repId, setRepId] = useState(CURRENT_USER.id);
  const [prospect, setProspect] = useState("");
  const input = useRef<HTMLInputElement>(null);

  function start(opts: { callType: CallType; hasAudio: boolean; audioUrl?: string; name: string; minutes: number }) {
    if (credits < opts.minutes) {
      toast("No tienes créditos suficientes para analizar esta llamada");
      return;
    }
    const id = `u${Date.now()}`;
    const placeholder: Session = {
      ...simulateAnalyzedSession({ id, type: "real", callType: opts.callType, prospectName: opts.name, repId, hasAudio: opts.hasAudio, audioUrl: opts.audioUrl, rubrics }),
      status: "procesando",
      score: 0,
    };
    addSession(placeholder);
    spendCredits(opts.minutes);
    onCreated(id);
    toast("Analizando la llamada… te avisaremos cuando esté lista");
    // En producción: POST /api/analyze y polling/realtime hasta que el job termine.
    setTimeout(() => {
      const done = simulateAnalyzedSession({ id, type: "real", callType: opts.callType, prospectName: opts.name, repId, hasAudio: opts.hasAudio, audioUrl: opts.audioUrl, rubrics });
      updateSession(id, done);
      pushNotification({ title: `Análisis de ${opts.name} listo`, body: `Puntuación: ${done.score}/100. Pulsa para ver el análisis completo.`, sessionId: id });
      toast(`Análisis de ${opts.name} listo`);
    }, 4000);
  }

  function handleFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPT.includes(ext)) return toast(`Formato no soportado (.${ext})`);
    if (file.size > MAX_MB * 1024 * 1024) return toast(`El archivo supera los ${MAX_MB} MB`);
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.addEventListener("loadedmetadata", () => {
      const minutes = Math.max(1, Math.ceil((audio.duration || 60) / 60));
      start({ callType: audioType, hasAudio: true, audioUrl: url, name: prospect || file.name.replace(/\.[^.]+$/, ""), minutes });
    });
    audio.addEventListener("error", () => start({ callType: audioType, hasAudio: true, audioUrl: url, name: prospect || file.name, minutes: 5 }));
  }

  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-6">
      <h1 className="text-xl font-semibold text-text">Analizar una llamada real</h1>
      <p className="mt-1 text-sm text-muted">Sube el audio o pega la transcripción.</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-xs text-muted">
          Prospecto
          <input value={prospect} onChange={(e) => setProspect(e.target.value)} placeholder="Nombre (opcional)" className="h-8 rounded-lg border border-border bg-surface px-3 text-xs text-text outline-none focus:ring-2 focus:ring-primary/30" />
        </label>
        <Select label="Comercial" value={repId} onChange={setRepId} options={REPS.map((r) => ({ value: r.id, label: r.name }))} />
      </div>

      <div className="mt-4 rounded-xl border border-primary/30 bg-primary-soft/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-text">
            <Mic className="size-4 text-primary" /> Sube el audio · <span className="text-primary-text">Análisis completo con análisis de tono</span>
          </p>
          <Badge className="bg-primary text-white">RECOMENDADO</Badge>
        </div>
        <p className="mt-1 text-xs text-muted">Escuchamos el audio y medimos pausas, energía, cercanía y control del tono. Es el análisis más preciso.</p>
        <div className="mt-3">
          <Pills value={audioType} onChange={setAudioType} options={TYPE_OPTS} />
        </div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => input.current?.click()}
          className={cn("mt-3 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed bg-surface p-8 text-center transition", drag ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50")}
        >
          <UploadCloud className="size-6 text-faint" />
          <p className="text-sm font-medium text-text">Arrastra tu audio aquí o haz clic</p>
          <p className="rounded-full bg-primary-soft px-3 py-0.5 text-[10px] font-semibold text-primary-text">
            {ACCEPT.map((x) => x.toUpperCase()).join(", ")} · máx {MAX_MB} MB
          </p>
          <input ref={input} type="file" accept={ACCEPT.map((x) => "." + x).join(",")} hidden onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      </div>

      <p className="my-4 text-center text-[10px] font-semibold tracking-wider text-faint">O BIEN</p>

      <div className="rounded-xl border border-border bg-surface p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-text">
          <FileText className="size-4 text-primary" /> Pega la transcripción · <span className="font-normal text-muted">Análisis completo sin análisis de tono</span>
        </p>
        <p className="mt-1 text-xs text-muted">
          Pégala tal cual desde Fathom, Fireflies, Zoom, Google Meet o como texto plano. Detectamos automáticamente quién es el comercial y quién el prospecto.
        </p>
        <div className="mt-3">
          <Pills value={textType} onChange={setTextType} options={TYPE_OPTS} />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pega aquí la transcripción de tu llamada."
          className="mt-3 h-40 w-full resize-y rounded-lg border border-border bg-surface-2 p-3 font-mono text-xs text-text outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[11px] text-faint">{text.length} caracteres</span>
          <Button
            variant="primary"
            disabled={text.trim().length < 50}
            onClick={() => {
              const words = text.trim().split(/\s+/).length;
              start({ callType: textType, hasAudio: false, name: prospect || "Transcripción pegada", minutes: Math.max(1, Math.ceil(words / 150)) });
              setText("");
            }}
          >
            <Search className="size-4" /> Analizar
          </Button>
        </div>
      </div>
    </div>
  );
}
