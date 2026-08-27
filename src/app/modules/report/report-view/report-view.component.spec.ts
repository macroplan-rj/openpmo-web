import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, of } from 'rxjs';

import { ReportViewComponent } from './report-view.component';
import { ResponsiveService } from 'src/app/shared/services/responsive.service';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { ReportModelService } from 'src/app/shared/services/report-model.service';
import { DomainService } from 'src/app/shared/services/domain.service';
import { LocalityService } from 'src/app/shared/services/locality.service';
import { OrganizationService } from 'src/app/shared/services/organization.service';
import { MeasureUnitService } from 'src/app/shared/services/measure-unit.service';
import { ReportService } from 'src/app/shared/services/report.service';
import { MenuService } from 'src/app/shared/services/menu.service';
import { IMenuWorkpack } from 'src/app/shared/interfaces/IMenu';

const ID_PLAN = 701;

// Espelha o menu de portfolio do plano GIP: portfolios com filhos, projetos como folhas.
// As folhas vem com children nulo — loadTreeNodeScope trata `if (workpack.children)`,
// e um array vazio seria truthy, mudando o comportamento sob teste.
const folha = (id: string, name: string): IMenuWorkpack =>
  ({ id, name, fontIcon: 'app-icon project', children: null });

const MENU_ITEMS: IMenuWorkpack[] = [
  {
    id: '810', name: 'Rodovias', fontIcon: 'app-icon portfolio',
    children: [folha('820', 'Ponte do Futuro')]
  },
  {
    id: '811', name: 'Transicao Energetica', fontIcon: 'app-icon portfolio',
    children: [folha('1056', 'Cabedelo Shore Power')]
  },
];

describe('ReportViewComponent', () => {
  let component: ReportViewComponent;
  let fixture: ComponentFixture<ReportViewComponent>;
  let menuPortfolioItems$: Subject<IMenuWorkpack[]>;

  beforeEach(async () => {
    menuPortfolioItems$ = new Subject<IMenuWorkpack[]>();
    localStorage.setItem('@currentPlan', String(ID_PLAN));
    localStorage.setItem('@pmo/propertiesCurrentPlan', JSON.stringify({ id: ID_PLAN, name: 'GIP' }));
    localStorage.removeItem('@pmo/propertiesCurrentOffice');

    await TestBed.configureTestingModule({
      declarations: [ReportViewComponent],
      imports: [TranslateModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ResponsiveService, useValue: { observable: of(false) } },
        { provide: BreadcrumbService, useValue: { setMenu: () => undefined } },
        { provide: ReportModelService, useValue: { GetById: () => Promise.resolve({ success: false }) } },
        { provide: ActivatedRoute, useValue: { queryParams: of({ id: '923' }) } },
        { provide: DomainService, useValue: {} },
        { provide: LocalityService, useValue: {} },
        { provide: OrganizationService, useValue: {} },
        { provide: MeasureUnitService, useValue: {} },
        { provide: ReportService, useValue: { REPORT_GENERATE_SCOPE_PARAMETER_INVALID: 'report-design.generate.scope.parameter.invalid' } },
        { provide: MessageService, useValue: { add: () => undefined } },
        { provide: MenuService, useValue: { obsMenuPortfolioItems: menuPortfolioItems$.asObservable() } },
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ReportViewComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('envia o id do plano uma unica vez quando o menu emite uma vez', () => {
    component.loadScope(MENU_ITEMS);
    component.prepareScope();
    expect(component.scope).toEqual([ID_PLAN]);
  });

  // Regressao SA-528: obsMenuPortfolioItems emite mais de uma vez. Antes da correcao,
  // selectedWorkpacks acumulava e o escopo saia como [701, 701]. Com dois elementos,
  // GetReportScope nao entra no ramo que expande o plano nos seus workpacks
  // (scope.size() == 1 && scope.get(0).equals(idPlan)), o Cypher casa com nada e o
  // backend devolve HTTP 200 com um PDF de 1 pagina em branco.
  it('nao duplica o escopo quando o menu emite mais de uma vez', () => {
    component.loadScope(MENU_ITEMS);
    component.loadScope(MENU_ITEMS);
    component.loadScope(MENU_ITEMS);

    component.prepareScope();

    expect(component.scope).toEqual([ID_PLAN]);
    expect(component.scope.length).toBe(1);
  });

  it('nao acumula selectedWorkpacks entre emissoes do menu', () => {
    component.loadScope(MENU_ITEMS);
    const aposPrimeira = component.selectedWorkpacks.length;

    component.loadScope(MENU_ITEMS);

    expect(component.selectedWorkpacks.length).toBe(aposPrimeira);
  });

  it('monta a arvore de escopo com o plano na raiz a cada emissao', () => {
    component.loadScope(MENU_ITEMS);
    component.loadScope(MENU_ITEMS);

    expect(component.reportScope.length).toBe(1);
    expect(component.reportScope[0].data).toBe(ID_PLAN);
    expect(component.reportScope[0].children.length).toBe(MENU_ITEMS.length);
  });

  // Regressao SA-528: nenhum caminho de erro resetava isGenerating, e o botao
  // ficava preso em "gerando" ate o usuario recarregar a tela.
  describe('estado do botao de geracao', () => {
    beforeEach(() => {
      component.reportModel = { id: 923, name: 'Ficha GIP', idPlanModel: 682 } as any;
      component.reportProperties = [];
      component.generateReportEnabled = true;
      component.loadScope(MENU_ITEMS);
    });

    it('libera o botao apos erro de escopo sem resultado', async () => {
      const srv = TestBed.inject(ReportService) as any;
      srv.generateReport = () => Promise.resolve({
        status: 400,
        body: new Blob(['{"erro":"report-design.generate.scope.parameter.invalid"}']),
        headers: { get: () => null }
      });

      await component.handleGenerateReport();

      expect(component.isGenerating).toBeFalse();
    });

    it('libera o botao quando a resposta nao traz corpo', async () => {
      const srv = TestBed.inject(ReportService) as any;
      srv.generateReport = () => Promise.resolve({ status: 500, body: null, headers: { get: () => null } });

      await component.handleGenerateReport();

      expect(component.isGenerating).toBeFalse();
    });

    it('libera o botao quando a chamada rejeita', async () => {
      const srv = TestBed.inject(ReportService) as any;
      srv.generateReport = () => Promise.reject(new Error('rede'));

      await expectAsync(component.handleGenerateReport()).toBeRejected();

      expect(component.isGenerating).toBeFalse();
    });
  });

  // Regressao SA-528: a tela aceitava qualquer modelo pelo id da query string.
  describe('modelo x plano corrente', () => {
    it('aceita o modelo do mesmo PlanModel do plano corrente', () => {
      localStorage.setItem('@pmo/propertiesCurrentPlan',
        JSON.stringify({ id: ID_PLAN, name: 'GIP', idPlanModel: 682 }));
      component.reportModel = { idPlanModel: 682 } as any;

      expect(component.modeloPertenceAoPlano()).toBeTrue();
    });

    it('recusa o modelo de outro PlanModel e desabilita a geracao', () => {
      localStorage.setItem('@pmo/propertiesCurrentPlan',
        JSON.stringify({ id: ID_PLAN, name: 'PELP 2047', idPlanModel: 39 }));
      component.reportModel = { idPlanModel: 682 } as any;
      component.generateReportEnabled = true;

      expect(component.modeloPertenceAoPlano()).toBeFalse();
      expect(component.generateReportEnabled).toBeFalse();
    });

    it('nao bloqueia quando o plano guardado nao informa o PlanModel', () => {
      localStorage.setItem('@pmo/propertiesCurrentPlan',
        JSON.stringify({ id: ID_PLAN, name: 'GIP' }));
      component.reportModel = { idPlanModel: 682 } as any;

      expect(component.modeloPertenceAoPlano()).toBeTrue();
    });
  });
});
