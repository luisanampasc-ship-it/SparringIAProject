"use client";

import Link from "next/link";
import { Plus, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-state";
import { TrendArea } from "@/components/charts";
import { RepSelect, TypeSegmented, useFilters } from "@/components/filters";
import { Card, CardHeader, Kpi, PageHeader, Tabs } from "@/components/ui";
import { applyFilters, byCallType, dailySeries, kpis, previousPeriod, type SeriesMetric } from "@/lib/analytics";
import { callTypeDot, callTypeLabel, CURRENT_USER, REPS } from "@/lib/catalog";
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

  const prev = applyFilters(sessions, previousPeriod(f.filters));
  const weekDelta = avg(f.filtered.map((s) => s.score)) - avg(prev.map((s) => s.score));
  const bestRep = REPS.map((r) => ({ r, s: avg(f.filtered.filter((x) => x.repId === r.id).map((x) => x.score)) })).sort((a, b) => b.s - a.s)[0];
  const weakMoments = f.filtered.flatMap((s) => s.moments).filter((m) => m.kind === "debil").length;
  const trainingMin = f.filtered.filter((s) => s.type === "roleplay").reduce((a, s) => a + s.durationMin, 0);
  const types = byCallType(f.filtered);

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      <PageHeader
        title="Dashboard del equipo"
        subtitle={`${greeting()}, ${CURRENT_USER.name.split(" ")[0]}. Así va tu equipo en el período seleccionado.`}
        right={
          <>
            <TypeSegmented value={f.type} onChange={f.setType} counts={f.counts} />
            <Link href="/simulador" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-white hover:brightness-110">
              <Plus className="size-4" /> Nueva sesión IA
            </Link>
          </>
        }
      />
      <div className="mb-4">
        <RepSelect value={f.repId} onChange={f.setRepId} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Puntuación media" value={k.avgScore} hint="Media de las sesiones del período" />
        <Kpi label="Sesiones completadas" value={k.count} hint="En este período" />
        <Kpi label="Tasa de éxito" value={`${k.closeRate}%`} hint="Cierres sobre el total" />
        <Kpi label="Manejo de objeciones" value={`${k.objectionRate}%`} hint="Calidad media al responder objeciones" />
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
        </Card>

        <Card>
          <CardHeader title="Actividad del equipo" subtitle="Lo más relevante del período" />
          <div className="space-y-3 px-5 py-4 text-sm">
            <Row label="Momentos a mejorar" value={weakMoments} />
            <Row label="Mejor comercial" value={bestRep?.s ? bestRep.r.name.split(" ")[0] : "—"} />
            <Row label="Score vs período anterior" value={<span className={weekDelta >= 0 ? "text-good" : "text-bad"}>{weekDelta >= 0 ? "+" : ""}{weekDelta} pts</span>} />
            <Row label="Tiempo de entrenamiento" value={`${trainingMin} min`} />
            <Link href="/metricas" className="inline-flex items-center gap-1.5 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary-text">
              <TrendingUp className="size-3.5" /> Ver métricas completas
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
          </div>
        </Card>
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
