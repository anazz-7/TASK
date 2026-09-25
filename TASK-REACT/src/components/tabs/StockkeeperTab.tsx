import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { useToast } from '../../context/ToastContext';
import { todayStr } from '../../utils/dateUtils';
import { getSupabase } from '../../lib/supabase';
import { StockCheck } from '../../types';
import { Clipboard, Check, AlertCircle, Send, CheckCircle2 } from 'lucide-react';

const GODOWNS = ['Home', 'Underground', 'RMTC', 'Back'];

export function StockkeeperTab() {
  const { session } = useAuth();
  const { cache, updateCacheItem } = useCache();
  const { showToast } = useToast();

  const today = todayStr();
  const myTodayCheck = cache.stockChecks.find(
    c => c.staff_id === session?.staffId && c.date === today
  );

  const [stockChecked, setStockChecked] = useState<boolean>(
    myTodayCheck ? myTodayCheck.stock_checked : false
  );
  const [selectedGodowns, setSelectedGodowns] = useState<Set<string>>(() => {
    if (myTodayCheck?.checked_godowns) {
      return new Set(myTodayCheck.checked_godowns.split(',').map(s => s.trim()));
    }
    return new Set(['Home', 'Underground', 'RMTC', 'Back']);
  });
  const [allCorrect, setAllCorrect] = useState<boolean>(
    myTodayCheck ? myTodayCheck.all_correct ?? true : true
  );
  const [notes, setNotes] = useState<string>(myTodayCheck?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const toggleGodown = (g: string) => {
    setSelectedGodowns(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  };

  const handleSaveStockCheck = async () => {
    if (!session || !session.businessId) return;
    setIsSaving(true);

    const payload: StockCheck = {
      business_id: session.businessId,
      staff_id: session.staffId,
      date: today,
      stock_checked: stockChecked,
      all_correct: allCorrect,
      checked_godowns: Array.from(selectedGodowns).join(', '),
      notes: notes.trim()
    };

    // Update local cache
    const existingIndex = cache.stockChecks.findIndex(
      c => c.staff_id === session.staffId && c.date === today
    );
    let updatedList = [...cache.stockChecks];
    if (existingIndex >= 0) {
      updatedList[existingIndex] = { ...updatedList[existingIndex], ...payload };
    } else {
      updatedList = [payload, ...updatedList];
    }
    updateCacheItem('stockChecks', updatedList);
    showToast('✓ Stock check record saved!', 'success');

    // Cloud upsert
    const sb = getSupabase();
    if (sb && navigator.onLine) {
      try {
        await sb.from('stock_checks').upsert(payload, { onConflict: 'business_id,staff_id,date' });
      } catch (e) {
        console.warn('Stock check sync error:', e);
      }
    }
    setIsSaving(false);
  };

  const handleSendStockSms = () => {
    const godownsStr = Array.from(selectedGodowns).join(', ') || 'All';
    const statusStr = allCorrect ? 'ALL CORRECT' : 'ISSUE REPORTED';
    const msg = `Stock Check Alert: ${session?.name} (${session?.businessName}) on ${today}: [${godownsStr}]. Status: ${statusStr}. Notes: ${notes || 'Checked OK'}`;
    window.location.href = `sms:?body=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="tab-stockkeeper" style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Daily Check Card */}
      <div
        className="row-card"
        style={{ flexDirection: 'column', alignItems: 'stretch', padding: '16px', marginBottom: '20px' }}
      >
        <div className="section-label" style={{ margin: '0 0 12px' }}>
          Stockkeeper Check — {today}
        </div>

        <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
          Did you check godown physical stock today?
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            className={`attend-btn ${stockChecked ? 'present active' : ''}`}
            onClick={() => setStockChecked(true)}
            style={{ padding: '8px 16px', fontSize: '0.78rem' }}
          >
            Yes, Checked
          </button>
          <button
            type="button"
            className={`attend-btn ${!stockChecked ? 'absent active' : ''}`}
            onClick={() => setStockChecked(false)}
            style={{ padding: '8px 16px', fontSize: '0.78rem' }}
          >
            Not Yet
          </button>
        </div>

        {stockChecked && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                Godowns Checked Today:
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {GODOWNS.map(g => {
                  const isChecked = selectedGodowns.has(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGodown(g)}
                      className={`attend-btn ${isChecked ? 'present active' : ''}`}
                      style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                    >
                      {isChecked ? '✓ ' : ''}
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                Is stock quantity correct across all checked godowns?
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`attend-btn ${allCorrect ? 'present active' : ''}`}
                  onClick={() => setAllCorrect(true)}
                  style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                >
                  Yes, All Correct
                </button>
                <button
                  type="button"
                  className={`attend-btn ${!allCorrect ? 'absent active' : ''}`}
                  onClick={() => setAllCorrect(false)}
                  style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                >
                  No, Problem Found
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
                Stock Notes / Discrepancy Details
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Mention any missing quantities, broken items, or damaged cartons..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={handleSendStockSms}
                className="stamp-btn ghost"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Send size={14} />
                <span>SMS Alert</span>
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveStockCheck}
                className="stamp-btn"
                style={{ padding: '8px 18px' }}
              >
                {isSaving ? 'Saving...' : 'Save Stock Check'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      <div className="section-label">Stock Check History ({cache.stockChecks.length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cache.stockChecks.map((sc, i) => {
          const staffObj = cache.staff.find(s => s.id === sc.staff_id);
          const isOk = sc.all_correct !== false && sc.stock_checked;

          return (
            <div
              key={sc.id || i}
              className="row-card"
              style={{
                alignItems: 'center',
                padding: '12px 16px',
                borderLeft: isOk ? '4px solid var(--leaf)' : '4px solid var(--brick)'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <b style={{ fontSize: '0.9rem' }}>{sc.date}</b>
                  <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
                    {staffObj ? staffObj.name : 'Unknown Staff'}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', marginTop: '4px' }}>
                  Godowns: {sc.checked_godowns || 'All'}
                </div>
                {sc.notes && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--ink)', marginTop: '4px' }}>
                    {sc.notes}
                  </div>
                )}
              </div>

              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: isOk ? 'var(--leaf-soft)' : 'var(--brick-soft)',
                  color: isOk ? 'var(--leaf)' : 'var(--brick)'
                }}
              >
                {isOk ? 'All Correct' : 'Issue Reported'}
              </span>
            </div>
          );
        })}

        {cache.stockChecks.length === 0 && (
          <div className="empty" style={{ padding: '32px', textAlign: 'center', background: 'var(--card)', borderRadius: 'var(--radius-card)' }}>
            No stock checks recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
