import { Task } from '../types';
import { getMutationQueue, MutationItem } from './mutationQueue';
import { getTaskTombstones, TombstoneMap } from './taskReconciliation';

export interface SyncDiagnosticsReport {
  isOnline: boolean;
  totalLocalTasks: number;
  syncingTasksCount: number;
  failedTasksCount: number;
  totalQueuedMutations: number;
  pendingMutationsCount: number;
  failedMutationsCount: number;
  tombstonesCount: number;
  queue: MutationItem[];
  tombstones: TombstoneMap;
  syncingTaskIds: (string | undefined)[];
  failedTaskIds: (string | undefined)[];
}

export function getSyncDiagnostics(bizId?: string | null, currentTasks: Task[] = []): SyncDiagnosticsReport {
  const queue = getMutationQueue(bizId);
  const tombstones = getTaskTombstones(bizId);
  
  const pending = queue.filter(q => q.status === 'pending' || q.status === 'syncing');
  const failed = queue.filter(q => q.status === 'failed');
  
  const syncingTasks = currentTasks.filter(t => t._sync_state === 'syncing');
  const failedTasks = currentTasks.filter(t => t._sync_state === 'failed');

  return {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    totalLocalTasks: currentTasks.length,
    syncingTasksCount: syncingTasks.length,
    failedTasksCount: failedTasks.length,
    totalQueuedMutations: queue.length,
    pendingMutationsCount: pending.length,
    failedMutationsCount: failed.length,
    tombstonesCount: Object.keys(tombstones).length,
    queue,
    tombstones,
    syncingTaskIds: syncingTasks.map(t => t.id || t.client_task_id || undefined),
    failedTaskIds: failedTasks.map(t => t.id || t.client_task_id || undefined)
  };
}

if (typeof window !== 'undefined') {
  (window as any).__taskSyncDiagnostics = function() {
    const session = JSON.parse(localStorage.getItem('br_session') || 'null');
    const bizId = session ? session.businessId : null;
    const tasks = bizId ? JSON.parse(localStorage.getItem('br_tasks_' + bizId) || '[]') : [];
    const report = getSyncDiagnostics(bizId, tasks);
    console.table({
      'Online Status': report.isOnline ? 'ONLINE' : 'OFFLINE',
      'Total Cached Tasks': report.totalLocalTasks,
      'Actively Syncing Tasks': report.syncingTasksCount,
      'Failed Tasks': report.failedTasksCount,
      'Queued Mutations': report.totalQueuedMutations,
      'Pending Mutations': report.pendingMutationsCount,
      'Failed Mutations': report.failedMutationsCount,
      'Tombstones Registered': report.tombstonesCount
    });
    console.log('Detailed Sync Telemetry:', report);
    return report;
  };
}
