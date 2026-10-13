import { escapeLike } from './tasks.service.js';

describe('escapeLike', () => {
  it('escapa los comodines de LIKE', () => {
    expect(escapeLike('100%')).toBe('100\\%');
    expect(escapeLike('a_b')).toBe('a\\_b');
  });

  it('escapa la propia barra invertida', () => {
    expect(escapeLike('a\\b')).toBe('a\\\\b');
  });

  it('no modifica texto normal', () => {
    expect(escapeLike('Preparar demo')).toBe('Preparar demo');
  });
});
