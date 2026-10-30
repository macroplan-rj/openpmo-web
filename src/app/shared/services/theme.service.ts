import { Injectable, Injector } from '@angular/core';
import { ITheme } from '../interfaces/ITheme';
import { resolveTheme } from '../themes/themes';
import { APP_CONFIG } from '../tokens/AppConfigToken';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  readonly theme: ITheme;

  constructor(private injector: Injector) {
    const appConfig = this.injector.get(APP_CONFIG);
    this.theme = resolveTheme(appConfig.theme);
    // Regras visuais de um tema so ficam em styles.scss, sob html[data-theme='...']
    document.documentElement.setAttribute('data-theme', this.theme.name);
  }

}
