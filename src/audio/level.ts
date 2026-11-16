import type { OutEvent } from './router';
import type { NoteEvent } from './segmenter';

export interface Level {
  rms: number;
  peak: number;
  /** Pitch en Hz (0 si no hay tono); solo lo rellena el worklet. */
  freq?: number;
  clarity?: number;
  /** Centroide espectral en Hz (0 si hay silencio); solo lo rellena el worklet. */
  centroid?: number;
  /** Eventos note on/off de la trama; solo lo rellena el worklet. */
  events?: NoteEvent[];
  /** Salidas de melodia y acordes tras octava, transposicion y rango; las rellena el motor. */
  out?: OutEvent[];
}

export function measureLevel(samples: Float32Array): Level {
  let sum = 0;
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i] ?? 0;
    sum += v * v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  return { rms: samples.length ? Math.sqrt(sum / samples.length) : 0, peak };
}

/** Nivel en dBFS, con suelo en -100 para silencio. */
export function toDb(linear: number): number {
  return linear > 1e-5 ? 20 * Math.log10(linear) : -100;
}
