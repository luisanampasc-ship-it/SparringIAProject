"use client";

import { Globe, Loader2, Mic, PencilLine, Sparkles, Star, Store, UploadCloud } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { PersonaAvatar } from "@/components/persona-face";
import { Button, Modal, Popover, Select } from "@/components/ui";
import { CURRENT_USER } from "@/lib/catalog";
import { generateFromClientWeb, generateFromDescription, generateFromOwnWeb } from "@/lib/persona-generator";
import type { Gender, Persona } from "@/lib/types";

type Mode = "ai" | "manual" | "web-client" | "web-own" | "audio" | null;

const input = "mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";
const area = "mt-1 w-full resize-y rounded-lg border border-border bg-surface p-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";

function blank(): Persona {
  return { id: `p${Date.now()}`, gender: "femenino", name: "", role: "", company: "", sector: "", tags: [], segment: "B2B", description: "", personality: "", objections: [], createdBy: CURRENT_USER.id };
}

export function CreateProspectMenu() {
  const [mode, setMode] = useState<Mode>(null);
  const items = [
    { group: "Crear", id: "ai" as const, icon: Star, title: "Asistente IA", sub: "Genera el prospecto con IA" },
    { group: "Crear", id: "manual" as const, icon: PencilLine, title: "Configuración manual", sub: "Paso a paso" },
    { group: "Importar", id: "web-client" as const, icon: Globe, title: "Desde la web del cliente", sub: "La web de la empresa a la que vas a vender" },
    { group: "Importar", id: "web-own" as const, icon: Store, title: "Desde tu web", sub: "Tu negocio: generamos a tu cliente ideal" },
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
      <WebModal kind="client" open={mode === "web-client"} onClose={() => setMode(null)} />
      <WebModal kind="own" open={mode === "web-own"} onClose={() => setMode(null)} />
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
                save(generateFromDescription(prompt, blank()));
                setPrompt("");
              }, 1500);
            }}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generar prospecto
          </Button>
        </>
      }
    >
      <p className="mb-2 text-xs text-muted">Indica si es hombre o mujer, su edad, a qué se dedica y qué le frena: el perfil, el nombre, la cara y la voz se adaptan a lo que escribas.</p>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ej.: Hombre de 45 años, dueño de una cadena de 3 cafeterías en Lima, desconfía de la tecnología y le preocupa el margen…" className={`${area} h-32`} />
    </Modal>
  );
}

function ManualModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const save = useSave(onClose);
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Persona>(blank());
  // El texto de objeciones se guarda tal cual (con saltos de línea) y se divide al crear el prospecto.
  const [objText, setObjText] = useState("");
  const set = (k: keyof Persona, v: string) => setP((x) => ({ ...x, [k]: v }));
  const steps = ["Identidad", "Contexto", "Comportamiento"];
  // En producción la foto se sube a Supabase Storage; aquí se guarda como data URL en memoria.
  const onPhoto = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setP((x) => ({ ...x, photo: String(reader.result) }));
    reader.readAsDataURL(file);
  };
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
                save({ ...p, tags: p.sector ? [p.sector] : [], objections: objText.split("\n").map((x) => x.trim()).filter(Boolean) });
                setP(blank());
                setObjText("");
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
          <div className="flex items-center gap-3">
            <PersonaAvatar persona={{ name: p.name || "Nuevo prospecto", photo: p.photo, gender: p.gender }} className="size-14" />
            <div className="text-xs text-muted">
              <p className="font-medium text-text">Cara del prospecto</p>
              <p>Se genera una ilustración a partir del nombre y el género. También puedes subir una foto.</p>
              <div className="mt-1 flex gap-3">
                <label className="cursor-pointer font-medium text-primary-text hover:underline">
                  Subir foto
                  <input type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
                </label>
                {p.photo && (
                  <button className="text-faint hover:text-text" onClick={() => setP((x) => ({ ...x, photo: undefined }))}>
                    Quitar foto
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <label className="block flex-1 text-xs text-muted">Nombre<input className={input} value={p.name} onChange={(e) => set("name", e.target.value)} /></label>
            <div className="pt-5">
              <Select value={p.gender ?? "femenino"} onChange={(v: Gender) => setP((x) => ({ ...x, gender: v }))} options={[{ value: "femenino", label: "Mujer" }, { value: "masculino", label: "Hombre" }]} />
            </div>
          </div>
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
            <textarea className={`${area} h-28`} value={objText} onChange={(e) => setObjText(e.target.value)} placeholder={"Es muy caro\nLo tengo que consultar con mi socio"} />
            <span className="mt-1 block text-[11px] text-faint">Pulsa Enter para añadir otra objeción.</span>
          </label>
        </div>
      )}
    </Modal>
  );
}

const WEB_COPY = {
  client: {
    title: "Crear prospecto desde la web del cliente",
    subtitle: "Introduce la URL de la empresa a la que vas a vender y generamos el perfil de su decisor para que prepares la llamada.",
    placeholder: "https://www.empresa-cliente.com",
  },
  own: {
    title: "Crear prospecto desde tu web",
    subtitle: "Introduce la URL de tu propio negocio y generamos automáticamente el perfil de tu cliente ideal para practicar cómo venderle.",
    placeholder: "https://www.tu-negocio.com",
  },
} as const;

function WebModal({ kind, open, onClose }: { kind: "client" | "own"; open: boolean; onClose: () => void }) {
  const save = useSave(onClose);
  const { toast } = useApp();
  const [url, setUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const normalized = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
  const valid = /^https?:\/\/[^\s.]+\.[^\s]+/.test(normalized);
  const copy = WEB_COPY[kind];

  async function create() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/personas/from-web", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: normalized, kind, contactName: contactName || undefined, contactRole: contactRole || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo leer la web.");
        return;
      }
      save({ ...blank(), ...data.persona });
      const m = data.meta;
      toast(
        `Leídas ${m.pagesRead} página(s) de ${m.host}${m.source === "ia" ? " con IA" : ""}` +
          (kind === "client" && !contactName ? (m.realName ? " · contacto encontrado en su web" : " · no publica su equipo: nombre ficticio") : ""),
      );
      setUrl("");
      setContactName("");
      setContactRole("");
    } catch {
      // Sin conexión con el servidor: perfil aproximado a partir del dominio.
      save(kind === "client" ? generateFromClientWeb(normalized, blank()) : generateFromOwnWeb(normalized, blank()));
      toast("No se pudo leer la web: se creó un perfil aproximado a partir del dominio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!valid || loading} onClick={create}>
            {loading && <Loader2 className="size-4 animate-spin" />} {loading ? "Leyendo la web…" : kind === "client" ? "Crear prospecto" : "Generar cliente ideal"}
          </Button>
        </>
      }
    >
      <div className="flex items-center gap-2 rounded-lg border border-border px-3">
        <Globe className="size-4 text-faint" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={copy.placeholder} className="h-10 flex-1 bg-transparent text-sm text-text outline-none" />
      </div>
      <p className="mt-2 text-[11px] text-faint">Leemos la portada y páginas como «Nosotros» o «Servicios» para identificar el rubro, qué vende y a quién.</p>
      {kind === "client" && (
        <div className="mt-4 rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-text">Contacto (opcional)</p>
          <p className="mt-0.5 text-[11px] text-muted">Si sabes con quién hablarás (por ejemplo, por su LinkedIn), escríbelo. Si no, buscamos al equipo directivo en su web y, si no aparece, usamos un nombre ficticio.</p>
          <div className="mt-2 flex gap-2">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nombre y apellido" className={input} />
            <input value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="Cargo" className={input} />
          </div>
        </div>
      )}
      {error && <p className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-xs text-bad">{error}</p>}
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
                save({ ...generateFromDescription(file!.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), blank()), sector: "Clonado desde audio", tags: ["Clonado desde audio"] });
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
