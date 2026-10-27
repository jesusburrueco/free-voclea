import { describe, expect, it } from 'vitest';
import { bendMessage, bendSemitones, bendValue, clampBendRange } from '../src/audio/bend';
import { freqToMidi, midiToFreq } from '../src/notes';

describe('pitch bend', () => {
  it('limita el rango a 1..48 con defecto 2', () => {
    expect(clampBendRange(0)).toBe(1);
    expect(clampBendRange(100)).toBe(48);
    expect(clampBendRange(12.4)).toBe(12);
    expect(clampBendRange(Number.NaN)).toBe(2);
  });

  it('centro, extremos y proporcion de 14 bits', () => {
    expect(bendValue(0, 2)).toBe(8192);
    expect(bendValue(2, 2)).toBe(16383);
    expect(bendValue(-2, 2)).toBe(0);
    expect(bendValue(1, 2)).toBe(12288);
    expect(bendValue(10, 2)).toBe(16383);
    expect(bendValue(1, 12)).toBe(8192 + Math.round(8192 / 12));
  });

  it('desviacion respecto a la nota entera, medida desde una frecuencia', () => {
    const midi = freqToMidi(midiToFreq(60) * 2 ** (0.5 / 12));
    expect(bendSemitones(midi, 60, 2)).toBeCloseTo(0.5, 6);
    expect(bendSemitones(midi, 60, 1)).toBeCloseTo(0.5, 6);
    expect(bendSemitones(63, 60, 2)).toBe(2);
    expect(bendSemitones(57, 60, 2)).toBe(-2);
  });

  it('mensaje 0xE0 con LSB y MSB', () => {
    expect(bendMessage(8192)).toEqual([0xe0, 0, 64]);
    expect(bendMessage(16383, 3)).toEqual([0xe2, 127, 127]);
    expect(bendMessage(0, 16)).toEqual([0xef, 0, 0]);
    expect(bendMessage(12288)).toEqual([0xe0, 0, 96]);
  });
});
