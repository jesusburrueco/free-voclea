import { describe, expect, it } from 'vitest';
import { NoteSegmenter, type FrameInput, type NoteEvent } from '../src/audio/segmenter';
import { midiToFreq } from '../src/notes';

const DT = 10;
const loud = (midi: number): FrameInput => ({ rms: 0.1, freq: midiToFreq(midi), clarity: 0.95 });
const quiet = (midi: number): FrameInput => ({ rms: 0.0035, freq: midiToFreq(midi), clarity: 0.95 });
const silence: FrameInput = { rms: 0, freq: 0, clarity: 0 };

function run(seg: NoteSegmenter, frame: FrameInput, ms: number): NoteEvent[] {
  const out: NoteEvent[] = [];
  for (let t = 0; t < ms; t += DT) out.push(...seg.update(frame, DT));
  return out;
}

describe('NoteSegmenter', () => {
  it('abre y cierra una nota', () => {
    const seg = new NoteSegmenter();
    expect(run(seg, loud(60), 200)).toEqual([{ type: 'on', note: 60 }]);
    expect(run(seg, silence, 200)).toEqual([{ type: 'off', note: 60 }]);
    expect(seg.activeNote).toBeNull();
  });

  it('ignora rafagas mas cortas que onMs', () => {
    const seg = new NoteSegmenter();
    expect(run(seg, loud(60), 20)).toEqual([]);
    expect(run(seg, silence, 200)).toEqual([]);
  });

  it('no abre por debajo del umbral ni con claridad baja', () => {
    const seg = new NoteSegmenter();
    expect(run(seg, { rms: 0.001, freq: 261, clarity: 0.95 }, 300)).toEqual([]);
    expect(run(seg, { rms: 0.1, freq: 261, clarity: 0.3 }, 300)).toEqual([]);
  });

  it('histeresis de nivel: una nota abierta sobrevive entre umbral y umbral - releaseDb', () => {
    const seg = new NoteSegmenter();
    run(seg, loud(60), 100);
    // 0.0035 rms = -49 dB: bajo el limite de cierre (-46 dB)
    expect(run(seg, quiet(60), 300)).toEqual([{ type: 'off', note: 60 }]);
    const seg2 = new NoteSegmenter();
    run(seg2, loud(60), 100);
    // 0.007 rms = -43 dB: dentro de la banda de histeresis
    expect(run(seg2, { rms: 0.007, freq: midiToFreq(60), clarity: 0.95 }, 300)).toEqual([]);
    expect(seg2.activeNote).toBe(60);
    // y desde cerrado no abre con ese nivel
    const seg3 = new NoteSegmenter();
    expect(run(seg3, { rms: 0.007, freq: midiToFreq(60), clarity: 0.95 }, 300)).toEqual([]);
  });

  it('vibrato dentro de la pegajosidad no cambia de nota', () => {
    const seg = new NoteSegmenter();
    run(seg, loud(60), 100);
    const ev: NoteEvent[] = [];
    for (let i = 0; i < 100; i++) ev.push(...seg.update(loud(60 + 0.6 * Math.sin(i / 3)), DT));
    expect(ev).toEqual([]);
  });

  it('cambia de nota solo si se sostiene changeMs', () => {
    const seg = new NoteSegmenter();
    run(seg, loud(60), 100);
    expect(run(seg, loud(62), 30)).toEqual([]);
    expect(run(seg, loud(60), 100)).toEqual([]);
    expect(run(seg, loud(62), 100)).toEqual([
      { type: 'off', note: 60 },
      { type: 'on', note: 62 },
    ]);
  });

  it('una caida breve de tono no corta la nota', () => {
    const seg = new NoteSegmenter();
    run(seg, loud(60), 100);
    expect(run(seg, silence, 40)).toEqual([]);
    expect(run(seg, loud(60), 100)).toEqual([]);
    expect(seg.activeNote).toBe(60);
  });

  it('reset cierra la nota activa', () => {
    const seg = new NoteSegmenter();
    run(seg, loud(64), 100);
    expect(seg.reset()).toEqual([{ type: 'off', note: 64 }]);
    expect(seg.reset()).toEqual([]);
  });
});
