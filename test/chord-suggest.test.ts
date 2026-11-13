import { describe, expect, it } from 'vitest';
import { chordForSegment, diatonicTriads, splitByDuration, suggestChords, type MelodyNote } from '../src/chord-suggest';

const q = (notes: number[], dur = 1): MelodyNote[] => notes.map((note) => ({ note, dur }));

describe('diatonicTriads', () => {
  it('Do mayor: C Dm Em F G Am B°', () => {
    const t = diatonicTriads(0, 'major');
    expect(t.map((x) => [x.rootPc, x.quality])).toEqual([
      [0, 'maj'], [2, 'min'], [4, 'min'], [5, 'maj'], [7, 'maj'], [9, 'min'], [11, 'dim'],
    ]);
  });
  it('escala no heptatonica usa Mayor', () => {
    expect(diatonicTriads(2, 'blues').map((x) => x.rootPc)).toEqual([2, 4, 6, 7, 9, 11, 1]);
  });
});

describe('chordForSegment', () => {
  it('tramo vacio devuelve null', () => {
    expect(chordForSegment([], 0, 'major')).toBeNull();
    expect(chordForSegment(q([60], 0), 0, 'major')).toBeNull();
  });
  it('arpegio de Do mayor sugiere I', () => {
    expect(chordForSegment(q([60, 64, 67, 72]), 0, 'major')).toMatchObject({ name: 'C', roman: 'I', fit: 1 });
  });
  it('arpegio de La menor sugiere vi', () => {
    expect(chordForSegment(q([69, 72, 76, 69]), 0, 'major')).toMatchObject({ name: 'Am', roman: 'vi', fit: 1 });
  });
  it('Sol y Re largos sugieren V aunque haya notas de paso', () => {
    const seg: MelodyNote[] = [{ note: 67, dur: 2 }, { note: 69, dur: 0.25 }, { note: 71, dur: 1 }, { note: 74, dur: 2 }];
    const c = chordForSegment(seg, 0, 'major');
    expect(c).toMatchObject({ name: 'G', roman: 'V', degree: 4 });
    expect(c?.fit).toBeCloseTo(5 / 5.25, 6);
  });
  it('disminuido en el septimo grado', () => {
    expect(chordForSegment(q([71, 74, 77]), 0, 'major')).toMatchObject({ name: 'B°', roman: 'vii°' });
  });
  it('en La menor natural, Mi Sol# no existe: Mi Sol Si sugiere v menor', () => {
    expect(chordForSegment(q([64, 67, 71]), 9, 'minor')).toMatchObject({ name: 'Em', roman: 'v' });
  });
  it('menor armonica: Mi Sol# Si sugiere V mayor', () => {
    expect(chordForSegment(q([64, 68, 71]), 9, 'harmonic-minor')).toMatchObject({ name: 'E', roman: 'V' });
  });
});

describe('splitByDuration', () => {
  it('reparte notas que cruzan el limite', () => {
    const s = splitByDuration([{ note: 60, dur: 1.5 }, { note: 62, dur: 1 }], 1);
    expect(s).toEqual([[{ note: 60, dur: 1 }], [{ note: 60, dur: 0.5 }, { note: 62, dur: 0.5 }], [{ note: 62, dur: 0.5 }]]);
  });
  it('rechaza duraciones no positivas', () => {
    expect(() => splitByDuration([], 0)).toThrow();
  });
});

describe('suggestChords', () => {
  it('progresion I IV V I en Do mayor', () => {
    const melody = q([60, 64, 67, 64, 65, 69, 72, 69, 67, 71, 74, 71, 72, 67, 64, 60]);
    expect(suggestChords(melody, 0, 'major', 4).map((c) => c.roman)).toEqual(['I', 'IV', 'V', 'I']);
  });
  it('transpuesta a Re mayor da los mismos grados', () => {
    const melody = q([60, 64, 67, 64, 65, 69, 72, 69, 67, 71, 74, 71, 72, 67, 64, 60].map((n) => n + 2));
    expect(suggestChords(melody, 2, 'major', 4).map((c) => c.name)).toEqual(['D', 'G', 'A', 'D']);
  });
  it('ignora notas sin duracion y cambia de acorde por tramo', () => {
    const melody: MelodyNote[] = [...q([69, 72]), { note: 61, dur: 0 }, ...q([76, 72])];
    expect(suggestChords(melody, 0, 'major', 2).map((c) => c.name)).toEqual(['Am', 'C']);
  });
  it('melodia vacia no sugiere nada', () => {
    expect(suggestChords([], 0, 'major', 4)).toEqual([]);
  });
});
