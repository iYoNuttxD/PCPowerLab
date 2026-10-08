import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ComponentsProvider } from './hooks/useComponents.js';
import { BuildProvider } from './hooks/useBuildState.jsx';
import './styles/global.css';
import './styles/theme.css';
import './styles/arcade.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ComponentsProvider>
        <BuildProvider>
          <App />
        </BuildProvider>
      </ComponentsProvider>
    </BrowserRouter>
  </React.StrictMode>
);
