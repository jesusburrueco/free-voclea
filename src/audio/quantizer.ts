import { quantizeToScale, getScale } from '../scales';
import type { NoteEvent } from './segmenter';

/** Cuantiza las notas detectadas a una escala y evita retriggers cuando dos notas crudas caen en la misma nota de la escala. */
export class NoteMapper {
  private tonic = 0;
  private scaleId = 'chromatic';
  private current: number | null = null;
  /** Nota cuyo off se ha retenido hasta ver si el on siguiente cae en la misma nota. */
  private pendingOff: number | null = null;

  setScale(tonic: number, scaleId: string): void {
    this.tonic = ((Math.round(tonic) % 12) + 12) % 12;
    this.scaleId = getScale(scaleId).id;
  }

  map(note: number): number {
    return this.scaleId === 'chromatic' ? note : quantizeToScale(note, this.tonic, getScale(this.scaleId));
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
