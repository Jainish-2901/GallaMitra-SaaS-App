import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminProvider, useAdmin } from './context/AdminContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AdminLogin from './components/AdminLogin.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import './index.css';

function AdminApp() {
  const { isAuthenticated } = useAdmin();
  return isAuthenticated ? <AdminPanel /> : <AdminLogin />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AdminProvider>
      <ToastProvider>
        <AdminApp />
      </ToastProvider>
    </AdminProvider>
  </React.StrictMode>
);

// ⚠️ Only register SW in production — dev mode uses Vite HMR which SW would intercept
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('🚀 Admin PWA Service Worker registered:', reg.scope))
      .catch(err => console.error('🚨 Admin SW registration failed:', err));
  });
} else if ('serviceWorker' in navigator && !import.meta.env.PROD) {
  // In dev: unregister any leftover service workers so they don't interfere
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  });
}
