import { fft } from './fft';

export const FEATURE_LEN = 1024;
const MEL_BANDS = 20;
const MFCC_COUNT = 12;
export const FEATURE_DIM = MFCC_COUNT + 2;

const hz2mel = (f: number): number => 2595 * Math.log10(1 + f / 700);
const mel2hz = (m: number): number => 700 * (10 ** (m / 2595) - 1);

interface Plan {
  window: Float32Array;
  filters: Float32Array[];
  dct: Float32Array[];
}
const plans = new Map<number, Plan>();

function plan(rate: number): Plan {
  const cached = plans.get(rate);
  if (cached) return cached;
  const window = new Float32Array(FEATURE_LEN);
  for (let i = 0; i < FEATURE_LEN; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FEATURE_LEN - 1));
  const fMax = Math.min(8000, rate / 2);
  const edges = Array.from({ length: MEL_BANDS + 2 }, (_, i) => mel2hz(hz2mel(60) + ((hz2mel(fMax) - hz2mel(60)) * i) / (MEL_BANDS + 1)));
  const bins = FEATURE_LEN / 2;
  const hzPerBin = rate / FEATURE_LEN;
  const filters: Float32Array[] = [];
  for (let b = 0; b < MEL_BANDS; b++) {
    const lo = edges[b] ?? 0;
    const mid = edges[b + 1] ?? 0;
    const hi = edges[b + 2] ?? 0;
    const f = new Float32Array(bins);
    for (let k = 0; k < bins; k++) {
      const hz = k * hzPerBin;
      if (hz > lo && hz < mid) f[k] = (hz - lo) / (mid - lo);
      else if (hz >= mid && hz < hi) f[k] = (hi - hz) / (hi - mid);
    }
    filters.push(f);
  }
  const dct: Float32Array[] = [];
  for (let c = 1; c <= MFCC_COUNT; c++) {
    const row = new Float32Array(MEL_BANDS);
    for (let b = 0; b < MEL_BANDS; b++) row[b] = Math.cos((Math.PI * c * (b + 0.5)) / MEL_BANDS);
    dct.push(row);
  }
  const p = { window, filters, dct };
  plans.set(rate, p);
  return p;
}

/**
 * Vector de rasgos de un golpe: 12 MFCC (sin c0, asi no dependen del volumen),
 * cruces por cero y centroide espectral normalizado. `samples` debe tener FEATURE_LEN muestras.
 */
export function extractFeatures(samples: Float32Array, rate: number): Float32Array {
  const { window, filters, dct } = plan(rate);
  const re = new Float32Array(FEATURE_LEN);
  const im = new Float32Array(FEATURE_LEN);
  let crossings = 0;
  for (let i = 0; i < FEATURE_LEN; i++) {
    const v = samples[i] ?? 0;
    re[i] = v * (window[i] ?? 0);
    if (i > 0 && (v >= 0) !== ((samples[i - 1] ?? 0) >= 0)) crossings++;
  }
  fft(re, im);
  const bins = FEATURE_LEN / 2;
  const power = new Float32Array(bins);
  let total = 0;
  let weighted = 0;
  for (let k = 0; k < bins; k++) {
    power[k] = (re[k] ?? 0) ** 2 + (im[k] ?? 0) ** 2;
    total += power[k] ?? 0;
    weighted += k * (power[k] ?? 0);
  }
  const logMel = filters.map((f) => {
    let e = 0;
    for (let k = 0; k < bins; k++) e += (f[k] ?? 0) * (power[k] ?? 0);
    return Math.log(e + 1e-10);
  });
  const out = new Float32Array(FEATURE_DIM);
  dct.forEach((row, c) => {
    let s = 0;
    for (let b = 0; b < MEL_BANDS; b++) s += (row[b] ?? 0) * (logMel[b] ?? 0);
    out[c] = s / MEL_BANDS;
  });
  out[MFCC_COUNT] = crossings / FEATURE_LEN;
  out[MFCC_COUNT + 1] = total > 0 ? weighted / total / bins : 0;
  return out;
}
