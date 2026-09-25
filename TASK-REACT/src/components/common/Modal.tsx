import React, { useEffect, ReactNode } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, actions, maxWidth = '480px' }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth, width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        <div
          className="modal-head"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '12px',
            borderBottom: '1px solid var(--paper-line)'
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: 700
            }}
          >
            {title}
          </h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            style={{
              fontSize: '1.2rem',
              padding: '4px 8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--ink-soft)'
            }}
          >
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', padding: '16px 0', flex: 1 }}>
          {children}
        </div>
        {actions && (
          <div
            className="modal-actions"
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'flex-end',
              paddingTop: '12px',
              borderTop: '1px solid var(--paper-line)',
              marginTop: '8px'
            }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
