import { describe, expect, it } from 'vitest';
import { finishCalibration, medianNote, percentile, thresholdFromNoise, type CalibrationFrame } from '../src/calibration';
import { midiToFreq } from '../src/notes';

const voiced = (note: number, n = 20): CalibrationFrame[] => Array.from({ length: n }, () => ({ db: -20, freq: midiToFreq(note), clarity: 0.95 }));
const quiet = (db: number, n = 20): CalibrationFrame[] => Array.from({ length: n }, () => ({ db, freq: 0, clarity: 0 }));

describe('calibracion', () => {
  it('percentil y umbral', () => {
    expect(percentile([], 0.5)).toBe(0);
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(thresholdFromNoise([-70, -70, -70])).toBe(-60);
    expect(thresholdFromNoise([-50, -50])).toBe(-40);
    expect(thresholdFromNoise([-10])).toBe(-25);
    expect(thresholdFromNoise([])).toBe(-40);
  });
  it('nota mediana, con minimo de fotogramas y claridad', () => {
    expect(medianNote(voiced(60))).toBe(60);
    expect(medianNote(voiced(60, 5))).toBeNull();
    expect(medianNote(voiced(60).map((f) => ({ ...f, clarity: 0.2 })))).toBeNull();
  });
  it('resultado completo con margen', () => {
    const r = finishCalibration({ silencio: quiet(-55), grave: voiced(48), agudo: voiced(72) });
    expect(r).toEqual({ thresholdDb: -45, range: { low: 46, high: 74 } });
  });
  it('sin notas medibles solo calibra el umbral', () => {
    expect(finishCalibration({ silencio: quiet(-55), grave: quiet(-60), agudo: voiced(72) }).range).toBeNull();
    expect(finishCalibration({ silencio: quiet(-55), grave: voiced(72), agudo: voiced(60) }).range).toBeNull();
  });
});
