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

  /** Espelha resolveIssueIcon() do componente. */
  const resolverIcone = (temaNome: string, nature: string) => {
    const icones = resolveTheme(temaNome).issueNatureIcons;
    const escolhido = icones[nature] || icones.PROBLEM;
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

    it('natureza desconhecida não quebra e cai em problema', () => {
      const desconhecida = resolverIcone('pb', 'NATUREZA_QUE_NAO_EXISTE');

      expect(desconhecida.icon).toBe(resolverIcone('pb', 'PROBLEM').icon);
    });

    it('natureza nula não quebra', () => {
      expect(() => resolverIcone('pb', null)).not.toThrow();
    });

    it('tema desconhecido cai no padrão e segue exibindo ícone', () => {
      const icone = resolverIcone('tema-inexistente', 'BENEFIT');

      expect(icone.icon).toBe('Issue');
    });
  });
});
