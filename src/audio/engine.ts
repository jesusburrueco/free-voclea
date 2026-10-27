import workletUrl from './capture-processor.ts?worker&url';
import { buildAudioConstraints } from './constraints';
import type { Level } from './level';
import { ANALYSIS_WINDOW, REPORT_RATE, estimateLatency, type LatencyReport } from './latency';
import { Synth } from './synth';

export interface Engine {
  /** Activa o silencia el sinte interno. */
  setSound(on: boolean): void;
  /** Desviacion de la voz respecto a la nota viva, en semitonos (0 para quitarla). */
  setBend(semitones: number): void;
  /** Estimacion actual de latencia extremo a extremo. */
  latency(): LatencyReport;
  stop(): Promise<void>;
}

/** Abre el micro y conecta el worklet de captura. Debe llamarse desde un gesto del usuario. */
export async function startEngine(onLevel: (level: Level) => void, deviceId?: string): Promise<Engine> {
  // iOS: el contexto debe crearse y reanudarse dentro del gesto, antes de cualquier await.
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  const resumed = ctx.resume();
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia(buildAudioConstraints(deviceId));
  } catch (err) {
    await ctx.close();
    throw err;
  }
  try {
    await resumed;
    await ctx.audioWorklet.addModule(workletUrl);
    const source = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, 'capture-processor', { numberOfOutputs: 0 });
    const synth = new Synth(ctx);
    let sound = true;
    node.port.onmessage = (e: MessageEvent<Level>) => {
      for (const ev of e.data.events ?? []) {
        if (ev.type === 'on' && sound) synth.noteOn(ev.note);
        else if (ev.type === 'off') synth.noteOff();
      }
      onLevel(e.data);
    };
    source.connect(node);
    return {
      latency() {
        const track = stream.getAudioTracks()[0];
        const settings = track?.getSettings() as MediaTrackSettings & { latency?: number };
        return estimateLatency({
          baseLatency: ctx.baseLatency,
          outputLatency: ctx.outputLatency,
          inputLatency: settings?.latency ?? 0,
          sampleRate: ctx.sampleRate,
          windowFrames: ANALYSIS_WINDOW,
          reportHz: REPORT_RATE,
        });
      },
      setSound(on) {
        sound = on;
        if (!on) synth.noteOff();
      },
      setBend(semitones) {
        synth.setBend(semitones);
      },
      async stop() {
        node.port.onmessage = null;
        synth.dispose();
        source.disconnect();
        stream.getTracks().forEach((t) => t.stop());
        await ctx.close();
      },
    };
  } catch (err) {
    stream.getTracks().forEach((t) => t.stop());
    await ctx.close();
    throw err;
  }
}
