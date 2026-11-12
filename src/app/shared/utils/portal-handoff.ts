/**
 * Entrada no OpenPMO a partir do portal SIPGR (US-040).
 *
 * O portal abre o OpenPMO com `?handoff=<código>` (uso único, ~30 s). Antes do bootstrap do Angular:
 *  1. troca o código no backend do portal (`POST {portalApi}/api/auth/handoff/exchange`), que confere
 *     o header Origin e devolve o access token do Keycloak;
 *  2. envia esse token para a API do OpenPMO (`POST {API}/signin/portal-token`), que valida pelo JWKS
 *     do realm e devolve o AcessoDto;
 *  3. segue para `#/home?AcessoDto=<base64>`, o mesmo destino do login OIDC — a home já salva os
 *     tokens ou mostra "acesso negado" (`error.unauthorized`).
 * Em qualquer falha, cai em `#/login` sem o código na URL.
 */
export const HANDOFF_PARAM = 'handoff';
export const UNAUTHORIZED = 'error.unauthorized';

export interface IHandoffConfig {
  API: string;
  portalApi?: string;
}

export type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) =>
  Promise<{ ok: boolean; status: number; json(): Promise<any> }>;

export function getHandoffCode(search: string): string | null {
  const code = new URLSearchParams(search || '').get(HANDOFF_PARAM);
  return code && code.trim() ? code.trim() : null;
}

/** URL de destino sem a query (onde estava o código), mantendo o caminho da aplicação. */
export function buildTargetUrl(origin: string, pathname: string, hashRoute: string): string {
  return `${origin}${pathname || '/'}#${hashRoute}`;
}

export function encodeAcesso(dto: { token: string; refreshToken: string }): string {
  return btoa(JSON.stringify(dto)).replace(/=+$/, '');
}

const trimSlash = (url: string) => (url || '').replace(/\/+$/, '');

async function postJson(fetchFn: FetchLike, url: string, body: any) {
  return fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Resolve o handoff e devolve a rota (hash) para onde seguir: `/home?AcessoDto=...` ou `/login`.
 * Devolve null quando não há código na URL ou o portal não está configurado.
 */
export async function resolveHandoffRoute(
  config: IHandoffConfig,
  search: string,
  fetchFn: FetchLike
): Promise<string | null> {
  const code = getHandoffCode(search);
  if (!code || !config.portalApi) {
    return null;
  }
  try {
    const exchange = await postJson(fetchFn, `${trimSlash(config.portalApi)}/api/auth/handoff/exchange`, { code });
    if (!exchange.ok) {
      return '/login';
    }
    const accessToken = (await exchange.json())?.tokens?.access_token;
    if (!accessToken) {
      return '/login';
    }
    const signin = await postJson(fetchFn, `${trimSlash(config.API)}/signin/portal-token`, { accessToken });
    if (signin.ok) {
      const dto = await signin.json();
      return `/home?AcessoDto=${encodeAcesso(dto)}`;
    }
    const error = signin.status === 401 ? (await signin.json().catch(() => ({})))?.error : null;
    return error === UNAUTHORIZED ? `/home?AcessoDto=${UNAUTHORIZED}` : '/login';
  } catch (e) {
    console.error('Erro no login pelo portal', e);
    return '/login';
  }
}
