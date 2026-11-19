import { describe, expect, it } from 'vitest';
import {
  MAX_PROFILE_NAME,
  MemoryProfileStore,
  applyProfile,
  captureProfile,
  duplicateProfile,
  parseProfile,
  requestPersistence,
  serializeProfile,
  uniqueName,
} from '../src/profiles';
import { defaultSettings, sanitizeSettings } from '../src/settings';

const mem = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

describe('perfiles', () => {
  it('captura, serializa, importa y aplica', () => {
    const src = mem({ salida: '{"output":{"octave":2}}', ajustes: '{"tonic":5}', triggers: 'no es json' });
    const p = captureProfile('  Mi perfil  ', src);
    expect(p.name).toBe('Mi perfil');
    expect(Object.keys(p.data).sort()).toEqual(['ajustes', 'salida']);
    const back = parseProfile(serializeProfile(p));
    expect(back).toEqual(p);
    const dst = mem();
    if (back) applyProfile(back, dst);
    expect(JSON.parse(dst.m.get('salida') ?? 'null')).toEqual({ output: { octave: 2 } });
    expect(dst.m.has('triggers')).toBe(false);
  });
  it('rechaza importaciones invalidas', () => {
    expect(parseProfile('x')).toBeNull();
    expect(parseProfile('[]')).toBeNull();
    expect(parseProfile('{"version":9,"name":"a","data":{}}')).toBeNull();
    expect(parseProfile('{"version":1,"name":"  ","data":{}}')).toBeNull();
    expect(parseProfile('{"version":1,"name":"a","data":{"salida":5,"otro":{}}}')?.data).toEqual({});
  });
  it('el almacen guarda, lista ordenado y borra', async () => {
    const s = new MemoryProfileStore();
    await s.put({ version: 1, name: 'b', data: {} });
    await s.put({ version: 1, name: 'a', data: {} });
    expect(await s.list()).toEqual(['a', 'b']);
    await s.remove('a');
    expect(await s.get('a')).toBeUndefined();
    expect((await s.get('b'))?.name).toBe('b');
  });
  it('uniqueName no pisa perfiles existentes ni pasa del maximo', () => {
    expect(uniqueName('Voz', [])).toBe('Voz');
    expect(uniqueName('  Voz ', ['Voz'])).toBe('Voz (copia)');
    expect(uniqueName('Voz', ['Voz', 'Voz (copia)', 'Voz (copia 2)'])).toBe('Voz (copia 3)');
    expect(uniqueName('', [])).toBe('Perfil');
    const long = 'x'.repeat(MAX_PROFILE_NAME);
    const n = uniqueName(long, [long]);
    expect(n.length).toBeLessThanOrEqual(MAX_PROFILE_NAME);
    expect(n.endsWith(' (copia)')).toBe(true);
  });
  it('duplicateProfile copia los datos sin compartirlos', () => {
    const p = { version: 1, name: 'a', data: { salida: { output: { octave: 1 } } } };
    const d = duplicateProfile(p, 'b');
    expect(d).toEqual({ version: 1, name: 'b', data: { salida: { output: { octave: 1 } } } });
    (d.data.salida as { output: { octave: number } }).output.octave = 3;
    expect(p.data.salida.output.octave).toBe(1);
  });
  it('requestPersistence pide persistencia solo si hace falta y tolera fallos', async () => {
    expect(await requestPersistence(undefined)).toBe(false);
    expect(await requestPersistence({})).toBe(false);
    let asked = 0;
    const persist = async () => (asked++, true);
    expect(await requestPersistence({ persisted: async () => true, persist })).toBe(true);
    expect(asked).toBe(0);
    expect(await requestPersistence({ persisted: async () => false, persist })).toBe(true);
    expect(asked).toBe(1);
    expect(await requestPersistence({ persist: async () => Promise.reject(new Error('x')) })).toBe(false);
  });
});

describe('ajustes', () => {
  it('valores por defecto y saneado', () => {
    expect(sanitizeSettings(null)).toEqual(defaultSettings);
    const s = sanitizeSettings({ tonic: 40, scaleId: 'zz', muted: [1, 1, 99, 'a'], bendTarget: 'ambos', bendRange: 500, thresholdDb: -5, sound: false });
    expect(s).toMatchObject({ tonic: 11, scaleId: 'chromatic', muted: [1], bendTarget: 'ambos', bendRange: 48, thresholdDb: -20, sound: false });
  });
});
