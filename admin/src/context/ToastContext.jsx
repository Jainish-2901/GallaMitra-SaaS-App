import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error:   (msg, dur) => addToast(msg, 'error',   dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info:    (msg, dur) => addToast(msg, 'info',    dur),
  };

  const icons = {
    success: <CheckCircle size={16} className="shrink-0" />,
    error:   <XCircle    size={16} className="shrink-0" />,
    warning: <AlertTriangle size={16} className="shrink-0" />,
    info:    <Info       size={16} className="shrink-0" />,
  };

  const styles = {
    success: 'bg-emerald-600 text-white border-emerald-500',
    error:   'bg-rose-600   text-white border-rose-500',
    warning: 'bg-amber-500  text-white border-amber-400',
    info:    'bg-blue-600   text-white border-blue-500',
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast Stack */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
        style={{ minWidth: 280, maxWidth: 360 }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className={`
              pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-xl
              text-sm font-semibold backdrop-blur-sm
              ${styles[t.type] || styles.info}
              animate-slide-in
            `}
            style={{
              animation: 'toastSlideIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both'
            }}
          >
            {icons[t.type]}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => remove(t.id)}
              className="opacity-70 hover:opacity-100 transition-opacity shrink-0 mt-0.5"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(40px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0)    scale(1);    }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
