import { MilestoneStatusEnum } from './../../enums/MilestoneStatusEnum';
import { takeUntil } from 'rxjs/operators';
import { IGaugeChartData } from './../../interfaces/IGaugeChartData';
import { TranslateService } from '@ngx-translate/core';
import { ResponsiveService } from './../../services/responsive.service';
import { Router } from '@angular/router';
import { IWorkpackCardItem } from './../../interfaces/IWorkpackCardItem';
import { Component, OnInit, Input, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ChartData } from 'chart.js';
import { Subject } from 'rxjs';
import * as moment from 'moment';
import { WorkpackService } from '../../services/workpack.service';
import { MessageService } from 'primeng/api';
import { JournalService } from '../../services/journal.service';

@Component({
  selector: 'app-workpack-card-item',
  templateUrl: './workpack-card-item.component.html',
  styleUrls: ['./workpack-card-item.component.scss']
})
export class WorkpackCardItemComponent implements OnInit, OnDestroy {
  @Input() properties: IWorkpackCardItem;

  @Input() displayModeCard: string;

  @ViewChild('newItemIcon') newItemIcon: ElementRef;

  cardIdItem: string;

  language: string;

  iconImg;

  responsive: boolean;

  cardType = 'standard';

  riskImportance = 'high';

  dashboardMilestonesData: ChartData = {
    labels: [],
    datasets: []
  };

  iconCostColor = '#888E96';

  iconScheduleColor = '#888E96';

  iconScopeColor = '#888E96';

  cpiColor: string;

  spiColor: string;

  gaugeChartDataCPI: IGaugeChartData;

  gaugeChartDataSPI: IGaugeChartData;

  $destroy = new Subject();

  attentionMilestone = false;

  milestoneStatusEnum = MilestoneStatusEnum;

  milestoneDate: Date = null;

  showReasonModal: boolean;

  reasonValue: string = '';

  showReasonButtons = false;

  /**
   * Modal de edicao do marco critico (US-004). Estado proprio, separado do fluxo inline
   * de `showReasonModal`/`showReasonButtons`: o inline sai em MT-US004-02, e ate la os dois
   * convivem sem se pisar.
   */
  showMilestoneEditModal = false;

  /** Data em edicao no modal. So e aplicada a `milestoneDate` ao salvar. */
  milestoneEditDate: Date = null;

  /** Justificativa em edicao no modal. */
  milestoneEditReason = '';

  /** Estado do checkbox "Concluido" no modal. */
  milestoneEditCompleted = false;

  milestoneMidleTextBottom: string;

  enable = true;

  constructor(
    private router: Router,
    private responsiveSrv: ResponsiveService,
    private translateSrv: TranslateService,
    private workpackSrv: WorkpackService,
    private messageSrv: MessageService,
    private journalSrv: JournalService
  ) {
    this.responsiveSrv.observable.pipe(takeUntil(this.$destroy)).subscribe(value => this.responsive = value);
    this.translateSrv.onLangChange.pipe(takeUntil(this.$destroy)).subscribe(() => {
      setTimeout(() => this.setLanguage(), 200);
    });
  }

  ngOnInit(): void {
    this.cardIdItem = this.properties.itemId || this.properties.itemId === 0 ?
      `${this.properties.itemId < 10 && this.properties.itemId !== 0 ? '0' + this.properties.itemId : this.properties.itemId}` : '';
    if (this.properties.subtitleCardItem) {
      this.setMilestoneDateProperty();
    }
    switch (this.properties.typeCardItem) {
      case 'newCardItem':
        this.cardType = 'newCardItem';
        break;
      case 'Milestone':
        this.cardType = 'milestone';
        if (this.properties.subtitleCardItem) {
          const expirationDate = moment(this.properties.subtitleCardItem, 'yyyy-MM-DD');
          const date = moment();
          if (this.properties.statusItem === 'ontime' && (expirationDate.diff(date, 'days') <= 7)) {
            this.attentionMilestone = true;
          }
        }
        break;
      default:
        this.cardType = 'standard';
        break;
    }
    if (this.properties.dashboardData !== null) {
      if (this.properties?.dashboardData?.risk && this.properties?.dashboardData?.risk?.total > 0) {
        this.riskImportance = this.properties.dashboardData?.risk?.high > 0 ?
          'high' :
          (this.properties.dashboardData?.risk?.medium > 0 ? 'medium' : 'low');
      }
      if (this.properties.dashboardData?.milestone && this.properties.dashboardData?.milestone?.quantity > 0) {
        this.setDashboardMilestonesData();
      }
      if (this.properties.dashboardData?.tripleConstraint) {
        this.loadTripleConstraintSettings();
      }
      this.loadPerformanceIndexes();
    }
    this.setLanguage();
  }

  ngOnDestroy() {
    this.$destroy.next();
    this.$destroy.complete();
  }

  changeMilestoneDate(event: any) {
    this.workpackSrv.nextPendingChanges(true);
    const momentEvent = moment(event).format('yyyy-MM-DD');
    const momentProp = moment(this.properties.subtitleCardItem, 'yyyy-MM-DD');
    const diffEventProp = moment(momentEvent).diff(momentProp, 'days');
    if (!isNaN(diffEventProp) && diffEventProp !== 0) {
      if (!!this.properties.hasBaseline) {
        this.showReasonModal = true;
        this.showReasonButtons = false;
        this.reasonValue = '';
      } else {
        this.showReasonButtons = true;
        this.showReasonModal = false;
      }
      this.milestoneDate = event;
    }
  }

  async saveReason() {
    this.showReasonModal = false;
    this.workpackSrv.nextPendingChanges(false);
    const dateReason = {
      date: moment(this.milestoneDate).format('yyyy-MM-DD'),
      reason: this.reasonValue
    };
    const { success } = await this.workpackSrv.patchMilestoneReason(this.properties.itemId, dateReason);
    if (success) {
      this.properties.subtitleCardItem = moment(this.milestoneDate).format('yyyy-MM-DD');
    } else {
      this.setMilestoneDateProperty();
    }
    this.messageSrv.add({
      severity: 'success',
      summary: this.translateSrv.instant('success'),
      detail: this.translateSrv.instant('messages.savedSuccessfully')
    });
  }

  async saveDate() {
    this.showReasonButtons = false;
    this.workpackSrv.nextPendingChanges(false);
    const dateReason = {
      date: moment(this.milestoneDate).format('yyyy-MM-DD'),
    };
    const { success } = await this.workpackSrv.patchMilestoneReason(this.properties.itemId, dateReason);
    if (success) {
      this.properties.subtitleCardItem = moment(this.milestoneDate).format('yyyy-MM-DD');
    } else {
      this.setMilestoneDateProperty();
    }
    this.messageSrv.add({
      severity: 'success',
      summary: this.translateSrv.instant('success'),
      detail: this.translateSrv.instant('messages.savedSuccessfully')
    });
  }

  cancelReason() {
    this.workpackSrv.nextPendingChanges(false);
    this.showReasonModal = false;
    this.setMilestoneDateProperty();
    this.reasonValue = '';
  }

  cancelDateChange() {
    this.workpackSrv.nextPendingChanges(false);
    this.showReasonButtons = false;
    this.setMilestoneDateProperty();
  }

  setMilestoneDateProperty() {
    const date = this.properties.subtitleCardItem.split('-');
    this.milestoneDate = new Date(date[0], date[1] - 1, date[2]);
  }

  /**
   * Abre o modal de edicao do marco (US-004), partindo sempre do estado atual do card.
   * Reabrir depois de um cancelamento nao pode herdar o que foi digitado antes.
   */
  openMilestoneEditModal() {
    if (!this.properties?.editPermission || this.properties?.canceled) {
      return;
    }
    this.milestoneEditDate = this.milestoneDate;
    this.milestoneEditReason = '';
    this.milestoneEditCompleted = !!this.properties?.completed;
    this.showMilestoneEditModal = true;
  }

  /**
   * Data futura é previsão, não realização — então não pode ser concluída (US-004).
   *
   * A comparação é feita só por ano/mês/dia. Comparar os Date inteiros classificaria
   * "hoje às 00:00" como passado ou futuro conforme a hora da máquina, e o critério de
   * aceite diz que HOJE habilita.
   *
   * Esta é a regra de UX. A proteção real está no servidor, em
   * CompleteWorkpackService.assertDateIsValid, que recusa com DATE_IS_IN_FUTURE.
   */
  get isMilestoneEditDateInFuture(): boolean {
    if (!this.milestoneEditDate) {
      return false;
    }
    const escolhida = new Date(this.milestoneEditDate);
    const hoje = new Date();
    escolhida.setHours(0, 0, 0, 0);
    hoje.setHours(0, 0, 0, 0);
    return escolhida.getTime() > hoje.getTime();
  }

  /**
   * Reage à troca de data no modal: data futura desmarca o Concluído na hora, para o
   * usuário não confirmar algo que o servidor recusaria depois.
   */
  onMilestoneEditDateChange() {
    if (this.isMilestoneEditDateInFuture) {
      this.milestoneEditCompleted = false;
    }
  }

  /** A justificativa é obrigatória quando o marco tem baseline ativa e a data mudou. */
  get milestoneEditReasonRequired(): boolean {
    return !!this.properties?.hasBaseline && this.milestoneEditDateChanged;
  }

  /** Data no modal difere da que está no card, comparando só o dia. */
  get milestoneEditDateChanged(): boolean {
    if (!this.milestoneEditDate) {
      return false;
    }
    return moment(this.milestoneEditDate).format('yyyy-MM-DD') !==
      moment(this.milestoneDate).format('yyyy-MM-DD');
  }

  get milestoneEditCompletedChanged(): boolean {
    return this.milestoneEditCompleted !== !!this.properties?.completed;
  }

  /**
   * Salva data, justificativa e conclusão pelo modal (US-004).
   *
   * São DOIS endpoints, porque não existe um que faça as duas coisas:
   *   - data/justificativa -> PATCH /milestones/{id}
   *   - conclusão          -> PATCH /workpacks/complete-deliverable/{id}, que apesar do
   *     nome trata Milestone (CompleteWorkpackService verifica `instanceof Milestone`).
   *
   * Não são atômicos: se o segundo falhar, o primeiro já foi aplicado. Atomicidade exigiria
   * endpoint novo — registrado na story como ponto para o PO, não resolvido aqui.
   */
  async saveMilestoneEdit() {
    if (this.milestoneEditReasonRequired && !this.milestoneEditReason?.trim()) {
      this.messageSrv.add({
        severity: 'warn',
        summary: this.translateSrv.instant('attention'),
        detail: this.translateSrv.instant('milestoneReasonHint')
      });
      return;
    }

    const dataMudou = this.milestoneEditDateChanged;
    const conclusaoMudou = this.milestoneEditCompletedChanged;
    if (!dataMudou && !conclusaoMudou) {
      this.closeMilestoneEditModal();
      return;
    }

    const data = moment(this.milestoneEditDate).format('yyyy-MM-DD');
    this.workpackSrv.nextPendingChanges(false);

    if (dataMudou) {
      const { success } = await this.workpackSrv.patchMilestoneReason(this.properties.itemId, {
        date: data,
        reason: this.milestoneEditReason
      });
      if (!success) {
        this.notifyMilestoneSaveFailed();
        return;
      }
      this.properties.subtitleCardItem = data;
      this.setMilestoneDateProperty();
    }

    if (conclusaoMudou) {
      try {
        const { success } = await this.workpackSrv.completeDeliverable(
          this.properties.itemId,
          this.milestoneEditCompleted,
          data
        );
        if (!success) {
          this.notifyMilestoneSaveFailed();
          return;
        }
      } catch (e) {
        // O servidor recusa concluir marco com data futura (DATE_IS_IN_FUTURE). O modal já
        // bloqueia antes, mas se o front for burlado a negativa precisa ficar visível.
        this.notifyMilestoneSaveFailed(
          this.isMilestoneEditDateInFuture ? 'messages.error.date.is.in.future' : undefined
        );
        return;
      }
      this.properties.completed = this.milestoneEditCompleted;
      this.applyMilestoneStatusAfterSave();
    }

    this.showMilestoneEditModal = false;
    this.milestoneEditReason = '';
    this.messageSrv.add({
      severity: 'success',
      summary: this.translateSrv.instant('success'),
      detail: this.translateSrv.instant('messages.savedSuccessfully')
    });
  }

  private notifyMilestoneSaveFailed(chaveDetalhe = 'messages.error.generic') {
    this.messageSrv.add({
      severity: 'error',
      summary: this.translateSrv.instant('error'),
      detail: this.translateSrv.instant(chaveDetalhe)
    });
  }

  /**
   * Reflete o status no card logo após salvar, sem recarregar a EAP.
   *
   * Limitação consciente: distinguir "concluído" de "concluído com atraso" depende da
   * baseline, que o card não tem — só o servidor sabe. Mostramos o status simples aqui; o
   * refinamento aparece no próximo carregamento da EAP.
   */
  private applyMilestoneStatusAfterSave() {
    if (this.milestoneEditCompleted) {
      this.properties.statusItem = MilestoneStatusEnum.CONCLUDED;
      return;
    }
    const hoje = moment().startOf('day');
    const doMarco = moment(this.milestoneEditDate).startOf('day');
    this.properties.statusItem = doMarco.isBefore(hoje)
      ? MilestoneStatusEnum.LATE
      : MilestoneStatusEnum.ON_TIME;
  }

  /** Fecha o modal descartando o que foi editado — usado pelo X e pelo Desfazer. */
  closeMilestoneEditModal() {
    this.showMilestoneEditModal = false;
    this.milestoneEditDate = this.milestoneDate;
    this.milestoneEditReason = '';
    this.milestoneEditCompleted = !!this.properties?.completed;
  }

  setLanguage() {
    this.language = this.translateSrv.currentLang;
  }

  setGaugeChartData() {
    this.gaugeChartDataCPI = (this.properties.dashboardData && this.properties.dashboardData.costPerformanceIndex) && {
      value: this.properties.dashboardData?.costPerformanceIndex !== null ?
        (this.properties.dashboardData?.costPerformanceIndex?.indexValue !== null ?
          this.properties.dashboardData?.costPerformanceIndex?.indexValue : 0) :
        null,
      labelBottom: 'CPI',
      classIconLabelBottom: 'fas fa-dollar-sign',
      valueProgressBar: this.properties.dashboardData?.costPerformanceIndex !== null ?
        this.properties.dashboardData?.costPerformanceIndex?.costVariation :
        null,
      maxProgressBar: this.properties.dashboardData?.earnedValue,
      labelBottomProgressBar: 'CV',
    };

    this.gaugeChartDataSPI = (this.properties.dashboardData && this.properties.dashboardData.schedulePerformanceIndex) && {
      value: this.properties.dashboardData?.schedulePerformanceIndex !== null ?
        (this.properties.dashboardData?.schedulePerformanceIndex?.indexValue !== null ?
          this.properties.dashboardData?.schedulePerformanceIndex?.indexValue : 0) :
        null,
      labelBottom: 'SPI',
      classIconLabelBottom: 'fas fa-clock',
      valueProgressBar: this.properties.dashboardData?.schedulePerformanceIndex !== null ?
        this.properties.dashboardData?.schedulePerformanceIndex?.scheduleVariation :
        null,
      maxProgressBar: this.properties.dashboardData?.earnedValue,
      labelBottomProgressBar: 'SV',
    };

  }

  loadPerformanceIndexes() {
    if (this.properties?.dashboardData?.costPerformanceIndex) {
      if (this.properties?.dashboardData?.costPerformanceIndex?.indexValue < 1) {
        this.cpiColor = '#EA5C5C';
      } else {
        this.cpiColor = '#0081c1';
      }
    } else {
      this.cpiColor = '#646464';
    }
    if (this.properties?.dashboardData?.schedulePerformanceIndex) {
      if (this.properties?.dashboardData?.schedulePerformanceIndex?.indexValue < 1) {
        this.spiColor = '#EA5C5C';
      } else {
        this.spiColor = '#0081c1';
      }
    } else {
      this.spiColor = '#646464';
    }
    this.setGaugeChartData();
  }

  loadTripleConstraintSettings() {
    if (this.properties.dashboardData &&
      (!this.properties.dashboardData?.tripleConstraint?.cost || this.properties.dashboardData?.tripleConstraint?.cost?.foreseenValue === 0
        || this.properties.dashboardData?.tripleConstraint?.cost?.foreseenValue === null)) {
      this.iconCostColor = '#f5f5f5';
    } else {
      if (this.properties.dashboardData && this.properties.dashboardData?.tripleConstraint?.cost?.plannedValue > 0) {
        if (!!this.properties.dashboardData.tripleConstraint?.cost?.variation &&
          this.properties.dashboardData?.tripleConstraint?.cost?.variation !== 0) {
          if (this.properties.dashboardData.tripleConstraint?.cost?.variation > 0) {
            this.iconCostColor = '#44B39B';
          } else {
            this.iconCostColor = '#EA5C5C';
          }
        } else {
          this.iconCostColor = '#44B39B';
        }
      } else {
        if (this.properties.dashboardData.tripleConstraint?.cost?.foreseenValue >=
          this.properties.dashboardData?.tripleConstraint?.cost?.actualValue) {
          this.iconCostColor = '#888E96';
        } else {
          this.iconCostColor = '#EA5C5C';
        }
      }
    }

    if (this.properties.dashboardData && (!this.properties.dashboardData?.tripleConstraint?.schedule ||
      this.properties?.dashboardData?.tripleConstraint?.schedule?.foreseenStartDate === null)) {
      this.iconScheduleColor = '#f5f5f5';
    } else {
      if (this.properties.dashboardData && this.properties.dashboardData.tripleConstraint?.schedule?.plannedValue > 0) {
        if (!!this.properties.dashboardData.tripleConstraint?.schedule?.variation &&
          this.properties?.dashboardData?.tripleConstraint?.schedule?.variation !== 0) {
          if (this.properties.dashboardData.tripleConstraint?.schedule?.variation > 0) {
            this.iconScheduleColor = '#44B39B';
          } else {
            this.iconScheduleColor = '#EA5C5C';
          }
        } else {
          this.iconScheduleColor = '#44B39B';
        }
      } else {
        if (this.properties.dashboardData?.tripleConstraint?.schedule?.foreseenValue >=
          this.properties.dashboardData?.tripleConstraint?.schedule?.actualValue) {
          this.iconScheduleColor = '#888E96';
        } else {
          this.iconScheduleColor = '#EA5C5C';
        }
      }
    }

    if (this.properties.dashboardData && (!this.properties.dashboardData?.tripleConstraint?.cost ||
      this.properties?.dashboardData?.tripleConstraint?.scope?.foreseenValue === 0 ||
      this.properties?.dashboardData?.tripleConstraint?.scope?.foreseenValue === null)) {
      this.iconScopeColor = '#f5f5f5';
    } else {
      if (this.properties.dashboardData && this.properties.dashboardData?.tripleConstraint?.scope?.plannedVariationPercent > 0) {
        if (!!this.properties.dashboardData?.tripleConstraint?.scope?.variation &&
          this.properties.dashboardData?.tripleConstraint?.scope?.variation !== 0) {
          if (this.properties.dashboardData?.tripleConstraint?.scope?.variation < 0) {
            this.iconScopeColor = '#44B39B';
          } else {
            this.iconScopeColor = '#EA5C5C';
          }
        } else {
          this.iconScopeColor = '#44B39B';
        }
      } else {
        if (this.properties.dashboardData?.tripleConstraint?.scope?.foreseenWorkRefMonth !== null &&
          this.properties.dashboardData?.tripleConstraint?.scope?.foreseenWorkRefMonth >=
          this.properties.dashboardData?.tripleConstraint?.scope?.actualValue) {
          this.iconScopeColor = '#EA5C5C';
        } else {
          this.iconScopeColor = '#44B39B';
        }
      }
    }

  }

  setDashboardMilestonesData() {
    const milestone = this.properties.dashboardData?.milestone;
    const data = milestone && [milestone.onTime, milestone.late, milestone.concluded, milestone.lateConcluded];
    this.milestoneMidleTextBottom = this.translateSrv.instant('milestonesLabelChart');
    if (data.filter(item => item > 0).length > 0) {
      this.dashboardMilestonesData = {
        labels: [
          this.translateSrv.instant('ontime'),
          this.translateSrv.instant('late'),
          this.translateSrv.instant('concluded'),
          this.translateSrv.instant('lateConcluded'),
        ],
        datasets: [
          {
            data: [milestone.onTime ? milestone.onTime : 0,
            milestone.late ? milestone.late : 0,
            milestone.concluded ? milestone.concluded : 0,
            milestone.lateConcluded ? milestone.lateConcluded : 0],
            backgroundColor: [
              '#00b89c',
              '#fa4c4f',
              '#0081c1',
              '#7C75B9',
            ],
          }]
      };
    }
  }

  navigateToPage(url: string, params?: { name: string; value: string | number }[]) {
    const queryParams = params && params.reduce((obj, item) => ((obj[item.name] = item.value), obj), {});
    this.router.navigate(
      [url],
      {
        queryParams
      }
    );
  }

  getQueryParams() {
    let params = this.properties?.itemId ? { id: this.properties.itemId } : {};
    if (this.properties.paramsUrlCard) {
      params = {
        ...params,
        ... this.properties.paramsUrlCard.reduce((obj, item) => ((obj[item.name] = item.value), obj), {}),
      };
    }
    return params;
  }

  validateShowTripleConstraintCost() {
    if (
      this.properties?.dashboardData?.tripleConstraint?.cost &&
      this.properties?.dashboardData?.tripleConstraint?.cost?.foreseenValue > 0
    ) {
      return true;
    }
    return false;
  }

  validateShowTripleConstraintSchedule() {
    if (this.properties?.dashboardData?.tripleConstraint?.schedule &&
      this.properties?.dashboardData?.tripleConstraint?.schedule?.foreseenStartDate !== null) {
      return true;
    }
    return false;
  }

  validateShowTripleConstraintScope() {
    if (
      this.properties?.dashboardData?.tripleConstraint?.scope &&
      this.properties?.dashboardData?.tripleConstraint?.scope?.foreseenValue > 0
    ) {
      return true;
    }
    return false;
  }

  get label(): string {
    return this.properties.typeCardItem === 'Milestone' ? 'completed' : 'scopeCompleted';
  }

  showRiskIndex() {
    return (!this.properties.endManagementDate ||
      this.properties.endManagementDate === null) && !this.properties.completed && this.properties?.dashboardData?.risk?.total > 0;
  }

  showEndManagementIndex() {
    return (!!this.properties.endManagementDate && this.properties.endManagementDate !== null) || !!this.properties.completed;
  }

  async handleShowJournalInformation(journalInformation) {
    journalInformation.loading = true;
    const result = await this.journalSrv.GetById(journalInformation.id);
    if (result.success) {
      journalInformation.information = result.data.information;
      journalInformation.author = result.data.author;
      journalInformation.dateInformation = result.data.date;
      journalInformation.workpack = result.data.workpack;
      journalInformation.evidences = result.data.evidences && result.data.evidences.map( evidence => {
        const isImg = evidence.mimeType.includes('image');
        let icon: string;
        switch (evidence.mimeType) {
          case 'application/pdf':
            icon = 'far fa-file-pdf';
            break;
          case 'text/csv':
            icon = 'fas fa-file-csv';
            break;
          case 'application/msword':
            icon = 'far fa-file-word';
            break;
          case 'application/vnd.ms-excel':
          case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            icon = 'far fa-file-excel';
            break;
          case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
          case 'application/vnd.ms-powerpoint':
            icon = 'far fa-file-powerpoint';
            break;
          default:
            icon = 'far fa-file';
            break;
        }
        return {
          ...evidence,
          isImg,
          icon
        };
      });
      journalInformation.loading = false;
    }
  }

  async handleLoadMenu() {
    this.enable = false;
    await this.properties.onNewItem();
    this.enable = true;
    this.newItemIcon.nativeElement.click();
  }
}

