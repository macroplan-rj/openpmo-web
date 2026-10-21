import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationService, MessageService, SelectItem } from 'primeng/api';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { IOffice } from 'src/app/shared/interfaces/IOffice';
import { AuthService } from 'src/app/shared/services/auth.service';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import {
  DynamicSelectionService,
  IDynamicSelectionItem,
  IDynamicSelectionList
} from 'src/app/shared/services/dynamic-selection.service';
import { OfficePermissionService } from 'src/app/shared/services/office-permission.service';
import { OfficeService } from 'src/app/shared/services/office.service';
import { ResponsiveService } from 'src/app/shared/services/responsive.service';

/**
 * SD #10548 / #10607: itens de uma lista da "Selecao dinamica" (ex.: PPA — Indicadores). Incluir, editar
 * e excluir exigem permissao de edicao no escritorio; o codigo nao muda depois de criado, porque as
 * fichas gravam o codigo. Mudancas valem na hora para o campo da ficha.
 */
@Component({
  selector: 'app-dynamic-selection-items',
  templateUrl: './dynamic-selection-items.component.html',
  styleUrls: ['./dynamic-selection-items.component.scss']
})
export class DynamicSelectionItemsComponent implements OnInit, OnDestroy {

  idOffice: number;
  listKey: string;
  list: IDynamicSelectionList;
  parentList: IDynamicSelectionList;
  propertiesOffice: IOffice;
  items: IDynamicSelectionItem[] = [];
  parentOptions: SelectItem[] = [];
  parentLabels: { [code: string]: string } = {};
  editPermission = false;
  responsive: boolean;
  isLoading = false;
  isSaving = false;
  showForm = false;
  editingCode: string;
  term = '';
  form: FormGroup;
  $destroy = new Subject();

  constructor(
    private dynamicSelectionSrv: DynamicSelectionService,
    private officeSrv: OfficeService,
    private activeRoute: ActivatedRoute,
    private breadcrumbSrv: BreadcrumbService,
    private authSrv: AuthService,
    private officePermissionSrv: OfficePermissionService,
    private responsiveSrv: ResponsiveService,
    private confirmationSrv: ConfirmationService,
    private messageSrv: MessageService,
    private formBuilder: FormBuilder,
    private router: Router,
    private translateSrv: TranslateService
  ) {
    this.activeRoute.queryParams.subscribe(({ idOffice, key }) => {
      this.idOffice = +idOffice;
      this.listKey = key;
    });
    this.responsiveSrv.observable.pipe(takeUntil(this.$destroy)).subscribe(value => this.responsive = value);
    this.form = this.formBuilder.group({
      code: ['', Validators.required],
      label: ['', Validators.required],
      parentCode: [null]
    });
  }

  get filteredItems(): IDynamicSelectionItem[] {
    const term = (this.term || '').trim().toLowerCase();
    if (!term) {
      return this.items;
    }
    return this.items.filter(item =>
      [item.code, item.label, this.parentLabels[item.parentCode]]
        .some(value => (value || '').toLowerCase().includes(term)));
  }

  async ngOnInit() {
    this.isLoading = true;
    const isUserAdmin = await this.authSrv.isUserAdmin();
    this.editPermission = isUserAdmin || await this.officePermissionSrv.getPermissions(this.idOffice);
    const lists = await this.dynamicSelectionSrv.lists();
    this.list = lists.find(l => l.key === this.listKey);
    if (!this.list) {
      this.router.navigate(['/dynamic-selection-lists'], { queryParams: { idOffice: this.idOffice } });
      return;
    }
    this.parentList = this.list.dependsOnKey ? lists.find(l => l.key === this.list.dependsOnKey) : undefined;
    if (this.parentList) {
      this.form.controls.parentCode.setValidators(Validators.required);
    }
    this.propertiesOffice = await this.officeSrv.getCurrentOffice(this.idOffice);
    this.breadcrumbSrv.setMenu([
      {
        key: 'officeConfiguration',
        info: this.propertiesOffice?.name,
        tooltip: this.propertiesOffice?.fullName,
        routerLink: ['/configuration-office'],
        admin: true,
        queryParams: { idOffice: this.idOffice }
      },
      {
        key: 'configuration',
        info: 'dynamicSelectionLists',
        tooltip: this.translateSrv.instant('dynamicSelectionLists'),
        admin: true,
        routerLink: ['/dynamic-selection-lists'],
        queryParams: { idOffice: this.idOffice }
      },
      {
        key: 'configuration',
        info: this.list.label,
        tooltip: this.list.label,
        admin: true,
        routerLink: ['/dynamic-selection-lists', 'list'],
        queryParams: { idOffice: this.idOffice, key: this.listKey }
      }
    ]);
    await this.loadItems();
  }

  ngOnDestroy(): void {
    this.$destroy.next();
    this.$destroy.complete();
  }

  async loadItems() {
    this.isLoading = true;
    try {
      const [items, parents] = await Promise.all([
        this.dynamicSelectionSrv.items(this.listKey),
        this.parentList ? this.dynamicSelectionSrv.items(this.parentList.key) : Promise.resolve([])
      ]);
      this.items = items;
      this.parentLabels = {};
      parents.forEach(p => this.parentLabels[p.code] = p.label);
      this.parentOptions = parents.map(p => ({ label: p.label, value: p.code }));
    } finally {
      this.isLoading = false;
    }
  }

  handleNew() {
    this.editingCode = undefined;
    this.form.reset({ code: '', label: '', parentCode: null });
    this.form.controls.code.enable();
    this.showForm = true;
  }

  handleEdit(item: IDynamicSelectionItem) {
    this.editingCode = item.code;
    this.form.reset({ code: item.code, label: item.label, parentCode: item.parentCode || null });
    this.form.controls.code.disable();
    this.showForm = true;
  }

  handleCancel() {
    this.showForm = false;
    this.editingCode = undefined;
  }

  async handleSave() {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const item: IDynamicSelectionItem = {
      code: value.code,
      label: value.label,
      parentCode: this.parentList ? value.parentCode : undefined
    };
    this.isSaving = true;
    try {
      if (this.editingCode) {
        await this.dynamicSelectionSrv.updateItem(this.listKey, this.idOffice, item);
      } else {
        await this.dynamicSelectionSrv.createItem(this.listKey, this.idOffice, item);
      }
      this.messageSrv.add({
        severity: 'success',
        summary: this.translateSrv.instant('success'),
        detail: this.translateSrv.instant('messages.savedSuccessfully')
      });
      this.showForm = false;
      this.editingCode = undefined;
      await this.loadItems();
    } catch {
      // erro ja exibido pelo interceptor; o formulario fica aberto para corrigir
    } finally {
      this.isSaving = false;
    }
  }

  handleDelete(item: IDynamicSelectionItem) {
    this.confirmationSrv.confirm({
      message: `${this.translateSrv.instant('messages.deleteConfirmation')} ${item.label}?`,
      key: 'deleteConfirm',
      acceptLabel: this.translateSrv.instant('yes'),
      rejectLabel: this.translateSrv.instant('no'),
      accept: async() => {
        try {
          await this.dynamicSelectionSrv.deleteItem(this.listKey, this.idOffice, item.code);
          this.messageSrv.add({
            severity: 'success',
            summary: this.translateSrv.instant('success'),
            detail: this.translateSrv.instant('messages.deleteSuccessful')
          });
          await this.loadItems();
        } catch {
          // recusa (item pai ou em uso) ja exibida pelo interceptor
        }
      }
    });
  }

}
