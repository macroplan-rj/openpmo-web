import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/shared/services/auth.service';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { IPainelApiToken, PainelTokenService } from 'src/app/shared/services/painel-token.service';
import { ResponsiveService } from 'src/app/shared/services/responsive.service';

/**
 * US-042: tokens de servico da API do Painel Estrategico (cabecalho X-Api-Key). So administrador.
 * O valor do token so existe na resposta da geracao: fica em memoria ate o dialogo ser fechado e nao volta mais.
 */
@Component({
  selector: 'app-painel-token-list',
  templateUrl: './painel-token-list.component.html',
  styleUrls: ['./painel-token-list.component.scss']
})
export class PainelTokenListComponent implements OnInit, OnDestroy {

  static readonly NAME_MAX_LENGTH = 100;

  tokens: IPainelApiToken[] = [];
  responsive: boolean;
  isLoading = false;
  isSaving = false;
  showForm = false;
  form: FormGroup;
  generatedToken: string;
  generatedName: string;
  showGenerated = false;
  nameMaxLength = PainelTokenListComponent.NAME_MAX_LENGTH;
  $destroy = new Subject();

  constructor(
    private painelTokenSrv: PainelTokenService,
    private authSrv: AuthService,
    private breadcrumbSrv: BreadcrumbService,
    private responsiveSrv: ResponsiveService,
    private confirmationSrv: ConfirmationService,
    private messageSrv: MessageService,
    private formBuilder: FormBuilder,
    private router: Router,
    private translateSrv: TranslateService
  ) {
    this.responsiveSrv.observable.pipe(takeUntil(this.$destroy)).subscribe(value => this.responsive = value);
    this.form = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(PainelTokenListComponent.NAME_MAX_LENGTH)]]
    });
  }

  async ngOnInit() {
    const isUserAdmin = await this.authSrv.isUserAdmin();
    if (!isUserAdmin) {
      await this.router.navigate(['/offices']);
      return;
    }
    this.breadcrumbSrv.setMenu([
      {
        key: 'administration',
        routerLink: ['/administration'],
      },
      {
        key: 'painelApiTokens',
        routerLink: ['/painel-tokens'],
      }
    ]);
    await this.loadTokens();
  }

  ngOnDestroy(): void {
    this.$destroy.next();
    this.$destroy.complete();
  }

  async loadTokens() {
    this.isLoading = true;
    try {
      this.tokens = await this.painelTokenSrv.list();
    } finally {
      this.isLoading = false;
    }
  }

  /** A API pode mandar a data como texto ISO ou como lista [ano, mes, dia, hora, minuto, segundo]. */
  toDate(value: any): Date {
    if (!value) {
      return undefined;
    }
    if (Array.isArray(value)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = value;
      return new Date(year, month - 1, day, hour, minute, second);
    }
    return new Date(value);
  }

  handleNew() {
    this.form.reset({ name: '' });
    this.showForm = true;
  }

  handleCancel() {
    this.showForm = false;
  }

  async handleGenerate() {
    const name = (this.form.value.name || '').trim();
    if (this.form.invalid || !name || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSaving = true;
    try {
      const created = await this.painelTokenSrv.generate(name);
      this.generatedToken = created.token;
      this.generatedName = created.name;
      this.showGenerated = true;
      this.showForm = false;
      await this.loadTokens();
    } catch {
      // erro ja exibido pelo interceptor; o formulario fica aberto para corrigir
    } finally {
      this.isSaving = false;
    }
  }

  async handleCopy() {
    try {
      await navigator.clipboard.writeText(this.generatedToken);
      this.messageSrv.add({
        severity: 'success',
        summary: this.translateSrv.instant('success'),
        detail: this.translateSrv.instant('painelApiTokenCopied')
      });
    } catch {
      // sem acesso a area de transferencia: o valor continua visivel e selecionavel no dialogo
      this.messageSrv.add({
        severity: 'warn',
        summary: this.translateSrv.instant('attention'),
        detail: this.translateSrv.instant('painelApiTokenCopyFailed')
      });
    }
  }

  /** Fechar o dialogo descarta o valor: a partir daqui ele nao pode mais ser recuperado. */
  handleCloseGenerated() {
    this.showGenerated = false;
    this.generatedToken = undefined;
    this.generatedName = undefined;
  }

  handleRevoke(token: IPainelApiToken) {
    if (!token.active) {
      return;
    }
    this.confirmationSrv.confirm({
      message: `${this.translateSrv.instant('painelApiTokenRevokeConfirmation')} ${token.name}?`,
      key: 'painelTokenRevokeConfirm',
      acceptLabel: this.translateSrv.instant('yes'),
      rejectLabel: this.translateSrv.instant('no'),
      accept: async() => {
        try {
          await this.painelTokenSrv.revoke(token.id);
          this.messageSrv.add({
            severity: 'success',
            summary: this.translateSrv.instant('success'),
            detail: this.translateSrv.instant('painelApiTokenRevokedMessage')
          });
          await this.loadTokens();
        } catch {
          // erro ja exibido pelo interceptor
        }
      }
    });
  }

}
