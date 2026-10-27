import workletUrl from './capture-processor.ts?worker&url';
import { buildAudioConstraints } from './constraints';
import type { Level } from './level';
import { Synth } from './synth';

export interface Engine {
  /** Activa o silencia el sinte interno. */
  setSound(on: boolean): void;
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
      setSound(on) {
        sound = on;
        if (!on) synth.noteOff();
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
