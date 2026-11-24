import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { PainelTokenListComponent } from './painel-token-list.component';

/**
 * US-042 — tokens da API do Painel na administracao. Sem TestBed: a logica e de classe e os servicos
 * sao dubles simples.
 */
describe('PainelTokenListComponent (US-042)', () => {

  const ativo = { id: 1, name: 'Painel externo', prefix: 'pmo_abcdef', createdAt: '2026-11-24T10:00:00', createdBy: 'Ana', active: true };
  const revogado = { id: 2, name: 'Antigo', prefix: 'pmo_zzzzzz', createdAt: '2026-11-01T10:00:00', createdBy: 'Ana',
    revokedAt: '2026-11-10T09:00:00', revokedBy: 'Bia', active: false };

  let tokenSrv: any;
  let confirmationSrv: any;
  let messageSrv: any;
  let router: any;
  let breadcrumbSrv: any;

  const tela = async(admin = true) => {
    const c = new PainelTokenListComponent(
      tokenSrv,
      { isUserAdmin: () => Promise.resolve(admin) } as any,
      breadcrumbSrv,
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
    tokenSrv = {
      list: jasmine.createSpy('list').and.returnValue(Promise.resolve([ativo, revogado])),
      generate: jasmine.createSpy('generate').and.callFake((name: string) =>
        Promise.resolve({ ...ativo, id: 3, name, token: 'pmo_valor-completo' })),
      revoke: jasmine.createSpy('revoke').and.returnValue(Promise.resolve({ ...ativo, active: false }))
    };
    confirmationSrv = { confirm: jasmine.createSpy('confirm').and.callFake(opts => opts.accept()) };
    messageSrv = { add: jasmine.createSpy('add') };
    router = { navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)) };
    breadcrumbSrv = { setMenu: jasmine.createSpy('setMenu') };
  });

  it('administrador ve a lista', async() => {
    const c = await tela();
    expect(c.tokens.length).toBe(2);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('quem nao e administrador e mandado embora sem consultar a API', async() => {
    await tela(false);
    expect(router.navigate).toHaveBeenCalledWith(['/offices']);
    expect(tokenSrv.list).not.toHaveBeenCalled();
  });

  it('nao gera sem nome', async() => {
    const c = await tela();
    c.handleNew();
    await c.handleGenerate();
    c.form.patchValue({ name: '   ' });
    await c.handleGenerate();
    expect(tokenSrv.generate).not.toHaveBeenCalled();
    expect(c.showForm).toBeTrue();
  });

  it('gera, mostra o valor uma vez e recarrega a lista', async() => {
    const c = await tela();
    c.handleNew();
    c.form.patchValue({ name: '  Painel novo ' });
    await c.handleGenerate();
    expect(tokenSrv.generate).toHaveBeenCalledWith('Painel novo');
    expect(c.showGenerated).toBeTrue();
    expect(c.generatedToken).toBe('pmo_valor-completo');
    expect(c.showForm).toBeFalse();
    expect(tokenSrv.list).toHaveBeenCalledTimes(2);
  });

  it('fechar o dialogo descarta o valor', async() => {
    const c = await tela();
    c.handleNew();
    c.form.patchValue({ name: 'Painel novo' });
    await c.handleGenerate();
    c.handleCloseGenerated();
    expect(c.showGenerated).toBeFalse();
    expect(c.generatedToken).toBeUndefined();
  });

  it('erro na geracao mantem o formulario aberto', async() => {
    tokenSrv.generate.and.returnValue(Promise.reject(new Error('falhou')));
    const c = await tela();
    c.handleNew();
    c.form.patchValue({ name: 'Painel novo' });
    await c.handleGenerate();
    expect(c.showForm).toBeTrue();
    expect(c.showGenerated).toBeFalse();
    expect(c.isSaving).toBeFalse();
  });

  it('revoga depois de confirmar e recarrega', async() => {
    const c = await tela();
    c.handleRevoke(ativo as any);
    await Promise.resolve();
    await Promise.resolve();
    expect(confirmationSrv.confirm).toHaveBeenCalled();
    expect(tokenSrv.revoke).toHaveBeenCalledWith(1);
  });

  it('token ja revogado nao pede confirmacao', async() => {
    const c = await tela();
    c.handleRevoke(revogado as any);
    expect(confirmationSrv.confirm).not.toHaveBeenCalled();
    expect(tokenSrv.revoke).not.toHaveBeenCalled();
  });

  it('le a data como texto ISO ou como lista', async() => {
    const c = await tela();
    expect(c.toDate('2026-11-24T10:30:00').getFullYear()).toBe(2026);
    const d = c.toDate([2026, 11, 24, 10, 30]);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 10, 24, 10, 30]);
    expect(c.toDate(null)).toBeUndefined();
  });

});
