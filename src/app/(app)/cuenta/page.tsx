"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Button, Card, CardHeader, PageHeader, ProgressBar, Select } from "@/components/ui";
import { CURRENT_USER } from "@/lib/catalog";
import type { CatalogItem } from "@/lib/types";

const area = "mt-1 h-20 w-full resize-y rounded-lg border border-border bg-surface p-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";
const inputRow = "h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";
const input = "mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";

export default function CuentaPage() {
  const { credits, planMinutes, creditsRenewal, sessions, toast, myOffer, setMyOffer, account, prefs: savedPrefs, saveProfile, renameOrg } = useApp();
  const canEditOrg = !account || account.role === "admin" || account.role === "manager";
  const [offer, setOffer] = useState(myOffer);
  // Catálogo; si venía de la versión anterior (un solo precio), se convierte en el primer producto.
  const [catalog, setCatalog] = useState<CatalogItem[]>(() =>
    myOffer.catalog?.length ? myOffer.catalog : myOffer.price ? [{ id: crypto.randomUUID(), name: myOffer.product, kind: "servicio", price: myOffer.price }] : [],
  );
  const [name, setName] = useState(account?.name ?? CURRENT_USER.name);
  const [org, setOrg] = useState(account?.orgName ?? "Sparring IA");
  const [lang, setLang] = useState("es");
  const [prefs, setPrefs] = useState(savedPrefs);
  const usage = sessions.slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl p-4 lg:p-6">
      <PageHeader title="Cuenta" subtitle="Perfil, organización, plan y créditos." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Perfil" />
          <div className="space-y-3 p-5">
            <label className="block text-xs text-muted">Nombre<input className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="block text-xs text-muted">Email<input className={input} value={CURRENT_USER.email} disabled /></label>
            <Select label="Idioma" value={lang} onChange={setLang} options={[{ value: "es", label: "Español" }, { value: "en", label: "English" }]} />
            <div><Button variant="primary" disabled={!name.trim()} onClick={() => { saveProfile(name, prefs); toast("Perfil guardado"); }}>Guardar</Button></div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Organización y plan" />
          <div className="space-y-3 p-5">
            <label className="block text-xs text-muted">
              Nombre de la organización
              <div className="flex gap-2">
                <input className={input} value={org} disabled={!canEditOrg} onChange={(e) => setOrg(e.target.value)} />
                {canEditOrg && (
                  <Button className="mt-1 shrink-0" disabled={!org.trim() || org.trim() === (account?.orgName ?? "")} onClick={() => { renameOrg(org); toast("Nombre de la organización guardado"); }}>
                    Guardar
                  </Button>
                )}
              </div>
            </label>
            <div className="rounded-lg border border-primary/30 bg-primary-soft/40 p-4">
              <p className="text-sm font-semibold text-text">Plan Equipo</p>
              <p className="text-xs text-muted">{planMinutes} minutos al mes (simulador y análisis) · hasta 10 miembros</p>
            </div>
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Créditos disponibles</span>
                <span className="font-semibold text-text">{credits} / {planMinutes} min</span>
              </div>
              <ProgressBar value={credits} max={planMinutes} tone="primary" className="mt-1.5" />
              <p className="mt-1 text-[11px] text-faint">Se renuevan {creditsRenewal.replace(" de cada mes", "")} de cada mes.</p>
            </div>
            <Button onClick={() => toast("Conecta Stripe para habilitar compras (ver README)")}>Comprar más minutos</Button>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Tu empresa y lo que vendes"
            subtitle="La IA lo usa para elegir con quién hablarás, preparar sus objeciones y negociar contigo durante la llamada."
          />
          <div className="space-y-5 p-5">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="block text-xs text-muted">
                Tu empresa
                <input className={input} value={offer.company} onChange={(e) => setOffer((o) => ({ ...o, company: e.target.value }))} />
              </label>
              <label className="block text-xs text-muted md:col-span-2">
                Resumen de lo que vendes
                <input className={input} value={offer.product} onChange={(e) => setOffer((o) => ({ ...o, product: e.target.value }))} placeholder="Ej.: Formación comercial y software para equipos de ventas" />
              </label>
            </div>

            <CatalogEditor items={catalog} onChange={setCatalog} />

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs text-muted">
                Condiciones generales (pagos, plazos, garantías)
                <textarea className={area} value={offer.terms ?? ""} onChange={(e) => setOffer((o) => ({ ...o, terms: e.target.value }))} placeholder="Ej.: pago con tarjeta o transferencia, factura, garantía de satisfacción de 30 días" />
              </label>
              <label className="block text-xs text-muted">
                Ventajas generales de tu empresa
                <textarea className={area} value={offer.advantages ?? ""} onChange={(e) => setOffer((o) => ({ ...o, advantages: e.target.value }))} placeholder="Ej.: 10 años de experiencia, más de 200 clientes en Perú, soporte en español" />
              </label>
            </div>
            <p className="text-[11px] text-faint">
              El prospecto de IA usará estos datos para negociar: preguntará por el precio del producto que le ofrezcas, pedirá condiciones y podrá preguntarte por otras opciones del catálogo.
            </p>
            <Button
              variant="primary"
              disabled={!offer.product.trim() || catalog.some((c) => !c.name.trim())}
              onClick={() => {
                setMyOffer({
                  company: offer.company.trim(),
                  product: offer.product.trim(),
                  terms: offer.terms?.trim(),
                  advantages: offer.advantages?.trim(),
                  catalog: catalog.map((c) => ({ ...c, name: c.name.trim(), price: c.price.trim(), terms: c.terms?.trim(), advantages: c.advantages?.trim() })),
                });
                toast("Guardado: el prospecto IA lo tendrá en cuenta");
              }}
            >
              Guardar
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Notificaciones" />
          <div className="space-y-3 p-5">
            {(
              [
                ["email", "Email cuando un análisis esté listo"],
                ["slack", "Mensaje en Slack cuando un análisis esté listo"],
                ["weekly", "Resumen semanal del equipo"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center justify-between text-sm text-text">
                {label}
                <input
                  type="checkbox"
                  checked={prefs[k]}
                  onChange={(e) => {
                    // Se guarda al momento, con el nombre ya guardado (no con el que se esté editando).
                    const next = { ...prefs, [k]: e.target.checked };
                    setPrefs(next);
                    saveProfile(account?.name ?? CURRENT_USER.name, next);
                  }}
                  className="size-4 accent-[var(--primary)]"
                />
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Historial de consumo" subtitle="Últimas sesiones que consumieron créditos" />
          <div className="divide-y divide-border px-5 pb-3">
            {usage.map((s) => (
              <div key={s.id} className="flex justify-between py-2 text-sm">
                <span className="text-text">{s.prospectName} <span className="text-xs text-faint">· {s.type === "real" ? "Llamada" : "Roleplay"}</span></span>
                <span className="text-muted">−{s.durationMin} min</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Lista editable de productos y servicios, cada uno con su precio, condiciones y ventajas. */
function CatalogEditor({ items, onChange }: { items: CatalogItem[]; onChange: (items: CatalogItem[]) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const update = (id: string, patch: Partial<CatalogItem>) => onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const add = () => {
    const item: CatalogItem = { id: crypto.randomUUID(), name: "", kind: "producto", price: "" };
    onChange([...items, item]);
    setOpen(item.id);
  };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-text">
          Catálogo de productos y servicios <span className="font-normal text-faint">({items.length})</span>
        </p>
        <Button size="sm" onClick={add}>
          <Plus className="size-3.5" /> Añadir producto o servicio
        </Button>
      </div>
      {items.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted">Añade tus productos o servicios con su precio para que la IA pueda negociar contigo.</p>}
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-border">
            <div className="grid items-center gap-2 p-2 sm:grid-cols-[1fr_130px_180px_auto]">
              <input className={inputRow} value={item.name} onChange={(e) => update(item.id, { name: e.target.value })} placeholder="Nombre (p. ej. Curso de negociación)" aria-label="Nombre" />
              <Select value={item.kind} onChange={(v) => update(item.id, { kind: v })} options={[{ value: "producto", label: "Producto" }, { value: "servicio", label: "Servicio" }]} />
              <input className={inputRow} value={item.price} onChange={(e) => update(item.id, { price: e.target.value })} placeholder="Precio (p. ej. S/ 1,200)" aria-label="Precio" />
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setOpen(open === item.id ? null : item.id)}>
                  {open === item.id ? "Menos" : "Detalles"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onChange(items.filter((i) => i.id !== item.id))} aria-label="Eliminar">
                  <Trash2 className="size-3.5 text-bad" />
                </Button>
              </div>
            </div>
            {open === item.id && (
              <div className="grid gap-2 border-t border-border p-2 md:grid-cols-2">
                <label className="block text-xs text-muted">
                  Condiciones de este producto o servicio
                  <textarea className={area} value={item.terms ?? ""} onChange={(e) => update(item.id, { terms: e.target.value })} placeholder="Ej.: hasta 3 cuotas sin intereses; 10% de descuento desde 5 personas" />
                </label>
                <label className="block text-xs text-muted">
                  Ventajas de este producto o servicio
                  <textarea className={area} value={item.advantages ?? ""} onChange={(e) => update(item.id, { advantages: e.target.value })} placeholder="Ej.: práctica con llamadas reales, certificado, seguimiento de 60 días" />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
