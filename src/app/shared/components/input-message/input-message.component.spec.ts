import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { InputMessageComponent } from './input-message.component';

describe('InputMessageComponent', () => {
  let component: InputMessageComponent;
  let fixture: ComponentFixture<InputMessageComponent>;
  let form: FormGroup;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InputMessageComponent ],
      imports: [ TranslateModule.forRoot() ]
    })
    .compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('pt-BR', { requiredFill: 'Preenchimento obrigatório' });
    translate.use('pt-BR');
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(InputMessageComponent);
    component = fixture.componentInstance;
    form = new FormGroup({ name: new FormControl('', Validators.required) });
    component.form = form;
    component.field = 'name';
    fixture.detectChanges();
  });

  const texto = () => (fixture.nativeElement.querySelector('.input-message-error')?.textContent || '').trim();

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // SD-10606
  it('so mostra a mensagem depois de tocado (o Salvar faz markAllAsTouched)', () => {
    expect(texto()).toBe('');

    form.markAllAsTouched();
    fixture.detectChanges();

    expect(texto()).toBe('Preenchimento obrigatório');
  });

  it('a mensagem some quando o campo e preenchido', () => {
    form.markAllAsTouched();
    fixture.detectChanges();

    form.controls.name.setValue('Projeto');
    fixture.detectChanges();

    expect(texto()).toBe('');
  });
});
