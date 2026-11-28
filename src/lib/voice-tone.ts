import type { Prosody } from "./prosody";

/*
 * Tono de cada intervención del comercial durante la llamada.
 * Combina lo que dice (muletillas, tartamudeos, autocorrecciones) con cómo lo dice
 * (ritmo, pausas y volumen comparado con su propia media en la llamada, no con un umbral fijo,
 * porque cada micrófono capta un volumen distinto).
 * "Seguro y tranquilo" solo se asigna con pruebas a favor; si no hay datos suficientes, no se etiqueta.
 * En producción: modelo de prosodia sobre el audio (tono, temblor de voz, velocidad real).
 */

export interface ToneInput {
  text: string;
  /** Segundos con voz dentro de la intervención. */
  seconds: number;
  /** Volumen medio de la intervención (0–1 aprox.). */
  level: number;
  /** Volumen medio del comercial en lo que va de llamada (referencia personal). */
  baseline: number;
  /** Silencios de más de 0,6 s dentro de la intervención. */
  pauses: number;
  /** Medidas de la voz (altura, entonación, temblor), si el micrófono las ha podido calcular. */
  prosody?: Prosody;
}

// Muletillas habituales en español (Perú incluido).
// "e" sola es conjunción ("e hijos") y "este" es demostrativo ("este producto"): solo cuentan alargados o con pausa.
const FILLER_WORD = /^(e+h+|ee+|e+h*m+|e+m+|m{2,}|h+m+|esteee*|osea|digamos|a+h+m*|u+m+)$/i;
const FILLER_PHRASE = /(^|[\s,.])(este(?:\.\.\.|…|,)|o sea|pues nada|c[oó]mo te digo|c[oó]mo se llama)(?=$|[\s,.…])/gi;
// Tartamudeo: "ho-ho-hola", "yo yo yo", "s-sí".
const STUTTER = /\b(\p{L}{1,4})(?:[-‐–]\1)+[-‐–]?\p{L}*|\b(\p{L}+)(?:\s+\2\b){1,}/giu;
// Autocorrecciones y frases a medias.
const RESTART = /(\.\.\.|…|(^|[\s,])(perd[oó]n|digo|mejor dicho)(?=$|[\s,.]))/gi;

// Enojo en lo que se dice: reproches, órdenes bruscas, insultos o groserías.
const ANGRY_PHRASE = /(ya (le|te) (dije|expliqu[eé])|no me (est[aá]|est[aá]s) escuchando|no me escucha|le estoy diciendo|te estoy diciendo|c[aá]llese|c[aá]llate|esc[uú]cheme|esc[uú]chame|a ver si (me )?entiende|qu[eé] (le|te) pasa|no sea (as[ií]|terco|terca)|basta\b|ya basta|estoy harto|estoy harta|me tiene harto|me tiene harta|no me haga perder|no me hagas perder|me est[aá] haciendo perder|no entiende nada|es su problema|es tu problema)/i;
const INSULT = /(est[uú]pid|idiota|imb[eé]cil|tont[oa]\b|in[uú]til|carajo|mierda|maldit|joder|huev[oó]n|cojud|conchatu|conchesu|put[ao]\b|ctm\b|csm\b|jodid)/i;

/** Nivel de enojo de una intervención (0 = nada). Combina lo que se dice con cómo suena. */
export function angerScore({ text, level, baseline, prosody }: Pick<ToneInput, "text" | "level" | "baseline" | "prosody">) {
  const relLevel = baseline > 0 ? level / baseline : 1;
  const exclaims = (text.match(/!/g) ?? []).length;
  let score = 0;
  if (INSULT.test(text)) score += 3;
  if (ANGRY_PHRASE.test(text)) score += 2;
  if (exclaims >= 2) score += 1;
  if (relLevel >= 1.3) score += 1; // habla más fuerte que de costumbre
  if (relLevel >= 1.6) score += 1;
  if (prosody) {
    if (prosody.pitchRel >= 1.5) score += 1; // voz más aguda: alzada o tensa
    if (prosody.pitchRel >= 3) score += 1;
    if (prosody.loudVar >= 0.45 && relLevel >= 1.15) score += 1; // golpes de voz
  }
  return score;
}

/** Color de la etiqueta de tono: bien, aviso o problema. */
export function toneKind(label: string): "good" | "warn" | "bad" | null {
  if (/enojad|tens/i.test(label)) return "bad";
  if (/nervios|dubitativ|insegur|bajo|aceler|mon[oó]ton|tembl/i.test(label)) return "warn";
  if (/seguro|en[eé]rgico|expresiv/i.test(label)) return "good";
  return null;
}

export function toneOf({ text, seconds, level, baseline, pauses, prosody }: ToneInput): string | undefined {
  const words = text.trim().split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  const tokens = text.toLowerCase().split(/[\s,.;:¿?¡!…]+/).filter(Boolean);
  const fillers = tokens.filter((t) => FILLER_WORD.test(t)).length + (text.match(FILLER_PHRASE) ?? []).length;
  const stutters = (text.match(STUTTER) ?? []).length;
  const restarts = (text.match(RESTART) ?? []).length;
  const hesitation = fillers + stutters * 2 + restarts;
  const rate = seconds > 0 ? words / seconds : 0;
  const relLevel = baseline > 0 ? level / baseline : 1;
  const p = prosody;

  // 1) Enojo: lo más importante de señalar (con un cliente nunca se debe perder el control).
  const anger = angerScore({ text, level, baseline, prosody });
  if (anger >= 3) return "Enojado / alterado";
  if (anger === 2 && (relLevel >= 1.2 || (p && p.pitchRel >= 1.5) || ANGRY_PHRASE.test(text))) return "Tenso / impaciente";
  // 2) Nervios: muletillas, tartamudeo, voz temblorosa.
  if (stutters >= 1 || hesitation >= 2 || (words >= 4 && hesitation / words > 0.2)) return "Nervioso / dubitativo";
  if (hesitation >= 1 && words < 10) return "Nervioso / dubitativo";
  if (p && p.jitter >= 0.9 && p.voiced >= 40) return "Nervioso (voz temblorosa)";
  if (seconds > 3 && pauses >= 3) return "Dubitativo";
  if (words < 4 && seconds < 2) return hesitation ? "Nervioso / dubitativo" : undefined; // muy corto para juzgar
  // 3) Cómo suena: final de pregunta en una afirmación, ritmo, volumen, entonación.
  if (p && p.rise >= 2.5 && !text.trim().endsWith("?")) return "Inseguro (termina como pregunta)";
  if (rate > 4) return "Acelerado";
  if (relLevel < 0.7) return "Bajo / poco seguro";
  if (p && p.range < 2 && seconds > 3) return "Monótono";
  if (relLevel > 1.35) return "Enérgico";
  const steadyVoice = !p || (p.range >= 2.5 && p.jitter < 0.7 && p.rise < 2);
  if (hesitation === 0 && pauses <= 1 && rate >= 1.6 && rate <= 3.6 && steadyVoice) return "Seguro y tranquilo";
  if (p && p.range >= 5 && hesitation === 0) return "Expresivo";
  return "Neutral";
}
