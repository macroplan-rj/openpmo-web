import { TreeNode } from 'primeng/api';

import { TypePropertyModelEnum } from '../enums/TypePropertyModelEnum';
import { PropertyTemplateModel } from '../models/PropertyTemplateModel';

/**
 * SD-10606: checagem unica dos obrigatorios das propriedades dinamicas (ficha do pacote,
 * centro de custo e parametros do relatorio).
 *
 * - No Salvar, `checkRequiredProperties` olha TODAS as propriedades (inclusive os filhos dos
 *   grupos) e marca cada obrigatoria vazia com `invalid` + a mensagem informada.
 * - Na alteracao de um campo, `checkRequiredProperty` recalcula so aquele campo, para a mensagem
 *   sumir assim que ele e preenchido (ou aparecer se o usuario o esvaziar).
 *
 * Marcacoes de outras regras (tamanho minimo/maximo etc.) nao sao apagadas: so a mensagem de
 * obrigatorio e limpa quando o campo passa a ter valor.
 */

const SELECTION_TYPES = [
  TypePropertyModelEnum.OrganizationSelectionModel,
  TypePropertyModelEnum.UnitSelectionModel,
  TypePropertyModelEnum.LocalitySelectionModel,
];

/** Sincroniza `selectedValues` a partir da arvore de localidades (como as telas ja faziam). */
function syncLocalitySelection(prop: PropertyTemplateModel) {
  if (prop.type !== TypePropertyModelEnum.LocalitySelectionModel) {
    return;
  }
  if (!prop.multipleSelection) {
    const selectedLocality = prop.localitiesSelected as TreeNode;
    prop.selectedValues = selectedLocality ? [selectedLocality.data] : [];
  } else {
    const selectedLocalities = prop.localitiesSelected ? prop.localitiesSelected as TreeNode[] : [];
    prop.selectedValues = selectedLocalities
      .filter(locality => locality.data !== prop.idDomain)
      .map(locality => locality.data);
  }
}

/** A propriedade (nao grupo) tem valor? */
export function isPropertyFilled(prop: PropertyTemplateModel): boolean {
  if (SELECTION_TYPES.includes(prop.type)) {
    syncLocalitySelection(prop);
    return typeof prop.selectedValue === 'number'
      || (prop.selectedValues instanceof Array
        ? prop.selectedValues.length > 0
        : typeof prop.selectedValues == 'number');
  }
  const value = prop.value;
  if (value instanceof Array) {
    return value.length > 0;
  }
  return typeof value === 'boolean' || typeof value === 'number'
    || (value !== null && value !== undefined && value !== '');
}

function isGroup(prop: PropertyTemplateModel): boolean {
  return prop.type === TypePropertyModelEnum.GroupModel;
}

/**
 * A propriedade (nao grupo) cumpre o obrigatorio? Inclui a justificativa exigida quando a data
 * de um marco e alterada (property-date liga `needReason`).
 */
export function isRequiredSatisfied(prop: PropertyTemplateModel): boolean {
  const missingReason = !!prop.needReason && !(typeof prop.reason === 'string' && prop.reason.trim().length > 0);
  return (!prop.required || isPropertyFilled(prop)) && !missingReason;
}

/** Todas as obrigatorias (inclusive filhos de grupo) estao preenchidas? Nao marca nada. */
export function areRequiredPropertiesFilled(properties: PropertyTemplateModel[]): boolean {
  return (properties || []).every(prop => isGroup(prop)
    ? areRequiredPropertiesFilled(prop.groupedProperties)
    : isRequiredSatisfied(prop));
}

/**
 * Recalcula o obrigatorio de uma propriedade. Para grupo, recalcula os filhos.
 * Com `onlyClear`, apenas remove a mensagem de quem foi preenchido (nao marca campos novos):
 * usado quando um grupo muda, para nao acusar irmaos que o usuario ainda nem tocou.
 * Retorna true quando nao ha obrigatorio vazio.
 */
export function checkRequiredProperty(prop: PropertyTemplateModel, message: string, onlyClear = false): boolean {
  if (!prop) {
    return true;
  }
  if (isGroup(prop)) {
    return (prop.groupedProperties || [])
      .map(child => checkRequiredProperty(child, message, onlyClear))
      .reduce((all, valid) => all && valid, true);
  }
  const filled = isRequiredSatisfied(prop);
  if (!filled && !onlyClear) {
    prop.invalid = true;
    prop.message = message;
  } else if (filled && prop.invalid && prop.message === message) {
    prop.invalid = false;
    prop.message = '';
  }
  return filled;
}

/** Marca todas as obrigatorias vazias (inclusive filhos de grupo). Retorna true se nenhuma faltar. */
export function checkRequiredProperties(properties: PropertyTemplateModel[], message: string): boolean {
  return (properties || [])
    .map(prop => checkRequiredProperty(prop, message))
    .reduce((all, valid) => all && valid, true);
}

/** Alguma propriedade (ou filho de grupo) esta marcada como invalida? */
export function hasInvalidProperty(properties: PropertyTemplateModel[]): boolean {
  return (properties || []).some(prop => isGroup(prop)
    ? hasInvalidProperty(prop.groupedProperties)
    : !!prop.invalid);
}
