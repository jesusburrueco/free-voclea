import './style.css';
import { toDb } from './audio/level';
import { classifyMicError, isMicSupported, MIC_ERROR_MESSAGES } from './audio/mic-error';
import { resolveDeviceId, toInputDevices } from './audio/constraints';
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
      <p id="estado" role="status"></p>
    </main>
  `;
  const button = app.querySelector<HTMLButtonElement>('#mic');
  const meter = app.querySelector<HTMLMeterElement>('#nivel');
  const status = app.querySelector<HTMLParagraphElement>('#estado');
  const hint = app.querySelector<HTMLParagraphElement>('#permiso');
  const select = app.querySelector<HTMLSelectElement>('#entrada');
  let engine: Engine | null = null;

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
        meter.value = -100;
        button.textContent = 'Activar micro';
        status.textContent = '';
        hint.hidden = false;
      } else {
        const { startEngine } = await import('./audio/engine');
        engine = await startEngine(({ rms }) => {
          meter.value = toDb(rms);
          status.dataset['activo'] = '1';
          delete status.dataset['error'];
        }, select?.value || undefined);
        void refreshDevices();
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
