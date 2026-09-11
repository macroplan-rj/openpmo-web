import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';

import { SaveButtonComponent } from './save-button.component';

describe('SaveButtonComponent', () => {
  let component: SaveButtonComponent;
  let fixture: ComponentFixture<SaveButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SaveButtonComponent ],
      imports: [ BrowserAnimationsModule, TranslateModule.forRoot() ]
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
});
