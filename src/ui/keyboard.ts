import { NOTE_NAMES } from '../notes';

/** Teclado de una octava: cada tecla es un boton tactil que silencia o activa esa nota. Multitouch por ser botones independientes. */
export class MuteKeyboard {
  readonly el: HTMLDivElement;
  private readonly keys: HTMLButtonElement[] = [];
  readonly muted = new Set<number>();
  private inScale: ReadonlySet<number> = new Set(Array.from({ length: 12 }, (_, i) => i));
  private chordExtra = new Set<number>();

  constructor(private readonly onChange: (muted: ReadonlySet<number>) => void) {
    this.el = document.createElement('div');
    this.el.className = 'teclado';
    this.el.setAttribute('role', 'group');
    this.el.setAttribute('aria-label', 'Teclado de notas permitidas');
    for (let pc = 0; pc < 12; pc++) {
      const key = document.createElement('button');
      key.type = 'button';
      key.textContent = NOTE_NAMES[pc] ?? '';
      key.dataset['pc'] = String(pc);
      key.className = NOTE_NAMES[pc]?.includes('#') ? 'negra' : 'blanca';
      key.setAttribute('aria-pressed', 'false');
      key.setAttribute('aria-label', this.label(pc));
      key.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.toggle(pc);
      });
      key.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggle(pc);
        }
      });
      this.keys.push(key);
      this.el.append(key);
    }
  }

  /** Restaura un conjunto de notas silenciadas sin avisar al exterior. */
  setMuted(pcs: Iterable<number>): void {
    this.muted.clear();
    for (const pc of pcs) this.muted.add(pc);
    this.keys.forEach((key, pc) => {
      key.setAttribute('aria-pressed', String(this.muted.has(pc)));
      key.setAttribute('aria-label', this.label(pc));
    });
  }

  toggle(pc: number): void {
    if (this.muted.has(pc)) this.muted.delete(pc);
    else this.muted.add(pc);
    const key = this.keys[pc];
    if (key) {
      key.setAttribute('aria-pressed', String(this.muted.has(pc)));
      key.setAttribute('aria-label', this.label(pc));
    }
    this.onChange(this.muted);
  }

  /**
   * Marca las teclas fuera de la tonalidad y escala elegidas (clase `fuera`).
   * Solo informa: el silenciado del usuario es independiente y se conserva.
   */
  setScale(inScale: ReadonlySet<number>): void {
    this.inScale = new Set(inScale);
    this.keys.forEach((key, pc) => {
      key.classList.toggle('fuera', !this.inScale.has(pc));
      key.setAttribute('aria-label', this.label(pc));
    });
  }

  /**
   * Marca las notas extra del acorde que suena (clase `acorde`): las clases de nota del
   * acorde distintas de la nota cantada. `null` o lista vacia quita la marca.
   */
  setChord(notes: readonly number[] | null, sungPc: number | null = null): void {
    const extra = new Set<number>();
    for (const n of notes ?? []) {
      const pc = ((Math.round(n) % 12) + 12) % 12;
      if (pc !== sungPc) extra.add(pc);
    }
    this.chordExtra = extra;
    this.keys.forEach((key, pc) => {
      key.classList.toggle('acorde', extra.has(pc));
      key.setAttribute('aria-label', this.label(pc));
    });
  }

  private label(pc: number): string {
    const state = this.muted.has(pc) ? 'silenciada' : 'permitida';
    const scale = this.inScale.has(pc) ? '' : ', fuera de escala';
    const chord = this.chordExtra.has(pc) ? ', nota del acorde' : '';
    return `${NOTE_NAMES[pc] ?? ''} ${state}${scale}${chord}`;
  }

  /** Ilumina la nota que suena (o ninguna). */
  setActive(pc: number | null): void {
    this.keys.forEach((k, i) => k.classList.toggle('suena', i === pc));
  }
}
