"use client";

import Link from "next/link";
import { Mic, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-state";
import { TrendArea } from "@/components/charts";
import { RepSelect, TypeSegmented, useFilters } from "@/components/filters";
import { Interpretation, StrengthsBoard, TeamComparison, WeeklyInsights } from "@/components/team";
import { Card, CardHeader, Delta, Kpi, PageHeader, SectionLabel, Tabs } from "@/components/ui";
import { applyFilters, byCallType, dailySeries, kpis, objectionRanking, previousPeriod, type SeriesMetric } from "@/lib/analytics";
import { callTypeDot, callTypeLabel, CURRENT_USER, REPS } from "@/lib/catalog";
import { interpretSeries } from "@/lib/insights";
import { avg, cn, greeting } from "@/lib/utils";

const METRIC_TABS: { value: SeriesMetric; label: string }[] = [
  { value: "score", label: "Puntuación" },
  { value: "closeRate", label: "Tasa de éxito" },
  { value: "sessions", label: "Sesiones" },
  { value: "discovery", label: "Discovery" },
  { value: "objections", label: "Objeciones" },
  { value: "cierre", label: "Cierre" },
];

export default function DashboardPage() {
  const { sessions } = useApp();
  const f = useFilters();
  const [metric, setMetric] = useState<SeriesMetric>("score");
  const k = kpis(f.filtered);
  const series = useMemo(() => dailySeries(f.filtered, metric), [f.filtered, metric]);
  const scoreSeries = useMemo(() => dailySeries(f.filtered, "score"), [f.filtered]);

  const prev = applyFilters(sessions, previousPeriod(f.filters));
  const kp = kpis(prev);
  const hasPrev = kp.count > 0;
  const scoreDelta = k.avgScore - kp.avgScore;
  const vsPrev = (value: number, suffix = "") => (hasPrev ? <><Delta value={value} suffix={suffix} /> vs período anterior</> : "Sin datos del período anterior");
  const bestRep = REPS.map((r) => ({ r, s: avg(f.filtered.filter((x) => x.repId === r.id).map((x) => x.score)) })).sort((a, b) => b.s - a.s)[0];
  const weakMoments = f.filtered.flatMap((s) => s.moments).filter((m) => m.kind === "debil").length;
  const trainingMin = f.filtered.filter((s) => s.type === "roleplay").reduce((a, s) => a + s.durationMin, 0);
  const types = byCallType(f.filtered);
  const topObjection = objectionRanking(f.filtered)[0];

  const summary =
    k.count === 0
      ? "No hay sesiones analizadas en el período y filtros seleccionados."
      : `En el período se analizaron ${k.count} sesiones con una puntuación media de ${k.avgScore}/100${hasPrev ? ` (${scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta} puntos frente al período anterior)` : ""}. ` +
        `De cada 100 sesiones, ${k.closeRate} terminan en venta. ` +
        `Las objeciones se gestionan con una calidad del ${k.objectionRate}%${k.objectionRate < 55 ? ", el principal punto a reforzar" : ", un nivel aceptable"}` +
        (topObjection ? `, y la más repetida es "${topObjection.category}" (${topObjection.count} veces). ` : ". ") +
        (k.avgScore >= 70
          ? "En conjunto, el equipo trabaja con una metodología sólida; el foco debería estar en convertir más avances en cierres."
          : k.avgScore >= 50
            ? "En conjunto, el rendimiento es medio: hay una base, pero la práctica dirigida en el simulador puede marcar la diferencia."
            : "En conjunto, el rendimiento está por debajo de lo esperado: conviene priorizar el entrenamiento en las debilidades señaladas abajo.");

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      <PageHeader
        title="Dashboard del equipo"
        subtitle={`${greeting()}, ${CURRENT_USER.name.split(" ")[0]}. Así va tu equipo en el período seleccionado.`}
        right={
          <>
            <TypeSegmented value={f.type} onChange={f.setType} counts={f.counts} />
            <Link href="/simulador" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-on-primary hover:brightness-110">
              <Mic className="size-4" /> Nueva sesión IA
            </Link>
          </>
        }
      />
      <div className="mb-4">
        <RepSelect value={f.repId} onChange={f.setRepId} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Puntuación media" value={k.avgScore} hint={vsPrev(scoreDelta, " pts")} />
        <Kpi label="Sesiones completadas" value={k.count} hint={vsPrev(k.count - kp.count)} />
        <Kpi label="Tasa de éxito" value={`${k.closeRate}%`} hint={vsPrev(k.closeRate - kp.closeRate, "%")} />
        <Kpi label="Manejo de objeciones" value={`${k.objectionRate}%`} hint={vsPrev(k.objectionRate - kp.objectionRate, "%")} />
      </div>

      <Card className="mt-4 pt-5">
        <Interpretation title="Resumen para el gerente">{summary}</Interpretation>
      </Card>

      <div className="mt-6">
        <SectionLabel>Esta semana</SectionLabel>
        <WeeklyInsights cur={f.filtered} prev={prev} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Evolución del rendimiento" subtitle="Media diaria del equipo" />
          <div className="px-5 pt-3">
            <Tabs tabs={METRIC_TABS} value={metric} onChange={setMetric} />
          </div>
          <div className="p-3">
            <TrendArea data={series} unit={metric === "sessions" ? "" : "%"} />
          </div>
          <Interpretation>{interpretSeries(series, metric)}</Interpretation>
        </Card>

        <Card>
          <CardHeader title="Actividad del equipo" subtitle="Lo más relevante del período" />
          <div className="space-y-3 px-5 py-4 text-sm">
            <Row label="Momentos a mejorar" value={weakMoments} />
            <Row label="Mejor comercial" value={bestRep?.s ? bestRep.r.name.split(" ")[0] : "—"} />
            <Row label="Score vs período anterior" value={hasPrev ? <span className={scoreDelta >= 0 ? "text-good" : "text-bad"}>{scoreDelta >= 0 ? "+" : ""}{scoreDelta} pts</span> : "—"} />
            <Row label="Tiempo de entrenamiento" value={`${trainingMin} min`} />
            <Link href="/entrenamiento" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary-text">
              <TrendingUp className="size-3.5" /> Ver Centro de Entrenamiento
            </Link>
          </div>
          <div className="border-t border-border px-5 py-4">
            <p className="mb-3 text-[10px] font-semibold tracking-wider text-faint uppercase">Por tipo de sesión</p>
            <div className="space-y-2.5">
              {types.map((t) => (
                <div key={t.callType} className="flex items-center gap-2 text-sm">
                  <span className={cn("size-2 rounded-full", callTypeDot[t.callType])} />
                  <span className="flex-1 text-text">{callTypeLabel(t.callType)}</span>
                  <span className="text-xs text-muted">{t.count} ses.</span>
                  <span className="w-10 text-right text-xs font-semibold text-text">{t.score}</span>
                </div>
              ))}
            </div>
            {types.length > 1 && (
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Las <b className="text-text">{callTypeLabel(types[0].callType).toLowerCase()}</b> son las que mejor convierten ({types[0].close}% de cierre) y las{" "}
                <b className="text-text">{callTypeLabel(types[types.length - 1].callType).toLowerCase()}</b> las que más cuestan ({types[types.length - 1].close}%).
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-4">
        <TeamComparison cur={f.filtered} prev={prev} />
      </div>

      <Card className="mt-4">
        <CardHeader title="Evolución del score y dispersión del equipo" subtitle="Cada punto es el score medio del equipo ese día. La zona sombreada va del peor al mejor resultado del día." />
        <div className="p-3">
          <TrendArea data={scoreSeries} band />
        </div>
        <Interpretation>{interpretSeries(scoreSeries, "score", { band: true })}</Interpretation>
      </Card>

      <div className="mt-4">
        <StrengthsBoard sessions={f.filtered} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-text">{value}</span>
    </div>
  );
}
