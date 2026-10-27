import { NOTE_NAMES } from '../notes';

/** Teclado de una octava: cada tecla es un boton tactil que silencia o activa esa nota. Multitouch por ser botones independientes. */
export class MuteKeyboard {
  readonly el: HTMLDivElement;
  private readonly keys: HTMLButtonElement[] = [];
  readonly muted = new Set<number>();

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
      key.setAttribute('aria-label', `${NOTE_NAMES[pc]} permitida`);
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

  toggle(pc: number): void {
    if (this.muted.has(pc)) this.muted.delete(pc);
    else this.muted.add(pc);
    const key = this.keys[pc];
    if (key) {
      key.setAttribute('aria-pressed', String(this.muted.has(pc)));
      key.setAttribute('aria-label', `${NOTE_NAMES[pc]} ${this.muted.has(pc) ? 'silenciada' : 'permitida'}`);
    }
    this.onChange(this.muted);
  }

  /** Ilumina la nota que suena (o ninguna). */
  setActive(pc: number | null): void {
    this.keys.forEach((k, i) => k.classList.toggle('suena', i === pc));
  }
}
