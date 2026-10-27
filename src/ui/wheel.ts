import { NOTE_NAMES } from '../notes';

const NS = 'http://www.w3.org/2000/svg';

/** Rueda de 12 clases de altura: marca la nota viva, las notas de la escala y la desviacion en cents. */
export class PitchWheel {
  readonly el: SVGSVGElement;
  private readonly sectors: SVGPathElement[] = [];
  private readonly needle: SVGLineElement;
  private readonly label: SVGTextElement;

  constructor() {
    this.el = document.createElementNS(NS, 'svg');
    this.el.setAttribute('viewBox', '-110 -110 220 220');
    this.el.setAttribute('role', 'img');
    this.el.setAttribute('aria-label', 'Rueda de afinacion');
    this.el.classList.add('rueda');
    const point = (deg: number, r: number): string => {
      const a = ((deg - 90) * Math.PI) / 180;
      return `${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`;
    };
    for (let pc = 0; pc < 12; pc++) {
      const a0 = pc * 30 - 15;
      const a1 = a0 + 28;
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M ${point(a0, 60)} L ${point(a0, 100)} A 100 100 0 0 1 ${point(a1, 100)} L ${point(a1, 60)} A 60 60 0 0 0 ${point(a0, 60)} Z`);
      this.el.append(path);
      this.sectors.push(path);
      const t = document.createElementNS(NS, 'text');
      const [x, y] = point(pc * 30 - 1, 80).split(' ');
      t.setAttribute('x', String(x));
      t.setAttribute('y', String(Number(y) + 4));
      t.setAttribute('text-anchor', 'middle');
      t.textContent = NOTE_NAMES[pc] ?? '';
      this.el.append(t);
    }
    this.needle = document.createElementNS(NS, 'line');
    this.needle.setAttribute('x1', '0');
    this.needle.setAttribute('y1', '0');
    this.needle.setAttribute('x2', '0');
    this.needle.setAttribute('y2', '-55');
    this.el.append(this.needle);
    this.label = document.createElementNS(NS, 'text');
    this.label.setAttribute('class', 'centro');
    this.label.setAttribute('text-anchor', 'middle');
    this.label.setAttribute('y', '8');
    this.el.append(this.label);
    this.update(null, 0, new Set(Array.from({ length: 12 }, (_, i) => i)));
  }

  /** `active`: clase de altura viva (o null); `cents`: -50..50; `inScale`: clases de la escala. */
  update(active: number | null, cents: number, inScale: ReadonlySet<number>): void {
    this.sectors.forEach((s, pc) => {
      s.setAttribute('class', `${inScale.has(pc) ? 'en-escala' : 'fuera'}${pc === active ? ' activa' : ''}`);
    });
    // La aguja apunta al centro del sector vivo, desplazada por la desviacion.
    const angle = active === null ? 0 : active * 30 + (cents / 50) * 15;
    this.needle.setAttribute('transform', `rotate(${angle})`);
    this.needle.style.visibility = active === null ? 'hidden' : 'visible';
    this.label.textContent = active === null ? '' : `${cents >= 0 ? '+' : ''}${Math.round(cents)}c`;
  }
}
