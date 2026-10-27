import workletUrl from './capture-processor.ts?worker&url';
import { buildAudioConstraints } from './constraints';
import type { Level } from './level';
import { ANALYSIS_WINDOW, REPORT_RATE, estimateLatency, type LatencyReport } from './latency';
import { NoteMapper } from './quantizer';
import { DrumKit } from './drums';
import type { Example } from '../beat/knn';
import { Synth } from './synth';

export interface TriggerHandlers {
  /** Golpe reconocido: indice de slot y velocidad MIDI. */
  onHit(slot: number, velocity: number): void;
  /** Ejemplo capturado mientras hay un slot armado. */
  onExample(slot: number, vec: number[]): void;
}

export interface Engine {
  /** Ejemplos de entrenamiento del clasificador. */
  setExamples(examples: Example[]): void;
  /** Slot que recibe los proximos golpes como ejemplos (null = clasificar). */
  arm(slot: number | null): void;
  /** Sensibilidad 0..1 del detector de golpes. */
  setSensitivity(value: number): void;
  setTriggersEnabled(on: boolean): void;
  /** Voz del kit interno para un slot. */
  setVoices(voices: readonly string[]): void;
  /** Activa o silencia el sinte interno. */
  setSound(on: boolean): void;
  /** Desviacion de la voz respecto a la nota viva, en semitonos (0 para quitarla). */
  setBend(semitones: number): void;
  /** Estimacion actual de latencia extremo a extremo. */
  latency(): LatencyReport;
  /** Tonica (0..11) y escala a la que se cuantizan las notas. */
  setScale(tonic: number, scaleId: string): void;
  /** Clases de altura (0..11) silenciadas en la salida. */
  setMuted(pitchClasses: Iterable<number>): void;
  stop(): Promise<void>;
}

type TriggerMessage = { kind: 'hit'; slot: number; velocity: number } | { kind: 'example'; slot: number; vec: number[] };

/** Abre el micro y conecta el worklet de captura. Debe llamarse desde un gesto del usuario. */
export async function startEngine(onLevel: (level: Level) => void, deviceId?: string, triggers?: TriggerHandlers): Promise<Engine> {
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
    const mapper = new NoteMapper();
    const drums = new DrumKit(ctx);
    let voices: readonly string[] = [];
    let triggersOn = true;
    node.port.onmessage = (e: MessageEvent<Level | TriggerMessage>) => {
      if ('kind' in e.data) {
        if (e.data.kind === 'hit') {
          if (!triggersOn) return;
          const voice = voices[e.data.slot];
          if (sound && voice) drums.trigger(voice, e.data.velocity);
          triggers?.onHit(e.data.slot, e.data.velocity);
        } else triggers?.onExample(e.data.slot, e.data.vec);
        return;
      }
      const events = mapper.process(e.data.events ?? []);
      e.data.events = events;
      for (const ev of events) {
        if (ev.type === 'on' && sound) synth.noteOn(ev.note);
        else if (ev.type === 'off') synth.noteOff();
      }
      onLevel(e.data);
    };
    source.connect(node);
    return {
      setExamples(examples) {
        node.port.postMessage({ type: 'examples', examples });
      },
      arm(slot) {
        node.port.postMessage({ type: 'arm', slot });
      },
      setSensitivity(value) {
        node.port.postMessage({ type: 'sensitivity', value });
      },
      setTriggersEnabled(on) {
        triggersOn = on;
        node.port.postMessage({ type: 'enabled', value: on });
      },
      setVoices(v) {
        voices = v;
      },
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
      setScale(tonic, scaleId) {
        mapper.setScale(tonic, scaleId);
      },
      setMuted(pcs) {
        mapper.setMuted(pcs);
      },
      setBend(semitones) {
        synth.setBend(semitones);
      },
      async stop() {
        node.port.onmessage = null;
        synth.dispose();
        drums.dispose();
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
