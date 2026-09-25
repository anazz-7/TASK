import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useCache } from './CacheContext';
import { queueMutation } from '../sync/mutationQueue';
import { syncTasks, startSyncPoller } from '../sync/syncManager';
import { recordTaskTombstone } from '../sync/taskReconciliation';
import { todayStr } from '../utils/dateUtils';
import { playDoneChime, vibrate } from '../lib/audio';
import { useToast } from './ToastContext';
import { Task, TaskFilter } from '../types';

export interface TaskContextType {
  tasks: Task[];
  activeTasks: Task[];
  historyTasks: Task[];
  taskFilter: TaskFilter;
  setTaskFilter: React.Dispatch<React.SetStateAction<TaskFilter>>;
  taskSubTab: 'active' | 'history';
  setTaskSubTab: (tab: 'active' | 'history') => void;
  expandedDoneIds: Set<string>;
  toggleDoneExpanded: (id: string) => void;
  createTask: (taskData: Partial<Task>) => Task | null;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  markTaskDone: (taskId: string, isDone: boolean) => void;
  syncNow: () => Promise<void>;
  isSyncing: boolean;
}

const TaskContext = createContext<TaskContextType | null>(null);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { session, isManagerPlus } = useAuth();
  const { cache, updateCacheItem } = useCache();
  const { showToast } = useToast();

  const [taskFilter, setTaskFilter] = useState<TaskFilter>({
    staffId: '',
    priority: '',
    search: ''
  });
  const [taskSubTab, setTaskSubTab] = useState<'active' | 'history'>('active');
  const [expandedDoneIds, setExpandedDoneIds] = useState<Set<string>>(new Set());
  const [isSyncing, setIsSyncing] = useState(false);

  const tasksRef = useRef<Task[]>(cache.tasks);
  tasksRef.current = cache.tasks;

  const handleTasksMerged = useCallback(
    (mergedTasks: Task[]) => {
      updateCacheItem('tasks', mergedTasks);
    },
    [updateCacheItem]
  );

  // Background Sync Poller (30s background, focus, online events)
  useEffect(() => {
    if (!session || !session.businessId) return;
    const bizId = session.businessId;

    const cleanup = startSyncPoller(bizId, () => tasksRef.current, handleTasksMerged);
    return cleanup;
  }, [session, handleTasksMerged]);

  // Local-First Task Creation
  const createTask = useCallback(
    (taskData: Partial<Task>): Task | null => {
      if (!session || !session.businessId) return null;
      const bizId = session.businessId;
      const nowIso = new Date().toISOString();
      const tempLocalId = 'loc_task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const clientTaskId = 'cltask_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);

      const newTask: Task = {
        id: tempLocalId,
        business_id: bizId,
        client_task_id: clientTaskId,
        assigned_to: taskData.assigned_to || session.staffId,
        created_by: session.staffId,
        title: taskData.title || 'Untitled Task',
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date || todayStr(),
        due_time: taskData.due_time || null,
        status: taskData.status || 'pending',
        notes: taskData.notes || '',
        project_id: taskData.project_id || null,
        created_at: nowIso,
        updated_at: nowIso,
        _sync_state: 'syncing'
      };

      // 1. Enqueue mutation
      queueMutation(bizId, {
        action: 'insert',
        local_id: tempLocalId,
        client_task_id: clientTaskId,
        data: newTask
      });

      // 2. Update local state immediately
      const updatedTasks = [newTask, ...tasksRef.current];
      try {
        localStorage.setItem('br_tasks_' + bizId, JSON.stringify(updatedTasks));
      } catch (e) {}
      updateCacheItem('tasks', updatedTasks);

      // 3. Trigger immediate sync
      syncTasks(bizId, updatedTasks, handleTasksMerged);

      return newTask;
    },
    [session, updateCacheItem, handleTasksMerged]
  );

  // Local-First Task Update
  const updateTask = useCallback(
    (taskId: string, updates: Partial<Task>) => {
      if (!session || !session.businessId || !taskId) return;
      const bizId = session.businessId;
      const nowIso = new Date().toISOString();

      const existing = tasksRef.current.find(t => t.id === taskId);
      if (!existing) return;

      const updatedTask: Task = {
        ...existing,
        ...updates,
        updated_at: nowIso,
        _sync_state: 'syncing'
      };

      // 1. Enqueue mutation
      queueMutation(bizId, {
        action: 'update',
        target_id: taskId,
        client_task_id: existing.client_task_id || null,
        data: updatedTask
      });

      // 2. Update local state
      const updatedTasks = tasksRef.current.map(t => (t.id === taskId ? updatedTask : t));
      try {
        localStorage.setItem('br_tasks_' + bizId, JSON.stringify(updatedTasks));
      } catch (e) {}
      updateCacheItem('tasks', updatedTasks);

      // 3. Trigger immediate sync
      syncTasks(bizId, updatedTasks, handleTasksMerged);
    },
    [session, updateCacheItem, handleTasksMerged]
  );

  // Local-First Task Deletion
  const deleteTask = useCallback(
    (taskId: string) => {
      if (!session || !session.businessId || !taskId) return;
      const bizId = session.businessId;

      const existing = tasksRef.current.find(t => t.id === taskId);
      const clientTaskId = existing ? existing.client_task_id : null;

      // 1. Record Tombstone to prevent resurrection during sync
      recordTaskTombstone(bizId, taskId);
      if (clientTaskId) recordTaskTombstone(bizId, clientTaskId);

      // 2. Enqueue mutation
      queueMutation(bizId, {
        action: 'delete',
        target_id: taskId,
        client_task_id: clientTaskId
      });

      // 3. Remove from local state immediately
      const updatedTasks = tasksRef.current.filter(t => t.id !== taskId);
      try {
        localStorage.setItem('br_tasks_' + bizId, JSON.stringify(updatedTasks));
      } catch (e) {}
      updateCacheItem('tasks', updatedTasks);

      // 4. Trigger immediate sync
      syncTasks(bizId, updatedTasks, handleTasksMerged);
    },
    [session, updateCacheItem, handleTasksMerged]
  );

  // Mark Done / Pending Toggle
  const markTaskDone = useCallback(
    (taskId: string, isDone: boolean) => {
      const nextStatus = isDone ? 'done' : 'pending';
      updateTask(taskId, { status: nextStatus });
      if (isDone) {
        playDoneChime();
        vibrate([20, 40, 20]);
        showToast('✓ Task completed!', 'success');
      }
    },
    [updateTask, showToast]
  );

  const toggleDoneExpanded = (id: string) => {
    setExpandedDoneIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const syncNow = async () => {
    if (!session || !session.businessId) return;
    setIsSyncing(true);
    try {
      await syncTasks(session.businessId, tasksRef.current, handleTasksMerged);
      showToast('🔄 Sync complete', 'success');
    } catch (e) {
      showToast('⚠ Sync failed', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered task lists
  const allTasks = cache.tasks || [];

  // Filter by user role visibility
  const visibleTasks = isManagerPlus()
    ? allTasks
    : allTasks.filter(
        t =>
          !t.assigned_to ||
          t.assigned_to === 'all' ||
          t.assigned_to === session?.staffId ||
          t.created_by === session?.staffId
      );

  // Active vs History
  const activeTasks = visibleTasks.filter(t => {
    if (t.status === 'done' || t.status === 'completed') return false;
    if (taskFilter.staffId && t.assigned_to !== taskFilter.staffId) return false;
    if (taskFilter.priority && t.priority !== taskFilter.priority) return false;
    if (taskFilter.search) {
      const q = taskFilter.search.toLowerCase();
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchNotes = (t.notes || '').toLowerCase().includes(q);
      if (!matchTitle && !matchNotes) return false;
    }
    return true;
  });

  const historyTasks = visibleTasks.filter(t => {
    if (t.status !== 'done' && t.status !== 'completed') return false;
    if (taskFilter.staffId && t.assigned_to !== taskFilter.staffId) return false;
    if (taskFilter.priority && t.priority !== taskFilter.priority) return false;
    if (taskFilter.search) {
      const q = taskFilter.search.toLowerCase();
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchNotes = (t.notes || '').toLowerCase().includes(q);
      if (!matchTitle && !matchNotes) return false;
    }
    return true;
  });

  return (
    <TaskContext.Provider
      value={{
        tasks: visibleTasks,
        activeTasks,
        historyTasks,
        taskFilter,
        setTaskFilter,
        taskSubTab,
        setTaskSubTab,
        expandedDoneIds,
        toggleDoneExpanded,
        createTask,
        updateTask,
        deleteTask,
        markTaskDone,
        syncNow,
        isSyncing
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTasks(): TaskContextType {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error('useTasks must be used within TaskProvider');
  return ctx;
}
