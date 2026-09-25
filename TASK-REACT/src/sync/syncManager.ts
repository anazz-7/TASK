import { getSupabase } from '../lib/supabase';
import { Task } from '../types';
import {
  getMutationQueue,
  saveMutationQueue,
  reconcileQueueTargetId,
  MutationItem
} from './mutationQueue';
import {
  detectTaskSchemaFeatures,
  packTaskNotes,
  recordTaskTombstone,
  removeTaskTombstone,
  deterministicTaskMerge
} from './taskReconciliation';

let isSyncing = false;
let syncPollerTimer: any = null;

export interface MutationProcessResult {
  processed: number;
  failed: number;
}

export async function processTaskMutationQueue(
  bizId: string,
  onLocalTasksUpdate?: (tasks: Task[]) => void
): Promise<MutationProcessResult> {
  if (!bizId) return { processed: 0, failed: 0 };
  const sb = getSupabase();
  if (!sb || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return { processed: 0, failed: 0 };
  }

  const queue = getMutationQueue(bizId);
  if (!queue.length) return { processed: 0, failed: 0 };

  const schemaFeatures = await detectTaskSchemaFeatures(sb);
  let localTasks: Task[] = JSON.parse(localStorage.getItem('br_tasks_' + bizId) || '[]');
  let processed = 0;
  let failed = 0;

  const remainingQueue: MutationItem[] = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    item.status = 'syncing';

    try {
      if (item.action === 'insert') {
        const payload: any = { ...item.data };
        delete payload.is_deleted;
        delete payload._sync_state;

        const effectiveClientTaskId = item.client_task_id || payload.client_task_id;
        const localId = item.local_id || payload.id;
        delete payload.id;

        // 1. Idempotency Check: check if client_task_id already exists in Supabase
        let existingCloudTask: any = null;
        if (effectiveClientTaskId) {
          if (schemaFeatures.hasClientTaskId) {
            const { data } = await sb.from('tasks')
              .select('id, business_id, client_task_id, updated_at')
              .eq('business_id', bizId)
              .eq('client_task_id', effectiveClientTaskId)
              .maybeSingle();
            if (data) existingCloudTask = data;
          } else {
            const { data } = await sb.from('tasks')
              .select('id, business_id, notes, updated_at')
              .eq('business_id', bizId)
              .ilike('notes', `%[cid:${effectiveClientTaskId}]%`)
              .limit(1);
            if (data && data[0]) existingCloudTask = data[0];
          }
        }

        if (existingCloudTask) {
          // Task already exists in Supabase! Reconcile UUID
          const cloudId = existingCloudTask.id;
          reconcileQueueTargetId(bizId, localId, cloudId);
          localTasks = localTasks.map(t => {
            if (t.id === localId || t.client_task_id === effectiveClientTaskId) {
              return { ...t, id: cloudId, _sync_state: 'synced' };
            }
            return t;
          });
          processed++;
          continue;
        }

        // 2. Prepare payload based on detected schema
        if (schemaFeatures.hasClientTaskId) {
          payload.client_task_id = effectiveClientTaskId;
        } else {
          delete payload.client_task_id;
          payload.notes = packTaskNotes(payload.notes, effectiveClientTaskId, payload.updated_at);
        }
        if (!schemaFeatures.hasUpdatedAt) {
          delete payload.updated_at;
        }

        const { data: created, error } = await sb.from('tasks')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        const cloudId = created.id;
        reconcileQueueTargetId(bizId, localId, cloudId);
        localTasks = localTasks.map(t => {
          if (t.id === localId || (effectiveClientTaskId && t.client_task_id === effectiveClientTaskId)) {
            return {
              ...t,
              id: cloudId,
              client_task_id: effectiveClientTaskId,
              _sync_state: 'synced'
            };
          }
          return t;
        });
        processed++;

      } else if (item.action === 'update') {
        const targetId = item.target_id || (item.data && item.data.id);
        if (!targetId || String(targetId).startsWith('loc_task_')) {
          remainingQueue.push(item);
          continue;
        }

        const payload: any = { ...item.data };
        delete payload.is_deleted;
        delete payload._sync_state;
        delete payload.id;

        const effectiveClientTaskId = item.client_task_id || payload.client_task_id;
        if (schemaFeatures.hasClientTaskId) {
          if (effectiveClientTaskId) payload.client_task_id = effectiveClientTaskId;
        } else {
          delete payload.client_task_id;
          payload.notes = packTaskNotes(payload.notes, effectiveClientTaskId, payload.updated_at);
        }
        if (!schemaFeatures.hasUpdatedAt) {
          delete payload.updated_at;
        }

        const { error } = await sb.from('tasks')
          .update(payload)
          .eq('id', targetId);

        if (error) throw error;

        localTasks = localTasks.map(t => {
          if (t.id === targetId) {
            return { ...t, ...payload, _sync_state: 'synced' };
          }
          return t;
        });
        processed++;

      } else if (item.action === 'delete') {
        const targetId = item.target_id;
        if (!targetId || String(targetId).startsWith('loc_task_')) {
          removeTaskTombstone(bizId, targetId);
          processed++;
          continue;
        }

        const { error } = await sb.from('tasks')
          .delete()
          .eq('id', targetId);

        if (error) throw error;

        removeTaskTombstone(bizId, targetId);
        localTasks = localTasks.filter(t => t.id !== targetId);
        processed++;
      }
    } catch (e: any) {
      console.warn('[TASK SYNC] Mutation failed:', item, e);
      item.retryCount = (item.retryCount || 0) + 1;
      item.status = item.retryCount >= 5 ? 'failed' : 'pending';
      item.lastError = e?.message || String(e);
      remainingQueue.push(item);
      failed++;

      // Update task sync state to failed
      const tid = item.target_id || item.local_id;
      localTasks = localTasks.map(t => {
        if (t.id === tid || t.client_task_id === item.client_task_id) {
          return { ...t, _sync_state: 'failed' };
        }
        return t;
      });
    }
  }

  saveMutationQueue(bizId, remainingQueue);
  localStorage.setItem('br_tasks_' + bizId, JSON.stringify(localTasks));
  if (typeof onLocalTasksUpdate === 'function') {
    onLocalTasksUpdate(localTasks);
  }

  return { processed, failed };
}

export async function syncTasks(
  bizId: string,
  currentTasks: Task[],
  onTasksMerged?: (tasks: Task[]) => void
): Promise<Task[]> {
  if (!bizId || isSyncing) return currentTasks;
  const sb = getSupabase();
  if (!sb || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return currentTasks;
  }

  isSyncing = true;
  try {
    // 1. Flush offline mutation queue first
    await processTaskMutationQueue(bizId, onTasksMerged);

    // 2. Fetch fresh tasks from cloud
    const { data: cloudTasks, error } = await sb.from('tasks')
      .select('*')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 3. Deterministic Merge
    const localTasks: Task[] = JSON.parse(localStorage.getItem('br_tasks_' + bizId) || '[]');
    const merged = deterministicTaskMerge(localTasks, (cloudTasks as Task[]) || [], bizId);

    // 4. Persist merged tasks to localStorage
    localStorage.setItem('br_tasks_' + bizId, JSON.stringify(merged));
    if (typeof onTasksMerged === 'function') {
      onTasksMerged(merged);
    }

    return merged;
  } catch (e) {
    console.warn('[TASK SYNC] Sync error:', e);
    return currentTasks;
  } finally {
    isSyncing = false;
  }
}

export function startSyncPoller(
  bizId: string,
  getCurrentTasks: () => Task[],
  onTasksMerged: (tasks: Task[]) => void
): () => void {
  if (syncPollerTimer) clearInterval(syncPollerTimer);

  const runSync = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const tasks = getCurrentTasks ? getCurrentTasks() : [];
      syncTasks(bizId, tasks, onTasksMerged);
    }
  };

  // 30-second background sync
  syncPollerTimer = setInterval(runSync, 30000);

  // Focus trigger (visibilitychange)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      runSync();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Online reconnection trigger
  const handleOnline = () => {
    runSync();
  };
  window.addEventListener('online', handleOnline);

  return () => {
    if (syncPollerTimer) clearInterval(syncPollerTimer);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('online', handleOnline);
  };
}
