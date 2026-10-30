import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { DynamicSelectionListsComponent } from './dynamic-selection-lists.component';

/** US-035 — criar lista pela tela (SD #10548 / #10607). Sem TestBed: logica de classe e dubles simples. */
describe('DynamicSelectionListsComponent — nova lista', () => {

  let srv: any;
  let messages: any;

  const tela = () => new DynamicSelectionListsComponent(
    srv,
    {} as any,
    { queryParams: of({ idOffice: '7' }) } as any,
    {} as any, {} as any, {} as any,
    { observable: of(false) } as any,
    {} as any,
    { instant: (k: string) => k } as any,
    messages,
    new FormBuilder()
  );

  beforeEach(() => {
    srv = {
      lists: jasmine.createSpy('lists').and.returnValue(Promise.resolve([{ key: 'pelp.objetivo', label: 'Objetivos', items: 20 }])),
      createList: jasmine.createSpy('createList').and.returnValue(Promise.resolve({}))
    };
    messages = { add: jasmine.createSpy('add') };
  });

  it('nao envia sem nome', async () => {
    const c = tela();
    c.handleNewList();
    await c.handleSave();
    expect(srv.createList).not.toHaveBeenCalled();
  });

  it('cria com dependencia, fecha o formulario e recarrega as listas', async () => {
    const c = tela();
    c.handleNewList();
    c.form.patchValue({ label: 'Metas', dependsOnKey: 'pelp.objetivo' });
    await c.handleSave();
    expect(srv.createList).toHaveBeenCalledWith(7, { label: 'Metas', dependsOnKey: 'pelp.objetivo' });
    expect(c.showForm).toBeFalse();
    expect(srv.lists).toHaveBeenCalled();
    expect(c.parentOptions.map(o => o.value)).toEqual(['pelp.objetivo']);
  });

  it('erro da API mantem o formulario aberto', async () => {
    srv.createList.and.returnValue(Promise.reject({ status: 400 }));
    const c = tela();
    c.handleNewList();
    c.form.patchValue({ label: 'Metas' });
    await c.handleSave();
    expect(c.showForm).toBeTrue();
    expect(c.isSaving).toBeFalse();
  });

});
