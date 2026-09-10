import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';

import { ControlChangeBoardMemberComponent } from './control-change-board-member.component';

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
});
