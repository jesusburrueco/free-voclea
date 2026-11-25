import { describe, expect, it } from 'vitest';
import { RingBuffer } from '../src/audio/ring-buffer';
import { measureLevel, toDb } from '../src/audio/level';

describe('RingBuffer', () => {
  it('devuelve las ultimas muestras en orden', () => {
    const rb = new RingBuffer(4);
    rb.write(Float32Array.from([1, 2, 3]));
    const out = new Float32Array(2);
    expect(rb.readLatest(out)).toBe(2);
    expect(Array.from(out)).toEqual([2, 3]);
  });

  it('da la vuelta al llegar al final', () => {
    const rb = new RingBuffer(4);
    rb.write(Float32Array.from([1, 2, 3]));
    rb.write(Float32Array.from([4, 5, 6]));
    const out = new Float32Array(4);
    expect(rb.readLatest(out)).toBe(4);
    expect(Array.from(out)).toEqual([3, 4, 5, 6]);
    expect(rb.length).toBe(4);
  });

  it('con escritura mayor que la capacidad conserva el final', () => {
    const rb = new RingBuffer(3);
    rb.write(Float32Array.from([1, 2, 3, 4, 5]));
    const out = new Float32Array(3);
    rb.readLatest(out);
    expect(Array.from(out)).toEqual([3, 4, 5]);
  });

  it('lee solo lo disponible', () => {
    const rb = new RingBuffer(8);
    rb.write(Float32Array.from([7]));
    expect(rb.readLatest(new Float32Array(5))).toBe(1);
  });

  it('rechaza capacidad invalida', () => {
    expect(() => new RingBuffer(0)).toThrow(RangeError);
  });
});

describe('nivel', () => {
  it('un seno de amplitud 0.5 tiene rms ~0.354 y pico 0.5', () => {
    const s = new Float32Array(4800).map((_, i) => 0.5 * Math.sin((2 * Math.PI * 100 * i) / 48000));
    const { rms, peak } = measureLevel(s);
    expect(rms).toBeCloseTo(0.5 / Math.SQRT2, 3);
    expect(peak).toBeCloseTo(0.5, 3);
  });

  it('dB: 1 es 0 dBFS y el silencio queda en -100', () => {
    expect(toDb(1)).toBeCloseTo(0);
    expect(toDb(0)).toBe(-100);
  });
});
