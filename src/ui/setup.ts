import { CALIBRATION_STEPS, finishCalibration, type CalibrationFrame, type CalibrationResult, type CalibrationStep } from '../calibration';
import {
  IdbProfileStore,
  MemoryProfileStore,
  applyProfile,
  captureProfile,
  cleanName,
  parseProfile,
  serializeProfile,
  type ProfileStore,
} from '../profiles';
import { midiToName } from '../notes';

export const STEP_MS = 3000;

interface Deps {
  /** True si el micro esta activo. */
  active: () => boolean;
  onCalibrated: (r: CalibrationResult) => void;
  /** Recarga la pagina tras cargar un perfil (se inyecta para poder probarlo). */
  reload?: () => void;
}

function makeStore(): ProfileStore {
  return typeof indexedDB === 'undefined' ? new MemoryProfileStore() : new IdbProfileStore();
}

/** Perfiles guardados (IndexedDB, exportar e importar JSON) y calibracion guiada del micro y del rango vocal. */
export function mountSetup(host: HTMLElement, deps: Deps): { feed(frame: CalibrationFrame): void } {
  const store = makeStore();
  host.innerHTML = `
    <h3>Calibracion</h3>
    <p>Mide el ruido de tu sala y tu rango de voz para ajustar el umbral y el rango de notas.</p>
    <button id="cal-iniciar" type="button">Calibrar</button>
    <p id="cal-estado" aria-live="polite"></p>
    <h3>Perfiles</h3>
    <label for="perfil-nombre">Nombre del perfil</label>
    <input id="perfil-nombre" type="text" maxlength="40" />
    <button id="perfil-guardar" type="button">Guardar perfil</button>
    <label for="perfil-lista">Perfiles guardados</label>
    <select id="perfil-lista" aria-label="Perfiles guardados"></select>
    <button id="perfil-cargar" type="button" aria-label="Cargar perfil">Cargar perfil</button>
    <button id="perfil-borrar" type="button" aria-label="Borrar perfil">Borrar perfil</button>
    <button id="perfil-exportar" type="button" aria-label="Exportar perfil">Exportar perfil</button>
    <label for="perfil-importar">Importar perfil (.json)</label>
    <input id="perfil-importar" type="file" accept="application/json,.json" />
    <p id="perfil-estado" aria-live="polite"></p>`;
  const q = <T extends HTMLElement>(id: string): T => host.querySelector<T>(`#${id}`) as T;
  const calBtn = q<HTMLButtonElement>('cal-iniciar');
  const calStatus = q<HTMLParagraphElement>('cal-estado');
  const nameIn = q<HTMLInputElement>('perfil-nombre');
  const list = q<HTMLSelectElement>('perfil-lista');
  const pStatus = q<HTMLParagraphElement>('perfil-estado');

  let step: number | null = null;
  let frames: Record<CalibrationStep, CalibrationFrame[]> = { silencio: [], grave: [], agudo: [] };
  let timer: ReturnType<typeof setTimeout> | undefined;

  const advance = (): void => {
    step = step === null ? 0 : step + 1;
    const s = CALIBRATION_STEPS[step];
    if (!s) {
      const r = finishCalibration(frames);
      step = null;
      calBtn.disabled = false;
      calStatus.textContent = r.range
        ? `Listo: umbral ${r.thresholdDb} dB, notas de ${midiToName(r.range.low)} a ${midiToName(r.range.high)}.`
        : `Umbral ${r.thresholdDb} dB. No se pudo medir tu rango; repite y sostén las notas.`;
      deps.onCalibrated(r);
      return;
    }
    calStatus.textContent = s.text;
    timer = setTimeout(advance, STEP_MS);
  };
  calBtn.addEventListener('click', () => {
    if (!deps.active()) {
      calStatus.textContent = 'Activa el micro para calibrar.';
      return;
    }
    frames = { silencio: [], grave: [], agudo: [] };
    calBtn.disabled = true;
    clearTimeout(timer);
    step = null;
    advance();
  });

  const refresh = async (select?: string): Promise<void> => {
    try {
      const names = await store.list();
      list.replaceChildren(...names.map((n) => new Option(n, n)));
      if (select && names.includes(select)) list.value = select;
    } catch {
      pStatus.textContent = 'No se pudo leer el almacenamiento de perfiles.';
    }
  };
  void refresh();

  q<HTMLButtonElement>('perfil-guardar').addEventListener('click', async () => {
    const name = cleanName(nameIn.value);
    if (!name) {
      pStatus.textContent = 'Escribe un nombre para el perfil.';
      return;
    }
    try {
      await store.put(captureProfile(name, localStorage));
      pStatus.textContent = `Perfil "${name}" guardado.`;
      await refresh(name);
    } catch {
      pStatus.textContent = 'No se pudo guardar el perfil.';
    }
  });
  q<HTMLButtonElement>('perfil-cargar').addEventListener('click', async () => {
    const p = list.value ? await store.get(list.value) : undefined;
    if (!p) {
      pStatus.textContent = 'Elige un perfil.';
      return;
    }
    applyProfile(p, localStorage);
    (deps.reload ?? (() => location.reload()))();
  });
  q<HTMLButtonElement>('perfil-borrar').addEventListener('click', async () => {
    if (!list.value) return;
    await store.remove(list.value);
    pStatus.textContent = `Perfil "${list.value}" borrado.`;
    await refresh();
  });
  q<HTMLButtonElement>('perfil-exportar').addEventListener('click', async () => {
    const p = list.value ? await store.get(list.value) : captureProfile(nameIn.value || 'Perfil', localStorage);
    if (!p) return;
    const url = URL.createObjectURL(new Blob([serializeProfile(p)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pStatus.textContent = `Perfil "${p.name}" exportado.`;
  });
  q<HTMLInputElement>('perfil-importar').addEventListener('change', async (e) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const p = parseProfile(await file.text());
    if (!p) {
      pStatus.textContent = 'El archivo no es un perfil valido.';
      return;
    }
    await store.put(p);
    pStatus.textContent = `Perfil "${p.name}" importado.`;
    await refresh(p.name);
    input.value = '';
  });

  return {
    feed(frame) {
      const s = step === null ? undefined : CALIBRATION_STEPS[step];
      if (s) frames[s.id].push(frame);
    },
  };
}
