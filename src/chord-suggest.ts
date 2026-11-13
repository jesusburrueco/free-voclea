import { chordScale, scaleStep } from './audio/chords';
import { NOTE_NAMES } from './notes';

/** Nota de una melodia: MIDI y duracion (cualquier unidad, solo importa la proporcion). */
export interface MelodyNote {
  note: number;
  dur: number;
}

export type ChordQuality = 'maj' | 'min' | 'dim' | 'aug';

export interface ChordSuggestion {
  /** Grado (0..6) en la escala de acordes. */
  degree: number;
  /** Clase de altura de la raiz (0..11). */
  rootPc: number;
  quality: ChordQuality;
  /** Nombre corto: "C", "Am", "B°", "C+". */
  name: string;
  /** Numeral romano del grado: "I", "vi", "vii°". */
  roman: string;
  /** 0..1: fraccion de la duracion del tramo cubierta por notas del acorde. */
  fit: number;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'] as const;
const SUFFIX: Record<ChordQuality, string> = { maj: '', min: 'm', dim: '°', aug: '+' };
/** Preferencia leve por los grados principales (I, IV, V, vi) para desempatar. */
const DEGREE_BONUS = [0.03, 0, 0, 0.02, 0.025, 0.01, 0];

const pcOf = (n: number): number => ((n % 12) + 12) % 12;

function qualityOf(third: number, fifth: number): ChordQuality {
  if (third === 4) return fifth === 8 ? 'aug' : 'maj';
  return fifth === 6 ? 'dim' : 'min';
}

/** Triadas diatonicas de la escala de acordes (7 grados). */
export function diatonicTriads(tonic: number, scaleId: string): { degree: number; rootPc: number; pcs: number[]; quality: ChordQuality }[] {
  const { intervals } = chordScale(scaleId);
  return intervals.map((iv, degree) => {
    const root = 60 + pcOf(tonic) + iv;
    const notes = [0, 2, 4].map((s) => scaleStep(root, pcOf(tonic), intervals, s));
    const [r = root, t = root, f = root] = notes;
    return { degree, rootPc: pcOf(root), pcs: notes.map(pcOf), quality: qualityOf(t - r, f - r) };
  });
}

function describe(degree: number, rootPc: number, quality: ChordQuality, fit: number): ChordSuggestion {
  const base = ROMAN[degree] ?? '?';
  const roman = (quality === 'min' || quality === 'dim' ? base.toLowerCase() : base) + (quality === 'dim' ? '°' : quality === 'aug' ? '+' : '');
  return { degree, rootPc, quality, name: (NOTE_NAMES[rootPc] ?? '?') + SUFFIX[quality], roman, fit };
}

/** Acorde diatonico que mejor encaja con un tramo de melodia, o null si el tramo no tiene duracion. */
export function chordForSegment(segment: readonly MelodyNote[], tonic: number, scaleId: string): ChordSuggestion | null {
  const total = segment.reduce((a, n) => a + Math.max(0, n.dur), 0);
  if (total <= 0) return null;
  const first = segment.find((n) => n.dur > 0);
  let best: ChordSuggestion | null = null;
  let bestScore = -Infinity;
  for (const t of diatonicTriads(tonic, scaleId)) {
    let covered = 0;
    let rootWeight = 0;
    for (const n of segment) {
      const d = Math.max(0, n.dur);
      const pc = pcOf(n.note);
      if (t.pcs.includes(pc)) covered += d;
      if (pc === t.rootPc) rootWeight += d;
    }
    const fit = covered / total;
    // Cobertura, luego raiz presente, nota inicial dentro del acorde y grados principales.
    const startsIn = first !== undefined && t.pcs.includes(pcOf(first.note)) ? 0.05 : 0;
    const score = fit + 0.1 * (rootWeight / total) + startsIn + (DEGREE_BONUS[t.degree] ?? 0);
    if (score > bestScore) {
      bestScore = score;
      best = describe(t.degree, t.rootPc, t.quality, fit);
    }
  }
  return best;
}

/** Parte la melodia en tramos consecutivos de duracion `segmentDur`; una nota que cruza el limite se reparte entre tramos. */
export function splitByDuration(notes: readonly MelodyNote[], segmentDur: number): MelodyNote[][] {
  if (!(segmentDur > 0)) throw new Error('segmentDur debe ser positivo');
  const out: MelodyNote[][] = [];
  let current: MelodyNote[] = [];
  let left = segmentDur;
  const eps = 1e-9;
  for (const n of notes) {
    let rest = Math.max(0, n.dur);
    while (rest > eps) {
      const take = Math.min(rest, left);
      current.push({ note: n.note, dur: take });
      rest -= take;
      left -= take;
      if (left <= eps) {
        out.push(current);
        current = [];
        left = segmentDur;
      }
    }
  }
  if (current.length > 0) out.push(current);
  return out;
}

/** Un acorde sugerido por tramo de `segmentDur`. Los tramos sin duracion repiten el acorde anterior. */
export function suggestChords(notes: readonly MelodyNote[], tonic: number, scaleId: string, segmentDur: number): ChordSuggestion[] {
  const out: ChordSuggestion[] = [];
  for (const seg of splitByDuration(notes, segmentDur)) {
    const c = chordForSegment(seg, tonic, scaleId) ?? out[out.length - 1];
    if (c) out.push(c);
  }
  return out;
}
