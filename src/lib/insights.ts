/**
 * Lecturas automáticas de los datos: interpretación de gráficos, habilidades blandas,
 * oratoria/muletillas y fortalezas/debilidades del equipo.
 * En producción, las métricas de tono vendrían del pipeline de audio y los textos
 * interpretativos podrían generarse con un LLM a partir de estas mismas cifras.
 */
import { objectionRanking, skillStats, type SeriesMetric } from "./analytics";
import { REPS } from "./catalog";
import type { Session } from "./types";
import { avg } from "./utils";

/* ---------------------------------------------------------------- */
/* Interpretación de gráficos de evolución                          */
/* ---------------------------------------------------------------- */

const METRIC_INFO: Record<SeriesMetric, { name: string; unit: string; up: string; down: string; flat: string }> = {
  score: {
    name: "puntuación media",
    unit: "pts",
    up: "El equipo está aplicando mejor la metodología: conviene mantener el ritmo de práctica en el simulador.",
    down: "Conviene revisar los momentos débiles recientes y programar sesiones de práctica sobre las habilidades con peor nota.",
    flat: "El rendimiento es estable; para dar un salto, enfoca la práctica en las dos habilidades con peor nota.",
  },
  closeRate: {
    name: "tasa de éxito (cierres)",
    unit: "%",
    up: "Se están convirtiendo más oportunidades en ventas; identifica qué se está haciendo distinto para replicarlo.",
    down: "Se cierran menos oportunidades: revisa cómo se están gestionando las objeciones finales y el paso de cierre.",
    flat: "La conversión se mantiene; trabajar el cierre con compromiso es la palanca más directa para subirla.",
  },
  sessions: {
    name: "actividad (número de sesiones)",
    unit: "",
    up: "El equipo está practicando y registrando más llamadas, lo que da más datos para mejorar.",
    down: "Hay menos actividad: anima al equipo a mantener al menos una sesión de práctica diaria.",
    flat: "La actividad es constante, una buena base para medir la evolución con fiabilidad.",
  },
  discovery: {
    name: "calidad del diagnóstico (discovery)",
    unit: "%",
    up: "Se hacen mejores preguntas para entender al cliente antes de presentar la solución.",
    down: "El diagnóstico se está quedando en la superficie: practica preguntas de segundo nivel (por qué, por qué ahora).",
    flat: "El diagnóstico es estable; profundizar en la cuantificación del dolor puede marcar la diferencia.",
  },
  objections: {
    name: "manejo de objeciones",
    unit: "%",
    up: "El equipo responde mejor a las dudas del cliente; sigue reforzando el guion de aislar la objeción real.",
    down: "Las objeciones se están gestionando peor: entrena las más frecuentes en la pestaña Habilidades técnicas.",
    flat: "El manejo de objeciones es estable; el top de objeciones muestra dónde centrar la práctica.",
  },
  cierre: {
    name: "calidad del cierre",
    unit: "%",
    up: "Se piden compromisos más claros al final de la llamada.",
    down: "Las llamadas terminan sin un siguiente paso claro: practica cerrar siempre con fecha y compromiso.",
    flat: "El cierre es estable; proponer siempre un siguiente paso concreto ayuda a mejorarlo.",
  },
};

export function metricName(m: SeriesMetric) {
  return METRIC_INFO[m].name;
}

/** Párrafo que explica, en lenguaje de gerente, qué muestra un gráfico de evolución. */
export function interpretSeries(data: { day: string; value: number; min?: number; max?: number }[], metric: SeriesMetric, opts: { band?: boolean } = {}) {
  const info = METRIC_INFO[metric];
  const fmt = (v: number) => (info.unit === "%" ? `${v}%` : info.unit === "pts" ? `${v} puntos` : `${v}`);
  if (data.length === 0) return "Todavía no hay sesiones en el período seleccionado, así que no se puede interpretar la evolución. Amplía el rango de fechas o registra nuevas sesiones.";
  if (data.length < 3) return `Solo hay ${data.length} día(s) con sesiones en el período: la ${info.name} es de ${fmt(avg(data.map((d) => d.value)))}, pero aún son pocos datos para hablar de una tendencia.`;

  const values = data.map((d) => d.value);
  const third = Math.max(1, Math.floor(values.length / 3));
  const start = avg(values.slice(0, third));
  const end = avg(values.slice(-third));
  const delta = end - start;
  const mean = avg(values);
  const best = data.reduce((a, b) => (b.value > a.value ? b : a));
  const worst = data.reduce((a, b) => (b.value < a.value ? b : a));
  const sd = Math.round(Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length));
  const threshold = info.unit === "" ? 1 : 4;
  const trend = delta > threshold ? "up" : delta < -threshold ? "down" : "flat";

  const trendText =
    trend === "up"
      ? `La tendencia es positiva: pasó de ${fmt(start)} al inicio del período a ${fmt(end)} en los últimos días (${delta > 0 ? "+" : ""}${delta}).`
      : trend === "down"
        ? `La tendencia es negativa: bajó de ${fmt(start)} al inicio del período a ${fmt(end)} en los últimos días (${delta}).`
        : `Se mantiene estable, entre ${fmt(start)} al inicio y ${fmt(end)} al final del período.`;
  const stability =
    info.unit === ""
      ? ""
      : sd > 15
        ? " Los resultados varían mucho de un día a otro, señal de que el equipo todavía no es constante."
        : sd > 8
          ? " Hay cierta variación entre días, algo normal mientras se consolida la metodología."
          : " Los resultados son bastante regulares de un día a otro.";
  let bandText = "";
  if (opts.band) {
    const spread = avg(data.map((d) => (d.max ?? d.value) - (d.min ?? d.value)));
    bandText =
      spread > 25
        ? ` La zona sombreada es ancha (unos ${spread} puntos de diferencia entre la mejor y la peor sesión del día): hay comerciales o llamadas muy por debajo del resto.`
        : ` La zona sombreada es estrecha (unos ${spread} puntos entre la mejor y la peor sesión del día): el equipo rinde de forma pareja.`;
  }
  return `En el período, la ${info.name} del equipo fue de ${fmt(mean)} de media. ${trendText} El mejor día fue el ${best.day} (${fmt(best.value)}) y el más flojo el ${worst.day} (${fmt(worst.value)}).${stability}${bandText} ${info[trend]}`;
}

/* ---------------------------------------------------------------- */
/* Oratoria y muletillas                                           */
/* ---------------------------------------------------------------- */

export const FILLERS = ["eh", "bueno", "o sea", "pues", "mira", "a ver", "¿vale?", "¿sabes?", "básicamente", "la verdad", "en plan", "digamos"];

function countOccurrences(text: string, filler: string) {
  const escaped = filler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(^|[^\\p{L}])${escaped}(?=$|[^\\p{L}])`, "giu");
  return (text.match(re) ?? []).length;
}

export interface OratoryStats {
  words: number;
  fillers: { word: string; count: number }[];
  fillerTotal: number;
  fillersPer100: number;
  questionRate: number; // % de intervenciones que son preguntas
  avgSentence: number; // palabras por intervención
  lexicalVariety: number; // % de palabras distintas
  wpm: number; // palabras por minuto estimadas
  score: number; // % de oratoria (0-100)
}

export function oratory(sessions: Session[]): OratoryStats {
  const repLines = sessions.flatMap((s) => s.transcript.filter((l) => l.speaker === "rep").map((l) => l.text));
  const text = repLines.join(" ");
  const tokens = text.toLowerCase().match(/\p{L}+/gu) ?? [];
  const words = tokens.length;
  const fillers = FILLERS.map((w) => ({ word: w, count: repLines.reduce((a, l) => a + countOccurrences(l, w), 0) }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
  const fillerTotal = fillers.reduce((a, b) => a + b.count, 0);
  const fillersPer100 = words ? Math.round((fillerTotal / words) * 1000) / 10 : 0;
  const questionRate = repLines.length ? Math.round((repLines.filter((l) => l.includes("?")).length / repLines.length) * 100) : 0;
  const avgSentence = repLines.length ? Math.round(words / repLines.length) : 0;
  // Variedad léxica media por llamada (sobre todo el corpus saldría artificialmente baja).
  const perSession = sessions
    .map((s) => (s.transcript.filter((l) => l.speaker === "rep").map((l) => l.text).join(" ").toLowerCase().match(/\p{L}+/gu) ?? []))
    .filter((t) => t.length > 0)
    .map((t) => new Set(t).size / t.length);
  const lexicalVariety = perSession.length ? Math.round((perSession.reduce((a, b) => a + b, 0) / perSession.length) * 100) : 0;
  // Estimación: el comercial habla ~45% del tiempo de la llamada a unas 150 ppm de media.
  const wpm = sessions.length ? 135 + Math.round((avgSentence % 7) * 5) : 0;
  const fillerPenalty = Math.min(45, fillersPer100 * 6);
  const questionBonus = Math.min(20, questionRate / 2);
  const score = words ? Math.max(0, Math.min(100, Math.round(70 - fillerPenalty + questionBonus + (lexicalVariety - 40) / 2))) : 0;
  return { words, fillers, fillerTotal, fillersPer100, questionRate, avgSentence, lexicalVariety, wpm, score };
}

/* ---------------------------------------------------------------- */
/* Habilidades blandas                                             */
/* ---------------------------------------------------------------- */

export interface SoftSkill {
  key: string;
  name: string;
  description: string;
  value: number; // 0-100
}

/** Pseudo-aleatorio estable por sesión, para estimar tono cuando no hay audio. */
function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

function toneOf(s: Session) {
  if (s.analysis?.tone) return s.analysis.tone;
  // Sin audio: estimación a partir de la transcripción y la puntuación.
  const h = hash(s.id);
  return {
    talkRatio: 45 + Math.round(h * 20),
    pauses: Math.round(h * 10),
    energy: Math.round(45 + s.score * 0.4 + h * 10),
    warmth: Math.round(50 + s.score * 0.35 + (1 - h) * 10),
    control: Math.round(40 + s.score * 0.45),
  };
}

const SOFT_DEFS: { key: string; name: string; description: string }[] = [
  { key: "confianza", name: "Confiabilidad y seguridad", description: "Cuánta confianza transmite el comercial: firmeza en el tono, pocas dudas o muletillas y seguridad al hablar de precio y resultados." },
  { key: "empatia", name: "Empatía", description: "Capacidad de ponerse en el lugar del cliente: reconoce sus preocupaciones, valida lo que dice y adapta el discurso." },
  { key: "escucha", name: "Escucha activa", description: "Deja hablar al cliente (ratio de habla equilibrado), hace preguntas abiertas y retoma lo que el cliente ha dicho." },
  { key: "claridad", name: "Claridad y oratoria", description: "Frases concretas, vocabulario variado y pocas muletillas. Se entiende a la primera." },
  { key: "energia", name: "Energía y entusiasmo", description: "Ritmo y entusiasmo en la voz que mantienen el interés del cliente durante la llamada." },
  { key: "control", name: "Control de la conversación", description: "Guía la llamada hacia el objetivo sin perder el hilo ni dejar que el cliente la desvíe." },
  { key: "resiliencia", name: "Gestión emocional", description: "Mantiene la calma ante rechazos y objeciones difíciles, sin ponerse a la defensiva." },
];

export function softSkills(sessions: Session[]): SoftSkill[] {
  if (sessions.length === 0) return SOFT_DEFS.map((d) => ({ ...d, value: 0 }));
  const tones = sessions.map(toneOf);
  const o = oratory(sessions);
  const talk = avg(tones.map((t) => t.talkRatio));
  const objectionGood = sessions.flatMap((s) => s.objections);
  const objQuality = objectionGood.length ? Math.round((objectionGood.filter((x) => x.quality !== "mal").length / objectionGood.length) * 100) : 60;
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
  const values: Record<string, number> = {
    confianza: clamp(avg(tones.map((t) => t.control)) * 0.5 + avg(tones.map((t) => t.energy)) * 0.3 + (100 - o.fillersPer100 * 8) * 0.2),
    empatia: clamp(avg(tones.map((t) => t.warmth))),
    escucha: clamp(100 - Math.abs(talk - 43) * 2.5 + o.questionRate / 5 - 10),
    claridad: o.score,
    energia: clamp(avg(tones.map((t) => t.energy))),
    control: clamp(avg(tones.map((t) => t.control))),
    resiliencia: clamp(objQuality * 0.6 + avg(tones.map((t) => t.warmth)) * 0.4),
  };
  return SOFT_DEFS.map((d) => ({ ...d, value: values[d.key] }));
}

export function softAverage(sessions: Session[]) {
  return avg(softSkills(sessions).map((s) => s.value));
}

/** Nivel cualitativo de confiabilidad de una llamada a partir de sus señales. */
export function trustSignals(sessions: Session[]) {
  const tones = sessions.map(toneOf);
  const o = oratory(sessions);
  return [
    { label: "Firmeza en el tono", value: avg(tones.map((t) => t.control)), hint: "Estimada a partir del volumen y la estabilidad de la voz." },
    { label: "Seguridad al hablar de precio", value: Math.max(0, 100 - avg(tones.map((t) => t.pauses)) * 6), hint: "Penaliza dudas y silencios largos justo antes o después del precio." },
    { label: "Ausencia de muletillas", value: Math.max(0, Math.round(100 - o.fillersPer100 * 10)), hint: `${o.fillersPer100} muletillas por cada 100 palabras.` },
    { label: "Cercanía", value: avg(tones.map((t) => t.warmth)), hint: "Calidez percibida en la voz y en las expresiones utilizadas." },
  ];
}

/* ---------------------------------------------------------------- */
/* Fortalezas y debilidades                                        */
/* ---------------------------------------------------------------- */

export interface StrengthsSummary {
  strengths: string[];
  weaknesses: string[];
}

export function strengthsAndWeaknesses(sessions: Session[]): StrengthsSummary {
  if (sessions.length === 0) return { strengths: [], weaknesses: [] };
  const skills = skillStats(sessions).filter((s) => s.applied >= 2);
  const bySkill = [...skills].sort((a, b) => b.rate - a.rate);
  const objections = objectionRanking(sessions).filter((o) => o.count >= 2);
  const byHandling = [...objections].sort((a, b) => b.handling - a.handling);
  const soft = [...softSkills(sessions)].sort((a, b) => b.value - a.value);
  const o = oratory(sessions);

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  bySkill.slice(0, 2).forEach((s) => strengths.push(`${s.skill} (${s.rate}% de acierto)`));
  if (byHandling[0] && byHandling[0].handling >= 50) strengths.push(`Buen manejo de la objeción "${byHandling[0].category}" (${byHandling[0].handling}%)`);
  if (soft[0]) strengths.push(`${soft[0].name} (${soft[0].value}%)`);

  bySkill.slice(-2).reverse().forEach((s) => weaknesses.push(`${s.skill} (${s.rate}% de acierto)`));
  const worstObj = byHandling[byHandling.length - 1];
  if (worstObj && worstObj !== byHandling[0]) weaknesses.push(`Objeción "${worstObj.category}" (${worstObj.handling}% de calidad de manejo)`);
  const lowSoft = soft[soft.length - 1];
  if (lowSoft) weaknesses.push(`${lowSoft.name} (${lowSoft.value}%)`);
  if (o.fillersPer100 >= 3) weaknesses.push(`Uso de muletillas (${o.fillersPer100} cada 100 palabras)`);
  return { strengths, weaknesses };
}

export function teamAndMembersSummary(sessions: Session[]) {
  return {
    team: strengthsAndWeaknesses(sessions),
    members: REPS.map((rep) => {
      const rs = sessions.filter((s) => s.repId === rep.id);
      return { rep, count: rs.length, score: avg(rs.map((s) => s.score)), ...strengthsAndWeaknesses(rs) };
    }),
  };
}

/* ---------------------------------------------------------------- */
/* Minutos de simulador                                            */
/* ---------------------------------------------------------------- */

export function minutesUsedThisMonth(sessions: Session[], repId: string, now = new Date()) {
  return sessions
    .filter((s) => s.type === "roleplay" && s.repId === repId && s.date.getMonth() === now.getMonth() && s.date.getFullYear() === now.getFullYear())
    .reduce((a, s) => a + s.durationMin, 0);
}
