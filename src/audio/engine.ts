import workletUrl from './capture-processor.ts?worker&url';
import type { Level } from './level';

export interface Engine {
  stop(): Promise<void>;
}

/** Abre el micro y conecta el worklet de captura. Debe llamarse desde un gesto del usuario. */
export async function startEngine(onLevel: (level: Level) => void): Promise<Engine> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext({ latencyHint: 'interactive' });
  try {
    await ctx.resume();
    await ctx.audioWorklet.addModule(workletUrl);
    const source = ctx.createMediaStreamSource(stream);
    const node = new AudioWorkletNode(ctx, 'capture-processor', { numberOfOutputs: 0 });
    node.port.onmessage = (e: MessageEvent<Level>) => onLevel(e.data);
    source.connect(node);
    return {
      async stop() {
        node.port.onmessage = null;
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
