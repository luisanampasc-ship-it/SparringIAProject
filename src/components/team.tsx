"use client";

import Link from "next/link";
import { ArrowRight, GraduationCap, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useState } from "react";
import { Sparkline } from "@/components/charts";
import { Avatar, Badge, Card, CardHeader, Delta, Modal, ProgressBar, ScoreBadge, SectionLabel } from "@/components/ui";
import { applyFilters, dailySeries, isClosed, kpis, objectionRanking, skillStats } from "@/lib/analytics";
import { callTypeLabel, REPS } from "@/lib/catalog";
import { softAverage, teamAndMembersSummary, type StrengthsSummary } from "@/lib/insights";
import type { Rep, Session } from "@/lib/types";
import { avg, cn, pct } from "@/lib/utils";

/* Componentes de equipo (antes en Panel Manager): insights, comparativa y detalle por comercial. */

export function WeeklyInsights({ cur, prev }: { cur: Session[]; prev: Session[] }) {
  const [dismissed, setDismissed] = useState<number[]>([]);
  const k = kpis(cur);
  const kp = kpis(prev);
  const worstObj = objectionRanking(cur)
    .filter((o) => o.count >= 3)
    .sort((a, b) => a.handling - b.handling);
  const insights = [
    worstObj[0] && {
      dot: "bg-primary",
      text: (
        <>
          La objeción <b>&ldquo;{worstObj[0].category}&rdquo;</b> aparece <b>{worstObj[0].count}x</b> en el período con solo <b>{worstObj[0].handling}%</b> de calidad de manejo. Buena oportunidad para entrenarla.
        </>
      ),
      href: "/entrenamiento?tab=tecnicas",
    },
    kp.count > 0 && {
      dot: k.avgScore >= kp.avgScore ? "bg-good" : "bg-bad",
      text:
        k.avgScore >= kp.avgScore ? (
          <>
            El equipo subió <b>+{k.avgScore - kp.avgScore} puntos</b> de score medio respecto al período anterior. ¡Buen trabajo!
          </>
        ) : (
          <>
            El score medio bajó <b>{k.avgScore - kp.avgScore} puntos</b> respecto al período anterior. Revisa los aspectos de mejora recientes.
          </>
        ),
      href: k.avgScore >= kp.avgScore ? "/entrenamiento" : "/entrenamiento?tab=mejora",
    },
  ].filter(Boolean) as { dot: string; text: React.ReactNode; href: string }[];

  return (
    <Card className="divide-y divide-border">
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
  );
}

export function TeamComparison({ cur, prev }: { cur: Session[]; prev: Session[] }) {
  const [repOpen, setRepOpen] = useState<Rep | null>(null);
  const rows = REPS.map((r) => {
    const rs = cur.filter((s) => s.repId === r.id);
    const rp = prev.filter((s) => s.repId === r.id);
    const sk = skillStats(rs).sort((a, b) => a.rate - b.rate)[0];
    return {
      rep: r,
      sessions: rs.length,
      score: avg(rs.map((s) => s.score)),
      spark: dailySeries(rs, "score").slice(-14).map((d) => d.value),
      delta: avg(rs.map((s) => s.score)) - avg(rp.map((s) => s.score)),
      hasPrev: rp.length > 0,
      close: pct(rs.filter(isClosed).length, rs.length),
      soft: softAverage(rs),
      weak: sk?.skill ?? "—",
    };
  }).sort((a, b) => a.score - b.score);

  return (
    <Card>
      <CardHeader title="Comparativa del equipo" subtitle="Ordenado por urgencia de atención. Haz clic en un comercial para ver su detalle." />
      <div className="overflow-x-auto p-5 pt-3">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="text-left text-[10px] tracking-wider text-faint uppercase">
              <th className="py-2 font-semibold">Comercial</th>
              <th className="text-right font-semibold">Sesiones</th>
              <th className="text-right font-semibold">Score</th>
              <th className="pl-6 font-semibold">Evolución · 14d</th>
              <th className="text-right font-semibold">Δ Período</th>
              <th className="text-right font-semibold">Cierre</th>
              <th className="text-right font-semibold">Hab. blandas</th>
              <th className="pl-6 font-semibold">Habilidad débil</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
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
                <td className="text-right font-semibold text-text">{r.score}%</td>
                <td className="pl-6">
                  <Sparkline data={r.spark} />
                </td>
                <td className="text-right">{r.hasPrev ? <Delta value={r.delta} /> : <span className="text-xs text-faint">—</span>}</td>
                <td className="text-right text-text">{r.close}%</td>
                <td className="text-right text-text">{r.soft}%</td>
                <td className="pl-6 text-muted">{r.weak}</td>
                <td className="text-faint">→</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <RepDetail rep={repOpen} onClose={() => setRepOpen(null)} sessions={cur} />
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Score medio" value={k.avgScore} />
        <MiniStat label="Tasa de cierre" value={`${k.closeRate}%`} />
        <MiniStat label="Objeciones" value={`${k.objectionRate}%`} />
        <MiniStat label="Hab. blandas" value={`${softAverage(rs)}%`} />
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

/** Cuadro resumen: en qué sobresale y qué debe mejorar el equipo y cada integrante. */
export function StrengthsBoard({ sessions }: { sessions: Session[] }) {
  const { team, members } = teamAndMembersSummary(sessions);
  return (
    <Card>
      <CardHeader
        title="Resumen de fortalezas y debilidades"
        subtitle="En qué sobresale el equipo y cada integrante, y qué conviene reforzar."
        right={
          <Link href="/entrenamiento" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-on-primary hover:brightness-110">
            <GraduationCap className="size-3.5" /> Ir al Centro de Entrenamiento
          </Link>
        }
      />
      <div className="overflow-x-auto p-5 pt-4">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-[10px] tracking-wider text-faint uppercase">
              <th className="w-48 py-2 font-semibold">Quién</th>
              <th className="font-semibold">
                <span className="inline-flex items-center gap-1 text-good">
                  <ThumbsUp className="size-3" /> Sobresale en
                </span>
              </th>
              <th className="font-semibold">
                <span className="inline-flex items-center gap-1 text-bad">
                  <ThumbsDown className="size-3" /> Debe mejorar
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <Row who={<span className="font-semibold text-text">Todo el equipo</span>} sub={`${sessions.length} sesiones`} data={team} highlight />
            {members.map((m) => (
              <Row
                key={m.rep.id}
                who={
                  <span className="flex items-center gap-2">
                    <Avatar name={m.rep.name} className="size-7 text-[10px]" />
                    <span className="font-medium text-text">{m.rep.name}</span>
                  </span>
                }
                sub={`${m.count} sesiones · score ${m.score}`}
                data={m}
              />
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border px-5 py-3 text-xs text-muted">
        Siguiente paso: en el <b className="text-text">Centro de Entrenamiento</b> encontrarás el detalle de cada debilidad (objeciones, habilidades blandas y aspectos de mejora) y estrategias para practicarlas en el simulador.
      </p>
    </Card>
  );
}

function Row({ who, sub, data, highlight }: { who: React.ReactNode; sub: string; data: StrengthsSummary; highlight?: boolean }) {
  return (
    <tr className={cn("border-t border-border align-top", highlight && "bg-surface-2/60")}>
      <td className="py-3 pr-3">
        {who}
        <p className="mt-0.5 text-[11px] text-faint">{sub}</p>
      </td>
      <td className="py-3 pr-4">
        {data.strengths.length ? (
          <ul className="space-y-1">
            {data.strengths.map((s) => (
              <li key={s} className="flex gap-1.5 text-xs text-text">
                <Badge className="h-fit bg-good-soft px-1 text-good">+</Badge> {s}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-faint">Sin datos suficientes</span>
        )}
      </td>
      <td className="py-3">
        {data.weaknesses.length ? (
          <ul className="space-y-1">
            {data.weaknesses.map((s) => (
              <li key={s} className="flex gap-1.5 text-xs text-text">
                <Badge className="h-fit bg-bad-soft px-1 text-bad">−</Badge> {s}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-faint">Sin datos suficientes</span>
        )}
      </td>
    </tr>
  );
}

/** Párrafo interpretativo bajo un gráfico o un bloque de KPIs. */
export function Interpretation({ children, title = "Cómo leer este gráfico" }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="mx-5 mb-5 rounded-lg border-l-2 border-primary bg-primary-soft/40 px-4 py-3">
      <p className="text-[10px] font-bold tracking-wider text-primary-text uppercase">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-text">{children}</p>
    </div>
  );
}
