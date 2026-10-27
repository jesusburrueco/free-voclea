import './style.css';
import { toDb } from './audio/level';
import type { Engine } from './audio/engine';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  app.innerHTML = `
    <main>
      <h1>Voz a MIDI</h1>
      <p>Canta o haz beatbox y conviertelo en notas.</p>
      <button id="mic" type="button">Activar micro</button>
      <meter id="nivel" min="-100" max="0" value="-100" aria-label="Nivel de entrada"></meter>
      <p id="estado" role="status"></p>
    </main>
  `;
  const button = app.querySelector<HTMLButtonElement>('#mic');
  const meter = app.querySelector<HTMLMeterElement>('#nivel');
  const status = app.querySelector<HTMLParagraphElement>('#estado');
  let engine: Engine | null = null;

  button?.addEventListener('click', async () => {
    if (!button || !meter || !status) return;
    button.disabled = true;
    try {
      if (engine) {
        await engine.stop();
        engine = null;
        meter.value = -100;
        button.textContent = 'Activar micro';
        status.textContent = '';
      } else {
        const { startEngine } = await import('./audio/engine');
        engine = await startEngine(({ rms }) => {
          meter.value = toDb(rms);
          status.dataset['activo'] = '1';
        });
        button.textContent = 'Detener';
        status.textContent = 'Micro activo';
      }
    } catch {
      status.textContent = 'No se pudo abrir el micro';
    } finally {
      button.disabled = false;
    }
  });
}

if (import.meta.env.PROD) {
  void import('./pwa').then((m) => m.registerServiceWorker());
}
