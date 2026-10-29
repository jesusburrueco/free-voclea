import { describe, expect, it } from 'vitest';
import { detectPitch } from '../src/audio/pitch';
import { measureLevel } from '../src/audio/level';
import { FEATURE_LEN, extractFeatures } from '../src/beat/features';
import { OnsetDetector } from '../src/beat/onset';
import { ANALYSIS_WINDOW, REPORT_RATE } from '../src/audio/latency';
import { noise, sine } from './fixtures/signals';

const RATE = 48000;
/** Una gama media Android se supone 6 veces mas lenta que el entorno de pruebas. */
const SLOWDOWN = 6;

function timeMs(fn: () => void, runs: number): number {
  for (let i = 0; i < 20; i++) fn();
  const t0 = performance.now();
  for (let i = 0; i < runs; i++) fn();
  return (performance.now() - t0) / runs;
}

// El centroide espectral solo se calcula con el CC de timbre activo y cuesta lo mismo que un golpe.
describe('presupuesto de CPU del worklet', () => {
  it('el trabajo de un segundo de audio cabe en el 30% de un segundo en gama media', () => {
    const win = sine(220, 0.1, 0.5, RATE).slice(0, ANALYSIS_WINDOW);
    const block = new Float32Array(128).map((_, i) => Math.sin(i / 5) * 0.3);
    const det = new OnsetDetector(RATE);
    // Peor caso: ruido sin tono obliga a YIN a recorrer todos los retardos.
    const rough = noise(0.1, 7, 0.3).slice(0, ANALYSIS_WINDOW);
    const report = timeMs(() => {
      measureLevel(rough);
      detectPitch(rough, RATE);
    }, 40);
    const perBlock = timeMs(() => void det.process(block), 2000);
    const hit = timeMs(() => void extractFeatures(win.subarray(0, FEATURE_LEN), RATE), 40);
    const blocksPerSecond = RATE / 128;
    // En el peor caso se cierran 8 golpes por segundo (tiempo muerto de 90 ms ~ 11 por segundo).
    const msPerSecond = REPORT_RATE * report + blocksPerSecond * perBlock + 8 * hit;
    const load = (msPerSecond * SLOWDOWN) / 1000;
    console.info(`informe ${report.toFixed(3)} ms, bloque ${perBlock.toFixed(5)} ms, golpe ${hit.toFixed(3)} ms, carga estimada ${(load * 100).toFixed(1)}%`);
    expect(load).toBeLessThan(0.3);
  });
});
