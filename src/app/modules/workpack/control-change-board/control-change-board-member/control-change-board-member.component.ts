import {cpfValidator} from 'src/app/shared/utils/cpfValidator';
import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslateService} from '@ngx-translate/core';
import {Subject} from 'rxjs';
import {debounceTime, takeUntil} from 'rxjs/operators';
import {MessageService} from 'primeng/api';

import {IOfficePermission} from 'src/app/shared/interfaces/IOfficePermission';
import {ResponsiveService} from 'src/app/shared/services/responsive.service';
import {ICard} from 'src/app/shared/interfaces/ICard';
import {IPerson, IPersonRole, IPersonRoleResponse} from 'src/app/shared/interfaces/IPerson';
import {PersonService} from 'src/app/shared/services/person.service';
import {BreadcrumbService} from 'src/app/shared/services/breadcrumb.service';
import {SaveButtonComponent} from 'src/app/shared/components/save-button/save-button.component';
import {IOffice} from 'src/app/shared/interfaces/IOffice';
import {AuthService} from 'src/app/shared/services/auth.service';
import {enterLeave} from 'src/app/shared/animations/enterLeave.animation';
import {CitizenUserService} from 'src/app/shared/services/citizen-user.service';
import {AuthServerService} from 'src/app/shared/services/auth-server.service';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {IControlChangeBoard} from 'src/app/shared/interfaces/IControlChangeBoard';
import {IPlan} from 'src/app/shared/interfaces/IPlan';
import {PlanService} from 'src/app/shared/services/plan.service';
import {ControlChangeBoardService} from 'src/app/shared/services/control-change-board.service';
import { CancelButtonComponent } from 'src/app/shared/components/cancel-button/cancel-button.component';
import { WorkpackBreadcrumbStorageService } from 'src/app/shared/services/workpack-breadcrumb-storage.service';

@Component({
  selector: 'app-control-change-board-member',
  templateUrl: './control-change-board-member.component.html',
  styleUrls: ['./control-change-board-member.component.scss'],
  animations: [
    enterLeave({opacity: 0, pointerEvents: 'none'}, {opacity: 1, pointerEvents: 'all'}, 300)
  ]
})
export class ControlChangeBoardMemberComponent implements OnInit, OnDestroy {

  @ViewChild(SaveButtonComponent) saveButton: SaveButtonComponent;
  @ViewChild(CancelButtonComponent) cancelButton: CancelButtonComponent;

  idOffice: number;
  idPerson: number;
  idProject: number;
  idPlan: number;
  plan: IPlan;
  propertiesOffice: IOffice;
  cardPerson: ICard;
  cardMemberAs: ICard;
  responsive: boolean;
  searchedEmailPerson: string;
  permission: IOfficePermission;
  currentUserInfo: IPerson;
  showSearchInputMessage = false;
  debounceSearch = new Subject<string>();
  $destroy = new Subject();
  invalidMailMessage: string;
  citizenAuthServer: boolean;
  citizenSearchBy: string = 'CPF'; //CPF | NAME
  searchedNameUser: string;
  searchedCpfUser: string;
  selectedPerson: IPerson;
  validCpf = true;
  publicServersResult: IPerson[];
  citizenUserNotFoundByCpf = false;
  showListBoxPublicServers = false;
  showMessagePublicServerNotFoundByName = false;
  isLoading = false;
  formPerson: FormGroup;
  ccbMember: IControlChangeBoard = {} as IControlChangeBoard;
  isUser = true;
  phoneNumberPlaceholder = '';
  formIsSaving = false;
  ccbMemberAsBackup;

  constructor(
    private actRouter: ActivatedRoute,
    private authSrv: AuthService,
    private responsiveSrv: ResponsiveService,
    private translateSrv: TranslateService,
    private personSrv: PersonService,
    private breadcrumbSrv: BreadcrumbService,
    private messageSrv: MessageService,
    private router: Router,
    private citizenUserSrv: CitizenUserService,
    private authServerSrv: AuthServerService,
    private formBuilder: FormBuilder,
    private planSrv: PlanService,
    private ccbMemberSrv: ControlChangeBoardService,
    private breadcrumbStorageSrv: WorkpackBreadcrumbStorageService
  ) {
    this.actRouter.queryParams.subscribe(async queryParams => {
      this.idPerson = +queryParams.idPerson;
      this.idProject = +queryParams.idProject;
      this.idOffice = +queryParams.idOffice;
      if (queryParams.idPlan) {
        localStorage.setItem('@currentPlan', queryParams.idPlan);
      }
      await this.loadCcbMember();
    });
    this.responsiveSrv.observable.pipe(takeUntil(this.$destroy)).subscribe(value => {
      this.responsive = value;
    });
    this.debounceSearch.pipe(debounceTime(500), takeUntil(this.$destroy)).subscribe(async() => {
      if (this.searchedEmailPerson.length > 5 && this.validateEmail()) {
        // Limpo antes: a partir daqui a mensagem pertence a busca, que a usa para
        // avisar quando a API falha. Limpar depois apagava esse aviso.
        this.invalidMailMessage = undefined;
        await this.searchPerson();
      } else {
        this.invalidMailMessage = this.searchedEmailPerson.length > 0 ? this.translateSrv.instant('messages.invalidEmail') : '';
        this.ccbMember.person = null;
        this.setMemberAsCcbMember(this.ccbMember.person);
        this.saveButton?.hideButton();
      }
    });
    this.ccbMember.person = this.ccbMember.person || {} as IPerson;
    this.ccbMember.person.isUser = true;
  }

  async ngOnDestroy(): Promise<void> {
    this.$destroy.next();
    this.$destroy.complete();
    this.citizenUserSrv.unloadCitizenUsers();
  }

  async ngOnInit() {
    await this.getAuthServer();
    await this.loadCurrentUserInfo();
    this.loadCards();
    await this.loadPropertiesPlan();
    await this.setBreadcrumb();
  }

  async setBreadcrumb() {
    const breadcrumbItems = await this.getBreadcrumbs();
    this.breadcrumbStorageSrv.setBreadcrumbStorage(breadcrumbItems);
    this.breadcrumbSrv.setMenu([
      ...breadcrumbItems,
      {
        key: 'changeControlBoard',
        info: 'ccbMembers',
        routerLink: ['/workpack/change-control-board'],
        queryParams: {
          idProject: this.idProject,
          idOffice: this.idOffice
        },
      },
      {
        key: 'ccbMember',
        info: this.ccbMember && this.ccbMember.person ? this.ccbMember.person.name : ''
      }
    ]);
  }

  async getBreadcrumbs() {
    const { success, data } = await this.breadcrumbSrv.getBreadcrumbWorkpack
      (this.idProject, { 'id-plan': this.idPlan });
    return success
      ? data.map(p => ({
        key: !p.modelName ? p.type.toLowerCase() : p.modelName,
        info: p.name,
        tooltip: p.fullName,
        routerLink: this.getRouterLinkFromType(p.type),
        queryParams: { id: p.id, idWorkpackModelLinked: p.idWorkpackModelLinked, idPlan: this.idPlan },
        modelName: p.modelName
      }))
      : [];
  }

  getRouterLinkFromType(type: string): string[] {
    switch (type) {
      case 'office':
        return ['/offices', 'office'];
      case 'plan':
        return ['plan'];
      default:
        return ['/workpack'];
    }
  }

  loadCards() {
    this.cardPerson = {
      toggleable: false,
      initialStateToggle: false,
      cardTitle: '',
      collapseble: true,
      initialStateCollapse: false
    };
    this.cardMemberAs = {
      toggleable: false,
      initialStateToggle: false,
      cardTitle: 'memberAs',
      collapseble: true,
      initialStateCollapse: false
    } as ICard;
  }


  setPhoneNumberMask() {
    const valor = this.formPerson.controls.phoneNumber.value;
    if (valor.length < 10 && valor) {
      this.formPerson.controls.phoneNumber.setValue(null);
      return;
    }
    const retorno = this.formatPhoneNumber(valor);
    this.formPerson.controls.phoneNumber.setValue(retorno);
  }

  formatPhoneNumber(value: string) {
    if (!value) {
      return value;
    }
    let formatedValue = value.replace(/\D/g, '');
    formatedValue = formatedValue.replace(/^0/, '');
    if (formatedValue.length > 10) {
      formatedValue = formatedValue.replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (formatedValue.length > 5) {
      formatedValue = formatedValue.replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else if (formatedValue.length > 2) {
      formatedValue = formatedValue.replace(/^(\d\d)(\d{0,5})/, '($1) $2');
    } else {
      if (formatedValue.length != 0) {
        formatedValue = formatedValue.replace(/^(\d*)/, '($1');
      }
    }
    return formatedValue;
  }

  setPhoneNumberPlaceholder() {
    const valor = this.formPerson.controls.phoneNumber.value;
    if (!valor || valor.length === 0) {
      this.phoneNumberPlaceholder = '(99) 99999-9999';
    }
  }

  clearPhoneNumberPlaceholder() {
    this.phoneNumberPlaceholder = '';
  }

  async loadPropertiesPlan() {
    this.idPlan = Number(localStorage.getItem('@currentPlan'));
    this.plan = await this.planSrv.getCurrentPlan(this.idPlan);
  }

  async loadCcbMember() {
    if (this.idPerson && this.idProject) {
      this.idPlan = Number(localStorage.getItem('@currentPlan'));
      this.isLoading = true;
      const {data, success} = await this.ccbMemberSrv.getCcbMember(
        {
          'id-person': this.idPerson,
          'id-workpack': this.idProject,
          'id-plan': this.idPlan
        });
      if (success) {
        this.ccbMember = data;
        if (this.ccbMember) {
          this.setFormPerson(this.ccbMember.person);
          this.setMemberAsCcbMember(this.ccbMember.person);
          this.ccbMemberAsBackup = this.ccbMember.memberAs.map(item => ({ ...item }));
        }
        this.isLoading = false;
      }
    }
  }

  setFormPerson(person: IPerson) {
    this.formPerson = this.formBuilder.group({
      address: [person ? person.address : ''],
      phoneNumber: [person ? this.formatPhoneNumber(person.phoneNumber) : ''],
      contactEmail: [person ? person.contactEmail : '', Validators.email],
    });
  }

  /**
   * Papeis chegam da API em dois formatos: `GET /persons/{key}` devolve uma lista
   * de strings e os demais endpoints devolvem `{ role, workLocation }`. Sem
   * normalizar, `role.role` fica indefinido e a traducao lanca excecao, abortando
   * a busca antes de reavaliar o botao Salvar.
   */
  normalizeRole(role: IPersonRoleResponse): IPersonRole {
    if (!role) {
      return null;
    }
    if (typeof role === 'string') {
      const roleName = role.trim();
      return roleName ? {role: roleName, workLocation: undefined} : null;
    }
    const roleName = typeof role.role === 'string' ? role.role.trim() : '';
    return roleName ? {role: roleName, workLocation: role.workLocation} : null;
  }

  /** Chave vazia faz o ngx-translate lancar; papel sem traducao mantem o texto original. */
  translateRole(role: string): string {
    return role ? this.translateSrv.instant(role) : role;
  }

  setMemberAsCcbMember(person: IPerson) {
    const current = this.idPerson ? (this.ccbMember.memberAs || []) : [];
    const personRoles = (person?.roles || [])
      .map(role => this.normalizeRole(role))
      .filter(role => !!role);
    const activateCitizenByDefault = !this.idPerson
      && personRoles.length === 1
      && personRoles[0].role.toLowerCase() === 'citizen';

    const normalizedPersonRoles = personRoles.map(role => ({
      role: this.translateRole(role.role),
      workLocation: role.workLocation
    }));

    const allRoles = [...current, ...normalizedPersonRoles];

    const unique = allRoles.reduce((acc: any[], item: any) => {
      const exists = acc.find(m => m.role === item.role);

      if (!exists) {
        acc.push({
          active: 'active' in item ? item.active : activateCitizenByDefault,
          role: item.role,
          workLocation: item.workLocation
        });
      }

      return acc;
    }, []);

    this.ccbMember.memberAs = unique;
  }

  async getAuthServer() {
    const result = await this.authServerSrv.GetAuthServer();
    if (result.success) {
      this.citizenAuthServer = result.data;
    }
  }

  validateEmail() {
    if (this.searchedEmailPerson.includes('@')) {
      const email = this.searchedEmailPerson.split('@');
      return email[1] !== '';
    }
    return false;
  }

  async loadCurrentUserInfo() {
    this.currentUserInfo = await this.authSrv.getInfoPerson();
  }

  /**
   * A visibilidade do botao e decidida uma vez so, no fim. Esconder antes da
   * requisicao criava uma corrida: o `:leave` do botao dura 200ms e a resposta da API
   * chega dentro dessa janela, entao o `:enter` disputava com a saida ainda rodando e
   * as vezes perdia — o botao ficava escondido com o papel ligado, que e o relato do
   * #10519. Medido em dev: a opacidade caia para 0.11 em t+700ms.
   *
   * O `showSaveButton()` do finally cobre os tres desfechos (encontrada, 204 e falha),
   * entao nada se perde ao nao esconder antes, e qualquer saida — inclusive uma
   * excecao — deixa a tela num estado coerente.
   */
  async searchPerson() {
    try {
      this.ccbMember.person = await this.findPersonByEmail();
    } finally {
      this.setFormPerson(this.ccbMember.person);
      this.setMemberAsCcbMember(this.ccbMember.person);
      this.showSaveButton();
    }
  }

  /**
   * Tres desfechos, nao dois. O interceptor nunca rejeita: em erro ele devolve
   * `{ success: false, data: <corpo do erro> }`. Quem olha so o `data` aceita o corpo
   * do erro como se fosse a pessoa — e como ele nao tem `roles`, o cartao "Participa
   * como" fica vazio e o botao Salvar some sem mensagem nenhuma.
   *
   * Na falha a busca nao cai no cadastro novo de proposito: sem resposta da API nao da
   * para afirmar que a pessoa nao existe, e seguir em frente criaria pessoa duplicada.
   */
  private async findPersonByEmail(): Promise<IPerson> {
    if (!this.searchedEmailPerson) {
      return null;
    }

    const result = await this.personSrv.GetByKey(this.searchedEmailPerson);

    if (result && result.success === false) {
      this.invalidMailMessage = this.translateSrv.instant('messages.error.generic');
      return null;
    }

    if (result?.data) {
      this.showSearchInputMessage = false;
      return {...result.data, email: this.searchedEmailPerson};
    }

    // 204 No Content: a pessoa nao existe e sera criada junto com o membro.
    const [name] = this.searchedEmailPerson.split('@');
    return {
      name,
      email: this.searchedEmailPerson,
      roles: [{role: 'citizen', workLocation: undefined}]
    };
  }

  validateClearSearchUserName(event) {
    if (!event || (event.length === 0)) {
      this.publicServersResult = [];
      this.showListBoxPublicServers = false;
      this.showMessagePublicServerNotFoundByName = false;
    }
  }

  validateClearSearchByUser() {
    this.ccbMember.person = undefined;
    this.publicServersResult = [];
    this.showListBoxPublicServers = false;
    this.showMessagePublicServerNotFoundByName = false;
    this.citizenUserNotFoundByCpf = false;
    this.validCpf = true;
    this.searchedCpfUser = null;
    this.searchedNameUser = null;
    this.setFormPerson(this.ccbMember.person);
    this.setMemberAsCcbMember(this.ccbMember.person);
    this.saveButton?.hideButton();
  }

  async searchCitizenUserByName() {
    this.saveButton?.hideButton();
    this.publicServersResult = [];
    if (this.ccbMember.person) {
      this.ccbMember.person = undefined;
    }
    this.isLoading = true;
    const result = await this.citizenUserSrv.GetPublicServersByName({
      name: this.searchedNameUser,
      idOffice: this.idOffice
    });
    this.isLoading = false;
    if (result.success) {
      this.publicServersResult = result.data;
      this.showListBoxPublicServers = this.publicServersResult.length > 0;
    }
    this.showMessagePublicServerNotFoundByName = !this.publicServersResult ||
      (this.publicServersResult && this.publicServersResult.length === 0);
    this.setFormPerson(this.ccbMember.person);
    this.setMemberAsCcbMember(this.ccbMember.person);
  }

  validateClearSearchByCpf(event) {
    if (!event || (event.length === 0)) {
      this.ccbMember.person = undefined;
      this.validCpf = true;
      this.citizenUserNotFoundByCpf = false;
      this.setFormPerson(this.ccbMember.person);
      this.setMemberAsCcbMember(this.ccbMember.person);
      this.saveButton?.hideButton();
    }
  }

  async validateCpf() {
    this.saveButton?.hideButton();
    this.citizenUserNotFoundByCpf = false;
    this.validCpf = cpfValidator(this.searchedCpfUser);
    if (this.validCpf) {
      this.isLoading = true;
      const result = await this.citizenUserSrv.GetCitizenUserByCpf({
        cpf: this.searchedCpfUser,
        idOffice: this.idOffice,
        loadWorkLocation: true
      });
      this.isLoading = false;
      if (result.success) {
        this.ccbMember.person = result.data;
        this.setFormPerson(this.ccbMember.person);
        this.setMemberAsCcbMember(this.ccbMember.person);
        this.showSaveButton();
      } else {
        this.citizenUserNotFoundByCpf = true;
      }
    }
  }

  async handleSelectedPublicServer(event) {
    this.showListBoxPublicServers = false;
    this.isLoading = true;
    const publicServer = event.value;
    const result = await this.citizenUserSrv.GetPublicServer(publicServer.sub, {
      idOffice: this.idOffice,
      loadWorkLocation: false
    });
    this.isLoading = false;
    if (result.success) {
      this.ccbMember.person = result.data;
      this.setFormPerson(this.ccbMember.person);
      this.setMemberAsCcbMember(this.ccbMember.person);
      this.showSaveButton();
      this.searchedNameUser = '';
      this.publicServersResult = [];
      this.showListBoxPublicServers = false;
    }
  }

  showSaveButton() {
    if (this.hasActiveMemberAs()) {
      this.saveButton?.showButton();
    } else {
      this.saveButton?.hideButton();
    }
    this.cancelButton?.showButton();
  }

  hasActiveMemberAs(): boolean {
    return (this.ccbMember.memberAs || []).some(memberAs => memberAs.active);
  }

  async saveCcbMember() {
    if (!this.hasActiveMemberAs()) {
      this.saveButton?.hideButton();
      return;
    }
    this.cancelButton.hideButton();
    let phoneNumber = this.formPerson.controls.phoneNumber.value;
    if (phoneNumber) {
      phoneNumber = phoneNumber.replace(/\D+/g, '');
    }

    const filteredMemberAs = (this.ccbMember.memberAs || [])
    .filter(m => m.active);

    const sender = {
      ...this.ccbMember,
      memberAs: filteredMemberAs,
      idOffice: this.plan.idOffice,
      idWorkpack: this.idProject,
      person: {
        ...this.ccbMember.person,
        ...this.formPerson.value,
        phoneNumber,
        isUser: this.isUser
      }
    } as IControlChangeBoard;
    this.formIsSaving = true;
    if (this.idPerson) {
      await this.ccbMemberSrv.Put(sender);
    } else {
      await this.ccbMemberSrv.post(sender);
    }
    this.formIsSaving = false;
    this.messageSrv.add({
      severity: 'success',
      summary: this.translateSrv.instant('success'),
      detail: this.translateSrv.instant('messages.savedSuccessfully')
    });
    await this.router.navigate(['/workpack/change-control-board'], {
      queryParams: {
        idProject: this.idProject,
        idOffice: this.idOffice
      }
    });
  }

  handleOnCancel() {
    this.saveButton.hideButton();
    this.formPerson.reset({
      address: this.ccbMember && this.ccbMember.person ? this.ccbMember.person.address : '',
      phoneNumber: this.ccbMember && this.ccbMember.person ? this.formatPhoneNumber(this.ccbMember.person.phoneNumber) : '',
      contactEmail: this.ccbMember && this.ccbMember.person ? this.ccbMember.person.contactEmail : ''
    });
    if (!this.idPerson) {
      this.validateClearSearchByCpf('');
      this.validateClearSearchByUser();
      this.validateClearSearchUserName('');
      this.citizenSearchBy = 'CPF';
    } else {
      this.ccbMember.memberAs = this.ccbMemberAsBackup.map( item => ({...item}));
    }
  }

}
