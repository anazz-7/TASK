import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CacheProvider, useCache } from './context/CacheContext';
import { TaskProvider } from './context/TaskContext';
import { ToastProvider } from './context/ToastContext';
import { TabKey } from './types';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { LoginScreen } from './components/auth/LoginScreen';

// Tab components
import { DashboardTab } from './components/tabs/DashboardTab';
import { TasksTab } from './components/tabs/TasksTab';
import { AccountsTab } from './components/tabs/AccountsTab';
import { SalesTab } from './components/tabs/SalesTab';
import { AttendanceTab } from './components/tabs/AttendanceTab';
import { DailyTab } from './components/tabs/DailyTab';
import { WeeklyTab } from './components/tabs/WeeklyTab';
import { StockkeeperTab } from './components/tabs/StockkeeperTab';
import { SalaryTab } from './components/tabs/SalaryTab';
import { StaffTab } from './components/tabs/StaffTab';
import { PricelistTab } from './components/tabs/PricelistTab';
import { ProjectsTab } from './components/tabs/ProjectsTab';
import { AuditTab } from './components/tabs/AuditTab';
import { SettingsTab } from './components/tabs/SettingsTab';

function AppContent() {
  const { session, currentTabs } = useAuth();
  const { isCompactView } = useCache();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');

  if (!session) {
    return <LoginScreen />;
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab
            onNavigateTab={tab => setActiveTab(tab)}
            onOpenNewTaskModal={() => setActiveTab('tasks')}
          />
        );
      case 'tasks':
        return <TasksTab />;
      case 'accounts':
        return <AccountsTab />;
      case 'sales':
        return <SalesTab />;
      case 'attendance':
        return <AttendanceTab />;
      case 'daily':
        return <DailyTab />;
      case 'weekly':
        return <WeeklyTab />;
      case 'stockkeeper':
        return <StockkeeperTab />;
      case 'salary':
        return <SalaryTab />;
      case 'staff':
        return <StaffTab />;
      case 'pricelist':
        return <PricelistTab />;
      case 'projects':
        return <ProjectsTab />;
      case 'audit':
        return <AuditTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <TasksTab />;
    }
  };

  return (
    <div className={`app-layout ${isCompactView ? 'compact-mode' : ''}`}>
      <Sidebar activeTab={activeTab} onTabSelect={tab => setActiveTab(tab)} />
      <div className="app-main">
        <Header />
        <main className="wrap">{renderActiveTab()}</main>
        <BottomNav activeTab={activeTab} onTabSelect={tab => setActiveTab(tab)} />
      </div>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <CacheProvider>
        <ToastProvider>
          <TaskProvider>
            <AppContent />
          </TaskProvider>
        </ToastProvider>
      </CacheProvider>
    </AuthProvider>
  );
}

export default App;
