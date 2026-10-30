import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { APP_CONFIG } from '../tokens/AppConfigToken';

export interface IDynamicSelectionProvider {
  key: string;
  label: string;
  dependsOnKey?: string;
}

/** Resumo de uma lista interna para a tela de cadastro (SD #10548 / #10607). */
export interface IDynamicSelectionList {
  key: string;
  label: string;
  dependsOnKey?: string;
  items: number;
}

export interface IDynamicSelectionItem {
  code: string;
  label: string;
  parentCode?: string;
}

export interface IDynamicSelectionOption {
  code: string;
  label: string;
  parentCode?: string;
}

/**
 * Rotas da propriedade "Selecao dinamica" (SD #10548). As opcoes vem de um provedor na API
 * (/dynamic-selection); o front so conhece a chave do provedor e o(s) codigo(s) do pai.
 */
@Injectable({ providedIn: 'root' })
export class DynamicSelectionService {

  private readonly baseUrl: string;

  constructor(private http: HttpClient, injector: Injector) {
    this.baseUrl = `${injector.get(APP_CONFIG).API}/dynamic-selection`;
  }

  providers(): Observable<IDynamicSelectionProvider[]> {
    return this.http.get<any>(`${this.baseUrl}/providers`).pipe(
      map(res => (res && res.data) || []),
      catchError(() => of([]))
    );
  }

  options(provider: string, parentCodes?: string[]): Observable<IDynamicSelectionOption[]> {
    let params = new HttpParams().set('provider', provider);
    if (parentCodes && parentCodes.length) {
      params = params.set('parent', parentCodes.join(','));
    }
    return this.http.get<any>(`${this.baseUrl}/options`, { params }).pipe(
      map(res => (res && res.data) || []),
      catchError(() => of([]))
    );
  }

  // Cadastro dos itens (tela "Listas de selecao"). Sem catchError: o interceptor mostra o erro da API.

  lists(): Promise<IDynamicSelectionList[]> {
    return this.http.get<any>(`${this.baseUrl}/lists`).pipe(map(res => (res && res.data) || [])).toPromise();
  }

  createList(idOffice: number, list: { label: string; dependsOnKey?: string }): Promise<IDynamicSelectionList> {
    return this.http.post<any>(`${this.baseUrl}/lists`, list,
      { params: new HttpParams().set('id-office', String(idOffice)) }).pipe(map(res => res && res.data)).toPromise();
  }

  items(listKey: string): Promise<IDynamicSelectionItem[]> {
    return this.http.get<any>(`${this.baseUrl}/lists/${encodeURIComponent(listKey)}/items`)
      .pipe(map(res => (res && res.data) || [])).toPromise();
  }

  createItem(listKey: string, idOffice: number, item: IDynamicSelectionItem): Promise<IDynamicSelectionItem> {
    return this.http.post<any>(`${this.baseUrl}/lists/${encodeURIComponent(listKey)}/items`, item,
      { params: new HttpParams().set('id-office', String(idOffice)) }).pipe(map(res => res && res.data)).toPromise();
  }

  updateItem(listKey: string, idOffice: number, item: IDynamicSelectionItem): Promise<IDynamicSelectionItem> {
    return this.http.put<any>(`${this.baseUrl}/lists/${encodeURIComponent(listKey)}/items/${encodeURIComponent(item.code)}`, item,
      { params: new HttpParams().set('id-office', String(idOffice)) }).pipe(map(res => res && res.data)).toPromise();
  }

  deleteItem(listKey: string, idOffice: number, code: string): Promise<void> {
    return this.http.delete<void>(`${this.baseUrl}/lists/${encodeURIComponent(listKey)}/items/${encodeURIComponent(code)}`,
      { params: new HttpParams().set('id-office', String(idOffice)) }).toPromise();
  }
}
