import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Session, Staff, Business, TabKey } from '../types';

export interface TabMetaItem {
  icon: string;
  label: string;
}

export const TAB_META: Record<TabKey, TabMetaItem> = {
  dashboard: { icon: 'dashboard', label: 'Dashboard' },
  tasks: { icon: 'tasks', label: 'Tasks' },
  accounts: { icon: 'accounts', label: 'Accounts' },
  sales: { icon: 'sales', label: 'Sales' },
  attendance: { icon: 'attendance', label: 'Attendance' },
  daily: { icon: 'daily', label: 'Daily' },
  weekly: { icon: 'weekly', label: 'Weekly' },
  stockkeeper: { icon: 'stockkeeper', label: 'Stockkeeper' },
  salary: { icon: 'salary', label: 'Salary' },
  staff: { icon: 'staff', label: 'Staff' },
  pricelist: { icon: 'pricelist', label: 'Price List' },
  projects: { icon: 'projects', label: 'Projects' },
  audit: { icon: 'audit', label: 'Audit Log' },
  settings: { icon: 'settings', label: 'Settings' }
};

export interface AuthContextType {
  session: Session | null;
  login: (staffMember: Staff, business: Business) => void;
  logout: () => void;
  switchBusiness: (business: Business) => void;
  isOwner: () => boolean;
  isManager: () => boolean;
  isManagerPlus: () => boolean;
  isSales: () => boolean;
  currentTabs: () => TabKey[];
  quickTabs: () => TabKey[];
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('br_session') || 'null');
    } catch (e) {
      return null;
    }
  });

  const isOwner = () => session?.role === 'owner';
  const isManager = () => session?.role === 'manager';
  const isManagerPlus = () => session?.role === 'owner' || session?.role === 'manager';
  const isSales = () => session?.role === 'salesman';

  const currentTabs = (): TabKey[] => {
    if (!session) return ['tasks'];
    if (isSales()) return ['pricelist', 'sales', 'tasks', 'accounts'];
    if (isManagerPlus()) {
      return isOwner()
        ? [
            'dashboard',
            'tasks',
            'accounts',
            'sales',
            'attendance',
            'daily',
            'weekly',
            'stockkeeper',
            'salary',
            'staff',
            'pricelist',
            'projects',
            'audit',
            'settings'
          ]
        : [
            'dashboard',
            'tasks',
            'accounts',
            'sales',
            'attendance',
            'daily',
            'weekly',
            'stockkeeper',
            'salary',
            'pricelist',
            'projects',
            'audit'
          ];
    }
    return ['tasks', 'accounts', 'daily', 'weekly', 'attendance', 'sales', 'pricelist', 'stockkeeper'];
  };

  const quickTabs = (): TabKey[] => {
    if (!session) return ['tasks'];
    if (isSales()) return ['pricelist', 'sales', 'tasks', 'accounts'];
    if (isOwner()) return ['dashboard', 'tasks', 'accounts', 'sales'];
    if (isManagerPlus()) return ['dashboard', 'tasks', 'accounts', 'sales'];
    return ['tasks', 'accounts', 'daily', 'sales'];
  };

  const login = (staffMember: Staff, business: Business) => {
    const sess: Session = {
      staffId: staffMember.id,
      name: staffMember.name,
      role: staffMember.role,
      businessId: business.id,
      businessName: business.name
    };
    localStorage.setItem('br_session', JSON.stringify(sess));
    setSession(sess);
  };

  const logout = () => {
    localStorage.removeItem('br_session');
    setSession(null);
  };

  const switchBusiness = (business: Business) => {
    if (!session) return;
    const updated: Session = {
      ...session,
      businessId: business.id,
      businessName: business.name
    };
    localStorage.setItem('br_session', JSON.stringify(updated));
    setSession(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        login,
        logout,
        switchBusiness,
        isOwner,
        isManager,
        isManagerPlus,
        isSales,
        currentTabs,
        quickTabs
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
