import { FormBuilder } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { ScheduleComponent } from './schedule.component';

/**
 * SD-10605 / US-027 — modo edicao do cronograma. Sem TestBed: a logica e da classe e os servicos sao dubles.
 * Cenario da referencia: maio a setembro de 2026, 120 Un reprogramadas, 44 realizadas, linha de base com 104 Un.
 */
describe('ScheduleComponent - editar cronograma (SD #10605)', () => {

  const scheduleById = (consumes: any[][]) => ({
    success: true,
    data: {
      id: 31,
      idWorkpack: 10,
      start: '2026-05-01',
      end: '2026-09-30',
      planed: 120,
      actual: 44,
      planedCost: 0,
      actualCost: 0,
      distribution: 'LINEAR',
      groupStep: [{
        year: 2026,
        steps: consumes.map((c, i) => ({ plannedWork: 24, actualWork: i < 2 ? 22 : 0, consumes: c }))
      }]
    }
  });

  const consume = (id: number, plannedCost: number, actualCost: number, name = 'Conta ' + id) =>
    ({ id: 900 + id, plannedCost, actualCost, costAccount: { id, name } });

  let scheduleSrv: any;
  let router: any;
  let costAccounts: any[];

  const build = (queryParams: any) => {
    const component = new ScheduleComponent(
      { queryParams: of(queryParams) } as any,
      scheduleSrv,
      new FormBuilder(),
      { observable: of(false) } as any,
      { currentLang: 'pt-BR', getDefaultLang: () => 'pt-BR', onLangChange: new Subject(), instant: (k: string) => k } as any,
      { get: [{ key: 'workpack' }], setMenu: () => {} } as any,
      { GetAll: () => Promise.resolve({ success: true, data: costAccounts }) } as any,
      { add: jasmine.createSpy('add') } as any,
      router,
      { next: () => {} } as any
    );
    component.saveButton = { hideButton: () => {}, showButton: () => {} } as any;
    component.cancelButton = { hideButton: () => {}, showButton: () => {} } as any;
    return component;
  };

  beforeEach(() => {
    costAccounts = [];
    router = { navigate: jasmine.createSpy('navigate') };
    scheduleSrv = {
      GetScheduleById: jasmine.createSpy('GetScheduleById').and.returnValue(
        Promise.resolve(scheduleById([[consume(7, 200, 100)], [consume(7, 200, 200)], [consume(7, 200, 0)]]))),
      GetSchedule: jasmine.createSpy('GetSchedule').and.returnValue(Promise.resolve({
        success: true,
        data: [{ id: 31, baselineStart: '2026-05-01', baselinePlaned: 104, baselineCost: 500 }]
      })),
      putSchedule: jasmine.createSpy('putSchedule').and.returnValue(Promise.resolve({ success: true, data: { id: 31 } })),
      postSchedule: jasmine.createSpy('postSchedule')
    };
  });

  it('sem idSchedule continua sendo criacao', async () => {
    const component = build({ idWorkpack: 10, unitMeansureName: 'Un' });
    await component.ngOnInit();
    expect(component.isEditMode).toBeFalse();
    expect(scheduleSrv.GetScheduleById).not.toHaveBeenCalled();
    expect(component.formSchedule.controls.start.enabled).toBeTrue();
  });

  it('pre-preenche com os valores atuais e bloqueia o inicio', async () => {
    const component = build({ idWorkpack: 10, idSchedule: 31, unitMeansureName: 'Un' });
    await component.ngOnInit();

    expect(component.isEditMode).toBeTrue();
    expect(scheduleSrv.GetScheduleById).toHaveBeenCalledWith(31);
    const controls = component.formSchedule.controls;
    expect(controls.start.disabled).toBeTrue();
    expect(controls.start.value.getMonth()).toBe(4);
    expect(controls.end.value.getMonth()).toBe(8);
    expect(controls.plannedWork.value).toBe(120);
    expect(controls.actualWork.value).toBe(44);
    expect(controls.distribution.value).toBe('LINEAR');
    expect(controls.plannedCost.value).toBe(600);
    expect(controls.actualCost.value).toBe(300);
    expect(component.singleCostEdit).toBeTrue();
  });

  it('com linha de base mostra Estimado bloqueado e Reprogramado editavel', async () => {
    const component = build({ idWorkpack: 10, idSchedule: 31, unitMeansureName: 'Un' });
    await component.ngOnInit();

    const controls = component.formSchedule.controls;
    expect(component.hasBaseline).toBeTrue();
    expect(controls.baselinePlannedWork.value).toBe(104);
    expect(controls.baselinePlannedWork.disabled).toBeTrue();
    expect(controls.baselineCost.value).toBe(500);
    expect(controls.baselineCost.disabled).toBeTrue();
    expect(controls.plannedWork.enabled).toBeTrue();
    expect(controls.actualWork.enabled).toBeTrue();
    expect(controls.plannedCost.enabled).toBeTrue();
  });

  it('sem linha de base o Estimado e o planejado atual', async () => {
    scheduleSrv.GetSchedule.and.returnValue(Promise.resolve({ success: true, data: [{ id: 31 }] }));
    const component = build({ idWorkpack: 10, idSchedule: 31, unitMeansureName: 'Un' });
    await component.ngOnInit();

    expect(component.hasBaseline).toBeFalse();
    expect(component.formSchedule.controls.baselinePlannedWork.value).toBeNull();
    expect(component.formSchedule.controls.plannedWork.value).toBe(120);
  });

  it('salvar chama putSchedule com fim, totais, distribuicao e o $ na conta unica, e volta para a entrega', async () => {
    const component = build({ idWorkpack: 10, idSchedule: 31, unitMeansureName: 'Un' });
    await component.ngOnInit();
    component.formSchedule.controls.end.setValue(new Date(2026, 9, 31));
    component.formSchedule.controls.plannedWork.setValue(150);
    component.formSchedule.controls.plannedCost.setValue(800);
    component.formSchedule.controls.distribution.setValue('SIGMOIDAL');

    await component.saveSchedule();

    expect(scheduleSrv.postSchedule).not.toHaveBeenCalled();
    expect(scheduleSrv.putSchedule).toHaveBeenCalledWith(31, {
      end: '2026-10-31',
      plannedWork: 150,
      actualWork: 44,
      distribution: 'SIGMOIDAL',
      costs: [{ id: 7, plannedCost: 800, actualCost: 300 }]
    });
    expect(router.navigate).toHaveBeenCalledWith(['/workpack'], jasmine.objectContaining({
      queryParams: jasmine.objectContaining({ id: 10 })
    }));
  });

  it('com varias contas usa um card por conta e envia cada uma', async () => {
    scheduleSrv.GetScheduleById.and.returnValue(Promise.resolve(scheduleById([
      [consume(7, 100, 10), consume(8, 50, 0)],
      [consume(7, 100, 0), consume(8, 50, 5)]
    ])));
    const component = build({ idWorkpack: 10, idSchedule: 31, unitMeansureName: 'Un' });
    await component.ngOnInit();

    expect(component.singleCostEdit).toBeFalse();
    expect(component.costAssignmentsCardItems.map(c => [c.idCost, c.plannedWork, c.actualWork])).toEqual([[7, 200, 10], [8, 100, 5]]);
    expect(component.costAssignmentsTotals).toEqual({ actualTotal: 15, plannedTotal: 300 });

    component.costAssignmentsCardItems[1].plannedWork = 120;
    await component.saveSchedule();
    expect(scheduleSrv.putSchedule.calls.mostRecent().args[1].costs).toEqual([
      { id: 7, plannedCost: 200, actualCost: 10 },
      { id: 8, plannedCost: 120, actualCost: 5 }
    ]);
  });

  it('sem conta de custo o $ fica bloqueado e nada de custo e enviado', async () => {
    scheduleSrv.GetScheduleById.and.returnValue(Promise.resolve(scheduleById([[], []])));
    const component = build({ idWorkpack: 10, idSchedule: 31, unitMeansureName: 'Un' });
    await component.ngOnInit();

    expect(component.formSchedule.controls.plannedCost.disabled).toBeTrue();
    await component.saveSchedule();
    expect(scheduleSrv.putSchedule.calls.mostRecent().args[1].costs).toEqual([]);
  });

  it('cancelar volta para a entrega sem salvar', async () => {
    const component = build({ idWorkpack: 10, idSchedule: 31, unitMeansureName: 'Un' });
    await component.ngOnInit();
    component.formSchedule.controls.plannedWork.setValue(999);

    component.handleOnCancel();

    expect(scheduleSrv.putSchedule).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalled();
  });
});
