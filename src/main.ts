import './style.css';
import { toDb } from './audio/level';
import { classifyMicError, isMicSupported, MIC_ERROR_MESSAGES } from './audio/mic-error';
import { resolveDeviceId, toInputDevices } from './audio/constraints';
import { midiToName, freqToMidi } from './notes';
import { SCALES } from './scales';
import { BEND_CENTER, BEND_MODES, BEND_TARGETS, bendAffects, bendForMode, type BendMode, type BendTarget, BEND_RANGE_DEFAULT, BEND_RANGE_MAX, BEND_RANGE_MIN, bendValue, clampBendRange } from './audio/bend';
import { formatLatency } from './audio/latency';
import { isMidiSupported, MidiOutput } from './midi/output';
import type { Engine } from './audio/engine';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.innerHTML = `
    <main>
      <h1>Voz a MIDI</h1>
      <p>Canta o haz beatbox y conviertelo en notas.</p>
      <p id="permiso">Para empezar necesitamos usar el micro. El audio se procesa en tu dispositivo y no se envia a ningun sitio.</p>
      <button id="mic" type="button">Activar micro</button>
      <label for="entrada">Entrada de audio</label>
      <select id="entrada" aria-label="Entrada de audio"><option value="">Predeterminada</option></select>
      <meter id="nivel" min="-100" max="0" value="-100" aria-label="Nivel de entrada"></meter>
      <label class="sonido"><input id="sonido" type="checkbox" checked /> Sonido interno</label>
      <section aria-label="Salida MIDI">
        <button id="midi" type="button">Activar MIDI</button>
        <label for="puerto">Puerto MIDI</label>
        <select id="puerto" aria-label="Puerto MIDI" disabled><option value="">Sin puerto</option></select>
        <p id="midi-estado" aria-live="polite"></p>
      </section>
      <section aria-label="Tonalidad y escala">
        <label for="tonica">Tonalidad</label>
        <select id="tonica" aria-label="Tonalidad">${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map((n, i) => `<option value="${i}">${n}</option>`).join('')}</select>
        <label for="escala">Escala</label>
        <select id="escala" aria-label="Escala">${SCALES.map((sc) => `<option value="${sc.id}">${sc.name}</option>`).join('')}</select>
      </section>
      <section aria-label="Pitch bend">
        <label for="bend">Pitch bend a</label>
        <select id="bend" aria-label="Destino del pitch bend">${BEND_TARGETS.map((t) => `<option value="${t.id}">${t.name}</option>`).join('')}</select>
        <label for="modo-bend">Modo de bend</label>
        <select id="modo-bend" aria-label="Modo de bend">${BEND_MODES.map((m) => `<option value="${m.id}">${m.name}</option>`).join('')}</select>
        <label for="rango">Rango de bend (semitonos)</label>
        <input id="rango" type="number" inputmode="numeric" min="${BEND_RANGE_MIN}" max="${BEND_RANGE_MAX}" step="1" value="${BEND_RANGE_DEFAULT}" />
      </section>
      <section aria-label="Latencia">
        <p id="latencia" aria-live="off">Latencia: activa el micro para medirla.</p>
      </section>
      <p id="nota" aria-label="Nota detectada"></p>
      <p id="estado" role="status"></p>
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
  const rangeIn = app.querySelector<HTMLInputElement>('#rango');
  let heldNote: number | null = null;
  const bendRange = (): number => clampBendRange(Number(rangeIn?.value));
  const applyBend = (freq: number): void => {
    if (!bendAffects((bendSel?.value ?? 'ninguno') as BendTarget, 'melodia') || heldNote === null || freq <= 0) return;
    const midiNow = freqToMidi(freq);
    anchor ??= midiNow;
    const st = bendForMode((bendModeSel?.value ?? 'fiel') as BendMode, midiNow, heldNote, anchor, bendRange());
    engine?.setBend(st);
    midi?.sendBend(bendValue(st, bendRange()));
  };
  const resetBend = (): void => {
    anchor = null;
    engine?.setBend(0);
    midi?.sendBend(BEND_CENTER);
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
        heldNote = null;
        midi?.allNotesOff();
        meter.value = -100;
        button.textContent = 'Activar micro';
        if (latencyEl) latencyEl.textContent = 'Latencia: activa el micro para medirla.';
        status.textContent = '';
        hint.hidden = false;
      } else {
        const { startEngine } = await import('./audio/engine');
        engine = await startEngine(({ rms, freq, events }) => {
          meter.value = toDb(rms);
          for (const ev of events ?? []) {
            if (ev.type === 'on') {
              heldNote = ev.note;
              resetBend();
            } else if (ev.note === heldNote) heldNote = null;
            midi?.send(ev);
            if (noteEl && ev.type === 'on') noteEl.textContent = midiToName(ev.note);
          }
          applyBend(freq ?? 0);
          status.dataset['activo'] = '1';
          delete status.dataset['error'];
        }, select?.value || undefined);
        engine.setSound(sound?.checked ?? true);
        applyScale();
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
