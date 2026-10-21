import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ComponentsModule } from 'src/app/shared/components/components.module';
import { CoreModule } from 'src/app/core/core.module';
import { DynamicSelectionListRoutingModule } from './dynamic-selection-list-routing.module';
import { DynamicSelectionListsComponent } from './dynamic-selection-lists/dynamic-selection-lists.component';
import { DynamicSelectionItemsComponent } from './dynamic-selection-items/dynamic-selection-items.component';

/** Tela "Listas de selecao" do menu do escritorio: itens do PPA e do PELP (SD #10548 / #10607). */
@NgModule({
  declarations: [DynamicSelectionListsComponent, DynamicSelectionItemsComponent],
  imports: [
    CommonModule,
    DynamicSelectionListRoutingModule,
    ComponentsModule,
    CoreModule,
    FormsModule,
    ReactiveFormsModule,
  ]
})
export class DynamicSelectionListModule { }
