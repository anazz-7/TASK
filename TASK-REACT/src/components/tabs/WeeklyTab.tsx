import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { useToast } from '../../context/ToastContext';
import { getWeekStartDate } from '../../utils/dateUtils';
import { playDoneChime } from '../../lib/audio';
import { getSupabase } from '../../lib/supabase';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { WeeklyTask, TaskPriority } from '../../types';
import { Plus, Check, Trash2, CalendarDays } from 'lucide-react';

export function WeeklyTab() {
  const { session, isManagerPlus, isOwner } = useAuth();
  const { cache, updateCacheItem } = useCache();
  const { showToast } = useToast();

  const weekStart = getWeekStartDate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [weeklyTitle, setWeeklyTitle] = useState('');
  const [weeklyAssignee, setWeeklyAssignee] = useState('');
  const [weeklyPriority, setWeeklyPriority] = useState<TaskPriority>('medium');

  const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`br_weekly_done_${session?.businessId}_${weekStart}`);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch (e) {
      return new Set();
    }
  });

  const toggleWeekly = async (taskId: string) => {
    const next = new Set(completedIds);
    const isNowDone = !next.has(taskId);
    if (isNowDone) {
      next.add(taskId);
      playDoneChime();
      showToast('✓ Weekly task completed!', 'success');
    } else {
      next.delete(taskId);
    }
    setCompletedIds(next);

    try {
      localStorage.setItem(
        `br_weekly_done_${session?.businessId}_${weekStart}`,
        JSON.stringify(Array.from(next))
      );
    } catch (e) {}

    // Cloud upsert into weekly_task_log
    const sb = getSupabase();
    if (sb && navigator.onLine) {
      try {
        await sb.from('weekly_task_log').upsert(
          {
            weekly_task_id: taskId,
            week_start: weekStart,
            status: isNowDone ? 'done' : 'pending'
          },
          { onConflict: 'weekly_task_id,week_start' }
        );
      } catch (e) {}
    }
  };

  const handleCreateWeekly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !session.businessId || !weeklyTitle.trim()) return;

    const newTask: WeeklyTask = {
      id: 'loc_wt_' + Date.now(),
      business_id: session.businessId,
      title: weeklyTitle.trim(),
      assigned_to: weeklyAssignee || null,
      priority: weeklyPriority
    };

    updateCacheItem('weeklyTasks', [...cache.weeklyTasks, newTask]);
    setIsAddModalOpen(false);
    setWeeklyTitle('');
    showToast('Weekly task added', 'success');

    const sb = getSupabase();
    if (sb && navigator.onLine) {
      try {
        const payload = { ...newTask };
        delete (payload as any).id;
        const { data } = await sb.from('weekly_tasks').insert(payload).select().single();
        if (data) {
          updateCacheItem(
            'weeklyTasks',
            cache.weeklyTasks.map(w => (w.id === newTask.id ? data : w))
          );
        }
      } catch (e) {}
    }
  };

  const handleDeleteWeekly = async (id: string) => {
    updateCacheItem('weeklyTasks', cache.weeklyTasks.filter(w => w.id !== id));
    showToast('Weekly task removed', 'info');

    const sb = getSupabase();
    if (sb && navigator.onLine && !id.startsWith('loc_wt_')) {
      try {
        await sb.from('weekly_tasks').delete().eq('id', id);
      } catch (e) {}
    }
  };

  return (
    <div className="tab-weekly" style={{ animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div className="section-label" style={{ margin: 0 }}>
            Weekly Checklist (Week of {weekStart})
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
            Repeats each week — resets automatically every Monday
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
            <span>Add Task</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {cache.weeklyTasks.map(task => {
          const isDone = completedIds.has(task.id);
          const staffObj = cache.staff.find(s => s.id === task.assigned_to);

          return (
            <div
              key={task.id}
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
                onChange={() => toggleWeekly(task.id)}
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
                    {task.title}
                  </b>
                  <Badge variant={task.priority}>{task.priority}</Badge>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '2px' }}>
                  Assigned to: {staffObj ? staffObj.name : 'Everyone'}
                </div>
              </div>

              {isOwner() && (
                <button
                  type="button"
                  onClick={() => handleDeleteWeekly(task.id)}
                  className="icon-btn"
                  style={{ color: 'var(--brick)' }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          );
        })}

        {cache.weeklyTasks.length === 0 && (
          <div className="empty" style={{ padding: '32px', textAlign: 'center', background: 'var(--card)', borderRadius: 'var(--radius-card)' }}>
            No weekly tasks added. Tap Add Task to schedule weekly items.
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Weekly Task">
        <form onSubmit={handleCreateWeekly} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label>Task Title *</label>
            <input
              type="text"
              required
              autoFocus
              value={weeklyTitle}
              onChange={e => setWeeklyTitle(e.target.value)}
              placeholder="e.g. Weekly Godown Inventory Audit"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label>Assignee</label>
              <select value={weeklyAssignee} onChange={e => setWeeklyAssignee(e.target.value)}>
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
              <select value={weeklyPriority} onChange={e => setWeeklyPriority(e.target.value as TaskPriority)}>
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
              Add Weekly Task
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
