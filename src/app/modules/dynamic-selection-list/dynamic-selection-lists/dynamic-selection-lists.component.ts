import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ICard } from 'src/app/shared/interfaces/ICard';
import { ICardItem } from 'src/app/shared/interfaces/ICardItem';
import { IOffice } from 'src/app/shared/interfaces/IOffice';
import { AuthService } from 'src/app/shared/services/auth.service';
import { BreadcrumbService } from 'src/app/shared/services/breadcrumb.service';
import { DynamicSelectionService } from 'src/app/shared/services/dynamic-selection.service';
import { OfficePermissionService } from 'src/app/shared/services/office-permission.service';
import { OfficeService } from 'src/app/shared/services/office.service';
import { ResponsiveService } from 'src/app/shared/services/responsive.service';

/**
 * SD #10548 / #10607: listas da "Selecao dinamica" (PPA, PELP) no menu do escritorio, no padrao de
 * Organizacoes. As listas vem de seed/migracao; cada card abre o cadastro dos itens.
 */
@Component({
  selector: 'app-dynamic-selection-lists',
  templateUrl: './dynamic-selection-lists.component.html',
  styleUrls: ['./dynamic-selection-lists.component.scss']
})
export class DynamicSelectionListsComponent implements OnInit, OnDestroy {

  cardProperties: ICard = {
    toggleable: false,
    initialStateToggle: false,
    cardTitle: '',
    collapseble: true,
    initialStateCollapse: false
  };
  cardItems: ICardItem[] = [];
  idOffice: number;
  propertiesOffice: IOffice;
  responsive: boolean;
  isLoading = false;
  $destroy = new Subject();

  constructor(
    private dynamicSelectionSrv: DynamicSelectionService,
    private officeSrv: OfficeService,
    private activeRoute: ActivatedRoute,
    private breadcrumbSrv: BreadcrumbService,
    private authSrv: AuthService,
    private officePermissionSrv: OfficePermissionService,
    private responsiveSrv: ResponsiveService,
    private router: Router,
    private translateSrv: TranslateService
  ) {
    this.activeRoute.queryParams.subscribe(({ idOffice }) => this.idOffice = +idOffice);
    this.responsiveSrv.observable.pipe(takeUntil(this.$destroy)).subscribe(value => this.responsive = value);
  }

  async ngOnInit() {
    this.isLoading = true;
    const isUserAdmin = await this.authSrv.isUserAdmin();
    const editPermission = await this.officePermissionSrv.getPermissions(this.idOffice);
    if (!isUserAdmin && !editPermission) {
      this.router.navigate(['/offices']);
      return;
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
      }
    ]);
    await this.loadLists();
  }

  ngOnDestroy(): void {
    this.$destroy.next();
    this.$destroy.complete();
  }

  async loadLists() {
    this.isLoading = true;
    try {
      const lists = await this.dynamicSelectionSrv.lists();
      this.cardItems = lists.map(list => ({
        typeCardItem: 'listItem',
        icon: 'fas fa-sitemap',
        nameCardItem: list.label,
        subtitleCardItem: this.translateSrv.instant('dynamicSelectionItemsCount', { count: list.items }),
        urlCard: '/dynamic-selection-lists/list',
        paramsUrlCard: [{ name: 'idOffice', value: this.idOffice }, { name: 'key', value: list.key }]
      }));
    } finally {
      this.isLoading = false;
    }
  }

}
