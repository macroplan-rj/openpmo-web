import { Component, EventEmitter, Input, OnDestroy, Output } from '@angular/core';
import { AbstractControl, FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { enterLeave } from '../../animations/enterLeave.animation';
import { ResponsiveService } from '../../services/responsive.service';

/**
 * Botao Salvar flutuante.
 *
 * SD-10606: o botao nao some mais por o formulario estar invalido. Ele aparece quando ha
 * alteracao (form dirty ou showButton() da tela) e so some depois de um clique que salva.
 * Com um [form] vinculado e invalido, o clique marca todos os campos como tocados (para
 * que cada obrigatorio vazio mostre 'Preenchimento obrigatorio'), avisa e NAO emite save.
 */
@Component({
  selector: 'app-save-button',
  templateUrl: './save-button.component.html',
  styleUrls: ['./save-button.component.scss'],
  animations: [
    enterLeave(
      { opacity: 0, pointerEvents: 'none', transform: 'translateY(100%)' },
      { opacity: 1, pointerEvents: 'all', transform: 'translateY(0)' },
      300
    )
  ]
})
export class SaveButtonComponent implements OnDestroy {

  @Input() set form(form: FormGroup) {
    this.formGroup = form instanceof FormGroup ? form : undefined;
    this.formChange$.next();
    if (this.formGroup) {
      const current = this.formGroup;
      current.valueChanges
        .pipe(filter(() => current.dirty), takeUntil(this.formChange$), takeUntil(this.$destroy))
        .subscribe(() => this.showButton());
    }
  };
  get form(): FormGroup {
    return this.formGroup;
  }
  @Output() save = new EventEmitter();
  /** Emitido no lugar de `save` quando o clique encontra o [form] invalido. */
  @Output() invalidAttempt = new EventEmitter();
  isShowingButton = false;
  $destroy = new Subject();
  responsive = false;
  private formGroup: FormGroup;
  private formChange$ = new Subject();
  private saveRejected = false;

  constructor(
    private responsiveSrv: ResponsiveService,
    private messageSrv: MessageService,
    private translateSrv: TranslateService
  ) {
    this.responsiveSrv.observable.pipe(takeUntil(this.$destroy)).subscribe(resp => this.responsive = resp);
  }

  ngOnDestroy(): void {
    this.formChange$.next();
    this.formChange$.complete();
    this.$destroy.next();
    this.$destroy.complete();
  }

  handleClick() {
    if (this.formGroup && this.formGroup.invalid) {
      this.formGroup.markAllAsTouched();
      this.notifyRequiredFields();
      this.invalidAttempt.next();
      return;
    }
    this.saveRejected = false;
    this.save.next();
    if (!this.saveRejected) {
      this.hideButton();
    }
  }

  /**
   * Guarda para as telas que nao vinculam [form] (ou que tem mais de um formulario):
   * chamada no inicio do handler de save (antes de qualquer await). Se algum controle
   * estiver invalido, marca todos como tocados, avisa, mantem o botao visivel e retorna
   * true para a tela abortar o envio.
   */
  blockIfInvalid(...controls: AbstractControl[]): boolean {
    const invalid = controls.filter(control => !!control && control.invalid);
    if (!invalid.length) {
      return false;
    }
    invalid.forEach(control => control.markAllAsTouched());
    this.rejectSave();
    return true;
  }

  /** A tela recusou o envio (pendencia propria): avisa e mantem o botao visivel. */
  rejectSave(notify = true) {
    this.saveRejected = true;
    if (notify) {
      this.notifyRequiredFields();
    }
    this.showButton();
  }

  /** Aviso padrao de obrigatorios pendentes (tambem usado pelas telas sem [form]). */
  notifyRequiredFields() {
    this.messageSrv.add({
      severity: 'warn',
      summary: this.translateSrv.instant('attention'),
      detail: this.translateSrv.instant('messages.requiredInformationsMustBeFilled'),
      life: 3000
    });
  }

  showButton() {
    setTimeout(() => this.isShowingButton = true, 0);
  }

  hideButton() {
    setTimeout(() => this.isShowingButton = false, 0);
  }

}
