"use client";

import { Globe, Loader2, Mic, PencilLine, Sparkles, UploadCloud } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Button, Modal, Popover, Select } from "@/components/ui";
import { CURRENT_USER } from "@/lib/catalog";
import type { Persona } from "@/lib/types";

type Mode = "ai" | "manual" | "web" | "audio" | null;

const input = "mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";
const area = "mt-1 w-full resize-y rounded-lg border border-border bg-surface p-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";

function blank(): Persona {
  return { id: `p${Date.now()}`, name: "", role: "", company: "", sector: "", tags: [], segment: "B2B", description: "", personality: "", objections: [], createdBy: CURRENT_USER.id };
}

/** Generación simulada; en producción llama a /api/personas/generate. */
function fakeGenerate(seed: string, extra: Partial<Persona> = {}): Persona {
  const names = ["Gabriela Soto", "Manuel Ibarra", "Paula Herrero", "Andrés Calvo", "Silvia Ramos"];
  const name = names[seed.length % names.length];
  return {
    ...blank(),
    name,
    role: "Directora general",
    company: extra.company ?? "Empresa Demo",
    sector: extra.sector ?? "Servicios profesionales",
    tags: ["Pymes", extra.sector ?? "Servicios"],
    description: `Perfil generado a partir de: "${seed.slice(0, 120)}". Tiene un equipo pequeño, poco tiempo y quiere crecer sin aumentar costes fijos.`,
    personality: "Pragmática, pide números concretos.",
    objections: ["Ahora no tengo presupuesto", "Ya lo intentamos antes"],
    ...extra,
  };
}

export function CreateProspectMenu() {
  const [mode, setMode] = useState<Mode>(null);
  const items = [
    { group: "Crear", id: "ai" as const, icon: Sparkles, title: "Asistente IA", sub: "Genera el prospecto con IA" },
    { group: "Crear", id: "manual" as const, icon: PencilLine, title: "Configuración manual", sub: "Paso a paso" },
    { group: "Importar", id: "web" as const, icon: Globe, title: "Desde web", sub: "Clónalo desde una URL" },
    { group: "Importar", id: "audio" as const, icon: Mic, title: "Desde grabación", sub: "Clónalo desde un audio" },
  ];
  return (
    <>
      <Popover
        className="w-[420px] max-w-[90vw] p-4"
        trigger={(_, toggle) => (
          <Button variant="primary" onClick={toggle}>
            Crear nuevo prospecto <span className="grid size-4 place-items-center rounded bg-white/20 text-xs">+</span>
          </Button>
        )}
      >
        {(close) => (
          <div className="grid grid-cols-2 gap-4">
            {(["Crear", "Importar"] as const).map((g) => (
              <div key={g}>
                <p className="mb-2 text-[10px] font-semibold tracking-wider text-faint uppercase">{g}</p>
                {items
                  .filter((i) => i.group === g)
                  .map((i) => (
                    <button
                      key={i.id}
                      onClick={() => {
                        setMode(i.id);
                        close();
                      }}
                      className="flex w-full items-start gap-3 rounded-lg p-2 text-left hover:bg-surface-2"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-border">
                        <i.icon className="size-4 text-muted" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-text">{i.title}</span>
                        <span className="block text-[11px] text-faint">{i.sub}</span>
                      </span>
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}
      </Popover>
      <AiModal open={mode === "ai"} onClose={() => setMode(null)} />
      <ManualModal open={mode === "manual"} onClose={() => setMode(null)} />
      <WebModal open={mode === "web"} onClose={() => setMode(null)} />
      <AudioModal open={mode === "audio"} onClose={() => setMode(null)} />
    </>
  );
}

function useSave(onClose: () => void) {
  const { addPersona, toast } = useApp();
  return (p: Persona) => {
    addPersona(p);
    toast(`Prospecto "${p.name}" creado`);
    onClose();
  };
}

function AiModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const save = useSave(onClose);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear prospecto con IA"
      subtitle="Describe a tu cliente ideal y la IA genera un perfil completo con personalidad y objeciones."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={prompt.trim().length < 15 || loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                setLoading(false);
                save(fakeGenerate(prompt));
                setPrompt("");
              }, 1500);
            }}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generar prospecto
          </Button>
        </>
      }
    >
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej.: Dueño de una cadena de 3 cafeterías en Lima, 45 años, desconfía de la tecnología y le preocupa el margen…" className={`${area} h-32`} />
    </Modal>
  );
}

function ManualModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const save = useSave(onClose);
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Persona>(blank());
  const set = (k: keyof Persona, v: string) => setP((x) => ({ ...x, [k]: v }));
  const steps = ["Identidad", "Contexto", "Comportamiento"];
  const valid = [p.name && p.role, p.description.length > 10, true][step];
  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        setStep(0);
      }}
      title="Configuración manual"
      subtitle={`Paso ${step + 1} de 3 · ${steps[step]}`}
      footer={
        <>
          <Button onClick={() => (step === 0 ? onClose() : setStep(step - 1))}>{step === 0 ? "Cancelar" : "Atrás"}</Button>
          <Button
            variant="primary"
            disabled={!valid}
            onClick={() => {
              if (step < 2) setStep(step + 1);
              else {
                save({ ...p, tags: p.sector ? [p.sector] : [] });
                setP(blank());
                setStep(0);
              }
            }}
          >
            {step < 2 ? "Siguiente" : "Crear prospecto"}
          </Button>
        </>
      }
    >
      <div className="mb-4 flex gap-1.5">
        {steps.map((s, i) => (
          <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-surface-2"}`} />
        ))}
      </div>
      {step === 0 && (
        <div className="space-y-3">
          <label className="block text-xs text-muted">Nombre<input className={input} value={p.name} onChange={(e) => set("name", e.target.value)} /></label>
          <label className="block text-xs text-muted">Cargo<input className={input} value={p.role} onChange={(e) => set("role", e.target.value)} /></label>
          <label className="block text-xs text-muted">Empresa<input className={input} value={p.company} onChange={(e) => set("company", e.target.value)} /></label>
          <div className="flex gap-3">
            <label className="block flex-1 text-xs text-muted">Sector<input className={input} value={p.sector} onChange={(e) => set("sector", e.target.value)} /></label>
            <div className="pt-5"><Select value={p.segment} onChange={(v) => setP((x) => ({ ...x, segment: v }))} options={[{ value: "B2B", label: "B2B" }, { value: "B2C", label: "B2C" }]} /></div>
          </div>
        </div>
      )}
      {step === 1 && (
        <label className="block text-xs text-muted">
          Situación, dolores y objetivos
          <textarea className={`${area} h-40`} value={p.description} onChange={(e) => set("description", e.target.value)} />
        </label>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <label className="block text-xs text-muted">Personalidad<input className={input} value={p.personality} onChange={(e) => set("personality", e.target.value)} placeholder="Ej.: escéptico, directo, impaciente" /></label>
          <label className="block text-xs text-muted">
            Objeciones típicas (una por línea)
            <textarea className={`${area} h-28`} value={p.objections.join("\n")} onChange={(e) => setP((x) => ({ ...x, objections: e.target.value.split("\n").filter(Boolean) }))} />
          </label>
        </div>
      )}
    </Modal>
  );
}

function WebModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const save = useSave(onClose);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const valid = /^https?:\/\/[^\s.]+\.[^\s]+/.test(url);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear prospecto desde web"
      subtitle="Introduce la URL de un negocio y generamos un perfil automáticamente."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={!valid || loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                const host = new URL(url).hostname.replace("www.", "");
                setLoading(false);
                save(fakeGenerate(url, { company: host.split(".")[0].replace(/^\w/, (c) => c.toUpperCase()), sector: "Detectado desde la web" }));
                setUrl("");
              }, 1800);
            }}
          >
            {loading && <Loader2 className="size-4 animate-spin" />} Crear prospecto
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-2 rounded-lg border border-border px-3">
        <Globe className="size-4 text-faint" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.empresa.com" className="h-10 flex-1 bg-transparent text-sm text-text outline-none" />
      </div>
    </Modal>
  );
}

function AudioModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const save = useSave(onClose);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Crear prospecto desde grabación"
      subtitle="Sube una llamada real y clonamos la personalidad y las objeciones del prospecto."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={!file || loading}
            onClick={() => {
              setLoading(true);
              setTimeout(() => {
                setLoading(false);
                save(fakeGenerate(file!.name, { sector: "Clonado desde audio" }));
                setFile(null);
              }, 2000);
            }}
          >
            {loading && <Loader2 className="size-4 animate-spin" />} Clonar prospecto
          </Button>
        </>
      }
    >
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-8 text-center hover:border-primary/50">
        <UploadCloud className="size-6 text-faint" />
        <span className="text-sm text-text">{file ? file.name : "Selecciona un audio (MP3, WAV, M4A…)"}</span>
        <input type="file" accept="audio/*,video/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>
    </Modal>
  );
}
