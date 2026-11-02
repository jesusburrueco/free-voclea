/** Parametros del worklet de captura, compartidos con la estimacion de latencia. */
export const ANALYSIS_WINDOW = 2048;
export const REPORT_RATE = 30;

export interface LatencyInputs {
  /** AudioContext.baseLatency en segundos (0 si el navegador no lo da). */
  baseLatency: number;
  /** AudioContext.outputLatency en segundos (0 si no se conoce). */
  outputLatency: number;
  /** Latencia de entrada del track en segundos (settings.latency; 0 si no se conoce). */
  inputLatency: number;
  sampleRate: number;
  /** Muestras de la ventana de analisis del worklet. */
  windowFrames: number;
  /** Frecuencia de informes del worklet al hilo principal. */
  reportHz: number;
}

export interface LatencyReport {
  inputMs: number;
  /** Retardo del analisis: la nota solo se confirma cuando la ventana se ha llenado. */
  analysisMs: number;
  /** Espera media hasta el siguiente informe del worklet. */
  reportMs: number;
  outputMs: number;
  totalMs: number;
}

const finite = (n: number): number => (Number.isFinite(n) && n > 0 ? n : 0);

/** Estimacion extremo a extremo (entrada + analisis + informe + salida) a partir de los valores que da el navegador. */
export function estimateLatency(i: LatencyInputs): LatencyReport {
  const inputMs = (finite(i.inputLatency) + finite(i.baseLatency)) * 1000;
  const analysisMs = i.sampleRate > 0 ? (finite(i.windowFrames) / i.sampleRate) * 1000 : 0;
  const reportMs = i.reportHz > 0 ? 500 / i.reportHz : 0;
  const outputMs = (finite(i.outputLatency) || finite(i.baseLatency)) * 1000;
  return { inputMs, analysisMs, reportMs, outputMs, totalMs: inputMs + analysisMs + reportMs + outputMs };
}

export function formatLatency(r: LatencyReport): string {
  const ms = (n: number): string => `${Math.round(n)} ms`;
  return `Latencia estimada ${ms(r.totalMs)} (entrada ${ms(r.inputMs)}, analisis ${ms(r.analysisMs)}, informe ${ms(r.reportMs)}, salida ${ms(r.outputMs)})`;
}
