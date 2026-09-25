import React, { useState } from 'react';
import { useAuth, TAB_META } from '../../context/AuthContext';
import { useTasks } from '../../context/TaskContext';
import { TabKey } from '../../types';
import { Modal } from '../common/Modal';
import {
  LucideIcon,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  CalendarDays,
  Users,
  ShoppingBag,
  ClipboardList,
  CreditCard,
  Settings,
  Clipboard,
  Wallet,
  ShieldAlert,
  FolderKanban,
  MoreHorizontal
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  tasks: CheckSquare,
  accounts: Wallet,
  sales: ShoppingBag,
  attendance: Users,
  daily: Calendar,
  weekly: CalendarDays,
  stockkeeper: Clipboard,
  salary: CreditCard,
  staff: Users,
  pricelist: ClipboardList,
  projects: FolderKanban,
  audit: ShieldAlert,
  settings: Settings
};

export interface BottomNavProps {
  activeTab: TabKey;
  onTabSelect: (tab: TabKey) => void;
}

export function BottomNav({ activeTab, onTabSelect }: BottomNavProps) {
  const { quickTabs, currentTabs } = useAuth();
  const { activeTasks } = useTasks();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const quickTabList = quickTabs();
  const allTabs = currentTabs();
  const otherTabs = allTabs.filter(t => !quickTabList.includes(t));
  const activeCount = activeTasks.length;

  return (
    <>
      <nav
        className="mobile-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'var(--card)',
          borderTop: '1px solid var(--paper-line)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 900,
          boxShadow: '0 -2px 10px rgba(11, 19, 43, 0.06)'
        }}
      >
        {quickTabList.map(tabKey => {
          const meta = TAB_META[tabKey] || { label: tabKey, icon: tabKey };
          const Icon = ICON_MAP[meta.icon] || ICON_MAP[tabKey] || CheckSquare;
          const isActive = activeTab === tabKey;

          return (
            <button
              key={tabKey}
              type="button"
              onClick={() => onTabSelect(tabKey)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? 'var(--turmeric)' : 'var(--ink-soft)',
                padding: '4px 8px',
                position: 'relative'
              }}
            >
              <Icon size={20} />
              <span style={{ fontSize: '0.62rem', fontWeight: isActive ? 700 : 500 }}>
                {meta.label}
              </span>
              {tabKey === 'tasks' && activeCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '2px',
                    right: '12px',
                    background: 'var(--brick)',
                    color: '#FFF',
                    fontSize: '0.55rem',
                    borderRadius: '999px',
                    padding: '1px 5px',
                    fontWeight: 700
                  }}
                >
                  {activeCount}
                </span>
              )}
            </button>
          );
        })}

        {/* More Button */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: otherTabs.includes(activeTab) ? 'var(--turmeric)' : 'var(--ink-soft)',
            padding: '4px 8px'
          }}
        >
          <MoreHorizontal size={20} />
          <span style={{ fontSize: '0.62rem', fontWeight: otherTabs.includes(activeTab) ? 700 : 500 }}>
            More
          </span>
        </button>
      </nav>

      {/* More Tabs Modal / Sheet */}
      <Modal isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} title="All Modules">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {allTabs.map(tabKey => {
            const meta = TAB_META[tabKey] || { label: tabKey, icon: tabKey };
            const Icon = ICON_MAP[meta.icon] || ICON_MAP[tabKey] || CheckSquare;
            const isActive = activeTab === tabKey;

            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => {
                  onTabSelect(tabKey);
                  setIsMoreOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-button)',
                  border: isActive ? '2px solid var(--turmeric)' : '1px solid var(--paper-line)',
                  background: isActive ? 'var(--blue-soft)' : 'var(--card)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <div style={{ color: 'var(--turmeric)' }}>
                  <Icon size={18} />
                </div>
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
