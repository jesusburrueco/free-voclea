/** Buffer circular de muestras mono. Sin asignaciones tras la construccion (apto para el worklet). */
export class RingBuffer {
  private readonly data: Float32Array;
  private writePos = 0;
  private filled = 0;

  constructor(readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) throw new RangeError('capacity debe ser entero positivo');
    this.data = new Float32Array(capacity);
  }

  /** Muestras validas almacenadas (como maximo `capacity`). */
  get length(): number {
    return this.filled;
  }

  write(samples: Float32Array): void {
    const src = samples.length > this.capacity ? samples.subarray(samples.length - this.capacity) : samples;
    const first = Math.min(src.length, this.capacity - this.writePos);
    this.data.set(src.subarray(0, first), this.writePos);
    this.data.set(src.subarray(first), 0);
    this.writePos = (this.writePos + src.length) % this.capacity;
    this.filled = Math.min(this.capacity, this.filled + src.length);
  }

  /** Copia las ultimas `out.length` muestras (la mas reciente al final). Devuelve cuantas copio. */
  readLatest(out: Float32Array): number {
    const n = Math.min(out.length, this.filled);
    const start = (this.writePos - n + this.capacity) % this.capacity;
    const first = Math.min(n, this.capacity - start);
    out.set(this.data.subarray(start, start + first), 0);
    out.set(this.data.subarray(0, n - first), first);
    return n;
  }
}
