import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCache } from '../../context/CacheContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { ProjectItem } from '../../types';
import { Plus, FolderKanban, CheckCircle2, Clock, Trash2 } from 'lucide-react';

export function ProjectsTab() {
  const { session, isOwner } = useAuth();
  const { cache, updateCacheItem } = useCache();
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    status: 'in_progress' as 'planning' | 'in_progress' | 'review' | 'completed',
    progress: 50,
    due_date: ''
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const newProject: ProjectItem = {
      id: 'proj_' + Date.now(),
      title: formData.title.trim(),
      notes: formData.notes.trim() || undefined,
      status: formData.status,
      progress: Number(formData.progress) || 0,
      due_date: formData.due_date || undefined
    };

    const updated = [newProject, ...cache.projects];
    updateCacheItem('projects', updated);
    try {
      localStorage.setItem('br_projects_' + session?.businessId, JSON.stringify(updated));
    } catch (e) {}

    setIsAddModalOpen(false);
    showToast(`Project "${newProject.title}" created`, 'success');
  };

  const handleDeleteProject = (id: string) => {
    const updated = cache.projects.filter(p => p.id !== id);
    updateCacheItem('projects', updated);
    try {
      localStorage.setItem('br_projects_' + session?.businessId, JSON.stringify(updated));
    } catch (e) {}
    showToast('Project removed', 'info');
  };

  return (
    <div className="tab-projects" style={{ animation: 'fadeIn 0.2s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <div className="section-label" style={{ margin: 0 }}>
            Business Projects & Roadmap ({cache.projects.length})
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--ink-soft)' }}>
            Track major company initiatives and operational milestones
          </div>
        </div>
        {isOwner() && (
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="stamp-btn"
            style={{ padding: '6px 14px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>New Project</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {cache.projects.map(proj => (
          <div
            key={proj.id}
            className="row-card"
            style={{ flexDirection: 'column', alignItems: 'stretch', padding: '16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <b style={{ fontSize: '0.98rem' }}>{proj.title}</b>
                {proj.notes && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', marginTop: '4px' }}>
                    {proj.notes}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Badge
                  variant={
                    proj.status === 'completed'
                      ? 'leaf'
                      : proj.status === 'in_progress'
                      ? 'high'
                      : 'default'
                  }
                >
                  {proj.status.replace('_', ' ')}
                </Badge>
                {isOwner() && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProject(proj.id)}
                    className="icon-btn"
                    style={{ color: 'var(--brick)' }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--ink-soft)' }}>Completion Progress</span>
                <b>{proj.progress || 0}%</b>
              </div>
              <div style={{ height: '8px', background: 'var(--paper-line)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${proj.progress || 0}%`,
                    height: '100%',
                    background: (proj.progress || 0) >= 100 ? 'var(--leaf)' : 'var(--turmeric)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        {cache.projects.length === 0 && (
          <div className="empty" style={{ padding: '32px', textAlign: 'center', background: 'var(--card)', borderRadius: 'var(--radius-card)' }}>
            No business projects registered. Tap New Project to start tracking a milestone!
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create New Project">
        <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label>Project Title *</label>
            <input
              type="text"
              required
              autoFocus
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Open South Godown Logistics Center"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label>Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              >
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label>Progress (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.progress}
                onChange={e => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value, 10) || 0 }))}
              />
            </div>
          </div>

          <div>
            <label>Notes / Scope</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Scope, milestones, responsible persons..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button type="button" className="stamp-btn ghost" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="stamp-btn">
              Create Project
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
