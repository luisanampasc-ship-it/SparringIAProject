import { OBJECTION_CATEGORIES, SKILLS } from "./catalog";
import type { CallType, Quality, RubricKey, Session, SessionType } from "./types";
import { avg, formatShortDay, pct } from "./utils";

export type TypeFilter = "all" | SessionType;

export interface Filters {
  type: TypeFilter;
  repId: string; // "all" o id
  callType: CallType | "all";
  from: Date;
  to: Date;
}

export function applyFilters(sessions: Session[], f: Filters) {
  return sessions.filter(
    (s) =>
      s.status === "analizada" &&
      (f.type === "all" || s.type === f.type) &&
      (f.repId === "all" || s.repId === f.repId) &&
      (f.callType === "all" || s.callType === f.callType) &&
      s.date >= f.from &&
      s.date <= f.to,
  );
}

export const isClosed = (s: Session) => s.outcome === "ganada";
export const isAdvance = (s: Session) => s.outcome === "ganada" || s.outcome === "en_avance";

function qualityScore(q: Quality) {
  return q === "bien" ? 100 : q === "regular" ? 55 : 10;
}

export function objectionHandling(sessions: Session[]) {
  const all = sessions.flatMap((s) => s.objections);
  return avg(all.map((o) => qualityScore(o.quality)));
}

export function kpis(sessions: Session[]) {
  return {
    avgScore: avg(sessions.map((s) => s.score)),
    count: sessions.length,
    closeRate: pct(sessions.filter(isClosed).length, sessions.length),
    objectionRate: objectionHandling(sessions),
    closed: sessions.filter(isClosed).length,
    advanceOnly: sessions.filter((s) => s.outcome === "en_avance").length,
    advanceOrClose: sessions.filter(isAdvance).length,
  };
}

export type SeriesMetric = "score" | "closeRate" | "sessions" | "discovery" | "objections" | "cierre";

export function dailySeries(sessions: Session[], metric: SeriesMetric) {
  const byDay = new Map<string, Session[]>();
  [...sessions]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .forEach((s) => {
      const k = formatShortDay(s.date);
      byDay.set(k, [...(byDay.get(k) ?? []), s]);
    });
  return [...byDay.entries()].map(([day, ss]) => {
    let value = 0;
    if (metric === "score") value = avg(ss.map((s) => s.score));
    if (metric === "closeRate") value = pct(ss.filter(isClosed).length, ss.length);
    if (metric === "sessions") value = ss.length;
    if (metric === "discovery") value = avg(ss.map((s) => s.subScores.diagnostico * 4));
    if (metric === "objections") value = avg(ss.map((s) => s.subScores.objeciones * 4));
    if (metric === "cierre") value = avg(ss.map((s) => s.subScores.cierre * 4));
    const scores = ss.map((s) => s.score);
    return { day, value, min: Math.min(...scores), max: Math.max(...scores) };
  });
}

export function rubricSeries(sessions: Session[]) {
  const byDay = new Map<string, Session[]>();
  [...sessions]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .forEach((s) => {
      const k = formatShortDay(s.date);
      byDay.set(k, [...(byDay.get(k) ?? []), s]);
    });
  return [...byDay.entries()].map(([day, ss]) => {
    const row: Record<string, number | string> = { day };
    (["apertura", "diagnostico", "objeciones", "cierre"] as RubricKey[]).forEach((k) => {
      row[k] = avg(ss.map((s) => s.subScores[k] * 4));
    });
    return row;
  });
}

export function byCallType(sessions: Session[]) {
  return (["cualificacion", "cold_call", "videollamada"] as CallType[])
    .map((ct) => {
      const ss = sessions.filter((s) => s.callType === ct);
      return {
        callType: ct,
        count: ss.length,
        close: pct(ss.filter(isClosed).length, ss.length),
        advance: pct(ss.filter((s) => s.outcome === "en_avance").length, ss.length),
        lost: pct(ss.filter((s) => s.outcome === "perdida").length, ss.length),
        score: avg(ss.map((s) => s.score)),
      };
    })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.close - a.close);
}

export function byQuality(sessions: Session[]) {
  return (["caliente", "tibio", "frio"] as const).map((q) => {
    const ss = sessions.filter((s) => s.prospectQuality === q);
    return { quality: q, count: ss.length, closed: ss.filter(isClosed).length, rate: pct(ss.filter(isClosed).length, ss.length) };
  });
}

export function objectionRanking(sessions: Session[]) {
  return OBJECTION_CATEGORIES.map((cat) => {
    const inst = sessions.flatMap((s) => s.objections.filter((o) => o.category === cat).map((o) => ({ ...o, sessionId: s.id })));
    return {
      category: cat,
      count: inst.length,
      handling: avg(inst.map((o) => qualityScore(o.quality))),
      good: inst.filter((o) => o.quality === "bien").length,
      regular: inst.filter((o) => o.quality === "regular").length,
      bad: inst.filter((o) => o.quality === "mal").length,
      instances: inst,
    };
  })
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

export function skillStats(sessions: Session[]) {
  return SKILLS.map((sk) => {
    const res = sessions.map((s) => s.skills.find((x) => x.skill === sk.name)?.result ?? "no_aplica");
    const applied = res.filter((r) => r !== "no_aplica") as Quality[];
    const good = applied.filter((r) => r === "bien").length;
    const regular = applied.filter((r) => r === "regular").length;
    const bad = applied.filter((r) => r === "mal").length;
    return {
      skill: sk.name,
      good, regular, bad,
      applied: applied.length,
      notApplied: res.length - applied.length,
      rate: applied.length ? Math.round(((good + regular * 0.6) / applied.length) * 100) : 0,
    };
  }).filter((x) => x.applied > 0);
}

export function recentMoments(sessions: Session[], n = 10) {
  return sessions
    .flatMap((s) => s.moments.map((m) => ({ ...m, sessionId: s.id, repId: s.repId, date: s.date })))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, n);
}

export function previousPeriod(f: Filters): Filters {
  const span = f.to.getTime() - f.from.getTime();
  return { ...f, from: new Date(f.from.getTime() - span), to: new Date(f.from.getTime() - 1) };
}
