/**
 * Offline Mutation Queue Management (TypeScript)
 */

export interface MutationItem {
  id: string;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  timestamp: number;
  action: 'insert' | 'update' | 'delete';
  local_id?: string;
  target_id?: string;
  client_task_id?: string | null;
  data?: any;
  lastError?: string;
}

export function getMutationQueue(bizId?: string | null): MutationItem[] {
  if (!bizId) return [];
  try {
    const raw = localStorage.getItem('br_task_mutation_queue_' + bizId);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveMutationQueue(bizId: string | null | undefined, queue: MutationItem[]): void {
  if (!bizId) return;
  try {
    localStorage.setItem('br_task_mutation_queue_' + bizId, JSON.stringify(queue || []));
  } catch (e) {}
}

export function queueMutation(
  bizId: string,
  mutation: Omit<MutationItem, 'id' | 'status' | 'retryCount' | 'timestamp'>
): MutationItem | undefined {
  if (!bizId) return;
  const queue = getMutationQueue(bizId);
  const enriched: MutationItem = {
    id: 'mut_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    status: 'pending',
    retryCount: 0,
    timestamp: Date.now(),
    ...mutation
  };
  queue.push(enriched);
  saveMutationQueue(bizId, queue);
  return enriched;
}

export function reconcileQueueTargetId(
  bizId: string,
  oldId?: string | null,
  newId?: string | null
): void {
  if (!bizId || !oldId || !newId || oldId === newId) return;
  const queue = getMutationQueue(bizId);
  let changed = false;
  for (const item of queue) {
    if (item.target_id === oldId) {
      item.target_id = newId;
      changed = true;
    }
    if (item.local_id === oldId) {
      item.local_id = newId;
      changed = true;
    }
  }
  if (changed) {
    saveMutationQueue(bizId, queue);
  }
}
