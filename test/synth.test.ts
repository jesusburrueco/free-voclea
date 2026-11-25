import { describe, expect, it } from 'vitest';
import { defaultEnvelope as env, envelopeGain } from '../src/audio/synth';

describe('envelopeGain', () => {
  it('empieza en 0 y llega a 1 al final del ataque', () => {
    expect(envelopeGain(env, 0)).toBe(0);
    expect(envelopeGain(env, env.attack)).toBeCloseTo(1, 6);
  });
  it('decae hasta el nivel de sostenimiento y lo mantiene', () => {
    expect(envelopeGain(env, env.attack + env.decay)).toBeCloseTo(env.sustain, 6);
    expect(envelopeGain(env, 5)).toBeCloseTo(env.sustain, 6);
  });
  it('la liberacion baja linealmente a 0 desde el nivel actual', () => {
    expect(envelopeGain(env, 1 + env.release / 2, 1)).toBeCloseTo(env.sustain / 2, 6);
    expect(envelopeGain(env, 1 + env.release, 1)).toBe(0);
  });
  it('liberar durante el ataque parte del nivel alcanzado', () => {
    const at = env.attack / 2;
    expect(envelopeGain(env, at, at)).toBeCloseTo(0.5, 6);
  });
});
