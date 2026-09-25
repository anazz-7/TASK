import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { useTasks } from '../../context/TaskContext';
import { useToast } from '../../context/ToastContext';
import { getConfig, resetSupabase } from '../../lib/supabase';
import { getSyncDiagnostics } from '../../sync/syncDiagnostics';
import { Settings, Database, RotateCw, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function SettingsTab() {
  const { session, isOwner } = useAuth();
  const { cache, loadData } = useCache();
  const { syncNow, isSyncing } = useTasks();
  const { showToast } = useToast();

  const currentCfg = getConfig() || { url: '', key: '' };
  const [url, setUrl] = useState(currentCfg.url);
  const [key, setKey] = useState(currentCfg.key);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  const diag = getSyncDiagnostics(session?.businessId, cache.tasks);

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !key.trim()) return;

    resetSupabase(url.trim(), key.trim());
    showToast('Supabase configuration updated & saved', 'success');
    loadData();
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const client = resetSupabase(url.trim(), key.trim());
      const { data, error } = await client.from('businesses').select('id').limit(1);
      if (error) {
        setTestResult('failed');
        showToast('Connection failed: ' + error.message, 'error');
      } else {
        setTestResult('success');
        showToast('Connection successful!', 'success');
      }
    } catch (e: any) {
      setTestResult('failed');
      showToast('Connection error: ' + (e?.message || String(e)), 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearOfflineQueue = () => {
    if (!session?.businessId) return;
    localStorage.removeItem('br_task_mutation_queue_' + session.businessId);
    showToast('Offline mutation queue reset', 'info');
  };

  return (
    <div className="tab-settings" style={{ animation: 'fadeIn 0.2s ease' }}>
      <div className="section-label">System & Cloud Configuration</div>

      {/* Supabase Config */}
      <div className="row-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Database size={18} color="var(--turmeric)" />
          <b style={{ fontSize: '0.9rem' }}>Supabase Cloud Database Settings</b>
        </div>

        <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label>Supabase Project URL</label>
            <input
              type="url"
              required
              disabled={!isOwner()}
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://your-ref.supabase.co"
            />
          </div>

          <div>
            <label>Supabase Anon / Public Key</label>
            <input
              type="text"
              required
              disabled={!isOwner()}
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="sb_publishable_..."
            />
          </div>

          {isOwner() && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                disabled={isTesting}
                onClick={handleTestConnection}
                className="stamp-btn ghost"
                style={{ padding: '8px 16px' }}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>
              <button type="submit" className="stamp-btn" style={{ padding: '8px 18px' }}>
                Save Settings
              </button>
            </div>
          )}

          {testResult === 'success' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--leaf)', fontSize: '0.78rem', marginTop: '4px' }}>
              <CheckCircle2 size={16} />
              <b>Connected to Supabase successfully</b>
            </div>
          )}
        </form>
      </div>

      {/* Sync Telemetry */}
      <div className="section-label">Real-time Sync Diagnostics</div>
      <div className="row-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--ink-soft)' }}>NETWORK STATE</span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: diag.isOnline ? 'var(--leaf)' : 'var(--brick)' }}>
              {diag.isOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--ink-soft)' }}>QUEUED MUTATIONS</span>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{diag.totalQueuedMutations}</div>
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--ink-soft)' }}>FAILED MUTATIONS</span>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: diag.failedMutationsCount ? 'var(--brick)' : 'inherit' }}>
              {diag.failedMutationsCount}
            </div>
          </div>
          <div>
            <span style={{ fontSize: '0.68rem', color: 'var(--ink-soft)' }}>TOMBSTONES REGISTERED</span>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{diag.tombstonesCount}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={syncNow}
            disabled={isSyncing}
            className="stamp-btn"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RotateCw size={15} className={isSyncing ? 'spin-anim' : ''} />
            <span>Force Re-sync</span>
          </button>
          {isOwner() && (
            <button
              type="button"
              onClick={handleClearOfflineQueue}
              className="stamp-btn ghost"
              style={{ color: 'var(--brick)', borderColor: 'var(--brick)' }}
            >
              Clear Offline Queue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
