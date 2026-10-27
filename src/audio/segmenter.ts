import { freqToMidi } from '../notes';
import { toDb } from './level';

export interface SegmenterOptions {
  /** Umbral de entrada en dBFS para abrir una nota. */
  thresholdDb: number;
  /** Histeresis de nivel: una nota abierta solo se cierra por debajo de thresholdDb - releaseDb. */
  releaseDb: number;
  /** Claridad minima del detector de pitch para considerar que hay tono. */
  minClarity: number;
  /** Tiempo con tono estable antes de abrir una nota (ms). */
  onMs: number;
  /** Tiempo sin tono antes de cerrar la nota (ms). */
  offMs: number;
  /** Pegajosidad: semitonos extra, sobre el medio semitono, para abandonar la nota actual. */
  stickiness: number;
  /** Tiempo minimo que debe sostenerse otra nota antes de cambiar (ms). */
  changeMs: number;
}

export const defaultSegmenterOptions: SegmenterOptions = {
  thresholdDb: -40,
  releaseDb: 6,
  minClarity: 0.8,
  onMs: 30,
  offMs: 80,
  stickiness: 0.25,
  changeMs: 50,
};

export interface FrameInput {
  rms: number;
  freq: number;
  clarity: number;
}

export type NoteEvent = { type: 'on'; note: number } | { type: 'off'; note: number };

/** Convierte tramas de nivel y pitch en eventos note on/off, con histeresis de nivel y de altura. */
export class NoteSegmenter {
  private readonly opts: SegmenterOptions;
  private current: number | null = null;
  private candidate: number | null = null;
  private candidateMs = 0;
  private silentMs = 0;

  constructor(opts: Partial<SegmenterOptions> = {}) {
    this.opts = { ...defaultSegmenterOptions, ...opts };
  }

  get activeNote(): number | null {
    return this.current;
  }

  /** Procesa una trama de dtMs milisegundos y devuelve los eventos que provoca. */
  update(frame: FrameInput, dtMs: number): NoteEvent[] {
    const o = this.opts;
    const db = toDb(frame.rms);
    const limit = this.current === null ? o.thresholdDb : o.thresholdDb - o.releaseDb;
    const voiced = frame.freq > 0 && frame.clarity >= o.minClarity && db >= limit;
    const events: NoteEvent[] = [];

    if (!voiced) {
      this.candidate = null;
      this.candidateMs = 0;
      if (this.current !== null) {
        this.silentMs += dtMs;
        if (this.silentMs >= o.offMs) {
          events.push({ type: 'off', note: this.current });
          this.current = null;
          this.silentMs = 0;
        }
      }
      return events;
    }

    this.silentMs = 0;
    const midi = freqToMidi(frame.freq);
    const note = Math.round(midi);

    if (this.current !== null) {
      const far = Math.abs(midi - this.current) >= 0.5 + o.stickiness;
      if (note === this.current || !far) {
        this.candidate = null;
        this.candidateMs = 0;
        return events;
      }
    }

    if (this.candidate === note) this.candidateMs += dtMs;
    else {
      this.candidate = note;
      this.candidateMs = dtMs;
    }
    const needed = this.current === null ? o.onMs : o.changeMs;
    if (this.candidateMs >= needed) {
      if (this.current !== null) events.push({ type: 'off', note: this.current });
      events.push({ type: 'on', note });
      this.current = note;
      this.candidate = null;
      this.candidateMs = 0;
    }
    return events;
  }

  /** Cierra la nota activa, si la hay (p. ej. al parar el micro). */
  reset(): NoteEvent[] {
    const events: NoteEvent[] = this.current === null ? [] : [{ type: 'off', note: this.current }];
    this.current = null;
    this.candidate = null;
    this.candidateMs = 0;
    this.silentMs = 0;
    return events;
  }
}
