import { describe, expect, it } from 'vitest';
import { buildChord, chordScale, defaultChordOptions, degreeOf, scaleStep } from '../src/audio/chords';

const opts = (o: Partial<typeof defaultChordOptions>) => ({ ...defaultChordOptions, ...o });

describe('acordes diatonicos', () => {
  it('triadas de Do mayor', () => {
    expect(buildChord(60, 0, 'major')).toEqual([60, 64, 67]);
    expect(buildChord(62, 0, 'major')).toEqual([62, 65, 69]);
    expect(buildChord(71, 0, 'major')).toEqual([71, 74, 77]);
  });
  it('triada de La menor natural y grado V de Do mayor con septima', () => {
    expect(buildChord(69, 9, 'minor')).toEqual([69, 72, 76]);
    const v = opts({ variants: ['auto', 'auto', 'auto', 'auto', 'seventh', 'auto', 'auto'] });
    expect(buildChord(67, 0, 'major', v)).toEqual([67, 71, 74, 77]);
  });
  it('variantes sus2 y sus4 por grado', () => {
    expect(buildChord(60, 0, 'major', opts({ variants: ['sus2', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'] }))).toEqual([60, 62, 67]);
    expect(buildChord(60, 0, 'major', opts({ variants: ['sus4', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'] }))).toEqual([60, 65, 67]);
  });
  it('inversiones y apertura', () => {
    expect(buildChord(60, 0, 'major', opts({ inversion: 1 }))).toEqual([64, 67, 72]);
    expect(buildChord(60, 0, 'major', opts({ inversion: 2 }))).toEqual([67, 72, 76]);
    expect(buildChord(60, 0, 'major', opts({ voicing: 'open' }))).toEqual([60, 67, 76]);
  });
  it('bajo siguiendo la octava o fijo', () => {
    expect(buildChord(60, 0, 'major', opts({ bass: 'follow' }))).toEqual([48, 60, 64, 67]);
    expect(buildChord(62, 0, 'major', opts({ bass: 'fixed' }))).toEqual([38, 62, 65, 69]);
  });
  it('escalas no heptatonicas usan la mayor', () => {
    expect(chordScale('blues').id).toBe('major');
    expect(buildChord(60, 0, 'chromatic')).toEqual([60, 64, 67]);
  });
  it('notas fuera de la escala suben o bajan a la mas cercana', () => {
    expect(degreeOf(61, 0, [0, 2, 4, 5, 7, 9, 11])).toEqual({ root: 60, degree: 0 });
  });
  it('scaleStep cruza octavas', () => {
    expect(scaleStep(71, 0, [0, 2, 4, 5, 7, 9, 11], 2)).toBe(74);
    expect(scaleStep(60, 0, [0, 2, 4, 5, 7, 9, 11], -1)).toBe(59);
  });
});
