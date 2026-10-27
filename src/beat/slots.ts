import type { Example } from './knn';
import { FEATURE_DIM } from './features';

export const EXAMPLES_PER_TRAINING = 5;
export const MAX_EXAMPLES_PER_SLOT = 20;
export const MAX_NAME_LENGTH = 24;

export interface Slot {
  name: string;
  /** Nota MIDI que se envia al disparar. */
  note: number;
  /** Id de voz del kit interno. */
  voice: string;
  examples: number[][];
}

export interface TriggerSettings {
  enabled: boolean;
  /** 0..1, mayor = mas sensible. */
  sensitivity: number;
  /** Canal MIDI 1..16 (10 = percusion en General MIDI). */
  channel: number;
}

export const defaultSettings: TriggerSettings = { enabled: true, sensitivity: 0.5, channel: 10 };

export function defaultSlots(): Slot[] {
  return [
    { name: 'Bombo', note: 36, voice: 'kick', examples: [] },
    { name: 'Caja', note: 38, voice: 'snare', examples: [] },
    { name: 'Charles', note: 42, voice: 'hat', examples: [] },
    { name: 'Tom', note: 45, voice: 'tom', examples: [] },
  ];
}

const clampInt = (v: unknown, lo: number, hi: number, fallback: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(hi, Math.max(lo, n));
};

export function clampNote(v: unknown, fallback = 36): number {
  return clampInt(v, 0, 127, fallback);
}
export function clampChannel(v: unknown): number {
  return clampInt(v, 1, 16, defaultSettings.channel);
}

/** Valida datos leidos del almacenamiento; lo invalido se sustituye por los valores por defecto. */
export function sanitizeSlots(raw: unknown, voices: readonly string[]): Slot[] {
  const base = defaultSlots();
  if (!Array.isArray(raw)) return base;
  return base.map((def, i) => {
    const r = (raw[i] ?? {}) as Record<string, unknown>;
    const name = typeof r['name'] === 'string' && r['name'].trim() ? r['name'].trim().slice(0, MAX_NAME_LENGTH) : def.name;
    const voice = typeof r['voice'] === 'string' && voices.includes(r['voice']) ? r['voice'] : def.voice;
    const examples = Array.isArray(r['examples'])
      ? r['examples']
          .filter((v): v is number[] => Array.isArray(v) && v.length === FEATURE_DIM && v.every((x) => typeof x === 'number' && Number.isFinite(x)))
          .slice(-MAX_EXAMPLES_PER_SLOT)
      : [];
    return { name, note: clampNote(r['note'], def.note), voice, examples };
  });
}

export function sanitizeSettings(raw: unknown): TriggerSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  const s = typeof r['sensitivity'] === 'number' && Number.isFinite(r['sensitivity']) ? Math.min(1, Math.max(0, r['sensitivity'])) : defaultSettings.sensitivity;
  return { enabled: r['enabled'] !== false, sensitivity: s, channel: clampChannel(r['channel']) };
}

export function toExamples(slots: readonly Slot[]): Example[] {
  return slots.flatMap((s, slot) => s.examples.map((vec) => ({ slot, vec })));
}

/** Anade un ejemplo al slot, descartando el mas antiguo si se supera el maximo. */
export function addExample(slots: Slot[], slot: number, vec: number[]): void {
  const s = slots[slot];
  if (!s || vec.length !== FEATURE_DIM) return;
  s.examples.push(vec);
  if (s.examples.length > MAX_EXAMPLES_PER_SLOT) s.examples.shift();
}
