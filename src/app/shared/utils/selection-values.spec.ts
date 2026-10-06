import {
  joinSelectionValues, normalizeSelectionOptions, SELECTION_SEPARATOR, selectionArraySeparator, splitSelectionValues
} from './selection-values';

describe('selection-values (SD #10628)', () => {

  it('o separador e ponto e virgula', () => {
    expect(SELECTION_SEPARATOR).toBe(';');
  });

  it('virgula faz parte do texto da opcao', () => {
    expect(splitSelectionValues('Tornar as cidades sustentaveis, resilientes e inteligentes'))
      .toEqual(['Tornar as cidades sustentaveis, resilientes e inteligentes']);
  });

  it('ponto e virgula separa as opcoes, aparando as pontas', () => {
    expect(splitSelectionValues('A; B ;C')).toEqual(['A', 'B', 'C']);
  });

  it('descarta itens vazios e quebras de linha', () => {
    expect(splitSelectionValues('A;;\r\nB;\n;  ')).toEqual(['A', 'B']);
  });

  it('valor nulo ou vazio vira lista vazia', () => {
    expect(splitSelectionValues(null)).toEqual([]);
    expect(splitSelectionValues(undefined)).toEqual([]);
    expect(splitSelectionValues('')).toEqual([]);
  });

  it('junta com ponto e virgula, preservando a virgula interna', () => {
    expect(joinSelectionValues(['Saude, educacao', ' Seguranca '])).toBe('Saude, educacao;Seguranca');
  });

  it('juntar lista nula ou vazia da string vazia', () => {
    expect(joinSelectionValues(null)).toBe('');
    expect(joinSelectionValues([])).toBe('');
  });

  it('ida e volta preserva as opcoes', () => {
    const options = ['Opcao 1, com virgula', 'Opcao 2'];
    expect(splitSelectionValues(joinSelectionValues(options))).toEqual(options);
  });

  it('no salvamento do admin, so os arrays da Selecao usam ponto e virgula', () => {
    expect(selectionArraySeparator({ type: 'SelectionModel' }, 'defaultValue')).toBe(';');
    expect(selectionArraySeparator({ type: 'SelectionModel' }, 'possibleValuesOptions')).toBe(';');
    expect(selectionArraySeparator({ type: 'OrganizationSelectionModel' }, 'sectorsList')).toBe(',');
    expect(selectionArraySeparator({ type: 'DynamicSelectionModel' }, 'defaultValue')).toBe(',');
    expect(selectionArraySeparator({ type: 'SelectionModel' }, 'requiredFields')).toBe(',');
  });

  it('normaliza os chips: quebra por ponto e virgula, apara e descarta repetidos', () => {
    expect(normalizeSelectionOptions(['A', ' B; C ', 'A', 'Saude, educacao', '  '])).toEqual(['A', 'B', 'C', 'Saude, educacao']);
    expect(normalizeSelectionOptions(null)).toEqual([]);
  });
});
