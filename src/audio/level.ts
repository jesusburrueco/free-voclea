export interface Level {
  rms: number;
  peak: number;
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
