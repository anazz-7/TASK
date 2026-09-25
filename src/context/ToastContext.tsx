import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastItem {
  id: string;
  msg: string;
  type: ToastType;
}

export interface ToastContextType {
  showToast: (msg: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((msg: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, msg, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="toast-container"
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none'
        }}
      >
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast toast-${t.type}`}
            style={{
              background:
                t.type === 'error'
                  ? 'var(--brick, #DC2626)'
                  : t.type === 'success'
                  ? 'var(--leaf, #16A34A)'
                  : 'var(--ink, #0B132B)',
              color: '#FFFFFF',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              animation: 'fadeInUp 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              pointerEvents: 'auto'
            }}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
