import { describe, expect, it } from 'vitest';
import { detectPitch, minWindow } from '../src/audio/pitch';
import { FIXTURE_RATE, noise, sine, sweep } from './fixtures/signals';

const cents = (f: number, ref: number) => 1200 * Math.log2(f / ref);
const win = minWindow(FIXTURE_RATE) + 512;

describe('detectPitch (YIN)', () => {
  it.each([110, 220, 440, 880])('seno de %d Hz con error < 10 cents', (f) => {
    const buf = sine(f, 0.5).subarray(1000, 1000 + win);
    const r = detectPitch(buf, FIXTURE_RATE);
    expect(Math.abs(cents(r.freq, f))).toBeLessThan(10);
    expect(r.clarity).toBeGreaterThan(0.9);
  });

  it('sigue un barrido en ventanas sucesivas', () => {
    const s = sweep(100, 1000, 2);
    for (const at of [0.2, 0.8, 1.4]) {
      const i = Math.floor(at * FIXTURE_RATE);
      const r = detectPitch(s.subarray(i, i + win), FIXTURE_RATE);
      const f = 100 * Math.exp((Math.log(10) * (at + (win / 2 / FIXTURE_RATE))) / 2);
      expect(Math.abs(cents(r.freq, f))).toBeLessThan(60);
    }
  });

  it('el ruido no da tono', () => {
    expect(detectPitch(noise(0.5).subarray(0, win), FIXTURE_RATE).freq).toBe(0);
  });

  it('el silencio no da tono', () => {
    expect(detectPitch(new Float32Array(win), FIXTURE_RATE).freq).toBe(0);
  });
  it('llamadas repetidas con tamanos distintos dan el mismo resultado (buffers reutilizados)', () => {
    const a = sine(220, 0.5).subarray(0, win);
    const first = detectPitch(a, FIXTURE_RATE);
    detectPitch(sine(90, 0.5).subarray(0, win + 800), FIXTURE_RATE);
    expect(detectPitch(a, FIXTURE_RATE)).toEqual(first);
  });
});
