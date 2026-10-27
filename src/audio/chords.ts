import { SCALES, getScale, type Scale } from '../scales';

/** 'auto' = triada. */
export type ChordVariant = 'auto' | 'seventh' | 'sus2' | 'sus4';
export type Voicing = 'close' | 'open';

export const CHORD_VARIANTS: readonly { id: ChordVariant; name: string }[] = [
  { id: 'auto', name: 'Triada' },
  { id: 'seventh', name: 'Septima' },
  { id: 'sus2', name: 'Sus2' },
  { id: 'sus4', name: 'Sus4' },
];

export interface ChordOptions {
  /** Variante por grado (0..6) de la escala de acordes. */
  variants: readonly ChordVariant[];
  /** 0 = estado fundamental, 1 y 2 = inversiones. */
  inversion: 0 | 1 | 2;
  voicing: Voicing;
  /** 'off' sin bajo, 'follow' una octava bajo la raiz, 'fixed' en la octava 2 (36..47). */
  bass: 'off' | 'follow' | 'fixed';
}

export const defaultChordOptions: ChordOptions = {
  variants: ['auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
  inversion: 0,
  voicing: 'close',
  bass: 'off',
};

/** Escala heptatonica usada para armar acordes: la elegida si tiene 7 notas, o Mayor en otro caso. */
export function chordScale(scaleId: string): Scale {
  const s = getScale(scaleId);
  return s.intervals.length === 7 ? s : getScale('major');
}

/** Nota que queda `steps` grados escalares por encima (o debajo) de `root`, que debe estar en la escala. */
export function scaleStep(root: number, tonic: number, intervals: readonly number[], steps: number): number {
  const len = intervals.length;
  const pc = (((root - tonic) % 12) + 12) % 12;
  const idx = intervals.indexOf(pc);
  if (idx < 0) throw new Error('La nota no pertenece a la escala');
  const target = idx + steps;
  const oct = Math.floor(target / len);
  const j = ((target % len) + len) % len;
  return root - (intervals[idx] ?? 0) + (intervals[j] ?? 0) + 12 * oct;
}

/** Grado (0..6) de una nota en la escala de acordes, tras llevarla a la nota de la escala mas cercana (en empate, la inferior). */
export function degreeOf(note: number, tonic: number, intervals: readonly number[]): { root: number; degree: number } {
  let best = note;
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let n = note - 6; n <= note + 6; n++) {
    const idx = intervals.indexOf((((n - tonic) % 12) + 12) % 12);
    if (idx < 0) continue;
    const d = Math.abs(n - note);
    if (d < bestDist) {
      bestDist = d;
      best = n;
      bestIdx = idx;
    }
  }
  return { root: best, degree: bestIdx };
}

const CHORD_STEPS: Record<ChordVariant, number[]> = { auto: [0, 2, 4], seventh: [0, 2, 4, 6], sus2: [0, 1, 4], sus4: [0, 3, 4] };

/** Notas MIDI (ascendentes) del acorde diatonico sobre `note`, con variante, inversion, apertura y bajo. */
export function buildChord(note: number, tonic: number, scaleId: string, opts: ChordOptions = defaultChordOptions): number[] {
  const { intervals } = chordScale(scaleId);
  const { root, degree } = degreeOf(note, tonic, intervals);
  const variant = opts.variants[degree] ?? 'auto';
  const steps = CHORD_STEPS[variant];
  let notes = steps.map((s) => scaleStep(root, tonic, intervals, s)).sort((a, b) => a - b);
  for (let i = 0; i < Math.min(opts.inversion, notes.length - 1); i++) {
    const low = notes.shift();
    if (low !== undefined) notes.push(low + 12);
  }
  if (opts.voicing === 'open' && notes.length >= 3) {
    const mid = notes.splice(1, 1)[0];
    if (mid !== undefined) notes.push(mid + 12);
  }
  if (opts.bass === 'follow') notes.unshift(root - 12);
  else if (opts.bass === 'fixed') notes.unshift(36 + (((root % 12) + 12) % 12));
  notes = [...new Set(notes)].sort((a, b) => a - b);
  return notes;
}

export const CHORD_SCALE_IDS = SCALES.map((s) => s.id);
