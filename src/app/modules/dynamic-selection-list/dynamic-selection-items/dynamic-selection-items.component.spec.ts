import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { DynamicSelectionItemsComponent } from './dynamic-selection-items.component';

/**
 * US-029 — cadastro dos itens das listas da Selecao dinamica (SD #10548 / #10607). Sem TestBed: a
 * logica e de classe e os servicos sao dubles simples.
 */
describe('DynamicSelectionItemsComponent (SD #10548)', () => {

  const listas = [
    { key: 'ppa.programa', label: 'PPA — Programas', items: 2 },
    { key: 'ppa.indicador', label: 'PPA — Indicadores', dependsOnKey: 'ppa.programa', items: 2 }
  ];
  const itens = {
    'ppa.programa': [{ code: '5001', label: 'Programa 5001 - Gestao' }, { code: '5002', label: 'Programa 5002 - Economia' }],
    'ppa.indicador': [
      { code: 'I1', label: 'Taxa de abertura', parentCode: '5001' },
      { code: 'I2', label: 'Exportacoes', parentCode: '5002' }
    ]
  };

  let dynamicSrv: any;
  let confirmationSrv: any;
  let messageSrv: any;
  let router: any;

  const tela = async(key: string, permissao = true) => {
    const c = new DynamicSelectionItemsComponent(
      dynamicSrv,
      { getCurrentOffice: () => Promise.resolve({ name: 'PELP 45' }) } as any,
      { queryParams: of({ idOffice: '7', key }) } as any,
      { setMenu: () => {} } as any,
      { isUserAdmin: () => Promise.resolve(false) } as any,
      { getPermissions: () => Promise.resolve(permissao) } as any,
      { observable: of(false) } as any,
      confirmationSrv,
      messageSrv,
      new FormBuilder(),
      router,
      { instant: (k: string) => k } as any
    );
    await c.ngOnInit();
    return c;
  };

  beforeEach(() => {
    dynamicSrv = {
      lists: jasmine.createSpy('lists').and.callFake(() => Promise.resolve(listas)),
      items: jasmine.createSpy('items').and.callFake((key: string) => Promise.resolve(itens[key] || [])),
      createItem: jasmine.createSpy('createItem').and.returnValue(Promise.resolve({})),
      updateItem: jasmine.createSpy('updateItem').and.returnValue(Promise.resolve({})),
      deleteItem: jasmine.createSpy('deleteItem').and.returnValue(Promise.resolve())
    };
    confirmationSrv = { confirm: jasmine.createSpy('confirm').and.callFake(opts => opts.accept()) };
    messageSrv = { add: jasmine.createSpy('add') };
    router = { navigate: jasmine.createSpy('navigate') };
  });

  it('carrega os itens e os rotulos do pai', async() => {
    const c = await tela('ppa.indicador');
    expect(c.items.length).toBe(2);
    expect(c.parentList.key).toBe('ppa.programa');
    expect(c.parentLabels['5002']).toBe('Programa 5002 - Economia');
    expect(c.parentOptions.map(o => o.value)).toEqual(['5001', '5002']);
  });

  it('busca por codigo, descricao ou pai', async() => {
    const c = await tela('ppa.indicador');
    c.term = 'economia';
    expect(c.filteredItems.map(i => i.code)).toEqual(['I2']);
    c.term = 'i1';
    expect(c.filteredItems.map(i => i.code)).toEqual(['I1']);
  });

  it('lista inexistente volta para as listas', async() => {
    await tela('nao.existe');
    expect(router.navigate).toHaveBeenCalledWith(['/dynamic-selection-lists'], { queryParams: { idOffice: 7 } });
  });

  it('inclui item exigindo o pai quando a lista depende de outra', async() => {
    const c = await tela('ppa.indicador');
    c.handleNew();
    c.form.patchValue({ code: 'I9', label: 'Novo' });
    await c.handleSave();
    expect(dynamicSrv.createItem).not.toHaveBeenCalled();
    c.form.patchValue({ parentCode: '5001' });
    await c.handleSave();
    expect(dynamicSrv.createItem).toHaveBeenCalledWith('ppa.indicador', 7, { code: 'I9', label: 'Novo', parentCode: '5001' });
    expect(c.showForm).toBeFalse();
  });

  it('edita sem trocar o codigo e lista sem pai nao manda parentCode', async() => {
    const c = await tela('ppa.programa');
    c.handleEdit(itens['ppa.programa'][0]);
    expect(c.form.controls.code.disabled).toBeTrue();
    c.form.patchValue({ label: 'Gestao renomeada' });
    await c.handleSave();
    expect(dynamicSrv.updateItem).toHaveBeenCalledWith('ppa.programa', 7, { code: '5001', label: 'Gestao renomeada', parentCode: undefined });
  });

  it('erro ao salvar mantem o formulario aberto', async() => {
    dynamicSrv.createItem.and.returnValue(Promise.reject({ status: 400 }));
    const c = await tela('ppa.programa');
    c.handleNew();
    c.form.patchValue({ code: '5001', label: 'Duplicado' });
    await c.handleSave();
    expect(c.showForm).toBeTrue();
    expect(c.isSaving).toBeFalse();
  });

  it('exclui apos confirmar', async() => {
    const c = await tela('ppa.indicador');
    c.handleDelete(itens['ppa.indicador'][0]);
    await Promise.resolve();
    expect(dynamicSrv.deleteItem).toHaveBeenCalledWith('ppa.indicador', 7, 'I1');
  });

  it('sem permissao de edicao', async() => {
    const c = await tela('ppa.indicador', false);
    expect(c.editPermission).toBeFalse();
  });

});
