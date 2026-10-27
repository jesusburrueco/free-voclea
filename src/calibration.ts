import { freqToMidi } from './notes';

export interface CalibrationFrame {
  db: number;
  freq: number;
  clarity: number;
}

export const MIN_VOICED_FRAMES = 10;

/** Percentil p (0..1) de una lista; 0 si esta vacia. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))] ?? 0;
}

/** Umbral de nota: 10 dB sobre el ruido de fondo (percentil 90), entre -60 y -25 dBFS. */
export function thresholdFromNoise(noiseDb: number[]): number {
  const floor = noiseDb.length ? percentile(noiseDb, 0.9) : -50;
  return Math.min(-25, Math.max(-60, Math.round(floor + 10)));
}

/** Nota MIDI mediana de los fotogramas con tono; null si hay muy pocos. */
export function medianNote(frames: readonly CalibrationFrame[], minClarity = 0.8): number | null {
  const notes = frames.filter((f) => f.freq > 0 && f.clarity >= minClarity).map((f) => freqToMidi(f.freq));
  return notes.length < MIN_VOICED_FRAMES ? null : Math.round(percentile(notes, 0.5));
}

export type CalibrationStep = 'silencio' | 'grave' | 'agudo';
export const CALIBRATION_STEPS: readonly { id: CalibrationStep; text: string }[] = [
  { id: 'silencio', text: 'Silencio: no hagas ruido durante unos segundos.' },
  { id: 'grave', text: 'Canta o tararea tu nota mas grave y sostenla.' },
  { id: 'agudo', text: 'Canta o silba tu nota mas aguda y sostenla.' },
];

export interface CalibrationResult {
  thresholdDb: number;
  /** Nota minima y maxima permitidas (con un margen de 2 semitonos), o null si no se pudo medir. */
  range: { low: number; high: number } | null;
}

export function finishCalibration(frames: Record<CalibrationStep, CalibrationFrame[]>): CalibrationResult {
  const thresholdDb = thresholdFromNoise(frames.silencio.map((f) => f.db));
  const low = medianNote(frames.grave);
  const high = medianNote(frames.agudo);
  if (low === null || high === null || high <= low) return { thresholdDb, range: null };
  return { thresholdDb, range: { low: Math.max(0, low - 2), high: Math.min(127, high + 2) } };
}
