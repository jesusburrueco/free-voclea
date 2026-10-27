import { RingBuffer } from './ring-buffer';
import { measureLevel, toDb } from './level';
import { OnsetDetector, dbToVelocity, sensitivityToRise } from '../beat/onset';
import { FEATURE_LEN, extractFeatures, spectralCentroidHz } from '../beat/features';
import { KnnClassifier, type Example } from '../beat/knn';
import { detectPitch, minWindow } from './pitch';
import { NoteSegmenter } from './segmenter';
import { ANALYSIS_WINDOW, REPORT_RATE } from './latency';

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
}
declare function registerProcessor(name: string, ctor: new () => AudioWorkletProcessor): void;
declare const sampleRate: number;

type WorkletCommand =
  | { type: 'examples'; examples: Example[] }
  | { type: 'arm'; slot: number | null }
  | { type: 'sensitivity'; value: number }
  | { type: 'enabled'; value: boolean }
  | { type: 'threshold'; db: number }
  | { type: 'stickiness'; value: number }
  | { type: 'centroid'; value: boolean };

const WINDOW = ANALYSIS_WINDOW;
const REPORT_HZ = REPORT_RATE;

class CaptureProcessor extends AudioWorkletProcessor {
  private readonly ring = new RingBuffer(sampleRate * 2);
  private readonly window = new Float32Array(WINDOW);
  private readonly segmenter = new NoteSegmenter();
  private sinceReport = 0;
  private readonly onset = new OnsetDetector(sampleRate);
  private readonly knn = new KnnClassifier();
  private readonly hitWindow = new Float32Array(FEATURE_LEN);
  private pending = -1;
  private armed: number | null = null;
  private triggersOn = true;
  private centroidOn = false;

  constructor() {
    super();
    this.port.onmessage = (e: MessageEvent<WorkletCommand>) => {
      const c = e.data;
      if (c.type === 'examples') this.knn.setExamples(c.examples);
      else if (c.type === 'arm') this.armed = c.slot;
      else if (c.type === 'sensitivity') this.onset.setOptions({ riseDb: sensitivityToRise(c.value) });
      else if (c.type === 'enabled') this.triggersOn = c.value;
      else if (c.type === 'centroid') this.centroidOn = c.value;
      else if (c.type === 'stickiness') this.segmenter.setOptions({ stickiness: c.value });
      else if (c.type === 'threshold') this.segmenter.setOptions({ thresholdDb: c.db });
    };
  }

  /** Cierra la captura de un golpe: rasgos, velocidad y clasificacion (o ejemplo de entrenamiento). */
  private finishHit(): void {
    if (this.ring.readLatest(this.hitWindow) < FEATURE_LEN) return;
    const vec = Array.from(extractFeatures(this.hitWindow, sampleRate));
    const velocity = dbToVelocity(toDb(measureLevel(this.hitWindow).peak));
    if (this.armed !== null) {
      this.port.postMessage({ kind: 'example', slot: this.armed, vec });
      return;
    }
    const res = this.knn.classify(vec);
    if (res) this.port.postMessage({ kind: 'hit', slot: res.slot, velocity });
  }

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    this.ring.write(channel);
    if (this.pending >= 0) {
      this.pending -= channel.length;
      if (this.pending <= 0) {
        this.pending = -1;
        this.finishHit();
      }
    } else if (this.onset.process(channel) && (this.triggersOn || this.armed !== null)) this.pending = FEATURE_LEN - channel.length;
    this.sinceReport += channel.length;
    if (this.sinceReport >= sampleRate / REPORT_HZ) {
      this.sinceReport = 0;
      const n = this.ring.readLatest(this.window);
      const { rms, peak } = measureLevel(this.window.subarray(WINDOW - n));
      const { freq, clarity } = n >= minWindow(sampleRate) ? detectPitch(this.window.subarray(WINDOW - n), sampleRate) : { freq: 0, clarity: 0 };
      const events = this.segmenter.update({ rms, freq, clarity }, 1000 / REPORT_HZ);
      const centroid = this.centroidOn && n >= FEATURE_LEN && rms > 0.003 ? spectralCentroidHz(this.window.subarray(WINDOW - n), sampleRate) : 0;
      this.port.postMessage({ rms, peak, freq, clarity, events, centroid });
    }
    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);
