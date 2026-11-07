"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { TrendArea } from "@/components/charts";
import { CallTypeSelect, RepSelect, TypeSegmented, useFilters } from "@/components/filters";
import { ObjectionScript } from "@/components/objection-script";
import { Badge, Card, CardHeader, Delta, InfoTip, PageHeader, Pills, ProgressBar, SectionLabel, Tabs } from "@/components/ui";
import { applyFilters, byCallType, byQuality, dailySeries, kpis, objectionRanking, previousPeriod, recentMoments, skillStats } from "@/lib/analytics";
import { callTypeDot, callTypeLabel, REPS, skillDescription } from "@/lib/catalog";
import { avg, cn } from "@/lib/utils";

type Tab = "resultados" | "objeciones" | "habilidades";

export default function MetricasPage() {
  const f = useFilters();
  const [tab, setTab] = useState<Tab>("resultados");
  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      <PageHeader title="Métricas" subtitle="Análisis en profundidad del rendimiento del equipo." right={<TypeSegmented value={f.type} onChange={f.setType} counts={f.counts} />} />
      <div className="mb-4 flex flex-wrap gap-3">
        <RepSelect value={f.repId} onChange={f.setRepId} />
        <CallTypeSelect value={f.callType} onChange={f.setCallType} count={f.counts.all} />
      </div>
      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "resultados", label: "Resultados" },
          { value: "objeciones", label: "Objeciones" },
          { value: "habilidades", label: "Habilidades" },
        ]}
      />
      {tab === "resultados" && <Resultados f={f} goObjections={() => setTab("objeciones")} />}
      {tab === "objeciones" && <Objeciones sessions={f.filtered} />}
      {tab === "habilidades" && <Habilidades sessions={f.filtered} />}
    </div>
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
            subtitle="Top 3 del período — detalle en la pestaña Objeciones"
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

function Objeciones({ sessions }: { sessions: ReturnType<typeof useFilters>["filtered"] }) {
  const ranking = objectionRanking(sessions);
  const [open, setOpen] = useState<string | null>(ranking[0]?.category ?? null);
  return (
    <Card>
      <CardHeader title="Objeciones del equipo" subtitle="Ranking de las objeciones más habituales y cómo se gestionan" />
      <div className="space-y-2 p-5">
        {ranking.map((o, i) => {
          const isOpen = open === o.category;
          const examples = o.instances.filter((x, idx, arr) => arr.findIndex((y) => y.quote === x.quote) === idx).slice(0, 3);
          return (
            <div key={o.category} className={cn("rounded-xl border border-border", isOpen && "bg-primary-soft/30")}>
              <button onClick={() => setOpen(isOpen ? null : o.category)} className="flex w-full items-center gap-4 p-4 text-left">
                <span className="w-6 text-xs text-faint">#{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text">{o.category}</p>
                  <ProgressBar value={o.handling} tone="primary" className="mt-2" />
                  <p className="mt-1.5 text-xs text-muted">
                    {o.count} veces · Calidad de manejo: <b className="text-text">{o.handling}%</b>
                  </p>
                </div>
                <ChevronDown className={cn("size-4 text-muted transition", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="space-y-3 px-4 pb-4 pl-14">
                  <div className="flex gap-2">
                    <Badge className="bg-good-soft text-good">{o.good} BIEN</Badge>
                    <Badge className="bg-warn-soft text-warn">{o.regular} REGULAR</Badge>
                    <Badge className="bg-bad-soft text-bad">{o.bad} MAL</Badge>
                  </div>
                  <SectionLabel>Cómo manejarla mejor — sugerencias de la IA</SectionLabel>
                  {examples.map((ex, j) => (
                    <div key={j}>
                      <ObjectionScript script={ex.script} label={`Sugerencia ${j + 1}`} />
                      <Link href={`/llamadas?id=${ex.sessionId}`} className="mt-1 block text-right text-xs font-medium text-primary-text">
                        Ver sesión →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Habilidades({ sessions }: { sessions: ReturnType<typeof useFilters>["filtered"] }) {
  const stats = skillStats(sessions);
  const top = [...stats].sort((a, b) => b.rate - a.rate).slice(0, 5);
  const low = [...stats].sort((a, b) => a.rate - b.rate).slice(0, 5);
  const [filter, setFilter] = useState<"todos" | "debil" | "fuerte">("todos");
  const moments = recentMoments(sessions, 30)
    .filter((m) => filter === "todos" || m.kind === filter)
    .slice(0, 10);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Habilidades del equipo" subtitle="Skills y momentos clave detectados por la IA" />
        <div className="p-5">
          <div className="mb-5 rounded-lg border border-border bg-surface-2 p-3 text-xs text-muted">
            💡 Algunas skills solo aplican a ciertos tipos de llamada (por ejemplo, <b className="text-text">Pitch estructurado</b> no aplica a una llamada en frío y <b className="text-text">Silencio post-precio</b> solo a videollamadas). Filtra por tipo arriba para ver métricas más precisas.
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            <SkillColumn title="Top 5 que dominas" items={top} tone="good" />
            <SkillColumn title="Top 5 a mejorar" items={low} tone="bad" />
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader
          title="Momentos clave recientes"
          subtitle="Los últimos 10 momentos detectados por la IA"
          right={
            <Pills
              value={filter}
              onChange={setFilter}
              options={[
                { value: "todos", label: "Todos" },
                { value: "debil", label: "A mejorar" },
                { value: "fuerte", label: "Fuertes" },
              ]}
            />
          }
        />
        <div className="space-y-3 p-5">
          {moments.map((m, i) => (
            <div key={i} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge className={m.kind === "fuerte" ? "bg-good-soft text-good" : "bg-bad-soft text-bad"}>{m.kind === "fuerte" ? "FUERTE" : "DÉBIL"}</Badge>
                  <p className="text-sm font-semibold text-text">{m.title}</p>
                </div>
                <span className="text-[11px] text-faint">
                  {REPS.find((r) => r.id === m.repId)?.name.split(" ")[0] ?? "Sin asignar"} · {m.date.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                </span>
              </div>
              <SectionLabel>
                <span className="mt-3 block">El comercial dijo</span>
              </SectionLabel>
              <p className="text-sm text-muted italic">&ldquo;{m.repQuote}&rdquo;</p>
              <div className="mt-3 rounded-lg bg-primary-soft/60 p-3">
                <p className="text-[10px] font-bold tracking-wider text-primary-text uppercase">Sugerencia IA</p>
                <p className="mt-1 text-sm text-text">{m.suggestion}</p>
              </div>
              <Link href={`/llamadas?id=${m.sessionId}`} className="mt-2 block text-right text-xs font-medium text-primary-text">
                Ver sesión →
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function SkillColumn({ title, items, tone }: { title: string; items: ReturnType<typeof skillStats>; tone: "good" | "bad" }) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="space-y-4">
        {items.map((s) => (
          <div key={s.skill}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-text">
                {s.skill} <InfoTip label={s.skill} text={skillDescription(s.skill)} />
              </span>
              <span className={cn("font-semibold", tone === "good" ? "text-good" : "text-bad")}>{s.rate}%</span>
            </div>
            <ProgressBar value={s.rate} tone={tone} className="mt-1.5" />
            <p className="mt-1 text-[11px] text-faint">
              <span className="text-good">{s.good} bien</span> / <span className="text-warn">{s.regular} regular</span> / <span className="text-bad">{s.bad} mal</span> · de {s.applied} sesiones donde aplicó ({s.notApplied} no aplicó)
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
