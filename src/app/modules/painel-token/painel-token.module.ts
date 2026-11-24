import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ComponentsModule } from 'src/app/shared/components/components.module';
import { CoreModule } from 'src/app/core/core.module';
import { PainelTokenRoutingModule } from './painel-token-routing.module';
import { PainelTokenListComponent } from './painel-token-list/painel-token-list.component';

/** Tela "Tokens da API" do menu de administracao: gerar, listar e revogar tokens da API do Painel (US-042). */
@NgModule({
  declarations: [PainelTokenListComponent],
  imports: [
    CommonModule,
    PainelTokenRoutingModule,
    ComponentsModule,
    CoreModule,
    FormsModule,
    ReactiveFormsModule,
    ConfirmDialogModule,
  ]
})
export class PainelTokenModule { }
