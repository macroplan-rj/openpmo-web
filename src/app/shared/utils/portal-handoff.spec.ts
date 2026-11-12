import { buildTargetUrl, encodeAcesso, FetchLike, getHandoffCode, resolveHandoffRoute } from './portal-handoff';

type Reply = { ok: boolean; status: number; body: any };

function fakeFetch(replies: Record<string, Reply>) {
  const calls: { url: string; body: any }[] = [];
  const fn: FetchLike = (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const reply = replies[url];
    if (!reply) {
      return Promise.reject(new Error('rede'));
    }
    return Promise.resolve({ ok: reply.ok, status: reply.status, json: () => Promise.resolve(reply.body) });
  };
  return { fn, calls };
}

const CONFIG = { API: 'https://openpmo.example/openpmo', portalApi: 'https://portal.example/' };
const EXCHANGE = 'https://portal.example/api/auth/handoff/exchange';
const SIGNIN = 'https://openpmo.example/openpmo/signin/portal-token';

describe('portal-handoff', () => {
  it('lê o código da query', () => {
    expect(getHandoffCode('?handoff=abc&x=1')).toBe('abc');
    expect(getHandoffCode('?x=1')).toBeNull();
    expect(getHandoffCode('')).toBeNull();
  });

  it('monta a URL de destino sem a query', () => {
    expect(buildTargetUrl('https://openpmo.example', '/', '/login')).toBe('https://openpmo.example/#/login');
  });

  it('não faz nada sem código ou sem portalApi', async () => {
    const { fn, calls } = fakeFetch({});
    expect(await resolveHandoffRoute(CONFIG, '', fn)).toBeNull();
    expect(await resolveHandoffRoute({ API: CONFIG.API }, '?handoff=abc', fn)).toBeNull();
    expect(calls.length).toBe(0);
  });

  it('troca o código e segue para a home com o AcessoDto', async () => {
    const dto = { token: 't', refreshToken: 'r' };
    const { fn, calls } = fakeFetch({
      [EXCHANGE]: { ok: true, status: 200, body: { tokens: { access_token: 'kc-token' } } },
      [SIGNIN]: { ok: true, status: 200, body: dto },
    });

    const route = await resolveHandoffRoute(CONFIG, '?handoff=abc', fn);

    expect(route).toBe(`/home?AcessoDto=${encodeAcesso(dto)}`);
    expect(calls[0]).toEqual({ url: EXCHANGE, body: { code: 'abc' } });
    expect(calls[1]).toEqual({ url: SIGNIN, body: { accessToken: 'kc-token' } });
    expect(JSON.parse(atob(encodeAcesso(dto)))).toEqual(dto);
  });

  it('mostra acesso negado para pessoa sem cadastro', async () => {
    const { fn } = fakeFetch({
      [EXCHANGE]: { ok: true, status: 200, body: { tokens: { access_token: 'kc-token' } } },
      [SIGNIN]: { ok: false, status: 401, body: { error: 'error.unauthorized' } },
    });
    expect(await resolveHandoffRoute(CONFIG, '?handoff=abc', fn)).toBe('/home?AcessoDto=error.unauthorized');
  });

  it('vai para o login se o código for inválido, o token for recusado ou a rede falhar', async () => {
    const invalid = fakeFetch({ [EXCHANGE]: { ok: false, status: 400, body: {} } });
    expect(await resolveHandoffRoute(CONFIG, '?handoff=abc', invalid.fn)).toBe('/login');

    const refused = fakeFetch({
      [EXCHANGE]: { ok: true, status: 200, body: { tokens: { access_token: 'kc-token' } } },
      [SIGNIN]: { ok: false, status: 401, body: { error: 'invalid.token' } },
    });
    expect(await resolveHandoffRoute(CONFIG, '?handoff=abc', refused.fn)).toBe('/login');

    const offline = fakeFetch({});
    expect(await resolveHandoffRoute(CONFIG, '?handoff=abc', offline.fn)).toBe('/login');
  });
});
