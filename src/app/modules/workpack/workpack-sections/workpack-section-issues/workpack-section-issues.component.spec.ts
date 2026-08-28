import { resolveTheme } from 'src/app/shared/themes/themes';

/**
 * US-005 / SA-673 — ícone da ocorrência por natureza e tema.
 *
 * Exercita a mesma regra que `resolveIssueIcon` aplica no componente, sem montar o
 * TestBed: a seção de ocorrências arrasta muitos serviços, e o que precisa ser garantido
 * aqui é a decisão do ícone, não a renderização da tela.
 *
 * O caso do tema `es` é o mais importante: ele é usado por outros clientes e não pode
 * mudar de aparência.
 */
describe('workpack-section-issues — ícone por natureza', () => {

  /** Espelha resolveIssueIcon() do componente. Sem fallback, de propósito. */
  const resolverIcone = (temaNome: string, nature: string) => {
    const escolhido = resolveTheme(temaNome).issueNatureIcons[nature];
    if (!escolhido) {
      return { icon: null, iconSvg: false };
    }
    return { icon: escolhido.className, iconSvg: escolhido.family === 'app-icon' };
  };

  describe('tema es', () => {

    it('mantém o ícone histórico para as duas naturezas', () => {
      const problema = resolverIcone('es', 'PROBLEM');
      const beneficio = resolverIcone('es', 'BENEFIT');

      expect(problema).toEqual(beneficio);
      expect(problema.icon).toBe('Issue');
    });

    it('continua usando a fonte própria, com iconSvg verdadeiro', () => {
      expect(resolverIcone('es', 'PROBLEM').iconSvg).toBeTrue();
    });
  });

  describe('tema pb', () => {

    it('distingue benefício de problema', () => {
      const problema = resolverIcone('pb', 'PROBLEM');
      const beneficio = resolverIcone('pb', 'BENEFIT');

      expect(problema.icon).not.toBe(beneficio.icon);
      expect(problema.icon).toContain('fa-frown');
      expect(beneficio.icon).toContain('fa-smile');
    });

    it('marca iconSvg como falso para o FontAwesome renderizar', () => {
      // Com iconSvg true o card aplica a classe `app-icon`, e a regra
      // `[class*=" app-icon"] { font-family: 'icopmo' !important }` engoliria o glifo do
      // FontAwesome — o ícone sumiria sem erro nenhum.
      expect(resolverIcone('pb', 'PROBLEM').iconSvg).toBeFalse();
      expect(resolverIcone('pb', 'BENEFIT').iconSvg).toBeFalse();
    });
  });

  describe('robustez', () => {

    it('natureza desconhecida NÃO rende ícone, em vez de fingir que é problema', () => {
      // Regressão do bug que passou pelo deploy: com fallback para PROBLEM, a API não
      // mandando `nature` fazia todo card virar problema — ícone errado parecendo certo.
      const desconhecida = resolverIcone('pb', 'NATUREZA_QUE_NAO_EXISTE');

      expect(desconhecida.icon).toBeNull();
    });

    it('natureza ausente também não rende ícone', () => {
      expect(resolverIcone('pb', undefined).icon).toBeNull();
    });

    it('natureza nula não quebra e não rende ícone', () => {
      expect(() => resolverIcone('pb', null)).not.toThrow();
      expect(resolverIcone('pb', null).icon).toBeNull();
    });

    it('tema desconhecido cai no padrão e segue exibindo ícone', () => {
      const icone = resolverIcone('tema-inexistente', 'BENEFIT');

      expect(icone.icon).toBe('Issue');
    });
  });
});
