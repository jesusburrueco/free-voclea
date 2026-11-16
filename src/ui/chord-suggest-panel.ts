import { suggestChords, type MelodyNote } from '../chord-suggest';

/** Graba la melodia como notas con duracion a partir de eventos note on/off con tiempo en segundos. */
export class MelodyRecorder {
  private notes: MelodyNote[] = [];
  private held: { note: number; t: number } | null = null;
  private active = false;

  get recording(): boolean {
    return this.active;
  }

  start(): void {
    this.notes = [];
    this.held = null;
    this.active = true;
  }

  noteOn(note: number, t: number): void {
    if (!this.active) return;
    this.close(t);
    this.held = { note, t };
  }

  noteOff(note: number, t: number): void {
    if (!this.active || this.held?.note !== note) return;
    this.close(t);
  }

  /** Termina la grabacion; una nota sostenida se cierra en `t`. */
  stop(t: number): MelodyNote[] {
    this.close(t);
    this.active = false;
    return this.notes.slice();
  }

  private close(t: number): void {
    if (!this.held) return;
    const dur = t - this.held.t;
    if (dur > 0) this.notes.push({ note: this.held.note, dur });
    this.held = null;
  }
}

export const SEGMENT_OPTIONS = [1, 2, 4] as const;

export interface ChordSuggestPanel {
  noteOn(note: number): void;
  noteOff(note: number): void;
}

/** Tarjeta "Sugerir acordes": graba lo que cantas y muestra un acorde diatonico por tramo. */
export function mountChordSuggest(root: HTMLElement, key: () => { tonic: number; scaleId: string }, now: () => number = () => performance.now() / 1000): ChordSuggestPanel {
  root.innerHTML = `
    <label for="tramo-acorde">Duracion de cada acorde</label>
    <select id="tramo-acorde" aria-label="Duracion de cada acorde">${SEGMENT_OPTIONS.map((s) => `<option value="${s}"${s === 2 ? ' selected' : ''}>${s} s</option>`).join('')}</select>
    <button id="grabar-melodia" type="button" aria-pressed="false">Grabar melodia</button>
    <p id="estado-sugerencia" class="pista" aria-live="polite">Activa el micro, pulsa Grabar y canta una melodia.</p>
    <ol id="acordes-sugeridos" class="sugeridos" aria-label="Acordes sugeridos"></ol>`;
  const seg = root.querySelector<HTMLSelectElement>('#tramo-acorde');
  const btn = root.querySelector<HTMLButtonElement>('#grabar-melodia');
  const status = root.querySelector<HTMLParagraphElement>('#estado-sugerencia');
  const list = root.querySelector<HTMLOListElement>('#acordes-sugeridos');
  const rec = new MelodyRecorder();

  btn?.addEventListener('click', () => {
    if (!btn || !status || !list) return;
    if (!rec.recording) {
      rec.start();
      list.replaceChildren();
      btn.textContent = 'Parar y sugerir';
      btn.setAttribute('aria-pressed', 'true');
      status.textContent = 'Grabando: canta la melodia.';
      return;
    }
    const notes = rec.stop(now());
    btn.textContent = 'Grabar melodia';
    btn.setAttribute('aria-pressed', 'false');
    const { tonic, scaleId } = key();
    const chords = notes.length > 0 ? suggestChords(notes, tonic, scaleId, Number(seg?.value ?? 2)) : [];
    if (chords.length === 0) {
      status.textContent = 'No se detectaron notas. Activa el micro y vuelve a probar.';
      return;
    }
    status.textContent = `${chords.length} acordes sugeridos.`;
    for (const c of chords) {
      const li = document.createElement('li');
      li.innerHTML = `<strong></strong><span></span>`;
      const [name, roman] = [li.querySelector('strong'), li.querySelector('span')];
      if (name) name.textContent = c.name;
      if (roman) roman.textContent = c.roman;
      li.setAttribute('aria-label', `${c.name}, grado ${c.roman}`);
      list.append(li);
    }
  });

  return {
    noteOn: (note) => rec.noteOn(note, now()),
    noteOff: (note) => rec.noteOff(note, now()),
  };
}
