import './app/styles/variables.css';
import './app/styles/global.css';
import './app/styles/components.css';
import './app/styles/screens.css';

import { App } from './app/ui/App';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = '';
  const root = document.createElement('div');
  root.className = 'app-root';
  app.appendChild(root);

  const application = new App(root);
  application.start();
}
