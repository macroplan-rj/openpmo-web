import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterTestingModule } from '@angular/router/testing';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Subject, of } from 'rxjs';

import { WorkpackCardItemComponent } from './workpack-card-item.component';
import { IWorkpackCardItem } from '../../interfaces/IWorkpackCardItem';
import { ResponsiveService } from '../../services/responsive.service';
import { WorkpackService } from '../../services/workpack.service';
import { JournalService } from '../../services/journal.service';

/**
 * US-003 — previsao de entrega no card e na tira.
 *
 * O spec anterior tinha apenas o `should create` gerado pelo CLI e nem fornecia o @Input
 * `properties`, que o ngOnInit acessa. O TestBed abaixo e o minimo para exercitar o
 * componente de verdade.
 */
/** Stub do pipe do ngx-translate: NO_ERRORS_SCHEMA cobre elementos, nao pipes. */
@Pipe({ name: 'translate' })
class TranslateStubPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

describe('WorkpackCardItemComponent', () => {
  let component: WorkpackCardItemComponent;
  let fixture: ComponentFixture<WorkpackCardItemComponent>;

  const langChange = new Subject<any>();

  let workpackSrvMock: any;

  beforeEach(() => {
    workpackSrvMock = {
      nextPendingChanges: jasmine.createSpy('nextPendingChanges'),
      patchMilestoneReason: jasmine.createSpy('patchMilestoneReason')
        .and.returnValue(Promise.resolve({ success: true })),
      completeDeliverable: jasmine.createSpy('completeDeliverable')
        .and.returnValue(Promise.resolve({ success: true }))
    };
  });

  const buildProperties = (overrides: Partial<IWorkpackCardItem> = {}): IWorkpackCardItem => ({
    typeCardItem: 'Deliverable',
    icon: 'deliverable',
    iconSvg: false,
    nameCardItem: 'Modelagem Normativa',
    fullNameCardItem: 'Modelagem Normativa',
    itemId: 1467,
    menuItems: [],
    urlCard: '/workpack',
    dashboardData: null,
    ...overrides
  });

  /** Texto da previsao renderizado, ou null quando o elemento nao existe. */
  const renderedForecast = (): string => {
    const el: HTMLElement = fixture.nativeElement.querySelector('.card-item-delivery-forecast');
    return el ? el.textContent.trim() : null;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [WorkpackCardItemComponent, TranslateStubPipe],
      imports: [RouterTestingModule],
      providers: [
        DatePipe,
        { provide: ResponsiveService, useValue: { observable: of(false) } },
        {
          provide: TranslateService,
          useValue: {
            currentLang: 'pt-BR',
            onLangChange: langChange.asObservable(),
            instant: (key: string) => key
          }
        },
        { provide: WorkpackService, useValue: workpackSrvMock },
        { provide: MessageService, useValue: { add: () => {} } },
        { provide: JournalService, useValue: { GetById: () => Promise.resolve({ success: true, data: {} }) } }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WorkpackCardItemComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // O card-item e pesado (p-card, overlay panels, tooltips). Sem destruir a fixture, as
    // instancias se acumulam e o servidor do karma cai com
    // "Cannot read properties of undefined (reading 'range')" a partir de ~16 casos.
    fixture.destroy();
  });

  it('should create', () => {
    component.properties = buildProperties();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('previsao de entrega', () => {

    it('exibe a data no card quando o deliverable tem previsao', () => {
      component.properties = buildProperties({ deliveryForecastDate: '2026-12-01' });
      component.displayModeCard = 'grid';
      fixture.detectChanges();

      expect(renderedForecast()).toBe('01/12/2026');
    });

    it('exibe a data na tira quando o deliverable tem previsao', () => {
      component.properties = buildProperties({ deliveryForecastDate: '2026-12-01' });
      component.displayModeCard = 'list';
      component.responsive = false;
      fixture.detectChanges();

      expect(renderedForecast()).toBe('01/12/2026');
    });

    it('apresenta a mesma data no card e na tira', () => {
      component.properties = buildProperties({ deliveryForecastDate: '2027-06-30' });
      component.displayModeCard = 'grid';
      fixture.detectChanges();
      const noCard = renderedForecast();

      component.displayModeCard = 'list';
      component.responsive = false;
      fixture.detectChanges();
      const naTira = renderedForecast();

      expect(noCard).toBe(naTira);
      expect(noCard).toBe('30/06/2027');
    });

    it('nao renderiza nada quando o deliverable nao tem previsao', () => {
      component.properties = buildProperties({ deliveryForecastDate: undefined });
      component.displayModeCard = 'grid';
      fixture.detectChanges();

      expect(renderedForecast()).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.card-item-delivery-forecast').length).toBe(0);
    });

    it('nao desloca a data por fuso horario', () => {
      // A API manda 'yyyy-MM-dd' sem hora. Se o pipe interpretasse como UTC, em
      // America/Sao_Paulo (UTC-3) o dia 01 viraria 30/11 na exibicao.
      component.properties = buildProperties({ deliveryForecastDate: '2026-12-01' });
      component.displayModeCard = 'grid';
      fixture.detectChanges();

      expect(renderedForecast()).toBe('01/12/2026');
      expect(renderedForecast()).not.toBe('30/11/2026');
    });

    it('usa o formato yyyy/MM/dd fora do pt-BR', () => {
      component.properties = buildProperties({ deliveryForecastDate: '2026-12-01' });
      component.displayModeCard = 'grid';
      fixture.detectChanges();

      component.language = 'en-US';
      fixture.detectChanges();

      expect(renderedForecast()).toBe('2026/12/01');
    });
  });

  describe('modal de edicao do marco critico (US-004)', () => {

    const marco = (over = {}) => buildProperties({
      typeCardItem: 'Milestone',
      nameCardItem: 'Publicacao da norma',
      subtitleCardItem: '2026-10-01',
      editPermission: true,
      ...over
    });

    it('nao abre sem permissao de edicao', () => {
      component.properties = marco({ editPermission: false });
      fixture.detectChanges();

      component.openMilestoneEditModal();

      expect(component.showMilestoneEditModal).toBeFalse();
    });

    it('nao abre para marco cancelado', () => {
      component.properties = marco({ canceled: true });
      fixture.detectChanges();

      component.openMilestoneEditModal();

      expect(component.showMilestoneEditModal).toBeFalse();
    });

    it('abre partindo do estado atual do card', () => {
      component.properties = marco({ completed: true });
      fixture.detectChanges();

      component.openMilestoneEditModal();

      expect(component.showMilestoneEditModal).toBeTrue();
      expect(component.milestoneEditCompleted).toBeTrue();
      expect(component.milestoneEditDate).toEqual(component.milestoneDate);
    });

    it('fecha descartando o que foi editado', () => {
      component.properties = marco();
      fixture.detectChanges();
      component.openMilestoneEditModal();

      component.milestoneEditReason = 'texto que nao deve sobreviver';
      component.milestoneEditCompleted = true;
      component.closeMilestoneEditModal();

      expect(component.showMilestoneEditModal).toBeFalse();
      expect(component.milestoneEditReason).toBe('');
      expect(component.milestoneEditCompleted).toBe(!!component.properties.completed);
    });

    it('reabrir nao herda o que foi digitado antes de cancelar', () => {
      component.properties = marco();
      fixture.detectChanges();

      component.openMilestoneEditModal();
      component.milestoneEditReason = 'rascunho descartado';
      component.closeMilestoneEditModal();
      component.openMilestoneEditModal();

      expect(component.milestoneEditReason).toBe('');
    });
  });

  describe('lapis substitui o calendario inline (US-004)', () => {

    const marco = (over = {}) => buildProperties({
      typeCardItem: 'Milestone',
      nameCardItem: 'Publicacao da norma',
      subtitleCardItem: '2026-10-01',
      editPermission: true,
      ...over
    });

    const lapis = () => fixture.nativeElement.querySelector('.milestone-edit-icon');
    const calendarioInline = () =>
      fixture.nativeElement.querySelector('.calendar-container p-calendar');

    it('card mostra a data com lapis e sem calendario inline', () => {
      component.properties = marco();
      component.displayModeCard = 'grid';
      fixture.detectChanges();

      expect(lapis()).toBeTruthy();
      expect(calendarioInline()).toBeNull();
      expect(fixture.nativeElement.querySelector('.milestone-date-row').textContent)
        .toContain('01/10/2026');
    });

    it('tira mostra a data com lapis e sem calendario inline', () => {
      component.properties = marco();
      component.displayModeCard = 'list';
      fixture.detectChanges();

      expect(lapis()).toBeTruthy();
      expect(calendarioInline()).toBeNull();
    });

    it('sem permissao de edicao a data aparece mas o lapis nao', () => {
      component.properties = marco({ editPermission: false });
      component.displayModeCard = 'grid';
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.milestone-date-row')).toBeTruthy();
      expect(lapis()).toBeNull();
    });

    it('o lapis abre o modal', () => {
      component.properties = marco();
      component.displayModeCard = 'grid';
      fixture.detectChanges();

      lapis().click();

      // Sem detectChanges de proposito: renderizar o p-dialog aqui derruba o karma
      // (webpack-dev-middleware). O clique ja altera o estado de forma sincrona, que e
      // o que este caso precisa verificar.
      expect(component.showMilestoneEditModal).toBeTrue();
    });
  });

  describe('data futura bloqueia a conclusao (US-004)', () => {

    const marco = (over = {}) => buildProperties({
      typeCardItem: 'Milestone',
      nameCardItem: 'Publicacao da norma',
      subtitleCardItem: '2026-10-01',
      editPermission: true,
      ...over
    });

    const emDias = (n: number): Date => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return d;
    };

    beforeEach(() => {
      // Nao abrimos o modal aqui: `isMilestoneEditDateInFuture` e derivado apenas de
      // milestoneEditDate, e manter o p-dialog fora do DOM evita a queda do karma.
      component.properties = marco();
      fixture.detectChanges();
    });

    it('amanha e futuro', () => {
      component.milestoneEditDate = emDias(1);
      expect(component.isMilestoneEditDateInFuture).toBeTrue();
    });

    it('hoje NAO e futuro, mesmo com hora avancada', () => {
      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);
      component.milestoneEditDate = hoje;

      expect(component.isMilestoneEditDateInFuture).toBeFalse();
    });

    it('hoje de madrugada tambem NAO e futuro', () => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      component.milestoneEditDate = hoje;

      expect(component.isMilestoneEditDateInFuture).toBeFalse();
    });

    it('ontem NAO e futuro', () => {
      component.milestoneEditDate = emDias(-1);
      expect(component.isMilestoneEditDateInFuture).toBeFalse();
    });

    it('sem data escolhida nao bloqueia', () => {
      component.milestoneEditDate = null;
      expect(component.isMilestoneEditDateInFuture).toBeFalse();
    });

    it('escolher data futura desmarca o Concluido', () => {
      component.milestoneEditCompleted = true;

      component.milestoneEditDate = emDias(3);
      component.onMilestoneEditDateChange();

      expect(component.milestoneEditCompleted).toBeFalse();
    });

    it('escolher data passada nao mexe no Concluido', () => {
      component.milestoneEditCompleted = true;

      component.milestoneEditDate = emDias(-3);
      component.onMilestoneEditDateChange();

      expect(component.milestoneEditCompleted).toBeTrue();
    });
  });

  describe('salvar pelo modal (US-004)', () => {

    const marco = (over = {}) => buildProperties({
      typeCardItem: 'Milestone',
      nameCardItem: 'Publicacao da norma',
      subtitleCardItem: '2026-10-01',
      itemId: 42,
      editPermission: true,
      ...over
    });

    const abrir = (over = {}) => {
      component.properties = marco(over);
      fixture.detectChanges();
      component.openMilestoneEditModal();
    };

    it('nada mudou: fecha sem chamar endpoint nenhum', async () => {
      abrir();

      await component.saveMilestoneEdit();

      expect(workpackSrvMock.patchMilestoneReason).not.toHaveBeenCalled();
      expect(workpackSrvMock.completeDeliverable).not.toHaveBeenCalled();
      expect(component.showMilestoneEditModal).toBeFalse();
    });

    it('so a data mudou: chama apenas o endpoint de marco', async () => {
      abrir();
      component.milestoneEditDate = new Date(2026, 10, 20);

      await component.saveMilestoneEdit();

      expect(workpackSrvMock.patchMilestoneReason).toHaveBeenCalledTimes(1);
      expect(workpackSrvMock.completeDeliverable).not.toHaveBeenCalled();
      expect(component.properties.subtitleCardItem).toBe('2026-11-20');
    });

    it('so a conclusao mudou: chama apenas complete-deliverable', async () => {
      abrir();
      component.milestoneEditDate = new Date(2020, 0, 15);
      component.properties.subtitleCardItem = '2020-01-15';
      component.setMilestoneDateProperty();
      component.milestoneEditDate = component.milestoneDate;
      component.milestoneEditCompleted = true;

      await component.saveMilestoneEdit();

      expect(workpackSrvMock.patchMilestoneReason).not.toHaveBeenCalled();
      expect(workpackSrvMock.completeDeliverable).toHaveBeenCalledTimes(1);
      expect(component.properties.completed).toBeTrue();
    });

    it('com baseline ativa, data nova sem justificativa nao salva', async () => {
      abrir({ hasBaseline: true });
      component.milestoneEditDate = new Date(2026, 10, 20);
      component.milestoneEditReason = '   ';

      await component.saveMilestoneEdit();

      expect(workpackSrvMock.patchMilestoneReason).not.toHaveBeenCalled();
      expect(component.showMilestoneEditModal).toBeTrue();
    });

    it('com baseline ativa e justificativa preenchida, salva', async () => {
      abrir({ hasBaseline: true });
      component.milestoneEditDate = new Date(2026, 10, 20);
      component.milestoneEditReason = 'reprogramacao acordada';

      await component.saveMilestoneEdit();

      expect(workpackSrvMock.patchMilestoneReason).toHaveBeenCalledTimes(1);
      expect(component.showMilestoneEditModal).toBeFalse();
    });

    it('sem baseline a justificativa nao e exigida', async () => {
      abrir({ hasBaseline: false });
      component.milestoneEditDate = new Date(2026, 10, 20);

      await component.saveMilestoneEdit();

      expect(workpackSrvMock.patchMilestoneReason).toHaveBeenCalledTimes(1);
    });

    it('falha ao gravar a data nao tenta concluir', async () => {
      workpackSrvMock.patchMilestoneReason.and.returnValue(Promise.resolve({ success: false }));
      abrir();
      component.milestoneEditDate = new Date(2026, 10, 20);
      component.milestoneEditCompleted = true;

      await component.saveMilestoneEdit();

      expect(workpackSrvMock.completeDeliverable).not.toHaveBeenCalled();
      expect(component.showMilestoneEditModal).toBeTrue();
    });

    it('concluir reflete o status no card sem recarregar', async () => {
      abrir();
      component.milestoneEditDate = new Date(2020, 0, 15);
      component.properties.subtitleCardItem = '2020-01-15';
      component.setMilestoneDateProperty();
      component.milestoneEditDate = component.milestoneDate;
      component.milestoneEditCompleted = true;

      await component.saveMilestoneEdit();

      expect(component.properties.statusItem).toBe('concluded');
    });
  });
});
