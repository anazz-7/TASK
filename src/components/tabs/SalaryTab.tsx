import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { useToast } from '../../context/ToastContext';
import { todayStr, fmtCurrency } from '../../utils/dateUtils';
import { getSupabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/excelExport';
import { Modal } from '../common/Modal';
import { SalaryRecord } from '../../types';
import { Plus, CreditCard, Download, Trash2, User } from 'lucide-react';

export function SalaryTab() {
  const { session, isOwner } = useAuth();
  const { cache, updateCacheItem } = useCache();
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: '',
    amount: '',
    paid_date: todayStr(),
    notes: ''
  });

  const handleOpenAdd = () => {
    setFormData({
      staff_id: cache.staff[0]?.id || '',
      amount: '',
      paid_date: todayStr(),
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !session.businessId) return;

    const amt = parseFloat(formData.amount) || 0;
    if (amt <= 0) {
      showToast('Please enter a valid salary amount', 'error');
      return;
    }

    const newRecord: SalaryRecord = {
      id: 'loc_sal_' + Date.now(),
      business_id: session.businessId,
      staff_id: formData.staff_id,
      amount: amt,
      paid_date: formData.paid_date,
      notes: formData.notes.trim() || null
    };

    updateCacheItem('salaries', [newRecord, ...cache.salaries]);
    setIsAddModalOpen(false);
    showToast(`✓ Salary payout of ${fmtCurrency(amt)} logged!`, 'success');

    const sb = getSupabase();
    if (sb && navigator.onLine) {
      try {
        const payload = { ...newRecord };
        delete (payload as any).id;
        const { data } = await sb.from('salaries').insert(payload).select().single();
        if (data) {
          updateCacheItem(
            'salaries',
            cache.salaries.map(s => (s.id === newRecord.id ? data : s))
          );
        }
      } catch (e) {}
    }
  };

  const handleDelete = async (id: string) => {
    updateCacheItem('salaries', cache.salaries.filter(s => s.id !== id));
    showToast('Salary record deleted', 'info');

    const sb = getSupabase();
    if (sb && navigator.onLine && !id.startsWith('loc_sal_')) {
      try {
        await sb.from('salaries').delete().eq('id', id);
      } catch (e) {}
    }
  };

  const handleExport = () => {
    const exportData = cache.salaries.map(s => {
      const staffObj = cache.staff.find(x => x.id === s.staff_id);
      return {
        Date: s.paid_date,
        Staff: staffObj ? staffObj.name : 'Unknown',
        'Amount (₹)': s.amount,
        Notes: s.notes || ''
      };
    });
    exportToExcel(exportData, 'Salary_Register');
    showToast('Exported salaries to Excel', 'success');
  };

  const totalPaid = cache.salaries.reduce((sum, s) => sum + Number(s.amount || 0), 0);

  return (
    <div className="tab-salary" style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Top Banner */}
      <div
        className="row-card"
        style={{
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, #0B132B 0%, #1E3A6E 100%)',
          color: '#FFF',
          borderRadius: 'var(--radius-card)'
        }}
      >
        <div>
          <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>TOTAL SALARY DISBURSED</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '2px' }}>
            {fmtCurrency(totalPaid)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleExport}
            className="stamp-btn ghost"
            style={{ color: '#FFF', borderColor: 'rgba(255,255,255,0.3)', padding: '6px 12px', fontSize: '0.72rem' }}
          >
            <Download size={14} />
            <span>Export</span>
          </button>
          {isOwner() && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="stamp-btn"
              style={{ padding: '6px 14px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={15} />
              <span>Record Payout</span>
            </button>
          )}
        </div>
      </div>

      {/* Payout History */}
      <div className="section-label">Salary Payouts Log ({cache.salaries.length})</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cache.salaries.map(sal => {
          const staffObj = cache.staff.find(s => s.id === sal.staff_id);

          return (
            <div
              key={sal.id}
              className="row-card"
              style={{ alignItems: 'center', padding: '12px 16px' }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <b style={{ fontSize: '0.9rem' }}>{staffObj ? staffObj.name : 'Unknown Staff'}</b>
                  <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>{sal.paid_date}</span>
                </div>
                {sal.notes && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', marginTop: '2px' }}>
                    {sal.notes}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <b style={{ fontSize: '1rem', color: 'var(--ink)' }}>{fmtCurrency(sal.amount)}</b>
                {isOwner() && (
                  <button
                    type="button"
                    onClick={() => handleDelete(sal.id)}
                    className="icon-btn"
                    style={{ color: 'var(--brick)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {cache.salaries.length === 0 && (
          <div className="empty" style={{ padding: '32px', textAlign: 'center', background: 'var(--card)', borderRadius: 'var(--radius-card)' }}>
            No salary records logged yet.
          </div>
        )}
      </div>

      {/* Record Salary Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record Salary Payout">
        <form onSubmit={handleSavePayout} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label>Staff Member *</label>
            <select
              value={formData.staff_id}
              onChange={e => setFormData(prev => ({ ...prev, staff_id: e.target.value }))}
            >
              {cache.staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label>Amount (₹) *</label>
              <input
                type="number"
                step="any"
                required
                autoFocus
                value={formData.amount}
                onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="e.g. 15000"
              />
            </div>
            <div>
              <label>Payment Date</label>
              <input
                type="date"
                value={formData.paid_date}
                onChange={e => setFormData(prev => ({ ...prev, paid_date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label>Notes / Voucher No.</label>
            <input
              type="text"
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Monthly salary transfer or advance"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="stamp-btn ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="stamp-btn">
              Save Payout
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
