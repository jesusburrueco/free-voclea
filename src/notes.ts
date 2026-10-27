const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Nota MIDI continua (con decimales) para una frecuencia en Hz. A4 = 440 Hz = 69. */
export function freqToMidi(freq: number, a4 = 440): number {
  return 69 + 12 * Math.log2(freq / a4);
}

/** Frecuencia en Hz de una nota MIDI. */
export function midiToFreq(midi: number, a4 = 440): number {
  return a4 * 2 ** ((midi - 69) / 12);
}

/** Nombre de una nota MIDI entera, con octava (60 = C4). */
export function midiToName(midi: number): string {
  const n = Math.round(midi);
  const name = NOTE_NAMES[((n % 12) + 12) % 12];
  return `${name}${Math.floor(n / 12) - 1}`;
}
