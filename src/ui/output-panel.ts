import { CHORD_VARIANTS, type ChordVariant } from '../audio/chords';
import { sanitizeCcSettings, type CcSettings } from '../audio/cc';
import { sanitizeOutputSettings, type OutputSettings } from '../audio/router';
import { SYNTH_PRESETS } from '../audio/synth';

const KEY = 'salida';
const DEGREES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

interface Stored {
  output?: Partial<OutputSettings>;
  cc?: Partial<CcSettings>;
  presets?: { melody?: string; chord?: string };
}

export interface PanelState {
  output: OutputSettings;
  cc: CcSettings;
  presets: { melody: string; chord: string };
}

const presetOptions = SYNTH_PRESETS.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
const variantOptions = CHORD_VARIANTS.map((v) => `<option value="${v.id}">${v.name}</option>`).join('');

function load(): PanelState {
  let raw: Stored = {};
  try {
    raw = (JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null) ?? {};
  } catch {
    /* sin datos validos */
  }
  const has = (id: string | undefined): string | undefined => (SYNTH_PRESETS.some((p) => p.id === id) ? id : undefined);
  return {
    output: sanitizeOutputSettings(raw.output),
    cc: sanitizeCcSettings(raw.cc),
    presets: { melody: has(raw.presets?.melody) ?? 'suave', chord: has(raw.presets?.chord) ?? 'puro' },
  };
}

const num = (label: string, id: string, min: number, max: number): string =>
  `<div><label for="${id}">${label}</label><input id="${id}" type="number" inputmode="numeric" min="${min}" max="${max}" step="1" /></div>`;

/** Panel de melodia, acordes, rango, canales, presets y CC. Devuelve el estado vivo y avisa de cada cambio. */
export interface PanelHosts {
  /** Interruptores rapidos de melodia y acordes. */
  quick: HTMLElement;
  melodia: HTMLElement;
  acordes: HTMLElement;
  cc: HTMLElement;
}

export function mountOutputPanel(hosts: PanelHosts, onChange: (state: PanelState) => void): { state: () => PanelState; setRange(low: number, high: number): void } {
  const state = load();
  hosts.quick.innerHTML = `
    <label class="chip"><input id="o-melodia" type="checkbox" /><span>Melodia</span></label>
    <label class="chip"><input id="o-acordes" type="checkbox" /><span>Acordes</span></label>`;
  hosts.melodia.innerHTML = `
    <div class="rejilla">
      ${num('Octava de la melodia', 'o-octava', -3, 3)}
      ${num('Transposicion (semitonos)', 'o-transp', -12, 12)}
      ${num('Nota minima (MIDI)', 'o-min', 0, 127)}
      ${num('Nota maxima (MIDI)', 'o-max', 0, 127)}
      ${num('Canal MIDI de la melodia', 'o-canal-mel', 1, 16)}
    </div>
    <label for="o-preset-mel">Sonido interno de la melodia</label>
    <select id="o-preset-mel">${presetOptions}</select>`;
  hosts.acordes.innerHTML = `
    <div class="rejilla">
      ${num('Octava de los acordes', 'o-octacordes', -2, 1)}
      ${num('Canal MIDI de los acordes', 'o-canal-ac', 1, 16)}
    </div>
    <label for="o-preset-ac">Sonido interno de los acordes</label>
    <select id="o-preset-ac">${presetOptions}</select>
    <label for="o-inv">Inversion</label>
    <select id="o-inv"><option value="0">Fundamental</option><option value="1">Primera</option><option value="2">Segunda</option></select>
    <label for="o-ap">Apertura</label>
    <select id="o-ap"><option value="close">Cerrada</option><option value="open">Abierta</option></select>
    <label for="o-bajo">Bajo</label>
    <select id="o-bajo"><option value="off">Sin bajo</option><option value="follow">Una octava bajo la raiz</option><option value="fixed">Octava fija</option></select>
    ${num('Octavas del bajo bajo la raiz', 'o-bajo-oct', 1, 4)}
    <details class="avanzado"><summary>Variante de cada grado</summary>
      <div class="rejilla">${DEGREES.map((d, i) => `<div><label for="o-grado-${i}">Grado ${d}</label><select id="o-grado-${i}">${variantOptions}</select></div>`).join('')}</div>
    </details>`;
  hosts.cc.innerHTML = `
    <label class="interruptor"><input id="cc-env-on" type="checkbox" /><span>Volumen de la voz</span></label>
    <div class="rejilla">
      ${num('CC del volumen', 'cc-env-cc', 0, 127)}
      ${num('Canal del volumen', 'cc-env-ch', 1, 16)}
    </div>
    <label class="interruptor"><input id="cc-tim-on" type="checkbox" /><span>Timbre (brillo de la vocal)</span></label>
    <div class="rejilla">
      ${num('CC del timbre', 'cc-tim-cc', 0, 127)}
      ${num('Canal del timbre', 'cc-tim-ch', 1, 16)}
    </div>`;
  const all = Object.values(hosts);
  const el = <T extends HTMLElement>(id: string): T => document.querySelector<T>(`#${id}`) as T;
  const n = (id: string): number => Number(el<HTMLInputElement>(id).value);

  const write = (): void => {
    const o = state.output;
    el<HTMLInputElement>('o-melodia').checked = o.melody;
    el<HTMLInputElement>('o-acordes').checked = o.chords;
    el<HTMLInputElement>('o-octava').value = String(o.octave);
    el<HTMLInputElement>('o-transp').value = String(o.transpose);
    el<HTMLInputElement>('o-octacordes').value = String(o.chordOctave);
    el<HTMLInputElement>('o-min').value = String(o.rangeLow);
    el<HTMLInputElement>('o-max').value = String(o.rangeHigh);
    el<HTMLInputElement>('o-canal-mel').value = String(o.melodyChannel);
    el<HTMLInputElement>('o-canal-ac').value = String(o.chordChannel);
    el<HTMLSelectElement>('o-preset-mel').value = state.presets.melody;
    el<HTMLSelectElement>('o-preset-ac').value = state.presets.chord;
    el<HTMLSelectElement>('o-inv').value = String(o.chord.inversion);
    el<HTMLSelectElement>('o-ap').value = o.chord.voicing;
    el<HTMLSelectElement>('o-bajo').value = o.chord.bass;
    el<HTMLInputElement>('o-bajo-oct').value = String(o.chord.bassOctaves);
    o.chord.variants.forEach((v, i) => (el<HTMLSelectElement>(`o-grado-${i}`).value = v));
    const c = state.cc;
    el<HTMLInputElement>('cc-env-on').checked = c.envelope.on;
    el<HTMLInputElement>('cc-env-cc').value = String(c.envelope.controller);
    el<HTMLInputElement>('cc-env-ch').value = String(c.envelope.channel);
    el<HTMLInputElement>('cc-tim-on').checked = c.timbre.on;
    el<HTMLInputElement>('cc-tim-cc').value = String(c.timbre.controller);
    el<HTMLInputElement>('cc-tim-ch').value = String(c.timbre.channel);
  };

  const read = (): void => {
    state.output = sanitizeOutputSettings({
      melody: el<HTMLInputElement>('o-melodia').checked,
      chords: el<HTMLInputElement>('o-acordes').checked,
      octave: n('o-octava'),
      transpose: n('o-transp'),
      chordOctave: n('o-octacordes'),
      rangeLow: n('o-min'),
      rangeHigh: n('o-max'),
      melodyChannel: n('o-canal-mel'),
      chordChannel: n('o-canal-ac'),
      chord: {
        inversion: Number(el<HTMLSelectElement>('o-inv').value) as 0 | 1 | 2,
        voicing: el<HTMLSelectElement>('o-ap').value as 'close' | 'open',
        bass: el<HTMLSelectElement>('o-bajo').value as 'off' | 'follow' | 'fixed',
        bassOctaves: n('o-bajo-oct'),
        variants: DEGREES.map((_, i) => el<HTMLSelectElement>(`o-grado-${i}`).value as ChordVariant),
      },
    });
    state.presets = { melody: el<HTMLSelectElement>('o-preset-mel').value, chord: el<HTMLSelectElement>('o-preset-ac').value };
    state.cc = sanitizeCcSettings({
      envelope: { on: el<HTMLInputElement>('cc-env-on').checked, controller: n('cc-env-cc'), channel: n('cc-env-ch') },
      timbre: { on: el<HTMLInputElement>('cc-tim-on').checked, controller: n('cc-tim-cc'), channel: n('cc-tim-ch') },
    });
    write();
    try {
      localStorage.setItem(KEY, JSON.stringify({ output: state.output, cc: state.cc, presets: state.presets }));
    } catch {
      /* sin almacenamiento: no se recuerda */
    }
    onChange(state);
  };

  write();
  for (const h of all) h.addEventListener('change', read);
  return {
    state: () => state,
    setRange(low, high) {
      el<HTMLInputElement>('o-min').value = String(low);
      el<HTMLInputElement>('o-max').value = String(high);
      read();
    },
  };
}
