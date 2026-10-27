import { DRUM_IDS, DRUM_VOICES } from '../audio/drums';
import type { Engine } from '../audio/engine';
import type { MidiOutput } from '../midi/output';
import {
  EXAMPLES_PER_TRAINING,
  FIXED_VELOCITY,
  MAX_NAME_LENGTH,
  addExample,
  clampChannel,
  clampNote,
  defaultSettings,
  sanitizeSettings,
  sanitizeSlots,
  toExamples,
  type Slot,
  type TriggerSettings,
} from '../beat/slots';

const STORAGE_KEY = 'triggers';

interface Deps {
  engine: () => Engine | null;
  midi: () => MidiOutput | null;
}

function load(): { slots: Slot[]; settings: TriggerSettings } {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as { slots?: unknown; settings?: unknown } | null;
    return { slots: sanitizeSlots(raw?.slots, DRUM_IDS), settings: sanitizeSettings(raw?.settings) };
  } catch {
    return { slots: sanitizeSlots(null, DRUM_IDS), settings: { ...defaultSettings } };
  }
}

/** Seccion de triggers de beatbox: entrenamiento por slot, mapeo a nota y a voz interna, sensibilidad y canal. */
export function mountTriggers(host: HTMLElement, deps: Deps) {
  const state = load();
  let armed: number | null = null;
  let collected = 0;

  const save = (): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* sin almacenamiento: no se recuerda */
    }
  };
  const syncEngine = (): void => {
    const e = deps.engine();
    if (!e) return;
    e.setExamples(toExamples(state.slots));
    e.setVoices(state.slots.map((s) => (s.dest === 'midi' ? '' : s.voice)));
    e.setSensitivity(state.settings.sensitivity);
    e.setTriggersEnabled(state.settings.enabled);
    e.arm(armed);
  };

  host.innerHTML = `
    <label class="sonido"><input id="trig-on" type="checkbox" /> Triggers de beatbox</label>
    <label for="trig-sens">Sensibilidad</label>
    <input id="trig-sens" type="range" min="0" max="1" step="0.05" aria-label="Sensibilidad de los triggers" />
    <label for="trig-canal">Canal MIDI de triggers</label>
    <input id="trig-canal" type="number" inputmode="numeric" min="1" max="16" step="1" />
    <p>Pulsa Grabar y haz el mismo sonido ${EXAMPLES_PER_TRAINING} veces con el micro activo.</p>
    <p id="trig-estado" aria-live="polite"></p>
    <div id="trig-slots"></div>`;
  const q = <T extends HTMLElement>(sel: string): T => host.querySelector<T>(sel) as T;
  const on = q<HTMLInputElement>('#trig-on');
  const sens = q<HTMLInputElement>('#trig-sens');
  const chan = q<HTMLInputElement>('#trig-canal');
  const status = q<HTMLParagraphElement>('#trig-estado');
  const list = q<HTMLDivElement>('#trig-slots');
  on.checked = state.settings.enabled;
  sens.value = String(state.settings.sensitivity);
  chan.value = String(state.settings.channel);

  const applyChannel = (): void => {
    const m = deps.midi();
    if (m) m.triggerChannel = state.settings.channel;
  };

  on.addEventListener('change', () => {
    state.settings.enabled = on.checked;
    save();
    syncEngine();
  });
  sens.addEventListener('input', () => {
    state.settings.sensitivity = Number(sens.value);
    save();
    deps.engine()?.setSensitivity(state.settings.sensitivity);
  });
  chan.addEventListener('change', () => {
    state.settings.channel = clampChannel(Number(chan.value));
    chan.value = String(state.settings.channel);
    save();
    applyChannel();
  });

  const render = (): void => {
    list.replaceChildren();
    state.slots.forEach((slot, i) => {
      const box = document.createElement('fieldset');
      box.className = 'slot';
      box.innerHTML = `
        <legend>Sonido ${i + 1}</legend>
        <label>Nombre <input data-f="name" type="text" maxlength="${MAX_NAME_LENGTH}" aria-label="Nombre del sonido ${i + 1}" /></label>
        <label>Nota MIDI <input data-f="note" type="number" inputmode="numeric" min="0" max="127" aria-label="Nota MIDI del sonido ${i + 1}" /></label>
        <label>Voz interna <select data-f="voice" aria-label="Voz interna del sonido ${i + 1}">${DRUM_VOICES.map((v) => `<option value="${v.id}">${v.name}</option>`).join('')}</select></label>
        <label>Destino <select data-f="dest" aria-label="Destino del sonido ${i + 1}"><option value="ambos">MIDI e interno</option><option value="midi">Solo MIDI</option><option value="interno">Solo interno</option></select></label>
        <label class="sonido"><input data-f="vel" type="checkbox" aria-label="Velocidad segun la fuerza del sonido ${i + 1}" /> Velocidad segun la fuerza</label>
        <p data-f="count">${slot.examples.length} ejemplos</p>
        <button type="button" data-f="rec" aria-label="Grabar sonido ${i + 1}">${armed === i ? `Grabando ${collected}/${EXAMPLES_PER_TRAINING}` : 'Grabar'}</button>
        <button type="button" data-f="del" aria-label="Borrar sonido ${i + 1}">Borrar</button>`;
      const f = <T extends HTMLElement>(n: string): T => box.querySelector<T>(`[data-f="${n}"]`) as T;
      const name = f<HTMLInputElement>('name');
      const note = f<HTMLInputElement>('note');
      const voice = f<HTMLSelectElement>('voice');
      name.value = slot.name;
      note.value = String(slot.note);
      voice.value = slot.voice;
      const dest = f<HTMLSelectElement>('dest');
      const vel = f<HTMLInputElement>('vel');
      dest.value = slot.dest;
      vel.checked = slot.velocity;
      dest.addEventListener('change', () => {
        slot.dest = dest.value as Slot['dest'];
        save();
        syncEngine();
      });
      vel.addEventListener('change', () => {
        slot.velocity = vel.checked;
        save();
      });
      name.addEventListener('change', () => {
        slot.name = name.value.trim().slice(0, MAX_NAME_LENGTH) || slot.name;
        name.value = slot.name;
        save();
      });
      note.addEventListener('change', () => {
        slot.note = clampNote(Number(note.value), slot.note);
        note.value = String(slot.note);
        save();
      });
      voice.addEventListener('change', () => {
        slot.voice = voice.value;
        save();
        syncEngine();
      });
      f<HTMLButtonElement>('rec').addEventListener('click', () => {
        if (!deps.engine()) {
          status.textContent = 'Activa el micro para grabar.';
          return;
        }
        armed = armed === i ? null : i;
        collected = 0;
        status.textContent = armed === null ? '' : `Haz el sonido ${EXAMPLES_PER_TRAINING} veces.`;
        deps.engine()?.arm(armed);
        render();
      });
      f<HTMLButtonElement>('del').addEventListener('click', () => {
        slot.examples = [];
        if (armed === i) armed = null;
        save();
        syncEngine();
        render();
      });
      list.append(box);
    });
  };
  render();

  return {
    /** Llamar al arrancar el motor: le pasa la configuracion actual. */
    onEngineStart(): void {
      syncEngine();
      applyChannel();
    },
    onEngineStop(): void {
      armed = null;
      collected = 0;
      status.textContent = '';
      render();
    },
    onMidi(): void {
      applyChannel();
    },
    onHit(slot: number, velocity: number): void {
      const s = state.slots[slot];
      if (!s) return;
      if (s.dest !== 'interno') deps.midi()?.sendTrigger(s.note, s.velocity ? velocity : FIXED_VELOCITY);
      status.textContent = `${s.name} (${velocity})`;
    },
    onExample(slot: number, vec: number[]): void {
      if (armed !== slot) return;
      addExample(state.slots, slot, vec);
      collected++;
      if (collected >= EXAMPLES_PER_TRAINING) {
        armed = null;
        collected = 0;
        status.textContent = 'Listo.';
        deps.engine()?.arm(null);
      }
      save();
      syncEngine();
      render();
    },
  };
}
