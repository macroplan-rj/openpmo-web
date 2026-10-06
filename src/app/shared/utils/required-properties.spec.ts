import { PropertyTemplateModel } from '../models/PropertyTemplateModel';
import {
  areRequiredPropertiesFilled,
  checkRequiredProperties,
  checkRequiredProperty,
  hasInvalidProperty,
  isPropertyFilled,
} from './required-properties';

const MSG = 'Preenchimento obrigatório';

const prop = (data: Partial<PropertyTemplateModel>) => data as PropertyTemplateModel;

describe('required-properties (SD-10606)', () => {

  describe('isPropertyFilled', () => {
    it('trata texto vazio, null e lista vazia como nao preenchidos', () => {
      expect(isPropertyFilled(prop({ type: 'Text', value: '' }))).toBeFalse();
      expect(isPropertyFilled(prop({ type: 'Text', value: null }))).toBeFalse();
      expect(isPropertyFilled(prop({ type: 'Selection', value: [] }))).toBeFalse();
    });

    it('aceita zero, false, data e texto', () => {
      expect(isPropertyFilled(prop({ type: 'Integer', value: 0 }))).toBeTrue();
      expect(isPropertyFilled(prop({ type: 'Toggle', value: false }))).toBeTrue();
      expect(isPropertyFilled(prop({ type: 'Date', value: new Date() }))).toBeTrue();
      expect(isPropertyFilled(prop({ type: 'Text', value: 'x' }))).toBeTrue();
    });

    it('selecoes usam selectedValue(s); localidade sincroniza a partir da arvore', () => {
      expect(isPropertyFilled(prop({ type: 'OrganizationSelection', selectedValues: [] }))).toBeFalse();
      expect(isPropertyFilled(prop({ type: 'UnitSelection', selectedValue: 3 }))).toBeTrue();
      const locality = prop({ type: 'LocalitySelection', multipleSelection: false, localitiesSelected: { data: 7 } });
      expect(isPropertyFilled(locality)).toBeTrue();
      expect(locality.selectedValues).toEqual([7]);
      expect(isPropertyFilled(prop({ type: 'LocalitySelection', multipleSelection: false, localitiesSelected: null })))
        .toBeFalse();
    });
  });

  describe('checkRequiredProperties (clique no Salvar)', () => {
    it('marca TODAS as obrigatorias vazias, inclusive dentro de grupo, e nao toca nas opcionais', () => {
      const name = prop({ type: 'Text', required: true, value: '' });
      const date = prop({ type: 'Date', required: true, value: null });
      const optional = prop({ type: 'Text', required: false, value: '' });
      const child = prop({ type: 'Selection', required: true, value: '' });
      const group = prop({ type: 'Group', groupedProperties: [child] });

      const ok = checkRequiredProperties([name, date, optional, group], MSG);

      expect(ok).toBeFalse();
      expect(name.invalid).toBeTrue();
      expect(name.message).toBe(MSG);
      expect(date.invalid).toBeTrue();
      expect(child.invalid).toBeTrue();
      expect(child.message).toBe(MSG);
      expect(optional.invalid).toBeFalsy();
      expect(group.invalid).toBeFalsy();
      expect(hasInvalidProperty([name, date, optional, group])).toBeTrue();
    });

    it('devolve true e nao marca nada quando tudo esta preenchido', () => {
      const name = prop({ type: 'Text', required: true, value: 'a' });
      const group = prop({ type: 'Group', groupedProperties: [prop({ type: 'Integer', required: true, value: 1 })] });

      expect(checkRequiredProperties([name, group], MSG)).toBeTrue();
      expect(hasInvalidProperty([name, group])).toBeFalse();
    });

    it('exige a justificativa quando a data do marco foi alterada', () => {
      const date = prop({ type: 'Date', required: false, value: new Date(), needReason: true, reason: '  ' });

      expect(checkRequiredProperties([date], MSG)).toBeFalse();
      expect(date.invalid).toBeTrue();
    });
  });

  describe('checkRequiredProperty (alteracao de um campo)', () => {
    it('a mensagem some quando o campo e preenchido', () => {
      const name = prop({ type: 'Text', required: true, value: '' });
      checkRequiredProperties([name], MSG);
      expect(name.invalid).toBeTrue();

      name.value = 'Projeto';
      checkRequiredProperty(name, MSG);

      expect(name.invalid).toBeFalse();
      expect(name.message).toBe('');
    });

    it('nao apaga a marcacao de outra regra (ex.: tamanho maximo)', () => {
      const name = prop({ type: 'Text', required: true, value: 'muito longo', invalid: true, message: 'Máximo de 5' });

      checkRequiredProperty(name, MSG);

      expect(name.invalid).toBeTrue();
      expect(name.message).toBe('Máximo de 5');
    });

    it('em grupo (onlyClear) limpa quem foi preenchido sem acusar irmaos ainda nao tocados', () => {
      const filled = prop({ type: 'Text', required: true, value: 'x', invalid: true, message: MSG });
      const untouched = prop({ type: 'Text', required: true, value: '' });
      const group = prop({ type: 'Group', groupedProperties: [filled, untouched] });

      const ok = checkRequiredProperty(group, MSG, true);

      expect(ok).toBeFalse();
      expect(filled.invalid).toBeFalse();
      expect(untouched.invalid).toBeFalsy();
    });
  });

  describe('areRequiredPropertiesFilled', () => {
    it('responde sem marcar nada', () => {
      const name = prop({ type: 'Text', required: true, value: '' });

      expect(areRequiredPropertiesFilled([name])).toBeFalse();
      expect(name.invalid).toBeFalsy();
    });
  });
});
