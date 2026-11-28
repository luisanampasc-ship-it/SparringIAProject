import { Badge, SectionLabel } from "@/components/ui";
import { SIZE_LABEL } from "@/lib/sales-context";
import type { Persona } from "@/lib/types";

/** Ficha del prospecto ordenada en bloques: la empresa, el prospecto, cómo se comporta y la fuente. */
export function PersonaDetails({ persona }: { persona: Persona }) {
  const c = persona.companyInfo;
  const personality = persona.personality.replace(/\.+$/, "");
  return (
    <div className="space-y-4 text-sm">
      {c && (
        <Section title={c.relation === "cliente" ? "La empresa" : "Tu negocio (según tu web)"}>
          <p className="font-medium text-text">
            {c.name} <span className="font-normal text-muted">· {[known(c.sector), SIZE_LABEL[c.size]].filter(Boolean).join(" · ")}</span>
          </p>
          {c.offering.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted">{c.offeringApprox ? "Vende (aproximado):" : "Vende:"}</span>
              {c.offering.map((o) => (
                <Badge key={o} className="bg-surface-2 font-medium text-text">
                  {o}
                </Badge>
              ))}
            </div>
          )}
          {known(c.customers) && (
            <p className="mt-1.5 text-xs text-muted">
              Sus clientes: <span className="text-text">{c.customers}</span>
            </p>
          )}
          <p className="mt-1 text-xs text-muted">{c.summary}</p>
        </Section>
      )}

      <Section title="El prospecto">
        <p className="font-medium text-text">
          {persona.name} · {persona.role}
          {persona.nameSource && <NameSourceBadge source={persona.nameSource} />}
        </p>
        <p className="mt-1 text-muted">{persona.situation ?? persona.description}</p>
        {persona.authority && (
          <p className="mt-1 text-xs text-muted">
            Nivel de decisión: <span className="text-text">{{ decide: "decide la compra", propone: "propone a un superior", informa: "solo recoge información" }[persona.authority]}</span>
          </p>
        )}
        {persona.offer && (
          <p className="mt-1 text-xs text-muted">
            Le vas a ofrecer: <span className="text-text">{persona.offer}</span>
          </p>
        )}
      </Section>

      <Section title="Cómo se comportará">
        {personality && (
          <p className="text-muted">
            <span className="text-text">Personalidad:</span> {personality}.
          </p>
        )}
        {persona.objections.length > 0 && (
          <ul className="mt-1.5 space-y-1">
            {persona.objections.map((o) => (
              <li key={o} className="flex gap-2 text-muted">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warn" />
                <span>&ldquo;{o.replace(/^["“]|["”]$/g, "")}&rdquo;</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {c && (
        <p className="text-[11px] text-faint">
          Fuente: {c.host} · {c.pagesRead} {c.pagesRead === 1 ? "página leída" : "páginas leídas"} · {c.source === "ia" ? "analizada con IA" : "análisis básico (sin IA)"}
          {persona.realName && " · El nombre es real; la personalidad y las objeciones son simuladas"}
        </p>
      )}
    </div>
  );
}

const NAME_SOURCE = {
  linkedin: { label: "Contacto de LinkedIn", cls: "bg-info-soft text-info" },
  otra: { label: "Contacto real (otra fuente)", cls: "bg-info-soft text-info" },
  web: { label: "Publicado en su web", cls: "bg-good-soft text-good" },
  ficticio: { label: "Nombre ficticio", cls: "bg-surface-2 text-muted" },
} as const;

/** Indica si el nombre del prospecto es real (y de dónde sale) o ficticio. */
export function NameSourceBadge({ source }: { source: NonNullable<Persona["nameSource"]> }) {
  const s = NAME_SOURCE[source];
  return <Badge className={`ml-1.5 align-middle ${s.cls}`}>{s.label}</Badge>;
}

/** Oculta los datos que la lectura de la web no pudo determinar. */
function known(v: string) {
  return v && v !== "Por confirmar" ? v : "";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      {children}
    </div>
  );
}
