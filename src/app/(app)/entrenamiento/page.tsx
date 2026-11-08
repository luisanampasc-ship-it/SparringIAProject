"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Blandas, Estrategias, Mejora, Tecnicas } from "@/components/training-center";
import { Interpretation } from "@/components/team";
import { useApp } from "@/components/app-state";
import { TrendArea } from "@/components/charts";
import { CallTypeSelect, RepSelect, TypeSegmented, useFilters } from "@/components/filters";
import { Card, CardHeader, Delta, PageHeader, ProgressBar, Tabs } from "@/components/ui";
import { applyFilters, byCallType, byQuality, dailySeries, kpis, objectionRanking, previousPeriod } from "@/lib/analytics";
import { callTypeDot, callTypeLabel } from "@/lib/catalog";
import { interpretSeries } from "@/lib/insights";
import { avg, cn } from "@/lib/utils";

type Tab = "generales" | "tecnicas" | "estrategias" | "blandas" | "mejora";
const TABS: { value: Tab; label: string }[] = [
  { value: "generales", label: "Métricas generales" },
  { value: "tecnicas", label: "Habilidades técnicas · Objeciones" },
  { value: "estrategias", label: "Estrategias de venta" },
  { value: "blandas", label: "Habilidades blandas" },
  { value: "mejora", label: "Aspectos de mejora" },
];

function EntrenamientoInner() {
  const f = useFilters();
  const params = useSearchParams();
  const initial = TABS.find((t) => t.value === params.get("tab"))?.value ?? "generales";
  const [tab, setTab] = useState<Tab>(initial);
  useEffect(() => setTab(initial), [initial]);
  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      <PageHeader title="Centro de Entrenamiento" subtitle="Qué hace bien el equipo, dónde falla y cómo entrenarlo." right={<TypeSegmented value={f.type} onChange={f.setType} counts={f.counts} />} />
      <div className="mb-4 flex flex-wrap gap-3">
        <RepSelect value={f.repId} onChange={f.setRepId} />
        <CallTypeSelect value={f.callType} onChange={f.setCallType} count={f.counts.all} />
      </div>
      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={TABS}
      />
      {tab === "generales" && <Resultados f={f} goObjections={() => setTab("tecnicas")} />}
      {tab === "tecnicas" && <Tecnicas sessions={f.filtered} />}
      {tab === "estrategias" && <Estrategias />}
      {tab === "blandas" && <Blandas sessions={f.filtered} />}
      {tab === "mejora" && <Mejora sessions={f.filtered} />}
    </div>
  );
}

export default function EntrenamientoPage() {
  return (
    <Suspense>
      <EntrenamientoInner />
    </Suspense>
  );
}

function Resultados({ f, goObjections }: { f: ReturnType<typeof useFilters>; goObjections: () => void }) {
  const { sessions } = useApp();
  const k = kpis(f.filtered);
  const prev = applyFilters(sessions, previousPeriod(f.filters));
  const delta = k.avgScore - avg(prev.map((s) => s.score));
  const progressRate = Math.round((k.advanceOrClose / Math.max(1, k.count)) * 10);
  const closeOfProgress = Math.round((k.closed / Math.max(1, k.count)) * 10);
  const types = byCallType(f.filtered);
  const worst = types.length ? types[types.length - 1].callType : null;
  const quality = byQuality(f.filtered);
  const topObj = objectionRanking(f.filtered).slice(0, 3);
  const maxObj = Math.max(1, ...topObj.map((o) => o.count));

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <p className="text-lg font-semibold text-text">
          Se cerraron <span className="text-good">{k.closed} de {k.count} sesiones ({k.closeRate}%)</span> · con avance firme <span className="text-primary-text">{k.advanceOnly} más</span>.
        </p>
        <p className="mt-1 text-xs text-muted">
          Puntuación media <b className="text-text">{k.avgScore}</b> · <Delta value={delta} suffix=" pts" /> vs período anterior
        </p>
      </Card>

      <Card className="grid gap-6 p-5 lg:grid-cols-2">
        <div>
          <h3 className="font-semibold text-text">Embudo de conversión</h3>
          <p className="mt-1 text-xs text-muted">Cuántas sesiones progresan y cuántas cierran (el cierre es un subconjunto del avance).</p>
          <p className="mt-4 text-sm text-text">
            De cada 10 sesiones, <b className="text-primary-text">{progressRate} progresan</b> (avance o cierre), de las cuales <b className="text-good">{closeOfProgress} cierran</b>.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {progressRate - closeOfProgress >= 3
              ? "Muchas oportunidades avanzan pero no llegan a cerrarse: el cuello de botella está en el cierre. Entrena el «Cierre con compromiso» y las objeciones finales."
              : "La mayoría de las oportunidades que avanzan acaban cerrándose: el reto es conseguir que progresen más sesiones desde el inicio (apertura y diagnóstico)."}
          </p>
        </div>
        <div className="space-y-1.5">
          <FunnelStep label="Total" value={k.count} width={100} cls="bg-primary-soft/60 text-text" />
          <p className="text-center text-[10px] text-faint">↓ {Math.round((k.advanceOrClose / Math.max(1, k.count)) * 100)}%</p>
          <FunnelStep label="Avance o cierre" sub={`incluye las ${k.closed} cerradas`} value={k.advanceOrClose} width={80} cls="bg-primary-soft text-primary-text" />
          <p className="text-center text-[10px] text-faint">↓ {Math.round((k.closed / Math.max(1, k.advanceOrClose)) * 100)}%</p>
          <FunnelStep label="Cerradas" value={k.closed} width={60} cls="bg-good-soft text-good" />
        </div>
      </Card>

      <Card>
        <CardHeader title="Dónde ganas y dónde pierdes" subtitle="Rendimiento por tipo de llamada, ordenado por tasa de cierre" />
        <div className="overflow-x-auto p-5 pt-3">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-[10px] tracking-wider text-faint uppercase">
                <th className="py-2 font-semibold">Tipo</th>
                <th className="text-right font-semibold">Sesiones</th>
                <th className="text-right font-semibold">Cierre</th>
                <th className="text-right font-semibold">Avance</th>
                <th className="text-right font-semibold">Perdido</th>
                <th className="text-right font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.callType} className="border-t border-border">
                  <td className="py-3">
                    <span className="flex items-center gap-2 text-text">
                      <span className={cn("size-2 rounded-full", callTypeDot[t.callType])} />
                      {callTypeLabel(t.callType)}
                    </span>
                  </td>
                  <td className="text-right text-text">{t.count}</td>
                  <td className="text-right font-semibold">
                    <span className={t.close >= 50 ? "text-good" : t.close >= 30 ? "text-warn" : "text-bad"}>{t.close}%</span>
                    {t.callType === worst && types.length > 1 && <span className="ml-1.5 inline-block size-2 rounded-full bg-bad" title="Peor tasa de cierre" />}
                  </td>
                  <td className="text-right text-muted">{t.advance}%</td>
                  <td className="text-right text-muted">{t.lost}%</td>
                  <td className="text-right font-semibold text-warn">{t.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Calidad del prospecto → tasa de cierre" subtitle="Cuánto cierras según cómo calificó la IA al prospecto" />
          <div className="space-y-4 p-5">
            {quality.map((q) => (
              <div key={q.quality} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-text capitalize">
                  {q.quality === "caliente" ? "Calientes" : q.quality === "tibio" ? "Tibios" : "Fríos"} <span className="text-xs text-faint">({q.count})</span>
                </span>
                <ProgressBar value={q.rate} tone={q.quality === "caliente" ? "primary" : q.quality === "tibio" ? "warn" : "bad"} className="flex-1" />
                <span className="w-28 text-right text-xs text-muted">
                  <b className="text-text">{q.rate}%</b> cierre ({q.closed}/{q.count})
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader
            title="Objeciones más frecuentes"
            subtitle="Top 3 del período — detalle en Habilidades técnicas"
            right={<button onClick={goObjections} className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-text">Ver todas →</button>}
          />
          <div className="space-y-4 p-5">
            {topObj.map((o) => (
              <div key={o.category} className="flex items-center gap-3 text-sm">
                <span className="w-52 shrink-0 truncate text-text">{o.category}</span>
                <ProgressBar value={o.count} max={maxObj} tone="primary" className="flex-1" />
                <span className="w-8 text-right text-xs font-semibold text-text">{o.count}x</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Evolución de la puntuación" subtitle="Media diaria del período" />
        <div className="p-3">
          <TrendArea data={dailySeries(f.filtered, "score")} />
        </div>
        <Interpretation>{interpretSeries(dailySeries(f.filtered, "score"), "score")}</Interpretation>
      </Card>
      <Card>
        <CardHeader title="Evolución de la tasa de éxito" subtitle="Porcentaje diario de sesiones cerradas" />
        <div className="p-3">
          <TrendArea data={dailySeries(f.filtered, "closeRate")} />
        </div>
        <Interpretation>{interpretSeries(dailySeries(f.filtered, "closeRate"), "closeRate")}</Interpretation>
      </Card>
    </div>
  );
}

function FunnelStep({ label, sub, value, width, cls }: { label: string; sub?: string; value: number; width: number; cls: string }) {
  return (
    <div className={cn("mx-auto flex items-center justify-between rounded-lg px-4 py-2.5", cls)} style={{ width: `${width}%` }}>
      <div>
        <p className="text-xs">{label}</p>
        {sub && <p className="text-[10px] opacity-70">{sub}</p>}
      </div>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

