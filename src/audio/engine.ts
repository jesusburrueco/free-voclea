import workletUrl from './capture-processor.ts?worker&url';
import { buildAudioConstraints } from './constraints';
import type { Level } from './level';
import { ANALYSIS_WINDOW, REPORT_RATE, estimateLatency, type LatencyReport } from './latency';
import { NoteMapper } from './quantizer';
import { OutputRouter, defaultOutputSettings, type OutEvent, type OutputSettings } from './router';
import { DrumKit } from './drums';
import type { Example } from '../beat/knn';
import { Synth, getPreset } from './synth';

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
  /** Umbral de entrada para abrir una nota, en dBFS. */
  setThreshold(db: number): void;
  /** Activa el calculo del centroide espectral (solo hace falta para el CC de timbre). */
  setCentroid(on: boolean): void;
  /** Pegajosidad de la nota, 0..1. */
  setStickiness(value: number): void;
  /** Ganancia de entrada en dB. */
  setInputGain(db: number): void;
  /** Voz del kit interno para un slot. */
  setVoices(voices: readonly string[]): void;
  /** Activa o silencia el sinte interno. */
  setSound(on: boolean): void;
  /** Desviacion de la voz respecto a la nota viva, en semitonos (0 para quitarla). */
  setBend(semitones: number, parts?: { melody: boolean; chords: boolean }): void;
  /** Estimacion actual de latencia extremo a extremo. */
  latency(): LatencyReport;
  /** Ajustes de salida (melodia, acordes, octava, rango, canales). Devuelve los note off de lo que sonaba. */
  setOutput(settings: OutputSettings): OutEvent[];
  /** Presets de sinte interno por salida. */
  setPresets(melody: string, chord: string): void;
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
    const chordSynth = new Synth(ctx, getPreset('puro'));
    const router = new OutputRouter();
    router.setSettings(defaultOutputSettings);
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
      const out = router.process(events);
      for (const ev of out) {
        const target = ev.part === 'melody' ? synth : chordSynth;
        if (ev.type === 'on' && sound) target.noteOn(ev.notes);
        else if (ev.type === 'off') target.noteOff();
      }
      e.data.out = out;
      onLevel(e.data);
    };
    const inputGain = ctx.createGain();
    source.connect(inputGain).connect(node);
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
      setCentroid(on) {
        node.port.postMessage({ type: 'centroid', value: on });
      },
      setStickiness(value) {
        node.port.postMessage({ type: 'stickiness', value });
      },
      setInputGain(db) {
        inputGain.gain.value = 10 ** (db / 20);
      },
      setThreshold(db) {
        node.port.postMessage({ type: 'threshold', db });
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
        if (!on) {
          synth.noteOff();
          chordSynth.noteOff();
        }
      },
      setOutput(settings) {
        const off = router.setSettings(settings);
        synth.noteOff();
        chordSynth.noteOff();
        return off;
      },
      setPresets(melody, chord) {
        synth.setPreset(getPreset(melody));
        chordSynth.setPreset(getPreset(chord));
      },
      setScale(tonic, scaleId) {
        mapper.setScale(tonic, scaleId);
        router.setScale(tonic, scaleId);
      },
      setMuted(pcs) {
        mapper.setMuted(pcs);
      },
      setBend(semitones, parts = { melody: true, chords: false }) {
        synth.setBend(parts.melody ? semitones : 0);
        chordSynth.setBend(parts.chords ? semitones : 0);
      },
      async stop() {
        node.port.onmessage = null;
        synth.dispose();
        chordSynth.dispose();
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
