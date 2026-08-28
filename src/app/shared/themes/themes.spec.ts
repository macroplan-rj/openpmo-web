import { DEFAULT_THEME_NAME, resolveTheme } from './themes';

/**
 * US-005 / SA-673 — ícone por natureza da ocorrência, definido pelo tema.
 *
 * O caso que mais importa aqui é o do tema `es`: ele é usado por outros clientes e NÃO
 * pode mudar de aparência. Um teste que só verificasse o `pb` deixaria passar exatamente
 * a regressão mais cara.
 */
describe('themes — ícone por natureza da ocorrência', () => {

  describe('tema es (padrão)', () => {

    it('usa o MESMO ícone para problema e benefício', () => {
      const { issueNatureIcons } = resolveTheme('es');

      expect(issueNatureIcons.PROBLEM).toEqual(issueNatureIcons.BENEFIT);
    });

    it('mantém o ícone histórico da fonte própria', () => {
      const { issueNatureIcons } = resolveTheme('es');

      expect(issueNatureIcons.PROBLEM.family).toBe('app-icon');
      expect(issueNatureIcons.PROBLEM.className).toBe('Issue');
    });
  });

  describe('tema pb', () => {

    it('distingue problema de benefício', () => {
      const { issueNatureIcons } = resolveTheme('pb');

      expect(issueNatureIcons.PROBLEM).not.toEqual(issueNatureIcons.BENEFIT);
    });

    it('usa rosto triste para problema e feliz para benefício, conforme o mockup', () => {
      const { issueNatureIcons } = resolveTheme('pb');

      expect(issueNatureIcons.PROBLEM.className).toContain('fa-frown');
      expect(issueNatureIcons.BENEFIT.className).toContain('fa-smile');
    });

    it('declara a família FontAwesome, porque a fonte própria não tem esses glifos', () => {
      const { issueNatureIcons } = resolveTheme('pb');

      expect(issueNatureIcons.PROBLEM.family).toBe('fontawesome');
      expect(issueNatureIcons.BENEFIT.family).toBe('fontawesome');
    });
  });

  describe('resolução do tema', () => {

    it('tema desconhecido cai no padrão sem quebrar', () => {
      const desconhecido = resolveTheme('tema-que-nao-existe');

      expect(desconhecido.name).toBe(DEFAULT_THEME_NAME);
      expect(desconhecido.issueNatureIcons).toBeDefined();
    });

    it('nome ausente ou vazio também cai no padrão', () => {
      expect(resolveTheme().name).toBe(DEFAULT_THEME_NAME);
      expect(resolveTheme('   ').name).toBe(DEFAULT_THEME_NAME);
    });

    it('todo tema declara ícone para as duas naturezas', () => {
      ['es', 'pb'].forEach(nome => {
        const { issueNatureIcons } = resolveTheme(nome);

        expect(issueNatureIcons.PROBLEM.className).toBeTruthy();
        expect(issueNatureIcons.BENEFIT.className).toBeTruthy();
      });
    });
  });
});
