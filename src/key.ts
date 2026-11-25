import { getScale } from './scales';

export interface KeySuggestion {
  tonic: number;
  scaleId: 'major' | 'minor';
  /** 0..1: fraccion del peso de notas que cae dentro de la escala. */
  fit: number;
}

/** Sugiere tonalidad (mayor o menor natural) a partir de notas cantadas. `weights[pc]` es el peso de cada clase de altura. */
export function suggestKey(weights: readonly number[]): KeySuggestion | null {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  let best: KeySuggestion | null = null;
  let bestScore = -Infinity;
  for (const scaleId of ['major', 'minor'] as const) {
    const scale = getScale(scaleId);
    for (let tonic = 0; tonic < 12; tonic++) {
      let inside = 0;
      for (const i of scale.intervals) inside += weights[(tonic + i) % 12] ?? 0;
      // A igualdad de ajuste gana la tonica con mas peso (la nota mas cantada suele ser la tonica).
      const score = inside / total + 0.01 * ((weights[tonic] ?? 0) / total);
      if (score > bestScore) {
        bestScore = score;
        best = { tonic, scaleId, fit: inside / total };
      }
    }
  }
  return best;
}
