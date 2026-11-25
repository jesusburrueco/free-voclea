import { toDb } from '../audio/level';

export interface OnsetOptions {
  /** Subida minima sobre la envolvente lenta para disparar (dB). Menor = mas sensible. */
  riseDb: number;
  /** Nivel minimo absoluto (dBFS). */
  floorDb: number;
  /** Tiempo muerto tras un onset (ms). */
  refractoryMs: number;
  /** Constante de tiempo de la envolvente lenta (ms). */
  slowMs: number;
}

export const defaultOnsetOptions: OnsetOptions = { riseDb: 9, floorDb: -45, refractoryMs: 90, slowMs: 80 };

/** Rango de sensibilidad (0..1) a subida en dB: sensibilidad alta = subida pequena. */
export function sensitivityToRise(sensitivity: number): number {
  const s = Math.min(1, Math.max(0, Number.isFinite(sensitivity) ? sensitivity : 0.5));
  return 18 - s * 15;
}

/** Detector de onsets por subida brusca de energia por bloque frente a una envolvente lenta. */
export class OnsetDetector {
  private opts: OnsetOptions;
  private slowDb: number | null = null;
  private deadMs = 0;

  constructor(
    private readonly rate: number,
    opts: Partial<OnsetOptions> = {},
  ) {
    this.opts = { ...defaultOnsetOptions, ...opts };
  }

  setOptions(opts: Partial<OnsetOptions>): void {
    this.opts = { ...this.opts, ...opts };
  }

  /** Procesa un bloque de audio; devuelve true si empieza un onset en el. */
  process(block: Float32Array): boolean {
    if (block.length === 0) return false;
    let sum = 0;
    for (let i = 0; i < block.length; i++) sum += (block[i] ?? 0) ** 2;
    const db = toDb(Math.sqrt(sum / block.length));
    const dtMs = (block.length / this.rate) * 1000;
    const o = this.opts;
    this.slowDb ??= db;
    const rise = db - this.slowDb;
    this.deadMs = Math.max(0, this.deadMs - dtMs);
    let hit = false;
    if (this.deadMs === 0 && rise >= o.riseDb && db >= o.floorDb) {
      hit = true;
      this.deadMs = o.refractoryMs;
    }
    // La envolvente lenta sube despacio (no persigue el golpe) y baja algo mas rapido.
    const k = dtMs / o.slowMs;
    this.slowDb += (db - this.slowDb) * Math.min(1, db > this.slowDb ? k : k * 2);
    return hit;
  }
}

/** Velocidad MIDI 1..127 a partir del pico en dBFS: lineal en dB entre minDb y maxDb. */
export function dbToVelocity(db: number, minDb = -40, maxDb = -6): number {
  const t = (db - minDb) / (maxDb - minDb);
  return Math.min(127, Math.max(1, Math.round(1 + t * 126)));
}
