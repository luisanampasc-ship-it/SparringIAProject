/*
 * Análisis de la voz en el navegador (prosodia), sin servicios externos.
 * En cada fotograma de audio del micrófono se estima la frecuencia de la voz (tono grave/agudo)
 * por autocorrelación. Con la serie de una intervención se calculan:
 * - altura media frente a la propia media del comercial en la llamada (voz alzada o no),
 * - variación de la entonación (monótona o expresiva),
 * - temblor (saltos rápidos de tono entre fotogramas seguidos),
 * - final ascendente (frase afirmativa que suena a pregunta: inseguridad).
 * Valores orientativos: dependen del micrófono y del ruido; en producción, un modelo de emociones por voz.
 */

const MIN_HZ = 70;
const MAX_HZ = 450;

/** Frecuencia fundamental de un bloque de audio en Hz, o null si no hay voz clara. */
export function detectPitch(input: Float32Array, rate: number): number | null {
  // A 44,1/48 kHz se reduce a la mitad (sobra para la voz) y el cálculo cuesta cuatro veces menos.
  const step = rate > 32000 ? 2 : 1;
  const sampleRate = rate / step;
  const buf = step === 1 ? input : Float32Array.from({ length: Math.floor(input.length / 2) }, (_, i) => (input[2 * i] + input[2 * i + 1]) / 2);
  const n = Math.min(buf.length, 1024);
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < 0.01) return null;
  const minLag = Math.floor(sampleRate / MAX_HZ);
  const maxLag = Math.min(Math.floor(sampleRate / MIN_HZ), n - 1);
  const size = n - maxLag;
  let best = -1;
  let bestLag = 0;
  let energy0 = 0;
  for (let i = 0; i < size; i++) energy0 += buf[i] * buf[i];
  const corr = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    let energyL = 0;
    for (let i = 0; i < size; i++) {
      sum += buf[i] * buf[i + lag];
      energyL += buf[i + lag] * buf[i + lag];
    }
    const c = sum / Math.sqrt(energy0 * energyL || 1);
    corr[lag] = c;
    if (c > best) {
      best = c;
      bestLag = lag;
    }
  }
  if (best < 0.6) return null; // sin periodicidad clara: ruido o consonante
  // Evita errores de octava: si un submúltiplo del periodo correlaciona casi igual, es el bueno.
  for (const div of [3, 2]) {
    const l = Math.round(bestLag / div);
    if (l >= minLag && corr[l] > best * 0.9) {
      bestLag = l;
      break;
    }
  }
  return sampleRate / bestLag;
}

/** Semitonos respecto a 100 Hz: escala perceptiva para comparar alturas de voz. */
export const toSemitones = (hz: number) => 12 * Math.log2(hz / 100);

export interface Prosody {
  /** Altura media de la intervención frente a la media del comercial, en semitonos (+ = voz más aguda/alzada). */
  pitchRel: number;
  /** Amplitud de la entonación (percentil 90 - percentil 10), en semitonos. */
  range: number;
  /** Salto medio de tono entre fotogramas seguidos, en semitonos (alto = voz temblorosa). */
  jitter: number;
  /** Final de la intervención frente a su media, en semitonos (+ = final ascendente). */
  rise: number;
  /** Variación del volumen dentro de la intervención (coeficiente de variación). */
  loudVar: number;
  voiced: number;
}

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];

/**
 * @param pitch serie de semitonos por fotograma (NaN = sin voz clara)
 * @param loud volumen por fotograma con voz
 * @param baseline altura media del comercial en la llamada (semitonos), o NaN si aún no se conoce
 */
export function prosodyOf(pitch: number[], loud: number[], baseline: number): Prosody | undefined {
  const voiced = pitch.filter((p) => Number.isFinite(p));
  if (voiced.length < 25) return undefined; // menos de ~0,4 s con voz clara: no se puede juzgar
  const sorted = [...voiced].sort((a, b) => a - b);
  const median = quantile(sorted, 0.5);
  let jumps = 0;
  let jumpSum = 0;
  for (let i = 1; i < pitch.length; i++) {
    const d = Math.abs(pitch[i] - pitch[i - 1]);
    if (Number.isFinite(d) && d < 4) {
      jumpSum += d;
      jumps++;
    }
  }
  const tail = voiced.slice(-12).sort((a, b) => a - b);
  const meanLoud = loud.reduce((a, b) => a + b, 0) / (loud.length || 1);
  const sdLoud = Math.sqrt(loud.reduce((a, b) => a + (b - meanLoud) ** 2, 0) / (loud.length || 1));
  return {
    pitchRel: Number.isFinite(baseline) ? median - baseline : 0,
    range: quantile(sorted, 0.9) - quantile(sorted, 0.1),
    jitter: jumps ? jumpSum / jumps : 0,
    rise: quantile(tail, 0.5) - median,
    loudVar: meanLoud ? sdLoud / meanLoud : 0,
    voiced: voiced.length,
  };
}
