import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DynamicSelectionListsComponent } from './dynamic-selection-lists/dynamic-selection-lists.component';
import { DynamicSelectionItemsComponent } from './dynamic-selection-items/dynamic-selection-items.component';

const routes: Routes = [
  {
    path: '',
    component: DynamicSelectionListsComponent
  },
  {
    path: 'list',
    component: DynamicSelectionItemsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DynamicSelectionListRoutingModule { }
