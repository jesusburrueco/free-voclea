import { BEND_CENTER, bendMessage } from '../audio/bend';
import type { NoteEvent } from '../audio/segmenter';
import type { OutEvent } from '../audio/router';

export interface MidiPortInfo {
  id: string;
  name: string;
}

interface OutLike extends MidiPortInfo {
  send(data: number[]): void;
}

interface AccessLike {
  outputs: { values(): Iterable<OutLike> };
  onstatechange: ((ev: unknown) => void) | null;
}

interface NavigatorLike {
  requestMIDIAccess?: (opts?: { sysex?: boolean }) => Promise<unknown>;
}

export const NOTE_VELOCITY = 100;

export function isMidiSupported(nav: NavigatorLike): boolean {
  return typeof nav.requestMIDIAccess === 'function';
}

/** Mensaje de nota (canal 1..16). Devuelve los 3 bytes MIDI. */
export function noteMessage(ev: NoteEvent, channel = 1, velocity = NOTE_VELOCITY): number[] {
  const ch = Math.min(16, Math.max(1, Math.round(channel))) - 1;
  const note = Math.min(127, Math.max(0, Math.round(ev.note)));
  return ev.type === 'on' ? [0x90 | ch, note, velocity] : [0x80 | ch, note, 0];
}

export type MidiResult = { ok: true; midi: MidiOutput } | { ok: false; reason: 'unsupported' | 'denied' };

export class MidiOutput {
  private selected: string | null = null;
  /** Notas vivas como `canal:nota`. */
  private sounding = new Set<string>();
  channel = 1;
  /** Canal de los triggers de percusion (General MIDI: 10). */
  triggerChannel = 10;

  constructor(private readonly access: AccessLike) {}

  static async request(nav: NavigatorLike): Promise<MidiResult> {
    if (!nav.requestMIDIAccess) return { ok: false, reason: 'unsupported' };
    try {
      return { ok: true, midi: new MidiOutput((await nav.requestMIDIAccess({ sysex: false })) as AccessLike) };
    } catch {
      return { ok: false, reason: 'denied' };
    }
  }

  ports(): MidiPortInfo[] {
    return [...this.access.outputs.values()].map((o) => ({ id: o.id, name: o.name || `Puerto ${o.id}` }));
  }

  /** Cambiar de puerto corta las notas vivas del anterior. */
  select(id: string | null): void {
    if (id !== this.selected) this.allNotesOff();
    this.selected = id !== null && this.ports().some((p) => p.id === id) ? id : null;
  }

  get selectedId(): string | null {
    return this.selected;
  }

  onPortsChange(cb: () => void): void {
    this.access.onstatechange = () => {
      if (this.selected !== null && !this.ports().some((p) => p.id === this.selected)) {
        this.selected = null;
        this.sounding.clear();
      }
      cb();
    };
  }

  send(ev: NoteEvent): void {
    const out = this.current();
    if (!out) return;
    const key = `${this.channel}:${ev.note}`;
    if (ev.type === 'on') this.sounding.add(key);
    else this.sounding.delete(key);
    out.send(noteMessage(ev, this.channel));
  }

  /** Salida de melodia o acordes: una nota por cada elemento, en su canal. */
  sendOut(ev: OutEvent, velocity = NOTE_VELOCITY): void {
    const out = this.current();
    if (!out) return;
    for (const note of ev.notes) {
      const key = `${ev.channel}:${note}`;
      if (ev.type === 'on') this.sounding.add(key);
      else this.sounding.delete(key);
      out.send(noteMessage({ type: ev.type, note }, ev.channel, velocity));
    }
  }

  /** Mensaje de control (CC) en un canal. */
  sendCc(controller: number, value: number, channel = this.channel): void {
    const ch = Math.min(16, Math.max(1, Math.round(channel))) - 1;
    this.current()?.send([0xb0 | ch, Math.min(127, Math.max(0, Math.round(controller))), Math.min(127, Math.max(0, Math.round(value)))]);
  }

  /** Golpe de percusion: note on inmediato y note off tras `lengthMs`. */
  sendTrigger(note: number, velocity: number, lengthMs = 60): void {
    const out = this.current();
    if (!out) return;
    const v = Math.min(127, Math.max(1, Math.round(velocity)));
    out.send(noteMessage({ type: 'on', note }, this.triggerChannel, v));
    const port = out;
    setTimeout(() => port.send(noteMessage({ type: 'off', note }, this.triggerChannel)), lengthMs);
  }

  /** Envia un valor de pitch bend de 14 bits (centro 8192). */
  sendBend(value: number, channel = this.channel): void {
    this.current()?.send(bendMessage(value, channel));
  }

  allNotesOff(): void {
    const out = this.current();
    if (out) {
      const channels = new Set<number>();
      for (const key of this.sounding) {
        const [ch, note] = key.split(':').map(Number);
        out.send(noteMessage({ type: 'off', note: note ?? 0 }, ch ?? 1));
        channels.add(ch ?? 1);
      }
      for (const ch of channels) out.send(bendMessage(BEND_CENTER, ch));
    }
    this.sounding.clear();
  }

  private current(): OutLike | undefined {
    return this.selected === null ? undefined : [...this.access.outputs.values()].find((o) => o.id === this.selected);
  }
}
