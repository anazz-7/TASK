import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { useTasks } from '../../context/TaskContext';
import { useToast } from '../../context/ToastContext';
import { formatDate, formatTime, isOverdue } from '../../utils/dateUtils';
import { exportToExcel } from '../../utils/excelExport';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { QuickTaskBar } from '../common/QuickTaskBar';
import { Task, TaskPriority } from '../../types';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  MessageCircle,
  Clock,
  User
} from 'lucide-react';

export function TasksTab() {
  const { session, isManagerPlus, isOwner } = useAuth();
  const { cache } = useCache();
  const {
    activeTasks,
    historyTasks,
    taskFilter,
    setTaskFilter,
    taskSubTab,
    setTaskSubTab,
    createTask,
    updateTask,
    deleteTask,
    markTaskDone
  } = useTasks();
  const { showToast } = useToast();

  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    priority: 'medium' as TaskPriority,
    due_date: new Date().toISOString().split('T')[0],
    due_time: '',
    assigned_to: ''
  });

  const toggleExpand = (id: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenAddModal = () => {
    setFormData({
      title: '',
      notes: '',
      priority: 'medium',
      due_date: new Date().toISOString().split('T')[0],
      due_time: '',
      assigned_to: session?.staffId || ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      notes: task.notes || '',
      priority: task.priority,
      due_date: task.due_date || new Date().toISOString().split('T')[0],
      due_time: task.due_time || '',
      assigned_to: task.assigned_to || ''
    });
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingTask) {
      updateTask(editingTask.id, {
        title: formData.title.trim(),
        notes: formData.notes.trim(),
        priority: formData.priority,
        due_date: formData.due_date || null,
        due_time: formData.due_time || null,
        assigned_to: formData.assigned_to || null
      });
      showToast('Task updated successfully', 'success');
      setEditingTask(null);
    } else {
      createTask({
        title: formData.title.trim(),
        notes: formData.notes.trim(),
        priority: formData.priority,
        due_date: formData.due_date || null,
        due_time: formData.due_time || null,
        assigned_to: formData.assigned_to || null,
        status: 'pending'
      });
      showToast('Task created successfully', 'success');
      setIsAddModalOpen(false);
    }
  };

  const handleExport = () => {
    const list = taskSubTab === 'active' ? activeTasks : historyTasks;
    const exportData = list.map(t => {
      const staffObj = cache.staff.find(s => s.id === t.assigned_to);
      return {
        'Title': t.title,
        'Assignee': staffObj ? staffObj.name : 'Everyone',
        'Priority': t.priority.toUpperCase(),
        'Due Date': t.due_date || 'N/A',
        'Status': t.status.toUpperCase(),
        'Notes': t.notes || ''
      };
    });
    exportToExcel(exportData, `Tasks_${taskSubTab}`);
    showToast('Exported tasks to Excel', 'success');
  };

  const displayedList = taskSubTab === 'active' ? activeTasks : historyTasks;

  return (
    <div className="tab-tasks" style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Quick Task Bar */}
      <QuickTaskBar />

      {/* Header & Sub-tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className={`attend-btn ${taskSubTab === 'active' ? 'present active' : ''}`}
            onClick={() => setTaskSubTab('active')}
            style={{ padding: '8px 16px', fontSize: '0.78rem' }}
          >
            Active ({activeTasks.length})
          </button>
          <button
            type="button"
            className={`attend-btn ${taskSubTab === 'history' ? 'present active' : ''}`}
            onClick={() => setTaskSubTab('history')}
            style={{ padding: '8px 16px', fontSize: '0.78rem' }}
          >
            Completed ({historyTasks.length})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleExport}
            className="stamp-btn ghost"
            title="Export to Excel"
            style={{ padding: '6px 12px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Download size={14} />
            <span>Export</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="stamp-btn"
            style={{ padding: '6px 14px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div
        className="filter-bar"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          background: 'var(--card)',
          padding: '10px',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--paper-line)',
          marginBottom: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Search size={14} color="var(--ink-soft)" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={taskFilter.search}
            onChange={e => setTaskFilter(prev => ({ ...prev, search: e.target.value }))}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '0.75rem' }}
          />
        </div>

        {/* Priority Filter */}
        <select
          value={taskFilter.priority}
          onChange={e => setTaskFilter(prev => ({ ...prev, priority: e.target.value }))}
          style={{ padding: '4px 8px', borderRadius: 'var(--radius-input)', border: '1px solid var(--paper-line)', fontSize: '0.75rem' }}
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Staff Filter (managers only) */}
        {isManagerPlus() && (
          <select
            value={taskFilter.staffId}
            onChange={e => setTaskFilter(prev => ({ ...prev, staffId: e.target.value }))}
            style={{ padding: '4px 8px', borderRadius: 'var(--radius-input)', border: '1px solid var(--paper-line)', fontSize: '0.75rem' }}
          >
            <option value="">All Assignees</option>
            {cache.staff.map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {displayedList.map(task => {
          const staffObj = cache.staff.find(s => s.id === task.assigned_to);
          const isTaskOverdue = isOverdue(task.due_date, task.status);
          const hasNotes = Boolean(task.notes && task.notes.trim());
          const isExpanded = expandedNotes.has(task.id);

          return (
            <div
              key={task.id}
              className="row-card"
              style={{
                flexDirection: 'column',
                alignItems: 'stretch',
                padding: '14px',
                borderLeft: isTaskOverdue
                  ? '4px solid var(--brick)'
                  : task.priority === 'urgent'
                  ? '4px solid var(--brick)'
                  : task.priority === 'high'
                  ? '4px solid #F59E0B'
                  : '4px solid var(--turmeric)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={task.status === 'done' || task.status === 'completed'}
                    onChange={e => markTaskDone(task.id, e.target.checked)}
                    style={{
                      width: '18px',
                      height: '18px',
                      marginTop: '2px',
                      cursor: 'pointer',
                      accentColor: 'var(--turmeric)'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          textDecoration: task.status === 'done' ? 'line-through' : 'none',
                          color: task.status === 'done' ? 'var(--ink-soft)' : 'var(--ink)'
                        }}
                      >
                        {task.title}
                      </span>
                      <Badge variant={task.priority}>{task.priority}</Badge>
                      {isTaskOverdue && <Badge variant="overdue">OVERDUE</Badge>}
                      {task._sync_state === 'syncing' && <Badge variant="syncing">SYNCING</Badge>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.7rem', color: 'var(--ink-soft)', marginTop: '4px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} />
                        {staffObj ? staffObj.name : 'Everyone'}
                      </span>
                      {task.due_date && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} />
                          {formatDate(task.due_date)} {task.due_time ? `· ${task.due_time}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {hasNotes && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(task.id)}
                      className="icon-btn"
                      title={isExpanded ? 'Collapse notes' : 'Expand notes'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                  {isManagerPlus() && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(task)}
                      className="icon-btn"
                      title="Edit task"
                    >
                      <Edit2 size={15} />
                    </button>
                  )}
                  {isOwner() && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(task.id)}
                      className="icon-btn"
                      title="Delete task"
                      style={{ color: 'var(--brick)' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Collapsible Notes */}
              {hasNotes && isExpanded && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    background: 'var(--paper)',
                    borderRadius: 'var(--radius-input)',
                    fontSize: '0.78rem',
                    color: 'var(--ink)',
                    whiteSpace: 'pre-wrap',
                    border: '1px solid var(--paper-line)'
                  }}
                >
                  {task.notes}
                </div>
              )}
            </div>
          );
        })}

        {displayedList.length === 0 && (
          <div className="empty" style={{ padding: '32px', textAlign: 'center', background: 'var(--card)', borderRadius: 'var(--radius-card)' }}>
            No tasks found matching your filter criteria.
          </div>
        )}
      </div>

      {/* Add / Edit Task Modal */}
      <Modal
        isOpen={isAddModalOpen || editingTask !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTask(null);
        }}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
      >
        <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label>Task Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Inspect underground godown stock"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label>Priority</label>
              <select
                value={formData.priority}
                onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label>Assign To</label>
              <select
                value={formData.assigned_to}
                onChange={e => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
              >
                <option value="">Everyone (Unassigned)</option>
                {cache.staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label>Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>
            <div>
              <label>Due Time</label>
              <input
                type="time"
                value={formData.due_time}
                onChange={e => setFormData(prev => ({ ...prev, due_time: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label>Notes / Instructions</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional details, checklist or steps..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              className="stamp-btn ghost"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingTask(null);
              }}
            >
              Cancel
            </button>
            <button type="submit" className="stamp-btn">
              {editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Confirm Task Deletion"
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>
          Are you sure you want to delete this task? This action will sync across all devices and cannot be undone.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
          <button type="button" className="stamp-btn ghost" onClick={() => setDeleteConfirmId(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="stamp-btn"
            style={{ background: 'var(--brick)' }}
            onClick={() => {
              if (deleteConfirmId) {
                deleteTask(deleteConfirmId);
                showToast('Task deleted', 'info');
                setDeleteConfirmId(null);
              }
            }}
          >
            Delete Permanently
          </button>
        </div>
      </Modal>
    </div>
  );
}
