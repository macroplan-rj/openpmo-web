/**
 * Rótulo da Unidade Orçamentária no dropdown do Centro de Custo (SD #10594).
 *
 * O SIPGR pediu só "código - descrição", com o código sem zeros à esquerda. O contrato do
 * Pentaho/arquivo local continua com três posições (code, name, fullName); o terceiro campo
 * (unidade gestora) deixa de aparecer. `Number(code)` tira os zeros de arquivos antigos
 * ("001101" -> 1101) sem alterar códigos já curtos; código não numérico sai como veio.
 */
export interface IUoLike {
  code: string | number | null;
  name?: string | null;
}

export const uoCodeLabel = (code: string | number | null): string => {
  if (code === null || code === undefined || `${code}`.trim() === '') {
    return '';
  }
  const asNumber = Number(code);
  return Number.isFinite(asNumber) ? `${asNumber}` : `${code}`.trim();
};

export const uoDisplayText = (uo: IUoLike): string => {
  const code = uoCodeLabel(uo?.code);
  const name = (uo?.name || '').trim();
  return [code, name].filter(part => part).join(' - ');
};
