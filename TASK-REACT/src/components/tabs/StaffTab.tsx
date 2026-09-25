import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { useToast } from '../../context/ToastContext';
import { getSupabase } from '../../lib/supabase';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Staff, Role } from '../../types';
import { Plus, Users, Edit2, Trash2, Phone, Key, Shield } from 'lucide-react';

export function StaffTab() {
  const { session, isOwner } = useAuth();
  const { cache, updateCacheItem } = useCache();
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'staff' as Role,
    pin: '1234',
    salary_day: '1',
    salary_frequency: 'monthly' as 'daily' | 'weekly' | 'monthly'
  });

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      phone: '',
      role: 'staff',
      pin: '1234',
      salary_day: '1',
      salary_frequency: 'monthly'
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      phone: staff.phone || '',
      role: staff.role,
      pin: staff.pin,
      salary_day: String(staff.salary_day || 1),
      salary_frequency: staff.salary_frequency || 'monthly'
    });
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !session.businessId || !formData.name.trim()) return;

    const bizId = session.businessId;
    const sb = getSupabase();

    if (editingStaff) {
      const updatedStaff: Staff = {
        ...editingStaff,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        role: formData.role,
        pin: formData.pin.trim(),
        salary_day: parseInt(formData.salary_day, 10) || 1,
        salary_frequency: formData.salary_frequency
      };

      updateCacheItem(
        'staff',
        cache.staff.map(s => (s.id === editingStaff.id ? updatedStaff : s))
      );
      setEditingStaff(null);
      showToast('Staff profile updated', 'success');

      if (sb && navigator.onLine) {
        try {
          await sb.from('staff').update({
            name: updatedStaff.name,
            phone: updatedStaff.phone,
            role: updatedStaff.role,
            pin: updatedStaff.pin,
            salary_day: updatedStaff.salary_day,
            salary_frequency: updatedStaff.salary_frequency
          }).eq('id', updatedStaff.id);
        } catch (e) {}
      }
    } else {
      const newStaff: Staff = {
        id: 'loc_st_' + Date.now(),
        business_id: bizId,
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        role: formData.role,
        pin: formData.pin.trim(),
        salary_day: parseInt(formData.salary_day, 10) || 1,
        salary_frequency: formData.salary_frequency
      };

      updateCacheItem('staff', [...cache.staff, newStaff]);
      setIsAddModalOpen(false);
      showToast(`✓ Added staff member ${newStaff.name}`, 'success');

      if (sb && navigator.onLine) {
        try {
          const payload = { ...newStaff };
          delete (payload as any).id;
          const { data } = await sb.from('staff').insert(payload).select().single();
          if (data) {
            updateCacheItem(
              'staff',
              cache.staff.map(s => (s.id === newStaff.id ? data : s))
            );
          }
        } catch (e) {}
      }
    }
  };

  const handleDeleteStaff = async (id: string) => {
    updateCacheItem('staff', cache.staff.filter(s => s.id !== id));
    setDeleteConfirmId(null);
    showToast('Staff member removed', 'info');

    const sb = getSupabase();
    if (sb && navigator.onLine && !id.startsWith('loc_st_')) {
      try {
        await sb.from('staff').delete().eq('id', id);
      } catch (e) {}
    }
  };

  return (
    <div className="tab-staff" style={{ animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div className="section-label" style={{ margin: 0 }}>
            Staff Directory ({cache.staff.length})
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
            Manage staff members, roles, and PIN access
          </div>
        </div>
        {isOwner() && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="stamp-btn"
            style={{ padding: '6px 14px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Add Staff</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cache.staff.map(s => (
          <div
            key={s.id}
            className="row-card"
            style={{ alignItems: 'center', padding: '14px 16px' }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <b style={{ fontSize: '0.95rem' }}>{s.name}</b>
                <Badge variant={s.role === 'owner' ? 'urgent' : s.role === 'manager' ? 'high' : 'default'}>
                  {s.role}
                </Badge>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.72rem', color: 'var(--ink-soft)', marginTop: '4px', flexWrap: 'wrap' }}>
                {s.phone && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Phone size={12} />
                    {s.phone}
                  </span>
                )}
                {isOwner() && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Key size={12} />
                    PIN: {s.pin}
                  </span>
                )}
                <span>
                  Salary: Day {s.salary_day || 1} ({s.salary_frequency || 'monthly'})
                </span>
              </div>
            </div>

            {isOwner() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(s)}
                  className="icon-btn"
                  title="Edit staff member"
                >
                  <Edit2 size={15} />
                </button>
                {s.id !== session?.staffId && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(s.id)}
                    className="icon-btn"
                    title="Delete staff member"
                    style={{ color: 'var(--brick)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add / Edit Staff Modal */}
      <Modal
        isOpen={isAddModalOpen || editingStaff !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingStaff(null);
        }}
        title={editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
      >
        <form onSubmit={handleSaveStaff} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label>Full Name *</label>
            <input
              type="text"
              required
              autoFocus
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Ramesh Kumar"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label>Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="10-digit mobile"
              />
            </div>
            <div>
              <label>Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as Role }))}
              >
                <option value="staff">Staff</option>
                <option value="salesman">Salesman</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label>Login PIN (4-digits)</label>
              <input
                type="text"
                required
                maxLength={6}
                value={formData.pin}
                onChange={e => setFormData(prev => ({ ...prev, pin: e.target.value }))}
                placeholder="1234"
              />
            </div>
            <div>
              <label>Salary Payout Day</label>
              <input
                type="number"
                min={1}
                max={31}
                value={formData.salary_day}
                onChange={e => setFormData(prev => ({ ...prev, salary_day: e.target.value }))}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              className="stamp-btn ghost"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingStaff(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="stamp-btn">
              {editingStaff ? 'Save Changes' : 'Add Staff'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={deleteConfirmId !== null} onClose={() => setDeleteConfirmId(null)} title="Delete Staff Member">
        <p style={{ fontSize: '0.85rem' }}>Are you sure you want to remove this staff member from the business?</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button type="button" className="stamp-btn ghost" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="stamp-btn"
            style={{ background: 'var(--brick)' }}
            onClick={() => deleteConfirmId && handleDeleteStaff(deleteConfirmId)}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
