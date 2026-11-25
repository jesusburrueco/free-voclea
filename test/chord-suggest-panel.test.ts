// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { MelodyRecorder, mountChordSuggest } from '../src/ui/chord-suggest-panel';

describe('MelodyRecorder', () => {
  it('convierte eventos on/off en notas con duracion', () => {
    const r = new MelodyRecorder();
    r.start();
    r.noteOn(60, 0);
    r.noteOff(60, 0.5);
    r.noteOn(64, 1);
    r.noteOn(67, 1.5); // legato: cierra la anterior
    expect(r.stop(2)).toEqual([
      { note: 60, dur: 0.5 },
      { note: null, dur: 0.5 },
      { note: 64, dur: 0.5 },
      { note: 67, dur: 0.5 },
    ]);
    expect(r.recording).toBe(false);
  });

  it('no guarda el silencio antes de la primera nota ni despues de la ultima', () => {
    const r = new MelodyRecorder();
    r.start();
    r.noteOn(60, 3);
    r.noteOff(60, 4);
    expect(r.stop(9)).toEqual([{ note: 60, dur: 1 }]);
  });

  it('ignora eventos fuera de grabacion y note off de otra nota', () => {
    const r = new MelodyRecorder();
    r.noteOn(60, 0);
    r.start();
    r.noteOn(62, 1);
    r.noteOff(60, 1.2);
    expect(r.stop(2)).toEqual([{ note: 62, dur: 1 }]);
  });

  it('empezar de nuevo borra la grabacion anterior', () => {
    const r = new MelodyRecorder();
    r.start();
    r.noteOn(60, 0);
    r.stop(1);
    r.start();
    expect(r.stop(2)).toEqual([]);
  });
});

describe('mountChordSuggest', () => {
  it('graba una melodia y lista un acorde por tramo', () => {
    let t = 0;
    const root = document.createElement('div');
    const panel = mountChordSuggest(root, () => ({ tonic: 0, scaleId: 'major' }), () => t);
    const btn = root.querySelector<HTMLButtonElement>('#grabar-melodia');
    btn?.click();
    expect(btn?.getAttribute('aria-pressed')).toBe('true');
    // C E G (2 s) y luego F A C (2 s) en C mayor.
    for (const n of [60, 64, 67, 65, 69, 72]) {
      panel.noteOn(n);
      t += 0.6;
      panel.noteOff(n);
      t += 0.0667;
    }
    t = 4;
    btn?.click();
    const items = [...root.querySelectorAll('#acordes-sugeridos li')].map((li) => li.getAttribute('aria-label'));
    expect(items).toEqual(['C, grado I', 'F, grado IV']);
    expect(btn?.textContent).toBe('Grabar melodia');
  });

  it('con pausas los acordes siguen el tiempo real', () => {
    let t = 0;
    const root = document.createElement('div');
    const panel = mountChordSuggest(root, () => ({ tonic: 0, scaleId: 'major' }), () => t);
    const btn = root.querySelector<HTMLButtonElement>('#grabar-melodia');
    btn?.click();
    const sing = (n: number, from: number, to: number): void => {
      t = from;
      panel.noteOn(n);
      t = to;
      panel.noteOff(n);
    };
    // Tramos de 2 s: C E (0-2), silencio (2-4), F A (4-6). Sin silencios F A caeria en el segundo tramo.
    sing(60, 0, 1);
    sing(64, 1, 2);
    sing(65, 4, 5);
    sing(69, 5, 6);
    btn?.click();
    const items = [...root.querySelectorAll('#acordes-sugeridos li')].map((li) => li.getAttribute('aria-label'));
    expect(items).toEqual(['C, grado I', 'C, grado I', 'F, grado IV']);
  });

  it('avisa si no se detectan notas', () => {
    const root = document.createElement('div');
    mountChordSuggest(root, () => ({ tonic: 0, scaleId: 'major' }), () => 0);
    const btn = root.querySelector<HTMLButtonElement>('#grabar-melodia');
    btn?.click();
    btn?.click();
    expect(root.querySelector('#estado-sugerencia')?.textContent).toContain('No se detectaron notas');
    expect(root.querySelectorAll('#acordes-sugeridos li')).toHaveLength(0);
  });
});
