import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { MeasureUnitComponent } from './measure-unit.component';

/**
 * SD #10720 — o '+' de Unidades de medida criava o cartao novo no fim da lista, na ultima pagina.
 * Sem TestBed: a logica e de classe e os servicos sao dubles simples.
 */
describe('MeasureUnitComponent — cartao novo (SD #10720)', () => {

  const tela = () => {
    const c = new MeasureUnitComponent(
      new FormBuilder(),
      {} as any,
      { instant: (k: string) => k } as any,
      { queryParams: of({ idOffice: '1' }) } as any,
      {} as any, {} as any, {} as any, {} as any,
      { observable: of(false) } as any,
      {} as any,
      { instant: (k: string) => k } as any,
      {} as any, {} as any,
      { observableDisplayModeAll: of('list'), observablePageSize: of(5) } as any
    );
    c.editPermission = true;
    c.cardProperties = {} as any;
    c.measureUnits = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, name: `U${i + 1}`, fullName: `Unidade ${i + 1}`, precision: 2 }) as any);
    c.loadCardItemsMeasureUnits();
    c.loadFormsMeasureUnits();
    return c;
  };

  it('coloca o cartao novo no topo e volta para a primeira pagina', () => {
    const c = tela();
    c.first = 10;
    c.handleAddCardItem();
    expect(c.cardItemsProperties[0].newId).toBe('local-1');
    expect(c.cardItemsProperties[c.cardItemsProperties.length - 1].typeCardItem).toBe('newCardItem');
    expect(c.cardItemsProperties.length).toBe(17);
    expect(c.totalRecords).toBe(17);
    expect(c.first).toBe(0);
    expect(c.getFormById('local-1')).toBeTruthy();
  });

  it('dois cliques criam dois cartoes, o mais recente primeiro', () => {
    const c = tela();
    c.handleAddCardItem();
    c.handleAddCardItem();
    expect(c.cardItemsProperties.slice(0, 2).map(i => i.newId)).toEqual(['local-2', 'local-1']);
  });

  it('excluir um cartao novo nao apaga o formulario de outro', () => {
    const c = tela();
    c.handleAddCardItem();
    c.handleAddCardItem();
    c.getFormById('local-1').patchValue({ name: 'Litros', fullName: 'Litros (l)' });
    c.deleteCardItem('local-2');
    expect(c.getFormById('local-2')).toBeUndefined();
    expect(c.getFormById('local-1').value.name).toBe('Litros');
    expect(c.getFormById(1)).toBeTruthy();
    expect(c.cardItemsProperties.length).toBe(17);
  });

});
