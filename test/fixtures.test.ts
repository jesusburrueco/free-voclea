import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIXTURES, FIXTURE_RATE, decodeWav, encodeWav, noise, sine, sweep } from './fixtures/signals';

function rms(x: Float32Array): number {
  let s = 0;
  for (const v of x) s += v * v;
  return Math.sqrt(s / x.length);
}

function crossings(x: Float32Array): number {
  let c = 0;
  for (let i = 1; i < x.length; i++) if ((x[i - 1] ?? 0) < 0 && (x[i] ?? 0) >= 0) c++;
  return c;
}

describe('generadores de senales', () => {
  it('el seno tiene la frecuencia y amplitud pedidas', () => {
    const x = sine(440, 1, 0.5);
    expect(crossings(x)).toBeGreaterThanOrEqual(439);
    expect(crossings(x)).toBeLessThanOrEqual(441);
    expect(rms(x)).toBeCloseTo(0.5 / Math.SQRT2, 3);
  });

  it('el barrido sube de frecuencia', () => {
    const x = sweep(100, 1000, 2);
    const half = Math.floor(x.length / 2);
    expect(crossings(x.subarray(half))).toBeGreaterThan(crossings(x.subarray(0, half)) * 2);
  });

  it('el ruido es determinista y de media casi nula', () => {
    expect(Array.from(noise(0.01, 7))).toEqual(Array.from(noise(0.01, 7)));
    expect(Array.from(noise(0.01, 7))).not.toEqual(Array.from(noise(0.01, 8)));
    const x = noise(1);
    expect(Math.abs(x.reduce((a, b) => a + b, 0) / x.length)).toBeLessThan(0.01);
  });

  it('WAV ida y vuelta conserva muestras con error < 1e-4', () => {
    const x = sine(220, 0.1);
    const { rate, samples } = decodeWav(encodeWav(x));
    expect(rate).toBe(FIXTURE_RATE);
    expect(samples.length).toBe(x.length);
    for (let i = 0; i < x.length; i++) expect(Math.abs((samples[i] ?? 0) - (x[i] ?? 0))).toBeLessThan(1e-4);
  });
});

describe('WAV en test/fixtures/wav', () => {
  for (const [name, make] of Object.entries(FIXTURES)) {
    it(`${name} coincide con su generador`, () => {
      const bytes = readFileSync(join(process.cwd(), 'test/fixtures/wav', name));
      expect(Buffer.from(encodeWav(make())).equals(bytes)).toBe(true);
    });
  }
});
