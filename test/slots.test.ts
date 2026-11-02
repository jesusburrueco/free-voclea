import { describe, expect, it, vi } from 'vitest';
import { DRUM_IDS, velocityGain } from '../src/audio/drums';
import { FEATURE_DIM } from '../src/beat/features';
import { MAX_EXAMPLES_PER_SLOT, addExample, clampChannel, defaultSlots, sanitizeSettings, sanitizeSlots, toExamples } from '../src/beat/slots';
import { MidiOutput } from '../src/midi/output';

const vec = (v = 0): number[] => new Array<number>(FEATURE_DIM).fill(v);

describe('slots', () => {
  it('datos invalidos dan los valores por defecto', () => {
    expect(sanitizeSlots(null, DRUM_IDS)).toEqual(defaultSlots());
    expect(sanitizeSlots('x', DRUM_IDS)).toEqual(defaultSlots());
  });
  it('sanea nombre, nota, voz y ejemplos', () => {
    const slots = sanitizeSlots(
      [{ name: '  Mi golpe muy largo de verdad que no cabe  ', note: 300, voice: 'inexistente', examples: [vec(1), [1, 2], 'x'] }],
      DRUM_IDS,
    );
    expect(slots[0]?.name).toHaveLength(24);
    expect(slots[0]?.note).toBe(127);
    expect(slots[0]?.voice).toBe('kick');
    expect(slots[0]?.examples).toEqual([vec(1)]);
    expect(slots).toHaveLength(4);
  });
  it('anade ejemplos con tope y los convierte para el clasificador', () => {
    const slots = defaultSlots();
    for (let i = 0; i < MAX_EXAMPLES_PER_SLOT + 3; i++) addExample(slots, 1, vec(i));
    addExample(slots, 1, [1, 2]);
    expect(slots[1]?.examples).toHaveLength(MAX_EXAMPLES_PER_SLOT);
    expect(slots[1]?.examples[0]?.[0]).toBe(3);
    expect(toExamples(slots).every((e) => e.slot === 1)).toBe(true);
  });
  it('ajustes por defecto y limites', () => {
    expect(sanitizeSettings(undefined)).toEqual({ enabled: true, sensitivity: 0.5, channel: 10 });
    expect(sanitizeSettings({ enabled: false, sensitivity: 4, channel: 99 })).toEqual({ enabled: false, sensitivity: 1, channel: 16 });
    expect(clampChannel(NaN)).toBe(10);
  });
  it('la ganancia por velocidad es monotona y acotada', () => {
    expect(velocityGain(0)).toBe(0);
    expect(velocityGain(127)).toBe(1);
    expect(velocityGain(64)).toBeLessThan(velocityGain(100));
  });
});

describe('sendTrigger', () => {
  it('envia note on en el canal de triggers y note off despues', () => {
    vi.useFakeTimers();
    const sent: number[][] = [];
    const out = { id: 'a', name: 'A', send: (d: number[]) => void sent.push(d) };
    const m = new MidiOutput({ outputs: { values: () => [out] }, onstatechange: null });
    m.select('a');
    m.sendTrigger(38, 90);
    expect(sent).toEqual([[0x99, 38, 90]]);
    vi.advanceTimersByTime(100);
    expect(sent[1]).toEqual([0x89, 38, 0]);
    vi.useRealTimers();
  });
});
