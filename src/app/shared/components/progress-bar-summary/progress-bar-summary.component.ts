import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { formatNumber, registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
registerLocaleData(localePt);

/** Uma barra da entrega na EAP, como montada em BreakdownStructureService.buildSchedules. */
export interface IDeliverableProgressBar {
  type: 'cost' | 'scope' | 'schedule' | string;
  valueUnit: string;
  /** Linha de base aprovada (Planejado). */
  baselinePlanned?: number;
  /** Previsto atual (Reprogramado). */
  total?: number;
  /** Realizado. */
  progress?: number;
}

const TITLE_BY_TYPE: { [type: string]: string } = {
  cost: 'financialExecution',
  scope: 'physicalExecution',
  schedule: 'executionDeadline',
};

/**
 * Conteudo do painel de hover das barras da entrega na EAP (SD-10604): titulo por tipo e as
 * linhas Planejado / Reprogramado / Realizado. Planejado so aparece quando ha linha de base.
 */
@Component({
  selector: 'app-progress-bar-summary',
  templateUrl: './progress-bar-summary.component.html',
  styleUrls: ['./progress-bar-summary.component.scss'],
})
export class ProgressBarSummaryComponent implements OnInit, OnDestroy {
  @Input() progressBar: IDeliverableProgressBar;

  language: 'pt' | 'en' = 'pt';

  private $destroy = new Subject<void>();

  constructor(private translateSrv: TranslateService) {}

  ngOnInit(): void {
    this.setLanguage();
    this.translateSrv.onLangChange
      .pipe(takeUntil(this.$destroy))
      .subscribe(() => this.setLanguage());
  }

  ngOnDestroy(): void {
    this.$destroy.next();
    this.$destroy.complete();
  }

  get titleKey(): string {
    return TITLE_BY_TYPE[this.progressBar?.type] || '';
  }

  get hasBaseline(): boolean {
    return this.isNumber(this.progressBar?.baselinePlanned);
  }

  format(value: number): string {
    if (!this.isNumber(value)) {
      return '-';
    }
    const unit = this.progressBar?.valueUnit;
    if (unit === 'currency') {
      return `R$ ${formatNumber(value, this.language, '1.2-2')}`;
    }
    if (unit === 'time') {
      return `${formatNumber(value, this.language, '1.0-0')}d`;
    }
    const formatted = formatNumber(value, this.language, '1.0-2');
    if (!unit) {
      return formatted;
    }
    return unit === '%' ? `${formatted}%` : `${formatted} ${unit}`;
  }

  private isNumber(value: number): boolean {
    return value !== null && value !== undefined && Number.isFinite(Number(value));
  }

  private setLanguage() {
    this.language = this.translateSrv.currentLang === 'en-US' ? 'en' : 'pt';
  }
}
