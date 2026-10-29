import { BEND_MODES, BEND_TARGETS, clampBendRange, type BendMode, type BendTarget } from './audio/bend';
import { SCALES } from './scales';

export const SETTINGS_KEY = 'ajustes';

export interface AppSettings {
  tonic: number;
  scaleId: string;
  /** Clases de altura silenciadas. */
  muted: number[];
  bendTarget: BendTarget;
  bendMode: BendMode;
  bendRange: number;
  sound: boolean;
  /** Umbral de nota calibrado en dBFS (null = el de fabrica). */
  thresholdDb: number | null;
  /** Ganancia de entrada en dB (-12..24). */
  inputGainDb: number;
  /** Pegajosidad de la nota (0..1 semitonos extra para cambiar de nota). */
  stickiness: number;
  /** Escala de la interfaz en % (100..200). */
  uiScale: number;
  /** Tema: automatico (segun el sistema), oscuro o claro. */
  tema: 'auto' | 'oscuro' | 'claro';
}

export const defaultSettings: AppSettings = {
  tonic: 0,
  scaleId: 'chromatic',
  muted: [],
  bendTarget: 'ninguno',
  bendMode: 'fiel',
  bendRange: 2,
  sound: true,
  thresholdDb: null,
  inputGainDb: 0,
  stickiness: 0.25,
  uiScale: 100,
  tema: 'auto',
};

export function sanitizeSettings(raw: unknown): AppSettings {
  const r = (raw ?? {}) as Record<string, unknown>;
  const int = (v: unknown, lo: number, hi: number, d: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d;
  const d = defaultSettings;
  const th = r['thresholdDb'];
  return {
    tonic: int(r['tonic'], 0, 11, d.tonic),
    scaleId: SCALES.some((s) => s.id === r['scaleId']) ? (r['scaleId'] as string) : d.scaleId,
    muted: Array.isArray(r['muted']) ? [...new Set(r['muted'].filter((x): x is number => Number.isInteger(x) && x >= 0 && x <= 11))] : [],
    bendTarget: BEND_TARGETS.some((t) => t.id === r['bendTarget']) ? (r['bendTarget'] as BendTarget) : d.bendTarget,
    bendMode: BEND_MODES.some((m) => m.id === r['bendMode']) ? (r['bendMode'] as BendMode) : d.bendMode,
    bendRange: clampBendRange(typeof r['bendRange'] === 'number' ? r['bendRange'] : d.bendRange),
    sound: r['sound'] !== false,
    inputGainDb: int(r['inputGainDb'], -12, 24, d.inputGainDb),
    stickiness: typeof r['stickiness'] === 'number' && Number.isFinite(r['stickiness']) ? Math.min(1, Math.max(0, r['stickiness'])) : d.stickiness,
    uiScale: Math.round(int(r['uiScale'], 100, 200, d.uiScale) / 10) * 10,
    tema: r['tema'] === 'oscuro' || r['tema'] === 'claro' ? r['tema'] : 'auto',
    thresholdDb: typeof th === 'number' && Number.isFinite(th) ? Math.min(-20, Math.max(-70, th)) : null,
  };
}

export function loadSettings(): AppSettings {
  try {
    return sanitizeSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null'));
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(s: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* sin almacenamiento: no se recuerda */
  }
}
