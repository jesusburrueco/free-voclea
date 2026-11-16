import { describe, expect, it } from 'vitest';
import { buildChord, chordScale, defaultChordOptions, degreeOf, mappedDegree, scaleStep } from '../src/audio/chords';

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
  it('bajo varias octavas por debajo', () => {
    expect(buildChord(60, 0, 'major', opts({ bass: 'follow', bassOctaves: 3 }))[0]).toBe(24);
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

describe('presets de mapeo Pop', () => {
  const pc = (ns: number[]) => ns.map((n) => n % 12);
  it('Triadas no cambia el acorde', () => {
    expect(buildChord(62, 0, 'major', opts({ mapping: 'triads' }))).toEqual([62, 65, 69]);
  });
  it('Pop en Do mayor: cantar Re da Sol mayor por debajo', () => {
    expect(buildChord(62, 0, 'major', opts({ mapping: 'pop' }))).toEqual([55, 59, 62]);
    expect(buildChord(64, 0, 'major', opts({ mapping: 'pop' }))).toEqual([57, 60, 64]);
    expect(buildChord(60, 0, 'major', opts({ mapping: 'pop' }))).toEqual([60, 64, 67]);
  });
  it('Pop avanzado en Do mayor usa ii y vi', () => {
    expect(buildChord(62, 0, 'major', opts({ mapping: 'popPlus' }))).toEqual([62, 65, 69]);
    expect(buildChord(60, 0, 'major', opts({ mapping: 'popPlus' }))).toEqual([57, 60, 64]);
  });
  it('Pop en La menor: cantar Sol da Sol mayor (VII)', () => {
    expect(buildChord(67, 9, 'minor', opts({ mapping: 'pop' }))).toEqual([67, 71, 74]);
    expect(buildChord(72, 9, 'minor', opts({ mapping: 'pop' }))).toEqual([65, 69, 72]);
  });
  it('cada acorde contiene la nota cantada en mayor y menor', () => {
    for (const mapping of ['pop', 'popPlus'] as const) {
      for (const [scale, tonic] of [['major', 0], ['minor', 9], ['major', 7]] as const) {
        const { intervals } = chordScale(scale);
        for (const iv of intervals) {
          const note = 60 + ((tonic + iv) % 12);
          const chord = buildChord(note, tonic, scale, opts({ mapping }));
          expect(pc(chord)).toContain(note % 12);
          expect(Math.max(...chord)).toBeLessThanOrEqual(note + 7);
          expect(Math.min(...chord)).toBeGreaterThan(note - 12);
        }
      }
    }
  });
  it('fuera de mayor y menor el preset se ignora', () => {
    expect(mappedDegree(1, 'dorian', 'pop')).toBe(1);
    expect(buildChord(62, 0, 'dorian', opts({ mapping: 'pop' }))).toEqual(buildChord(62, 0, 'dorian'));
  });
  it('variante y bajo siguen al acorde elegido', () => {
    const v = opts({ mapping: 'pop', bass: 'follow', variants: ['auto', 'auto', 'auto', 'auto', 'seventh', 'auto', 'auto'] });
    expect(buildChord(62, 0, 'major', v)).toEqual([43, 55, 59, 62, 65]);
  });
});
