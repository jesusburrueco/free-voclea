import { describe, expect, it } from 'vitest';
import { NoteMapper } from '../src/audio/quantizer';

describe('NoteMapper', () => {
  it('cromatica deja pasar las notas', () => {
    const m = new NoteMapper();
    expect(m.process([{ type: 'on', note: 61 }])).toEqual([{ type: 'on', note: 61 }]);
    expect(m.process([{ type: 'off', note: 61 }])).toEqual([{ type: 'off', note: 61 }]);
  });
  it('cuantiza a Do mayor', () => {
    const m = new NoteMapper();
    m.setScale(0, 'major');
    expect(m.process([{ type: 'on', note: 61 }])).toEqual([{ type: 'on', note: 60 }]);
    expect(m.process([{ type: 'off', note: 61 }])).toEqual([{ type: 'off', note: 60 }]);
  });
  it('no retriggera si dos notas crudas caen en la misma nota de la escala', () => {
    const m = new NoteMapper();
    m.setScale(0, 'major');
    m.process([{ type: 'on', note: 61 }]);
    expect(
      m.process([
        { type: 'off', note: 61 },
        { type: 'on', note: 60 },
      ]),
    ).toEqual([]);
  });
  it('cambio real de nota da off y on', () => {
    const m = new NoteMapper();
    m.setScale(0, 'major');
    m.process([{ type: 'on', note: 60 }]);
    expect(
      m.process([
        { type: 'off', note: 60 },
        { type: 'on', note: 64 },
      ]),
    ).toEqual([
      { type: 'off', note: 60 },
      { type: 'on', note: 64 },
    ]);
  });
  it('salta las notas silenciadas', () => {
    const m = new NoteMapper();
    m.setMuted([1]);
    expect(m.process([{ type: 'on', note: 61 }])).toEqual([{ type: 'on', note: 60 }]);
  });
  it('si todo esta silenciado no suena nada', () => {
    const m = new NoteMapper();
    m.setMuted([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(m.process([{ type: 'on', note: 61 }])).toEqual([]);
    expect(m.process([{ type: 'off', note: 61 }])).toEqual([]);
  });
});
