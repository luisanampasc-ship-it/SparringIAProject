"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp } from "@/components/app-state";
import { Sparkline, TrendArea } from "@/components/charts";
import { Avatar, Badge, Card, CardHeader, Delta, Modal, PageHeader, ProgressBar, ScoreBadge, Segmented, SectionLabel } from "@/components/ui";
import { applyFilters, dailySeries, isClosed, kpis, objectionRanking, previousPeriod, skillStats, type Filters, type TypeFilter } from "@/lib/analytics";
import { callTypeLabel, REPS } from "@/lib/catalog";
import type { Rep } from "@/lib/types";
import { avg, cn, pct } from "@/lib/utils";

export default function PanelManagerPage() {
  const { sessions, range } = useApp();
  const [type, setType] = useState<TypeFilter>("all");
  const [repOpen, setRepOpen] = useState<Rep | null>(null);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const filters: Filters = { type, repId: "all", callType: "all", from: range.from, to: range.to };
  const cur = useMemo(() => applyFilters(sessions, filters), [sessions, type, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const prev = useMemo(() => applyFilters(sessions, previousPeriod(filters)), [sessions, type, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const k = kpis(cur);
  const kp = kpis(prev);
  const series = dailySeries(cur, "score");
  const ranking = objectionRanking(cur);
  const skills = skillStats(cur);
  const worstObj = [...ranking].filter((o) => o.count >= 3).sort((a, b) => a.handling - b.handling);
  const worstSkill = [...skills].sort((a, b) => b.bad / Math.max(1, b.applied) - a.bad / Math.max(1, a.applied))[0];
  const activeReps = REPS.filter((r) => cur.some((s) => s.repId === r.id && s.date.getTime() > Date.now() - 7 * 864e5)).length;

  const insights = [
    worstObj[0] && {
      dot: "bg-primary",
      text: (
        <>
          La objeción <b>&ldquo;{worstObj[0].category}&rdquo;</b> aparece <b>{worstObj[0].count}x</b> en el período con solo <b>{worstObj[0].handling}%</b> de calidad de manejo. Buena oportunidad para entrenarla.
        </>
      ),
      href: "/metricas",
    },
    {
      dot: k.avgScore >= kp.avgScore ? "bg-good" : "bg-bad",
      text:
        k.avgScore >= kp.avgScore ? (
          <>
            El equipo subió <b>+{k.avgScore - kp.avgScore} puntos</b> de score medio respecto al período anterior. ¡Buen trabajo!
          </>
        ) : (
          <>
            El score medio bajó <b>{k.avgScore - kp.avgScore} puntos</b> respecto al período anterior. Revisa los momentos débiles recientes.
          </>
        ),
      href: "/dashboard",
    },
  ].filter(Boolean) as { dot: string; text: React.ReactNode; href: string }[];

  const repRows = REPS.map((r) => {
    const rs = cur.filter((s) => s.repId === r.id);
    const rp = prev.filter((s) => s.repId === r.id);
    const sk = skillStats(rs).sort((a, b) => a.rate - b.rate)[0];
    return {
      rep: r,
      sessions: rs.length,
      score: avg(rs.map((s) => s.score)),
      spark: dailySeries(rs, "score").slice(-14).map((d) => d.value),
      delta: avg(rs.map((s) => s.score)) - avg(rp.map((s) => s.score)),
      close: pct(rs.filter(isClosed).length, rs.length),
      weak: sk?.skill ?? "—",
    };
  }).sort((a, b) => a.score - b.score);

  const trainCards = [
    ...worstObj.slice(0, 3).map((o) => ({ kind: "Objeción", title: o.category, sub: `${o.count} sesiones · ${o.handling}% calidad de manejo` })),
    worstSkill && { kind: "Habilidad", title: worstSkill.skill, sub: `mal en ${worstSkill.bad} de ${worstSkill.applied} sesiones donde aplicó (${pct(worstSkill.bad, worstSkill.applied)}%)` },
  ].filter(Boolean) as { kind: string; title: string; sub: string }[];

  return (
    <div className="mx-auto max-w-7xl p-4 lg:p-6">
      <PageHeader
        title="Panel Manager"
        subtitle={`Sparring IA · ${REPS.length} miembros · ${cur.length} sesiones`}
        right={
          <Segmented
            value={type}
            onChange={setType}
            options={[
              { value: "all", label: "Todo" },
              { value: "real", label: "Llamadas reales" },
              { value: "roleplay", label: "Simulador IA" },
            ]}
          />
        }
      />

      <SectionLabel>Esta semana</SectionLabel>
      <Card className="mb-4 divide-y divide-border">
        {insights.map((ins, i) =>
          dismissed.includes(i) ? null : (
            <div key={i} className="group flex items-center gap-3 px-4 py-3 text-sm text-text">
              <span className={cn("size-2 shrink-0 rounded-full", ins.dot)} />
              <Link href={ins.href} className="flex-1">
                {ins.text}
              </Link>
              <button onClick={() => setDismissed((d) => [...d, i])} className="text-faint opacity-0 group-hover:opacity-100" aria-label="Descartar">
                <X className="size-3.5" />
              </button>
              <ArrowRight className="size-3.5 text-faint" />
            </div>
          ),
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniKpi label="Score medio" value={`${k.avgScore}%`} delta={k.avgScore - kp.avgScore} spark={series.map((s) => s.value)} />
        <MiniKpi label="Tasa de cierre" value={`${k.closeRate}%`} delta={k.closeRate - kp.closeRate} suffix="%" />
        <MiniKpi label="Sesiones (período)" value={k.count} delta={k.count - kp.count} />
        <MiniKpi label="Activos · 7d" value={`${activeReps} / ${REPS.length}`} />
      </div>

      <Card className="mt-4">
        <CardHeader title="Comparativa del equipo" subtitle="Ordenado por urgencia de atención. Haz clic en un comercial para ver su detalle." />
        <div className="overflow-x-auto p-5 pt-3">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-[10px] tracking-wider text-faint uppercase">
                <th className="py-2 font-semibold">Comercial</th>
                <th className="text-right font-semibold">Sesiones</th>
                <th className="text-right font-semibold">Score</th>
                <th className="pl-6 font-semibold">Evolución · 14d</th>
                <th className="text-right font-semibold">Δ Período</th>
                <th className="text-right font-semibold">Cierre</th>
                <th className="pl-6 font-semibold">Habilidad débil</th>
                <th className="font-semibold">Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {repRows.map((r) => (
                <tr key={r.rep.id} onClick={() => setRepOpen(r.rep)} className="cursor-pointer border-t border-border hover:bg-surface-2">
                  <td className="py-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={r.rep.name} />
                      <span>
                        <span className="block font-medium text-text">{r.rep.name}</span>
                        <span className="text-[11px] text-faint capitalize">{r.rep.role}</span>
                      </span>
                    </span>
                  </td>
                  <td className="text-right text-text">{r.sessions}</td>
                  <td className="text-right font-semibold text-warn">{r.score}%</td>
                  <td className="pl-6">
                    <Sparkline data={r.spark} />
                  </td>
                  <td className="text-right">
                    <Delta value={r.delta} />
                  </td>
                  <td className="text-right text-text">{r.close}%</td>
                  <td className="pl-6 text-muted">{r.weak}</td>
                  <td>
                    <Badge className={r.rep.active ? "bg-good-soft text-good" : "bg-surface-2 text-muted"}>{r.rep.active ? "Activo" : "Inactivo"}</Badge>
                  </td>
                  <td className="text-faint">→</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6">
        <SectionLabel>Dónde entrenar</SectionLabel>
        <p className="-mt-1 mb-3 text-xs text-muted">Habilidades y objeciones con más margen de mejora en el equipo.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {trainCards.map((c) => (
            <Link key={c.title} href={`/simulador?focus=${encodeURIComponent(c.title)}`} className="group rounded-xl border border-border bg-surface p-4 hover:border-primary/40">
              <div className="flex justify-between">
                <p className="text-[10px] font-bold tracking-wider text-primary-text uppercase">{c.kind}</p>
                <ArrowRight className="size-3.5 text-faint group-hover:text-primary-text" />
              </div>
              <p className="mt-1 font-semibold text-text">{c.title}</p>
              <p className="mt-0.5 text-xs text-muted">{c.sub}</p>
              <p className="mt-2 text-xs font-medium text-primary-text opacity-0 group-hover:opacity-100">Asignar práctica en el simulador →</p>
            </Link>
          ))}
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Evolución del score"
          subtitle="Cada punto es el score medio del equipo ese día. La zona sombreada muestra la distancia entre el mejor y el peor resultado: si es estrecha, el equipo rinde de forma pareja."
        />
        <div className="p-3">
          <TrendArea data={series} band />
        </div>
      </Card>

      <RepDetail rep={repOpen} onClose={() => setRepOpen(null)} sessions={cur} />
    </div>
  );
}

function MiniKpi({ label, value, delta, suffix = "", spark }: { label: string; value: React.ReactNode; delta?: number; suffix?: string; spark?: number[] }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 flex items-end justify-between">
        <p className="text-3xl font-bold text-text">{value}</p>
        {spark && <Sparkline data={spark} />}
      </div>
      {delta !== undefined && (
        <p className="mt-1 text-[11px] text-faint">
          <Delta value={delta} suffix={suffix} /> vs período anterior
        </p>
      )}
    </Card>
  );
}

function RepDetail({ rep, onClose, sessions }: { rep: Rep | null; onClose: () => void; sessions: ReturnType<typeof applyFilters> }) {
  if (!rep) return null;
  const rs = sessions.filter((s) => s.repId === rep.id);
  const k = kpis(rs);
  const sk = skillStats(rs).sort((a, b) => b.rate - a.rate);
  const obj = objectionRanking(rs).slice(0, 4);
  return (
    <Modal open onClose={onClose} wide title={rep.name} subtitle={`${rep.email} · ${rs.length} sesiones en el período`}>
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Score medio" value={k.avgScore} />
        <MiniStat label="Tasa de cierre" value={`${k.closeRate}%`} />
        <MiniStat label="Objeciones" value={`${k.objectionRate}%`} />
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <SectionLabel>Habilidades</SectionLabel>
          <div className="space-y-2.5">
            {sk.slice(0, 6).map((s) => (
              <div key={s.skill}>
                <div className="flex justify-between text-xs">
                  <span className="text-text">{s.skill}</span>
                  <span className="font-semibold text-text">{s.rate}%</span>
                </div>
                <ProgressBar value={s.rate} className="mt-1" />
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionLabel>Objeciones más frecuentes</SectionLabel>
          <div className="space-y-2">
            {obj.map((o) => (
              <div key={o.category} className="flex justify-between rounded-lg bg-surface-2 px-3 py-2 text-xs">
                <span className="text-text">{o.category}</span>
                <span className="text-muted">
                  {o.count}x · {o.handling}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SectionLabel>
        <span className="mt-5 block">Últimas sesiones</span>
      </SectionLabel>
      <div className="divide-y divide-border rounded-lg border border-border">
        {rs.slice(0, 6).map((s) => (
          <Link key={s.id} href={`/llamadas?id=${s.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-surface-2">
            <ScoreBadge score={s.score} size="sm" />
            <span className="flex-1 text-sm text-text">{s.prospectName}</span>
            <span className="text-xs text-muted">{callTypeLabel(s.callType)}</span>
          </Link>
        ))}
      </div>
    </Modal>
  );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-xl font-bold text-text">{value}</p>
    </div>
  );
}
