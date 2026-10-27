import { describe, expect, it } from 'vitest';
import { estimateLatency, formatLatency } from '../src/audio/latency';

const base = { baseLatency: 0.01, outputLatency: 0.02, inputLatency: 0.005, sampleRate: 48000, windowFrames: 2048, reportHz: 30 };

describe('estimateLatency', () => {
  it('suma entrada, analisis, informe y salida', () => {
    const r = estimateLatency(base);
    expect(r.inputMs).toBeCloseTo(15, 6);
    expect(r.analysisMs).toBeCloseTo((2048 / 48000) * 1000, 6);
    expect(r.reportMs).toBeCloseTo(500 / 30, 6);
    expect(r.outputMs).toBeCloseTo(20, 6);
    expect(r.totalMs).toBeCloseTo(r.inputMs + r.analysisMs + r.reportMs + r.outputMs, 6);
  });
  it('usa baseLatency como salida si outputLatency no se conoce', () => {
    expect(estimateLatency({ ...base, outputLatency: 0 }).outputMs).toBeCloseTo(10, 6);
  });
  it('ignora valores no validos', () => {
    const r = estimateLatency({ ...base, baseLatency: NaN, outputLatency: -1, inputLatency: Infinity });
    expect(r.inputMs).toBe(0);
    expect(r.outputMs).toBe(0);
    expect(Number.isFinite(r.totalMs)).toBe(true);
  });
  it('formatea el resumen', () => {
    expect(formatLatency(estimateLatency(base))).toMatch(/^Latencia estimada \d+ ms \(entrada 15 ms/);
  });
});
