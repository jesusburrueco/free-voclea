import { buildChord, defaultChordOptions, type ChordOptions } from './chords';
import type { NoteEvent } from './segmenter';

export interface OutputSettings {
  melody: boolean;
  chords: boolean;
  /** Desplazamiento de octavas de la melodia (-3..3). */
  octave: number;
  /** Transposicion en semitonos (-12..12), aplicada a melodia y acordes. */
  transpose: number;
  /** Octavas extra para los acordes (-2..1). */
  chordOctave: number;
  /** Rango de notas permitido (MIDI). */
  rangeLow: number;
  rangeHigh: number;
  melodyChannel: number;
  chordChannel: number;
  chord: ChordOptions;
}

export const defaultOutputSettings: OutputSettings = {
  melody: true,
  chords: false,
  octave: 0,
  transpose: 0,
  chordOctave: -1,
  rangeLow: 0,
  rangeHigh: 127,
  melodyChannel: 1,
  chordChannel: 2,
  chord: defaultChordOptions,
};

export type Part = 'melody' | 'chord';
export interface OutEvent {
  part: Part;
  type: 'on' | 'off';
  notes: number[];
  channel: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : lo)));

export function sanitizeOutputSettings(raw: Partial<OutputSettings> | null | undefined): OutputSettings {
  const d = defaultOutputSettings;
  const r = raw ?? {};
  const low = clamp(r.rangeLow ?? d.rangeLow, 0, 127);
  const high = clamp(r.rangeHigh ?? d.rangeHigh, 0, 127);
  const c: Partial<ChordOptions> = r.chord ?? {};
  return {
    melody: r.melody !== false,
    chords: r.chords === true,
    octave: clamp(r.octave ?? d.octave, -3, 3),
    transpose: clamp(r.transpose ?? d.transpose, -12, 12),
    chordOctave: clamp(r.chordOctave ?? d.chordOctave, -2, 1),
    rangeLow: Math.min(low, high),
    rangeHigh: Math.max(low, high),
    melodyChannel: clamp(r.melodyChannel ?? d.melodyChannel, 1, 16),
    chordChannel: clamp(r.chordChannel ?? d.chordChannel, 1, 16),
    chord: {
      variants: d.chord.variants.map((v, i) => {
        const x = c.variants?.[i];
        return x === 'seventh' || x === 'sus2' || x === 'sus4' || x === 'auto' ? x : v;
      }),
      inversion: c.inversion === 1 || c.inversion === 2 ? c.inversion : 0,
      voicing: c.voicing === 'open' ? 'open' : 'close',
      bass: c.bass === 'follow' || c.bass === 'fixed' ? c.bass : 'off',
    },
  };
}

/** Desplaza el conjunto de notas por octavas enteras para que quepa en [low, high]; descarta las que sigan fuera. */
export function fitRange(notes: readonly number[], low: number, high: number): number[] {
  if (notes.length === 0) return [];
  let out = [...notes];
  let guard = 0;
  while (Math.max(...out) > high && Math.min(...out) - 12 >= low && guard++ < 12) out = out.map((n) => n - 12);
  while (Math.min(...out) < low && Math.max(...out) + 12 <= high && guard++ < 24) out = out.map((n) => n + 12);
  return out.filter((n) => n >= low && n <= high && n >= 0 && n <= 127);
}

/** Convierte las notas cantadas (ya cuantizadas) en salidas de melodia y acordes, con octava, transposicion y rango. */
export class OutputRouter {
  private s: OutputSettings = defaultOutputSettings;
  private tonic = 0;
  private scaleId = 'chromatic';
  private sounding: { part: Part; notes: number[]; channel: number }[] = [];

  setSettings(s: OutputSettings): OutEvent[] {
    const off = this.releaseAll();
    this.s = s;
    return off;
  }
  setScale(tonic: number, scaleId: string): void {
    this.tonic = tonic;
    this.scaleId = scaleId;
  }

  /** Corta todo lo que suena. */
  releaseAll(): OutEvent[] {
    const off = this.sounding.map((v) => ({ part: v.part, type: 'off' as const, notes: v.notes, channel: v.channel }));
    this.sounding = [];
    return off;
  }

  process(events: readonly NoteEvent[]): OutEvent[] {
    const out: OutEvent[] = [];
    for (const ev of events) {
      if (ev.type === 'off') {
        out.push(...this.releaseAll());
        continue;
      }
      if (this.s.melody) {
        const n = fitRange([ev.note + 12 * this.s.octave + this.s.transpose], this.s.rangeLow, this.s.rangeHigh);
        if (n.length) this.emit(out, 'melody', n, this.s.melodyChannel);
      }
      if (this.s.chords) {
        const chord = buildChord(ev.note, this.tonic, this.scaleId, this.s.chord).map((n) => n + 12 * this.s.chordOctave + this.s.transpose);
        const n = fitRange(chord, this.s.rangeLow, this.s.rangeHigh);
        if (n.length) this.emit(out, 'chord', n, this.s.chordChannel);
      }
    }
    return out;
  }

  private emit(out: OutEvent[], part: Part, notes: number[], channel: number): void {
    this.sounding.push({ part, notes, channel });
    out.push({ part, type: 'on', notes, channel });
  }
}
