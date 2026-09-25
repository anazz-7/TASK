import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { useTasks } from '../../context/TaskContext';
import { initials } from '../../utils/dateUtils';
import { Modal } from '../common/Modal';
import {
  RotateCw,
  Wifi,
  WifiOff,
  Building,
  Maximize2,
  Minimize2,
  LogOut,
  ChevronDown
} from 'lucide-react';

export function Header() {
  const { session, logout, switchBusiness, isOwner } = useAuth();
  const { cache, isCompactView, toggleCompactView } = useCache();
  const { isSyncing, syncNow } = useTasks();
  const [isBizModalOpen, setIsBizModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      <header className="top">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            className="business-selector-btn"
            onClick={() => setIsBizModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'var(--ink)'
            }}
          >
            <div
              className="avatar-circle"
              style={{
                width: '36px',
                height: '36px',
                background: 'var(--turmeric)',
                color: '#FFFFFF',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}
            >
              {initials(session?.businessName || 'TASK')}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  letterSpacing: '0.02em'
                }}
              >
                <span>{session?.businessName || 'BABM TASK'}</span>
                <ChevronDown size={14} style={{ opacity: 0.6 }} />
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--ink-soft)' }}>
                {session?.name} · <span style={{ textTransform: 'uppercase', color: 'var(--turmeric)' }}>{session?.role}</span>
              </div>
            </div>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Online/Offline indicator */}
          <span
            title={isOnline ? 'Online (Real-time active)' : 'Offline (Changes queued locally)'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '999px',
              fontSize: '0.65rem',
              fontWeight: 700,
              background: isOnline ? 'var(--leaf-soft)' : 'var(--brick-soft)',
              color: isOnline ? 'var(--leaf)' : 'var(--brick)'
            }}
          >
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="hide-on-mobile">{isOnline ? 'LIVE' : 'OFFLINE'}</span>
          </span>

          {/* Sync Button */}
          <button
            type="button"
            onClick={syncNow}
            disabled={isSyncing}
            className="icon-btn"
            title="Force Cloud Sync"
            style={{
              padding: '6px',
              background: 'var(--card)',
              border: '1px solid var(--paper-line)',
              borderRadius: 'var(--radius-button)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink)'
            }}
          >
            <RotateCw size={15} className={isSyncing ? 'spin-anim' : ''} />
          </button>

          {/* Compact toggle */}
          <button
            type="button"
            onClick={toggleCompactView}
            className="icon-btn hide-on-mobile"
            title={isCompactView ? 'Expanded View' : 'Compact View'}
            style={{
              padding: '6px',
              background: 'var(--card)',
              border: '1px solid var(--paper-line)',
              borderRadius: 'var(--radius-button)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--ink)'
            }}
          >
            {isCompactView ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
          </button>

          {/* Logout button */}
          <button
            type="button"
            onClick={logout}
            className="icon-btn"
            title="Sign Out"
            style={{
              padding: '6px',
              background: 'transparent',
              border: '1px solid var(--paper-line)',
              borderRadius: 'var(--radius-button)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brick)'
            }}
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* Switch Business Modal */}
      <Modal
        isOpen={isBizModalOpen}
        onClose={() => setIsBizModalOpen(false)}
        title="Select Business"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {cache.businesses.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                switchBusiness(b);
                setIsBizModalOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-button)',
                border: session?.businessId === b.id ? '2px solid var(--turmeric)' : '1px solid var(--paper-line)',
                background: session?.businessId === b.id ? 'var(--blue-soft)' : 'var(--card)',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <Building size={18} color="var(--turmeric)" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{b.name}</div>
                {session?.businessId === b.id && (
                  <div style={{ fontSize: '0.68rem', color: 'var(--turmeric)' }}>Currently active</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
