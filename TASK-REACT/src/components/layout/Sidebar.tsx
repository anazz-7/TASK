import React from 'react';
import { useAuth, TAB_META } from '../../context/AuthContext';
import { useTasks } from '../../context/TaskContext';
import { initials } from '../../utils/dateUtils';
import { TabKey } from '../../types';
import {
  LucideIcon,
  LayoutDashboard,
  CheckSquare,
  Calendar,
  CalendarDays,
  Users,
  TrendingUp,
  ShoppingBag,
  ClipboardList,
  Package,
  Award,
  CreditCard,
  Settings,
  Clipboard,
  Wallet,
  ShieldAlert,
  FolderKanban
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
  package: Package,
  points: Award,
  projects: FolderKanban,
  audit: ShieldAlert,
  settings: Settings
};

export interface SidebarProps {
  activeTab: TabKey;
  onTabSelect: (tab: TabKey) => void;
}

export function Sidebar({ activeTab, onTabSelect }: SidebarProps) {
  const { session, currentTabs, logout } = useAuth();
  const { activeTasks } = useTasks();

  const tabs = currentTabs();
  const activeCount = activeTasks.length;

  return (
    <aside className="desktop-sidebar">
      <div className="sidebar-brand">
        <div className="avatar-circle" style={{ width: '40px', height: '40px' }}>
          {initials(session?.name || '')}
        </div>
        <div className="brand-info">
          <div className="brand-name">{session?.businessName || 'TASK APP'}</div>
          <div className="brand-role">
            {session?.name} • {session?.role}
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {tabs.map(tabKey => {
          const meta = TAB_META[tabKey] || { label: tabKey, icon: tabKey };
          const Icon = ICON_MAP[meta.icon] || ICON_MAP[tabKey] || CheckSquare;
          const isActive = activeTab === tabKey;

          return (
            <button
              key={tabKey}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onTabSelect(tabKey)}
            >
              <span className="nav-icon">
                <Icon size={18} />
              </span>
              <span className="nav-label">{meta.label}</span>
              {tabKey === 'tasks' && activeCount > 0 && (
                <span className="nav-badge">{activeCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="logout-btn"
          onClick={logout}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'transparent',
            border: '1px solid var(--paper-line)',
            borderRadius: 'var(--radius-button)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            color: 'var(--ink-soft)',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
