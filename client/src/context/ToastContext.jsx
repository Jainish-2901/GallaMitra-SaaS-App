import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Toast Context ─────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

// Toast type config for icons and colors
const TOAST_CONFIG = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
  },
  error: {
    icon: XCircle,
    iconColor: 'text-rose-600',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-600',
  },
};

// ─── Individual Toast Item ─────────────────────────────────────────────────────
function ToastItem({ toast, onDismiss }) {
  const cfg = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div className={`toast-item toast-${toast.type}`}>
      {/* Progress bar */}
      <div
        className="toast-progress"
        style={{
          animation: `toastProgress ${(toast.duration || 3500)}ms linear forwards`
        }}
      />

      <Icon size={18} className={`shrink-0 mt-0.5 ${cfg.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="toast-message-text">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="toast-close-btn"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Toast Provider ────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  // Convenience shortcuts
  toast.success = (msg, dur) => toast(msg, 'success', dur);
  toast.error   = (msg, dur) => toast(msg, 'error', dur);
  toast.warning = (msg, dur) => toast(msg, 'warning', dur);
  toast.info    = (msg, dur) => toast(msg, 'info', dur);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Container — top-right */}
      <div className="toast-container">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export default ToastContext;
