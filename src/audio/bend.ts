export const BEND_CENTER = 8192;
export const BEND_MAX = 16383;
export const BEND_RANGE_MIN = 1;
export const BEND_RANGE_MAX = 48;
export const BEND_RANGE_DEFAULT = 2;

/** Limita el rango de bend a enteros entre 1 y 48 semitonos; un valor no valido da el defecto. */
export function clampBendRange(range: number): number {
  if (!Number.isFinite(range)) return BEND_RANGE_DEFAULT;
  return Math.min(BEND_RANGE_MAX, Math.max(BEND_RANGE_MIN, Math.round(range)));
}

/** Desviacion en semitonos de una frecuencia respecto a una nota MIDI entera, limitada a +-range. */
export function bendSemitones(midi: number, note: number, range: number): number {
  const r = clampBendRange(range);
  return Math.min(r, Math.max(-r, midi - note));
}

/** Valor de 14 bits (0..16383, centro 8192) para una desviacion en semitonos dentro de +-range. */
export function bendValue(semitones: number, range: number): number {
  const r = clampBendRange(range);
  const v = BEND_CENTER + Math.round((semitones / r) * BEND_CENTER);
  return Math.min(BEND_MAX, Math.max(0, v));
}

/** Mensaje 0xE0 de pitch bend (canal 1..16): LSB y despues MSB. */
export function bendMessage(value: number, channel = 1): number[] {
  const ch = Math.min(16, Math.max(1, Math.round(channel))) - 1;
  const v = Math.min(BEND_MAX, Math.max(0, Math.round(value)));
  return [0xe0 | ch, v & 0x7f, v >> 7];
}
