import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PainelTokenListComponent } from './painel-token-list/painel-token-list.component';

const routes: Routes = [
  {
    path: '',
    component: PainelTokenListComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PainelTokenRoutingModule { }
