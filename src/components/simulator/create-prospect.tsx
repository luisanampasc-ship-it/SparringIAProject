"use client";

import { Globe, Loader2, Mic, PencilLine, Shuffle, Sparkles, Star, Store, UploadCloud } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { PersonaAvatar } from "@/components/persona-face";
import { Button, Modal, Popover, Segmented, Select } from "@/components/ui";
import { CURRENT_USER } from "@/lib/catalog";
import { generateFromClientWeb, generateFromDescription, generateFromOwnWeb, pickName } from "@/lib/persona-generator";
import type { Authority, Gender, Persona } from "@/lib/types";

type Mode = "ai" | "manual" | "b2b-web" | "b2b-audio" | "b2b-random" | "b2c-web" | "b2c-audio" | "b2c-random" | null;

const input = "mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";
const area = "mt-1 w-full resize-y rounded-lg border border-border bg-surface p-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";

function blank(): Persona {
  return { id: `p-${crypto.randomUUID()}`, gender: "femenino", name: "", role: "", company: "", sector: "", tags: [], segment: "B2B", description: "", personality: "", objections: [], createdBy: CURRENT_USER.id };
}

const MENU: { group: string; items: { id: Exclude<Mode, null>; icon: React.ElementType; title: string; sub: string }[] }[] = [
  {
    group: "Crear",
    items: [
      { id: "ai", icon: Star, title: "Asistente IA", sub: "Genera el prospecto con IA" },
      { id: "manual", icon: PencilLine, title: "Configuración manual", sub: "Paso a paso" },
    ],
  },
  {
    group: "Importar cliente B2B",
    items: [
      { id: "b2b-web", icon: Globe, title: "Desde la web del cliente", sub: "Su web y el cargo con el que negociarás" },
      { id: "b2b-audio", icon: Mic, title: "Desde grabación", sub: "Clónalo desde una llamada con una empresa" },
      { id: "b2b-random", icon: Shuffle, title: "Cliente aleatorio", sub: "Indica el sector" },
    ],
  },
  {
    group: "Importar cliente B2C",
    items: [
      { id: "b2c-web", icon: Store, title: "Desde tu web", sub: "Tu web: generamos un cliente ideal aleatorio" },
      { id: "b2c-audio", icon: Mic, title: "Desde grabación", sub: "Clónalo desde una llamada con un particular" },
      { id: "b2c-random", icon: Shuffle, title: "Cliente aleatorio", sub: "Resume tus servicios o productos" },
    ],
  },
];

export function CreateProspectMenu() {
  const [mode, setMode] = useState<Mode>(null);
  const close = () => setMode(null);
  return (
    <>
      <Popover
        className="w-[680px] max-w-[92vw] p-4"
        trigger={(_, toggle) => (
          <Button variant="primary" onClick={toggle}>
            Crear nuevo prospecto <span className="grid size-4 place-items-center rounded bg-white/20 text-xs">+</span>
          </Button>
        )}
      >
        {(closeMenu) => (
          <div className="grid gap-4 sm:grid-cols-3">
            {MENU.map((g) => (
              <div key={g.group}>
                <p className="mb-2 text-[10px] font-semibold tracking-wider text-faint uppercase">{g.group}</p>
                {g.items.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => {
                      setMode(i.id);
                      closeMenu();
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
      <AiModal open={mode === "ai"} onClose={close} />
      <ManualModal open={mode === "manual"} onClose={close} />
      <WebModal kind="client" open={mode === "b2b-web"} onClose={close} />
      <WebModal kind="own" open={mode === "b2c-web"} onClose={close} />
      <AudioModal segment="B2B" open={mode === "b2b-audio"} onClose={close} />
      <AudioModal segment="B2C" open={mode === "b2c-audio"} onClose={close} />
      <RandomModal segment="B2B" open={mode === "b2b-random"} onClose={close} />
      <RandomModal segment="B2C" open={mode === "b2c-random"} onClose={close} />
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
  const [gender, setGender] = useState<GenderChoice>("auto");
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
                save({ ...generateFromDescription(prompt, blank(), gender === "auto" ? undefined : gender), nameSource: "ficticio" });
                setGender("auto");
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
      <GenderField value={gender} onChange={setGender} hint="Si eliges «Automático», se deduce de la descripción." />
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
    title: "Cliente B2B desde su web",
    subtitle: "Introduce la web de la empresa a la que vas a vender y el cargo de la persona con la que negociarás.",
    placeholder: "https://www.empresa-cliente.com",
  },
  own: {
    title: "Cliente B2C desde tu web",
    subtitle: "Introduce la web de tu negocio y generamos un cliente particular ideal, distinto cada vez, para practicar cómo venderle.",
    placeholder: "https://www.tu-negocio.com",
  },
} as const;

function WebModal({ kind, open, onClose }: { kind: "client" | "own"; open: boolean; onClose: () => void }) {
  const save = useSave(onClose);
  const { toast, myOffer } = useApp();
  const [offer, setOffer] = useState(myOffer.product);
  const [url, setUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactSource, setContactSource] = useState<"linkedin" | "otra">("linkedin");
  const [authority, setAuthority] = useState<Authority>("propone");
  const [gender, setGender] = useState<GenderChoice>("auto");
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
        body: JSON.stringify({
          url: normalized,
          kind,
          contactName: contactName || undefined,
          contactRole: contactRole || undefined,
          authority: kind === "client" ? authority : undefined,
          segment: kind === "own" ? "B2C" : "B2B",
          offer: kind === "client" ? offer : undefined,
          sellerCompany: myOffer.company,
          gender: gender === "auto" ? undefined : gender,
          contactSource: contactName ? contactSource : undefined,
        }),
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
      setGender("auto");
    } catch {
      // Sin conexión con el servidor: perfil aproximado a partir del dominio.
      const fallback = kind === "client" ? generateFromClientWeb(normalized, blank()) : generateFromOwnWeb(normalized, blank());
      save(gender === "auto" ? fallback : { ...fallback, gender, name: pickName(gender, normalized) });
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
          <Button variant="primary" disabled={!valid || loading || (kind === "client" && (!offer.trim() || !contactRole.trim()))} onClick={create}>
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
      <GenderField value={gender} onChange={setGender} />
      {kind === "client" && (
        <label className="mt-4 block text-xs text-muted">
          ¿Qué le vas a vender?
          <input className={input} value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Ej.: Software de gestión de inventarios" />
          <span className="mt-1 block text-[11px] text-faint">Define con quién hablarás (por ejemplo, RR. HH. o Compras) y sus objeciones. El valor por defecto se cambia en Cuenta.</span>
        </label>
      )}
      {kind === "client" && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-muted">
            Cargo o rango de tu interlocutor
            <input value={contactRole} onChange={(e) => setContactRole(e.target.value)} placeholder="Ej.: Jefe de Compras" className={input} />
          </label>
          <div className="text-xs text-muted">
            Nivel de decisión
            <div className="mt-1">
              <Select
                value={authority}
                onChange={setAuthority}
                options={[
                  { value: "decide", label: "Decide la compra" },
                  { value: "propone", label: "Propone a un superior" },
                  { value: "informa", label: "Solo recoge información" },
                ]}
              />
            </div>
          </div>
        </div>
      )}
      {kind === "client" && (
        <div className="mt-4 rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-text">Nombre del contacto (opcional)</p>
          <p className="mt-0.5 text-[11px] text-muted">Si sabes con quién hablarás (por ejemplo, por su LinkedIn), escríbelo. Si no, buscamos al equipo directivo en su web y, si no aparece, usamos un nombre ficticio.</p>
          <div className="mt-2">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nombre y apellido" className={input} />
          </div>
          {contactName.trim() && (
            <div className="mt-2 space-y-1">
              {gender === "auto" && <p className="text-[11px] text-warn">Indica arriba el sexo del contacto para que la cara y la voz concuerden.</p>}
              <Select label="¿De dónde sale este contacto?" value={contactSource} onChange={setContactSource} options={[{ value: "linkedin", label: "LinkedIn" }, { value: "otra", label: "Otra fuente (referido, tarjeta, evento…)" }]} />
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-3 rounded-lg bg-bad-soft px-3 py-2 text-xs text-bad">{error}</p>}
    </Modal>
  );
}

function AudioModal({ segment, open, onClose }: { segment: "B2B" | "B2C"; open: boolean; onClose: () => void }) {
  const save = useSave(onClose);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cliente ${segment} desde grabación`}
      subtitle={segment === "B2B" ? "Sube una llamada real con una empresa y clonamos la personalidad y las objeciones de tu interlocutor." : "Sube una llamada real con un cliente particular y clonamos su personalidad y sus objeciones."}
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
                // En producción: transcripción del audio + IA que extrae personalidad y objeciones.
                const p = generateFromDescription(file!.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), blank());
                save({ ...p, segment, company: segment === "B2C" ? "Particular" : p.company, sector: "Clonado desde audio", tags: ["Clonado desde audio"], nameSource: "ficticio" });
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

type GenderChoice = "auto" | Gender;

/** Sexo del prospecto, opcional: si se deja en automático se deduce de la descripción o de la web. */
function GenderField({ value, onChange, hint }: { value: GenderChoice; onChange: (v: GenderChoice) => void; hint?: string }) {
  return (
    <div className="my-3 flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted">Sexo del prospecto:</span>
      <Segmented
        value={value}
        onChange={onChange}
        options={[
          { value: "auto", label: "Automático" },
          { value: "femenino", label: "Mujer" },
          { value: "masculino", label: "Hombre" },
        ]}
      />
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </div>
  );
}

/** Cliente aleatorio: B2B a partir del sector; B2C a partir de tus servicios o productos. */
function RandomModal({ segment, open, onClose }: { segment: "B2B" | "B2C"; open: boolean; onClose: () => void }) {
  const save = useSave(onClose);
  const { myOffer, toast } = useApp();
  const [sector, setSector] = useState("");
  const [role, setRole] = useState("");
  const [authority, setAuthority] = useState<Authority>("propone");
  const [activities, setActivities] = useState([myOffer.product, myOffer.advantages].filter(Boolean).join(". "));
  const [gender, setGender] = useState<GenderChoice>("auto");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const valid = segment === "B2B" ? sector.trim().length > 1 : activities.trim().length > 5;

  async function create() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/personas/random", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          segment,
          sector: segment === "B2B" ? sector : undefined,
          activities: segment === "B2C" ? activities : undefined,
          offer: myOffer.product,
          role: segment === "B2B" ? role || undefined : undefined,
          authority: segment === "B2B" ? authority : undefined,
          gender: gender === "auto" ? undefined : gender,
        }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? "No se pudo generar el cliente.");
      save({ ...blank(), ...data.persona, id: blank().id, createdBy: CURRENT_USER.id });
      if (data.source === "ia") toast("Cliente generado con IA");
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Cliente ${segment} aleatorio`}
      subtitle={segment === "B2B" ? "Indica el sector y generamos una empresa y un interlocutor ficticios, distintos cada vez." : "Resume lo que vendes y generamos un cliente particular ficticio, distinto cada vez."}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!valid || loading} onClick={create}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Shuffle className="size-4" />} Generar cliente
          </Button>
        </>
      }
    >
      {segment === "B2B" ? (
        <div className="space-y-3">
          <label className="block text-xs text-muted">
            Sector
            <input className={input} value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Ej.: Minería, Retail, Clínicas dentales…" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-muted">
              Cargo o rango (opcional)
              <input className={input} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Ej.: Gerente de Operaciones" />
            </label>
            <div className="text-xs text-muted">
              Nivel de decisión
              <div className="mt-1">
                <Select
                  value={authority}
                  onChange={setAuthority}
                  options={[
                    { value: "decide", label: "Decide la compra" },
                    { value: "propone", label: "Propone a un superior" },
                    { value: "informa", label: "Solo recoge información" },
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <label className="block text-xs text-muted">
          Resumen de tus actividades (principales servicios o productos)
          <textarea className={`${area} h-28`} value={activities} onChange={(e) => setActivities(e.target.value)} placeholder="Ej.: Clínica oftalmológica: consultas, exámenes de la vista, lentes y cirugía refractiva" />
          <span className="mt-1 block text-[11px] text-faint">Se rellena con lo que guardaste en Cuenta («Tu empresa y lo que vendes»). Puedes cambiarlo para esta vez.</span>
        </label>
      )}
      <GenderField value={gender} onChange={setGender} />
      {error && <p className="mt-2 rounded-lg bg-bad-soft px-3 py-2 text-xs text-bad">{error}</p>}
    </Modal>
  );
}
