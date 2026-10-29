import { quantizeToScale, getScale } from '../scales';
import type { NoteEvent } from './segmenter';

/** Cuantiza las notas detectadas a una escala y evita retriggers cuando dos notas crudas caen en la misma nota de la escala. */
export class NoteMapper {
  private tonic = 0;
  private scaleId = 'chromatic';
  private current: number | null = null;
  /** Nota cuyo off se ha retenido hasta ver si el on siguiente cae en la misma nota. */
  private pendingOff: number | null = null;

  private muted = new Set<number>();

  /** Clases de altura (0..11) que no deben sonar: la voz se cuantiza a la nota permitida mas cercana. */
  setMuted(pitchClasses: Iterable<number>): void {
    this.muted = new Set([...pitchClasses].map((p) => ((Math.round(p) % 12) + 12) % 12));
  }

  setScale(tonic: number, scaleId: string): void {
    this.tonic = ((Math.round(tonic) % 12) + 12) % 12;
    this.scaleId = getScale(scaleId).id;
  }

  /** Nota de salida para una nota cruda, o NaN si todas las notas estan silenciadas. */
  map(note: number): number {
    if (this.scaleId === 'chromatic' && this.muted.size === 0) return note;
    const base = getScale(this.scaleId);
    const intervals = base.intervals.filter((i) => !this.muted.has((this.tonic + i) % 12));
    if (intervals.length === 0) return Number.NaN;
    return quantizeToScale(note, this.tonic, { ...base, intervals });
  }

  /** Procesa los eventos de una trama. */
  process(events: NoteEvent[]): NoteEvent[] {
    const out: NoteEvent[] = [];
    for (const ev of events) {
      if (ev.type === 'off') {
        if (this.current !== null) {
          this.pendingOff = this.current;
          this.current = null;
        }
      } else {
        const q = this.map(ev.note);
        if (Number.isNaN(q)) continue;
        if (this.pendingOff === q) {
          this.current = q;
          this.pendingOff = null;
          continue;
        }
        if (this.pendingOff !== null) {
          out.push({ type: 'off', note: this.pendingOff });
          this.pendingOff = null;
        }
        out.push({ type: 'on', note: q });
        this.current = q;
      }
    }
    if (this.pendingOff !== null) {
      out.push({ type: 'off', note: this.pendingOff });
      this.pendingOff = null;
    }
    return out;
  }
}
