"use client";

import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Button, Card, CardHeader, PageHeader, ProgressBar, Select } from "@/components/ui";
import { CURRENT_USER } from "@/lib/catalog";

const input = "mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";

export default function CuentaPage() {
  const { credits, planMinutes, creditsRenewal, sessions, toast, myOffer, setMyOffer, account, prefs: savedPrefs, saveProfile, renameOrg } = useApp();
  const canEditOrg = !account || account.role === "admin" || account.role === "manager";
  const [offer, setOffer] = useState(myOffer);
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
            subtitle="Lo usamos al crear prospectos desde la web de un cliente: decide con quién hablarás (por ejemplo, RR. HH. o Compras) y qué objeciones pondrá."
          />
          <div className="grid gap-3 p-5 md:grid-cols-3">
            <label className="block text-xs text-muted">
              Tu empresa
              <input className={input} value={offer.company} onChange={(e) => setOffer((o) => ({ ...o, company: e.target.value }))} />
            </label>
            <label className="block text-xs text-muted md:col-span-2">
              Qué vendes
              <input className={input} value={offer.product} onChange={(e) => setOffer((o) => ({ ...o, product: e.target.value }))} placeholder="Ej.: Software de gestión de inventarios para tiendas" />
            </label>
            <div>
              <Button variant="primary" disabled={!offer.product.trim()} onClick={() => { setMyOffer({ company: offer.company.trim(), product: offer.product.trim() }); toast("Guardado: se usará al crear prospectos"); }}>
                Guardar
              </Button>
            </div>
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
