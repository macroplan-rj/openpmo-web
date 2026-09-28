import { of } from 'rxjs';
import { PropertyDynamicSelectionComponent } from './property-dynamic-selection.component';
import { PropertyTemplateModel } from 'src/app/shared/models/PropertyTemplateModel';
import { DynamicSelectionCascadeService } from 'src/app/shared/services/dynamic-selection-cascade.service';
import { TypePropertyModelEnum } from 'src/app/shared/enums/TypePropertyModelEnum';

/**
 * US-022 — cascata generica da Selecao dinamica. Sem TestBed: a logica e toda de classe, e os
 * servicos sao substituidos por dubles simples.
 */
describe('PropertyDynamicSelectionComponent (SD #10548)', () => {

  const catalogo = {
    'ppa.programa': [
      { code: '5001', label: 'Programa 5001 - A' },
      { code: '5002', label: 'Programa 5002 - B' }
    ],
    'ppa.acao': [
      { code: '1496', label: 'Acao 1496 - 5001 - X', parentCode: '5001' },
      { code: '1640', label: 'Acao 1640 - 5001 - Y', parentCode: '5001' },
      { code: '1074', label: 'Acao 1074 - 5002 - Z', parentCode: '5002' }
    ]
  };

  let dynamicSrv: any;
  let cascade: DynamicSelectionCascadeService;

  const campo = (over: Partial<PropertyTemplateModel>) => {
    const p = new PropertyTemplateModel();
    p.type = TypePropertyModelEnum.DynamicSelectionModel;
    p.multipleSelection = true;
    Object.assign(p, over);
    const c = new PropertyDynamicSelectionComponent(
      dynamicSrv, cascade, { observable: of(false) } as any, { currentLang: 'pt-BR' } as any);
    c.property = p;
    spyOn(c.changed, 'emit');
    return c;
  };

  beforeEach(() => {
    cascade = new DynamicSelectionCascadeService();
    dynamicSrv = {
      options: jasmine.createSpy('options').and.callFake((provider: string, parents?: string[]) =>
        of((catalogo[provider] || []).filter(o => !parents || !parents.length || parents.includes(o.parentCode))))
    };
  });

  it('carrega as opcoes do provedor e guarda o rotulo de cada codigo', () => {
    const programa = campo({ name: 'programa', providerKey: 'ppa.programa', value: [] });
    programa.ngOnInit();
    expect(programa.options.map(o => o.value)).toEqual(['5001', '5002']);
    expect(programa.property.valueLabels['5002']).toBe('Programa 5002 - B');
  });

  it('filho nasce filtrado pelo valor que o pai ja tinha', () => {
    const programa = campo({ name: 'programa', providerKey: 'ppa.programa', value: ['5002'] });
    programa.ngOnInit();
    const acao = campo({ name: 'acao', providerKey: 'ppa.acao', dependsOn: 'programa', value: [] });
    acao.ngOnInit();
    expect(dynamicSrv.options).toHaveBeenCalledWith('ppa.acao', ['5002']);
    expect(acao.options.map(o => o.value)).toEqual(['1074']);
  });

  it('trocar o pai recarrega o filho e remove a selecao orfa', () => {
    const programa = campo({ name: 'programa', providerKey: 'ppa.programa', value: ['5001'] });
    const acao = campo({ name: 'acao', providerKey: 'ppa.acao', dependsOn: 'programa', value: ['1496', '1640'] });
    programa.ngOnInit();
    acao.ngOnInit();
    expect(acao.property.value).toEqual(['1496', '1640']);

    programa.property.value = ['5002'];
    programa.onValueChange(['5002']);

    expect(acao.options.map(o => o.value)).toEqual(['1074']);
    expect(acao.property.value).toEqual([]);
    expect(acao.changed.emit).toHaveBeenCalled();
  });

  it('abrir a tela nao poda nada, mesmo com valor fora do filtro', () => {
    const programa = campo({ name: 'programa', providerKey: 'ppa.programa', value: ['5002'] });
    programa.ngOnInit();
    const acao = campo({ name: 'acao', providerKey: 'ppa.acao', dependsOn: 'programa', value: ['1496'],
      valueLabels: { '1496': 'Acao 1496 - 5001 - X' } });
    acao.ngOnInit();
    expect(acao.property.value).toEqual(['1496']);
    expect(acao.options.some(o => o.value === '1496')).toBeTrue();
    expect(acao.changed.emit).not.toHaveBeenCalled();
  });

  it('getValues grava codigos em value e rotulos em label', () => {
    const acao = campo({ name: 'acao', providerKey: 'ppa.acao', value: [] });
    acao.ngOnInit();
    acao.property.value = ['1496', '1640'];
    const saida = acao.property.getValues();
    expect(saida.value).toBe('1496,1640');
    expect(saida.label).toBe('Acao 1496 - 5001 - X; Acao 1640 - 5001 - Y');
  });

  it('selecao simples grava um codigo so', () => {
    const programa = campo({ name: 'programa', providerKey: 'ppa.programa', multipleSelection: false, value: '5001' });
    programa.ngOnInit();
    expect(programa.property.getValues().value).toBe('5001');
    expect(programa.property.getValues().label).toBe('Programa 5001 - A');
  });
});
