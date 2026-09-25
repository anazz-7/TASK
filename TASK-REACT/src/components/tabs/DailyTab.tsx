import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { useToast } from '../../context/ToastContext';
import { todayStr } from '../../utils/dateUtils';
import { playDoneChime } from '../../lib/audio';
import { getSupabase } from '../../lib/supabase';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Routine, TaskPriority } from '../../types';
import { Plus, Check, Clock, User, Trash2 } from 'lucide-react';

export function DailyTab() {
  const { session, isManagerPlus, isOwner } = useAuth();
  const { cache, updateCacheItem } = useCache();
  const { showToast } = useToast();

  const today = todayStr();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineAssignee, setRoutineAssignee] = useState('');
  const [routinePriority, setRoutinePriority] = useState<TaskPriority>('medium');

  // Completed routine IDs for today
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`br_routine_done_${session?.businessId}_${today}`);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch (e) {
      return new Set();
    }
  });

  const toggleRoutine = async (routineId: string) => {
    const next = new Set(completedIds);
    const isNowDone = !next.has(routineId);
    if (isNowDone) {
      next.add(routineId);
      playDoneChime();
      showToast('✓ Daily routine completed!', 'success');
    } else {
      next.delete(routineId);
    }
    setCompletedIds(next);

    try {
      localStorage.setItem(
        `br_routine_done_${session?.businessId}_${today}`,
        JSON.stringify(Array.from(next))
      );
    } catch (e) {}

    // Cloud upsert into routine_log
    const sb = getSupabase();
    if (sb && navigator.onLine) {
      try {
        await sb.from('routine_log').upsert(
          {
            routine_id: routineId,
            date: today,
            status: isNowDone ? 'done' : 'pending'
          },
          { onConflict: 'routine_id,date' }
        );
      } catch (e) {}
    }
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !session.businessId || !routineTitle.trim()) return;

    const newRoutine: Routine = {
      id: 'loc_rt_' + Date.now(),
      business_id: session.businessId,
      title: routineTitle.trim(),
      assigned_to: routineAssignee || null,
      priority: routinePriority
    };

    updateCacheItem('routines', [...cache.routines, newRoutine]);
    setIsAddModalOpen(false);
    setRoutineTitle('');
    showToast('Daily routine added', 'success');

    const sb = getSupabase();
    if (sb && navigator.onLine) {
      try {
        const payload = { ...newRoutine };
        delete (payload as any).id;
        const { data } = await sb.from('routines').insert(payload).select().single();
        if (data) {
          updateCacheItem(
            'routines',
            cache.routines.map(r => (r.id === newRoutine.id ? data : r))
          );
        }
      } catch (e) {}
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    updateCacheItem('routines', cache.routines.filter(r => r.id !== id));
    showToast('Routine deleted', 'info');

    const sb = getSupabase();
    if (sb && navigator.onLine && !id.startsWith('loc_rt_')) {
      try {
        await sb.from('routines').delete().eq('id', id);
      } catch (e) {}
    }
  };

  return (
    <div className="tab-daily" style={{ animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div className="section-label" style={{ margin: 0 }}>
            Everyday Routines ({completedIds.size} / {cache.routines.length} Done Today)
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
            Recurring checklist resetting daily
          </div>
        </div>
        {isManagerPlus() && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="stamp-btn"
            style={{ padding: '6px 14px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Add Routine</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cache.routines.map(rt => {
          const isDone = completedIds.has(rt.id);
          const staffObj = cache.staff.find(s => s.id === rt.assigned_to);

          return (
            <div
              key={rt.id}
              className="row-card"
              style={{
                alignItems: 'center',
                padding: '14px',
                borderLeft: isDone ? '4px solid var(--leaf)' : '4px solid var(--turmeric)'
              }}
            >
              <input
                type="checkbox"
                checked={isDone}
                onChange={() => toggleRoutine(rt.id)}
                style={{ width: '18px', height: '18px', marginRight: '12px', accentColor: 'var(--leaf)', cursor: 'pointer' }}
              />

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <b
                    style={{
                      fontSize: '0.9rem',
                      textDecoration: isDone ? 'line-through' : 'none',
                      color: isDone ? 'var(--ink-soft)' : 'var(--ink)'
                    }}
                  >
                    {rt.title}
                  </b>
                  <Badge variant={rt.priority}>{rt.priority}</Badge>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '2px' }}>
                  Assigned to: {staffObj ? staffObj.name : 'Everyone'}
                </div>
              </div>

              {isOwner() && (
                <button
                  type="button"
                  onClick={() => handleDeleteRoutine(rt.id)}
                  className="icon-btn"
                  style={{ color: 'var(--brick)' }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          );
        })}

        {cache.routines.length === 0 && (
          <div className="empty" style={{ padding: '32px', textAlign: 'center', background: 'var(--card)', borderRadius: 'var(--radius-card)' }}>
            No everyday routines created. Tap Add Routine to set daily repeating tasks.
          </div>
        )}
      </div>

      {/* Add Routine Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Daily Routine">
        <form onSubmit={handleCreateRoutine} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label>Routine Title *</label>
            <input
              type="text"
              required
              autoFocus
              value={routineTitle}
              onChange={e => setRoutineTitle(e.target.value)}
              placeholder="e.g. Turn on showroom lights & clean floor"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label>Assignee</label>
              <select value={routineAssignee} onChange={e => setRoutineAssignee(e.target.value)}>
                <option value="">Everyone (Unassigned)</option>
                {cache.staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Priority</label>
              <select value={routinePriority} onChange={e => setRoutinePriority(e.target.value as TaskPriority)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="stamp-btn ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="stamp-btn">
              Add Routine
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
