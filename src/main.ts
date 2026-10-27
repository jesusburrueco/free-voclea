import './style.css';
import { toDb } from './audio/level';
import { classifyMicError, isMicSupported, MIC_ERROR_MESSAGES } from './audio/mic-error';
import { resolveDeviceId, toInputDevices } from './audio/constraints';
import { midiToName, freqToMidi, nearestNote, NOTE_NAMES } from './notes';
import { SCALES, getScale } from './scales';
import { suggestKey } from './key';
import { mountTriggers } from './ui/triggers';
import { mountOutputPanel, type PanelState } from './ui/output-panel';
import { CcMapper } from './audio/cc';
import { PitchWheel } from './ui/wheel';
import { MuteKeyboard } from './ui/keyboard';
import { BEND_CENTER, BEND_MODES, BEND_TARGETS, bendAffects, bendForMode, type BendMode, type BendTarget, BEND_RANGE_DEFAULT, BEND_RANGE_MAX, BEND_RANGE_MIN, bendValue, clampBendRange } from './audio/bend';
import { formatLatency } from './audio/latency';
import { isMidiSupported, MidiOutput } from './midi/output';
import type { Engine } from './audio/engine';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.innerHTML = `
    <main>
      <h1>Voz a MIDI</h1>
      <p id="permiso">Para empezar necesitamos usar el micro. El audio se procesa en tu dispositivo y no se envia a ningun sitio.</p>
      <button id="mic" type="button">Activar micro</button>
      <meter id="nivel" min="-100" max="0" value="-100" aria-label="Nivel de entrada"></meter>
      <p id="nota" aria-label="Nota detectada"></p>
      <p id="estado" role="status"></p>
      <section aria-label="Afinacion" id="afinacion"></section>
      <details class="grupo" open><summary>Escala y notas</summary>
        <label for="tonica">Tonalidad</label>
        <select id="tonica" aria-label="Tonalidad">${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select>
        <label for="escala">Escala</label>
        <select id="escala" aria-label="Escala">${SCALES.map((sc) => `<option value="${sc.id}">${sc.name}</option>`).join('')}</select>
        <p id="sugerencia">Canta unas notas para sugerir una tonalidad.</p>
        <button id="aplicar-tonalidad" type="button" hidden>Aplicar</button>
        <label>Notas permitidas (toca para silenciar)</label>
        <div id="teclado"></div>
      </details>
      <details class="grupo"><summary>Melodia y acordes</summary><div id="salida"></div></details>
      <details class="grupo"><summary>Beatbox (triggers)</summary><div id="triggers"></div></details>
      <details class="grupo"><summary>Pitch bend</summary>
        <label for="bend">Pitch bend a</label>
        <select id="bend" aria-label="Destino del pitch bend">${BEND_TARGETS.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
        <label for="modo-bend">Modo de bend</label>
        <select id="modo-bend" aria-label="Modo de bend">${BEND_MODES.map((m) => `<option value="${m.id}">${m.name}</option>`).join('')}</select>
        <label for="rango">Rango de bend (semitonos)</label>
        <input id="rango" type="number" inputmode="numeric" min="${BEND_RANGE_MIN}" max="${BEND_RANGE_MAX}" step="1" value="${BEND_RANGE_DEFAULT}" />
      </details>
      <details class="grupo"><summary>MIDI y audio</summary>
        <button id="midi" type="button">Activar MIDI</button>
        <label for="puerto">Puerto MIDI</label>
        <select id="puerto" aria-label="Puerto MIDI" disabled><option value="">Sin puerto</option></select>
        <p id="midi-estado" aria-live="polite"></p>
        <label for="entrada">Entrada de audio</label>
        <select id="entrada" aria-label="Entrada de audio"><option value="">Predeterminada</option></select>
        <label class="sonido"><input id="sonido" type="checkbox" checked /> Sonido interno</label>
        <p id="latencia" aria-live="off">Latencia: activa el micro para medirla.</p>
      </details>
    </main>
  `;
  const button = app.querySelector<HTMLButtonElement>('#mic');
  const meter = app.querySelector<HTMLMeterElement>('#nivel');
  const status = app.querySelector<HTMLParagraphElement>('#estado');
  const hint = app.querySelector<HTMLParagraphElement>('#permiso');
  const select = app.querySelector<HTMLSelectElement>('#entrada');
  const sound = app.querySelector<HTMLInputElement>('#sonido');
  const noteEl = app.querySelector<HTMLParagraphElement>('#nota');
  const latencyEl = app.querySelector<HTMLParagraphElement>('#latencia');
  let engine: Engine | null = null;
  let midi: MidiOutput | null = null;
  const cc = new CcMapper();
  const applyPanel = (st: PanelState): void => {
    cc.setConfig(st.cc);
    if (!engine) return;
    for (const ev of engine.setOutput(st.output)) midi?.sendOut(ev);
    engine.setPresets(st.presets.melody, st.presets.chord);
  };
  const panel = mountOutputPanel(app.querySelector<HTMLElement>('#salida') as HTMLElement, applyPanel);
  cc.setConfig(panel.state().cc);
  const triggers = mountTriggers(app.querySelector<HTMLElement>('#triggers') as HTMLElement, { engine: () => engine, midi: () => midi });
  const midiBtn = app.querySelector<HTMLButtonElement>('#midi');
  const portSel = app.querySelector<HTMLSelectElement>('#puerto');
  const midiStatus = app.querySelector<HTMLParagraphElement>('#midi-estado');

  const bendSel = app.querySelector<HTMLSelectElement>('#bend');
  const bendModeSel = app.querySelector<HTMLSelectElement>('#modo-bend');
  const tonicSel = app.querySelector<HTMLSelectElement>('#tonica');
  const scaleSel = app.querySelector<HTMLSelectElement>('#escala');
  const applyScale = (): void => engine?.setScale(Number(tonicSel?.value ?? 0), scaleSel?.value ?? 'chromatic');
  tonicSel?.addEventListener('change', applyScale);
  scaleSel?.addEventListener('change', applyScale);
  let anchor: number | null = null;
  const wheel = new PitchWheel();
  app.querySelector('#afinacion')?.append(wheel.el);
  const keyboard = new MuteKeyboard((muted) => engine?.setMuted(muted));
  app.querySelector('#teclado')?.append(keyboard.el);
  const keyWeights = new Array<number>(12).fill(0);
  let keyNotes = 0;
  const suggestEl = app.querySelector<HTMLParagraphElement>('#sugerencia');
  const applyKeyBtn = app.querySelector<HTMLButtonElement>('#aplicar-tonalidad');
  let suggested: ReturnType<typeof suggestKey> = null;
  applyKeyBtn?.addEventListener('click', () => {
    if (!suggested || !tonicSel || !scaleSel) return;
    tonicSel.value = String(suggested.tonic);
    scaleSel.value = suggested.scaleId;
    applyScale();
    refreshWheelScale();
  });
  let inScale: ReadonlySet<number> = new Set(Array.from({ length: 12 }, (_, i) => i));
  const refreshWheelScale = (): void => {
    const tonic = Number(tonicSel?.value ?? 0);
    inScale = new Set(getScale(scaleSel?.value ?? 'chromatic').intervals.map((i) => (tonic + i) % 12));
    wheel.update(null, 0, inScale);
  };
  tonicSel?.addEventListener('change', refreshWheelScale);
  scaleSel?.addEventListener('change', refreshWheelScale);
  const rangeIn = app.querySelector<HTMLInputElement>('#rango');
  let heldNote: number | null = null;
  const bendRange = (): number => clampBendRange(Number(rangeIn?.value));
  const applyBend = (freq: number): void => {
    const target = (bendSel?.value ?? 'ninguno') as BendTarget;
    if (target === 'ninguno' || heldNote === null || freq <= 0) return;
    const midiNow = freqToMidi(freq);
    anchor ??= midiNow;
    const st = bendForMode((bendModeSel?.value ?? 'fiel') as BendMode, midiNow, heldNote, anchor, bendRange());
    sendBendTo(st, bendValue(st, bendRange()), target);
  };
  const sendBendTo = (semitones: number, value: number, target: BendTarget): void => {
    const parts = { melody: bendAffects(target, 'melodia'), chords: bendAffects(target, 'acordes') };
    engine?.setBend(semitones, parts);
    const o = panel.state().output;
    if (parts.melody) midi?.sendBend(value, o.melodyChannel);
    if (parts.chords && (!parts.melody || o.chordChannel !== o.melodyChannel)) midi?.sendBend(value, o.chordChannel);
  };
  const resetBend = (): void => {
    anchor = null;
    sendBendTo(0, BEND_CENTER, 'ambos');
  };
  rangeIn?.addEventListener('change', () => {
    rangeIn.value = String(bendRange());
  });
  bendSel?.addEventListener('change', resetBend);
  bendModeSel?.addEventListener('change', resetBend);

  const refreshPorts = (): void => {
    if (!midi || !portSel || !midiStatus) return;
    const ports = midi.ports();
    portSel.replaceChildren(new Option('Sin puerto', ''));
    for (const p of ports) portSel.add(new Option(p.name, p.id));
    portSel.value = midi.selectedId ?? '';
    portSel.disabled = ports.length === 0;
    midiStatus.textContent = ports.length === 0 ? 'No hay puertos MIDI de salida' : 'MIDI activo';
  };
  if (midiBtn && !isMidiSupported(navigator)) {
    midiBtn.disabled = true;
    if (midiStatus) midiStatus.textContent = 'Este navegador no admite Web MIDI. Se usa solo el sonido interno.';
  }
  midiBtn?.addEventListener('click', async () => {
    if (!midiStatus || midi) return;
    const res = await MidiOutput.request(navigator);
    if (!res.ok) {
      midiStatus.textContent =
        res.reason === 'denied' ? 'Permiso MIDI denegado. Se usa solo el sonido interno.' : 'Este navegador no admite Web MIDI.';
      return;
    }
    midi = res.midi;
    triggers.onMidi();
    midi.onPortsChange(refreshPorts);
    refreshPorts();
    if (midiBtn) midiBtn.hidden = true;
  });
  portSel?.addEventListener('change', () => midi?.select(portSel.value || null));
  sound?.addEventListener('change', () => engine?.setSound(sound.checked));

  const readSaved = (): string | undefined => {
    try {
      return localStorage.getItem('entrada') ?? undefined;
    } catch {
      return undefined;
    }
  };

  const refreshDevices = async (): Promise<void> => {
    if (!select || !navigator.mediaDevices?.enumerateDevices) return;
    const devices = toInputDevices(await navigator.mediaDevices.enumerateDevices());
    const wanted = resolveDeviceId(select.value || readSaved(), devices);
    select.replaceChildren(new Option('Predeterminada', ''));
    for (const d of devices) select.add(new Option(d.label, d.id));
    select.value = wanted ?? '';
  };
  void refreshDevices();
  navigator.mediaDevices?.addEventListener?.('devicechange', () => void refreshDevices());
  select?.addEventListener('change', () => {
    try {
      localStorage.setItem('entrada', select.value);
    } catch {
      /* sin almacenamiento: no se recuerda */
    }
  });

  if (button && !isMicSupported(navigator, window)) {
    button.disabled = true;
    if (status) status.textContent = MIC_ERROR_MESSAGES.unsupported;
  }

  button?.addEventListener('click', async () => {
    if (!button || !meter || !status || !hint) return;
    button.disabled = true;
    try {
      if (engine) {
        await engine.stop();
        engine = null;
        triggers.onEngineStop();
        heldNote = null;
        midi?.allNotesOff();
        meter.value = -100;
        button.textContent = 'Activar micro';
        if (latencyEl) latencyEl.textContent = 'Latencia: activa el micro para medirla.';
        status.textContent = '';
        hint.hidden = false;
      } else {
        const { startEngine } = await import('./audio/engine');
        engine = await startEngine(({ rms, freq, events, out, centroid }) => {
          meter.value = toDb(rms);
          if (freq && freq > 0) {
            const near = nearestNote(freq);
            wheel.update(((near.note % 12) + 12) % 12, near.cents, inScale);
          } else wheel.update(null, 0, inScale);
          for (const ev of events ?? []) {
            if (ev.type === 'on') {
              heldNote = ev.note;
              keyboard.setActive(((ev.note % 12) + 12) % 12);
              if (freq && freq > 0) {
                const pc = (((nearestNote(freq).note % 12) + 12) % 12) as number;
                keyWeights[pc] = (keyWeights[pc] ?? 0) + 1;
                keyNotes++;
                suggested = keyNotes >= 5 ? suggestKey(keyWeights) : null;
                if (suggested && suggestEl && applyKeyBtn) {
                  suggestEl.textContent = `Sugerencia: ${NOTE_NAMES[suggested.tonic]} ${suggested.scaleId === 'major' ? 'mayor' : 'menor'}`;
                  applyKeyBtn.hidden = false;
                }
              }
              resetBend();
            } else if (ev.note === heldNote) {
              heldNote = null;
              keyboard.setActive(null);
            }
            if (noteEl && ev.type === 'on') noteEl.textContent = midiToName(ev.note);
          }
          for (const o of out ?? []) midi?.sendOut(o);
          applyBend(freq ?? 0);
          for (const m of cc.update({ db: toDb(rms), centroidHz: centroid ?? 0, voiced: heldNote !== null })) midi?.sendCc(m.controller, m.value, m.channel);
          status.dataset['activo'] = '1';
          delete status.dataset['error'];
        }, select?.value || undefined, { onHit: triggers.onHit, onExample: triggers.onExample });
        triggers.onEngineStart();
        engine.setSound(sound?.checked ?? true);
        applyScale();
        applyPanel(panel.state());
        engine.setMuted(keyboard.muted);
        void refreshDevices();
        if (latencyEl) latencyEl.textContent = formatLatency(engine.latency());
        button.textContent = 'Detener';
        status.textContent = 'Micro activo';
        hint.hidden = true;
      }
    } catch (err) {
      const kind = classifyMicError(err);
      status.textContent = MIC_ERROR_MESSAGES[kind];
      status.dataset['error'] = kind;
      button.textContent = 'Reintentar';
    } finally {
      button.disabled = false;
    }
  });
}

if (import.meta.env.PROD) {
  void import('./pwa').then((m) => m.registerServiceWorker());
}
