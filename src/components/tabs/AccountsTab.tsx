import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { useToast } from '../../context/ToastContext';
import { todayStr, fmtCurrency } from '../../utils/dateUtils';
import { getSupabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/excelExport';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { DailyAccount, AccountFieldMeta } from '../../types';
import {
  Save,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  Download,
  Share2,
  Calendar,
  MessageSquare
} from 'lucide-react';

const ACC_FIELDS: AccountFieldMeta[] = [
  { key: 'total_sales', label: 'Total Sales', hint: 'Gross sales of the day' },
  { key: 'amount', label: 'Cash in Hand', hint: 'Physical cash collected in drawer' },
  { key: 'vendors', label: 'Vendors Paid', hint: 'Cash paid out to vendors' },
  { key: 'credit', label: 'Credit Given', hint: 'New customer credit allowed today' },
  { key: 'credit_received', label: 'Credit Received (-)', hint: 'Old customer credit cash collected today (deducted)', isSubtract: true },
  { key: 'gpay', label: 'GPay / UPI', hint: 'Online UPI receipts' },
  { key: 'ba_credit', label: 'BA Credit', hint: 'Bank / BA credit entries' },
  { key: 'expenses', label: 'Shop Expenses', hint: 'Operational petty cash expenses' },
  { key: 'personal_ac', label: 'Personal A/C', hint: 'Transfers to personal account' },
  { key: 'salary_paid', label: 'Salary Paid', hint: 'Cash advances or salary paid' },
  { key: 'adjustment', label: 'Adjustment (±)', hint: 'Balancing adjustment or correction' }
];

export function AccountsTab() {
  const { session, isOwner } = useAuth();
  const { cache, updateCacheItem } = useCache();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [subTab, setSubTab] = useState<'entry' | 'history'>('entry');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Field values
  const [values, setValues] = useState<Record<string, number>>({
    total_sales: 0,
    amount: 0,
    vendors: 0,
    credit: 0,
    credit_received: 0,
    gpay: 0,
    ba_credit: 0,
    expenses: 0,
    personal_ac: 0,
    salary_paid: 0,
    adjustment: 0
  });
  const [notes, setNotes] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing account when date changes
  useEffect(() => {
    const existing = cache.dailyAccounts.find(a => a.date === selectedDate);
    if (existing) {
      setValues({
        total_sales: Number(existing.total_sales || 0),
        amount: Number(existing.amount || 0),
        vendors: Number(existing.vendors || 0),
        credit: Number(existing.credit || 0),
        credit_received: Number(existing.credit_received || 0),
        gpay: Number(existing.gpay || 0),
        ba_credit: Number(existing.ba_credit || 0),
        expenses: Number(existing.expenses || 0),
        personal_ac: Number(existing.personal_ac || 0),
        salary_paid: Number(existing.salary_paid || 0),
        adjustment: Number(existing.adjustment || 0)
      });
      setNotes(existing.notes || '');
      setIsChecked(Boolean(existing.is_checked));
    } else {
      // Auto-pull sales for this date if present
      const daySales = cache.sales
        .filter(s => s.date === selectedDate)
        .reduce((sum, s) => sum + Number(s.order_value || 0), 0);

      setValues({
        total_sales: daySales,
        amount: 0,
        vendors: 0,
        credit: 0,
        credit_received: 0,
        gpay: 0,
        ba_credit: 0,
        expenses: 0,
        personal_ac: 0,
        salary_paid: 0,
        adjustment: 0
      });
      setNotes('');
      setIsChecked(false);
    }
  }, [selectedDate, cache.dailyAccounts, cache.sales]);

  const isPastDate = selectedDate < todayStr();
  const canEdit = isOwner() || !isPastDate || isUnlocked;

  // Compute Accounts Totals
  const totalSales = Number(values.total_sales || 0);
  const total =
    Number(values.amount || 0) +
    Number(values.vendors || 0) +
    Number(values.credit || 0) -
    Number(values.credit_received || 0) +
    Number(values.gpay || 0) +
    Number(values.ba_credit || 0) +
    Number(values.expenses || 0) +
    Number(values.personal_ac || 0) +
    Number(values.salary_paid || 0) +
    Number(values.adjustment || 0);

  const excess = total > totalSales ? total - totalSales : 0;
  const less = totalSales > total ? totalSales - total : 0;

  const handleFieldChange = (key: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setValues(prev => ({ ...prev, [key]: val }));
  };

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    const ownerStaff = cache.staff.find(s => s.role === 'owner');
    if (ownerStaff && pinInput === ownerStaff.pin) {
      setIsUnlocked(true);
      setIsPinModalOpen(false);
      setPinInput('');
      showToast('Unlocked past date editing', 'success');
    } else {
      showToast('Incorrect Owner PIN', 'error');
    }
  };

  const handleSaveAccounts = async () => {
    if (!session || !session.businessId) return;
    if (!canEdit) {
      showToast('Past date is locked. Unlock with Owner PIN.', 'warning');
      return;
    }

    setIsSaving(true);
    const bizId = session.businessId;

    const payload: DailyAccount = {
      business_id: bizId,
      date: selectedDate,
      total_sales: totalSales,
      amount: values.amount,
      vendors: values.vendors,
      credit: values.credit,
      credit_received: values.credit_received,
      gpay: values.gpay,
      ba_credit: values.ba_credit,
      expenses: values.expenses,
      personal_ac: values.personal_ac,
      salary_paid: values.salary_paid,
      adjustment: values.adjustment,
      total,
      excess,
      less,
      notes,
      is_checked: isChecked
    };

    // 1. Update local cache immediately
    const existingIndex = cache.dailyAccounts.findIndex(a => a.date === selectedDate);
    let updatedList = [...cache.dailyAccounts];
    if (existingIndex >= 0) {
      updatedList[existingIndex] = { ...updatedList[existingIndex], ...payload };
    } else {
      updatedList = [payload, ...updatedList];
    }
    updateCacheItem('dailyAccounts', updatedList);
    try {
      localStorage.setItem('br_daily_accounts_' + bizId, JSON.stringify(updatedList));
    } catch (e) {}

    showToast(`✓ Accounts saved for ${selectedDate}!`, 'success');

    // 2. Cloud upsert
    const sb = getSupabase();
    if (sb && navigator.onLine) {
      try {
        const { error } = await sb
          .from('daily_accounts')
          .upsert(payload, { onConflict: 'business_id,date' });
        if (error) {
          console.warn('Cloud accounts upsert error:', error);
        }
      } catch (err) {
        console.warn('Supabase sync accounts error:', err);
      }
    }
    setIsSaving(false);
  };

  const handleSendSms = () => {
    const statusText = excess > 0 ? `+₹${excess.toFixed(0)} Excess` : less > 0 ? `-₹${less.toFixed(0)} Less` : 'Balanced';
    const msg = `Accounts Register (${selectedDate}): Sales ₹${totalSales} | Cash ₹${values.amount} | GPay ₹${values.gpay} | Total ₹${total} [${statusText}] — ${session?.businessName}`;
    const url = `sms:?body=${encodeURIComponent(msg)}`;
    window.location.href = url;
  };

  const handleExportHistory = () => {
    const exportData = cache.dailyAccounts.map(a => ({
      Date: a.date,
      'Total Sales': a.total_sales,
      'Cash in Hand': a.amount,
      Vendors: a.vendors,
      Credit: a.credit,
      'Credit Received': a.credit_received,
      GPay: a.gpay,
      Expenses: a.expenses,
      'Calculated Total': a.total,
      'Excess / Less': a.excess > 0 ? `+${a.excess}` : a.less > 0 ? `-${a.less}` : '0',
      Checked: a.is_checked ? 'YES' : 'NO',
      Notes: a.notes || ''
    }));
    exportToExcel(exportData, 'Daily_Accounts_Register');
    showToast('Exported daily accounts to Excel', 'success');
  };

  return (
    <div className="tab-accounts" style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Sub-tabs & Date selector bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`attend-btn ${subTab === 'entry' ? 'present active' : ''}`}
            onClick={() => setSubTab('entry')}
            style={{ padding: '8px 16px', fontSize: '0.78rem' }}
          >
            Register Entry
          </button>
          <button
            type="button"
            className={`attend-btn ${subTab === 'history' ? 'present active' : ''}`}
            onClick={() => setSubTab('history')}
            style={{ padding: '8px 16px', fontSize: '0.78rem' }}
          >
            History ({cache.dailyAccounts.length})
          </button>
        </div>

        {subTab === 'entry' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--card)', padding: '6px 12px', borderRadius: 'var(--radius-button)', border: '1px solid var(--paper-line)' }}>
              <Calendar size={15} color="var(--turmeric)" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.78rem', fontWeight: 600 }}
              />
            </div>

            {isPastDate && !isOwner() && (
              <button
                type="button"
                onClick={() => setIsPinModalOpen(true)}
                className="stamp-btn ghost"
                style={{ padding: '6px 10px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                {canEdit ? <Unlock size={14} color="var(--leaf)" /> : <Lock size={14} color="var(--brick)" />}
                <span>{canEdit ? 'Unlocked' : 'Unlock Past'}</span>
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleExportHistory}
            className="stamp-btn ghost"
            style={{ padding: '6px 12px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} />
            <span>Export Register</span>
          </button>
        )}
      </div>

      {subTab === 'entry' ? (
        <>
          {/* Tally Card Summary */}
          <div
            className="row-card"
            style={{
              flexDirection: 'column',
              alignItems: 'stretch',
              padding: '16px',
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #0B132B 0%, #1E3A6E 100%)',
              color: '#FFFFFF',
              borderRadius: 'var(--radius-card)',
              boxShadow: '0 4px 16px rgba(11, 19, 43, 0.18)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Daily Tally Summary ({selectedDate})
                </span>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '2px' }}>
                  Total: {fmtCurrency(total)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Sales: {fmtCurrency(totalSales)}</span>
                <div style={{ marginTop: '4px' }}>
                  {excess > 0 ? (
                    <span style={{ background: 'var(--leaf)', color: '#FFF', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                      +{fmtCurrency(excess)} SURPLUS
                    </span>
                  ) : less > 0 ? (
                    <span style={{ background: 'var(--brick)', color: '#FFF', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                      -{fmtCurrency(less)} DEFICIT
                    </span>
                  ) : (
                    <span style={{ background: 'rgba(255,255,255,0.2)', color: '#FFF', padding: '4px 10px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                      BALANCED
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields Grid */}
          <div
            className="accounts-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
              marginBottom: '16px'
            }}
          >
            {ACC_FIELDS.map(f => (
              <div
                key={f.key}
                className="row-card"
                style={{ flexDirection: 'column', alignItems: 'stretch', padding: '12px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 700, margin: 0, color: f.isSubtract ? 'var(--brick)' : 'var(--ink)' }}>
                    {f.label}
                  </label>
                  <span style={{ fontSize: '0.65rem', color: 'var(--ink-soft)' }}>{f.hint}</span>
                </div>
                <input
                  type="number"
                  step="any"
                  disabled={!canEdit}
                  value={values[f.key] === 0 ? '' : values[f.key]}
                  onChange={e => handleFieldChange(f.key, e.target.value)}
                  placeholder="0"
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    borderRadius: 'var(--radius-input)',
                    border: '1px solid var(--paper-line)',
                    background: canEdit ? '#FFFFFF' : 'var(--paper)',
                    color: 'var(--ink)',
                    fontFamily: "'Roboto Mono', monospace"
                  }}
                />
              </div>
            ))}
          </div>

          {/* Notes and Checked Status */}
          <div className="row-card" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '14px', marginBottom: '16px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '6px' }}>
              Daily Notes & Breakdown Details
            </label>
            <textarea
              rows={3}
              disabled={!canEdit}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Cash in drawer breakdown, pending vendor adjustments..."
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-input)',
                border: '1px solid var(--paper-line)',
                fontSize: '0.8rem',
                color: 'var(--ink)'
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
              <input
                type="checkbox"
                id="accCheckedToggle"
                checked={isChecked}
                disabled={!canEdit}
                onChange={e => setIsChecked(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--turmeric)', cursor: 'pointer' }}
              />
              <label htmlFor="accCheckedToggle" style={{ fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', margin: 0 }}>
                Mark as Verified & Checked for {selectedDate}
              </label>
            </div>
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '24px' }}>
            <button
              type="button"
              onClick={handleSendSms}
              className="stamp-btn ghost"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <MessageSquare size={16} />
              <span>SMS Summary</span>
            </button>
            <button
              type="button"
              disabled={!canEdit || isSaving}
              onClick={handleSaveAccounts}
              className="stamp-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 20px' }}
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving...' : 'Save Accounts'}</span>
            </button>
          </div>
        </>
      ) : (
        /* History View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cache.dailyAccounts.map(acc => (
            <div
              key={acc.date}
              className="row-card"
              onClick={() => {
                setSelectedDate(acc.date);
                setSubTab('entry');
              }}
              style={{ cursor: 'pointer', padding: '14px', alignItems: 'center' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <b style={{ fontSize: '0.9rem' }}>{acc.date}</b>
                  {acc.is_checked && <Badge variant="leaf">CHECKED</Badge>}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', marginTop: '4px' }}>
                  Sales: {fmtCurrency(acc.total_sales)} · Cash: {fmtCurrency(acc.amount)} · GPay: {fmtCurrency(acc.gpay)}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <b style={{ fontSize: '0.95rem' }}>{fmtCurrency(acc.total)}</b>
                <div style={{ marginTop: '2px' }}>
                  {acc.excess > 0 ? (
                    <span style={{ color: 'var(--leaf)', fontSize: '0.72rem', fontWeight: 700 }}>
                      +{fmtCurrency(acc.excess)} Excess
                    </span>
                  ) : acc.less > 0 ? (
                    <span style={{ color: 'var(--brick)', fontSize: '0.72rem', fontWeight: 700 }}>
                      -{fmtCurrency(acc.less)} Less
                    </span>
                  ) : (
                    <span style={{ color: 'var(--ink-soft)', fontSize: '0.72rem' }}>Balanced</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {cache.dailyAccounts.length === 0 && (
            <div className="empty" style={{ padding: '32px', textAlign: 'center', background: 'var(--card)', borderRadius: 'var(--radius-card)' }}>
              No accounts registered yet. Select a date above to record the day's tally.
            </div>
          )}
        </div>
      )}

      {/* PIN Unlock Modal */}
      <Modal isOpen={isPinModalOpen} onClose={() => setIsPinModalOpen(false)} title="Owner PIN Verification">
        <form onSubmit={handleUnlockPin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--ink-soft)', margin: 0 }}>
            Editing past date records ({selectedDate}) is restricted. Enter the Owner PIN to unlock editing permissions.
          </p>
          <input
            type="password"
            maxLength={6}
            autoFocus
            required
            value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            placeholder="Enter Owner PIN..."
            style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '0.2em' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" className="stamp-btn ghost" onClick={() => setIsPinModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="stamp-btn">
              Unlock
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
