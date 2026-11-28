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
}

// Muletillas habituales en español (Perú incluido).
// "e" sola es conjunción ("e hijos") y "este" es demostrativo ("este producto"): solo cuentan alargados o con pausa.
const FILLER_WORD = /^(e+h+|ee+|e+h*m+|e+m+|m{2,}|h+m+|esteee*|osea|digamos|a+h+m*|u+m+)$/i;
const FILLER_PHRASE = /(^|[\s,.])(este(?:\.\.\.|…|,)|o sea|pues nada|c[oó]mo te digo|c[oó]mo se llama)(?=$|[\s,.…])/gi;
// Tartamudeo: "ho-ho-hola", "yo yo yo", "s-sí".
const STUTTER = /\b(\p{L}{1,4})(?:[-‐–]\1)+[-‐–]?\p{L}*|\b(\p{L}+)(?:\s+\2\b){1,}/giu;
// Autocorrecciones y frases a medias.
const RESTART = /(\.\.\.|…|(^|[\s,])(perd[oó]n|digo|mejor dicho)(?=$|[\s,.]))/gi;

export function toneOf({ text, seconds, level, baseline, pauses }: ToneInput): string | undefined {
  const words = text.trim().split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
  const tokens = text.toLowerCase().split(/[\s,.;:¿?¡!…]+/).filter(Boolean);
  const fillers = tokens.filter((t) => FILLER_WORD.test(t)).length + (text.match(FILLER_PHRASE) ?? []).length;
  const stutters = (text.match(STUTTER) ?? []).length;
  const restarts = (text.match(RESTART) ?? []).length;
  const hesitation = fillers + stutters * 2 + restarts;
  const rate = seconds > 0 ? words / seconds : 0;
  const relLevel = baseline > 0 ? level / baseline : 1;

  if (stutters >= 1 || hesitation >= 2 || (words >= 4 && hesitation / words > 0.2)) return "Nervioso / dubitativo";
  if (hesitation >= 1 && words < 10) return "Nervioso / dubitativo";
  if (seconds > 3 && pauses >= 3) return "Dubitativo";
  if (words < 4 && seconds < 2) return hesitation ? "Nervioso / dubitativo" : undefined; // muy corto para juzgar
  if (rate > 4) return "Acelerado";
  if (relLevel < 0.7) return "Bajo / poco seguro";
  if (relLevel > 1.35) return "Enérgico";
  if (hesitation === 0 && pauses <= 1 && rate >= 1.6 && rate <= 3.6) return "Seguro y tranquilo";
  return "Neutral";
}
