import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { PropertyTemplateModel } from 'src/app/shared/models/PropertyTemplateModel';
import { DynamicSelectionService, IDynamicSelectionOption } from 'src/app/shared/services/dynamic-selection.service';
import { DynamicSelectionCascadeService } from 'src/app/shared/services/dynamic-selection-cascade.service';
import { ResponsiveService } from 'src/app/shared/services/responsive.service';

/**
 * Campo da propriedade "Selecao dinamica" (SD #10548).
 *
 * As opcoes vem do provedor da API ({@link DynamicSelectionService}). Quando o modelo diz que o
 * campo depende de outro (dependsOn = nome do pai), ele escuta o pai pelo
 * {@link DynamicSelectionCascadeService}: ao mudar o pai, recarrega so as opcoes daquele(s)
 * codigo(s) e tira da selecao o que ficou orfao. Ao ABRIR a tela nada e podado — abrir nao pode
 * marcar o formulario como alterado.
 */
@Component({
  selector: 'app-property-dynamic-selection',
  templateUrl: './property-dynamic-selection.component.html',
  styleUrls: ['../property-selection/property-selection.component.scss']
})
export class PropertyDynamicSelectionComponent implements OnInit, OnDestroy {

  @Input() property: PropertyTemplateModel;
  @Output() changed = new EventEmitter();

  options: { label: string; value: string }[] = [];
  loading = false;
  responsive: boolean;
  language: string;
  private readonly $destroy = new Subject<void>();

  constructor(
    private dynamicSelectionSrv: DynamicSelectionService,
    private cascadeSrv: DynamicSelectionCascadeService,
    private responsiveSrv: ResponsiveService,
    private translateSrv: TranslateService
  ) {
    this.responsiveSrv.observable.pipe(takeUntil(this.$destroy)).subscribe(value => this.responsive = value);
  }

  ngOnInit(): void {
    this.language = this.translateSrv.currentLang;
    if (!this.property.valueLabels) {
      this.property.valueLabels = {};
    }
    if (this.property.dependsOn) {
      this.cascadeSrv.changes
        .pipe(takeUntil(this.$destroy), filter(change => change.name === this.property.dependsOn))
        .subscribe(change => this.loadOptions(change.codes, change.userChange));
    }
    const parentCodes = this.property.dependsOn ? this.cascadeSrv.current(this.property.dependsOn) : undefined;
    this.loadOptions(parentCodes, false);
    // Publica o proprio valor para os filhos. Filho que ja estava na tela recarrega agora;
    // filho que nascer depois le por current().
    this.cascadeSrv.publish(this.property.name, this.selectedCodes(), false);
  }

  ngOnDestroy(): void {
    this.cascadeSrv.forget(this.property.name);
    this.$destroy.next();
    this.$destroy.complete();
  }

  loadOptions(parentCodes: string[] | undefined, prune: boolean) {
    if (!this.property.providerKey) {
      this.options = [];
      return;
    }
    this.loading = true;
    this.dynamicSelectionSrv.options(this.property.providerKey, parentCodes).subscribe(list => {
      this.loading = false;
      this.applyOptions(list, prune);
    });
  }

  applyOptions(list: IDynamicSelectionOption[], prune: boolean) {
    (list || []).forEach(option => this.property.valueLabels[option.code] = option.label);
    const available = (list || []).map(option => ({ label: option.label, value: option.code }));
    // O que ja esta salvo continua visivel mesmo que o provedor nao devolva mais (ex.: filtro
    // do pai ainda nao carregado) — a menos que seja poda pedida pelo usuario.
    const kept = this.selectedCodes().filter(code => !available.some(option => option.value === code));
    this.options = prune ? available :
      [...available, ...kept.map(code => ({ label: this.property.valueLabels[code] || code, value: code }))];
    if (prune) {
      const allowed = new Set(available.map(option => option.value));
      const before = this.selectedCodes();
      const after = before.filter(code => allowed.has(code));
      if (after.length !== before.length) {
        this.property.value = this.property.multipleSelection ? after : (after[0] ?? null);
        this.cascadeSrv.publish(this.property.name, after, true);
        this.changed.emit(this.property.value);
      }
    }
  }

  onValueChange(value: any) {
    this.cascadeSrv.publish(this.property.name, this.selectedCodes(), true);
    this.changed.emit(value);
  }

  selectedCodes(): string[] {
    const value = this.property.value;
    if (Array.isArray(value)) {
      return (value as string[]).filter(code => code !== null && code !== undefined && `${code}` !== '');
    }
    return value ? [value as string] : [];
  }

}
