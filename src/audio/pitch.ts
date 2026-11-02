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

// Buffers de trabajo reutilizados: el worklet llama aqui varias veces por segundo y no debe generar basura.
let decimated = new Float32Array(0);
let diffs = new Float32Array(0);

/** Detector YIN monofonico. `buf` debe tener al menos `minWindow` muestras. */
export function detectPitch(input: Float32Array, inputRate: number, opts: PitchOptions = {}): PitchResult {
  // A 32 kHz o mas se diezma por 2 (media de pares): el coste de YIN baja a la cuarta parte y la interpolacion parabolica mantiene la precision.
  const decimate = inputRate >= 32000;
  const rate = decimate ? inputRate / 2 : inputRate;
  let buf = input;
  if (decimate) {
    const n = input.length >> 1;
    if (decimated.length < n) decimated = new Float32Array(n);
    buf = decimated.subarray(0, n);
    for (let i = 0; i < buf.length; i++) buf[i] = ((input[2 * i] ?? 0) + (input[2 * i + 1] ?? 0)) * 0.5;
  }
  const { minFreq = 70, maxFreq = 1500, threshold = 0.12 } = opts;
  const half = Math.floor(buf.length / 2);
  const tauMax = Math.min(half - 1, Math.floor(rate / minFreq));
  const tauMin = Math.max(2, Math.floor(rate / maxFreq));
  const none: PitchResult = { freq: 0, clarity: 0 };
  if (tauMax <= tauMin + 1) return none;

  // Diferencia normalizada acumulada media, calculada de forma perezosa: se para en cuanto se encuentra el primer minimo bajo el umbral.
  if (diffs.length < tauMax + 2) diffs = new Float32Array(tauMax + 2);
  const d = diffs.subarray(0, tauMax + 2).fill(1);
  let running = 0;
  let computed = 0;
  const upTo = (t: number): number => {
    for (; computed < t; ) {
      const tau = ++computed;
      let sum = 0;
      for (let i = 0; i < half; i++) {
        const diff = (buf[i] ?? 0) - (buf[i + tau] ?? 0);
        sum += diff * diff;
      }
      running += sum;
      d[tau] = running > 0 ? (sum * tau) / running : 1;
    }
    return d[t] ?? 1;
  };

  let tau = -1;
  upTo(tauMin);
  for (let t = tauMin; t <= tauMax; t++) {
    if (upTo(t) < threshold) {
      while (t + 1 <= tauMax && upTo(t + 1) < (d[t] ?? 1)) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return none;
  if (tau < tauMax) upTo(tau + 1);

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
