import { midiToFreq } from '../notes';

export interface Envelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export const defaultEnvelope: Envelope = { attack: 0.01, decay: 0.08, sustain: 0.7, release: 0.12 };

/** Ganancia de la envolvente ADSR en el instante t (s) tras note on; si releaseAt no es null, t se mide desde el inicio y la liberacion arranca en releaseAt. */
export function envelopeGain(env: Envelope, t: number, releaseAt: number | null = null): number {
  const held = (x: number): number => {
    if (x < env.attack) return env.attack > 0 ? x / env.attack : 1;
    const d = x - env.attack;
    if (d < env.decay) return 1 - (1 - env.sustain) * (d / env.decay);
    return env.sustain;
  };
  if (releaseAt === null || t < releaseAt) return held(t);
  const start = held(releaseAt);
  const r = t - releaseAt;
  return r >= env.release ? 0 : start * (1 - r / env.release);
}

/** Sinte monofonico basico: un oscilador con envolvente ADSR. */
export class Synth {
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private readonly out: GainNode;

  constructor(
    private readonly ctx: AudioContext,
    private readonly env: Envelope = defaultEnvelope,
    volume = 0.3,
  ) {
    this.out = ctx.createGain();
    this.out.gain.value = volume;
    this.out.connect(ctx.destination);
  }

  get playing(): boolean {
    return this.osc !== null;
  }

  noteOn(note: number): void {
    this.noteOff();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = midiToFreq(note);
    const { attack, decay, sustain } = this.env;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + attack);
    gain.gain.linearRampToValueAtTime(sustain, now + attack + decay);
    osc.connect(gain).connect(this.out);
    osc.start(now);
    this.osc = osc;
    this.gain = gain;
  }

  /** Desviacion en semitonos de la nota viva, via detune del oscilador. */
  setBend(semitones: number): void {
    this.osc?.detune.setTargetAtTime(semitones * 100, this.ctx.currentTime, 0.01);
  }

  noteOff(): void {
    const { osc, gain } = this;
    if (!osc || !gain) return;
    const now = this.ctx.currentTime;
    gain.gain.cancelAndHoldAtTime(now);
    gain.gain.linearRampToValueAtTime(0, now + this.env.release);
    osc.stop(now + this.env.release + 0.02);
    osc.onended = () => gain.disconnect();
    this.osc = null;
    this.gain = null;
  }

  dispose(): void {
    this.noteOff();
    this.out.disconnect();
  }
}
