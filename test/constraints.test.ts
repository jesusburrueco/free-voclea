import { describe, expect, it } from 'vitest';
import { buildAudioConstraints, resolveDeviceId, toInputDevices } from '../src/audio/constraints';

describe('buildAudioConstraints', () => {
  it('desactiva el procesado del navegador', () => {
    const audio = buildAudioConstraints().audio as MediaTrackConstraints;
    expect(audio.echoCancellation).toBe(false);
    expect(audio.noiseSuppression).toBe(false);
    expect(audio.autoGainControl).toBe(false);
    expect(audio.deviceId).toBeUndefined();
  });
  it('fija el dispositivo con exact', () => {
    const audio = buildAudioConstraints('abc').audio as MediaTrackConstraints;
    expect(audio.deviceId).toEqual({ exact: 'abc' });
  });
});

describe('toInputDevices', () => {
  it('filtra salidas y ids vacios, y rellena etiquetas', () => {
    const list = toInputDevices([
      { kind: 'audioinput', deviceId: 'a', label: 'Micro USB' },
      { kind: 'audiooutput', deviceId: 'b', label: 'Altavoz' },
      { kind: 'audioinput', deviceId: '', label: '' },
      { kind: 'audioinput', deviceId: 'c', label: '' },
    ]);
    expect(list).toEqual([
      { id: 'a', label: 'Micro USB' },
      { id: 'c', label: 'Entrada 2' },
    ]);
  });
});

describe('resolveDeviceId', () => {
  const devs = [{ id: 'a', label: 'A' }];
  it('conserva el guardado si existe', () => expect(resolveDeviceId('a', devs)).toBe('a'));
  it('cae al predeterminado si no existe', () => expect(resolveDeviceId('x', devs)).toBeUndefined());
  it('sin guardado devuelve undefined', () => expect(resolveDeviceId(undefined, devs)).toBeUndefined());
});
