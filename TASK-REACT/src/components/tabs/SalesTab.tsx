import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { useToast } from '../../context/ToastContext';
import { todayStr, currentMonthStr, fmtCurrency } from '../../utils/dateUtils';
import { getSupabase } from '../../lib/supabase';
import { exportToExcel } from '../../utils/excelExport';
import { Modal } from '../common/Modal';
import { SaleRecord } from '../../types';
import { Plus, Trophy, Download, Trash2, Calendar, User } from 'lucide-react';

export function SalesTab() {
  const { session, isManagerPlus, isOwner } = useAuth();
  const { cache, updateCacheItem } = useCache();
  const { showToast } = useToast();

  const curMonth = currentMonthStr();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);

  // New sale state
  const [saleForm, setSaleForm] = useState({
    staff_id: session?.staffId || '',
    order_value: '',
    date: todayStr(),
    notes: ''
  });

  // Target inputs
  const [targetInputs, setTargetInputs] = useState<Record<string, number>>({});

  const handleOpenAdd = () => {
    setSaleForm({
      staff_id: session?.staffId || '',
      order_value: '',
      date: todayStr(),
      notes: ''
    });
    setIsAddModalOpen(true);
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !session.businessId) return;

    const val = parseFloat(saleForm.order_value) || 0;
    if (val <= 0) {
      showToast('Please enter a valid order value', 'error');
      return;
    }

    const newSale: SaleRecord = {
      id: 'loc_sale_' + Date.now(),
      business_id: session.businessId,
      staff_id: saleForm.staff_id || session.staffId,
      date: saleForm.date,
      order_value: val,
      notes: saleForm.notes.trim() || null
    };

    // Local optimistic update
    const updated = [newSale, ...cache.sales];
    updateCacheItem('sales', updated);
    setIsAddModalOpen(false);
    showToast(`✓ Order of ${fmtCurrency(val)} recorded!`, 'success');

    // Cloud insert
    const sb = getSupabase();
    if (sb && navigator.onLine) {
      try {
        const payload = { ...newSale };
        delete (payload as any).id;
        const { data, error } = await sb.from('sales').insert(payload).select().single();
        if (data && !error) {
          updateCacheItem(
            'sales',
            cache.sales.map(s => (s.id === newSale.id ? data : s))
          );
        }
      } catch (err) {
        console.warn('Sale sync error:', err);
      }
    }
  };

  const handleDeleteSale = async (id: string) => {
    updateCacheItem('sales', cache.sales.filter(s => s.id !== id));
    setDeleteSaleId(null);
    showToast('Sale deleted', 'info');

    const sb = getSupabase();
    if (sb && navigator.onLine && !id.startsWith('loc_sale_')) {
      try {
        await sb.from('sales').delete().eq('id', id);
      } catch (e) {}
    }
  };

  const handleSaveTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !session.businessId) return;
    const sb = getSupabase();
    const bizId = session.businessId;

    const updatedTargets = [...cache.salesTargets];
    for (const staff of cache.staff) {
      const val = targetInputs[staff.id] !== undefined ? targetInputs[staff.id] : 0;
      const existingIdx = updatedTargets.findIndex(t => t.staff_id === staff.id && t.month === curMonth);
      if (existingIdx >= 0) {
        updatedTargets[existingIdx] = { ...updatedTargets[existingIdx], target_amount: val };
      } else {
        updatedTargets.push({ business_id: bizId, staff_id: staff.id, month: curMonth, target_amount: val });
      }

      if (sb && navigator.onLine) {
        try {
          await sb.from('sales_targets').upsert(
            { business_id: bizId, staff_id: staff.id, month: curMonth, target_amount: val },
            { onConflict: 'staff_id,month' }
          );
        } catch (e) {}
      }
    }

    updateCacheItem('salesTargets', updatedTargets);
    setIsTargetModalOpen(false);
    showToast('Sales targets saved for ' + curMonth, 'success');
  };

  const handleExport = () => {
    const exportData = cache.sales.map(s => {
      const staffObj = cache.staff.find(x => x.id === s.staff_id);
      return {
        Date: s.date,
        Staff: staffObj ? staffObj.name : 'Unknown',
        'Order Value (₹)': s.order_value,
        Notes: s.notes || ''
      };
    });
    exportToExcel(exportData, 'Sales_Orders');
    showToast('Exported sales to Excel', 'success');
  };

  // Group sales by date
  const userSales = isManagerPlus() ? cache.sales : cache.sales.filter(s => s.staff_id === session?.staffId);
  const byDate: Record<string, SaleRecord[]> = {};
  userSales.forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = [];
    byDate[s.date].push(s);
  });
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="tab-sales" style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Sales Targets Card */}
      {isManagerPlus() && (
        <div
          className="row-card"
          style={{ flexDirection: 'column', alignItems: 'stretch', padding: '16px', marginBottom: '16px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={18} color="var(--turmeric)" />
              <b style={{ fontSize: '0.9rem' }}>Sales Targets — {curMonth}</b>
            </div>
            {isOwner() && (
              <button
                type="button"
                onClick={() => {
                  const init: Record<string, number> = {};
                  cache.staff.forEach(s => {
                    const t = cache.salesTargets.find(x => x.staff_id === s.id && x.month === curMonth);
                    init[s.id] = t ? t.target_amount : 0;
                  });
                  setTargetInputs(init);
                  setIsTargetModalOpen(true);
                }}
                className="stamp-btn ghost"
                style={{ padding: '4px 10px', fontSize: '0.72rem' }}
              >
                Set Targets
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cache.staff.map(st => {
              const targetObj = cache.salesTargets.find(t => t.staff_id === st.id && t.month === curMonth);
              if (!targetObj || !targetObj.target_amount) return null;

              const staffSales = cache.sales
                .filter(x => x.staff_id === st.id && x.date && x.date.startsWith(curMonth))
                .reduce((sum, x) => sum + Number(x.order_value || 0), 0);

              const pct = Math.min(100, Math.round((staffSales / targetObj.target_amount) * 100));

              return (
                <div key={st.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                    <b>{st.name}</b>
                    <span>
                      {fmtCurrency(staffSales)} / {fmtCurrency(targetObj.target_amount)} ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--paper-line)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: pct >= 100 ? 'var(--leaf)' : 'var(--turmeric)',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Header and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div className="section-label" style={{ margin: 0 }}>
          Orders Log ({userSales.length})
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleExport}
            className="stamp-btn ghost"
            style={{ padding: '6px 12px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} />
            <span>Export</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="stamp-btn"
            style={{ padding: '6px 14px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Record Order</span>
          </button>
        </div>
      </div>

      {/* Orders List Grouped by Date */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {sortedDates.map(dateStr => {
          const list = byDate[dateStr];
          const dayTotal = list.reduce((sum, e) => sum + Number(e.order_value || 0), 0);

          return (
            <div key={dateStr} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 4px',
                  borderBottom: '1px solid var(--paper-line)',
                  fontSize: '0.78rem',
                  fontWeight: 700
                }}
              >
                <span>{dateStr}</span>
                <span style={{ color: 'var(--leaf)' }}>{fmtCurrency(dayTotal)}</span>
              </div>

              {list.map(sale => {
                const staffObj = cache.staff.find(s => s.id === sale.staff_id);
                return (
                  <div
                    key={sale.id}
                    className="row-card"
                    style={{ alignItems: 'center', padding: '12px 14px' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} color="var(--turmeric)" />
                        <b style={{ fontSize: '0.88rem' }}>{staffObj ? staffObj.name : 'Unknown Staff'}</b>
                      </div>
                      {sale.notes && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', marginTop: '2px' }}>
                          {sale.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <b style={{ fontSize: '1rem', color: 'var(--ink)' }}>{fmtCurrency(sale.order_value)}</b>
                      {isOwner() && (
                        <button
                          type="button"
                          onClick={() => setDeleteSaleId(sale.id)}
                          className="icon-btn"
                          title="Delete sale"
                          style={{ color: 'var(--brick)' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {sortedDates.length === 0 && (
          <div className="empty" style={{ padding: '32px', textAlign: 'center', background: 'var(--card)', borderRadius: 'var(--radius-card)' }}>
            No sales logged yet. Tap Record Order to enter the first sale!
          </div>
        )}
      </div>

      {/* Record Order Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record Sales Order">
        <form onSubmit={handleCreateSale} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label>Order Value (₹) *</label>
            <input
              type="number"
              step="any"
              required
              autoFocus
              value={saleForm.order_value}
              onChange={e => setSaleForm(prev => ({ ...prev, order_value: e.target.value }))}
              placeholder="e.g. 4500"
              style={{ fontSize: '1.1rem', fontWeight: 700 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label>Staff Member</label>
              <select
                value={saleForm.staff_id}
                onChange={e => setSaleForm(prev => ({ ...prev, staff_id: e.target.value }))}
              >
                {cache.staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Date</label>
              <input
                type="date"
                value={saleForm.date}
                onChange={e => setSaleForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label>Order Notes / Customer</label>
            <input
              type="text"
              value={saleForm.notes}
              onChange={e => setSaleForm(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="e.g. Bill #1042 / Cash received"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="stamp-btn ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="stamp-btn">
              Save Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Target Setting Modal */}
      <Modal isOpen={isTargetModalOpen} onClose={() => setIsTargetModalOpen(false)} title={`Set Targets — ${curMonth}`}>
        <form onSubmit={handleSaveTargets} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cache.staff.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
              <label style={{ margin: 0, flex: 1 }}>{s.name}</label>
              <input
                type="number"
                step="any"
                value={targetInputs[s.id] || ''}
                onChange={e => setTargetInputs(prev => ({ ...prev, [s.id]: parseFloat(e.target.value) || 0 }))}
                placeholder="Target ₹"
                style={{ width: '130px', textAlign: 'right' }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="stamp-btn ghost" onClick={() => setIsTargetModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="stamp-btn">
              Save Targets
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Sale Confirmation Modal */}
      <Modal isOpen={deleteSaleId !== null} onClose={() => setDeleteSaleId(null)} title="Delete Sale Record">
        <p style={{ fontSize: '0.85rem' }}>Are you sure you want to delete this sales order?</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button type="button" className="stamp-btn ghost" onClick={() => setDeleteSaleId(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="stamp-btn"
            style={{ background: 'var(--brick)' }}
            onClick={() => deleteSaleId && handleDeleteSale(deleteSaleId)}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
