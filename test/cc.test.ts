import { describe, expect, it } from 'vitest';
import { CcMapper, envelopeToCc, sanitizeCcSettings, timbreToCc } from '../src/audio/cc';
import { FEATURE_LEN, spectralCentroidHz } from '../src/beat/features';
import { sine } from './fixtures/signals';

describe('CC', () => {
  it('mapea nivel y timbre a 0..127', () => {
    expect(envelopeToCc(-60)).toBe(0);
    expect(envelopeToCc(-10)).toBe(127);
    expect(envelopeToCc(-30)).toBe(64);
    expect(timbreToCc(0)).toBe(0);
    expect(timbreToCc(300)).toBe(0);
    expect(timbreToCc(4000)).toBe(127);
    expect(timbreToCc(20000)).toBe(127);
  });
  it('sanea ajustes', () => {
    const s = sanitizeCcSettings({ envelope: { on: true, controller: 999, channel: 0 } });
    expect(s.envelope).toEqual({ on: true, controller: 127, channel: 1 });
    expect(s.timbre).toEqual({ on: false, controller: 74, channel: 1 });
  });
  it('no manda nada si esta desactivado', () => {
    expect(new CcMapper().update({ db: -20, centroidHz: 1000, voiced: true })).toEqual([]);
  });
  it('suaviza, evita repetidos y manda un 0 al callar', () => {
    const m = new CcMapper(1);
    m.setConfig(sanitizeCcSettings({ envelope: { on: true, controller: 7, channel: 3 } as never }));
    const a = m.update({ db: -10, centroidHz: 0, voiced: true });
    expect(a).toEqual([{ controller: 7, value: 127, channel: 3 }]);
    expect(m.update({ db: -10, centroidHz: 0, voiced: true })).toEqual([]);
    expect(m.update({ db: -10, centroidHz: 0, voiced: false })).toEqual([{ controller: 7, value: 0, channel: 3 }]);
    expect(m.update({ db: -10, centroidHz: 0, voiced: false })).toEqual([]);
  });
  it('el centroide crece con la frecuencia', () => {
    const low = spectralCentroidHz(sine(300, 0.1, 0.5, 44100).slice(0, FEATURE_LEN), 44100);
    const high = spectralCentroidHz(sine(3000, 0.1, 0.5, 44100).slice(0, FEATURE_LEN), 44100);
    expect(low).toBeGreaterThan(200);
    expect(low).toBeLessThan(450);
    expect(high).toBeGreaterThan(2500);
    expect(spectralCentroidHz(new Float32Array(FEATURE_LEN), 44100)).toBe(0);
  });
});
