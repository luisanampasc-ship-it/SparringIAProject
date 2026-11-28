"use client";

import Link from "next/link";
import { ArrowRight, ChevronDown, Mic, ShieldCheck } from "lucide-react";
import { Check } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-state";
import { GroupedBars } from "@/components/charts";
import { Popover } from "@/components/ui";
import { ObjectionScript } from "@/components/objection-script";
import { Interpretation } from "@/components/team";
import { Avatar, Badge, Card, CardHeader, InfoTip, Pills, ProgressBar, SectionLabel, Segmented } from "@/components/ui";
import { isClosed, kpis, objectionRanking, recentMoments, skillStats } from "@/lib/analytics";
import { callTypeLabel, PERSONAS, REPS, skillDescription } from "@/lib/catalog";
import { oratory, softAverage, softSkills, trustSignals } from "@/lib/insights";
import { CALL_STRATEGIES, CLIENT_PROFILES } from "@/lib/strategies";
import type { Rep, Session } from "@/lib/types";
import { cn, pct, scoreTone, toneText } from "@/lib/utils";

/* Pestañas del Centro de Entrenamiento. */

/* ---------------------------------------------------------------- */
/* Habilidades técnicas · Objeciones                                */
/* ---------------------------------------------------------------- */

export function Tecnicas({ sessions }: { sessions: Session[] }) {
  const ranking = objectionRanking(sessions);
  const total = ranking.reduce((a, o) => a + o.count, 0);
  const max = Math.max(1, ...ranking.map((o) => o.count));
  const phrases = new Map<string, { quote: string; category: string; count: number }>();
  sessions.forEach((s) =>
    s.objections.forEach((o) => {
      const cur = phrases.get(o.quote) ?? { quote: o.quote, category: o.category, count: 0 };
      cur.count += 1;
      phrases.set(o.quote, cur);
    }),
  );
  const topPhrases = [...phrases.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  const moments = new Map<string, number>();
  sessions.forEach((s) => s.objections.forEach((o) => moments.set(o.detectedVia, (moments.get(o.detectedVia) ?? 0) + 1)));
  const top = ranking[0];
  const second = ranking[1];
  const worst = [...ranking].filter((o) => o.count >= 2).sort((a, b) => a.handling - b.handling)[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Top de objeciones" subtitle="Las objeciones que más se repiten en las llamadas del período y su peso sobre el total" />
        <div className="grid gap-6 p-5 lg:grid-cols-5">
          <div className="space-y-3 lg:col-span-3">
            {ranking.map((o, i) => (
              <div key={o.category}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-text">
                    <span className="w-5 text-xs text-faint">#{i + 1}</span>
                    <span className="truncate">{o.category}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    <b className="text-text">{o.count}x</b> · {pct(o.count, total)}% · manejo <b className={toneText[scoreTone(o.handling)]}>{o.handling}%</b>
                  </span>
                </div>
                <ProgressBar value={o.count} max={max} tone="primary" className="mt-1.5" />
              </div>
            ))}
          </div>
          <div className="space-y-5 lg:col-span-2">
            <div>
              <SectionLabel>Frases que más se repiten</SectionLabel>
              <ul className="space-y-2">
                {topPhrases.map((p) => (
                  <li key={p.quote} className="rounded-lg bg-surface-2 px-3 py-2 text-xs">
                    <span className="text-text italic">&ldquo;{p.quote}&rdquo;</span>
                    <span className="mt-0.5 flex justify-between text-faint">
                      <span>{p.category}</span>
                      <b className="text-text">{p.count}x</b>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <SectionLabel>¿Cuándo aparecen?</SectionLabel>
              {[...moments.entries()].map(([k, v]) => (
                <div key={k} className="mb-1.5 flex justify-between text-xs">
                  <span className="text-muted first-letter:uppercase">{k}</span>
                  <b className="text-text">{pct(v, total)}%</b>
                </div>
              ))}
            </div>
          </div>
        </div>
        {top && (
          <Interpretation title="Patrones detectados">
            La objeción más repetida es <b>&ldquo;{top.category}&rdquo;</b>, presente en el {pct(top.count, total)}% de los casos
            {second ? <>, seguida de <b>&ldquo;{second.category}&rdquo;</b> ({pct(second.count, total)}%)</> : null}.
            {worst ? <> La peor gestionada es <b>&ldquo;{worst.category}&rdquo;</b>, con un {worst.handling}% de calidad de manejo: es la que más rendimiento daría entrenar.</> : null} Debajo tienes, para cada objeción, el guion sugerido por la IA en tres pasos.
          </Interpretation>
        )}
      </Card>

      <Card>
        <CardHeader title="Objeciones por comercial" subtitle="Cuántas veces ha enfrentado cada comercial cada objeción y con qué calidad la gestionó" />
        <div className="overflow-x-auto p-5 pt-3">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-[10px] tracking-wider text-faint uppercase">
                <th className="py-2 font-semibold">Objeción</th>
                {REPS.map((r) => (
                  <th key={r.id} className="text-right font-semibold">
                    {r.name.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ranking.map((o) => (
                <tr key={o.category} className="border-t border-border">
                  <td className="py-2.5 text-text">{o.category}</td>
                  {REPS.map((r) => {
                    const mine = objectionRanking(sessions.filter((s) => s.repId === r.id)).find((x) => x.category === o.category);
                    return (
                      <td key={r.id} className="text-right text-xs">
                        {mine ? (
                          <>
                            <b className="text-text">{mine.count}x</b> · <span className={toneText[scoreTone(mine.handling)]}>{mine.handling}%</span>
                          </>
                        ) : (
                          <span className="text-faint">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <ObjectionsAccordion sessions={sessions} />
      <TechnicalSkills sessions={sessions} />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Estrategias de venta                                             */
/* ---------------------------------------------------------------- */

export function Estrategias() {
  const [profile, setProfile] = useState(CLIENT_PROFILES[0].id);
  const p = CLIENT_PROFILES.find((x) => x.id === profile)!;
  const persona = PERSONAS.find((x) => x.id === p.personaId);
  const [callType, setCallType] = useState(CALL_STRATEGIES[0].callType);
  const cs = CALL_STRATEGIES.find((x) => x.callType === callType)!;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Adapta tu speech al perfil del cliente" subtitle="Cada cliente compra de una forma distinta. Identifica su perfil y ajusta el discurso." />
        <div className="px-5 pt-4">
          <Segmented value={profile} onChange={setProfile} options={CLIENT_PROFILES.map((x) => ({ value: x.id, label: x.name }))} />
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-text">{p.tagline}</p>
            <List title="Cómo reconocerlo" items={p.recognize} dot="bg-info" />
            <List title="Cómo abordarlo" items={p.approach} dot="bg-good" />
            <List title="Qué evitar" items={p.avoid} dot="bg-bad" />
            {persona && (
              <Link href={`/simulador?persona=${persona.id}&focus=${encodeURIComponent(`Perfil ${p.name}`)}`} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-on-primary hover:brightness-110">
                <Mic className="size-3.5" /> Practicar con {persona.name} ({persona.role})
              </Link>
            )}
          </div>
          <ObjectionScript script={p.speech} label={`Speech de ejemplo · perfil ${p.name.toLowerCase()}`} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Estrategia según el tipo de llamada" subtitle="El objetivo y los pasos cambian según el momento de la venta" />
        <div className="px-5 pt-4">
          <Segmented value={callType} onChange={setCallType} options={CALL_STRATEGIES.map((x) => ({ value: x.callType, label: callTypeLabel(x.callType) }))} />
        </div>
        <div className="p-5">
          <p className="font-semibold text-text">{cs.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            Objetivo: <b className="text-text">{cs.goal}</b>
          </p>
          <ol className="mt-4 grid gap-3 md:grid-cols-2">
            {cs.steps.map((st, i) => (
              <li key={st.title} className="rounded-xl border border-border p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-text">
                  <span className="grid size-5 place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary-text">{i + 1}</span>
                  {st.title}
                </p>
                <p className="mt-1 text-xs text-muted">{st.text}</p>
                <p className="mt-2 rounded-md bg-surface-2 px-3 py-2 text-xs text-text italic">&ldquo;{st.example}&rdquo;</p>
              </li>
            ))}
          </ol>
        </div>
      </Card>
    </div>
  );
}

function List({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <ul className="space-y-1">
        {items.map((x) => (
          <li key={x} className="flex items-start gap-2 text-sm text-text">
            <span className={cn("mt-2 size-1.5 shrink-0 rounded-full", dot)} /> {x}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Habilidades blandas                                              */
/* ---------------------------------------------------------------- */

export function Blandas({ sessions }: { sessions: Session[] }) {
  const { account } = useApp();
  const team = softSkills(sessions);
  // Un comercial solo ve sus datos: solo puede compararse consigo mismo. Admin y manager eligen a quién comparar.
  const available = account?.role === "comercial" ? REPS.filter((r) => r.id === account.userId) : REPS;
  const [selectedIds, setSelectedIds] = useState<string[]>(() => available.slice(0, 3).map((r) => r.id));
  const selected = available.filter((r) => selectedIds.includes(r.id));
  const people = selected.map((r) => {
    const rs = sessions.filter((s) => s.repId === r.id);
    return { rep: r, sessions: rs, soft: softSkills(rs), avg: softAverage(rs), oratory: oratory(rs), trust: trustSignals(rs) };
  });
  const teamAvg = softAverage(sessions);
  const teamOratory = oratory(sessions);
  const teamTrust = trustSignals(sessions);
  const trustScore = Math.round(teamTrust.reduce((a, t) => a + t.value, 0) / Math.max(1, teamTrust.length));
  const sorted = [...team].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <ScoreCard label="Equipo" value={teamAvg} sub={`${sessions.length} sesiones analizadas`} />
        <Card className="p-4 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-text">Integrantes del equipo</p>
              <p className="text-[11px] text-faint">Elige hasta 3 personas para comparar su puntuación, habilidades blandas y cierre.</p>
            </div>
            <MemberPicker options={available} value={selectedIds} onChange={setSelectedIds} />
          </div>
          <div className="mt-3 flex flex-wrap gap-4">
            {people.map((p) => (
              <div key={p.rep.id} className="flex min-w-40 flex-1 items-center gap-2">
                <Avatar name={p.rep.name} className="size-8 text-[10px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-text">{p.rep.name}</p>
                  <ProgressBar value={p.avg} className="mt-1" />
                </div>
                <span className={cn("text-sm font-bold", toneText[scoreTone(p.avg)])}>{p.sessions.length ? `${p.avg}%` : "—"}</span>
              </div>
            ))}
            {people.length === 0 && <p className="text-xs text-faint">Selecciona al menos un integrante.</p>}
          </div>
        </Card>
      </div>

      {people.length > 0 && <MemberComparison people={people} />}

      <Card>
        <CardHeader title="Habilidades blandas" subtitle="Nivel aproximado (%) estimado a partir de la transcripción y del tono de voz cuando hay audio" />
        <div className="overflow-x-auto p-5 pt-3">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[10px] tracking-wider text-faint uppercase">
                <th className="py-2 font-semibold">Habilidad</th>
                <th className="w-1/4 font-semibold">Equipo</th>
                {people.map((p) => (
                  <th key={p.rep.id} className="text-right font-semibold">
                    {p.rep.name.split(" ")[0]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.map((sk) => (
                <tr key={sk.key} className="border-t border-border">
                  <td className="py-3">
                    <span className="flex items-center gap-1.5 text-text">
                      {sk.name} <InfoTip label={sk.name} text={sk.description} />
                    </span>
                  </td>
                  <td className="pr-4">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={sk.value} className="flex-1" />
                      <span className={cn("w-9 text-right text-xs font-semibold", toneText[scoreTone(sk.value)])}>{sk.value}%</span>
                    </div>
                  </td>
                  {people.map((p) => {
                    const v = p.soft.find((x) => x.key === sk.key)?.value ?? 0;
                    return (
                      <td key={p.rep.id} className={cn("text-right text-xs font-semibold", toneText[scoreTone(v)])}>
                        {p.sessions.length ? `${v}%` : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Interpretation title="Interpretación">
          El equipo destaca en <b>{sorted[0]?.name.toLowerCase()}</b> ({sorted[0]?.value}%) y <b>{sorted[1]?.name.toLowerCase()}</b> ({sorted[1]?.value}%). El punto más débil es{" "}
          <b>{sorted[sorted.length - 1]?.name.toLowerCase()}</b> ({sorted[sorted.length - 1]?.value}%).{" "}
          {sorted[sorted.length - 1]?.key === "escucha"
            ? "Los comerciales hablan más de la cuenta: el objetivo es que el cliente hable al menos el 55% del tiempo."
            : sorted[sorted.length - 1]?.key === "claridad"
              ? "Reducir muletillas y usar frases más cortas hará que el mensaje llegue mejor."
              : "Practicar llamadas en dificultad «Difícil» en el simulador ayuda a reforzar esta habilidad."}
        </Interpretation>
      </Card>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> Análisis de confiabilidad en la llamada
            </span>
          }
          subtitle="¿Transmite el comercial seguridad y credibilidad? Señales detectadas en la voz y en el discurso"
          right={<span className={cn("text-2xl font-bold", toneText[scoreTone(trustScore)])}>{trustScore}%</span>}
        />
        <div className="grid gap-6 p-5 md:grid-cols-2">
          <div className="space-y-3">
            <SectionLabel>Equipo</SectionLabel>
            {teamTrust.map((t) => (
              <div key={t.label}>
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-text">
                    {t.label} <InfoTip text={t.hint} />
                  </span>
                  <span className={cn("font-semibold", toneText[scoreTone(t.value)])}>{t.value}%</span>
                </div>
                <ProgressBar value={t.value} className="mt-1.5" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <SectionLabel>Por comercial</SectionLabel>
            {people.map((p) => {
              const v = Math.round(p.trust.reduce((a, t) => a + t.value, 0) / Math.max(1, p.trust.length));
              const weakest = [...p.trust].sort((a, b) => a.value - b.value)[0];
              return (
                <div key={p.rep.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={p.rep.name} className="size-7 text-[10px]" />
                    <span className="flex-1 text-sm font-medium text-text">{p.rep.name}</span>
                    <span className={cn("font-semibold", toneText[scoreTone(v)])}>{p.sessions.length ? `${v}%` : "—"}</span>
                  </div>
                  {weakest && p.sessions.length > 0 && <p className="mt-1.5 text-xs text-muted">Punto a reforzar: {weakest.label.toLowerCase()} ({weakest.value}%).</p>}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Oratoria y muletillas" subtitle="Palabras de relleno, ritmo y estructura del discurso del comercial (a partir de la transcripción)" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Oratoria (equipo)" value={`${teamOratory.score}%`} hint="Puntuación global de claridad al hablar" />
          <Stat label="Muletillas" value={`${teamOratory.fillersPer100}`} hint="por cada 100 palabras (ideal < 2)" />
          <Stat label="Preguntas" value={`${teamOratory.questionRate}%`} hint="de las intervenciones son preguntas" />
          <Stat label="Variedad de vocabulario" value={`${teamOratory.lexicalVariety}%`} hint={`~${teamOratory.avgSentence} palabras por intervención · ${teamOratory.wpm} ppm`} />
        </div>
        <div className="grid gap-6 px-5 pb-5 md:grid-cols-3">
          <div>
            <SectionLabel>Muletillas más repetidas · equipo</SectionLabel>
            <FillerList items={teamOratory.fillers} />
          </div>
          {people.map((p) => (
            <div key={p.rep.id}>
              <SectionLabel>
                {p.rep.name} · {p.oratory.fillersPer100} cada 100 palabras · oratoria {p.oratory.score}%
              </SectionLabel>
              <FillerList items={p.oratory.fillers} />
            </div>
          ))}
        </div>
        <Interpretation title="Interpretación">
          {teamOratory.fillersPer100 >= 3
            ? `El equipo usa bastantes muletillas (${teamOratory.fillersPer100} cada 100 palabras). La más frecuente es «${teamOratory.fillers[0]?.word ?? "—"}». Restan seguridad y hacen que el mensaje parezca menos preparado: sustitúyelas por una breve pausa.`
            : `El uso de muletillas es moderado (${teamOratory.fillersPer100} cada 100 palabras). Mantén las frases cortas y haz pausas en lugar de usar palabras de relleno.`}{" "}
          {teamOratory.questionRate < 40 ? "Además, se hacen pocas preguntas: aumentar las preguntas abiertas mejora la escucha y el diagnóstico." : "El porcentaje de preguntas es bueno, señal de una conversación orientada al cliente."}
        </Interpretation>
      </Card>
    </div>
  );
}

function ScoreCard({ label, value, sub, avatar }: { label: string; value: number; sub: string; avatar?: string }) {
  return (
    <Card className="flex items-center gap-4 p-4">
      {avatar ? <Avatar name={avatar} className="size-10" /> : <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary-text">EQ</span>}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{label}</p>
        <p className="text-[11px] text-faint">{sub}</p>
        <ProgressBar value={value} className="mt-1.5" />
      </div>
      <p className={cn("text-2xl font-bold", toneText[scoreTone(value)])}>{value}%</p>
    </Card>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[10px] font-semibold tracking-wider text-faint uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold text-text">{value}</p>
      <p className="text-[11px] text-muted">{hint}</p>
    </div>
  );
}

function FillerList({ items }: { items: { word: string; count: number }[] }) {
  if (!items.length) return <p className="text-xs text-faint">Sin muletillas detectadas.</p>;
  const max = Math.max(...items.map((x) => x.count));
  return (
    <div className="space-y-2">
      {items.slice(0, 6).map((x) => (
        <div key={x.word} className="flex items-center gap-2 text-xs">
          <span className="w-20 shrink-0 text-text">«{x.word}»</span>
          <ProgressBar value={x.count} max={max} tone="warn" className="flex-1" />
          <span className="w-8 text-right font-semibold text-text">{x.count}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Aspectos de mejora                                               */
/* ---------------------------------------------------------------- */

export function Mejora({ sessions }: { sessions: Session[] }) {
  const stats = skillStats(sessions);
  const low = [...stats].sort((a, b) => a.rate - b.rate).slice(0, 5);
  const ranking = objectionRanking(sessions);
  const worstObj = [...ranking].filter((o) => o.count >= 2).sort((a, b) => a.handling - b.handling);
  const worstSkill = [...stats].sort((a, b) => b.bad / Math.max(1, b.applied) - a.bad / Math.max(1, a.applied))[0];

  // Errores más frecuentes detectados por la IA (fallo principal + áreas de desarrollo).
  const errors = new Map<string, number>();
  sessions.forEach((s) => {
    if (s.analysis?.mainFailure) errors.set(s.analysis.mainFailure, (errors.get(s.analysis.mainFailure) ?? 0) + 1);
    s.analysis?.developmentAreas.forEach((d) => {
      const k = `Falta de ${d.skill.toLowerCase()}: ${d.impact}`;
      errors.set(k, (errors.get(k) ?? 0) + 1);
    });
  });
  const topErrors = [...errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const analyzed = sessions.filter((s) => s.analysis).length;

  const trainCards = [
    ...worstObj.slice(0, 3).map((o) => ({ kind: "Objeción", title: o.category, sub: `${o.count} sesiones · ${o.handling}% calidad de manejo` })),
    worstSkill && { kind: "Habilidad", title: worstSkill.skill, sub: `mal en ${worstSkill.bad} de ${worstSkill.applied} sesiones donde aplicó (${pct(worstSkill.bad, worstSkill.applied)}%)` },
  ].filter(Boolean) as { kind: string; title: string; sub: string }[];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top 5 a mejorar" subtitle="Habilidades con más errores en las sesiones donde aplicaban" />
          <div className="p-5">
            <SkillColumn title="Habilidades" items={low} tone="bad" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Dónde hubo errores" subtitle={`Fallos más repetidos detectados por la IA en ${analyzed} sesiones`} />
          <div className="space-y-3 p-5">
            {topErrors.map(([text, n]) => (
              <div key={text} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-text">{text}</p>
                  <Badge className="shrink-0 bg-bad-soft text-bad">{pct(n, analyzed)}%</Badge>
                </div>
                <p className="mt-1 text-[11px] text-faint">Aparece en {n} de {analyzed} sesiones</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <SectionLabel>Dónde entrenar</SectionLabel>
        <p className="-mt-1 mb-3 text-xs text-muted">Habilidades y objeciones con más margen de mejora en el equipo. Haz clic para practicarlas en el simulador.</p>
        <div className="grid gap-3 md:grid-cols-2">
          {trainCards.map((c) => (
            <Link key={c.title} href={`/simulador?focus=${encodeURIComponent(c.title)}`} className="group rounded-xl border border-border bg-surface p-4 hover:border-primary/40">
              <div className="flex justify-between">
                <p className="text-[10px] font-bold tracking-wider text-primary-text uppercase">{c.kind}</p>
                <ArrowRight className="size-3.5 text-faint group-hover:text-primary-text" />
              </div>
              <p className="mt-1 font-semibold text-text">{c.title}</p>
              <p className="mt-0.5 text-xs text-muted">{c.sub}</p>
              <p className="mt-2 text-xs font-medium text-primary-text opacity-0 group-hover:opacity-100">Practicar en el simulador →</p>
            </Link>
          ))}
        </div>
      </div>

      <KeyMoments sessions={sessions} />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Componentes compartidos                                          */
/* ---------------------------------------------------------------- */

function ObjectionsAccordion({ sessions }: { sessions: Session[] }) {
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

function TechnicalSkills({ sessions }: { sessions: Session[] }) {
  const stats = skillStats(sessions);
  const top = [...stats].sort((a, b) => b.rate - a.rate).slice(0, 5);
  const low = [...stats].sort((a, b) => a.rate - b.rate).slice(0, 5);
  return (
    <Card>
      <CardHeader title="Habilidades técnicas del equipo" subtitle="Skills de venta detectadas por la IA en cada llamada" />
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
  );
}

function KeyMoments({ sessions }: { sessions: Session[] }) {
  const [filter, setFilter] = useState<"todos" | "debil" | "fuerte">("debil");
  const moments = recentMoments(sessions, 30)
    .filter((m) => filter === "todos" || m.kind === filter)
    .slice(0, 10);
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Momentos clave recientes"
          subtitle="Los últimos momentos detectados por la IA: dónde hubo errores y qué se hizo bien"
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

/* ---------------------------------------------------------------- */
/* Comparativa de integrantes                                       */
/* ---------------------------------------------------------------- */

const COMPARE_COLORS = ["var(--brand)", "var(--info)", "var(--accent)"];
const MAX_COMPARE = 3;

/** Desplegable con casillas para elegir hasta 3 integrantes del equipo. */
function MemberPicker({ options, value, onChange }: { options: Rep[]; value: string[]; onChange: (ids: string[]) => void }) {
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else if (value.length < MAX_COMPARE) onChange([...value, id]);
  };
  return (
    <Popover
      className="w-64 p-1"
      trigger={(open, t) => (
        <button onClick={t} className="flex h-8 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-xs text-text hover:bg-surface-2">
          {value.length ? `${value.length} seleccionad${value.length === 1 ? "o" : "os"}` : "Elegir integrantes"}
          <ChevronDown className={cn("size-3.5 text-muted transition", open && "rotate-180")} />
        </button>
      )}
    >
      {() => (
        <div className="max-h-72 overflow-y-auto">
          <p className="px-2 py-1.5 text-[10px] text-faint">Hasta {MAX_COMPARE} personas</p>
          {options.map((r) => {
            const on = value.includes(r.id);
            const disabled = !on && value.length >= MAX_COMPARE;
            return (
              <button
                key={r.id}
                onClick={() => toggle(r.id)}
                disabled={disabled}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-text hover:bg-surface-2 disabled:opacity-40"
              >
                <span className={cn("grid size-4 place-items-center rounded border", on ? "border-primary bg-primary text-on-primary" : "border-border")}>{on && <Check className="size-3" />}</span>
                <Avatar name={r.name} className="size-6 text-[9px]" />
                <span className="truncate">{r.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}

type Person = { rep: Rep; sessions: Session[]; soft: ReturnType<typeof softSkills>; avg: number };

function MemberComparison({ people }: { people: Person[] }) {
  const series = people.map((p, i) => ({ key: p.rep.id, name: p.rep.name, color: COMPARE_COLORS[i % COMPARE_COLORS.length] }));
  const kpiRows = [
    { label: "Puntuación media", get: (p: Person) => kpis(p.sessions).avgScore },
    { label: "Tasa de cierre", get: (p: Person) => pct(p.sessions.filter(isClosed).length, p.sessions.length) },
    { label: "Habilidades blandas", get: (p: Person) => p.avg },
  ].map((row) => ({ label: row.label, ...Object.fromEntries(people.map((p) => [p.rep.id, row.get(p)])) }));
  const softRows = (people[0]?.soft ?? []).map((sk) => ({
    label: sk.name,
    ...Object.fromEntries(people.map((p) => [p.rep.id, p.soft.find((x) => x.key === sk.key)?.value ?? 0])),
  }));
  // Lectura rápida: quién destaca en cada indicador.
  const leaders = kpiRows.map((row) => {
    const best = [...people].sort((a, b) => Number(row[b.rep.id as keyof typeof row]) - Number(row[a.rep.id as keyof typeof row]))[0];
    return `${row.label.toLowerCase()}: ${best.rep.name.split(" ")[0]} (${row[best.rep.id as keyof typeof row]}%)`;
  });

  return (
    <Card>
      <CardHeader title="Comparativa de integrantes" subtitle="Puntuación, cierre y habilidades blandas de las personas seleccionadas en el período" />
      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <div>
          <SectionLabel>Puntuación, cierre y habilidades blandas</SectionLabel>
          <GroupedBars data={kpiRows} series={series} height={260} />
        </div>
        <div>
          <SectionLabel>Habilidades blandas por integrante</SectionLabel>
          <GroupedBars data={softRows} series={series} height={Math.max(260, softRows.length * 30 * Math.max(1, people.length * 0.6))} layout="vertical" />
        </div>
      </div>
      {people.length > 1 && <Interpretation title="Quién destaca">Mejor resultado en {leaders.join("; ")}.</Interpretation>}
    </Card>
  );
}
