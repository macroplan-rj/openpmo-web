import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';

import { StatusTypesTooltipComponent } from './status-types-tooltip.component';

/** Stub do pipe do ngx-translate: NO_ERRORS_SCHEMA cobre elementos, nao pipes. */
@Pipe({ name: 'translate' })
class TranslateStubPipe implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

/** SD-10604 — "Tipos de situacao" na EAP e no card. */
describe('StatusTypesTooltipComponent', () => {
  let component: StatusTypesTooltipComponent;
  let fixture: ComponentFixture<StatusTypesTooltipComponent>;
  const options = ['Cancelada', 'Concluída', 'Em execução', 'Paralisada', 'Em planejamento'];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StatusTypesTooltipComponent, TranslateStubPipe],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();
    fixture = TestBed.createComponent(StatusTypesTooltipComponent);
    component = fixture.componentInstance;
  });

  const el = (): HTMLElement => fixture.nativeElement;

  it('lista as opcoes na ordem do modelo e destaca a atual', () => {
    component.options = options;
    component.current = 'Em execução';
    fixture.detectChanges();

    const items = Array.from(el().querySelectorAll('.status-types-option'));
    expect(items.map(i => i.textContent.trim())).toEqual(options);
    const current = items.filter(i => i.classList.contains('current'));
    expect(current.length).toBe(1);
    expect(current[0].textContent.trim()).toBe('Em execução');
    expect(el().querySelector('.status-types-title').textContent).toContain('statusTypes');
  });

  it('mostra o rotulo "Status: atual" so quando pedido', () => {
    component.options = options;
    component.current = 'Em planejamento';
    fixture.detectChanges();
    expect(el().querySelector('.status-types-label')).toBeNull();

    component.showLabel = true;
    fixture.detectChanges();
    expect(el().querySelector('.status-types-current').textContent.trim()).toBe('Em planejamento');
  });

  it('nao mostra o (i) sem opcoes e nao renderiza nada sem dados', () => {
    component.options = [];
    component.current = 'Em execução';
    component.showLabel = true;
    fixture.detectChanges();
    expect(el().querySelector('.status-types-icon')).toBeNull();
    expect(el().querySelector('.status-types-label')).not.toBeNull();

    component.current = undefined;
    component.options = undefined;
    fixture.detectChanges();
    expect(el().querySelector('.app-status-types')).toBeNull();
  });
});
