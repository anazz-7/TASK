import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getSupabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { deterministicTaskMerge } from '../sync/taskReconciliation';
import {
  Business,
  Staff,
  Task,
  AttendanceRecord,
  SaleRecord,
  Routine,
  RoutineLog,
  PointsLog,
  LabelRecord,
  WeeklyTask,
  WeeklyTaskLog,
  PackageRecord,
  SalaryRecord,
  SalesTarget,
  StockCheck,
  DailyAccount,
  ProjectItem,
  AuditLog,
  SalaryAdvance
} from '../types';

export interface CacheData {
  businesses: Business[];
  staff: Staff[];
  tasks: Task[];
  attendance: AttendanceRecord[];
  sales: SaleRecord[];
  routines: Routine[];
  routineLog: RoutineLog[];
  points: PointsLog[];
  labels: LabelRecord[];
  weeklyTasks: WeeklyTask[];
  weeklyTaskLog: WeeklyTaskLog[];
  packages: PackageRecord[];
  salaries: SalaryRecord[];
  salesTargets: SalesTarget[];
  stockChecks: StockCheck[];
  dailyAccounts: DailyAccount[];
  projects: ProjectItem[];
  auditLogs: AuditLog[];
  salaryAdvances: SalaryAdvance[];
}

export interface CacheContextType {
  cache: CacheData;
  setCache: React.Dispatch<React.SetStateAction<CacheData>>;
  updateCacheItem: <K extends keyof CacheData>(
    key: K,
    dataOrUpdater: CacheData[K] | ((prev: CacheData[K]) => CacheData[K])
  ) => void;
  loadData: () => Promise<void>;
  loading: boolean;
  lastRefreshed: Date | null;
  isCompactView: boolean;
  toggleCompactView: () => void;
}

const initialCache: CacheData = {
  businesses: [],
  staff: [],
  tasks: [],
  attendance: [],
  sales: [],
  routines: [],
  routineLog: [],
  points: [],
  labels: [],
  weeklyTasks: [],
  weeklyTaskLog: [],
  packages: [],
  salaries: [],
  salesTargets: [],
  stockChecks: [],
  dailyAccounts: [],
  projects: [],
  auditLogs: [],
  salaryAdvances: []
};

const CacheContext = createContext<CacheContextType | null>(null);

export function CacheProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [isCompactView, setIsCompactView] = useState<boolean>(() => {
    return localStorage.getItem('br_compact_view') === '1';
  });

  const [cache, setCache] = useState<CacheData>(initialCache);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const toggleCompactView = () => {
    setIsCompactView(prev => {
      const next = !prev;
      localStorage.setItem('br_compact_view', next ? '1' : '0');
      return next;
    });
  };

  const loadData = useCallback(async () => {
    if (!session || !session.businessId) return;
    const bizId = session.businessId;
    const sb = getSupabase();
    if (!sb) return;

    setLoading(true);
    try {
      // 1. Parallel Supabase Fetch
      const [
        staffR, tasksR, attR, salesR, routinesR, pointsR,
        labelsR, weeklyR, packagesR, salariesR, targetsR,
        stockR, auditR, bizR
      ] = await Promise.all([
        sb.from('staff').select('*').eq('business_id', bizId).order('name'),
        sb.from('tasks').select('*').eq('business_id', bizId).order('due_date', { ascending: true, nullsFirst: false }),
        sb.from('attendance').select('*').eq('business_id', bizId).order('date', { ascending: false }).limit(200),
        sb.from('sales').select('*').eq('business_id', bizId).order('date', { ascending: false }).limit(300),
        sb.from('routines').select('*').eq('business_id', bizId).order('title'),
        sb.from('points_log').select('*').eq('business_id', bizId).order('date', { ascending: false }).limit(200),
        sb.from('labels').select('*').eq('business_id', bizId).order('date', { ascending: false }).limit(100),
        sb.from('weekly_tasks').select('*').eq('business_id', bizId).order('title'),
        sb.from('packages').select('*').eq('business_id', bizId).order('date', { ascending: false }).limit(100),
        sb.from('salaries').select('*').eq('business_id', bizId).order('paid_date', { ascending: false }).limit(100),
        sb.from('sales_targets').select('*').eq('business_id', bizId),
        sb.from('stock_checks').select('*').eq('business_id', bizId).order('date', { ascending: false }).limit(100),
        sb.from('audit_logs').select('*').eq('business_id', bizId).order('timestamp', { ascending: false }).limit(200),
        sb.from('businesses').select('*').order('name')
      ]);

      const staff = (staffR.data as Staff[]) || [];
      const cloudTasks = (tasksR.data as Task[]) || [];

      // Local storage task merge
      let localTasks: Task[] = [];
      try {
        localTasks = JSON.parse(localStorage.getItem('br_tasks_' + bizId) || '[]');
      } catch (e) {}

      const mergedTasks = deterministicTaskMerge(localTasks, cloudTasks, bizId);
      try {
        localStorage.setItem('br_tasks_' + bizId, JSON.stringify(mergedTasks));
      } catch (e) {}

      // System payloads extraction from tasks
      let projects: ProjectItem[] = [];
      let salaryAdvances: SalaryAdvance[] = [];

      cloudTasks.filter(ct => ct.title && ct.title.startsWith('[')).forEach(ct => {
        try {
          if (ct.title === '[FUTURE_PROJECTS_DATA]' && ct.notes) {
            projects = JSON.parse(ct.notes);
            localStorage.setItem('br_projects_' + bizId, ct.notes);
          }
          if (ct.title === '[SALARY_ADVANCES_DATA]' && ct.notes) {
            salaryAdvances = JSON.parse(ct.notes);
            localStorage.setItem('br_advances_' + bizId, ct.notes);
          }
        } catch (e) {}
      });

      // Try fetching daily_accounts if table exists
      let dailyAccounts: DailyAccount[] = [];
      try {
        const accR = await sb.from('daily_accounts').select('*').eq('business_id', bizId).order('date', { ascending: false }).limit(200);
        if (accR.data) dailyAccounts = accR.data as DailyAccount[];
      } catch (e) {}

      setCache(prev => ({
        ...prev,
        businesses: (bizR.data as Business[]) || prev.businesses,
        staff,
        tasks: mergedTasks,
        attendance: (attR.data as AttendanceRecord[]) || [],
        sales: (salesR.data as SaleRecord[]) || [],
        routines: (routinesR.data as Routine[]) || [],
        points: (pointsR.data as PointsLog[]) || [],
        labels: (labelsR.data as LabelRecord[]) || [],
        weeklyTasks: (weeklyR.data as WeeklyTask[]) || [],
        packages: (packagesR.data as PackageRecord[]) || [],
        salaries: (salariesR.data as SalaryRecord[]) || [],
        salesTargets: (targetsR.data as SalesTarget[]) || [],
        stockChecks: (stockR.data as StockCheck[]) || [],
        auditLogs: (auditR.data as AuditLog[]) || [],
        dailyAccounts: dailyAccounts.length ? dailyAccounts : prev.dailyAccounts,
        projects: projects.length ? projects : prev.projects,
        salaryAdvances: salaryAdvances.length ? salaryAdvances : prev.salaryAdvances
      }));

      setLastRefreshed(new Date());
    } catch (err) {
      console.warn('[CACHE] loadData warning:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Initial load when session changes
  useEffect(() => {
    if (session && session.businessId) {
      const bizId = session.businessId;
      try {
        const localTasks = JSON.parse(localStorage.getItem('br_tasks_' + bizId) || '[]');
        const localStaff = JSON.parse(localStorage.getItem('br_staff_' + bizId) || '[]');
        const localAccounts = JSON.parse(localStorage.getItem('br_daily_accounts_' + bizId) || '[]');
        if (localTasks.length || localStaff.length || localAccounts.length) {
          setCache(prev => ({
            ...prev,
            tasks: localTasks.length ? localTasks : prev.tasks,
            staff: localStaff.length ? localStaff : prev.staff,
            dailyAccounts: localAccounts.length ? localAccounts : prev.dailyAccounts
          }));
        }
      } catch (e) {}

      loadData();
    }
  }, [session, loadData]);

  const updateCacheItem = <K extends keyof CacheData>(
    key: K,
    dataOrUpdater: CacheData[K] | ((prev: CacheData[K]) => CacheData[K])
  ) => {
    setCache(prev => {
      const nextVal = typeof dataOrUpdater === 'function' ? (dataOrUpdater as any)(prev[key]) : dataOrUpdater;
      return { ...prev, [key]: nextVal };
    });
  };

  return (
    <CacheContext.Provider
      value={{
        cache,
        setCache,
        updateCacheItem,
        loadData,
        loading,
        lastRefreshed,
        isCompactView,
        toggleCompactView
      }}
    >
      {children}
    </CacheContext.Provider>
  );
}

export function useCache(): CacheContextType {
  const ctx = useContext(CacheContext);
  if (!ctx) throw new Error('useCache must be used within CacheProvider');
  return ctx;
}
