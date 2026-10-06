import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { ControlChangeBoardMemberComponent } from './control-change-board-member.component';
import { SaveButtonComponent } from 'src/app/shared/components/save-button/save-button.component';

/**
 * US-007 / SD #10519 — cadastro de membro do CCM bloqueado ao digitar o e-mail completo.
 *
 * O componente é instanciado direto, sem TestBed: ele arrasta catorze serviços e um
 * template cheio de PrimeNG, e o que precisa ser garantido aqui é a normalização dos
 * papéis e a reexibição do botão Salvar — não a renderização da tela.
 *
 * O dublê do TranslateService reproduz o ngx-translate v13 de verdade: `instant()` lança
 * `Parameter "key" required` quando a chave é vazia ou indefinida. É isso que fazia
 * `searchPerson()` abortar antes de `showSaveButton()`, deixando o botão escondido.
 */
describe('ControlChangeBoardMemberComponent — papéis do membro do CCM', () => {

  let component: ControlChangeBoardMemberComponent;
  let personSrv: { GetByKey: jasmine.Spy };
  let saveButton: { showButton: jasmine.Spy; hideButton: jasmine.Spy };
  let cancelButton: { showButton: jasmine.Spy; hideButton: jasmine.Spy };

  const translateSrv = {
    instant: (key: string) => {
      if (!key || !key.length) {
        throw new Error('Parameter "key" required');
      }
      return `traduzido:${key}`;
    }
  };

  beforeEach(() => {
    personSrv = jasmine.createSpyObj('PersonService', ['GetByKey']);
    saveButton = jasmine.createSpyObj('SaveButtonComponent', ['showButton', 'hideButton']);
    cancelButton = jasmine.createSpyObj('CancelButtonComponent', ['showButton', 'hideButton']);

    component = new ControlChangeBoardMemberComponent(
      { queryParams: of({}) } as any,
      {} as any,
      { observable: of(false) } as any,
      translateSrv as any,
      personSrv as any,
      {} as any,
      {} as any,
      {} as any,
      { unloadCitizenUsers: () => undefined } as any,
      {} as any,
      new FormBuilder(),
      {} as any,
      {} as any,
      {} as any
    );

    component.saveButton = saveButton as any;
    component.cancelButton = cancelButton as any;
  });

  describe('normalização dos papéis', () => {

    it('aceita papéis em lista de strings, como responde GET /persons/{key}', () => {
      // PersonGetByIdDto.roles é List<String> — chega ["citizen"], não [{role:'citizen'}].
      component.setMemberAsCcbMember({ name: 'Angelica', roles: ['citizen'] } as any);

      expect(component.ccbMember.memberAs.length).toBe(1);
      expect(component.ccbMember.memberAs[0].role).toBe('traduzido:citizen');
    });

    it('ativa por padrão o papel único citizen em cadastro novo', () => {
      // É o que libera o botão Salvar sem exigir que o usuário adivinhe o toggle.
      component.setMemberAsCcbMember({ name: 'Angelica', roles: ['citizen'] } as any);

      expect(component.ccbMember.memberAs[0].active).toBeTrue();
      expect(component.hasActiveMemberAs()).toBeTrue();
    });

    it('preserva o formato de objeto, com o local de trabalho', () => {
      // CitizenDto e ccbmembers/PersonResponse já respondem RoleResource: não pode regredir.
      component.setMemberAsCcbMember({
        name: 'Angelica',
        roles: [{ role: 'citizen', workLocation: 'Secretaria X' }]
      } as any);

      expect(component.ccbMember.memberAs[0].role).toBe('traduzido:citizen');
      expect(component.ccbMember.memberAs[0].workLocation).toBe('Secretaria X');
      expect(component.ccbMember.memberAs[0].active).toBeTrue();
    });

    it('descarta papel vazio em vez de derrubar a tela na tradução', () => {
      expect(() => component.setMemberAsCcbMember({
        name: 'Angelica',
        roles: ['citizen', '', null, { role: '   ' }, { workLocation: 'Secretaria X' }]
      } as any)).not.toThrow();

      expect(component.ccbMember.memberAs.length).toBe(1);
      expect(component.ccbMember.memberAs[0].role).toBe('traduzido:citizen');
    });

    it('não quebra com pessoa sem papel nenhum', () => {
      expect(() => component.setMemberAsCcbMember(null)).not.toThrow();

      expect(component.ccbMember.memberAs).toEqual([]);
      expect(component.hasActiveMemberAs()).toBeFalse();
    });
  });

  describe('regressão SD #10519 — botão Salvar some ao completar o e-mail', () => {

    it('mantém o botão Salvar ao encontrar a pessoa pelo e-mail completo', async () => {
      // O relato: com "...com.b" o botão aparece (pessoa não encontrada, fallback local
      // monta {role:'citizen'}); ao digitar o "r" a pessoa é encontrada e vem
      // roles:["citizen"] — o formato de string quebrava a tradução e o botão sumia.
      personSrv.GetByKey.and.returnValue(Promise.resolve({
        data: { id: 42, name: 'Angelica', roles: ['citizen'] }
      }));
      component.searchedEmailPerson = 'angelica.qiu@macroplan.com.br';

      await component.searchPerson();

      expect(component.ccbMember.person.id).toBe(42);
      expect(component.hasActiveMemberAs()).toBeTrue();
      expect(saveButton.showButton).toHaveBeenCalled();
    });

    it('mantém o botão Salvar com o e-mail incompleto, que cai no fallback local', async () => {
      // O caminho que já funcionava antes da correção — não pode regredir.
      personSrv.GetByKey.and.returnValue(Promise.resolve({ data: null }));
      component.searchedEmailPerson = 'angelica.qiu@macroplan.com.b';

      await component.searchPerson();

      expect(component.ccbMember.person.name).toBe('angelica.qiu');
      expect(saveButton.showButton).toHaveBeenCalled();
    });

    it('esconde o botão Salvar quando nenhum papel está ativo', async () => {
      // Pessoa com mais de um papel não é ativada por padrão: salvar sem papel ativo
      // gravaria membro sem participação.
      personSrv.GetByKey.and.returnValue(Promise.resolve({
        data: { id: 42, name: 'Angelica', roles: ['citizen', 'administrator'] }
      }));
      component.searchedEmailPerson = 'angelica.qiu@macroplan.com.br';

      await component.searchPerson();

      expect(component.ccbMember.memberAs.length).toBe(2);
      expect(component.hasActiveMemberAs()).toBeFalse();
      expect(saveButton.showButton).not.toHaveBeenCalled();
      expect(saveButton.hideButton).toHaveBeenCalled();
    });
  });
  /**
   * Os casos acima dublam o SaveButtonComponent: provam que `showButton()` foi chamado,
   * nao que o botao aparece. O relato de 11/09 no #10519 e exatamente esse buraco — a
   * chamada acontece e o botao continua escondido. Aqui o componente real entra no lugar
   * do spy, com o `setTimeout` de verdade do `showButton()`/`hideButton()`.
   */
  describe('regressao SD #10519 (11/09) — botao real, nao o spy', () => {

    let botaoReal: SaveButtonComponent;

    const esperarTimers = () => new Promise(resolve => setTimeout(resolve, 10));

    beforeEach(() => {
      botaoReal = new SaveButtonComponent({ observable: of(false) } as any, { add: () => {} } as any, { instant: (k: string) => k } as any);
      component.saveButton = botaoReal;
    });

    it('exibe o botao Salvar de fato ao encontrar a pessoa pelo e-mail completo', async () => {
      personSrv.GetByKey.and.returnValue(Promise.resolve({
        data: { id: 42, name: 'Angelica', roles: ['citizen'] }
      }));
      component.searchedEmailPerson = 'angelica.qiu@macroplan.com.br';

      await component.searchPerson();
      await esperarTimers();

      expect(component.hasActiveMemberAs()).toBeTrue();
      expect(botaoReal.isShowingButton).toBeTrue();
    });

    it('exibe o botao Salvar ao ativar o papel no switch, que e o contorno do relato', async () => {
      personSrv.GetByKey.and.returnValue(Promise.resolve({
        data: { id: 42, name: 'Angelica', roles: ['citizen'] }
      }));
      component.searchedEmailPerson = 'angelica.qiu@macroplan.com.br';
      await component.searchPerson();
      await esperarTimers();

      // o que o (ngModelChange) do p-inputSwitch dispara
      component.ccbMember.memberAs[0].active = false;
      component.showSaveButton();
      await esperarTimers();
      expect(botaoReal.isShowingButton).toBeFalse();

      component.ccbMember.memberAs[0].active = true;
      component.showSaveButton();
      await esperarTimers();
      expect(botaoReal.isShowingButton).toBeTrue();
    });
  });
  /**
   * O interceptor nunca rejeita: em erro ele devolve
   * `{ success: false, data: <corpo do erro> }` (http-request.interceptor.ts:119).
   * Quem olha so o `data` adota o corpo do erro como pessoa.
   */
  describe('falha da API na busca por e-mail', () => {

    let botaoReal: SaveButtonComponent;

    const esperarTimers = () => new Promise(resolve => setTimeout(resolve, 10));

    const respostaDeErro = {
      success: false,
      data: { timestamp: '2026-09-11T18:00:00Z', status: 500, error: 'Internal Server Error' },
      message: 'Internal Server Error'
    };

    beforeEach(() => {
      botaoReal = new SaveButtonComponent({ observable: of(false) } as any, { add: () => {} } as any, { instant: (k: string) => k } as any);
      component.saveButton = botaoReal;
    });

    it('nao adota o corpo do erro como se fosse a pessoa', async () => {
      personSrv.GetByKey.and.returnValue(Promise.resolve(respostaDeErro));
      component.searchedEmailPerson = 'angelica.qiu@macroplan.com.br';

      await component.searchPerson();

      expect(component.ccbMember.person).toBeNull();
      expect(component.ccbMember.memberAs).toEqual([]);
    });

    it('avisa o usuario em vez de esconder o botao sem explicacao', async () => {
      personSrv.GetByKey.and.returnValue(Promise.resolve(respostaDeErro));
      component.searchedEmailPerson = 'angelica.qiu@macroplan.com.br';

      await component.searchPerson();
      await esperarTimers();

      expect(component.invalidMailMessage).toBe('traduzido:messages.error.generic');
      expect(botaoReal.isShowingButton).toBeFalse();
    });

    it('nao cai no cadastro novo quando a API falha, para nao duplicar pessoa', async () => {
      // 204 cai no cadastro novo; erro de API, nao — nao da para afirmar que nao existe.
      personSrv.GetByKey.and.returnValue(Promise.resolve(respostaDeErro));
      component.searchedEmailPerson = 'angelica.qiu@macroplan.com.br';

      await component.searchPerson();

      expect(component.ccbMember.person).not.toEqual(
        jasmine.objectContaining({ name: 'angelica.qiu' })
      );
    });

    it('reavalia o botao mesmo se a busca lancar', async () => {
      personSrv.GetByKey.and.returnValue(Promise.reject(new Error('falha de rede')));
      component.searchedEmailPerson = 'angelica.qiu@macroplan.com.br';

      await expectAsync(component.searchPerson()).toBeRejected();
      await esperarTimers();

      // o estado precisa ser consistente: sem pessoa, sem papel e sem botao travado
      expect(component.ccbMember.memberAs).toEqual([]);
      expect(botaoReal.isShowingButton).toBeFalse();
    });

    it('trata resposta nula sem quebrar a busca', async () => {
      // 204 chega como body null; destruturar direto lancava TypeError.
      personSrv.GetByKey.and.returnValue(Promise.resolve(null));
      component.searchedEmailPerson = 'angelica.qiu@macroplan.com.br';

      await expectAsync(component.searchPerson()).toBeResolved();
      await esperarTimers();

      expect(component.ccbMember.person.name).toBe('angelica.qiu');
      expect(botaoReal.isShowingButton).toBeTrue();
    });
  });
  /**
   * A corrida do #10519: o `:leave` do botao dura 200ms e a resposta da API cai dentro
   * dessa janela. Esconder antes de buscar e mostrar depois punha as duas animacoes
   * para disputar, e as vezes a saida ganhava — botao escondido com o papel ligado.
   * A garantia duravel e nao piscar: uma busca decide a visibilidade uma vez so.
   */
  describe('visibilidade decidida uma vez por busca', () => {

    it('nao esconde o botao antes de buscar quando a pessoa e encontrada', async () => {
      personSrv.GetByKey.and.returnValue(Promise.resolve({
        success: true,
        data: { id: 42, name: 'Angelica', roles: ['citizen'] }
      }));
      component.searchedEmailPerson = 'angelica.qiu@macroplan.com.br';

      await component.searchPerson();

      expect(saveButton.hideButton).not.toHaveBeenCalled();
      expect(saveButton.showButton).toHaveBeenCalledTimes(1);
    });

    it('esconde uma unica vez quando a busca nao deixa papel ativo', async () => {
      component.searchedEmailPerson = '';

      await component.searchPerson();

      expect(saveButton.showButton).not.toHaveBeenCalled();
      expect(saveButton.hideButton).toHaveBeenCalledTimes(1);
    });
  });
});
