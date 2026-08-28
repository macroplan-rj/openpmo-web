import { ITheme, IThemeIcon } from '../interfaces/ITheme';

/** Ícone histórico da ocorrência: glifo `Issue` da fonte própria (icopmo.woff). */
const ICONE_OCORRENCIA_PADRAO: IThemeIcon = { family: 'app-icon', className: 'Issue' };

export const DEFAULT_THEME_NAME = 'es';

const ES_THEME: ITheme = {
  name: 'es',
  documentTitle: 'Open PMO',
  favicon: 'assets/svg/favicon.svg',
  loginLogo: {
    src: 'assets/images/logo-openpmo-horizontal.png',
    alt: 'Open PMO'
  },
  footerBrandLogos: [
    {
      src: 'assets/images/brasao_rodape.png',
      alt: 'Governo do Estado do Espírito Santo'
    }
  ],
  // As duas naturezas com o mesmo ícone, de propósito: preserva a aparência atual do
  // tema, que é usado por outros clientes.
  issueNatureIcons: {
    PROBLEM: ICONE_OCORRENCIA_PADRAO,
    BENEFIT: ICONE_OCORRENCIA_PADRAO
  }
};

const PB_THEME: ITheme = {
  name: 'pb',
  documentTitle: 'SIPGR',
  favicon: 'assets/themes/pb/favicon.png',
  loginLogo: {
    src: 'assets/images/logo-openpmo-horizontal.png',
    alt: 'Open PMO'
  },
  footerBrandLogos: [
    {
      src: 'assets/themes/pb/logo-governo-paraiba.png',
      alt: 'Governo do Estado da Paraíba',
      height: '36px'
    },
    {
      src: 'assets/themes/pb/logo-codata.png',
      alt: 'CODATA - Companhia de Processamento de Dados da Paraíba',
      height: '26px'
    }
  ],
  // Mockup aprovado (Dj1tzgpjUV6EbYVOehPVmP, artboard "16. Ocorrências", nó 245:2):
  // problema é rosto triste, benefício é rosto feliz. A fonte própria não tem esses
  // glifos; o FontAwesome, já carregado pelo angular.json, tem.
  issueNatureIcons: {
    PROBLEM: { family: 'fontawesome', className: 'far fa-frown' },
    BENEFIT: { family: 'fontawesome', className: 'far fa-smile' }
  }
};

const THEMES: { [name: string]: ITheme } = {
  [ES_THEME.name]: ES_THEME,
  [PB_THEME.name]: PB_THEME
};

export const resolveTheme = (name?: string): ITheme =>
  THEMES[(name || '').trim().toLowerCase()] || THEMES[DEFAULT_THEME_NAME];
