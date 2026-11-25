export interface Example {
  slot: number;
  vec: number[];
}

export interface Classification {
  slot: number;
  /** Distancia estandarizada al vecino mas cercano, por dimension. */
  distance: number;
}

/** k-NN sobre rasgos estandarizados, con rechazo de golpes que no se parecen a ningun ejemplo. */
export class KnnClassifier {
  private examples: Example[] = [];
  private mean: number[] = [];
  private std: number[] = [];

  constructor(
    private readonly k = 3,
    private maxDistance = 2.5,
  ) {}

  setMaxDistance(d: number): void {
    this.maxDistance = d;
  }

  get size(): number {
    return this.examples.length;
  }

  setExamples(examples: Example[]): void {
    this.examples = examples.map((e) => ({ slot: e.slot, vec: [...e.vec] }));
    const n = this.examples.length;
    const dim = this.examples[0]?.vec.length ?? 0;
    this.mean = new Array<number>(dim).fill(0);
    this.std = new Array<number>(dim).fill(1);
    if (n === 0) return;
    for (let d = 0; d < dim; d++) {
      let m = 0;
      for (const e of this.examples) m += e.vec[d] ?? 0;
      m /= n;
      let v = 0;
      for (const e of this.examples) v += ((e.vec[d] ?? 0) - m) ** 2;
      this.mean[d] = m;
      // Suelo en la desviacion para que una dimension casi constante no domine la distancia.
      this.std[d] = Math.max(Math.sqrt(v / n), 1e-3 * (Math.abs(m) + 1), 0.05);
    }
  }

  classify(vec: ArrayLike<number>): Classification | null {
    if (this.examples.length === 0) return null;
    const dim = this.mean.length;
    const scored = this.examples
      .map((e) => {
        let s = 0;
        for (let d = 0; d < dim; d++) s += (((vec[d] ?? 0) - (e.vec[d] ?? 0)) / (this.std[d] ?? 1)) ** 2;
        return { slot: e.slot, dist: Math.sqrt(s / dim) };
      })
      .sort((a, b) => a.dist - b.dist);
    const nearest = scored[0];
    if (!nearest || nearest.dist > this.maxDistance) return null;
    const votes = new Map<number, { n: number; best: number }>();
    for (const s of scored.slice(0, this.k)) {
      const v = votes.get(s.slot) ?? { n: 0, best: Infinity };
      votes.set(s.slot, { n: v.n + 1, best: Math.min(v.best, s.dist) });
    }
    let win = nearest.slot;
    let top: { n: number; best: number } = { n: -1, best: Infinity };
    for (const [slot, v] of votes) {
      if (v.n > top.n || (v.n === top.n && v.best < top.best)) {
        top = v;
        win = slot;
      }
    }
    return { slot: win, distance: nearest.dist };
  }
}
