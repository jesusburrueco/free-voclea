import { describe, expect, it } from 'vitest';
import { OutputRouter, defaultOutputSettings, fitRange, sanitizeOutputSettings } from '../src/audio/router';

const on = (note: number) => ({ type: 'on' as const, note });
const off = (note: number) => ({ type: 'off' as const, note });

describe('OutputRouter', () => {
  it('solo melodia por defecto', () => {
    const r = new OutputRouter();
    expect(r.process([on(60)])).toEqual([{ part: 'melody', type: 'on', notes: [60], channel: 1 }]);
    expect(r.process([off(60)])).toEqual([{ part: 'melody', type: 'off', notes: [60], channel: 1 }]);
  });
  it('octava y transposicion', () => {
    const r = new OutputRouter();
    r.setSettings(sanitizeOutputSettings({ octave: 1, transpose: 2 }));
    expect(r.process([on(60)])[0]?.notes).toEqual([74]);
  });
  it('acordes en su canal, una octava abajo, con melodia a la vez', () => {
    const r = new OutputRouter();
    r.setScale(0, 'major');
    r.setSettings(sanitizeOutputSettings({ chords: true, chordChannel: 5 }));
    const out = r.process([on(60)]);
    expect(out).toEqual([
      { part: 'melody', type: 'on', notes: [60], channel: 1 },
      { part: 'chord', type: 'on', notes: [48, 52, 55], channel: 5 },
    ]);
    expect(r.process([off(60)])).toHaveLength(2);
  });
  it('solo acordes', () => {
    const r = new OutputRouter();
    r.setScale(0, 'major');
    r.setSettings(sanitizeOutputSettings({ melody: false, chords: true }));
    expect(r.process([on(62)]).map((e) => e.part)).toEqual(['chord']);
  });
  it('cambiar ajustes corta lo que suena', () => {
    const r = new OutputRouter();
    r.process([on(60)]);
    expect(r.setSettings(defaultOutputSettings)).toHaveLength(1);
  });
  it('el rango pliega por octavas o descarta', () => {
    expect(fitRange([100], 40, 80)).toEqual([76]);
    expect(fitRange([20], 40, 80)).toEqual([44]);
    expect(fitRange([48, 52, 55], 60, 72)).toEqual([60, 64, 67]);
    expect(fitRange([60], 61, 62)).toEqual([]);
  });
  it('sanea ajustes invalidos', () => {
    const s = sanitizeOutputSettings({ octave: 99, transpose: -99, rangeLow: 90, rangeHigh: 10, melodyChannel: 0, chord: { inversion: 2, voicing: 'x' as never, bass: 'fixed', variants: ['seventh', 'zz' as never] } as never });
    expect(s.octave).toBe(3);
    expect(s.transpose).toBe(-12);
    expect([s.rangeLow, s.rangeHigh]).toEqual([10, 90]);
    expect(s.melodyChannel).toBe(1);
    expect(s.chord.variants.slice(0, 3)).toEqual(['seventh', 'auto', 'auto']);
    expect(s.chord.voicing).toBe('close');
    expect(s.chord.inversion).toBe(2);
  });
});
