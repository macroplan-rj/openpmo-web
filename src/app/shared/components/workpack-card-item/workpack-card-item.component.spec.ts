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
        { provide: WorkpackService, useValue: { nextPendingChanges: () => {}, patchMilestoneReason: () => Promise.resolve({ success: true }) } },
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
});
