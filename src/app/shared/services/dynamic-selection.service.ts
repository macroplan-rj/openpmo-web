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
}
