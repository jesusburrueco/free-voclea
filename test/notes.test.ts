import { describe, expect, it } from 'vitest';
import { freqToMidi, midiToFreq, midiToName } from '../src/notes';

describe('notes', () => {
  it('A4 = 440 Hz = 69', () => {
    expect(freqToMidi(440)).toBe(69);
    expect(midiToFreq(69)).toBe(440);
  });

  it('ida y vuelta entre Hz y MIDI', () => {
    for (let m = 21; m <= 108; m++) {
      expect(freqToMidi(midiToFreq(m))).toBeCloseTo(m, 9);
    }
  });

  it('nombres con octava', () => {
    expect(midiToName(60)).toBe('C4');
    expect(midiToName(36)).toBe('C2');
    expect(midiToName(61)).toBe('C#4');
    expect(midiToName(0)).toBe('C-1');
  });
});
