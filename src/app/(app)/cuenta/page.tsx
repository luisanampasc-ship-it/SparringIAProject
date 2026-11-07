"use client";

import { useState } from "react";
import { useApp } from "@/components/app-state";
import { Button, Card, CardHeader, PageHeader, ProgressBar, Select } from "@/components/ui";
import { CURRENT_USER } from "@/lib/catalog";

const input = "mt-1 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm text-text outline-none focus:ring-2 focus:ring-primary/30";

export default function CuentaPage() {
  const { credits, sessions, toast } = useApp();
  const [name, setName] = useState(CURRENT_USER.name);
  const [org, setOrg] = useState("Sparring IA");
  const [lang, setLang] = useState("es");
  const [prefs, setPrefs] = useState({ email: true, slack: false, weekly: true });
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
            <div><Button variant="primary" onClick={() => toast("Perfil guardado")}>Guardar</Button></div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Organización y plan" />
          <div className="space-y-3 p-5">
            <label className="block text-xs text-muted">Nombre de la organización<input className={input} value={org} onChange={(e) => setOrg(e.target.value)} /></label>
            <div className="rounded-lg border border-primary/30 bg-primary-soft/40 p-4">
              <p className="text-sm font-semibold text-text">Plan Equipo</p>
              <p className="text-xs text-muted">300 minutos de análisis al mes · hasta 10 miembros</p>
            </div>
            <div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Créditos disponibles</span>
                <span className="font-semibold text-text">{credits} / 300 min</span>
              </div>
              <ProgressBar value={credits} max={300} tone="primary" className="mt-1.5" />
              <p className="mt-1 text-[11px] text-faint">Se renuevan el día 24 de cada mes.</p>
            </div>
            <Button onClick={() => toast("Conecta Stripe para habilitar compras (ver README)")}>Comprar más minutos</Button>
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
                <input type="checkbox" checked={prefs[k]} onChange={(e) => setPrefs((p) => ({ ...p, [k]: e.target.checked }))} className="size-4 accent-[var(--primary)]" />
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
