import { Component, Input } from '@angular/core';

/**
 * "Tipos de situacao" (SD-10604): icone (i) que, no hover, lista as opcoes da propriedade de
 * situacao do workpack na ordem do modelo, com a atual destacada. Usado na EAP (com o
 * rotulo "Status: <atual>") e no card da aba Entregas (so o icone).
 */
@Component({
  selector: 'app-status-types-tooltip',
  templateUrl: './status-types-tooltip.component.html',
  styleUrls: ['./status-types-tooltip.component.scss'],
})
export class StatusTypesTooltipComponent {
  @Input() options: string[] = [];

  @Input() current: string;

  @Input() showLabel = false;

  get hasOptions(): boolean {
    return Array.isArray(this.options) && this.options.length > 0;
  }

  isCurrent(option: string): boolean {
    return !!this.current && option?.trim() === this.current.trim();
  }
}
