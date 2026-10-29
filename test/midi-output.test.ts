import { describe, expect, it } from 'vitest';
import { isMidiSupported, MidiOutput, noteMessage } from '../src/midi/output';

function fake(ids: string[]) {
  const sent: Record<string, number[][]> = {};
  const outputs = ids.map((id) => {
    sent[id] = [];
    return { id, name: `Puerto ${id.toUpperCase()}`, send: (d: number[]) => void sent[id]?.push(d) };
  });
  const access = { outputs: { values: () => outputs }, onstatechange: null as ((e: unknown) => void) | null };
  return { access, sent, outputs };
}

describe('noteMessage', () => {
  it('codifica note on y off con canal', () => {
    expect(noteMessage({ type: 'on', note: 60 })).toEqual([0x90, 60, 100]);
    expect(noteMessage({ type: 'off', note: 60 }, 3)).toEqual([0x82, 60, 0]);
  });
  it('acota canal y nota', () => {
    expect(noteMessage({ type: 'on', note: 200 }, 99)[0]).toBe(0x9f);
    expect(noteMessage({ type: 'on', note: -5 }, 0)).toEqual([0x90, 0, 100]);
  });
});

describe('MidiOutput', () => {
  it('detecta soporte y reporta no soportado o denegado', async () => {
    expect(isMidiSupported({})).toBe(false);
    expect(await MidiOutput.request({})).toEqual({ ok: false, reason: 'unsupported' });
    const denied = await MidiOutput.request({ requestMIDIAccess: () => Promise.reject(new Error('x')) });
    expect(denied).toEqual({ ok: false, reason: 'denied' });
    const ok = await MidiOutput.request({ requestMIDIAccess: () => Promise.resolve(fake(['a']).access) });
    expect(ok.ok).toBe(true);
  });
  it('lista puertos y no envia sin puerto elegido', () => {
    const { access, sent } = fake(['a', 'b']);
    const m = new MidiOutput(access);
    expect(m.ports().map((p) => p.id)).toEqual(['a', 'b']);
    m.send({ type: 'on', note: 60 });
    expect(sent['a']).toEqual([]);
  });
  it('envia al puerto elegido y corta notas al cambiar de puerto', () => {
    const { access, sent } = fake(['a', 'b']);
    const m = new MidiOutput(access);
    m.select('a');
    m.send({ type: 'on', note: 60 });
    m.select('b');
    expect(sent['a']).toEqual([[0x90, 60, 100], [0x80, 60, 0], [0xe0, 0, 64]]);
    m.send({ type: 'on', note: 62 });
    expect(sent['b']).toEqual([[0x90, 62, 100]]);
  });
  it('un puerto inexistente deja la salida sin seleccion', () => {
    const m = new MidiOutput(fake(['a']).access);
    m.select('zzz');
    expect(m.selectedId).toBeNull();
  });
  it('si el puerto desaparece se deselecciona y avisa', () => {
    const f = fake(['a']);
    const m = new MidiOutput(f.access);
    m.select('a');
    let called = 0;
    m.onPortsChange(() => called++);
    f.outputs.length = 0;
    f.access.onstatechange?.({});
    expect(m.selectedId).toBeNull();
    expect(called).toBe(1);
  });
});
