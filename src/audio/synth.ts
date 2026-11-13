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

export interface SynthPreset {
  id: string;
  name: string;
  wave: OscillatorType;
  env: Envelope;
  /** Corte del filtro paso bajo en Hz (0 = sin filtro). */
  cutoff: number;
  /** Ganancia relativa del preset. */
  level: number;
}

export const SYNTH_PRESETS: readonly SynthPreset[] = [
  { id: 'suave', name: 'Suave', wave: 'triangle', env: defaultEnvelope, cutoff: 0, level: 1 },
  { id: 'brillante', name: 'Brillante', wave: 'sawtooth', env: { attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.15 }, cutoff: 2800, level: 0.6 },
  { id: 'hueco', name: 'Hueco', wave: 'square', env: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.1 }, cutoff: 1500, level: 0.6 },
  { id: 'pad', name: 'Colchon', wave: 'sawtooth', env: { attack: 0.35, decay: 0.3, sustain: 0.8, release: 0.6 }, cutoff: 1200, level: 0.55 },
  { id: 'pulso', name: 'Pulso corto', wave: 'triangle', env: { attack: 0.003, decay: 0.12, sustain: 0.05, release: 0.08 }, cutoff: 0, level: 1 },
  { id: 'puro', name: 'Puro', wave: 'sine', env: { attack: 0.02, decay: 0.05, sustain: 0.85, release: 0.2 }, cutoff: 0, level: 1 },
];

export function getPreset(id: string): SynthPreset {
  return SYNTH_PRESETS.find((p) => p.id === id) ?? (SYNTH_PRESETS[0] as SynthPreset);
}

interface Voice {
  osc: OscillatorNode;
  gain: GainNode;
}

/** Sinte con un solo grupo de notas a la vez (una nota o un acorde): osciladores con envolvente ADSR y filtro opcional. */
export class Synth {
  private voices: Voice[] = [];
  private readonly out: GainNode;
  private readonly filter: BiquadFilterNode;
  private preset: SynthPreset;

  constructor(
    private readonly ctx: AudioContext,
    preset: SynthPreset = getPreset('suave'),
    private readonly volume = 0.3,
  ) {
    this.preset = preset;
    this.out = ctx.createGain();
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.connect(this.out);
    this.out.connect(ctx.destination);
    this.setPreset(preset);
  }

  setPreset(preset: SynthPreset): void {
    this.preset = preset;
    this.out.gain.value = this.volume * preset.level;
    this.filter.frequency.value = preset.cutoff > 0 ? preset.cutoff : 20000;
  }

  get playing(): boolean {
    return this.voices.length > 0;
  }

  noteOn(notes: number | readonly number[]): void {
    this.noteOff();
    const list = typeof notes === 'number' ? [notes] : notes;
    const now = this.ctx.currentTime;
    const { attack, decay, sustain } = this.preset.env;
    // Con varias voces se baja cada una para no saturar.
    const trim = 1 / Math.sqrt(Math.max(1, list.length));
    for (const note of list) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = this.preset.wave;
      osc.frequency.value = midiToFreq(note);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(trim, now + attack);
      gain.gain.linearRampToValueAtTime(trim * sustain, now + attack + decay);
      osc.connect(gain).connect(this.filter);
      osc.start(now);
      this.voices.push({ osc, gain });
    }
  }

  /** Desviacion en semitonos de las notas vivas, via detune. */
  setBend(semitones: number): void {
    for (const v of this.voices) v.osc.detune.setTargetAtTime(semitones * 100, this.ctx.currentTime, 0.01);
  }

  noteOff(): void {
    const now = this.ctx.currentTime;
    const { release } = this.preset.env;
    for (const { osc, gain } of this.voices) {
      gain.gain.cancelAndHoldAtTime(now);
      gain.gain.linearRampToValueAtTime(0, now + release);
      osc.stop(now + release + 0.02);
      osc.onended = () => gain.disconnect();
    }
    this.voices = [];
  }

  dispose(): void {
    this.noteOff();
    this.out.disconnect();
  }
}
