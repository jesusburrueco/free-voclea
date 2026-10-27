export interface PitchResult {
  /** Frecuencia fundamental en Hz, o 0 si no hay tono. */
  freq: number;
  /** Claridad en 0..1 (1 = periodico puro). */
  clarity: number;
}

export interface PitchOptions {
  minFreq?: number;
  maxFreq?: number;
  /** Umbral absoluto de la diferencia normalizada (YIN, tipico 0.1 a 0.15). */
  threshold?: number;
}

/** Ventana minima recomendada para detectar `minFreq` a `rate`: dos periodos. */
export function minWindow(rate: number, minFreq = 70): number {
  return Math.ceil((2 * rate) / minFreq);
}

/** Detector YIN monofonico. `buf` debe tener al menos `minWindow` muestras. */
export function detectPitch(buf: Float32Array, rate: number, opts: PitchOptions = {}): PitchResult {
  const { minFreq = 70, maxFreq = 1500, threshold = 0.12 } = opts;
  const half = Math.floor(buf.length / 2);
  const tauMax = Math.min(half - 1, Math.floor(rate / minFreq));
  const tauMin = Math.max(2, Math.floor(rate / maxFreq));
  const none: PitchResult = { freq: 0, clarity: 0 };
  if (tauMax <= tauMin + 1) return none;

  const d = new Float32Array(tauMax + 1);
  for (let tau = 1; tau <= tauMax; tau++) {
    let sum = 0;
    for (let i = 0; i < half; i++) {
      const diff = (buf[i] ?? 0) - (buf[i + tau] ?? 0);
      sum += diff * diff;
    }
    d[tau] = sum;
  }
  // Diferencia normalizada acumulada media.
  let running = 0;
  d[0] = 1;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += (d[tau] ?? 1);
    d[tau] = running > 0 ? ((d[tau] ?? 1) * tau) / running : 1;
  }

  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if ((d[t] ?? 1) < threshold) {
      while (t + 1 <= tauMax && (d[t + 1] ?? 1) < (d[t] ?? 1)) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return none;

  // Interpolacion parabolica del minimo.
  let better = tau;
  if (tau > 1 && tau < tauMax) {
    const a = (d[tau - 1] ?? 1);
    const b = (d[tau] ?? 1);
    const c = (d[tau + 1] ?? 1);
    const denom = a - 2 * b + c;
    if (denom !== 0) better = tau + (a - c) / (2 * denom);
  }
  return { freq: rate / better, clarity: Math.max(0, Math.min(1, 1 - (d[tau] ?? 1))) };
}
