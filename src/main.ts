import './style.css';
import { toDb } from './audio/level';
import { classifyMicError, isMicSupported, MIC_ERROR_MESSAGES } from './audio/mic-error';
import { resolveDeviceId, toInputDevices } from './audio/constraints';
import { midiToName, freqToMidi, nearestNote, NOTE_NAMES } from './notes';
import { SCALES, getScale } from './scales';
import { suggestKey } from './key';
import { loadSettings, saveSettings, type AppSettings } from './settings';
import { mountSetup } from './ui/setup';
import { mountTriggers } from './ui/triggers';
import { mountOutputPanel, type PanelState } from './ui/output-panel';
import { CcMapper } from './audio/cc';
import { PitchWheel } from './ui/wheel';
import { MuteKeyboard } from './ui/keyboard';
import { BEND_CENTER, BEND_MODES, BEND_TARGETS, bendAffects, bendForMode, type BendMode, type BendTarget, BEND_RANGE_DEFAULT, BEND_RANGE_MAX, BEND_RANGE_MIN, bendValue, clampBendRange } from './audio/bend';
import { formatLatency } from './audio/latency';
import { isMidiSupported, MidiOutput } from './midi/output';
import type { Engine } from './audio/engine';
import { contextNotice } from './audio/context-state';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  const icon = (d: string): string => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}" /></svg>`;
  const ICONS = {
    tocar: 'M3 12h2v0M7 8v8M11 4v16M15 8v8M19 10v4',
    melodia: 'M9 18V6l10-2v12M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM19 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z',
    acordes: 'M4 20V9h4v11M10 20V5h4v15M16 20v-8h4v8',
    beatbox: 'M4 9a8 3 0 1 0 16 0 8 3 0 0 0-16 0zM4 9v7c0 1.7 3.6 3 8 3s8-1.3 8-3V9',
    ajustes: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6',
    mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4',
  };
  const TABS = [
    { id: 'tocar', name: 'Tocar' },
    { id: 'melodia', name: 'Melodia' },
    { id: 'acordes', name: 'Acordes' },
    { id: 'beatbox', name: 'Beatbox' },
    { id: 'ajustes', name: 'Ajustes' },
  ] as const;
  app.innerHTML = `
    <header class="barra">
      <svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect x="4" y="12" width="4" height="8" rx="2"/><rect x="11" y="6" width="4" height="20" rx="2"/><rect x="18" y="9" width="4" height="14" rx="2"/><rect x="25" y="13" width="4" height="6" rx="2"/></svg>
      <h1>Voz a MIDI</h1>
    </header>
    <main>
      <section class="panel" role="tabpanel" id="panel-tocar" aria-label="Panel de tocar" data-panel="tocar">
        <p id="permiso" class="aviso">Para empezar necesitamos usar el micro. El audio se procesa en tu dispositivo y no se envia a ningun sitio.</p>
        <div class="heroe">
          <button id="mic" class="mic" type="button">${icon(ICONS.mic)}<span id="mic-etiqueta">Activar micro</span></button>
        </div>
        <p id="estado" class="estado" role="status"></p>
        <button id="reanudar" type="button" hidden>Reanudar audio</button>
        <meter id="nivel" min="-100" max="0" value="-100" aria-label="Nivel de entrada"></meter>
        <div class="lectura">
          <p id="nota" class="nota-grande" aria-label="Nota detectada"></p>
          <p id="acorde" class="acorde" aria-label="Acorde"></p>
        </div>
        <section id="afinacion" aria-label="Afinacion"></section>
        <div class="chips" id="rapido">
          <span id="rapido-salida" class="chips-interno"></span>
          <label class="chip"><input id="sonido" type="checkbox" checked /><span>Sonido interno</span></label>
        </div>
        <div class="tarjeta">
          <h2>Tonalidad</h2>
          <div class="rejilla">
            <div><label for="tonica">Tonalidad</label>
            <select id="tonica" aria-label="Tonalidad">${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select></div>
            <div><label for="escala">Escala</label>
            <select id="escala" aria-label="Escala">${SCALES.map((sc) => `<option value="${sc.id}">${sc.name}</option>`).join('')}</select></div>
          </div>
          <p id="sugerencia" class="pista">Canta unas notas para sugerir una tonalidad.</p>
          <button id="aplicar-tonalidad" type="button" hidden>Aplicar</button>
        </div>
        <div class="tarjeta">
          <h2>Pads</h2>
          <div id="pads" class="pads"></div>
          <p class="pista">Toca un pad para oirlo. Los golpes de tu voz los iluminan.</p>
        </div>
      </section>

      <section class="panel" role="tabpanel" id="panel-melodia" aria-label="Panel de melodia" data-panel="melodia" hidden>
        <div class="tarjeta">
          <h2>Notas permitidas</h2>
          <p class="pista">Toca una tecla para silenciar esa nota. Tu voz se ajusta a las que quedan.</p>
          <div id="teclado"></div>
        </div>
        <div class="tarjeta"><h2>Melodia</h2><div id="salida-melodia"></div></div>
        <div class="tarjeta">
          <h2>Pitch bend</h2>
          <label for="bend">Pitch bend a</label>
          <select id="bend" aria-label="Destino del pitch bend">${BEND_TARGETS.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
          <div class="rejilla">
            <div><label for="modo-bend">Modo de bend</label>
            <select id="modo-bend" aria-label="Modo de bend">${BEND_MODES.map((m) => `<option value="${m.id}">${m.name}</option>`).join('')}</select></div>
            <div><label for="rango">Rango de bend (semitonos)</label>
            <input id="rango" type="number" inputmode="numeric" min="${BEND_RANGE_MIN}" max="${BEND_RANGE_MAX}" step="1" value="${BEND_RANGE_DEFAULT}" /></div>
          </div>
        </div>
        <details class="tarjeta avanzado"><summary>Control (CC)</summary><div id="salida-cc"></div></details>
      </section>

      <section class="panel" role="tabpanel" id="panel-acordes" aria-label="Panel de acordes" data-panel="acordes" hidden>
        <div class="tarjeta"><h2>Acordes</h2><p class="pista">Cada nota que cantas genera el acorde diatonico de ese grado.</p><div id="salida-acordes"></div></div>
      </section>

      <section class="panel" role="tabpanel" id="panel-beatbox" aria-label="Panel de beatbox" data-panel="beatbox" hidden>
        <div class="tarjeta"><h2>Beatbox</h2><div id="triggers"></div></div>
      </section>

      <section class="panel" role="tabpanel" id="panel-ajustes" aria-label="Panel de ajustes" data-panel="ajustes" hidden>
        <div class="tarjeta">
          <h2>Entrada de audio</h2>
          <label for="entrada">Entrada de audio</label>
          <select id="entrada" aria-label="Entrada de audio"><option value="">Predeterminada</option></select>
          <label for="ganancia">Nivel de entrada (dB)</label>
          <input id="ganancia" type="range" min="-12" max="24" step="1" aria-label="Nivel de entrada en dB" />
          <label for="pegajosidad">Pegajosidad de la nota</label>
          <input id="pegajosidad" type="range" min="0" max="1" step="0.05" aria-label="Pegajosidad de la nota" />
          <p id="latencia" class="pista" aria-live="off">Latencia: activa el micro para medirla.</p>
        </div>
        <div class="tarjeta">
          <h2>MIDI</h2>
          <button id="midi" type="button">Activar MIDI</button>
          <label for="puerto">Puerto MIDI</label>
          <select id="puerto" aria-label="Puerto MIDI" disabled><option value="">Sin puerto</option></select>
          <p id="midi-estado" class="pista" aria-live="polite"></p>
        </div>
        <details class="tarjeta avanzado"><summary>Calibracion y perfiles</summary><div id="ajustes-perfiles"></div></details>
        <div class="tarjeta">
          <h2>Apariencia</h2>
          <div class="rejilla">
            <div><label for="tema">Tema</label>
            <select id="tema" aria-label="Tema"><option value="auto">Automatico</option><option value="oscuro">Oscuro</option><option value="claro">Claro</option></select></div>
            <div><label for="escala-ui">Tamano de la interfaz</label>
            <select id="escala-ui" aria-label="Tamano de la interfaz">${[100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200].map((v) => `<option value="${v}">${v} %</option>`).join('')}</select></div>
          </div>
          <p><a id="ayuda" href="/ayuda.html">Ayuda</a></p>
        </div>
      </section>
    </main>
    <nav class="tabs" role="tablist" aria-label="Secciones">
      ${TABS.map((t, i) => `<button type="button" role="tab" id="tab-${t.id}" data-tab="${t.id}" aria-controls="panel-${t.id}" aria-selected="${i === 0}">${icon(ICONS[t.id])}<span>${t.name}</span></button>`).join('')}
    </nav>
  `;
  const showTab = (id: string): void => {
    app.querySelectorAll<HTMLElement>('[data-panel]').forEach((p) => (p.hidden = p.dataset['panel'] !== id));
    app.querySelectorAll<HTMLButtonElement>('[role="tab"]').forEach((t) => t.setAttribute('aria-selected', String(t.dataset['tab'] === id)));
    app.querySelector('main')?.scrollTo({ top: 0 });
  };
  app.querySelectorAll<HTMLButtonElement>('[role="tab"]').forEach((t) => t.addEventListener('click', () => showTab(t.dataset['tab'] ?? 'tocar')));
  const button = app.querySelector<HTMLButtonElement>('#mic');
  const micLabel = app.querySelector<HTMLElement>('#mic-etiqueta');
  const setMic = (text: string, on: boolean): void => {
    if (micLabel) micLabel.textContent = text;
    button?.classList.toggle('activo', on);
    if (!on) button?.style.removeProperty('--nivel');
  };
  const chordEl = app.querySelector<HTMLParagraphElement>('#acorde');
  const meter = app.querySelector<HTMLMeterElement>('#nivel');
  const status = app.querySelector<HTMLParagraphElement>('#estado');
  const hint = app.querySelector<HTMLParagraphElement>('#permiso');
  const reanudar = app.querySelector<HTMLButtonElement>('#reanudar');
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
    engine.setCentroid(st.cc.timbre.on);
  };
  const panel = mountOutputPanel(
    {
      quick: app.querySelector<HTMLElement>('#rapido-salida') as HTMLElement,
      melodia: app.querySelector<HTMLElement>('#salida-melodia') as HTMLElement,
      acordes: app.querySelector<HTMLElement>('#salida-acordes') as HTMLElement,
      cc: app.querySelector<HTMLElement>('#salida-cc') as HTMLElement,
    },
    applyPanel,
  );
  cc.setConfig(panel.state().cc);
  const setup = mountSetup(app.querySelector<HTMLElement>('#ajustes-perfiles') as HTMLElement, {
    active: () => engine !== null,
    onCalibrated: (r) => {
      settings = { ...settings, thresholdDb: r.thresholdDb };
      saveSettings(settings);
      engine?.setThreshold(r.thresholdDb);
      if (r.range) panel.setRange(r.range.low, r.range.high);
    },
  });
  const triggers = mountTriggers(app.querySelector<HTMLElement>('#triggers') as HTMLElement, { engine: () => engine, midi: () => midi, pads: app.querySelector<HTMLElement>('#pads') as HTMLElement });
  const midiBtn = app.querySelector<HTMLButtonElement>('#midi');
  const portSel = app.querySelector<HTMLSelectElement>('#puerto');
  const midiStatus = app.querySelector<HTMLParagraphElement>('#midi-estado');

  let settings: AppSettings = loadSettings();
  const persist = (): void => {
    settings = {
      ...settings,
      tonic: Number(tonicSel?.value ?? 0),
      scaleId: scaleSel?.value ?? 'chromatic',
      muted: [...keyboard.muted],
      bendTarget: (bendSel?.value ?? 'ninguno') as BendTarget,
      bendMode: (bendModeSel?.value ?? 'fiel') as BendMode,
      bendRange: bendRange(),
      sound: sound?.checked ?? true,
    };
    saveSettings(settings);
  };
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
  const keyboard = new MuteKeyboard((muted) => {
    engine?.setMuted(muted);
    persist();
  });
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
    persist();
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
  if (tonicSel) tonicSel.value = String(settings.tonic);
  if (scaleSel) scaleSel.value = settings.scaleId;
  if (bendSel) bendSel.value = settings.bendTarget;
  if (bendModeSel) bendModeSel.value = settings.bendMode;
  if (rangeIn) rangeIn.value = String(settings.bendRange);
  if (sound) sound.checked = settings.sound;
  keyboard.setMuted(settings.muted);
  const gainIn = app.querySelector<HTMLInputElement>('#ganancia');
  const stickIn = app.querySelector<HTMLInputElement>('#pegajosidad');
  const uiSel = app.querySelector<HTMLSelectElement>('#escala-ui');
  const themeSel = app.querySelector<HTMLSelectElement>('#tema');
  if (themeSel) themeSel.value = settings.tema;
  if (gainIn) gainIn.value = String(settings.inputGainDb);
  if (stickIn) stickIn.value = String(settings.stickiness);
  if (uiSel) uiSel.value = String(settings.uiScale);
  const applyUiScale = (): void => {
    document.body.style.fontSize = `${settings.uiScale}%`;
    if (settings.tema === 'auto') delete document.documentElement.dataset['tema'];
    else document.documentElement.dataset['tema'] = settings.tema;
  };
  applyUiScale();
  const commitTuning = (): void => {
    settings = {
      ...settings,
      inputGainDb: Number(gainIn?.value ?? 0),
      stickiness: Number(stickIn?.value ?? 0.25),
      uiScale: Number(uiSel?.value ?? 100),
      tema: (themeSel?.value ?? 'auto') as AppSettings['tema'],
    };
    saveSettings(settings);
    engine?.setInputGain(settings.inputGainDb);
    engine?.setStickiness(settings.stickiness);
    applyUiScale();
  };
  for (const input of [gainIn, stickIn, uiSel, themeSel]) input?.addEventListener('change', commitTuning);
  refreshWheelScale();
  for (const input of [tonicSel, scaleSel, bendSel, bendModeSel, rangeIn, sound]) input?.addEventListener('change', persist);

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

  reanudar?.addEventListener('click', () => {
    void engine?.resume().catch(() => {});
  });

  button?.addEventListener('click', async () => {
    if (!button || !meter || !status || !hint) return;
    button.disabled = true;
    try {
      if (engine) {
        await engine.stop();
        engine = null;
        if (reanudar) reanudar.hidden = true;
        triggers.onEngineStop();
        heldNote = null;
        midi?.allNotesOff();
        meter.value = -100;
        setMic('Activar micro', false);
        if (latencyEl) latencyEl.textContent = 'Latencia: activa el micro para medirla.';
        status.textContent = '';
        hint.hidden = false;
      } else {
        const { startEngine } = await import('./audio/engine');
        engine = await startEngine(({ rms, freq, clarity, events, out, centroid }) => {
          meter.value = toDb(rms);
          button.style.setProperty('--nivel', String(Math.min(1, Math.max(0, (toDb(rms) + 60) / 50))));
          setup.feed({ db: toDb(rms), freq: freq ?? 0, clarity: clarity ?? 0 });
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
          for (const o of out ?? []) {
            midi?.sendOut(o);
            if (o.part === 'chord' && chordEl) chordEl.textContent = o.type === 'on' ? o.notes.map(midiToName).join(' ') : '';
          }
          applyBend(freq ?? 0);
          for (const m of cc.update({ db: toDb(rms), centroidHz: centroid ?? 0, voiced: heldNote !== null })) midi?.sendCc(m.controller, m.value, m.channel);
          status.dataset['activo'] = '1';
          delete status.dataset['error'];
        }, select?.value || undefined, { onHit: triggers.onHit, onExample: triggers.onExample }, (state) => {
          const notice = contextNotice(state);
          if (reanudar) reanudar.hidden = !notice;
          if (notice) status.textContent = notice.message;
          else if (engine && state === 'running') status.textContent = 'Micro activo';
        });
        triggers.onEngineStart();
        engine.setSound(sound?.checked ?? true);
        applyScale();
        applyPanel(panel.state());
        engine.setMuted(keyboard.muted);
        if (settings.thresholdDb !== null) engine.setThreshold(settings.thresholdDb);
        engine.setInputGain(settings.inputGainDb);
        engine.setStickiness(settings.stickiness);
        void refreshDevices();
        if (latencyEl) latencyEl.textContent = formatLatency(engine.latency());
        setMic('Detener', true);
        status.textContent = 'Micro activo';
        hint.hidden = true;
      }
    } catch (err) {
      const kind = classifyMicError(err);
      status.textContent = MIC_ERROR_MESSAGES[kind];
      status.dataset['error'] = kind;
      setMic('Reintentar', false);
    } finally {
      button.disabled = false;
    }
  });
}

if (import.meta.env.PROD) {
  void import('./pwa').then((m) => m.registerServiceWorker());
}
