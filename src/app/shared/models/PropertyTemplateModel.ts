import { TranslateService } from '@ngx-translate/core';
import { TreeNode } from 'primeng/api';
import { TypePropertyModelEnum } from '../enums/TypePropertyModelEnum';
import { IProperty } from '../interfaces/IProperty';
import { IWorkpackProperty } from '../interfaces/IWorkpackProperty';
import { IMilestonePropertyData } from '../interfaces/IMilestonePropertyData';
import { TypeWorkpackEnumWBS } from '../enums/TypeWorkpackEnum';
import { joinSelectionValues } from '../utils/selection-values';

export class PropertyTemplateModel implements IProperty {
  id?: number;
  type: string;
  idPropertyModel?: number;
  active: boolean;
  fullLine?: boolean;
  label: string;
  name: string;
  required?: boolean;
  disabled?: boolean;
  sortIndex?: number;
  defaultValue?: number | string | boolean | string[] | number[] | Date;
  defaults?: number | number[];
  min?: number;
  max?: number;
  precision?: number;
  possibleValues?: { label: string; value: string }[];
  possibleValuesIds?: { label: string; value: number }[];
  multipleSelection?: boolean;
  rows?: number;
  decimals?: number;
  localityList?: TreeNode[];
  idDomain?: number;
  localitiesSelected?: TreeNode | TreeNode[];
  labelButtonLocalitySelected?: string[];
  showIconButton?: boolean;
  value?: string | number | boolean | string[] | Date | number[];
  selectedValues?: number[] | number;
  selectedValue?: number;
  invalid?: boolean;
  message?: string;
  groupedProperties?: PropertyTemplateModel[];
  milestoneData?: IMilestonePropertyData;
  reason?: string;
  needReason?: boolean;
  collapsed?: boolean;
  dirty = false;
  helpText?: string;
  typeWorkPack?: TypeWorkpackEnumWBS;
  /** Selecao dinamica (SD #10548). */
  providerKey?: string;
  dependsOn?: string;
  /** Rotulo de cada codigo escolhido, mantido pelo campo para gravar junto com o valor. */
  valueLabels?: { [code: string]: string };

  getValues() {
    const {
      id,
      idPropertyModel,
      type,
      name,
      value,
      selectedValue,
      selectedValues,
      multipleSelection,
      localitiesSelected,
      idDomain,
      reason
    } = this;
    const property: IWorkpackProperty = {
      id,
      idPropertyModel,
      type,
      name
    };
    switch (this.type) {
      case TypePropertyModelEnum.DateModel:
        property.value = value as Date;
        property.reason = reason;
        break;
      case TypePropertyModelEnum.SelectionModel:
        const selectedOptions = multipleSelection && value as string[];
        const stringValue = !!selectedOptions ? joinSelectionValues(selectedOptions) : value as string;
        property.value = stringValue;
        break;
      case TypePropertyModelEnum.UnitSelectionModel:
        property.selectedValue = selectedValue;
        break;
      case TypePropertyModelEnum.DynamicSelectionModel: {
        const codes = (Array.isArray(value) ? value as string[] : (value ? [value as string] : []))
          .filter(code => code !== null && code !== undefined && `${code}` !== '');
        property.value = codes.join(',');
        property.label = codes.map(code => (this.valueLabels && this.valueLabels[code]) || code).join('; ');
        break;
      }
      case TypePropertyModelEnum.OrganizationSelectionModel:
        const selectedOrganization = !multipleSelection && selectedValues as number;
        property.selectedValues = selectedOrganization ? [selectedOrganization] : selectedValues as number[];
        break;
      case TypePropertyModelEnum.LocalitySelectionModel:
        if (!multipleSelection) {
          const selectedLocality = localitiesSelected as TreeNode;
          property.selectedValues = [selectedLocality?.data];
        }
        if (multipleSelection) {
          const selectedLocality = localitiesSelected as TreeNode[];
          property.selectedValues =
            selectedLocality?.filter(locality =>
              (locality.data && locality.data !== idDomain && !locality.data.toString().includes('SELECTALL'))
            )
            .map(l => l.data);
        }
        break;
      case TypePropertyModelEnum.CurrencyModel:
        property.value = value as number;
        break;
      case TypePropertyModelEnum.NumberModel:
        property.value = value as number;
        break;
      case TypePropertyModelEnum.IntegerModel:
        property.value = value as number;
        break;
      default:
        property.value = value as string;
        break;
    }
    return property;
  }
}
