import { describe, expect, it } from 'vitest';
import { suggestKey } from '../src/key';
import { nearestNote } from '../src/notes';

const hist = (notes: number[]): number[] => {
  const w = new Array<number>(12).fill(0);
  for (const n of notes) w[n % 12] = (w[n % 12] ?? 0) + 1;
  return w;
};

describe('suggestKey', () => {
  it('sin notas no sugiere nada', () => {
    expect(suggestKey(new Array<number>(12).fill(0))).toBeNull();
  });
  it('detecta Re mayor', () => {
    const k = suggestKey(hist([62, 64, 66, 67, 69, 71, 73, 74, 62, 62]));
    expect(k).toMatchObject({ tonic: 2, scaleId: 'major', fit: 1 });
  });
  it('detecta La menor con la tonica dominante', () => {
    const k = suggestKey(hist([69, 69, 69, 72, 76, 71, 74, 77, 79]));
    expect(k).toMatchObject({ tonic: 9, scaleId: 'minor' });
  });
});

describe('nearestNote', () => {
  it('A4 exacto', () => {
    expect(nearestNote(440)).toEqual({ note: 69, cents: 0 });
  });
  it('20 cents por encima', () => {
    const r = nearestNote(440 * 2 ** (20 / 1200));
    expect(r.note).toBe(69);
    expect(r.cents).toBeCloseTo(20, 6);
  });
});
