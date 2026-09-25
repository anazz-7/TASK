import { SupabaseClient } from '@supabase/supabase-js';
import { Task } from '../types';

/**
 * Task Reconciliation & Schema Detection Engine (TypeScript)
 */

export interface TaskNotesMeta {
  clientTaskId: string | null;
  updatedAt: string | null;
}

export function parseTaskNotesMeta(rawNotes?: string | null): TaskNotesMeta {
  const notes = rawNotes || '';
  const cidMatch = notes.match(/\[cid:([^\]]+)\]/);
  const updMatch = notes.match(/\[upd:([^\]]+)\]/);
  return {
    clientTaskId: cidMatch ? cidMatch[1] : null,
    updatedAt: updMatch ? updMatch[1] : null
  };
}

export function packTaskNotes(cleanNotes?: string | null, clientTaskId?: string | null, updatedAtIso?: string | null): string {
  let notes = (cleanNotes || '').trim();
  notes = notes.replace(/\[cid:[^\]]+\]/g, '').replace(/\[upd:[^\]]+\]/g, '').trim();
  const tags: string[] = [];
  if (clientTaskId) tags.push(`[cid:${clientTaskId}]`);
  if (updatedAtIso) tags.push(`[upd:${updatedAtIso}]`);
  if (tags.length) {
    notes = notes ? `${notes}\n${tags.join(' ')}` : tags.join(' ');
  }
  return notes;
}

export function getDisplayTaskNotes(rawNotes?: string | null): string {
  if (!rawNotes) return '';
  return String(rawNotes)
    .replace(/\[cid:[^\]]+\]/g, '')
    .replace(/\[upd:[^\]]+\]/g, '')
    .trim();
}

export interface TaskSchemaFeatures {
  hasClientTaskId: boolean;
  hasUpdatedAt: boolean;
}

let _taskSchemaFeatures: TaskSchemaFeatures | null = null;

export async function detectTaskSchemaFeatures(supabaseClient: SupabaseClient | null): Promise<TaskSchemaFeatures> {
  if (_taskSchemaFeatures) return _taskSchemaFeatures;
  if (!supabaseClient) {
    return { hasClientTaskId: false, hasUpdatedAt: false };
  }
  let hasClientTaskId = false;
  let hasUpdatedAt = false;
  try {
    const resCid = await supabaseClient.from('tasks').select('client_task_id').limit(1);
    if (!resCid.error) hasClientTaskId = true;
  } catch (e) {
    hasClientTaskId = false;
  }
  try {
    const resUpd = await supabaseClient.from('tasks').select('updated_at').limit(1);
    if (!resUpd.error) hasUpdatedAt = true;
  } catch (e) {
    hasUpdatedAt = false;
  }
  _taskSchemaFeatures = { hasClientTaskId, hasUpdatedAt };
  return _taskSchemaFeatures;
}

// Persistent Tombstone Registry
export interface TombstoneMap {
  [id: string]: { deleted_at: string };
}

export function getTaskTombstones(bizId?: string | null): TombstoneMap {
  if (!bizId) return {};
  try {
    return JSON.parse(localStorage.getItem('br_tasks_tombstones_' + bizId) || '{}');
  } catch (e) {
    return {};
  }
}

export function recordTaskTombstone(bizId: string, idOrClientId?: string | null): void {
  if (!bizId || !idOrClientId) return;
  try {
    const map = getTaskTombstones(bizId);
    map[idOrClientId] = { deleted_at: new Date().toISOString() };
    localStorage.setItem('br_tasks_tombstones_' + bizId, JSON.stringify(map));
  } catch (e) {}
}

export function removeTaskTombstone(bizId: string, idOrClientId?: string | null): void {
  if (!bizId || !idOrClientId) return;
  try {
    const map = getTaskTombstones(bizId);
    delete map[idOrClientId];
    localStorage.setItem('br_tasks_tombstones_' + bizId, JSON.stringify(map));
  } catch (e) {}
}

/**
 * Deterministic Task Merge:
 * Merges local and cloud tasks preserving newer local edits and suppressing deleted tombstones.
 */
export function deterministicTaskMerge(localTasks: Task[] = [], cloudTasks: Task[] = [], bizId: string): Task[] {
  const merged: Task[] = [];
  const tombstones = getTaskTombstones(bizId);

  const localByCloudId = new Map<string, Task>();
  const localByClientTaskId = new Map<string, Task>();
  const pendingOrFailedLocals: Task[] = [];

  for (const lt of localTasks) {
    if (!lt) continue;
    if (lt.id) localByCloudId.set(String(lt.id), lt);
    if (lt.client_task_id) localByClientTaskId.set(String(lt.client_task_id), lt);
    if (lt._sync_state === 'syncing' || (lt as any)._sync_state === 'pending' || lt._sync_state === 'failed') {
      pendingOrFailedLocals.push(lt);
    }
  }

  const cloudIdsProcessed = new Set<string>();
  const clientTaskIdsProcessed = new Set<string>();

  for (const ct of cloudTasks) {
    if (!ct || !ct.id) continue;
    const cidStr = String(ct.id);
    const meta = parseTaskNotesMeta(ct.notes);
    const effectiveClientTaskId = ct.client_task_id || meta.clientTaskId;

    // Check tombstone suppression
    if (tombstones[cidStr] || (effectiveClientTaskId && tombstones[effectiveClientTaskId])) {
      continue;
    }

    cloudIdsProcessed.add(cidStr);
    if (effectiveClientTaskId) clientTaskIdsProcessed.add(effectiveClientTaskId);

    const matchingLocal = localByCloudId.get(cidStr) || (effectiveClientTaskId ? localByClientTaskId.get(effectiveClientTaskId) : null);

    if (matchingLocal && (matchingLocal._sync_state === 'syncing' || (matchingLocal as any)._sync_state === 'pending')) {
      const localUpd = new Date(matchingLocal.updated_at || matchingLocal.created_at || 0).getTime();
      const cloudUpd = new Date(ct.updated_at || meta.updatedAt || ct.created_at || 0).getTime();
      if (localUpd > cloudUpd) {
        merged.push({
          ...ct,
          ...matchingLocal,
          id: cidStr,
          client_task_id: effectiveClientTaskId || matchingLocal.client_task_id,
          _sync_state: matchingLocal._sync_state
        });
        continue;
      }
    }

    merged.push({
      ...ct,
      id: cidStr,
      client_task_id: effectiveClientTaskId || (matchingLocal && matchingLocal.client_task_id) || null,
      _sync_state: 'synced'
    });
  }

  // Preserve unsynced/pending local tasks not yet reflected in cloud
  for (const lt of pendingOrFailedLocals) {
    if ((lt as any).is_deleted) continue;
    const cidStr = lt.id ? String(lt.id) : null;
    const cltId = lt.client_task_id ? String(lt.client_task_id) : null;

    if (cidStr && cloudIdsProcessed.has(cidStr)) continue;
    if (cltId && clientTaskIdsProcessed.has(cltId)) continue;
    if (cidStr && tombstones[cidStr]) continue;
    if (cltId && tombstones[cltId]) continue;

    merged.unshift(lt);
  }

  return merged;
}
