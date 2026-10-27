import { describe, expect, it } from 'vitest';
import { fft } from '../src/beat/fft';
import { FEATURE_DIM, FEATURE_LEN, extractFeatures } from '../src/beat/features';
import { KnnClassifier } from '../src/beat/knn';
import { OnsetDetector, dbToVelocity, sensitivityToRise } from '../src/beat/onset';
import { noise, sine } from './fixtures/signals';

const RATE = 44100;

/** Bombo sintetico: seno que baja de tono con caida exponencial. */
function kick(seed: number, amp = 0.8): Float32Array {
  const out = new Float32Array(FEATURE_LEN);
  let phase = 0;
  const n = noise(0.05, seed, 0.01);
  for (let i = 0; i < FEATURE_LEN; i++) {
    const t = i / RATE;
    phase += (2 * Math.PI * (50 + 90 * Math.exp(-t * 40))) / RATE;
    out[i] = amp * Math.exp(-t * 25) * Math.sin(phase) + (n[i] ?? 0);
  }
  return out;
}
/** Caja: ruido blanco con caida. */
function snare(seed: number, amp = 0.8): Float32Array {
  const n = noise(0.05, seed, 1);
  return Float32Array.from({ length: FEATURE_LEN }, (_, i) => amp * Math.exp((-i / RATE) * 30) * (n[i] ?? 0));
}
/** Charles: ruido filtrado paso alto (doble diferencia) y caida rapida. */
function hat(seed: number, amp = 0.8): Float32Array {
  const n = noise(0.05, seed, 1);
  return Float32Array.from({ length: FEATURE_LEN }, (_, i) => amp * Math.exp((-i / RATE) * 80) * ((n[i] ?? 0) - 2 * (n[i - 1] ?? 0) + (n[i - 2] ?? 0)) * 0.4);
}

describe('fft', () => {
  it('un seno cae en su bin', () => {
    const re = sine(RATE / 8, 1024 / RATE, 1, RATE).slice(0, 1024);
    const im = new Float32Array(1024);
    fft(re, im);
    let best = 0;
    for (let k = 1; k < 512; k++) if (Math.hypot(re[k] ?? 0, im[k] ?? 0) > Math.hypot(re[best] ?? 0, im[best] ?? 0)) best = k;
    expect(best).toBe(128);
  });
  it('rechaza longitudes que no son potencia de 2', () => {
    expect(() => fft(new Float32Array(6), new Float32Array(6))).toThrow();
  });
});

describe('OnsetDetector', () => {
  const blocks = (signal: Float32Array): number[] => {
    const det = new OnsetDetector(RATE);
    const hits: number[] = [];
    for (let i = 0; i + 128 <= signal.length; i += 128) if (det.process(signal.subarray(i, i + 128))) hits.push(i);
    return hits;
  };
  const burst = (total: number, at: number[]): Float32Array => {
    const s = new Float32Array(total);
    const n = noise(0.1, 3, 0.8);
    for (const a of at) for (let i = 0; i < 2000 && a + i < total; i++) s[a + i] = (n[i] ?? 0) * Math.exp((-i / RATE) * 40);
    return s;
  };

  it('detecta un golpe tras silencio, con poca latencia', () => {
    const hits = blocks(burst(RATE, [22050]));
    expect(hits).toHaveLength(1);
    expect((hits[0] ?? 1e9) - 22050).toBeLessThan(256);
  });
  it('no dispara con ruido estacionario ni con un seno', () => {
    expect(blocks(noise(1, 5, 0.3))).toHaveLength(0);
    expect(blocks(sine(220, 1, 0.5, RATE))).toHaveLength(0);
  });
  it('separa golpes distantes y respeta el tiempo muerto', () => {
    expect(blocks(burst(RATE * 2, [20000, 40000, 60000]))).toHaveLength(3);
    expect(blocks(burst(RATE, [20000, 21500]))).toHaveLength(1);
  });
  it('la sensibilidad cambia la subida exigida', () => {
    expect(sensitivityToRise(1)).toBeLessThan(sensitivityToRise(0));
    expect(sensitivityToRise(NaN)).toBeCloseTo(10.5, 6);
  });
  it('velocidad lineal en dB y limitada', () => {
    expect(dbToVelocity(-80)).toBe(1);
    expect(dbToVelocity(0)).toBe(127);
    expect(dbToVelocity(-23)).toBeGreaterThan(50);
    expect(dbToVelocity(-23)).toBeLessThan(80);
  });
});

describe('features + k-NN', () => {
  const vec = (s: Float32Array): number[] => Array.from(extractFeatures(s, RATE));
  it('el vector tiene la dimension esperada y es independiente del volumen', () => {
    const a = extractFeatures(snare(1, 0.8), RATE);
    const b = extractFeatures(snare(1, 0.2), RATE);
    expect(a).toHaveLength(FEATURE_DIM);
    for (let i = 0; i < 12; i++) expect(a[i]).toBeCloseTo(b[i] ?? 0, 1);
  });
  it('clasifica bombo, caja y charles con ejemplos no vistos', () => {
    const knn = new KnnClassifier();
    const makers = [kick, snare, hat];
    knn.setExamples(makers.flatMap((mk, slot) => [1, 2, 3, 4, 5].map((seed) => ({ slot, vec: vec(mk(seed, 0.5 + 0.1 * seed)) }))));
    makers.forEach((mk, slot) => {
      for (const seed of [11, 12, 13]) expect(knn.classify(vec(mk(seed, 0.6)))?.slot).toBe(slot);
    });
  });
  it('rechaza sonidos que no se parecen a nada entrenado y no clasifica sin ejemplos', () => {
    const knn = new KnnClassifier();
    expect(knn.classify([0, 0])).toBeNull();
    knn.setExamples([1, 2, 3, 4].map((seed) => ({ slot: 0, vec: vec(kick(seed)) })));
    expect(knn.classify(vec(sine(3000, 0.03, 0.5, RATE).slice(0, FEATURE_LEN)))).toBeNull();
  });
});
