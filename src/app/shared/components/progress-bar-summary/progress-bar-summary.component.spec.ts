import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';

import { ProgressBarSummaryComponent } from './progress-bar-summary.component';

@Pipe({ name: 'translate' })
class TranslateStubPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

/** SD-10604 — paineis das barras da entrega: Planejado / Reprogramado / Realizado. */
describe('ProgressBarSummaryComponent', () => {
  let component: ProgressBarSummaryComponent;
  let fixture: ComponentFixture<ProgressBarSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProgressBarSummaryComponent, TranslateStubPipe],
      providers: [
        { provide: TranslateService, useValue: { currentLang: 'pt-BR', onLangChange: new Subject() } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ProgressBarSummaryComponent);
    component = fixture.componentInstance;
  });

  const lines = (): string[] =>
    Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.progress-bar-summary-line'))
      .map(l => l.textContent.replace(/\s+/g, ' ').trim());
  const title = (): string =>
    fixture.nativeElement.querySelector('.progress-bar-summary-title').textContent.trim();

  it('custo: Execucao financeira em R$', () => {
    component.progressBar = { type: 'cost', valueUnit: 'currency', baselinePlanned: 3000000, total: 3000000, progress: 1260000 };
    fixture.detectChanges();

    expect(title()).toBe('financialExecution');
    expect(lines()).toEqual([
      'plannedBaseline: R$ 3.000.000,00',
      'reprogrammed: R$ 3.000.000,00',
      'actual: R$ 1.260.000,00',
    ]);
  });

  it('escopo: Execucao fisica na unidade da entrega', () => {
    component.progressBar = { type: 'scope', valueUnit: '%', baselinePlanned: 50, total: 55, progress: 65 };
    fixture.detectChanges();

    expect(title()).toBe('physicalExecution');
    expect(lines()).toEqual(['plannedBaseline: 50%', 'reprogrammed: 55%', 'actual: 65%']);
  });

  it('prazo: Prazo de execucao em dias e sem Planejado quando nao ha linha de base', () => {
    component.progressBar = { type: 'schedule', valueUnit: 'time', baselinePlanned: NaN, total: 200, progress: 150 };
    fixture.detectChanges();

    expect(title()).toBe('executionDeadline');
    expect(lines()).toEqual(['reprogrammed: 200d', 'actual: 150d']);
  });

  it('valor ausente vira traco', () => {
    component.progressBar = { type: 'cost', valueUnit: 'currency', total: undefined, progress: null };
    fixture.detectChanges();

    expect(lines()).toEqual(['reprogrammed: -', 'actual: -']);
  });
});
