import { RingBuffer } from './ring-buffer';
import { measureLevel } from './level';
import { detectPitch, minWindow } from './pitch';
import { NoteSegmenter } from './segmenter';
import { ANALYSIS_WINDOW, REPORT_RATE } from './latency';

declare class AudioWorkletProcessor {
  readonly port: MessagePort;
  constructor();
}
declare function registerProcessor(name: string, ctor: new () => AudioWorkletProcessor): void;
declare const sampleRate: number;

const WINDOW = ANALYSIS_WINDOW;
const REPORT_HZ = REPORT_RATE;

class CaptureProcessor extends AudioWorkletProcessor {
  private readonly ring = new RingBuffer(sampleRate * 2);
  private readonly window = new Float32Array(WINDOW);
  private readonly segmenter = new NoteSegmenter();
  private sinceReport = 0;

  process(inputs: Float32Array[][]): boolean {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    this.ring.write(channel);
    this.sinceReport += channel.length;
    if (this.sinceReport >= sampleRate / REPORT_HZ) {
      this.sinceReport = 0;
      const n = this.ring.readLatest(this.window);
      const { rms, peak } = measureLevel(this.window.subarray(WINDOW - n));
      const { freq, clarity } = n >= minWindow(sampleRate) ? detectPitch(this.window.subarray(WINDOW - n), sampleRate) : { freq: 0, clarity: 0 };
      const events = this.segmenter.update({ rms, freq, clarity }, 1000 / REPORT_HZ);
      this.port.postMessage({ rms, peak, freq, clarity, events });
    }
    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);
