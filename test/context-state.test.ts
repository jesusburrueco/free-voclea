import { describe, expect, it } from 'vitest';
import { contextNotice } from '../src/audio/context-state';

describe('contextNotice', () => {
  it('no avisa cuando el contexto esta activo o cerrado', () => {
    expect(contextNotice('running')).toBeNull();
    expect(contextNotice('closed')).toBeNull();
  });

  it('pide un gesto en suspended e interrupted', () => {
    expect(contextNotice('suspended')?.needsGesture).toBe(true);
    const n = contextNotice('interrupted');
    expect(n?.needsGesture).toBe(true);
    expect(n?.message).toContain('interrumpido');
  });
});
