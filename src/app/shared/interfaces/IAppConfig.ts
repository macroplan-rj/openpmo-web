export interface IAppConfig {
  API: string;
  authProvider: string;
  authButtonIcon: string;
  authButtonText: {
    'en-US': string;
    'pt-BR': string;
  };
  theme?: string;
  /** Backend do portal SIPGR (troca do código ?handoff=). Sem ele, o login pelo portal fica desligado. */
  portalApi?: string;
}
