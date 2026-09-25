import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { fmtCurrency } from '../../utils/dateUtils';
import { Search, Plus, Tag, ClipboardList } from 'lucide-react';
import { Modal } from '../common/Modal';

interface PriceItem {
  id: string;
  name: string;
  category: string;
  rate: number;
  unit: string;
}

const DEFAULT_ITEMS: PriceItem[] = [
  { id: '1', name: 'Cotton Box (Standard)', category: 'Packaging', rate: 120, unit: 'pcs' },
  { id: '2', name: 'Heavy Duty Tape (Brown)', category: 'Packaging', rate: 45, unit: 'roll' },
  { id: '3', name: 'Product Label Roll (1000 pcs)', category: 'Labels', rate: 350, unit: 'roll' },
  { id: '4', name: 'Shrink Wrap Film 500m', category: 'Packaging', rate: 480, unit: 'roll' },
  { id: '5', name: 'Barcoded Shipping Tags', category: 'Labels', rate: 85, unit: 'pkt' },
  { id: '6', name: 'Thermal Printing Ribbons', category: 'Labels', rate: 220, unit: 'pcs' }
];

export function PricelistTab() {
  const { isOwner } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<PriceItem[]>(() => {
    try {
      const stored = localStorage.getItem('br_price_items');
      return stored ? JSON.parse(stored) : DEFAULT_ITEMS;
    } catch (e) {
      return DEFAULT_ITEMS;
    }
  });

  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'General', rate: '', unit: 'pcs' });

  const filteredItems = items.filter(
    i =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim()) return;

    const created: PriceItem = {
      id: 'pi_' + Date.now(),
      name: newItem.name.trim(),
      category: newItem.category.trim() || 'General',
      rate: parseFloat(newItem.rate) || 0,
      unit: newItem.unit.trim() || 'pcs'
    };

    const next = [created, ...items];
    setItems(next);
    localStorage.setItem('br_price_items', JSON.stringify(next));
    setIsAddModalOpen(false);
    setNewItem({ name: '', category: 'General', rate: '', unit: 'pcs' });
    showToast(`Added ${created.name} to price list`, 'success');
  };

  return (
    <div className="tab-pricelist" style={{ animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <div className="section-label" style={{ margin: 0 }}>
            Price List & Catalogue ({filteredItems.length})
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
            Quick lookup for rates, packaging, and stock materials
          </div>
        </div>
        {isOwner() && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="stamp-btn"
            style={{ padding: '6px 14px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Add Item</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div
        className="row-card"
        style={{ alignItems: 'center', gap: '8px', padding: '10px 14px', marginBottom: '16px' }}
      >
        <Search size={16} color="var(--ink-soft)" />
        <input
          type="text"
          placeholder="Search items by name or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.82rem' }}
        />
      </div>

      {/* List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
        {filteredItems.map(item => (
          <div
            key={item.id}
            className="row-card"
            style={{ flexDirection: 'column', alignItems: 'stretch', padding: '14px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <b style={{ fontSize: '0.9rem' }}>{item.name}</b>
                <div style={{ fontSize: '0.68rem', color: 'var(--ink-soft)', marginTop: '2px' }}>
                  Category: {item.category}
                </div>
              </div>
              <span
                style={{
                  background: 'var(--blue-soft)',
                  color: 'var(--turmeric)',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  textTransform: 'uppercase'
                }}
              >
                per {item.unit}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--paper-line)', paddingTop: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>Standard Rate</span>
              <b style={{ fontSize: '1.1rem', color: 'var(--turmeric)' }}>{fmtCurrency(item.rate)}</b>
            </div>
          </div>
        ))}
      </div>

      {/* Add Item Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Price Item">
        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label>Item Name *</label>
            <input
              type="text"
              required
              autoFocus
              value={newItem.name}
              onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Standard 5-Ply Carton"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label>Rate (₹) *</label>
              <input
                type="number"
                step="any"
                required
                value={newItem.rate}
                onChange={e => setNewItem(prev => ({ ...prev, rate: e.target.value }))}
                placeholder="150"
              />
            </div>
            <div>
              <label>Unit</label>
              <input
                type="text"
                value={newItem.unit}
                onChange={e => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="pcs / kg / roll"
              />
            </div>
          </div>

          <div>
            <label>Category</label>
            <input
              type="text"
              value={newItem.category}
              onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))}
              placeholder="e.g. Packaging, Raw Material"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="stamp-btn ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="stamp-btn">
              Add to Price List
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
