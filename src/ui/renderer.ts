import type { AppState, AppActions, RenderFn } from '../types';
import { C } from '../constants';
import { renderTopBar } from './components/top-bar';
import { renderProgressBar } from './components/progress-bar';
import { renderToast } from './components/toast';
import { renderConnectScreen } from './screens/connect-screen';
import { renderSessionScreen } from './screens/session-screen';
import { renderDoneScreen } from './screens/done-screen';
import { renderTemplateScreen } from './screens/template-screen';

/** Create a DOM renderer bound to a container element. */
export function createDomRenderer(container: HTMLElement): RenderFn {
  return (state: AppState, actions: AppActions) => {
    const topBar = renderTopBar(state, actions, C);

    const showProgress = state.screen === 'session' || state.screen === 'done';
    const progressBar = showProgress ? renderProgressBar(state, C) : null;

    let screen: HTMLElement;
    switch (state.screen) {
      case 'connect':
        screen = renderConnectScreen(state, actions, C);
        break;
      case 'session':
        screen = renderSessionScreen(state, actions, C);
        break;
      case 'done':
        screen = renderDoneScreen(state, actions, C);
        break;
      case 'template':
        screen = renderTemplateScreen(state, actions, C);
        break;
    }

    const toast = state.toast ? renderToast(state.toast, C) : null;

    container.innerHTML = '';
    container.appendChild(topBar);
    if (progressBar) container.appendChild(progressBar);
    container.appendChild(screen);
    if (toast) container.appendChild(toast);
  };
}
