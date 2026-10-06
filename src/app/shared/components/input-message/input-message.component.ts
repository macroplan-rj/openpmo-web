import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

/**
 * Mensagem de validacao sob um campo de formulario reativo. Aparece quando o controle esta
 * invalido e tocado (o Salvar marca todos como tocados, SD-10606) e some quando ele fica valido.
 */
@Component({
  selector: 'app-input-message',
  templateUrl: './input-message.component.html',
  styleUrls: ['./input-message.component.scss']
})
export class InputMessageComponent {

  @Input() form: FormGroup;
  @Input() field: string;

  constructor(private translateSrv: TranslateService) { }

  isInvalid() {
    try {
      const control = this.form.get(this.field);
      return control && control.enabled && control.invalid && control.touched;
    } catch (error) {
      return false;
    }
  }

  message() {
    const errors = this.form?.get(this.field)?.errors;
    if (errors?.email) {
      return this.translateSrv.instant('messages.invalidEmail');
    }
    if (errors?.required || errors?.minLengthTextInvalid) {
      return this.translateSrv.instant('requiredFill');
    }
    if (errors?.maxlength) {
      return this.translateSrv.instant('maxLength', { max: errors.maxlength.requiredLength });
    }
    return this.translateSrv.instant('messages.invalidField');
  }

}
