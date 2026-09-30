import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {loadThemeSettings, applyThemeToDOM} from './utils/theme';

// Apply saved theme, font family, and accent colors immediately before rendering
applyThemeToDOM(loadThemeSettings());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
