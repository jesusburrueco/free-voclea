export const DRUM_VOICES = [
  { id: 'kick', name: 'Bombo' },
  { id: 'snare', name: 'Caja' },
  { id: 'hat', name: 'Charles cerrado' },
  { id: 'open-hat', name: 'Charles abierto' },
  { id: 'tom', name: 'Tom' },
  { id: 'clap', name: 'Palmada' },
  { id: 'rim', name: 'Aro' },
] as const;

export type DrumVoice = (typeof DRUM_VOICES)[number]['id'];
export const DRUM_IDS: readonly string[] = DRUM_VOICES.map((v) => v.id);

/** Ganancia 0..1 a partir de la velocidad MIDI (curva suave). */
export function velocityGain(velocity: number): number {
  const v = Math.min(127, Math.max(0, velocity)) / 127;
  return v ** 1.5;
}

/** Kit de percusion sintetizado con Web Audio, sin muestras externas. */
export class DrumKit {
  private readonly out: GainNode;
  private readonly noiseBuf: AudioBuffer;

  constructor(
    private readonly ctx: AudioContext,
    volume = 0.6,
  ) {
    this.out = ctx.createGain();
    this.out.gain.value = volume;
    this.out.connect(ctx.destination);
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    let seed = 12345;
    for (let i = 0; i < d.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      d[i] = seed / 2 ** 31 - 1;
    }
  }

  trigger(voice: string, velocity: number, when = this.ctx.currentTime): void {
    const peak = velocityGain(velocity);
    switch (voice) {
      case 'kick':
        return this.tone(when, peak, 'sine', 150, 45, 0.12, 0.35);
      case 'tom':
        return this.tone(when, peak, 'sine', 160, 90, 0.15, 0.3);
      case 'snare':
        this.tone(when, peak * 0.5, 'triangle', 200, 160, 0.05, 0.12);
        return this.noise(when, peak * 0.8, 'highpass', 1200, 0.2);
      case 'hat':
        return this.noise(when, peak * 0.6, 'highpass', 7000, 0.05);
      case 'open-hat':
        return this.noise(when, peak * 0.6, 'highpass', 6500, 0.3);
      case 'clap':
        for (const d of [0, 0.012, 0.024]) this.noise(when + d, peak * 0.7, 'bandpass', 1500, 0.04);
        return this.noise(when + 0.036, peak * 0.7, 'bandpass', 1500, 0.15);
      case 'rim':
        return this.tone(when, peak * 0.6, 'square', 900, 800, 0.01, 0.04);
    }
  }

  private tone(when: number, peak: number, type: OscillatorType, f0: number, f1: number, sweep: number, decay: number): void {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, when);
    osc.frequency.exponentialRampToValueAtTime(f1, when + sweep);
    g.gain.setValueAtTime(peak, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + decay);
    osc.connect(g).connect(this.out);
    osc.start(when);
    osc.stop(when + decay + 0.02);
    osc.onended = () => g.disconnect();
  }

  private noise(when: number, peak: number, filter: BiquadFilterType, freq: number, decay: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(peak, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + decay);
    src.connect(f).connect(g).connect(this.out);
    src.start(when);
    src.stop(when + decay + 0.02);
    src.onended = () => g.disconnect();
  }

  dispose(): void {
    this.out.disconnect();
  }
}
