import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';

import { SaveButtonComponent } from './save-button.component';

describe('SaveButtonComponent', () => {
  let component: SaveButtonComponent;
  let fixture: ComponentFixture<SaveButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SaveButtonComponent ],
      imports: [ BrowserAnimationsModule, TranslateModule.forRoot() ],
      providers: [ MessageService ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SaveButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * SD #10519: o botao sumia ao completar o e-mail. `searchPerson()` chama
   * `hideButton()` antes da requisicao e `showButton()` depois da resposta — os dois
   * caem dentro da animacao `:leave` de 200ms. O relato bate com a sequencia: com o
   * e-mail incompleto o botao esta visivel (pessoa nao encontrada, papel local ativo)
   * e ao digitar o ultimo caractere ele some.
   */
  describe('esconder e reexibir dentro da janela da animacao', () => {

    const esperar = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const rotulo = () => fixture.nativeElement.querySelector('.button-label');

    const visivel = () => {
      const el = rotulo();
      if (!el) {
        return false;
      }
      return getComputedStyle(el).opacity === '1';
    };

    const assentar = async (ms: number) => {
      await esperar(ms);
      fixture.detectChanges();
    };

    it('deixa o botao visivel depois de um show isolado', async () => {
      component.showButton();
      await assentar(20);
      await assentar(400);

      expect(visivel()).toBeTrue();
    });

    it('deixa o botao visivel quando o show chega no meio da saida do hide', async () => {
      component.showButton();
      await assentar(20);
      await assentar(400);
      expect(visivel()).toBeTrue();

      // o usuario digita o ultimo caractere do e-mail: searchPerson() esconde o botao
      component.hideButton();
      await assentar(20);

      // a resposta de GET /persons/{key} chega com a animacao de saida ainda rodando
      component.showButton();
      await assentar(20);
      await assentar(400);

      expect(visivel()).toBeTrue();
    });
  });

  /**
   * SD #10606: o Salvar nao some mais com obrigatorio vazio. O clique com o [form] invalido
   * marca os campos como tocados (cada app-input-message mostra 'Preenchimento obrigatorio'),
   * avisa e nao emite save.
   */
  describe('obrigatorios pendentes (SD-10606)', () => {

    let form: FormGroup;
    let messageSrv: MessageService;

    beforeEach(() => {
      form = new FormGroup({
        name: new FormControl('', Validators.required),
        fullName: new FormControl('', Validators.required),
        note: new FormControl('')
      });
      component.form = form;
      messageSrv = TestBed.inject(MessageService);
    });

    it('mostra o botao quando o formulario muda, mesmo invalido', fakeAsync(() => {
      form.controls.note.setValue('x');
      form.markAsDirty();
      form.controls.note.setValue('xy');
      tick();

      expect(form.invalid).toBeTrue();
      expect(component.isShowingButton).toBeTrue();
    }));

    it('clique com obrigatorio vazio marca tudo como tocado, avisa e nao emite save', fakeAsync(() => {
      const saved = jasmine.createSpy('save');
      const invalid = jasmine.createSpy('invalidAttempt');
      component.save.subscribe(saved);
      component.invalidAttempt.subscribe(invalid);
      const toast = spyOn(messageSrv, 'add');
      component.showButton();
      tick();

      component.handleClick();
      tick();

      expect(saved).not.toHaveBeenCalled();
      expect(invalid).toHaveBeenCalled();
      expect(toast).toHaveBeenCalled();
      expect(form.controls.name.touched).toBeTrue();
      expect(form.controls.fullName.touched).toBeTrue();
      expect(component.isShowingButton).toBeTrue();
    }));

    it('clique com o formulario valido emite save e esconde o botao (como antes)', fakeAsync(() => {
      const saved = jasmine.createSpy('save');
      component.save.subscribe(saved);
      form.patchValue({ name: 'a', fullName: 'b' });
      component.showButton();
      tick();

      component.handleClick();
      tick();

      expect(saved).toHaveBeenCalledTimes(1);
      expect(component.isShowingButton).toBeFalse();
    }));

    it('acompanha a troca da instancia do formulario', fakeAsync(() => {
      const saved = jasmine.createSpy('save');
      component.save.subscribe(saved);
      component.form = new FormGroup({ name: new FormControl('ok', Validators.required) });

      component.handleClick();
      tick();

      expect(saved).toHaveBeenCalledTimes(1);
    }));
  });

  describe('guarda das telas sem [form] (SD-10606)', () => {

    it('blockIfInvalid marca os controles, avisa e devolve true quando ha pendencia', () => {
      const toast = spyOn(TestBed.inject(MessageService), 'add');
      const a = new FormGroup({ x: new FormControl('', Validators.required) });
      const b = new FormGroup({ y: new FormControl('ok', Validators.required) });

      expect(component.blockIfInvalid(a, b, null)).toBeTrue();
      expect(a.controls.x.touched).toBeTrue();
      expect(toast).toHaveBeenCalledTimes(1);
    });

    it('blockIfInvalid devolve false quando tudo esta valido', () => {
      const b = new FormGroup({ y: new FormControl('ok', Validators.required) });

      expect(component.blockIfInvalid(b)).toBeFalse();
    });

    it('rejectSave dentro do handler mantem o botao visivel apos o clique', fakeAsync(() => {
      spyOn(TestBed.inject(MessageService), 'add');
      component.save.subscribe(() => component.rejectSave());
      component.showButton();
      tick();

      component.handleClick();
      tick();

      expect(component.isShowingButton).toBeTrue();
    }));
  });
});
