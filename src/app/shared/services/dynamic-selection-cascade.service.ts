import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

export interface IDynamicSelectionChange {
  /** Nome da propriedade (PropertyModel.name) que mudou. */
  name: string;
  /** Codigos escolhidos agora. */
  codes: string[];
  /** true quando a mudanca veio do usuario; false no registro inicial ao abrir a tela. */
  userChange: boolean;
}

/**
 * Coordena a cascata entre campos de "Selecao dinamica" pelo NOME da propriedade (SD #10548).
 *
 * Substitui a amarracao da SA-610, que so funcionava dentro do grupo "Relacao com o PPA" e
 * reconhecia o PPA pelo prefixo do rotulo. Aqui cada campo publica o proprio valor; o campo que
 * tem dependsOn = nome do pai escuta e recarrega as opcoes. Funciona entre grupos e fora deles.
 */
@Injectable({ providedIn: 'root' })
export class DynamicSelectionCascadeService {

  private readonly values = new Map<string, string[]>();
  private readonly changes$ = new Subject<IDynamicSelectionChange>();

  get changes(): Observable<IDynamicSelectionChange> {
    return this.changes$.asObservable();
  }

  publish(name: string, codes: string[], userChange: boolean) {
    this.values.set(name, codes || []);
    this.changes$.next({ name, codes: codes || [], userChange });
  }

  current(name: string): string[] | undefined {
    return this.values.get(name);
  }

  forget(name: string) {
    this.values.delete(name);
  }
}
