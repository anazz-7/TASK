import React, { useState } from 'react';
import { useTasks } from '../../context/TaskContext';
import { useCache } from '../../context/CacheContext';
import { useAuth } from '../../context/AuthContext';
import { parseNaturalTaskText } from '../../utils/naturalLanguageParser';
import { useToast } from '../../context/ToastContext';
import { Plus, Sparkles, Send } from 'lucide-react';

export function QuickTaskBar() {
  const [inputVal, setInputVal] = useState('');
  const { createTask } = useTasks();
  const { cache } = useCache();
  const { session } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const parsed = parseNaturalTaskText(inputVal, cache.staff, session?.staffId);
    if (!parsed) return;

    createTask({
      title: parsed.title,
      assigned_to: parsed.assignedTo || session?.staffId,
      priority: parsed.priority,
      due_date: parsed.dueDate,
      status: 'pending'
    });

    showToast(`✓ Task created: "${parsed.title}"`, 'success');
    setInputVal('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="quick-task-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'var(--card)',
        padding: '8px 12px',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--paper-line)',
        boxShadow: '0 2px 8px rgba(11, 19, 43, 0.04)',
        marginBottom: '16px'
      }}
    >
      <div style={{ color: 'var(--turmeric)', display: 'flex', alignItems: 'center' }}>
        <Sparkles size={18} />
      </div>
      <input
        type="text"
        value={inputVal}
        onChange={e => setInputVal(e.target.value)}
        placeholder="QUICK TASK: Type e.g. 'Call vendor tomorrow 5pm !urgent @Rahul'..."
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: '0.82rem',
          color: 'var(--ink)',
          fontFamily: "'Roboto Mono', monospace"
        }}
      />
      <button
        type="submit"
        disabled={!inputVal.trim()}
        className="stamp-btn"
        style={{
          padding: '6px 14px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.72rem',
          opacity: inputVal.trim() ? 1 : 0.6
        }}
      >
        <Plus size={14} />
        <span>Add</span>
      </button>
    </form>
  );
}
