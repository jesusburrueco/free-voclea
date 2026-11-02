export interface CcRoute {
  on: boolean;
  controller: number;
  channel: number;
}

export interface CcSettings {
  /** Volumen de la voz (envolvente). */
  envelope: CcRoute;
  /** Brillo del timbre (centroide espectral: vocales cerradas a abiertas). */
  timbre: CcRoute;
}

export const defaultCcSettings: CcSettings = {
  envelope: { on: false, controller: 11, channel: 1 },
  timbre: { on: false, controller: 74, channel: 1 },
};

export interface CcMessage {
  controller: number;
  value: number;
  channel: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(v) ? v : lo)));

export function sanitizeCcSettings(raw: Partial<CcSettings> | null | undefined): CcSettings {
  const route = (r: Partial<CcRoute> | undefined, d: CcRoute): CcRoute => ({
    on: r?.on === true,
    controller: clamp(r?.controller ?? d.controller, 0, 127),
    channel: clamp(r?.channel ?? d.channel, 1, 16),
  });
  return { envelope: route(raw?.envelope, defaultCcSettings.envelope), timbre: route(raw?.timbre, defaultCcSettings.timbre) };
}

/** Nivel en dBFS a 0..127: -50 dB = 0, -10 dB = 127. */
export function envelopeToCc(db: number): number {
  return clamp(((db + 50) / 40) * 127, 0, 127);
}

/** Centroide en Hz a 0..127, en escala logaritmica entre 300 y 4000 Hz. */
export function timbreToCc(centroidHz: number): number {
  if (!(centroidHz > 0)) return 0;
  return clamp((Math.log(centroidHz / 300) / Math.log(4000 / 300)) * 127, 0, 127);
}

/** Convierte nivel y timbre en mensajes CC suavizados y sin repeticiones. */
export class CcMapper {
  private settings: CcSettings = defaultCcSettings;
  private smooth = { envelope: 0, timbre: 0 };
  private last: { envelope: number; timbre: number } = { envelope: -1, timbre: -1 };

  constructor(private readonly alpha = 0.4) {}

  setConfig(s: CcSettings): void {
    this.settings = s;
    this.last = { envelope: -1, timbre: -1 };
  }

  /** Un paso por trama. Cuando no hay voz se manda un 0 una sola vez. */
  update(frame: { db: number; centroidHz: number; voiced: boolean }): CcMessage[] {
    const out: CcMessage[] = [];
    const step = (key: 'envelope' | 'timbre', target: number): void => {
      const route = this.settings[key];
      if (!route.on) return;
      this.smooth[key] += (target - this.smooth[key]) * this.alpha;
      const v = frame.voiced ? clamp(this.smooth[key], 0, 127) : 0;
      if (!frame.voiced) this.smooth[key] = 0;
      if (v === this.last[key]) return;
      this.last[key] = v;
      out.push({ controller: route.controller, value: v, channel: route.channel });
    };
    step('envelope', envelopeToCc(frame.db));
    step('timbre', timbreToCc(frame.centroidHz));
    return out;
  }
}
