export interface Scale {
  id: string;
  name: string;
  /** Semitonos desde la tonica, ascendentes, dentro de una octava. */
  intervals: readonly number[];
}

export const SCALES: readonly Scale[] = [
  { id: 'chromatic', name: 'Cromatica', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { id: 'major', name: 'Mayor', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'minor', name: 'Menor natural', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'harmonic-minor', name: 'Menor armonica', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'major-pentatonic', name: 'Pentatonica mayor', intervals: [0, 2, 4, 7, 9] },
  { id: 'minor-pentatonic', name: 'Pentatonica menor', intervals: [0, 3, 5, 7, 10] },
  { id: 'blues', name: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
  { id: 'locrian', name: 'Locria', intervals: [0, 1, 3, 5, 6, 8, 10] },
  { id: 'dorian', name: 'Dorica', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian', name: 'Frigia', intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'mixolydian', name: 'Mixolidia', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'lydian', name: 'Lidia', intervals: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'hungarian-minor', name: 'Menor hungara', intervals: [0, 2, 3, 6, 7, 8, 11] },
  { id: 'whole-tone', name: 'Tonos enteros', intervals: [0, 2, 4, 6, 8, 10] },
  { id: 'aeolian-dominant', name: 'Eolia dominante', intervals: [0, 2, 4, 5, 7, 8, 10] },
];

export function getScale(id: string): Scale {
  const s = SCALES.find((x) => x.id === id);
  if (!s) throw new Error(`Escala desconocida: ${id}`);
  return s;
}

/**
 * Nota de la escala mas cercana a una nota MIDI continua. En empates gana la
 * nota inferior. `tonic` es la clase de altura 0..11 (0 = C).
 */
export function quantizeToScale(midi: number, tonic: number, scale: Scale): number {
  const base = Math.floor(midi);
  let best = Number.NaN;
  let bestDist = Infinity;
  // Candidatas ordenadas de menor a mayor: el `<` estricto deja ganar a la inferior.
  for (let n = base - 12; n <= base + 13; n++) {
    const pc = (((n - tonic) % 12) + 12) % 12;
    if (!scale.intervals.includes(pc)) continue;
    const d = Math.abs(n - midi);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  return best;
}
