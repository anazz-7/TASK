import React, { useState } from 'react';
import { useCache } from '../../context/CacheContext';
import { ShieldAlert, Search, Clock, User } from 'lucide-react';

export function AuditTab() {
  const { cache } = useCache();
  const [filter, setFilter] = useState('');

  const logs = cache.auditLogs.filter(
    l =>
      (l.action_type || '').toLowerCase().includes(filter.toLowerCase()) ||
      (l.details || '').toLowerCase().includes(filter.toLowerCase()) ||
      (l.staff_name || '').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="tab-audit" style={{ animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <div className="section-label" style={{ margin: 0 }}>
            Security Audit Trail ({logs.length})
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
            System activity, edits, and staff operational logs
          </div>
        </div>
      </div>

      <div
        className="row-card"
        style={{ alignItems: 'center', gap: '8px', padding: '10px 14px', marginBottom: '16px' }}
      >
        <Search size={16} color="var(--ink-soft)" />
        <input
          type="text"
          placeholder="Filter audit logs by action, staff or details..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.82rem' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {logs.map((log, index) => (
          <div
            key={log.id || index}
            className="row-card"
            style={{ alignItems: 'center', padding: '12px 16px' }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'var(--blue-soft)',
                    color: 'var(--turmeric)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    textTransform: 'uppercase'
                  }}
                >
                  {log.action_type}
                </span>
                <b style={{ fontSize: '0.85rem' }}>{log.details}</b>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '4px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <User size={12} />
                  {log.staff_name || 'System User'} ({log.staff_role || 'staff'})
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} />
                  {new Date(log.timestamp).toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        ))}

        {logs.length === 0 && (
          <div className="empty" style={{ padding: '32px', textAlign: 'center', background: 'var(--card)', borderRadius: 'var(--radius-card)' }}>
            No audit events recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
