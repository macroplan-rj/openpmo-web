/**
 * Separador das opcoes da propriedade Selecao (SD #10628).
 *
 * Possiveis valores, valor padrao e valores marcados em Selecao multipla sao gravados como
 * uma unica string. O separador era ',' e impedia opcao com virgula no texto; passou a ser ';'.
 * Selecao dinamica NAO usa este separador (codigos unidos por ',' e rotulos por '; ').
 */
export const SELECTION_SEPARATOR = ';';

/** Quebra a string gravada nas opcoes: separa por ';', apara as pontas e descarta vazios. */
export function splitSelectionValues(value: string): string[] {
  if (value === null || value === undefined) {
    return [];
  }
  return `${value}`
    .split(SELECTION_SEPARATOR)
    .map(item => item.replace(/[\r\n]+/g, ' ').trim())
    .filter(item => item.length > 0);
}

/** Junta as opcoes na string gravada, com ';'. */
export function joinSelectionValues(values: string[]): string {
  if (!values) {
    return '';
  }
  return values
    .map(item => (typeof item === 'string' ? item.replace(/[\r\n]+/g, ' ').trim() : item))
    .filter(item => item !== null && item !== undefined && `${item}` !== '')
    .join(SELECTION_SEPARATOR);
}

/**
 * Separador usado ao serializar um campo array do modelo de propriedade no salvamento do admin.
 * So os campos da Selecao (valor padrao multiplo e opcoes) usam ';'; os demais arrays
 * (ex.: setores da Selecao de organizacao) continuam com ','.
 */
export function selectionArraySeparator(property: { type?: string }, key: string): string {
  const isSelectionField = key === 'defaultValue' || key === 'possibleValuesOptions';
  return property && property.type === 'SelectionModel' && isSelectionField ? SELECTION_SEPARATOR : ',';
}

/**
 * Normaliza as opcoes digitadas/coladas no p-chips do admin: um chip com ';' vira varios,
 * as pontas sao aparadas e repetidos/vazios sao descartados (mantendo a ordem).
 */
export function normalizeSelectionOptions(values: string[]): string[] {
  const result: string[] = [];
  (values || []).forEach(value => splitSelectionValues(value).forEach(option => {
    if (!result.includes(option)) {
      result.push(option);
    }
  }));
  return result;
}
