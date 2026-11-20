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
    sector(w, 6).dispatchEvent(new Event('pointerdown', { cancelable: true }));
    sector(w, 0).dispatchEvent(new Event('pointerdown', { cancelable: true }));
    expect(taps).toEqual([6, 0]);
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
    sector(wheel, 3).dispatchEvent(new Event('pointerdown', { cancelable: true }));
    expect([...kb.muted]).toEqual([3]);
    expect(kb.el.querySelector('[data-pc="3"]')?.getAttribute('aria-pressed')).toBe('true');
    expect([...wheel.mutedSet()]).toEqual([3]);
    kb.toggle(3);
    expect(wheel.mutedSet().size).toBe(0);
    expect(sector(wheel, 3).getAttribute('class')).not.toContain('silenciada');
  });
});
