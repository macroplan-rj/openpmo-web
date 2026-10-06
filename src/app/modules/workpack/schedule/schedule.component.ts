import { ScheduleStartChangeService } from './../../../shared/services/schedule-start-change.service';
import { Component, OnDestroy, OnInit, ViewChild, ViewChildren } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Calendar } from 'primeng/calendar';
import { MenuItem, MessageService } from 'primeng/api';

import { ICard } from 'src/app/shared/interfaces/ICard';
import { ISchedule, ICost, IScheduleDetail, IScheduleUpdate } from 'src/app/shared/interfaces/ISchedule';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { ResponsiveService } from 'src/app/shared/services/responsive.service';
import { ScheduleService } from 'src/app/shared/services/schedule.service';
import { CostAccountService } from 'src/app/shared/services/cost-account.service';
import { enterLeave } from 'src/app/shared/animations/enterLeave.animation';
import { SaveButtonComponent } from 'src/app/shared/components/save-button/save-button.component';
import { IWorkpack } from 'src/app/shared/interfaces/IWorkpack';
import * as moment from 'moment';
import { ICartItemCostAssignment } from 'src/app/shared/interfaces/ICartItemCostAssignment';
import { ICostAccount } from 'src/app/shared/interfaces/ICostAccount';
import { CancelButtonComponent } from 'src/app/shared/components/cancel-button/cancel-button.component';

@Component({
  selector: 'app-schedule',
  templateUrl: './schedule.component.html',
  styleUrls: ['./schedule.component.scss'],
  animations: [
    enterLeave({ opacity: 0, pointerEvents: 'none' }, { opacity: 1, pointerEvents: 'all' }, 300)
  ]
})
export class ScheduleComponent implements OnInit, OnDestroy {

  @ViewChild(SaveButtonComponent) saveButton: SaveButtonComponent;
  @ViewChild(CancelButtonComponent) cancelButton: CancelButtonComponent;
  @ViewChildren(Calendar) calendarComponents: Calendar[];

  responsive: boolean;
  idWorkpack: number;
  idWorkpackModelLinked: number;
  idPlan: number;
  workpack: IWorkpack;
  unitMeasure: string;
  cardScheduleProperties: ICard;
  formSchedule: FormGroup;
  schedule: ISchedule;
  costs: ICost[];
  cardCostAssignmentsProperties: ICard;
  costAssignmentsCardItems: ICartItemCostAssignment[] = [];
  menuItemsCostAccounts: MenuItem[];
  costAssignmentsTotals = { plannedTotal: 0, actualTotal: 0 };
  $destroy = new Subject();
  calendarFormat: string;
  yearRange: string;
  actualValidationMessage: string;
  scheduleStartDate: Date;
  costAccounts: ICostAccount[];
  currentLang = '';
  isLoading = false;
  formIsSaving = false;
  // SD-10605: edicao de cronograma existente (?idSchedule=)
  idSchedule: number;
  isEditMode = false;
  hasBaseline = false;
  editCostAccounts: IEditCostAccount[] = [];

  constructor(
    private actRouter: ActivatedRoute,
    private scheduleSrv: ScheduleService,
    private formBuilder: FormBuilder,
    private responsiveSrv: ResponsiveService,
    private translateSrv: TranslateService,
    private breadcrumbSrv: BreadcrumbService,
    private costAccountSrv: CostAccountService,
    private messageSrv: MessageService,
    private router: Router,
    private scheduleStartChangeSrv: ScheduleStartChangeService
  ) {
    this.actRouter.queryParams.subscribe(async queryParams => {
      this.idWorkpack = queryParams.idWorkpack;
      this.idWorkpackModelLinked = queryParams.idWorkpackModelLinked;
      this.unitMeasure = queryParams.unitMeansureName;
      this.idSchedule = queryParams.idSchedule ? Number(queryParams.idSchedule) : undefined;
      this.isEditMode = !!this.idSchedule;
    });
    this.currentLang = this.translateSrv.currentLang;
    this.currentLang = this.translateSrv.getDefaultLang();
    this.responsiveSrv.observable.pipe(takeUntil(this.$destroy)).subscribe(value => this.responsive = value);
    this.translateSrv.onLangChange.pipe(takeUntil(this.$destroy)).subscribe(({lang}) => {
      this.currentLang = lang;
      setTimeout(() => this.calendarComponents?.map(calendar => {
        calendar.ngOnInit();
        calendar.dateFormat = this.translateSrv.instant('dateFormat');
        calendar.updateInputfield();
      }, 150));
    }
    );
    const newDate = moment();
    this.formSchedule = this.formBuilder.group({
      start: [newDate.toDate(), Validators.required],
      end: [newDate.add(1, 'days').toDate(), Validators.required],
      plannedWork: [null, Validators.required],
      actualWork: null,
      distribution: ['SIGMOIDAL', Validators.required],
      // usados so na edicao (SD-10605)
      baselinePlannedWork: [{ value: null, disabled: true }],
      plannedCost: null,
      actualCost: null,
      baselineCost: [{ value: null, disabled: true }]
    });
  }

  ngOnDestroy(): void {
    this.$destroy.next();
    this.$destroy.complete();
  }

  async ngOnInit() {
    this.calendarFormat = this.translateSrv.instant('dateFormat');
    const today = moment();
    const yearStart = today.year();
    this.yearRange = (yearStart - 10).toString() + ':' + (yearStart + 10).toString();
    this.isLoading = true;
    await this.loadPropertiesSchedule();
    if (this.isEditMode) {
      await this.loadScheduleForEdit();
    }
    this.isLoading = false;
  }

  /**
   * SD-10605: preenche o formulario com o cronograma atual. Valores atuais vem do GET /schedules/{id}
   * (BigDecimal exato); linha de base (Estimado) vem do GET /schedules?id-workpack.
   */
  async loadScheduleForEdit() {
    const [resultById, resultList] = await Promise.all([
      this.scheduleSrv.GetScheduleById(this.idSchedule),
      this.scheduleSrv.GetSchedule({ 'id-workpack': this.idWorkpack })
    ]);
    if (!resultById || !resultById.success || !resultById.data) {
      this.navigateBackToWorkpack();
      return;
    }
    const schedule = resultById.data;
    const baselineInfo: IScheduleDetail = resultList && resultList.success && resultList.data
      ? resultList.data.find(item => Number(item.id) === Number(this.idSchedule))
      : undefined;
    this.hasBaseline = !!(baselineInfo && baselineInfo.baselineStart);

    this.formSchedule.reset({
      start: moment(schedule.start).toDate(),
      end: moment(schedule.end).toDate(),
      plannedWork: roundValue(schedule.planed),
      actualWork: roundValue(schedule.actual),
      distribution: schedule.distribution || 'SIGMOIDAL',
      baselinePlannedWork: this.hasBaseline ? roundValue(baselineInfo.baselinePlaned) : null,
      plannedCost: null,
      actualCost: null,
      baselineCost: this.hasBaseline ? roundValue(baselineInfo.baselineCost) : null
    });
    this.formSchedule.controls.start.disable();
    this.scheduleStartDate = this.formSchedule.controls.start.value;

    this.editCostAccounts = this.sumCostsByCostAccount(schedule);
    if (this.editCostAccounts.length === 0 && this.costAccounts && this.costAccounts.length === 1) {
      const only = this.costAccounts[0];
      this.editCostAccounts = [{ id: only.id, name: this.getCostAccountName(only.id), plannedCost: 0, actualCost: 0 }];
    }

    if (this.editCostAccounts.length > 1) {
      this.cardCostAssignmentsProperties = {
        toggleable: false,
        initialStateToggle: false,
        cardTitle: 'costAssignment',
        collapseble: false,
        initialStateCollapse: false
      };
      this.costAssignmentsCardItems = this.editCostAccounts.map(cost => ({
        type: 'cost-card',
        unitMeasureName: '$',
        idCost: cost.id,
        costAccountName: cost.name,
        plannedWork: cost.plannedCost,
        actualWork: cost.actualCost
      }));
      this.formSchedule.controls.plannedCost.disable();
      this.formSchedule.controls.actualCost.disable();
    } else {
      this.cardCostAssignmentsProperties = undefined;
      this.costAssignmentsCardItems = [];
      if (this.editCostAccounts.length === 1) {
        this.formSchedule.controls.plannedCost.setValue(this.editCostAccounts[0].plannedCost);
        this.formSchedule.controls.actualCost.setValue(this.editCostAccounts[0].actualCost);
      } else {
        // sem conta de custo nao ha onde lancar $
        this.formSchedule.controls.plannedCost.setValue(0);
        this.formSchedule.controls.actualCost.setValue(0);
        this.formSchedule.controls.plannedCost.disable();
        this.formSchedule.controls.actualCost.disable();
      }
    }
    this.reloadCostAssignmentTotals();
  }

  get singleCostEdit(): boolean {
    return this.isEditMode && this.editCostAccounts.length <= 1;
  }

  sumCostsByCostAccount(schedule: IScheduleDetail): IEditCostAccount[] {
    const byId = new Map<number, IEditCostAccount>();
    (schedule.groupStep || []).forEach(group => (group.steps || []).forEach(step => (step.consumes || []).forEach(consume => {
      const id = consume.costAccount && consume.costAccount.id;
      if (!id) {
        return;
      }
      const current = byId.get(id) || {
        id,
        name: consume.costAccount.name || this.getCostAccountName(id),
        plannedCost: 0,
        actualCost: 0
      };
      current.plannedCost = roundValue(current.plannedCost + (Number(consume.plannedCost) || 0));
      current.actualCost = roundValue(current.actualCost + (Number(consume.actualCost) || 0));
      byId.set(id, current);
    })));
    return Array.from(byId.values());
  }

  getCostAccountName(idCostAccount: number): string {
    const costAccount = this.costAccounts && this.costAccounts.find(cost => cost.id === idCostAccount);
    if (!costAccount || !costAccount.models || !costAccount.properties) {
      return '';
    }
    const propertyModelName = costAccount.models.find(p => p.name === 'name');
    const propertyName = propertyModelName && costAccount.properties.find(p => p.idPropertyModel === propertyModelName.id);
    return propertyName ? propertyName.value as string : '';
  }

  navigateBackToWorkpack() {
    this.router.navigate(
      ['/workpack'],
      {
        queryParams: {
          id: this.idWorkpack,
          idPlan: this.idPlan,
          idWorkpackModelLinked: this.idWorkpackModelLinked
        }
      }
    );
  }

  async updateSchedule() {
    const costs: ICost[] = this.singleCostEdit
      ? this.editCostAccounts.map(cost => ({
        id: cost.id,
        plannedCost: this.formSchedule.controls.plannedCost.value || 0,
        actualCost: this.formSchedule.controls.actualCost.value || 0
      }))
      : this.costAssignmentsCardItems.filter(card => card.type === 'cost-card').map(cost => ({
        id: cost.idCost,
        plannedCost: cost.plannedWork || 0,
        actualCost: cost.actualWork || 0
      }));
    const schedule: IScheduleUpdate = {
      end: moment(this.formSchedule.controls.end.value).format('YYYY-MM-DD'),
      plannedWork: this.formSchedule.controls.plannedWork.value,
      actualWork: this.formSchedule.controls.actualWork.value || 0,
      distribution: this.formSchedule.controls.distribution.value,
      costs
    };
    this.formIsSaving = true;
    const result = await this.scheduleSrv.putSchedule(this.idSchedule, schedule);
    this.formIsSaving = false;
    if (result && result.success) {
      this.navigateBackToWorkpack();
    }
  }

  async setBreadcrumb() {
    let breadcrumbItems = this.breadcrumbSrv.get;
    if (!breadcrumbItems || breadcrumbItems.length === 0) {
      breadcrumbItems = await this.breadcrumbSrv.loadWorkpackBreadcrumbs(this.idWorkpack, this.idPlan)
    }
    this.breadcrumbSrv.setMenu([
      ... breadcrumbItems,
      {
        key: 'schedule',
        routerLink: ['/workpack/schedule'],
        queryParams: this.isEditMode ? { idWorkpack: this.idWorkpack, idSchedule: this.idSchedule } : { id: this.idWorkpack },
        info: ''
      }
    ]);
  }

  async loadPropertiesSchedule() {
    this.cardScheduleProperties = {
      toggleable: false,
      initialStateToggle: false,
      cardTitle: 'properties',
      collapseble: true,
      initialStateCollapse: false
    };
    this.idPlan = Number(localStorage.getItem('@currentPlan'));
    this.setBreadcrumb();
    await this.loadMenuItemsCostAccounts();
    this.loadCostAssignmentSession();
  }

  loadCostAssignmentSession() {
    if (!this.menuItemsCostAccounts || this.menuItemsCostAccounts.length === 0) {
      this.costAssignmentsCardItems = [];
      return;
    }
    this.cardCostAssignmentsProperties = {
      toggleable: false,
      initialStateToggle: false,
      cardTitle: 'costAssignment',
      collapseble: false,
      initialStateCollapse: false
    };
    this.costAssignmentsCardItems = [{
      type: 'new-cost-card',
      menuItemsNewCost: this.menuItemsCostAccounts
    }];
  }

  async loadMenuItemsCostAccounts() {
    const result = await this.costAccountSrv.GetAll({ 'id-workpack': this.idWorkpack });
    if (result.success) {
      this.costAccounts = result.data;
      this.setMenuItems();
    }
  }

  setMenuItems() {
    const workpacksIds = this.costAccounts.map(cost => cost.idWorkpack);
      const workpacksIdsNotRepeated = workpacksIds.filter((w, i) => workpacksIds.indexOf(w) === i);

      this.menuItemsCostAccounts = workpacksIdsNotRepeated.map( (idWorkpack) => {
        const workpackCostAccounts = this.costAccounts.filter(cost => cost.idWorkpack === idWorkpack);
        return {
          label: workpackCostAccounts[0].workpackModelName,
          items: workpackCostAccounts.map(workpackCost => {
            const propertyModelName = workpackCost.models.find(p => p.name === 'name');
            const propertyName = workpackCost.properties.find(p => p.idPropertyModel === propertyModelName.id);
            return {
              label: propertyName.value as string,
              id: workpackCost.id.toString(),
              command: () => this.createNewCardItemCost(workpackCost.id, propertyName.value as string)
            };
          })
        };
      });
  }

  createNewCardItemCost(idCost: number, costName: string) {
    const costAccountSelected = this.costAccounts.find( cost => cost.id === idCost);
    const costAssignmentsCardItemsList = this.costAssignmentsCardItems.filter(card => card.type === 'cost-card');
    const costAccountsIds = costAssignmentsCardItemsList.map(cardItem => (cardItem.idCost));
    this.menuItemsCostAccounts = Array.from(this.menuItemsCostAccounts.map(group => {
      const items = group.items.map(item => ({
        ...item,
        disabled: costAccountsIds.includes(Number(item.id)) || Number(item.id) === idCost
      }));
      return {
        ...group,
        items
      };
    }));
    if (costAssignmentsCardItemsList.length > 0) {
      this.costAssignmentsCardItems = costAssignmentsCardItemsList;
      this.costAssignmentsCardItems.push({
        type: 'cost-card',
        unitMeasureName: '$',
        idCost,
        costAccountName: costName,
        plannedWork: null,
        actualWork: null,
        menuItemsCost: [{
          label: this.translateSrv.instant('delete'),
          icon: 'fas fa-trash-alt',
          command: (event) => this.deleteCost(idCost)
        }],
        costAccountAllocation: costAccountSelected && costAccountSelected.costAccountAllocation
      });
      this.costAssignmentsCardItems.push({
        type: 'new-cost-card',
        menuItemsNewCost: this.menuItemsCostAccounts
      });
      return;
    }
    this.costAssignmentsCardItems = [
      {
        type: 'cost-card',
        unitMeasureName: '$',
        idCost,
        costAccountName: costName,
        plannedWork: null,
        actualWork: null,
        menuItemsCost: [{
          label: this.translateSrv.instant('delete'),
          icon: 'fas fa-trash-alt',
          command: (event) => this.deleteCost(idCost)
        }],
        costAccountAllocation: costAccountSelected && costAccountSelected.costAccountAllocation
      }
    ];
    this.costAssignmentsCardItems.push({
      type: 'new-cost-card',
      menuItemsNewCost: this.menuItemsCostAccounts
    });
  }

  deleteCost(idCost: number) {
    const menuItems = this.menuItemsCostAccounts.map(group => {
      const items = group.items.map(item => {
        if (Number(item.id) === idCost) {
          return {
            ...item,
            disabled: false
          };
        } else {
          return {
            ...item
          };
        }
      });
      return {
        ...group,
        items
      };
    });
    this.costAssignmentsCardItems[this.costAssignmentsCardItems.length - 1] = {
      type: 'new-cost-card',
      menuItemsNewCost: Array.from(menuItems)
    };
    this.menuItemsCostAccounts = Array.from(menuItems);
    this.costAssignmentsCardItems = Array.from(this.costAssignmentsCardItems.filter(cost => cost.idCost !== idCost));
    this.reloadCostAssignmentTotals();
  }

  handleChangeValuesCardItems() {
    this.reloadCostAssignmentTotals();
    // SD-10606: obrigatorio vazio nao esconde o Salvar (o clique avisa); so a regra do realizado esconde
    if (!this.actualValidationMessage) {
      if (this.costAssignmentsCardItems && this.costAssignmentsCardItems.length > 0
        && this.costAssignmentsCardItems.filter(item => item.type !== 'new-cost-card').length === this.costAssignmentsCardItems.length - 1) {
        const startDate = moment(this.formSchedule.controls.start.value);
        const today = moment();
        if (today.isBefore(startDate, 'months') && this.costAssignmentsCardItems.filter(item => item.actualWork && item.actualWork > 0).length > 0) {
          this.saveButton?.hideButton();
        } else {
          this.saveButton?.showButton();
        }
      } else {
      }
    } else {
      this.saveButton?.hideButton();
    }
  }

  handleChangeValues() {
    this.cancelButton.showButton();
    this.scheduleStartDate = this.formSchedule.controls.start.value;
    if (this.formSchedule.controls.actualWork.value > 0 && this.formSchedule.controls.start.value) {
      const startDate = moment(this.formSchedule.controls.start.value);
      const today = moment();
      if (today.isBefore(startDate, 'months')) {
        this.actualValidationMessage = this.translateSrv.instant('messages.scheduleActualValueValidation');
        this.saveButton?.hideButton();
      } else {
        this.actualValidationMessage = null;
      }
    } else {
      this.actualValidationMessage = null;
    }
    if (!this.actualValidationMessage) {
      if (this.costAssignmentsCardItems && this.costAssignmentsCardItems.length > 0
        && this.costAssignmentsCardItems.filter(item => item.plannedWork >= 0).length > 0) {
        const startDate = moment(this.formSchedule.controls.start.value);
        const today = moment();
        if (today.isBefore(startDate, 'months') && this.costAssignmentsCardItems.filter(item => item.actualWork && item.actualWork > 0).length > 0) {
          this.saveButton?.hideButton();
        } else {
          this.saveButton?.showButton();
        }
      } else {
        this.saveButton?.showButton();
      }
    } else {
      this.saveButton?.hideButton();
    }
  }

  handleChangeScheduleStartDate() {
    this.scheduleStartChangeSrv.next(true);
  }

  handleActualWorkChangeValues(event, eventType) {
    if (this.formSchedule.controls.start.value && ((event && event.value && event.value !== null && event.value !== 0)
      || (eventType === 'blur' && this.formSchedule.controls.actualWork.value > 0))) {
      const startDate = moment(this.formSchedule.controls.start.value);
      const today = moment();
      if (today.isBefore(startDate, 'months')) {
        this.actualValidationMessage = this.translateSrv.instant('messages.scheduleActualValueValidation');
        this.saveButton?.hideButton();
      } else {
        this.actualValidationMessage = null;
      }
    } else {
      this.actualValidationMessage = null;
    }

    if (!this.actualValidationMessage) {
      if (this.costAssignmentsCardItems && this.costAssignmentsCardItems.length > 0 &&
        this.costAssignmentsCardItems.filter(item => item.plannedWork >= 0).length > 0) {
        const startDate = moment(this.formSchedule.controls.start.value);
        const today = moment();
        if (today.isBefore(startDate, 'months') && this.costAssignmentsCardItems.filter(item => item.actualWork && item.actualWork > 0).length > 0) {
          this.saveButton?.hideButton();
        } else {
          this.saveButton?.showButton();
        }
      } else {
        this.saveButton?.showButton();
      }
    } else {
      this.saveButton?.hideButton();
    }
  }

  reloadCostAssignmentTotals() {
    const items = this.costAssignmentsCardItems.filter(card => card.type === 'cost-card');
    const plannedTotal = items.reduce((total, cost) => total + cost.plannedWork, 0);
    const actualTotal = items.reduce((total, cost) => total + cost.actualWork, 0);
    this.costAssignmentsTotals = { actualTotal, plannedTotal };
  }

  async saveSchedule() {
    this.cancelButton.hideButton();
    const startDate = moment(this.formSchedule.controls.start.value);
    const endDate = moment(this.formSchedule.controls.end.value);
    if (startDate.isSame(endDate, 'days')) {
      this.messageSrv.add({ severity: 'warn', summary: 'Erro', detail: this.translateSrv.instant('messages.startDateIsSameEndDate') });
      return;
    }
    if (startDate.isAfter(endDate, 'days')) {
      this.messageSrv.add({ severity: 'warn', summary: 'Erro', detail: this.translateSrv.instant('messages.startDateIsAfterEndDate') });
      return;
    }
    const hasNegativeValues = this.formSchedule.controls.plannedWork.value < 0 || this.formSchedule.controls.actualWork.value < 0 ||
      this.formSchedule.controls.plannedCost.value < 0 || this.formSchedule.controls.actualCost.value < 0 ||
      (this.costAssignmentsCardItems && this.costAssignmentsCardItems.filter( item => item.type === 'cost-card' &&
        (item.plannedWork < 0 || item.actualWork < 0)).length > 0 );
    if (hasNegativeValues) {
      this.messageSrv.add({
        detail: this.translateSrv.instant('messages.scheduleCantHasNegativeValues'),
        severity: 'warn',
        summary: this.translateSrv.instant('atention')
      });
      this.saveButton.hideButton();
      return;
    }
    if (this.isEditMode) {
      await this.updateSchedule();
      return;
    }
    this.schedule = {
      idWorkpack: this.idWorkpack,
      start: this.formSchedule.controls.start.value,
      end: this.formSchedule.controls.end.value,
      plannedWork: this.formSchedule.controls.plannedWork.value,
      actualWork: this.formSchedule.controls.actualWork.value,
      distribution: this.formSchedule.controls.distribution.value,
      costs: this.costAssignmentsCardItems.filter(card => card.type === 'cost-card').map(cost => ({
        id: cost.idCost,
        plannedCost: cost.plannedWork,
        actualCost: cost.actualWork
      }))
    };
    this.formIsSaving = true;
    const result = await this.scheduleSrv.postSchedule(this.schedule);
    this.formIsSaving = false;
    if (result.success) {
      this.router.navigate(
        ['/workpack'],
        {
          queryParams: {
            id: this.idWorkpack,
            idPlan: this.idPlan,
            idWorkpackModelLinked: this.idWorkpackModelLinked
          }
        }
      );
    }
  }

  handleOnCancel() {
    this.saveButton.hideButton();
    if (this.isEditMode) {
      this.navigateBackToWorkpack();
      return;
    }
    const newDate = moment();
    this.formSchedule.reset({
      start: newDate.toDate(),
      end: newDate.add(1, 'days').toDate(),
      plannedWork: null,
      actualWork: null,
      distribution: 'SIGMOIDAL'
    });
    this.setMenuItems();
    this.costAssignmentsCardItems = [{
      type: 'new-cost-card',
      menuItemsNewCost: this.menuItemsCostAccounts
    }];
    
    this.reloadCostAssignmentTotals();
  }

}

export interface IEditCostAccount {
  id: number;
  name: string;
  plannedCost: number;
  actualCost: number;
}

/** Soma de decimais vindos da API sem o ruido de ponto flutuante do JS. */
function roundValue(value: number): number {
  return Math.round((Number(value) || 0) * 1e6) / 1e6;
}
