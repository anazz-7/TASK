/* ---------------- PROJECTS (OWNER ONLY) ---------------- */
let projectsStatusFilter = 'all';
let projectsSearchQuery = '';

function getProjectsData() {
  const bizId = session ? session.businessId : '';
  if (!cache.projects) {
    try {
      const raw = localStorage.getItem('br_projects_' + bizId);
      cache.projects = raw ? JSON.parse(raw) : [];
    } catch(e) {
      cache.projects = [];
    }
  }
  return cache.projects || [];
}

function saveProjectsData(list) {
  const bizId = session ? session.businessId : '';
  cache.projects = list || [];
  try {
    localStorage.setItem('br_projects_' + bizId, JSON.stringify(cache.projects));
  } catch(e){}
  if (typeof syncCustomCloudPayload === 'function') {
    syncCustomCloudPayload('[FUTURE_PROJECTS_DATA]', cache.projects);
  }
}

function renderProjectsTab(body) {
  if (!isOwner()) {
    body.innerHTML = `
      <div class="row-card" style="text-align:center;padding:36px 20px;flex-direction:column;align-items:center;margin-top:20px;">
        <div style="font-size:3rem;margin-bottom:12px;">🔒</div>
        <h3 style="margin:0;color:var(--ink);font-size:1.1rem;">Owner Access Only</h3>
        <p style="font-size:0.82rem;color:var(--ink-soft);max-width:340px;margin:8px 0 16px;line-height:1.4;">The Future Projects Hub is private and strictly restricted to the Business Owner.</p>
        <button class="stamp-btn" onclick="window.__setTab('dashboard')">Return to Dashboard</button>
      </div>
    `;
    return;
  }

  const allProjects = getProjectsData();
  const totalCount = allProjects.length;
  const planningCount = allProjects.filter(p => p.status === 'planning').length;
  const inProgressCount = allProjects.filter(p => p.status === 'in_progress').length;
  const completedCount = allProjects.filter(p => p.status === 'completed').length;
  const onHoldCount = allProjects.filter(p => p.status === 'on_hold').length;

  let filtered = allProjects;
  if (projectsStatusFilter !== 'all') {
    filtered = filtered.filter(p => p.status === projectsStatusFilter);
  }
  if (projectsSearchQuery) {
    const q = projectsSearchQuery.toLowerCase().trim();
    filtered = filtered.filter(p => 
      (p.title || '').toLowerCase().includes(q) || 
      (p.category || '').toLowerCase().includes(q) || 
      (p.description || '').toLowerCase().includes(q)
    );
  }

  body.innerHTML = `
    <!-- Executive KPI Summary Cards -->
    <div class="stat-grid" style="margin-bottom:14px;">
      <div class="stat-card">
        <div class="num">${totalCount}</div>
        <div class="label">Total Projects</div>
      </div>
      <div class="stat-card">
        <div class="num" style="color:var(--turmeric-dark);">${planningCount}</div>
        <div class="label">In Planning</div>
      </div>
      <div class="stat-card">
        <div class="num" style="color:var(--blue);">${inProgressCount}</div>
        <div class="label">In Progress</div>
      </div>
      <div class="stat-card">
        <div class="num" style="color:var(--leaf);">${completedCount}</div>
        <div class="label">Completed</div>
      </div>
    </div>

    <!-- Search & Action Toolbar -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;gap:8px;flex-wrap:wrap;">
      <div style="flex:1;min-width:200px;position:relative;">
        <input type="text" class="search-input" placeholder="Search projects by title, category, or notes..." value="${esc(projectsSearchQuery)}" oninput="projectsSearchQuery=this.value;renderProjectsTab(document.getElementById('tabBody'));" style="width:100%;box-sizing:border-box;padding-left:32px;height:36px;font-size:0.8rem;border-radius:8px;border:1px solid var(--paper-line);">
        <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--ink-soft);">${icon('search', 14)}</span>
      </div>
      <button class="stamp-btn" onclick="window.__openAddProjectModal()">+ Create New Project</button>
    </div>

    <!-- Status Filter Pills Bar -->
    <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:14px;scrollbar-width:none;">
      ${[
        { key: 'all', label: `All (${totalCount})` },
        { key: 'planning', label: `📌 Planning (${planningCount})` },
        { key: 'in_progress', label: `🚀 In Progress (${inProgressCount})` },
        { key: 'completed', label: `✅ Completed (${completedCount})` },
        { key: 'on_hold', label: `⏸ On Hold (${onHoldCount})` }
      ].map(tab => `
        <button class="stamp-btn small ${projectsStatusFilter===tab.key ? '' : 'ghost'}" style="white-space:nowrap;padding:4px 10px;font-size:0.75rem;" onclick="projectsStatusFilter='${tab.key}';renderProjectsTab(document.getElementById('tabBody'));">
          ${tab.label}
        </button>
      `).join('')}
    </div>

    <!-- Projects List Grid -->
    ${filtered.length ? filtered.map(proj => {
      const tasks = proj.tasks || [];
      const completedTasks = tasks.filter(t => t.done).length;
      const taskPct = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

      const reminders = proj.reminders || [];

      const statusBadge = proj.status === 'completed'
        ? '<span style="background:var(--leaf-soft);color:var(--leaf);border:1px solid var(--leaf);font-size:0.68rem;font-weight:800;padding:2px 8px;border-radius:999px;">✅ Completed</span>'
        : (proj.status === 'in_progress'
          ? '<span style="background:var(--blue-soft);color:var(--blue);border:1px solid var(--blue);font-size:0.68rem;font-weight:800;padding:2px 8px;border-radius:999px;">🚀 In Progress</span>'
          : (proj.status === 'on_hold'
            ? '<span style="background:var(--brick-soft);color:var(--brick);border:1px solid var(--brick);font-size:0.68rem;font-weight:800;padding:2px 8px;border-radius:999px;">⏸ On Hold</span>'
            : '<span style="background:var(--turmeric-soft);color:var(--turmeric-dark);border:1px solid var(--turmeric);font-size:0.68rem;font-weight:800;padding:2px 8px;border-radius:999px;">📌 Planning</span>'));

      const priorityBadge = proj.priority === 'high'
        ? '<span style="color:var(--brick);font-weight:800;font-size:0.68rem;background:rgba(239,68,68,0.1);padding:1px 6px;border-radius:4px;">🔥 High Priority</span>'
        : (proj.priority === 'medium'
          ? '<span style="color:var(--turmeric-dark);font-weight:700;font-size:0.68rem;background:rgba(245,158,11,0.1);padding:1px 6px;border-radius:4px;">⚡ Medium</span>'
          : '<span style="color:var(--ink-soft);font-size:0.68rem;background:var(--paper-line);padding:1px 6px;border-radius:4px;">Low</span>');

      return `
        <div class="row-card" style="flex-direction:column;align-items:stretch;padding:16px;margin-bottom:14px;background:var(--paper);border:1px solid var(--paper-line);border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <!-- Top Row Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
            <div>
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px;">
                <b style="font-size:0.98rem;color:var(--ink);">${esc(proj.title)}</b>
                ${statusBadge}
                ${priorityBadge}
                ${proj.category ? `<span style="background:var(--paper-line);color:var(--ink-soft);font-size:0.68rem;font-weight:600;padding:1px 7px;border-radius:999px;">${esc(proj.category)}</span>` : ''}
              </div>
              ${proj.description ? `<div style="font-size:0.8rem;color:var(--ink-soft);line-height:1.4;margin-bottom:6px;">${esc(proj.description)}</div>` : ''}
            </div>
            <div style="text-align:right;white-space:nowrap;font-family:'Roboto Mono',monospace;font-size:0.78rem;">
              ${proj.estimated_budget ? `<div style="color:var(--leaf);font-weight:800;font-size:0.88rem;">Est. Budget: ₹${Number(proj.estimated_budget).toLocaleString('en-IN')}</div>` : ''}
              ${proj.target_date ? `<div style="color:var(--ink-soft);font-size:0.72rem;margin-top:2px;">📅 Target: ${proj.target_date}</div>` : ''}
            </div>
          </div>

          <!-- Interactive Sub-Tasks Checklist Section -->
          <div style="background:var(--paper-line);padding:10px 12px;border-radius:8px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:0.75rem;font-weight:700;color:var(--ink);display:inline-flex;align-items:center;gap:4px;">
                ${icon('check', 14)} Project Sub-Tasks &amp; Action Plan (${completedTasks}/${tasks.length})
              </span>
              <button class="stamp-btn small ghost" style="padding:1px 6px;font-size:0.68rem;" onclick="window.__openAddProjectTaskModal('${proj.id}')">+ Add Task</button>
            </div>

            ${tasks.length ? `
              <div class="progress-track" style="height:6px;background:rgba(0,0,0,0.08);border-radius:999px;overflow:hidden;margin-bottom:8px;">
                <div class="progress-fill ${taskPct>=100?'complete':''}" style="width:${taskPct}%;height:100%;border-radius:999px;background:var(--leaf);"></div>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;">
                ${tasks.map(t => `
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;background:var(--paper);padding:4px 8px;border-radius:6px;border:1px solid var(--paper-line);">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:0;">
                      <input type="checkbox" ${t.done ? 'checked' : ''} onchange="window.__toggleProjectTask('${proj.id}', '${t.id}')">
                      <span style="${t.done ? 'text-decoration:line-through;color:var(--ink-soft);' : 'color:var(--ink);font-weight:600;'}">${esc(t.title)}</span>
                      ${t.due_date ? `<span style="font-size:0.68rem;color:var(--ink-soft);font-family:'Roboto Mono',monospace;">(Due: ${t.due_date})</span>` : ''}
                    </label>
                    <button style="background:none;border:none;color:var(--brick);cursor:pointer;padding:2px 4px;font-size:0.72rem;" onclick="window.__deleteProjectTask('${proj.id}', '${t.id}')" title="Delete Task">✕</button>
                  </div>
                `).join('')}
              </div>
            ` : `<div style="font-size:0.72rem;color:var(--ink-soft);font-style:italic;">No tasks added to this project yet.</div>`}
          </div>

          <!-- Milestones & Reminders Section -->
          <div style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2);padding:10px 12px;border-radius:8px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-size:0.75rem;font-weight:700;color:var(--turmeric-dark);display:inline-flex;align-items:center;gap:4px;">
                ${icon('bell', 14)} Milestones &amp; Date Reminders (${reminders.length})
              </span>
              <button class="stamp-btn small ghost" style="padding:1px 6px;font-size:0.68rem;border-color:var(--turmeric);" onclick="window.__openAddProjectReminderModal('${proj.id}')">+ Add Reminder</button>
            </div>

            ${reminders.length ? `
              <div style="display:flex;flex-direction:column;gap:4px;">
                ${reminders.map(r => `
                  <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;background:var(--paper);padding:4px 8px;border-radius:6px;border:1px solid var(--paper-line);">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:0;">
                      <input type="checkbox" ${r.done ? 'checked' : ''} onchange="window.__toggleProjectReminder('${proj.id}', '${r.id}')">
                      <span style="${r.done ? 'text-decoration:line-through;color:var(--ink-soft);' : 'color:var(--ink);font-weight:600;'}">${esc(r.title)}</span>
                    </label>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <span style="font-size:0.68rem;color:var(--turmeric-dark);font-weight:700;font-family:'Roboto Mono',monospace;">🔔 ${r.reminder_date}</span>
                      <button style="background:none;border:none;color:var(--brick);cursor:pointer;padding:2px 4px;font-size:0.72rem;" onclick="window.__deleteProjectReminder('${proj.id}', '${r.id}')" title="Delete Reminder">✕</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `<div style="font-size:0.72rem;color:var(--ink-soft);font-style:italic;">No date reminders set for this project.</div>`}
          </div>

          <!-- Bottom Action Buttons -->
          <div style="display:flex;justify-content:flex-end;align-items:center;gap:6px;padding-top:6px;border-top:1px solid var(--paper-line);">
            <button class="stamp-btn small ghost" style="font-size:0.72rem;padding:3px 8px;" onclick="window.__openAddProjectModal('${proj.id}')">✎ Edit Project</button>
            <button class="stamp-btn small ghost" style="color:var(--brick);border-color:var(--brick);font-size:0.72rem;padding:3px 8px;" onclick="window.__deleteProject('${proj.id}')">🗑 Delete</button>
          </div>
        </div>
      `;
    }).join('') : `
      <div class="empty" style="padding:32px 16px;text-align:center;background:var(--paper);border:1px solid var(--paper-line);border-radius:12px;">
        <div style="font-size:2rem;margin-bottom:8px;">📁</div>
        <b style="color:var(--ink);display:block;margin-bottom:4px;">No Future Projects Found</b>
        <p style="font-size:0.8rem;color:var(--ink-soft);margin-bottom:12px;">Plan and store your future business goals, milestones, and task checklists privately.</p>
        <button class="stamp-btn" onclick="window.__openAddProjectModal()">+ Create Your First Project</button>
      </div>
    `}
    <div id="projectsModalHolder"></div>
  `;
}

window.__openAddProjectModal = function(editId = null) {
  const holder = getModalHolder('projectsModalHolder');
  const list = getProjectsData();
  const existing = editId ? list.find(p => p.id === editId) : null;

  holder.innerHTML = `
    <div class="overlay show" id="projectModalOverlay">
      <div class="modal" style="max-width:480px;width:92%;">
        <h2 style="margin:0 0 12px;display:flex;align-items:center;gap:6px;">
          ${icon('project', 20)} ${existing ? '✎ Edit Future Project' : '➕ Create New Future Project'}
        </h2>
        <input type="hidden" id="projEditId" value="${existing ? existing.id : ''}">

        <div style="display:flex;flex-direction:column;gap:10px;">
          <div>
            <label style="font-size:0.75rem;font-weight:700;color:var(--ink);display:block;margin-bottom:4px;">Project Title *</label>
            <input type="text" id="projTitle" class="search-input" placeholder="e.g. New Branch Launch, Solar Panel Upgrade" value="${existing ? esc(existing.title) : ''}" style="width:100%;box-sizing:border-box;">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <label style="font-size:0.75rem;font-weight:700;color:var(--ink);display:block;margin-bottom:4px;">Category</label>
              <select id="projCategory" class="search-input" style="width:100%;box-sizing:border-box;">
                <option value="Expansion" ${existing && existing.category==='Expansion'?'selected':''}>Business Expansion</option>
                <option value="Infrastructure" ${existing && existing.category==='Infrastructure'?'selected':''}>Infrastructure &amp; Equipment</option>
                <option value="Technology" ${existing && existing.category==='Technology'?'selected':''}>Software &amp; Technology</option>
                <option value="Product Launch" ${existing && existing.category==='Product Launch'?'selected':''}>Product Launch</option>
                <option value="General" ${!existing || existing.category==='General'?'selected':''}>General Goal</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.75rem;font-weight:700;color:var(--ink);display:block;margin-bottom:4px;">Priority</label>
              <select id="projPriority" class="search-input" style="width:100%;box-sizing:border-box;">
                <option value="high" ${existing && existing.priority==='high'?'selected':''}>🔥 High Priority</option>
                <option value="medium" ${!existing || existing.priority==='medium'?'selected':''}>⚡ Medium Priority</option>
                <option value="low" ${existing && existing.priority==='low'?'selected':''}>Low Priority</option>
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div>
              <label style="font-size:0.75rem;font-weight:700;color:var(--ink);display:block;margin-bottom:4px;">Status</label>
              <select id="projStatus" class="search-input" style="width:100%;box-sizing:border-box;">
                <option value="planning" ${!existing || existing.status==='planning'?'selected':''}>📌 Planning</option>
                <option value="in_progress" ${existing && existing.status==='in_progress'?'selected':''}>🚀 In Progress</option>
                <option value="completed" ${existing && existing.status==='completed'?'selected':''}>✅ Completed</option>
                <option value="on_hold" ${existing && existing.status==='on_hold'?'selected':''}>⏸ On Hold</option>
              </select>
            </div>
            <div>
              <label style="font-size:0.75rem;font-weight:700;color:var(--ink);display:block;margin-bottom:4px;">Target Date</label>
              <input type="date" id="projTargetDate" class="search-input" value="${existing ? (existing.target_date||'') : ''}" style="width:100%;box-sizing:border-box;">
            </div>
          </div>

          <div>
            <label style="font-size:0.75rem;font-weight:700;color:var(--ink);display:block;margin-bottom:4px;">Estimated Budget (₹)</label>
            <input type="number" id="projBudget" class="search-input" placeholder="e.g. 150000" value="${existing ? (existing.estimated_budget||'') : ''}" style="width:100%;box-sizing:border-box;">
          </div>

          <div>
            <label style="font-size:0.75rem;font-weight:700;color:var(--ink);display:block;margin-bottom:4px;">Project Vision, Details &amp; Notes</label>
            <textarea id="projDescription" class="search-input" rows="3" placeholder="Add private details, vision, vendor requirements..." style="width:100%;box-sizing:border-box;resize:vertical;font-family:inherit;font-size:0.8rem;"></textarea>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
          <button class="stamp-btn ghost" onclick="getModalHolder('projectsModalHolder').innerHTML=''">Cancel</button>
          <button class="stamp-btn" onclick="window.__saveProject()">Save Project</button>
        </div>
      </div>
    </div>
  `;
  if (existing && existing.description) {
    document.getElementById('projDescription').value = existing.description;
  }
};

window.__saveProject = function() {
  const editId = document.getElementById('projEditId').value;
  const title = document.getElementById('projTitle').value.trim();
  if (!title) {
    alert('Please enter a project title.');
    return;
  }

  const category = document.getElementById('projCategory').value;
  const priority = document.getElementById('projPriority').value;
  const status = document.getElementById('projStatus').value;
  const targetDate = document.getElementById('projTargetDate').value;
  const budget = Number(document.getElementById('projBudget').value || 0);
  const description = document.getElementById('projDescription').value.trim();

  let list = getProjectsData();
  if (editId) {
    list = list.map(p => p.id === editId ? Object.assign({}, p, {
      title, category, priority, status, target_date: targetDate, estimated_budget: budget, description, updated_at: new Date().toISOString()
    }) : p);
  } else {
    list.unshift({
      id: 'proj_' + Date.now(),
      business_id: session.businessId,
      title,
      category,
      priority,
      status,
      target_date: targetDate,
      estimated_budget: budget,
      description,
      tasks: [],
      reminders: [],
      created_at: new Date().toISOString()
    });
  }

  saveProjectsData(list);
  getModalHolder('projectsModalHolder').innerHTML = '';
  renderProjectsTab(document.getElementById('tabBody'));
};

window.__openAddProjectTaskModal = function(projId) {
  const holder = getModalHolder('projectsModalHolder');
  holder.innerHTML = `
    <div class="overlay show">
      <div class="modal" style="max-width:400px;width:90%;">
        <h3 style="margin:0 0 12px;">+ Add Sub-Task to Project</h3>
        <input type="hidden" id="projTaskProjId" value="${projId}">
        
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div>
            <label style="font-size:0.75rem;font-weight:700;color:var(--ink);display:block;margin-bottom:4px;">Task Description *</label>
            <input type="text" id="projTaskTitle" class="search-input" placeholder="e.g. Finalize vendor contract, Get permit" style="width:100%;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:0.75rem;font-weight:700;color:var(--ink);display:block;margin-bottom:4px;">Due Date (Optional)</label>
            <input type="date" id="projTaskDueDate" class="search-input" style="width:100%;box-sizing:border-box;">
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
          <button class="stamp-btn ghost" onclick="getModalHolder('projectsModalHolder').innerHTML=''">Cancel</button>
          <button class="stamp-btn" onclick="window.__saveProjectTask()">Add Task</button>
        </div>
      </div>
    </div>
  `;
};

window.__saveProjectTask = function() {
  const projId = document.getElementById('projTaskProjId').value;
  const title = document.getElementById('projTaskTitle').value.trim();
  const dueDate = document.getElementById('projTaskDueDate').value;
  if (!title) {
    alert('Please enter a task description.');
    return;
  }

  let list = getProjectsData();
  list = list.map(p => {
    if (p.id === projId) {
      const tasks = p.tasks || [];
      tasks.push({
        id: 'ptask_' + Date.now(),
        title,
        due_date: dueDate,
        done: false
      });
      return Object.assign({}, p, { tasks });
    }
    return p;
  });

  saveProjectsData(list);
  getModalHolder('projectsModalHolder').innerHTML = '';
  renderProjectsTab(document.getElementById('tabBody'));
};

window.__openAddProjectReminderModal = function(projId) {
  const holder = getModalHolder('projectsModalHolder');
  holder.innerHTML = `
    <div class="overlay show">
      <div class="modal" style="max-width:400px;width:90%;">
        <h3 style="margin:0 0 12px;">+ Add Milestone Reminder</h3>
        <input type="hidden" id="projRemProjId" value="${projId}">
        
        <div style="display:flex;flex-direction:column;gap:10px;">
          <div>
            <label style="font-size:0.75rem;font-weight:700;color:var(--ink);display:block;margin-bottom:4px;">Reminder Milestone *</label>
            <input type="text" id="projRemTitle" class="search-input" placeholder="e.g. Inspect site progress, Pay advance installment" style="width:100%;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-size:0.75rem;font-weight:700;color:var(--ink);display:block;margin-bottom:4px;">Reminder Date *</label>
            <input type="date" id="projRemDate" class="search-input" value="${todayStr()}" style="width:100%;box-sizing:border-box;">
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px;">
          <button class="stamp-btn ghost" onclick="getModalHolder('projectsModalHolder').innerHTML=''">Cancel</button>
          <button class="stamp-btn" onclick="window.__saveProjectReminder()">Add Reminder</button>
        </div>
      </div>
    </div>
  `;
};

window.__saveProjectReminder = function() {
  const projId = document.getElementById('projRemProjId').value;
  const title = document.getElementById('projRemTitle').value.trim();
  const reminderDate = document.getElementById('projRemDate').value;
  if (!title || !reminderDate) {
    alert('Please enter a milestone title and reminder date.');
    return;
  }

  let list = getProjectsData();
  list = list.map(p => {
    if (p.id === projId) {
      const reminders = p.reminders || [];
      reminders.push({
        id: 'prem_' + Date.now(),
        title,
        reminder_date: reminderDate,
        done: false
      });
      return Object.assign({}, p, { reminders });
    }
    return p;
  });

  saveProjectsData(list);
  getModalHolder('projectsModalHolder').innerHTML = '';
  renderProjectsTab(document.getElementById('tabBody'));
};

window.__toggleProjectTask = function(projId, taskId) {
  let list = getProjectsData();
  list = list.map(p => {
    if (p.id === projId) {
      const tasks = (p.tasks || []).map(t => t.id === taskId ? Object.assign({}, t, { done: !t.done }) : t);
      return Object.assign({}, p, { tasks });
    }
    return p;
  });
  saveProjectsData(list);
  renderProjectsTab(document.getElementById('tabBody'));
};

window.__toggleProjectReminder = function(projId, remId) {
  let list = getProjectsData();
  list = list.map(p => {
    if (p.id === projId) {
      const reminders = (p.reminders || []).map(r => r.id === remId ? Object.assign({}, r, { done: !r.done }) : r);
      return Object.assign({}, p, { reminders });
    }
    return p;
  });
  saveProjectsData(list);
  renderProjectsTab(document.getElementById('tabBody'));
};

window.__deleteProjectTask = function(projId, taskId) {
  let list = getProjectsData();
  list = list.map(p => {
    if (p.id === projId) {
      const tasks = (p.tasks || []).filter(t => t.id !== taskId);
      return Object.assign({}, p, { tasks });
    }
    return p;
  });
  saveProjectsData(list);
  renderProjectsTab(document.getElementById('tabBody'));
};

window.__deleteProjectReminder = function(projId, remId) {
  let list = getProjectsData();
  list = list.map(p => {
    if (p.id === projId) {
      const reminders = (p.reminders || []).filter(r => r.id !== remId);
      return Object.assign({}, p, { reminders });
    }
    return p;
  });
  saveProjectsData(list);
  renderProjectsTab(document.getElementById('tabBody'));
};

window.__deleteProject = function(projId) {
  if (!confirm('Are you sure you want to delete this future project record?')) return;
  let list = getProjectsData();
  list = list.filter(p => p.id !== projId);
  saveProjectsData(list);
  renderProjectsTab(document.getElementById('tabBody'));
};

window.__openAddPriceListItemModal = function(editId = null) {
  const holder = getModalHolder('priceListModalHolder');
  const existing = editId ? (cache.priceList || []).find(i => i.id === editId) : null;

  holder.innerHTML = `
    <div class="overlay show" id="addPriceListItemModal">
      <div class="modal" style="max-width:440px;">
        <h2>${existing ? '✎ Edit Product Price & Scheme' : '➕ Add Product Price Item'}</h2>
        <input type="hidden" id="plEditId" value="${existing ? existing.id : ''}">
        
        <label>Product Name *</label>
        <input type="text" id="plProductName" placeholder="e.g. Premium Detergent 1kg" value="${existing ? esc(existing.product_name) : ''}" required>
        
        <label>Beat / Route Name *</label>
        <input type="text" id="plBeatName" placeholder="e.g. Downtown Beat, Central Market Beat" value="${existing ? esc(existing.beat_name) : 'Downtown Beat'}" required>
        
        <div style="display:flex;gap:12px;">
          <div style="flex:1;">
            <label>MRP Price (₹) *</label>
            <input type="number" step="0.01" id="plMrpPrice" placeholder="160" value="${existing ? existing.mrp_price : ''}" required>
          </div>
          <div style="flex:1;">
            <label>Scheme Price (₹) *</label>
            <input type="number" step="0.01" id="plSchemePrice" placeholder="142" value="${existing ? existing.scheme_price : ''}" required>
          </div>
        </div>

        <div class="modal-actions" style="margin-top:16px;">
          <button class="stamp-btn ghost" onclick="window.__closeCurrentModal(this)">Cancel</button>
          <button class="stamp-btn" onclick="window.__savePriceListItem()">Save Product Price</button>
        </div>
      </div>
    </div>
  `;
};

window.__editPriceListItem = function(id) {
  window.__openAddPriceListItemModal(id);
};

window.__savePriceListItem = function() {
  const editId = document.getElementById('plEditId').value;
  const name = document.getElementById('plProductName').value.trim();
  const beat = document.getElementById('plBeatName').value.trim();
  const mrp = parseFloat(document.getElementById('plMrpPrice').value || '0');
  const scheme = parseFloat(document.getElementById('plSchemePrice').value || '0');

  if (!name) { alert('Please enter the Product Name'); return; }
  if (!beat) { alert('Please enter the Beat / Route Name'); return; }
  if (mrp <= 0) { alert('Please enter a valid MRP Price'); return; }

  const list = getPriceListData();
  if (editId) {
    const item = list.find(i => i.id === editId);
    if (item) {
      item.product_name = name;
      item.beat_name = beat;
      item.mrp_price = mrp;
      item.scheme_price = scheme || mrp;
    }
  } else {
    list.push({
      id: 'pl_' + Date.now(),
      product_name: name,
      beat_name: beat,
      mrp_price: mrp,
      scheme_price: scheme || mrp,
      created_at: todayStr()
    });
  }

  cache.priceList = list;
  savePriceListData(list);
  document.getElementById('addPriceListItemModal').classList.remove('show');
  window.showToast('✅ Price list updated successfully!', 'success');
  renderTabBody();
};

window.__deletePriceListItem = function(id) {
  if (!confirm('Are you sure you want to delete this product from the price list?')) return;
  const list = getPriceListData().filter(i => i.id !== id);
  cache.priceList = list;
  savePriceListData(list);
  window.showToast('🗑 Product removed from price list.', 'info');
  renderTabBody();
};


/* ================================================================
   FEATURE: SALES TREND CHART
   Pure SVG polyline — shows last 30 days / 12 weeks / 12 months
   ================================================================ */
let trendChartMode = 'daily';

window.__setTrendChartMode = function(mode) {
  trendChartMode = mode;
  renderTabBody();
};

function buildSalesTrendChartHtml() {
  if (!isOwner()) return ''; // SECURITY: Never reveal Sales Trend Graph to Manager or Staff roles
  const today = new Date();
  const buckets = [];

  if (trendChartMode === 'daily') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = localDateStr(d);
      const val = cache.sales.filter(s => s.date === key).reduce((sum,s) => sum + Number(s.order_value||0), 0)
                + (cache.dailyAccounts||[]).filter(a => a.date === key).reduce((sum,a) => sum + Number(a.total_sales||0), 0);
      buckets.push({ label: d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}), val });
    }
  } else if (trendChartMode === 'weekly') {
    for (let i = 11; i >= 0; i--) {
      const anchor = new Date(today); anchor.setDate(anchor.getDate() - i*7);
      const wStart = getWeekStartDate(anchor);
      const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate()+6);
      const sK = localDateStr(wStart), eK = localDateStr(wEnd);
      const val = cache.sales.filter(s => s.date >= sK && s.date <= eK).reduce((sum,s) => sum + Number(s.order_value||0), 0)
                + (cache.dailyAccounts||[]).filter(a => a.date >= sK && a.date <= eK).reduce((sum,a) => sum + Number(a.total_sales||0), 0);
      buckets.push({ label: wStart.toLocaleDateString('en-IN',{day:'numeric',month:'short'}), val });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth()-i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const val = cache.sales.filter(s => s.date.startsWith(key)).reduce((sum,s) => sum + Number(s.order_value||0), 0)
                + (cache.dailyAccounts||[]).filter(a => a.date.startsWith(key)).reduce((sum,a) => sum + Number(a.total_sales||0), 0);
      buckets.push({ label: d.toLocaleDateString('en-IN',{month:'short',year:'2-digit'}), val });
    }
  }

  const maxVal     = Math.max(1, ...buckets.map(b => b.val));
  const totalPeriod = buckets.reduce((s,b) => s+b.val, 0);
  const avgPeriod   = buckets.length ? totalPeriod/buckets.length : 0;
  const n = buckets.length;
  const W = 600, H = 130, pL=10, pR=10, pT=16, pB=32;
  const cW = W-pL-pR, cH = H-pT-pB;

  const pts = buckets.map((b,i) => ({
    x: pL + (n<2 ? cW/2 : (i/(n-1))*cW),
    y: pT + cH - (b.val/maxVal)*cH,
    ...b
  }));

  const polyline = pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${pts[0].x.toFixed(1)},${(pT+cH).toFixed(1)} ${pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} ${pts[n-1].x.toFixed(1)},${(pT+cH).toFixed(1)}`;
  const avgY = pT+cH-(avgPeriod/maxVal)*cH;
  const showIdx = new Set([0, Math.floor(n/3), Math.floor(2*n/3), n-1]);

  const fmtVal = v => v>=100000 ? `\u20b9${(v/100000).toFixed(1)}L` : v>=1000 ? `\u20b9${(v/1000).toFixed(1)}K` : `\u20b9${v.toFixed(0)}`;

  const dots = pts.map((p,i) => `<circle class="trend-chart-dot" style="--dot-idx:${i};" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#0F172A" stroke="#FFFFFF" stroke-width="2"
    data-tip="${esc(p.label)}: ${fmtVal(p.val)}"
    onmouseenter="window.__showTrendTip(event,this)" onmouseleave="window.__hideTrendTip()"
    ontouchstart="window.__showTrendTip(event,this)"/>`).join('');

  const xlabels = pts.map((p,i) => showIdx.has(i)
    ? `<text x="${p.x.toFixed(1)}" y="${(pT+cH+18).toFixed(1)}" text-anchor="middle" font-size="8" fill="var(--ink-soft)" font-family="'Roboto Mono',monospace">${esc(p.label)}</text>`
    : '').join('');

  // Calculate period percentage growth vs previous period for Green/Red Up/Down Trend Badges
  const halfN = Math.floor(n / 2);
  const firstHalfSum = buckets.slice(0, halfN).reduce((s,b) => s + b.val, 0);
  const secondHalfSum = buckets.slice(halfN).reduce((s,b) => s + b.val, 0);
  let trendPctChange = 0;
  let trendBadgeHtml = '';
  if (firstHalfSum > 0) {
    trendPctChange = Math.round(((secondHalfSum - firstHalfSum) / firstHalfSum) * 100);
  } else if (secondHalfSum > 0) {
    trendPctChange = 100;
  }

  if (trendPctChange > 0) {
    trendBadgeHtml = `<span style="display:inline-flex;align-items:center;gap:2px;padding:2px 7px;border-radius:999px;background:var(--leaf-soft);color:var(--leaf);font-size:0.7rem;font-weight:800;margin-left:6px;" title="Sales Growth vs Previous Period">▲ +${trendPctChange}%</span>`;
  } else if (trendPctChange < 0) {
    trendBadgeHtml = `<span style="display:inline-flex;align-items:center;gap:2px;padding:2px 7px;border-radius:999px;background:var(--brick-soft);color:var(--brick);font-size:0.7rem;font-weight:800;margin-left:6px;" title="Sales Decline vs Previous Period">▼ ${trendPctChange}%</span>`;
  } else {
    trendBadgeHtml = `<span style="display:inline-flex;align-items:center;gap:2px;padding:2px 7px;border-radius:999px;background:var(--paper-line);color:var(--ink-soft);font-size:0.7rem;font-weight:700;margin-left:6px;">▶ 0%</span>`;
  }

  return `
  <div class="trend-chart-wrap">
    <div class="trend-chart-header">
      <div>
        <div class="trend-chart-title">📈 Sales Trend</div>
        <div style="display:flex;align-items:center;gap:4px;margin-top:2px;">
          <span style="font-size:0.95rem;font-weight:800;color:var(--ink);font-family:'Roboto Mono',monospace;">${fmtVal(totalPeriod)}</span>
          <span style="font-size:0.68rem;font-weight:600;color:var(--ink-soft);font-family:'Roboto Mono',monospace;">${fmtVal(avgPeriod)} avg</span>
          ${trendBadgeHtml}
        </div>
      </div>
      <div class="trend-chart-tabs">
        <button class="${trendChartMode==='daily'?'active':''}" onclick="window.__setTrendChartMode('daily')">30D</button>
        <button class="${trendChartMode==='weekly'?'active':''}" onclick="window.__setTrendChartMode('weekly')">12W</button>
        <button class="${trendChartMode==='monthly'?'active':''}" onclick="window.__setTrendChartMode('monthly')">12M</button>
      </div>
    </div>
    <div style="position:relative;">
      <svg class="trend-chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0284C7" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <polygon class="trend-chart-area" points="${area}" fill="url(#trendGrad)"/>
        <line x1="${pL}" y1="${avgY.toFixed(1)}" x2="${W-pR}" y2="${avgY.toFixed(1)}" stroke="var(--ink-soft)" stroke-width="1" stroke-dasharray="4 3" opacity="0.45"/>
        <polyline class="trend-chart-line" points="${polyline}" fill="none" stroke="#0284C7" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}${xlabels}
      </svg>
      <div class="trend-tooltip" id="trendTooltip"></div>
    </div>
  </div>`;
}

window.__showTrendTip = function(e, el) {
  const tip = document.getElementById('trendTooltip');
  if (!tip) return;
  tip.textContent = el.getAttribute('data-tip');
  tip.classList.add('show');
  const wrap = el.closest('.trend-chart-wrap');
  const svg  = el.closest('svg');
  if (!wrap || !svg) return;
  const wRect = wrap.getBoundingClientRect();
  const sRect = svg.getBoundingClientRect();
  const vb    = svg.viewBox.baseVal;
  const scX   = sRect.width / vb.width;
  const scY   = sRect.height / vb.height;
  const cx    = parseFloat(el.getAttribute('cx'));
  const cy    = parseFloat(el.getAttribute('cy'));
  tip.style.left = `${Math.max(4, Math.min(sRect.left - wRect.left + cx*scX - 40, wRect.width - 90))}px`;
  tip.style.top  = `${sRect.top - wRect.top + cy*scY - 36}px`;
};
window.__hideTrendTip = function() {
  const t = document.getElementById('trendTooltip');
  if (t) t.classList.remove('show');
};


/* ================================================================
   FEATURE: SALARY SLIP GENERATOR (Print-to-PDF)
   ================================================================ */
window.__generateSalarySlip = function(salaryId) {
  const sa = cache.salaries.find(s => s.id === salaryId);
  if (!sa) { window.showToast('Salary record not found.', 'error'); return; }

  const staff = cache.staff.find(s => s.id === sa.staff_id) || {};
  const advances = (typeof getSalaryAdvances === 'function' ? getSalaryAdvances() : [])
    .filter(a => a.staff_id === sa.staff_id && sa.paid_date && (a.date||'').slice(0,7) === sa.paid_date.slice(0,7));
  const totalAdv  = advances.reduce((s,a) => s + Number(a.amount||0), 0);
  const gross     = Number(sa.amount||0) + totalAdv;
  const net       = Number(sa.amount||0);

  let area = document.getElementById('salarySlipPrintArea');
  if (!area) {
    area = document.createElement('div');
    area.id = 'salarySlipPrintArea';
    area.style.cssText = 'display:none;position:fixed;inset:0;background:#fff;z-index:99999;padding:32px;overflow:auto;';
    document.body.appendChild(area);
  }

  area.innerHTML = `
    <div style="max-width:520px;margin:0 auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <button onclick="document.getElementById('salarySlipPrintArea').style.display='none';"
          style="background:var(--ink);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-family:'Roboto Mono',monospace;font-weight:700;font-size:0.78rem;cursor:pointer;">&#x2715; CLOSE</button>
        <button onclick="window.print()"
          style="background:var(--leaf);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-family:'Roboto Mono',monospace;font-weight:700;font-size:0.78rem;cursor:pointer;">\ud83d\uddb8 PRINT / SAVE PDF</button>
      </div>
      <div class="salary-slip">
        <div class="salary-slip-header">
          <h2>${esc(session.businessName||'Business Register')}</h2>
          <p>SALARY SLIP &mdash; ${(sa.paid_date||'').slice(0,7)}</p>
        </div>
        <div class="salary-slip-row"><span class="label">EMPLOYEE</span><span class="value">${esc(staff.name||staffName(sa.staff_id))}</span></div>
        <div class="salary-slip-row"><span class="label">ROLE</span><span class="value">${esc(staff.role||'&mdash;')}</span></div>
        <div class="salary-slip-row"><span class="label">PAYMENT DATE</span><span class="value">${sa.paid_date||'&mdash;'}</span></div>
        <div class="salary-slip-row"><span class="label">SLIP ID</span><span class="value">${(sa.id||'').slice(0,12).toUpperCase()}</span></div>
        <div style="height:10px;"></div>
        <div class="salary-slip-row"><span class="label">GROSS SALARY</span><span class="value">\u20b9${gross.toFixed(2)}</span></div>
        ${totalAdv > 0 ? `<div class="salary-slip-row"><span class="label">ADVANCE DEDUCTION</span><span class="value" style="color:var(--brick);">- \u20b9${totalAdv.toFixed(2)}</span></div>` : ''}
        ${sa.notes ? `<div class="salary-slip-row"><span class="label">NOTES</span><span class="value">${esc(sa.notes)}</span></div>` : ''}
        <div class="salary-slip-row total"><span class="label">NET SALARY PAID</span><span class="value" style="color:var(--leaf);">\u20b9${net.toFixed(2)}</span></div>
        <div style="margin-top:24px;padding-top:14px;border-top:1px dashed var(--paper-line);font-size:0.65rem;color:var(--ink-soft);text-align:center;">
          Generated by Business Register &bull; ${new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}
        </div>
      </div>
    </div>`;

  area.style.display = 'block';
  window.showToast('\ud83d\udcc4 Salary slip ready \u2014 tap Print / Save PDF', 'success');
};


/* ================================================================
   FEATURE: WEEKLY AUTO-REPORT EMAIL
   ================================================================ */
function buildWeeklyEmailReportHtml() {
  const sentKey = `br_weekly_email_${session.businessId}`;
  const lastSent = localStorage.getItem(sentKey) || '';
  const todayD = new Date();
  const weekMonday = new Date(todayD); weekMonday.setDate(todayD.getDate() - ((todayD.getDay()||7)-1));
  const thisWeek = localDateStr(weekMonday);
  const alreadySent = lastSent === thisWeek;

  return `
  <div class="row-card" style="flex-direction:column;align-items:stretch;margin-top:8px;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
      <span style="font-size:1.3rem;">\ud83d\udce7</span>
      <div>
        <div style="font-weight:700;font-size:0.82rem;color:var(--ink);">Weekly Summary Email</div>
        <div style="font-size:0.68rem;color:var(--ink-soft);">One-tap report: sales, attendance, tasks &amp; top performers</div>
      </div>
    </div>
    <button class="email-report-btn ${alreadySent?'sent':''}" onclick="window.__sendWeeklyEmailReport()">
      ${alreadySent ? '\u2705 Report Sent This Week \u2014 Send Again?' : '\ud83d\udce7 Send Weekly Report to Email'}
    </button>
  </div>`;
}

window.__sendWeeklyEmailReport = function() {
  const today = new Date();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
  const sKey = localDateStr(weekStart), eKey = localDateStr(today);

  const salesW   = cache.sales.filter(s => s.date >= sKey && s.date <= eKey);
  const salesTot = salesW.reduce((s,e) => s + Number(e.order_value||0), 0);
  const attW     = cache.attendance.filter(a => a.date >= sKey && a.date <= eKey && a.status==='present');
  const attDays  = new Set(attW.map(a=>a.date)).size;
  const staffPres = new Set(attW.map(a=>a.staff_id)).size;
  const tasksW   = cache.tasks.filter(t => (t.created_at||'').slice(0,10) >= sKey);
  const tasksDone = tasksW.filter(t => t.status==='done').length;
  const ptsW     = cache.points.filter(p => p.date >= sKey && p.date <= eKey);
  const ptsTot   = ptsW.reduce((s,p) => s + Number(p.points||0), 0);

  const byStaff = {};
  salesW.forEach(s => { byStaff[s.staff_id] = (byStaff[s.staff_id]||0)+Number(s.order_value||0); });
  const top = Object.entries(byStaff).sort((a,b)=>b[1]-a[1])[0];
  const topText = top ? `${staffName(top[0])} (Rs.${Number(top[1]).toFixed(0)})` : 'N/A';

  const accW   = (cache.dailyAccounts||[]).filter(a => a.date >= sKey && a.date <= eKey);
  const accSal = accW.reduce((s,a)=>s+Number(a.total_sales||0),0);
  const accExp = accW.reduce((s,a)=>s+Number(a.expenses||0),0);
  const accVen = accW.reduce((s,a)=>s+Number(a.vendors||0),0);

  const range = `${weekStart.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} - ${today.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}`;

  const subj = encodeURIComponent(`Weekly Report: ${session.businessName} (${range})`);
  const bodyText =
`WEEKLY BUSINESS REPORT
${session.businessName}
Period: ${range}
==================================================

SALES
  Total Sales        : Rs.${salesTot.toFixed(0)}
  No. of Entries     : ${salesW.length}
  Top Seller         : ${topText}

DAILY ACCOUNTS
  Revenue            : Rs.${accSal.toFixed(0)}
  Expenses           : Rs.${accExp.toFixed(0)}
  Vendor Payments    : Rs.${accVen.toFixed(0)}
  Net                : Rs.${(accSal-accExp-accVen).toFixed(0)}

ATTENDANCE
  Days With Activity : ${attDays}
  Staff Present      : ${staffPres} / ${cache.staff.length}

TASKS
  Created This Week  : ${tasksW.length}
  Completed          : ${tasksDone}

INCENTIVE POINTS    : ${ptsTot} pts awarded this week

==================================================
Generated by Business Register
${new Date().toLocaleString('en-IN')}`;

  const mailto = `mailto:?subject=${subj}&body=${encodeURIComponent(bodyText)}`;

  if (mailto.length < 8000) {
    window.open(mailto);
  } else {
    navigator.clipboard.writeText(bodyText)
      .then(() => window.showToast('\ud83d\udccb Report copied to clipboard! Paste it in your email app.', 'success'))
      .catch(() => window.showToast('Report generated. Please copy the text manually.', 'info'));
  }

  // Track sent date
  const todayD2 = new Date();
  const wMon = new Date(todayD2); wMon.setDate(todayD2.getDate() - ((todayD2.getDay()||7)-1));
  localStorage.setItem(`br_weekly_email_${session.businessId}`, localDateStr(wMon));
  setTimeout(() => renderTabBody(), 800);
  window.showToast('📧 Opening email with weekly report…', 'success');
};


/* ---------------- 🏢 OFFICE LOGS (CASH ENTRY & WITHDRAWAL HISTORY) ---------------- */
let officeLogsSearchQuery = '';
let officeLogsTypeFilter = 'all';
let isOfficeLogsHistoryCollapsed = false;
let officeLogsExpandedItems = new Set();

window.__toggleOfficeLogsHistoryCollapse = function() {
  isOfficeLogsHistoryCollapsed = !isOfficeLogsHistoryCollapsed;
  renderTabBody();
};

window.__toggleOfficeLogItemExpand = function(id) {
  if (officeLogsExpandedItems.has(id)) {
    officeLogsExpandedItems.delete(id);
  } else {
    officeLogsExpandedItems.add(id);
  }
  renderTabBody();
};

window.__toggleAllOfficeLogsExpand = function(expand) {
  const logs = getOfficeLogsData();
  if (expand) {
    logs.forEach(i => officeLogsExpandedItems.add(i.id));
  } else {
    officeLogsExpandedItems.clear();
  }
  renderTabBody();
};

function getOfficeLogsData() {
  if (!cache.officeLogs) {
    if (!session || !session.businessId) cache.officeLogs = [];
    else {
      try {
        const raw = localStorage.getItem('br_office_logs_' + session.businessId);
        cache.officeLogs = raw ? JSON.parse(raw) : [];
      } catch(e) { cache.officeLogs = []; }
    }
  }
  return cache.officeLogs || [];
}

async function saveOfficeLogsData(data) {
  cache.officeLogs = data || [];
  if (session && session.businessId) {
    try {
      localStorage.setItem('br_office_logs_' + session.businessId, JSON.stringify(cache.officeLogs));
    } catch(e){}
  }
  if (typeof syncCustomCloudPayload === 'function') {
    await syncCustomCloudPayload('[OFFICE_LOGS_DATA]', cache.officeLogs);
  }
}

window.__onOfficeLogsSearch = function(val) {
  officeLogsSearchQuery = val || '';
  renderTabBody();
};

window.__onOfficeLogsTypeFilter = function(val) {
  officeLogsTypeFilter = val || 'all';
  renderTabBody();
};

window.__toggleOfficeLogCheck = function(id) {
  const logs = getOfficeLogsData();
  const item = logs.find(i => i.id === id);
  if (!item) return;
  item.checked = !item.checked;
  saveOfficeLogsData(logs);
  window.showToast(item.checked ? '☑️ Entry marked as Verified!' : '☐ Entry marked as Unchecked', item.checked ? 'success' : 'info');
  renderTabBody();
};

window.__openOfficeLogModal = function(editId) {
  const logs = getOfficeLogsData();
  const item = editId ? logs.find(i => i.id === editId) : null;
  const isEdit = !!item;
  const today = todayStr();
  const curTime = new Date().toTimeString().slice(0, 5);

  const html = `
    <div class="overlay show" onclick="if(event.target===this) window.__closeCurrentModal(this)">
      <div class="modal" style="max-width:440px;width:90%;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="margin:0;display:inline-flex;align-items:center;gap:6px;">${icon('building', 18)} ${isEdit ? 'Edit Office Cash Log' : 'Record Office Cash Entry'}</h3>
          <button class="stamp-btn small ghost" onclick="window.__closeCurrentModal(this)">✕</button>
        </div>
        <form onsubmit="event.preventDefault(); window.__saveOfficeLog('${editId || ''}', this);">
          <div style="margin-bottom:12px;">
            <label style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:6px;">LOG TYPE</label>
            <div style="display:flex;gap:10px;">
              <label style="flex:1;display:flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid var(--paper-line);border-radius:6px;cursor:pointer;background:var(--paper);">
                <input type="radio" name="log_type" value="deposit" ${(!item || item.type==='deposit')?'checked':''}>
                <span style="font-size:0.82rem;font-weight:700;color:var(--leaf);display:inline-flex;align-items:center;gap:4px;">${icon('inbox', 14)} Cash In (Added)</span>
              </label>
              <label style="flex:1;display:flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid var(--paper-line);border-radius:6px;cursor:pointer;background:var(--paper);">
                <input type="radio" name="log_type" value="withdrawal" ${item && item.type==='withdrawal'?'checked':''}>
                <span style="font-size:0.82rem;font-weight:700;color:var(--brick);display:inline-flex;align-items:center;gap:4px;">${icon('outbox', 14)} Cash Out (Withdrawn)</span>
              </label>
            </div>
          </div>
          <div style="margin-bottom:12px;">
            <label style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:4px;">AMOUNT (₹) *</label>
            <input type="number" step="any" name="amount" placeholder="e.g. 5000" value="${item ? item.amount : ''}" required style="width:100%;box-sizing:border-box;font-family:'Roboto Mono',monospace;font-size:1rem;font-weight:700;">
          </div>
          <div style="display:flex;gap:10px;margin-bottom:12px;">
            <div style="flex:1;">
              <label style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:4px;">DATE</label>
              <input type="date" name="date" value="${item ? item.date : today}" required style="width:100%;box-sizing:border-box;font-size:0.82rem;">
            </div>
            <div style="flex:1;">
              <label style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:4px;">TIME</label>
              <input type="time" name="time" value="${item ? (item.time || curTime) : curTime}" required style="width:100%;box-sizing:border-box;font-size:0.82rem;">
            </div>
          </div>
          <div style="margin-bottom:12px;">
            <label style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:4px;">REASON / REMARKS *</label>
            <textarea name="reason" rows="2" placeholder="e.g. Received cash payment / Bank withdrawal for office expenses" required style="width:100%;box-sizing:border-box;font-size:0.85rem;">${item ? esc(item.reason) : ''}</textarea>
          </div>
          <div style="margin-bottom:16px;">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.82rem;font-weight:600;color:var(--ink);">
              <input type="checkbox" name="checked" ${(!item || item.checked)?'checked':''}>
              Mark as Verified / Checked
            </label>
          </div>
          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <button type="button" class="stamp-btn ghost" onclick="window.__closeCurrentModal(this)">Cancel</button>
            <button type="submit" class="stamp-btn">💾 Save Office Log</button>
          </div>
        </form>
      </div>
    </div>
  `;
  getModalHolder('taskModalHolder').innerHTML = html;
};

window.__saveOfficeLog = async function(editId, form) {
  const type = form.log_type.value || 'deposit';
  const amount = Number(form.amount.value || 0);
  const date = form.date.value || todayStr();
  const time = form.time.value || new Date().toTimeString().slice(0, 5);
  const reason = (form.reason.value || '').trim();
  const checked = !!form.checked.checked;

  if (amount <= 0 || !reason) {
    window.showToast('Please enter a valid amount and reason.', 'warning');
    return;
  }

  const logs = getOfficeLogsData();
  const isEdit = !!editId;
  if (editId) {
    const idx = logs.findIndex(i => i.id === editId);
    if (idx !== -1) {
      logs[idx].type = type;
      logs[idx].amount = amount;
      logs[idx].date = date;
      logs[idx].time = time;
      logs[idx].reason = reason;
      logs[idx].checked = checked;
    }
  } else {
    logs.unshift({
      id: 'ofl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: type,
      amount: amount,
      date: date,
      time: time,
      reason: reason,
      checked: checked,
      logged_by: session ? session.name : 'Office Staff',
      staff_id: session ? session.staffId : ''
    });
  }

  await saveOfficeLogsData(logs);
  getModalHolder('taskModalHolder').innerHTML = '';
  window.showToast(isEdit ? 'Office log updated & synced!' : '🏢 Office Cash Log recorded & synced to Cloud!', 'success');
  renderTabBody();
};

window.__deleteOfficeLog = function(id) {
  if (!confirm('Are you sure you want to delete this office log entry?')) return;
  let logs = getOfficeLogsData();
  logs = logs.filter(i => i.id !== id);
  saveOfficeLogsData(logs);
  window.showToast('Office log deleted', 'info');
  renderTabBody();
};

function renderOfficeLogsTab(body) {
  const logs = getOfficeLogsData();

  // Calculate totals
  const totalAdded = logs.filter(i => i.type === 'deposit').reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalWithdrawn = logs.filter(i => i.type === 'withdrawal').reduce((s, i) => s + Number(i.amount || 0), 0);
  const netCash = totalAdded - totalWithdrawn;
  const checkedCount = logs.filter(i => i.checked).length;

  // Filter logs
  const filtered = logs.filter(i => {
    const q = officeLogsSearchQuery.toLowerCase().trim();
    const matchesSearch = !q || (i.reason || '').toLowerCase().includes(q) || (i.logged_by || '').toLowerCase().includes(q) || (i.date || '').includes(q);
    
    let matchesType = true;
    if (officeLogsTypeFilter === 'deposit') matchesType = i.type === 'deposit';
    else if (officeLogsTypeFilter === 'withdrawal') matchesType = i.type === 'withdrawal';
    else if (officeLogsTypeFilter === 'unchecked') matchesType = !i.checked;
    else if (officeLogsTypeFilter === 'checked') matchesType = i.checked;

    return matchesSearch && matchesType;
  });

  body.innerHTML = `
    <!-- Top Action & Header Bar -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
      <h3 style="margin:0;font-size:0.95rem;color:var(--ink);display:inline-flex;align-items:center;gap:6px;">
        ${icon('building', 18)} Office Cash Ledger
      </h3>
      <button class="stamp-btn small" onclick="window.__openOfficeLogModal()">${icon('plus', 14)} Log Cash Entry</button>
    </div>

    <!-- Top Summary Stat Cards Grid -->
    <div class="stat-grid" style="margin-bottom:16px;">
      <div class="stat-card" style="border-left:4px solid var(--leaf);">
        <div class="num" style="color:${netCash>=0?'var(--leaf)':'var(--brick)'}">₹${netCash.toLocaleString('en-IN')}</div>
        <div class="label">Net Office Cash in Hand</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--leaf);">
        <div class="num" style="color:var(--leaf);">+ ₹${totalAdded.toLocaleString('en-IN')}</div>
        <div class="label">Total Cash Added</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--brick);">
        <div class="num" style="color:var(--brick);">- ₹${totalWithdrawn.toLocaleString('en-IN')}</div>
        <div class="label">Total Cash Withdrawn</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--turmeric);">
        <div class="num">${checkedCount} / ${logs.length}</div>
        <div class="label">Verified / Checked Entries</div>
      </div>
    </div>

    <!-- Controls & Filter Bar -->
    <div class="row-card" style="flex-wrap:wrap;gap:10px;align-items:center;padding:12px;margin-bottom:16px;">
      <div style="flex:1;min-width:160px;">
        <input type="text" placeholder="Search reason, date, or staff..." value="${esc(officeLogsSearchQuery)}" oninput="window.__onOfficeLogsSearch(this.value)" style="width:100%;box-sizing:border-box;font-size:0.82rem;">
      </div>
      <div style="flex:0 0 160px;">
        <select onchange="window.__onOfficeLogsTypeFilter(this.value)" style="width:100%;box-sizing:border-box;font-size:0.82rem;">
          <option value="all" ${officeLogsTypeFilter==='all'?'selected':''}>All Entries (${logs.length})</option>
          <option value="deposit" ${officeLogsTypeFilter==='deposit'?'selected':''}>Cash Added (+)</option>
          <option value="withdrawal" ${officeLogsTypeFilter==='withdrawal'?'selected':''}>Cash Withdrawn (-)</option>
          <option value="unchecked" ${officeLogsTypeFilter==='unchecked'?'selected':''}>Unchecked Only</option>
          <option value="checked" ${officeLogsTypeFilter==='checked'?'selected':''}>Checked Only</option>
        </select>
      </div>
    </div>

    <!-- History Section Header with Collapse / Expand Controls -->
    <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:6px;">
      <span style="display:inline-flex;align-items:center;gap:6px;">
        ${icon('building', 16)} Office Cash History Logs (${filtered.length} Entries)
      </span>
      <div style="display:flex;align-items:center;gap:6px;">
        <button class="stamp-btn small ghost" style="font-size:0.72rem;padding:2px 7px;" onclick="window.__toggleAllOfficeLogsExpand(${officeLogsExpandedItems.size !== filtered.length})">
          ${officeLogsExpandedItems.size === filtered.length ? '⯅ Collapse All Details' : '⯆ Expand All Details'}
        </button>
        <button class="stamp-btn small ghost" style="font-size:0.72rem;padding:2px 7px;" onclick="window.__toggleOfficeLogsHistoryCollapse()">
          ${isOfficeLogsHistoryCollapsed ? '⯆ Show History Section' : '⯅ Hide History Section'}
        </button>
      </div>
    </div>

    ${!isOfficeLogsHistoryCollapsed ? `
      <!-- Mobile Card List View (< 640px) -->
      <div class="mobile-only" style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">
        ${filtered.length ? filtered.map(item => {
          const isDep = item.type === 'deposit';
          const isExpanded = officeLogsExpandedItems.has(item.id);
          return `
            <div class="row-card" style="flex-direction:column;align-items:stretch;padding:10px 12px;margin:0;border-left:4px solid ${isDep?'var(--leaf)':'var(--brick)'};">
              <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="window.__toggleOfficeLogItemExpand('${item.id}')">
                <div style="display:flex;align-items:center;gap:6px;overflow:hidden;flex:1;">
                  <span style="font-size:0.72rem;color:var(--ink-soft);">${isExpanded ? '⯆' : '⯈'}</span>
                  <div>
                    <span style="font-size:0.72rem;font-weight:700;color:var(--ink-soft);font-family:'Roboto Mono',monospace;">📅 ${item.date}</span>
                    <b style="color:var(--ink);font-size:0.85rem;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">${esc(item.reason)}</b>
                  </div>
                </div>
                <b style="font-family:'Roboto Mono',monospace;font-size:0.9rem;color:${isDep?'var(--leaf)':'var(--brick)'};flex-shrink:0;">
                  ${isDep ? '+' : '-'} ₹${Number(item.amount||0).toLocaleString('en-IN')}
                </b>
              </div>

              ${isExpanded ? `
                <div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;border-top:1px solid var(--paper-line);margin-top:8px;">
                  <span style="font-size:0.75rem;color:var(--ink-soft);">Logged by: <b>${esc(item.logged_by || 'Staff')}</b> ${item.time ? '· ' + item.time : ''}</span>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <button class="stamp-btn small ${item.checked?'':'ghost'}" style="padding:2px 6px;font-size:0.72rem;${item.checked?'background:var(--leaf-soft);color:var(--leaf);border-color:var(--leaf);':''}" onclick="window.__toggleOfficeLogCheck('${item.id}')">
                      ${item.checked ? '☑ Verified' : '☐ Check'}
                    </button>
                    ${isManagerPlus() ? `
                      <button class="stamp-btn small ghost" style="padding:2px 5px;font-size:0.72rem;" onclick="window.__openOfficeLogModal('${item.id}')">✎</button>
                      <button class="stamp-btn small ghost" style="color:var(--brick);border-color:var(--brick);padding:2px 5px;font-size:0.72rem;" onclick="window.__deleteOfficeLog('${item.id}')">🗑</button>
                    ` : ''}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('') : `
          <div class="empty" style="padding:24px;text-align:center;font-size:0.82rem;">No office cash logs recorded matching your filter.</div>
        `}
      </div>

      <!-- Desktop Table View (≥ 640px) -->
      <div class="row-card desktop-only" style="flex-direction:column;padding:0;overflow:hidden;margin-bottom:20px;">
        <div style="width:100%;overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;text-align:left;font-size:0.82rem;">
            <thead>
              <tr style="background:var(--paper-line);color:var(--ink-soft);font-family:'Roboto Mono',monospace;font-size:0.78rem;text-transform:uppercase;border-bottom:1.5px solid var(--paper-line);">
                <th style="padding:10px 14px;width:30px;"></th>
                <th style="padding:10px 14px;">Verify</th>
                <th style="padding:10px 14px;">Date &amp; Time</th>
                <th style="padding:10px 14px;">Type</th>
                <th style="padding:10px 14px;">Reason / Remarks</th>
                <th style="padding:10px 14px;">Amount</th>
                <th style="padding:10px 14px;">Logged By</th>
                <th style="padding:10px 14px;text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.length ? filtered.map(item => {
                const isDep = item.type === 'deposit';
                const isExpanded = officeLogsExpandedItems.has(item.id);
                return `
                  <tr style="border-bottom:1px solid var(--paper-line);transition:background 0.15s ease;">
                    <td style="padding:12px 8px;text-align:center;cursor:pointer;" onclick="window.__toggleOfficeLogItemExpand('${item.id}')">
                      <span style="font-size:0.75rem;color:var(--ink-soft);">${isExpanded ? '⯆' : '⯈'}</span>
                    </td>
                    <td style="padding:12px 14px;">
                      <button class="stamp-btn small ${item.checked?'':'ghost'}" style="padding:3px 8px;font-size:0.78rem;${item.checked?'background:var(--leaf-soft);color:var(--leaf);border-color:var(--leaf);':''}" onclick="window.__toggleOfficeLogCheck('${item.id}')">
                        ${item.checked ? '☑ Verified' : '☐ Check'}
                      </button>
                    </td>
                    <td style="padding:12px 14px;font-family:'Roboto Mono',monospace;color:var(--ink-soft);font-size:0.82rem;white-space:nowrap;">
                      ${item.date} <span style="font-size:0.75rem;">${item.time || ''}</span>
                    </td>
                    <td style="padding:12px 14px;">
                      <span style="display:inline-flex;align-items:center;gap:4px;background:${isDep?'var(--leaf-soft)':'var(--brick-soft)'};color:${isDep?'var(--leaf)':'var(--brick)'};border:1px solid ${isDep?'var(--leaf)':'var(--brick)'};border-radius:6px;font-size:0.78rem;font-weight:700;padding:3px 8px;">
                        ${isDep ? '📥 Cash Added' : '📤 Cash Out'}
                      </span>
                    </td>
                    <td style="padding:12px 14px;">
                      <b style="color:var(--ink);font-size:0.85rem;display:block;">${esc(item.reason)}</b>
                    </td>
                    <td style="padding:12px 14px;font-family:'Roboto Mono',monospace;font-weight:800;font-size:0.85rem;color:${isDep?'var(--leaf)':'var(--brick)'};">
                      ${isDep ? '+' : '-'} ₹${Number(item.amount||0).toLocaleString('en-IN')}
                    </td>
                    <td style="padding:12px 14px;font-size:0.82rem;color:var(--ink-soft);">
                      ${esc(item.logged_by || 'Staff')}
                    </td>
                    <td style="padding:12px 14px;text-align:right;white-space:nowrap;">
                      ${isManagerPlus() ? `
                        <button class="stamp-btn small ghost" style="padding:3px 7px;font-size:0.78rem;margin-right:4px;" onclick="window.__openOfficeLogModal('${item.id}')">✎ Edit</button>
                        <button class="stamp-btn small ghost" style="color:var(--brick);border-color:var(--brick);padding:3px 7px;font-size:0.78rem;" onclick="window.__deleteOfficeLog('${item.id}')">🗑 Delete</button>
                      ` : ''}
                    </td>
                  </tr>
                `;
              }).join('') : `
                <tr>
                  <td colspan="8" style="padding:24px;text-align:center;color:var(--ink-soft);font-size:0.82rem;">
                    No office cash logs recorded matching your filter.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    ` : ''}
  `;
}

/* ================================================================
   >>> P&L STATEMENT & ANALYTICAL GRAPH ENGINE (OWNER ONLY) <<<
================================================================ */
let pnlSearchQuery = '';

function getPnLOpeningProfit() {
  if (!cache.pnlOpeningProfit) {
    if (!session || !session.businessId) cache.pnlOpeningProfit = { amount: 0, notes: '' };
    else {
      try {
        const raw = localStorage.getItem('br_pnl_opening_' + session.businessId);
        cache.pnlOpeningProfit = raw ? JSON.parse(raw) : { amount: 0, notes: '' };
      } catch(e) { cache.pnlOpeningProfit = { amount: 0, notes: '' }; }
    }
  }
  return cache.pnlOpeningProfit || { amount: 0, notes: '' };
}

async function savePnLOpeningProfit(amount, notes) {
  const data = { amount: Number(amount || 0), notes: notes || '', updated_at: new Date().toISOString() };
  cache.pnlOpeningProfit = data;
  const records = getPnLData();
  if (session && session.businessId) {
    try {
      localStorage.setItem('br_pnl_opening_' + session.businessId, JSON.stringify(data));
      localStorage.setItem('br_pnl_records_' + session.businessId, JSON.stringify({ records, opening: data }));
    } catch(e){}
  }
  if (typeof syncCustomCloudPayload === 'function') {
    await syncCustomCloudPayload('[PNL_RECORDS_DATA]', { records, opening: data });
  }
}

window.__openPnLOpeningModal = function() {
  if (!isOwner()) return;
  const opening = getPnLOpeningProfit();

  const html = `
    <div class="overlay show" onclick="if(event.target===this) window.__closeCurrentModal(this)">
      <div class="modal" style="max-width:420px;width:94%;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="margin:0;display:inline-flex;align-items:center;gap:6px;">
            🏁 Set Opening Profit (Prior Profits)
          </h3>
          <button class="stamp-btn small ghost" onclick="window.__closeCurrentModal(this)">✕</button>
        </div>

        <form onsubmit="event.preventDefault(); window.__savePnLOpeningAction(this.opening_amount.value, this.notes.value);">
          <div style="margin-bottom:14px;">
            <label style="font-size:0.78rem;font-weight:700;color:var(--leaf);display:block;margin-bottom:4px;">OPENING NET PROFIT AMOUNT (₹) *</label>
            <input type="number" step="any" name="opening_amount" placeholder="e.g. 500000" value="${opening.amount || ''}" required style="width:100%;box-sizing:border-box;font-family:'Roboto Mono',monospace;font-size:1.15rem;font-weight:800;color:var(--leaf);padding:10px 12px;border:2px solid var(--paper-line);border-radius:8px;">
            <span style="font-size:0.68rem;color:var(--ink-soft);margin-top:4px;display:block;">Enter total accumulated profits earned before starting monthly tracking.</span>
          </div>

          <div style="margin-bottom:14px;">
            <label style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:4px;">REMARKS / NOTES (OPTIONAL)</label>
            <input type="text" name="notes" placeholder="e.g. Initial balance from prior years" value="${esc(opening.notes || '')}" style="width:100%;box-sizing:border-box;font-size:0.82rem;">
          </div>

          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <button type="button" class="stamp-btn ghost" onclick="window.__closeCurrentModal(this)">Cancel</button>
            <button type="submit" class="stamp-btn">💾 Save Opening Profit</button>
          </div>
        </form>
      </div>
    </div>
  `;
  getModalHolder('taskModalHolder').innerHTML = html;
};

window.__savePnLOpeningAction = async function(amount, notes) {
  await savePnLOpeningProfit(amount, notes);
  getModalHolder('taskModalHolder').innerHTML = '';
  window.showToast('🏁 Opening Profit updated & synced!', 'success');
  renderTabBody();
};

function getPnLData() {
  if (!cache.pnlRecords) {
    if (!session || !session.businessId) cache.pnlRecords = [];
    else {
      try {
        const raw = localStorage.getItem('br_pnl_records_' + session.businessId);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            cache.pnlRecords = parsed.records || [];
            if (parsed.opening) cache.pnlOpeningProfit = parsed.opening;
          } else {
            cache.pnlRecords = Array.isArray(parsed) ? parsed : [];
          }
        } else {
          cache.pnlRecords = [];
        }
      } catch(e) { cache.pnlRecords = []; }
    }
  }
  return cache.pnlRecords || [];
}

async function savePnLData(data) {
  cache.pnlRecords = data || [];
  const opening = getPnLOpeningProfit();
  if (session && session.businessId) {
    try {
      localStorage.setItem('br_pnl_records_' + session.businessId, JSON.stringify({ records: cache.pnlRecords, opening }));
    } catch(e){}
  }
  if (typeof syncCustomCloudPayload === 'function') {
    await syncCustomCloudPayload('[PNL_RECORDS_DATA]', { records: cache.pnlRecords, opening });
  }
}

window.__onPnLSearch = function(val) {
  pnlSearchQuery = val || '';
  renderTabBody();
};

window.__openPnLModal = function(editId) {
  if (!isOwner()) return;
  const records = getPnLData();
  const item = editId ? records.find(r => r.id === editId) : null;
  const isEdit = !!item;
  const currentMonth = monthKey(todayStr());

  const html = `
    <div class="overlay show" onclick="if(event.target===this) window.__closeCurrentModal(this)">
      <div class="modal" style="max-width:440px;width:94%;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <h3 style="margin:0;display:inline-flex;align-items:center;gap:6px;">
            ${icon('reports', 18)} ${isEdit ? 'Edit Monthly Net Profit' : 'Log Monthly Net Profit'}
          </h3>
          <button class="stamp-btn small ghost" onclick="window.__closeCurrentModal(this)">✕</button>
        </div>

        <form onsubmit="event.preventDefault(); window.__savePnLRecord('${editId || ''}', this);">
          <div style="margin-bottom:12px;">
            <label style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:4px;">MONTH / PERIOD *</label>
            <input type="month" name="month" value="${item ? item.month : currentMonth}" required style="width:100%;box-sizing:border-box;font-size:0.9rem;padding:8px 10px;">
          </div>

          <div style="margin-bottom:14px;">
            <label style="font-size:0.78rem;font-weight:700;color:var(--leaf);display:block;margin-bottom:4px;">NET PROFIT AMOUNT (₹) *</label>
            <input type="number" step="any" name="net_profit" placeholder="e.g. 85000 (Use negative for loss e.g. -5000)" value="${item ? item.net_profit : ''}" required style="width:100%;box-sizing:border-box;font-family:'Roboto Mono',monospace;font-size:1.15rem;font-weight:800;color:var(--leaf);padding:10px 12px;border:2px solid var(--paper-line);border-radius:8px;">
            <span style="font-size:0.68rem;color:var(--ink-soft);margin-top:4px;display:block;">Tip: Enter positive number for Profit (e.g. 50000) or negative for Loss (e.g. -12000)</span>
          </div>

          <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
            <div style="flex:1;min-width:140px;">
              <label style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:4px;">GROSS REVENUE (₹) (OPTIONAL)</label>
              <input type="number" step="any" name="revenue" placeholder="e.g. 250000" value="${item ? (item.revenue || '') : ''}" style="width:100%;box-sizing:border-box;font-family:'Roboto Mono',monospace;font-size:0.88rem;">
            </div>
            <div style="flex:1;min-width:140px;">
              <label style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:4px;">REMARKS / NOTES (OPTIONAL)</label>
              <input type="text" name="notes" placeholder="e.g. Festival month profit" value="${item ? esc(item.notes || '') : ''}" style="width:100%;box-sizing:border-box;font-size:0.82rem;">
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:8px;">
            <button type="button" class="stamp-btn ghost" onclick="window.__closeCurrentModal(this)">Cancel</button>
            <button type="submit" class="stamp-btn">💾 Log Month Profit</button>
          </div>
        </form>
      </div>
    </div>
  `;
  getModalHolder('taskModalHolder').innerHTML = html;
};

window.__savePnLRecord = async function(editId, form) {
  const month = form.month.value;
  const net_profit = Number(form.net_profit.value || 0);
  const revenue = Number(form.revenue.value || 0);
  const notes = (form.notes.value || '').trim();

  if (!month) {
    window.showToast('Please select a valid month.', 'warning');
    return;
  }

  const records = getPnLData();
  const isEdit = !!editId;

  if (editId) {
    const idx = records.findIndex(r => r.id === editId);
    if (idx !== -1) {
      records[idx].month = month;
      records[idx].net_profit = net_profit;
      records[idx].revenue = revenue;
      records[idx].notes = notes;
    }
  } else {
    const existingIdx = records.findIndex(r => r.month === month);
    if (existingIdx !== -1) {
      records[existingIdx] = {
        id: records[existingIdx].id,
        month, net_profit, revenue, notes,
        updated_at: new Date().toISOString()
      };
    } else {
      records.unshift({
        id: 'pnl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        month, net_profit, revenue, notes,
        created_at: new Date().toISOString()
      });
    }
  }

  records.sort((a, b) => b.month.localeCompare(a.month));

  await savePnLData(records);
  getModalHolder('taskModalHolder').innerHTML = '';
  window.showToast(isEdit ? 'P&L profit updated!' : '📈 Monthly Net Profit recorded & synced!', 'success');
  renderTabBody();
};

window.__deletePnLRecord = async function(id) {
  if (!confirm('Are you sure you want to delete this P&L record?')) return;
  let records = getPnLData();
  records = records.filter(r => r.id !== id);
  await savePnLData(records);
  window.showToast('P&L record deleted', 'info');
  renderTabBody();
};

function renderPnLTab(body) {
  if (!isOwner()) {
    body.innerHTML = `<div class="empty" style="padding:40px;text-align:center;color:var(--brick);font-weight:700;">⚠️ Access Restricted. Only business owners can view P&L Analytics.</div>`;
    return;
  }

  const records = getPnLData();
  const opening = getPnLOpeningProfit();
  const openingAmt = Number(opening.amount || 0);

  const curMonth = monthKey(todayStr());
  const thisMonthRec = records.find(r => r.month === curMonth) || records[0];

  const thisNet = thisMonthRec ? Number(thisMonthRec.net_profit || 0) : 0;
  const monthlyNetSum = records.reduce((sum, r) => sum + Number(r.net_profit || 0), 0);
  const totalCumulativeNet = openingAmt + monthlyNetSum;
  const avgMonthlyNet = records.length ? Math.round(monthlyNetSum / records.length) : 0;

  const filtered = records.filter(r => {
    const q = pnlSearchQuery.toLowerCase().trim();
    return !q || (r.month || '').includes(q) || (r.notes || '').toLowerCase().includes(q);
  });

  // Chart data: include Opening Profit column if present + up to 9 past logged months
  const monthlyChartEntries = records.slice(0, 9).reverse();
  const chartEntries = [];
  if (openingAmt > 0) {
    chartEntries.push({ month: '🏁 Opening', net_profit: openingAmt, isOpening: true });
  }
  chartEntries.push(...monthlyChartEntries);

  const maxAbsProfit = Math.max(1, ...chartEntries.map(r => Math.abs(Number(r.net_profit || 0))));

  let chartBarsSvg = '';
  if (chartEntries.length > 0) {
    const chartW = 600;
    const chartH = 180;
    const baselineY = 120;
    const barWidth = Math.max(18, Math.floor((chartW / (chartEntries.length * 2.2))));

    chartBarsSvg = `
      <svg viewBox="0 0 ${chartW} ${chartH}" style="width:100%;height:auto;max-height:220px;overflow:visible;">
        <!-- Background Grid Lines -->
        <line x1="0" y1="30" x2="${chartW}" y2="30" stroke="var(--paper-line)" stroke-dasharray="3,3" stroke-width="1"/>
        <line x1="0" y1="${baselineY}" x2="${chartW}" y2="${baselineY}" stroke="var(--paper-line)" stroke-width="2"/>

        ${chartEntries.map((r, idx) => {
          const net = Number(r.net_profit || 0);
          const isPos = net >= 0;
          const barH = Math.max(6, Math.round((Math.abs(net) / maxAbsProfit) * 80));
          const groupX = 35 + idx * (chartW / chartEntries.length);
          const barY = isPos ? (baselineY - barH) : baselineY;
          const barColor = r.isOpening ? 'var(--turmeric-dark)' : (isPos ? 'var(--leaf)' : 'var(--brick)');

          const monthPretty = r.month ? r.month : `M${idx+1}`;
          const amountText = `${isPos?'+':''}₹${Math.abs(net)>=100000 ? (net/100000).toFixed(1)+'L' : Math.round(net/1000)+'k'}`;

          return `
            <g transform="translate(${groupX}, 0)">
              <!-- Column Bar -->
              <rect x="0" y="${barY}" width="${barWidth}" height="${barH}" fill="${barColor}" rx="4" opacity="0.9">
                <title>${monthPretty}: ${net>=0?'+':''}₹${net.toLocaleString('en-IN')}</title>
              </rect>

              <!-- Amount Label Above/Below -->
              <text x="${barWidth/2}" y="${isPos ? (barY - 6) : (barY + barH + 12)}" text-anchor="middle" font-size="10" font-weight="800" fill="${barColor}" font-family="'Roboto Mono',monospace">
                ${amountText}
              </text>

              <!-- Month Label -->
              <text x="${barWidth/2}" y="152" text-anchor="middle" font-size="10" font-weight="700" fill="var(--ink-soft)" font-family="sans-serif">${monthPretty}</text>
            </g>
          `;
        }).join('')}
      </svg>
    `;
  } else {
    chartBarsSvg = `<div style="padding:40px;text-align:center;color:var(--ink-soft);font-size:0.85rem;">No Opening Profit or Monthly Net Profit records logged yet. Click <b>+ Log Month Profit</b> to record!</div>`;
  }

  body.innerHTML = `
    <!-- Top Executive Net Profit Scorecards -->
    <div class="stat-grid" style="margin-bottom:16px;">
      <div class="stat-card" style="border-left:4px solid var(--leaf);">
        <div class="num" style="color:${totalCumulativeNet>=0?'var(--leaf)':'var(--brick)'}">
          ${totalCumulativeNet>=0?'+':''} ₹${totalCumulativeNet.toLocaleString('en-IN')}
        </div>
        <div class="label">Total Cumulative Net Profit</div>
      </div>

      <div class="stat-card" style="border-left:4px solid var(--turmeric);position:relative;">
        <button class="stamp-btn small ghost" style="position:absolute;top:8px;right:8px;padding:2px 5px;font-size:0.68rem;" onclick="window.__openPnLOpeningModal()" title="Edit Opening Profit">✎ Edit</button>
        <div class="num" style="color:var(--turmeric-dark);">
          ₹${openingAmt.toLocaleString('en-IN')}
        </div>
        <div class="label">🏁 Opening Profit (Prior)</div>
      </div>

      <div class="stat-card" style="border-left:4px solid ${thisNet>=0?'var(--leaf)':'var(--brick)'};">
        <div class="num" style="color:${thisNet>=0?'var(--leaf)':'var(--brick)'}">
          ${thisNet>=0?'+':''} ₹${thisNet.toLocaleString('en-IN')}
        </div>
        <div class="label">Latest Month Profit (${thisMonthRec ? thisMonthRec.month : 'Current'})</div>
      </div>

      <div class="stat-card" style="border-left:4px solid var(--leaf);">
        <div class="num" style="color:var(--leaf);">
          ${avgMonthlyNet>=0?'+':''} ₹${avgMonthlyNet.toLocaleString('en-IN')}
        </div>
        <div class="label">Average Monthly Profit</div>
      </div>
    </div>

    <!-- Analytical Visual Monthly Net Profit Chart Card -->
    <div class="att-cal-container" style="margin-bottom:18px;padding:16px;background:var(--paper);border:1px solid var(--paper-line);border-radius:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="margin:0;font-size:0.95rem;color:var(--ink);display:inline-flex;align-items:center;gap:6px;">
            ${icon('reports', 16)} Full Profit Performance &amp; Growth Report
          </h3>
          <div style="font-size:0.75rem;color:var(--ink-soft);margin-top:2px;">Includes Opening Profit + Monthly Net Profits</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;font-size:0.72rem;font-weight:700;">
          <span style="display:inline-flex;align-items:center;gap:4px;"><b style="color:var(--turmeric-dark);">■</b> Opening Profit</span>
          <span style="display:inline-flex;align-items:center;gap:4px;"><b style="color:var(--leaf);">■</b> Net Profit</span>
          <span style="display:inline-flex;align-items:center;gap:4px;"><b style="color:var(--brick);">■</b> Net Loss</span>
        </div>
      </div>

      ${chartBarsSvg}
    </div>

    <!-- Controls & Action Header -->
    <div class="row-card" style="flex-wrap:wrap;gap:10px;align-items:center;padding:12px;margin-bottom:16px;">
      <div style="flex:1;min-width:160px;">
        <input type="text" placeholder="Search month (e.g. 2026-08) or notes..." value="${esc(pnlSearchQuery)}" oninput="window.__onPnLSearch(this.value)" style="width:100%;box-sizing:border-box;font-size:0.82rem;">
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <button class="stamp-btn small ghost" style="color:var(--turmeric-dark);border-color:var(--turmeric-dark);" onclick="window.__openPnLOpeningModal()">🏁 Set Opening Profit</button>
        <button class="stamp-btn small" onclick="window.__openPnLModal()">${icon('plus', 14)} Log Month Profit</button>
      </div>
    </div>

    <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">
      <span style="display:inline-flex;align-items:center;gap:6px;">📊 Logged Net Profit Statements (${filtered.length} Months)</span>
    </div>

    ${openingAmt > 0 ? `
      <div class="row-card" style="padding:12px;margin-bottom:10px;background:var(--paper-line);border-left:4px solid var(--turmeric-dark);display:flex;justify-content:space-between;align-items:center;">
        <div>
          <b style="font-size:0.88rem;color:var(--ink);">🏁 Opening Profit (Prior Accumulated)</b>
          <div style="font-size:0.75rem;color:var(--ink-soft);margin-top:2px;">${esc(opening.notes || 'Prior profits accumulated before monthly tracking')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <b style="font-family:'Roboto Mono',monospace;font-size:1rem;color:var(--turmeric-dark);">+ ₹${openingAmt.toLocaleString('en-IN')}</b>
          <button class="stamp-btn small ghost" style="padding:3px 7px;font-size:0.75rem;" onclick="window.__openPnLOpeningModal()">✎ Edit</button>
        </div>
      </div>
    ` : ''}

    <!-- Mobile Card List (< 640px) -->
    <div class="mobile-only" style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
      ${filtered.length ? filtered.map(item => {
        const net = Number(item.net_profit || 0);
        const rev = Number(item.revenue || 0);
        return `
          <div class="row-card" style="flex-direction:column;align-items:stretch;padding:12px;margin:0;border-left:4px solid ${net>=0?'var(--leaf)':'var(--brick)'};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
              <b style="font-size:0.9rem;color:var(--ink);">${item.month}</b>
              <span class="stamp ${net>=0?'present':'absent'}" style="font-size:0.8rem;font-weight:800;">
                ${net>=0?'+':''} ₹${net.toLocaleString('en-IN')}
              </span>
            </div>
            ${rev > 0 ? `<div style="font-size:0.75rem;color:var(--ink-soft);margin-bottom:4px;">Gross Revenue: <b>₹${rev.toLocaleString('en-IN')}</b></div>` : ''}
            ${item.notes ? `<div style="font-size:0.75rem;color:var(--ink);font-style:italic;margin-top:2px;">"${esc(item.notes)}"</div>` : ''}
            <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:8px;padding-top:6px;border-top:1px solid var(--paper-line);">
              <button class="stamp-btn small ghost" style="padding:3px 8px;font-size:0.75rem;" onclick="window.__openPnLModal('${item.id}')">✎ Edit</button>
              <button class="stamp-btn small ghost" style="color:var(--brick);border-color:var(--brick);padding:3px 8px;font-size:0.75rem;" onclick="window.__deletePnLRecord('${item.id}')">🗑 Delete</button>
            </div>
          </div>
        `;
      }).join('') : `
        <div class="empty" style="padding:24px;text-align:center;font-size:0.82rem;">No monthly profit records found matching filter.</div>
      `}
    </div>

    <!-- Desktop Table View (≥ 640px) -->
    <div class="row-card desktop-only" style="flex-direction:column;padding:0;overflow:hidden;margin-bottom:20px;">
      <div style="width:100%;overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;text-align:left;font-size:0.82rem;">
          <thead>
            <tr style="background:var(--paper-line);color:var(--ink-soft);font-family:'Roboto Mono',monospace;font-size:0.78rem;text-transform:uppercase;border-bottom:1.5px solid var(--paper-line);">
              <th style="padding:10px 14px;">Month / Period</th>
              <th style="padding:10px 14px;">Net Profit / Loss</th>
              <th style="padding:10px 14px;">Gross Revenue (Optional)</th>
              <th style="padding:10px 14px;">Remarks / Notes</th>
              <th style="padding:10px 14px;text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map(item => {
              const net = Number(item.net_profit || 0);
              const rev = Number(item.revenue || 0);
              return `
                <tr style="border-bottom:1px solid var(--paper-line);">
                  <td style="padding:10px 14px;font-weight:700;">${item.month}</td>
                  <td style="padding:10px 14px;font-weight:800;font-size:0.9rem;font-family:'Roboto Mono',monospace;color:${net>=0?'var(--leaf)':'var(--brick)'};">
                    ${net>=0?'+':''} ₹${net.toLocaleString('en-IN')}
                  </td>
                  <td style="padding:10px 14px;font-family:'Roboto Mono',monospace;">${rev > 0 ? '₹' + rev.toLocaleString('en-IN') : '—'}</td>
                  <td style="padding:10px 14px;color:var(--ink-soft);">${esc(item.notes || '—')}</td>
                  <td style="padding:10px 14px;text-align:right;">
                    <button class="stamp-btn small ghost" style="padding:3px 8px;font-size:0.75rem;" onclick="window.__openPnLModal('${item.id}')">✎ Edit</button>
                    <button class="stamp-btn small ghost" style="color:var(--brick);border-color:var(--brick);padding:3px 8px;font-size:0.75rem;margin-left:4px;" onclick="window.__deletePnLRecord('${item.id}')">🗑 Delete</button>
                  </td>
                </tr>
              `;
            }).join('') : `
              <tr><td colspan="5" style="padding:24px;text-align:center;color:var(--ink-soft);">No monthly Net Profit recorded yet. Click <b>+ Log Month Profit</b> to record!</td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

boot();