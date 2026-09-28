import { uoCodeLabel, uoDisplayText } from './uo-label.util';

describe('uo-label.util (SD #10594)', () => {

  it('tira os zeros a esquerda do codigo', () => {
    expect(uoCodeLabel('001101')).toBe('1101');
    expect(uoCodeLabel('1101')).toBe('1101');
    expect(uoCodeLabel(39999)).toBe('39999');
  });

  it('codigo nao numerico sai como veio', () => {
    expect(uoCodeLabel('UO-X')).toBe('UO-X');
  });

  it('codigo vazio nao gera rotulo', () => {
    expect(uoCodeLabel(null)).toBe('');
    expect(uoCodeLabel('')).toBe('');
  });

  it('rotulo e "codigo - descricao", sem a unidade gestora', () => {
    expect(uoDisplayText({ code: '001101', name: 'ASSEMBLEIA LEGISLATIVA', fullName: 'ASSEMBLEIA LEGISLATIVA' } as any))
      .toBe('1101 - ASSEMBLEIA LEGISLATIVA');
  });

  it('descricao com espacos nas pontas e aparada', () => {
    expect(uoDisplayText({ code: '2101', name: '  TRIBUNAL DE CONTAS DO ESTADO  ' })).toBe('2101 - TRIBUNAL DE CONTAS DO ESTADO');
  });

  it('sem descricao mostra so o codigo; sem nada, vazio', () => {
    expect(uoDisplayText({ code: '5101', name: null })).toBe('5101');
    expect(uoDisplayText({ code: null, name: null })).toBe('');
  });
});
