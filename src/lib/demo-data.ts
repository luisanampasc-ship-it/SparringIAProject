import { DEFAULT_RUBRICS, OBJECTION_CATEGORIES, PERSONAS, REPS, SKILLS } from "./catalog";
import type {
  Analysis, AppNotification, CallType, KeyMoment, ObjectionInstance, Outcome,
  ProspectTemp, Quality, RubricKey, Rubrics, Session, SkillResult, TranscriptLine,
} from "./types";

/** PRNG determinista (mulberry32) para que los datos demo sean estables. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REAL_PROSPECTS = [
  "Eduardo Ruiz", "María Paredes", "Juan Rodríguez", "Marcos Gil", "Carmen López", "Sofía Méndez",
  "Pablo Serrano", "Laura Benítez", "Diego Fuentes", "Nuria Campos", "Alberto Prieto", "Irene Molina",
  "Hugo Delgado", "Patricia Romero", "Sergio Blanco", "Ana Lozano", "Ramón Vega", "Cristina Peña",
  "Iván Cabrera", "Lorena Duarte", "Felipe Arias", "Rocío Marín", "Daniel Sanz", "Clara Esteban", "Víctor León",
];

const PRODUCT = "programa de formación en ventas consultivas";

const QUOTES_BY_CATEGORY: Record<string, string[]> = {
  "Dinero / Capacidad de inversión": ["¿Y de cuánto estamos hablando?", "Son 4.000 euros… no sé si me lo puedo permitir ahora.", "¿Cuánto costaba el año pasado?"],
  "Tiempo / No es el momento": ["Ahora mismo estamos a tope, quizá después del verano.", "No tengo tiempo ni para respirar."],
  "Confianza / Credibilidad": ["¿Y cómo sé que esto funciona de verdad?", "Ya contraté algo parecido y no sirvió."],
  "Autoridad / Decisión compartida": ["Lo tengo que consultar con mi socio.", "Esto lo decide dirección, no yo."],
  "Necesidad / No ve el problema": ["La verdad es que ya vendemos bastante bien.", "No creo que lo necesitemos."],
  "Logística / Operativa": ["¿Cuántas horas a la semana me va a quitar?", "Mi equipo trabaja en turnos, no sé cómo encajarlo."],
  "Indecisión / Me lo tengo que pensar": ["Déjame pensarlo y te digo algo.", "Mándame la información y lo vemos."],
};

function pick<T>(r: () => number, xs: T[]): T {
  return xs[Math.floor(r() * xs.length)];
}

function quality(r: () => number, bias: number): Quality {
  const x = r() + bias;
  if (x > 0.95) return "bien";
  if (x > 0.45) return "regular";
  return "mal";
}

function buildScript(category: string, quote: string): ObjectionInstance["script"] {
  const map: Record<string, ObjectionInstance["script"]> = {
    "Dinero / Capacidad de inversión": {
      quote,
      keyQuestion: "Entiendo. Para darte un precio que tenga sentido, ¿qué te preocupa más: la cifra en sí o no tener claro si vas a recuperar la inversión?",
      branches: [
        { ifAnswer: "Liquidez", reply: "Tiene sentido. Podemos repartirlo en varios pagos para que no afecte a tu caja. Si eso queda resuelto, ¿avanzaríamos hoy?" },
        { ifAnswer: "Duda sobre el retorno", reply: "Te enseño el caso de un cliente de tu sector que recuperó la inversión en tres meses. ¿Qué tendría que ver para sentirte seguro?" },
      ],
      close: "Si resolvemos el pago con un plan cómodo y te doy garantía de resultados, ¿te parece que empecemos esta semana?",
    },
    "Autoridad / Decisión compartida": {
      quote,
      keyQuestion: "Perfecto, ¿qué crees que te preguntaría tu socio y qué le responderías tú ahora mismo?",
      branches: [
        { ifAnswer: "Le preocupa el precio", reply: "Preparemos juntos los números para que se los presentes. ¿Podemos agendar 15 minutos con los dos esta semana?" },
        { ifAnswer: "Tú ya estás convencido", reply: "Genial. ¿Qué necesitas de mí para que la conversación con él sea fácil?" },
      ],
      close: "¿Te parece si dejamos ya la reunión con tu socio en el calendario para el jueves?",
    },
    "Confianza / Credibilidad": {
      quote,
      keyQuestion: "Es lógico dudar. ¿Qué pasó con lo que contrataste antes y qué te habría gustado que fuera distinto?",
      branches: [
        { ifAnswer: "No hubo seguimiento", reply: "Justo eso es lo que cambia aquí: tienes sesiones semanales y alguien que revisa tus llamadas. ¿Eso cubriría lo que te faltó?" },
        { ifAnswer: "Era muy genérico", reply: "Aquí trabajamos con tus propias llamadas, no con teoría. ¿Quieres que analicemos una ahora como prueba?" },
      ],
      close: "Si en la primera semana ves que no es lo que esperabas, lo paramos. ¿Empezamos?",
    },
  };
  return (
    map[category] ?? {
      quote,
      keyQuestion: "Te entiendo. Antes de seguir, ¿qué es exactamente lo que te hace dudar?",
      branches: [
        { ifAnswer: "Es un tema de momento", reply: "¿Qué tendría que pasar para que fuera el momento? Si lo dejamos tres meses, ¿qué te cuesta esperar?" },
        { ifAnswer: "Necesita más información", reply: "Claro. Dime qué dos cosas necesitas saber para decidir y las vemos ahora." },
      ],
      close: "Con eso aclarado, ¿te parece que dejemos fijado el siguiente paso hoy?",
    }
  );
}

function buildTranscript(r: () => number, prospect: string, repName: string, objections: ObjectionInstance[]): TranscriptLine[] {
  const first = repName.split(" ")[0];
  const pFirst = prospect.split(" ")[0];
  const lines: [TranscriptLine["speaker"], string][] = [
    ["rep", `Hola ${pFirst}, soy ${first}. ¿Qué tal todo? Gracias por sacar este rato.`],
    ["prospect", "Bien, bien, con mucho lío pero bien."],
    ["rep", "Te cuento cómo había pensado la llamada: unos minutos para entender tu situación, luego te enseño cómo trabajamos y al final vemos si tiene sentido seguir. ¿Te parece?"],
    ["prospect", "Perfecto."],
    ["rep", "¿Qué te llevó a dejar tus datos y por qué justo ahora?"],
    ["prospect", "Llevo años con el negocio y siento que he tocado techo. Quiero vender más sin trabajar más horas."],
    ["rep", "¿Y qué has intentado hasta ahora para conseguirlo?"],
    ["prospect", "Cursos sueltos, algún libro… pero nada que me haya cambiado los números."],
    ["rep", "Del 1 al 10, ¿cómo de importante es para ti resolverlo este año?"],
    ["prospect", "Un ocho, más o menos."],
    ["rep", `Te explico el ${PRODUCT}: trabajamos con tus llamadas reales, tienes mentoría semanal y acceso a la comunidad.`],
  ];
  objections.forEach((o) => {
    lines.push(["prospect", o.quote]);
    lines.push(["rep", "Entiendo perfectamente. Déjame que te haga una pregunta sobre eso…"]);
  });
  lines.push(["rep", "¿Cómo lo ves? ¿Te gustaría empezar?"]);
  lines.push(["prospect", r() > 0.5 ? "Me gusta, pero quiero darle una vuelta." : "Sí, vamos a hacerlo."]);
  // Muletillas: cada comercial tiene su propio "estilo" para que el análisis de oratoria muestre diferencias.
  const f = rng(repName.length * 7919 + Math.floor(r() * 1000));
  const fillerRate = repName.startsWith("Ó") ? 0.55 : 0.3;
  const withFillers = lines.map(([speaker, text]): [TranscriptLine["speaker"], string] => {
    if (speaker !== "rep" || f() > fillerRate) return [speaker, text];
    const start = pick(f, ["Eh, ", "Bueno, ", "O sea, ", "Pues ", "Mira, ", "A ver, "]);
    const end = f() > 0.5 ? pick(f, [", ¿vale?", ", ¿sabes?", ", básicamente.", ", la verdad."]) : "";
    const body = end ? text.replace(/[.?!]$/, "") : text;
    return [speaker, `${start}${body.charAt(0).toLowerCase()}${body.slice(1)}${end}`];
  });
  let t = 0;
  return withFillers.map(([speaker, text]) => {
    const line = { t, speaker, text };
    t += 8 + Math.floor(r() * 40);
    return line;
  });
}

function buildAnalysis(
  r: () => number, s: { prospect: string; repName: string; callType: CallType; outcome: Outcome; score: number; weakSkill: string; hasAudio: boolean },
): Analysis {
  const rep = s.repName.split(" ")[0];
  const typeLabel = s.callType === "cold_call" ? "Llamada en frío" : s.callType === "cualificacion" ? "Llamada de cualificación" : "Videollamada de cierre";
  const outcomeLabel = { ganada: "GANADA", en_avance: "EN AVANCE", perdida: "PERDIDA", seguimiento: "SEGUIMIENTO" }[s.outcome];
  return {
    context: `${typeLabel} entre ${s.repName} y ${s.prospect} para presentar el ${PRODUCT}, con un ticket aproximado de 4.000 €. Resultado: ${outcomeLabel}.`,
    strengths: `${rep} abrió con un marco claro ("unos minutos para entender tu situación, luego te enseño cómo trabajamos") y conectó con la motivación principal del prospecto: crecer sin trabajar más horas. El tono fue cercano y seguro durante toda la conversación.`,
    clientResponse: `${s.prospect} mostró interés real por mejorar sus resultados ("siento que he tocado techo"), pero expresó dudas sobre la inversión y sobre si tendría tiempo para aprovechar el programa.`,
    overall: s.score >= 70
      ? "Buena llamada con estructura sólida. El diagnóstico fue profundo y el cierre llegó en el momento adecuado; queda margen en la gestión de la objeción principal."
      : "La llamada empezó bien y detectó el dolor, pero el diagnóstico se quedó en la superficie y la objeción de dinero no se aisló, lo que dejó la decisión en manos del prospecto.",
    globalFeedback: `${rep}, sabes generar confianza y fijar el marco de la llamada. Para subir tu tasa de cierre necesitas un método más estructurado para las objeciones: primero aislar la objeción real y después responder.`,
    priority: `Durante los próximos 30 días, practica la ${s.weakSkill} antes del pitch. Anclar la inversión con preguntas concretas te dará una base sólida para presentar el precio.`,
    prioritySkill: s.weakSkill,
    developmentAreas: [
      {
        skill: "Chequeo de interés",
        quote: "Del 1 al 10… un ocho, más o menos.",
        impact: "El prospecto dio una nota alta pero no perfecta. No se exploró qué faltaba para llegar a 10, y ahí estaba la objeción que apareció al final.",
      },
      {
        skill: s.weakSkill,
        quote: "Son 4.000 euros… no sé si me lo puedo permitir ahora.",
        impact: "Sin conocer antes la capacidad de inversión, el precio llegó sin ancla y la conversación giró hacia el coste en lugar del valor.",
      },
    ],
    missedOpportunities: [
      `Cuando ${s.prospect.split(" ")[0]} dijo que había probado "cursos sueltos", ${rep} podía haber preguntado qué faltó en esos cursos para diferenciar la propuesta.`,
    ],
    outcomeReasoning: s.outcome === "ganada"
      ? "El prospecto aceptó avanzar tras resolver la objeción de pago con un plan fraccionado."
      : s.outcome === "perdida"
        ? "El prospecto rechazó la propuesta al no ver claro el retorno y no se logró reencuadrar la objeción."
        : "La llamada terminó sin compromiso firme: el prospecto quiere consultarlo y mantiene dudas sobre el retorno.",
    nextStep: "Confirmar una nueva reunión con todos los decisores, llevar un caso de éxito del mismo sector y proponer un plan de pago fraccionado.",
    closeObjective: "CERRAR la venta en esta misma llamada (compromiso económico firme).",
    mainFailure: "La objeción de dinero apareció después del precio porque no se cualificó la capacidad de inversión durante el diagnóstico.",
    levers: [
      "Preguntar por presupuesto y prioridades antes de presentar la solución.",
      "Cuantificar el dolor en euros para que el precio parezca pequeño en comparación.",
      "Guardar silencio después de decir el precio.",
      "Ofrecer dos opciones de pago en lugar de una sola cifra.",
    ],
    summary: `${rep} habló con ${s.prospect} para presentar el ${PRODUCT}. Empezó con buena conexión y una agenda clara, pero no cualificó la inversión antes del pitch y la objeción de dinero bloqueó el cierre. Resultado: ${outcomeLabel.toLowerCase()}.`,
    tone: s.hasAudio
      ? { talkRatio: 45 + Math.round(r() * 25), pauses: Math.round(r() * 12), energy: 55 + Math.round(r() * 40), warmth: 60 + Math.round(r() * 35), control: 50 + Math.round(r() * 40) }
      : undefined,
  };
}

export interface DemoData {
  sessions: Session[];
  notifications: AppNotification[];
}

export function generateDemoData(anchor: Date, rubrics: Rubrics = DEFAULT_RUBRICS, seed = 42): DemoData {
  const r = rng(seed);
  const sessions: Session[] = [];
  const callTypes: CallType[] = ["videollamada", "videollamada", "videollamada", "cold_call", "cualificacion"];

  for (let i = 0; i < 50; i++) {
    const type = i % 2 === 0 ? "real" : "roleplay";
    const callType = pick(r, callTypes);
    const rep = r() < 0.72 ? REPS[0] : REPS[1];
    const persona = pick(r, PERSONAS);
    const prospect = type === "real" ? REAL_PROSPECTS[Math.floor(i / 2) % REAL_PROSPECTS.length] : persona.name;
    const daysAgo = Math.floor(r() * 34);
    const date = new Date(anchor);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(9 + Math.floor(r() * 10), Math.floor(r() * 60), 0, 0);

    const base = 0.35 + r() * 0.5;
    const subScores = {
      apertura: Math.round(Math.min(25, Math.max(6, 25 * (base + (r() - 0.4) * 0.3)))),
      diagnostico: Math.round(Math.min(25, Math.max(6, 25 * (base + (r() - 0.45) * 0.3)))),
      objeciones: Math.round(Math.min(25, Math.max(5, 25 * (base + (r() - 0.55) * 0.3)))),
      cierre: Math.round(Math.min(25, Math.max(5, 25 * (base + (r() - 0.5) * 0.3)))),
    } as Record<RubricKey, number>;
    const score = Math.round(rubrics[callType].reduce((acc, c) => acc + (subScores[c.key] / 25) * c.weight, 0));

    const roll = r();
    const outcome: Outcome =
      callType === "cualificacion"
        ? roll < 0.65 ? "ganada" : roll < 0.85 ? "en_avance" : "perdida"
        : roll < 0.12 + score / 250 ? "ganada" : roll < 0.6 ? "seguimiento" : roll < 0.8 ? "en_avance" : "perdida";
    const prospectQuality: ProspectTemp = r() < 0.5 ? "caliente" : r() < 0.88 ? "tibio" : "frio";

    const nObj = 1 + Math.floor(r() * 3);
    const objections: ObjectionInstance[] = [];
    for (let k = 0; k < nObj; k++) {
      const w = r();
      const category = w < 0.4 ? OBJECTION_CATEGORIES[0] : w < 0.55 ? OBJECTION_CATEGORIES[1] : w < 0.68 ? OBJECTION_CATEGORIES[2] : w < 0.8 ? OBJECTION_CATEGORIES[3] : pick(r, OBJECTION_CATEGORIES.slice(4));
      if (objections.some((o) => o.category === category)) continue;
      const quote = pick(r, QUOTES_BY_CATEGORY[category]);
      const bias = category === OBJECTION_CATEGORIES[3] ? -0.3 : category === OBJECTION_CATEGORIES[2] ? -0.2 : 0.15;
      objections.push({
        category, quote,
        detectedVia: pick(r, ["verbal directa, después del precio", "verbal directa, durante el diagnóstico", "implícita, por el tono"]),
        quality: quality(r, bias),
        script: buildScript(category, quote),
      });
    }

    const skills: SkillResult[] = SKILLS.map((sk) => {
      if (!sk.appliesTo.includes(callType)) return { skill: sk.name, result: "no_aplica" };
      const strong = ["Conexión inicial", "Cualificación de necesidades", "Silencio post-precio", "Detección del dolor", "Marco de la llamada"].includes(sk.name);
      return { skill: sk.name, result: quality(r, strong ? 0.4 : -0.1) };
    });
    const weak = skills.filter((x) => x.result === "mal").map((x) => x.skill);
    const weakSkill = weak.includes("Cualificación de dinero") || weak.length === 0 ? "Cualificación de dinero" : weak[0];

    const moments: KeyMoment[] = [
      {
        kind: "fuerte", level: "Media", skill: "Claridad en la propuesta de valor", title: "Claridad en la propuesta de valor",
        repQuote: "Lo que vas a tener es acceso durante un año entero a consultoría para cualquier duda, y además tu equipo también puede usarlo.",
        explanation: "Explicó el valor en una sola frase y lo conectó con el equipo del prospecto.",
        suggestion: "Remátalo con una pregunta: \"¿Cómo de valioso sería para ti que tu equipo pudiera resolver dudas en tiempo real?\"",
        t: 300,
      },
      {
        kind: "fuerte", level: "Alta", skill: "Silencio post-precio", title: "Silencio post-precio",
        repQuote: "El precio sería de 3.990 euros.",
        explanation: "Dijo el precio con seguridad y dejó que el prospecto hablara primero.",
        suggestion: "Repite este patrón: precio con confianza y silencio absoluto hasta que el prospecto reaccione.",
        t: 520,
      },
      {
        kind: "debil", level: "Media", skill: "Sondeo profundo", title: "Sondeo profundo en el \"¿por qué ahora?\"",
        repQuote: "¿Qué te llevó a dejar tus datos y por qué justo ahora?",
        prospectQuote: "Llevo años con el negocio y siento que he tocado techo.",
        explanation: "La pregunta fue buena, pero no se profundizó en la respuesta. Faltó conectar el \"techo\" con la urgencia de resolverlo ya.",
        suggestion: "Pregunta de segundo nivel: \"¿Qué pasa si dentro de un año sigues en el mismo punto?\"",
        t: 90,
      },
      {
        kind: "debil", level: "Alta", skill: "Cuantificación del dolor", title: "Falta de cuantificación del dolor",
        repQuote: "Entiendo, eso le pasa a mucha gente.",
        explanation: "Se aceptó el problema sin convertirlo en cifras, así que el precio no tuvo contra qué compararse.",
        suggestion: "\"¿Cuántos clientes calculas que pierdes al mes por esto? ¿Cuánto vale cada uno?\"",
        t: 210,
      },
    ].slice(0, 2 + Math.floor(r() * 3)) as KeyMoment[];

    const hasAudio = r() > 0.25;
    const unanalyzed = type === "real" && i % 17 === 4;
    const transcript = buildTranscript(r, prospect, rep.name, objections);
    sessions.push({
      id: `s${i + 1}`,
      type, callType,
      repId: unanalyzed ? null : rep.id,
      prospectName: prospect,
      personaId: type === "roleplay" ? persona.id : undefined,
      date,
      durationMin: callType === "cold_call" ? 4 + Math.floor(r() * 7) : callType === "cualificacion" ? 12 + Math.floor(r() * 9) : 28 + Math.floor(r() * 15),
      status: unanalyzed ? "sin_analisis" : "analizada",
      score: unanalyzed ? 0 : score,
      subScores, outcome, outcomeSource: "ia", prospectQuality, objections, skills, moments,
      analysis: unanalyzed ? null : buildAnalysis(r, { prospect, repName: rep.name, callType, outcome, score, weakSkill, hasAudio }),
      transcript,
      versions: r() > 0.6 ? 2 : 1,
      hasAudio,
    });
  }
  sessions.sort((a, b) => b.date.getTime() - a.date.getTime());

  const notifications: AppNotification[] = sessions.slice(0, 6).map((s, i) => ({
    id: `n${i}`,
    title: `Análisis de ${s.prospectName} listo`,
    body: `Puntuación: ${s.score}/100. Pulsa para ver el análisis completo.`,
    sessionId: s.id,
    date: new Date(anchor.getTime() - (i + 1) * 47 * 60000),
    archived: i > 3,
  }));

  return { sessions, notifications };
}

export function recomputeScore(s: Session, rubrics: Rubrics) {
  return Math.round(rubrics[s.callType].reduce((acc, c) => acc + (s.subScores[c.key] / 25) * c.weight, 0));
}

/**
 * Simula el resultado del pipeline de IA para una llamada nueva (subida o roleplay).
 * En producción esto lo reemplaza la respuesta real de /api/analyze.
 */
export function simulateAnalyzedSession(opts: {
  id: string;
  type: Session["type"];
  callType: CallType;
  prospectName: string;
  repId: string | null;
  hasAudio: boolean;
  audioUrl?: string;
  durationMin?: number;
  personaId?: string;
  rubrics: Rubrics;
}): Session {
  const seed = Math.floor(Math.random() * 1e6);
  const pool = generateDemoData(new Date(), opts.rubrics, seed).sessions.filter((s) => s.callType === opts.callType && s.analysis);
  const base = pool[0] ?? generateDemoData(new Date(), opts.rubrics, seed + 1).sessions.find((s) => s.analysis)!;
  const rename = (t: string) => t.split(base.prospectName).join(opts.prospectName);
  const analysis = base.analysis
    ? (Object.fromEntries(Object.entries(base.analysis).map(([k, v]) => [k, typeof v === "string" ? rename(v) : v])) as Analysis)
    : null;
  if (analysis && !opts.hasAudio) analysis.tone = undefined;
  return {
    ...base,
    id: opts.id,
    type: opts.type,
    callType: opts.callType,
    prospectName: opts.prospectName,
    repId: opts.repId,
    personaId: opts.personaId,
    date: new Date(),
    durationMin: opts.durationMin ?? base.durationMin,
    status: "analizada",
    score: recomputeScore(base, opts.rubrics),
    outcomeSource: "ia",
    analysis,
    versions: 1,
    hasAudio: opts.hasAudio,
    audioUrl: opts.audioUrl,
    transcript: base.transcript.map((l) => ({ ...l, text: rename(l.text) })),
  };
}
