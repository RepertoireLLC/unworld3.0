import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { env } from './config/env';
import './index.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  rootElement.dataset.environment = env.mode;

  if (env.release) {
    rootElement.dataset.release = env.release;
  }
}

if (!rootElement) {
  throw new Error('Failed to find the root element for mounting the application.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
