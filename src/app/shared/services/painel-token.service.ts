import { HttpClient } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { map } from 'rxjs/operators';
import { APP_CONFIG } from '../tokens/AppConfigToken';

/** Token da API do Painel como a administracao o ve: nunca traz o valor, so o inicio dele. */
export interface IPainelApiToken {
  id: number;
  name: string;
  prefix: string;
  createdAt: string;
  createdBy: string;
  revokedAt?: string;
  revokedBy?: string;
  lastUsedAt?: string;
  active: boolean;
}

/** Resposta da geracao: unica vez em que o valor do token vem da API. */
export interface IPainelApiTokenCreated extends IPainelApiToken {
  token: string;
}

/** Gestao dos tokens de servico da API do Painel Estrategico (US-042). Erros sao exibidos pelo interceptor. */
@Injectable({ providedIn: 'root' })
export class PainelTokenService {

  private readonly baseUrl: string;

  constructor(private http: HttpClient, injector: Injector) {
    this.baseUrl = `${injector.get(APP_CONFIG).API}/painel-tokens`;
  }

  list(): Promise<IPainelApiToken[]> {
    return this.http.get<any>(this.baseUrl).pipe(map(res => (res && res.data) || [])).toPromise();
  }

  generate(name: string): Promise<IPainelApiTokenCreated> {
    return this.http.post<any>(this.baseUrl, { name }).pipe(map(res => res && res.data)).toPromise();
  }

  revoke(id: number): Promise<IPainelApiToken> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(map(res => res && res.data)).toPromise();
  }
}
