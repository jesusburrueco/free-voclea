import { describe, expect, it } from 'vitest';
import { classifyMicError, isMicSupported, MIC_ERROR_MESSAGES } from '../src/audio/mic-error';

const named = (name: string) => Object.assign(new Error('x'), { name });

describe('classifyMicError', () => {
  it('clasifica los errores conocidos', () => {
    expect(classifyMicError(named('NotAllowedError'))).toBe('denied');
    expect(classifyMicError(named('NotFoundError'))).toBe('no-device');
    expect(classifyMicError(named('NotReadableError'))).toBe('busy');
    expect(classifyMicError(named('UnsupportedError'))).toBe('unsupported');
  });
  it('lo desconocido cae en unknown y todo tipo tiene mensaje', () => {
    expect(classifyMicError('boom')).toBe('unknown');
    for (const msg of Object.values(MIC_ERROR_MESSAGES)) expect(msg.length).toBeGreaterThan(10);
  });
});

describe('isMicSupported', () => {
  it('exige mediaDevices y AudioContext', () => {
    expect(isMicSupported({ mediaDevices: {} }, { AudioContext: function () {} })).toBe(true);
    expect(isMicSupported({}, { AudioContext: function () {} })).toBe(false);
    expect(isMicSupported({ mediaDevices: {} }, {})).toBe(false);
  });
});
