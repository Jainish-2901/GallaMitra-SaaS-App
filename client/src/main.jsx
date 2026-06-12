import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AppProvider } from './context/AppContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

import { BrowserRouter } from 'react-router-dom';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <AppProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AppProvider>
    </ToastProvider>
  </React.StrictMode>,
);

// ⚠️ Only register SW in production — dev mode uses Vite HMR which SW would intercept
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('🚀 GallaMitra PWA Service Worker registered successfully:', reg.scope))
      .catch(err => console.error('🚨 Service Worker registration failure:', err));
  });
} else if ('serviceWorker' in navigator && !import.meta.env.PROD) {
  // In dev: unregister any leftover service workers so they don't interfere
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  });
}