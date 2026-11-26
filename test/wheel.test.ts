// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { PitchWheel } from '../src/ui/wheel';
import { MuteKeyboard } from '../src/ui/keyboard';

const sector = (w: PitchWheel, pc: number): SVGPathElement => {
  const el = w.el.querySelector<SVGPathElement>(`path[data-pc="${pc}"]`);
  if (!el) throw new Error(`sin sector ${pc}`);
  return el;
};

describe('PitchWheel tactil', () => {
  it('pulsar un sector llama a onTap con su clase de altura', () => {
    const taps: number[] = [];
    const w = new PitchWheel((pc) => taps.push(pc));
    sector(w, 6).dispatchEvent(new Event('click'));
    sector(w, 0).dispatchEvent(new Event('click'));
    expect(taps).toEqual([6, 0]);
  });

  it('un pointerdown sin click (arrastre para desplazar) no silencia', () => {
    const taps: number[] = [];
    const w = new PitchWheel((pc) => taps.push(pc));
    sector(w, 2).dispatchEvent(new Event('pointerdown', { cancelable: true }));
    expect(taps).toEqual([]);
  });

  it('marca los silenciados y conserva la marca al actualizar la nota viva', () => {
    const w = new PitchWheel();
    w.setMuted(new Set([1, 6]));
    w.update(4, 10, new Set([0, 2, 4, 5, 7, 9, 11]));
    expect(sector(w, 6).getAttribute('class')).toBe('fuera silenciada');
    expect(sector(w, 4).getAttribute('class')).toBe('en-escala activa');
    w.setMuted(new Set());
    expect(sector(w, 6).getAttribute('class')).toBe('fuera');
  });

  it('queda sincronizada con el teclado en ambos sentidos', () => {
    let wheel: PitchWheel | null = null;
    const kb = new MuteKeyboard((muted) => wheel?.setMuted(muted));
    wheel = new PitchWheel((pc) => kb.toggle(pc));
    sector(wheel, 3).dispatchEvent(new Event('click'));
    expect([...kb.muted]).toEqual([3]);
    expect(kb.el.querySelector('[data-pc="3"]')?.getAttribute('aria-pressed')).toBe('true');
    expect([...wheel.mutedSet()]).toEqual([3]);
    kb.toggle(3);
    expect(wheel.mutedSet().size).toBe(0);
    expect(sector(wheel, 3).getAttribute('class')).not.toContain('silenciada');
  });
});

describe('MuteKeyboard y escala', () => {
  const key = (k: MuteKeyboard, pc: number): HTMLButtonElement => {
    const el = k.el.querySelector<HTMLButtonElement>(`button[data-pc="${pc}"]`);
    if (!el) throw new Error(`sin tecla ${pc}`);
    return el;
  };

  it('por defecto ninguna tecla esta fuera de escala', () => {
    const k = new MuteKeyboard(() => {});
    for (let pc = 0; pc < 12; pc++) expect(key(k, pc).classList.contains('fuera')).toBe(false);
    expect(key(k, 6).getAttribute('aria-label')).toBe('F# permitida');
  });

  it('marca las teclas fuera de Do mayor y las desmarca al volver a cromatica', () => {
    const k = new MuteKeyboard(() => {});
    k.setScale(new Set([0, 2, 4, 5, 7, 9, 11]));
    const fuera = Array.from({ length: 12 }, (_, pc) => pc).filter((pc) => key(k, pc).classList.contains('fuera'));
    expect(fuera).toEqual([1, 3, 6, 8, 10]);
    expect(key(k, 6).getAttribute('aria-label')).toBe('F# permitida, fuera de escala');
    expect(key(k, 7).getAttribute('aria-label')).toBe('G permitida');
    k.setScale(new Set(Array.from({ length: 12 }, (_, i) => i)));
    expect(k.el.querySelectorAll('button.fuera').length).toBe(0);
  });

  it('la marca de escala no cambia el silenciado y se combina con el', () => {
    const changes: number[][] = [];
    const k = new MuteKeyboard((m) => changes.push([...m]));
    k.setScale(new Set([0, 2, 4, 5, 7, 9, 11]));
    expect(changes).toEqual([]);
    expect(k.muted.size).toBe(0);
    k.toggle(6);
    expect(key(k, 6).getAttribute('aria-label')).toBe('F# silenciada, fuera de escala');
    expect(key(k, 6).classList.contains('fuera')).toBe(true);
  });

  it('marca las notas extra del acorde sin la nota cantada y las quita al soltar', () => {
    const changes: number[][] = [];
    const k = new MuteKeyboard((m) => changes.push([...m]));
    const marcadas = (): number[] => Array.from({ length: 12 }, (_, pc) => pc).filter((pc) => key(k, pc).classList.contains('acorde'));
    k.setChord([48, 60, 64, 67], 0);
    expect(marcadas()).toEqual([4, 7]);
    expect(key(k, 4).getAttribute('aria-label')).toBe('E permitida, nota del acorde');
    expect(key(k, 0).getAttribute('aria-label')).toBe('C permitida');
    k.setChord([62, 67, 71], 2);
    expect(marcadas()).toEqual([7, 11]);
    k.setChord(null);
    expect(marcadas()).toEqual([]);
    expect(changes).toEqual([]);
  });

  it('sin nota cantada marca todas las notas del acorde y se combina con escala y silenciado', () => {
    const k = new MuteKeyboard(() => {});
    k.setScale(new Set([0, 2, 4, 5, 7, 9, 11]));
    k.toggle(10);
    k.setChord([55, 58, 62]);
    expect(key(k, 10).getAttribute('aria-label')).toBe('A# silenciada, fuera de escala, nota del acorde');
    expect(key(k, 7).classList.contains('acorde')).toBe(true);
    expect(k.muted.has(10)).toBe(true);
  });
});
