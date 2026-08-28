export interface IThemeLogo {
  src: string;
  alt: string;
  height?: string;
}

/**
 * Família do ícone. O produto tem duas, e o tema precisa poder escolher entre elas:
 *  - `app-icon`: fonte própria (icopmo.woff), usada historicamente
 *  - `fontawesome`: FontAwesome 5, já carregado pelo angular.json
 *
 * O tema `es` fica na fonte própria para não mudar de aparência; o `pb` usa FontAwesome
 * porque a fonte própria não tem os rostos que o mockup pede, e regerá-la seria tarefa
 * de asset.
 */
export type ThemeIconFamily = 'app-icon' | 'fontawesome';

export interface IThemeIcon {
  family: ThemeIconFamily;
  /** Classe do glifo: nome na fonte própria, ou as classes do FontAwesome. */
  className: string;
}

/**
 * Ícone por natureza da ocorrência (US-005 / SA-673).
 *
 * No tema `es` as duas naturezas apontam para o mesmo ícone, preservando a aparência
 * atual — ele é usado por outros clientes. No `pb` elas se distinguem.
 */
export interface IThemeIssueNatureIcons {
  PROBLEM: IThemeIcon;
  BENEFIT: IThemeIcon;
}

export interface ITheme {
  name: string;
  documentTitle: string;
  favicon: string;
  loginLogo: IThemeLogo;
  footerBrandLogos: IThemeLogo[];
  issueNatureIcons: IThemeIssueNatureIcons;
}
