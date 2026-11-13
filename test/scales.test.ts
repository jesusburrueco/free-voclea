import { describe, expect, it } from 'vitest';
import { SCALES, getScale, quantizeToScale } from '../src/scales';

describe('scales', () => {
  it('15 escalas (14 documentadas mas cromatica), ids unicos', () => {
    expect(SCALES).toHaveLength(15);
    expect(new Set(SCALES.map((s) => s.id)).size).toBe(15);
  });

  it('intervalos validos: empiezan en 0, estrictamente crecientes, < 12', () => {
    for (const s of SCALES) {
      expect(s.intervals[0]).toBe(0);
      expect([...s.intervals].sort((a, b) => a - b)).toEqual([...s.intervals]);
      expect(new Set(s.intervals).size).toBe(s.intervals.length);
      expect(Math.max(...s.intervals)).toBeLessThan(12);
    }
  });

  it('cromatica redondea al semitono mas cercano', () => {
    const c = getScale('chromatic');
    expect(quantizeToScale(60.4, 0, c)).toBe(60);
    expect(quantizeToScale(60.6, 0, c)).toBe(61);
  });

  it('Do mayor: C# se corrige a C (empate, hacia abajo)', () => {
    const m = getScale('major');
    expect(quantizeToScale(61, 0, m)).toBe(60);
    expect(quantizeToScale(66, 0, m)).toBe(65);
    expect(quantizeToScale(64.2, 0, m)).toBe(64);
  });

  it('respeta la tonica: D mayor admite F#', () => {
    const m = getScale('major');
    expect(quantizeToScale(66, 2, m)).toBe(66);
    expect(quantizeToScale(65, 2, m)).toBe(64);
  });

  it('pentatonica menor de A: todas las salidas pertenecen a la escala', () => {
    const s = getScale('minor-pentatonic');
    for (let x = 40; x < 90; x += 0.1) {
      const q = quantizeToScale(x, 9, s);
      expect(s.intervals).toContain((((q - 9) % 12) + 12) % 12);
    }
  });

  it('funciona en octavas bajas y cruza octava', () => {
    const m = getScale('major');
    expect(quantizeToScale(11.9, 0, m)).toBe(12);
    expect(quantizeToScale(0.4, 0, m)).toBe(0);
    expect(() => getScale('nope')).toThrow();
  });
});
