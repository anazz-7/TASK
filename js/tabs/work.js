/* ---------------- TASKS ---------------- */
function fmtDue(t){
  if(!t.due_date) return '';
  const d = new Date(t.due_date + 'T' + (t.due_time || '00:00'));
  const dateStr = d.toLocaleDateString('en-IN', {day:'numeric', month:'short'});
  const timeStr = t.due_time ? d.toLocaleTimeString('en-IN', {hour:'numeric', minute:'2-digit'}) : '';
  return [dateStr, timeStr].filter(Boolean).join(' · ');
}
function isOverdue(t){ return t.due_date && t.status!=='done' && t.due_date < todayStr(); }
function formatPhoneIntl(phone){
  let digits = (phone||'').replace(/\D/g,'');
  if(!digits) return '';
  if(digits.length === 10) digits = '91' + digits; // bare 10-digit Indian number
  if(digits.length === 11 && digits.startsWith('0')) digits = '91' + digits.slice(1); // leading 0 typo
  return digits;
}
function isIOS(){ return /iPad|iPhone|iPod/.test(navigator.userAgent); }

// Owner's number for automatic check-in/out alerts.
function getOwnerNotifyNumber(){
  return localStorage.getItem('br_owner_phone') || '+916379849947';
}
function sendSmsTo(number, msg){
  const sep = isIOS() ? '&' : '?';
  const link = `sms:${number}${sep}body=${encodeURIComponent(msg)}`;
  // Give the UI a moment to update before handing off to the SMS app.
  setTimeout(() => { window.location.href = link; }, 400);
}
function notifyOwnerOfAttendance(kind, loc){
  if(isOwner()) return; // no need to text yourself
  const time = new Date().toLocaleTimeString('en-IN', {hour:'numeric', minute:'2-digit'});
  const msg = [
    `${session.name} ${kind} at ${time} (${session.businessName})`,
    loc ? `Location: ${mapLink(loc.lat, loc.lng)}` : null,
  ].filter(Boolean).join(' — ');
  sendSmsTo(getOwnerNotifyNumber(), msg);
}
// Fires whenever someone other than the owner completes a task or everyday task.
// No site can send an SMS with truly zero taps (a phone-level restriction, not a
// choice made here) — this opens the message pre-filled so it's still just one tap.
function notifyCompletion(itemId, kind){
  if(isOwner()) return;
  let title;
  if(kind==='task'){ const t = cache.tasks.find(x=>x.id===itemId); title = t && t.title; }
  else if(kind==='routine'){ const r = cache.routines.find(x=>x.id===itemId); title = r && r.title; }
  else { const w = cache.weeklyTasks.find(x=>x.id===itemId); title = w && w.title; }
  if(!title) return;
  const msg = `${session.name} completed: ${title} (${session.businessName})`;
  sendSmsTo(getOwnerNotifyNumber(), msg);
}
function waLink(t){
  const phone = formatPhoneIntl(staffPhone(t.assigned_to));
  const lines = [
    `*Task — ${session.businessName}*`, ``,
    `*${t.title}*  [${t.priority.toUpperCase()} priority]`,
    t.notes || null,
    t.due_date ? `Due: ${fmtDue(t)}` : null,
  ].filter(Boolean).join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`;
}
function smsLink(t){
  const digits = formatPhoneIntl(staffPhone(t.assigned_to));
  const phone = digits ? '+' + digits : '';
  const lines = [
    `Task (${session.businessName}): ${t.title} [${t.priority.toUpperCase()}]`,
    t.notes || null,
    t.due_date ? `Due: ${fmtDue(t)}` : null,
  ].filter(Boolean).join(' — ');
  // iOS uses "&" before body, Android/most others use "?" — using the wrong one
  // silently fails to prefill the message on that platform.
  const sep = isIOS() ? '&' : '?';
  return `sms:${phone}${sep}body=${encodeURIComponent(lines)}`;
}

function parseNaturalTaskText(rawText) {
  let text = (rawText || '').trim();
  if(!text) return null;

  let assignedTo = session ? session.staffId : null;
  let priority = 'medium';
  let dueDate = todayStr();
  let title = text;

  // 1. Detect Assignee (@Name)
  const staffMatch = text.match(/@([a-zA-Z0-9_-]+)/);
  if(staffMatch){
    const searchName = staffMatch[1].toLowerCase();
    const foundStaff = cache.staff.find(s => s.name.toLowerCase().includes(searchName));
    if(foundStaff) assignedTo = foundStaff.id;
    title = title.replace(staffMatch[0], '');
  }

  // 2. Detect Priority (!high, !low, !urgent, !medium)
  if(/!(high|urgent)/i.test(title)){
    priority = 'high';
    title = title.replace(/!(high|urgent)/i, '');
  } else if(/!low/i.test(title)){
    priority = 'low';
    title = title.replace(/!low/i, '');
  } else if(/!medium/i.test(title)){
    priority = 'medium';
    title = title.replace(/!medium/i, '');
  }

  // 3. Detect Due Dates
  const now = new Date();
  if(/\b(tomorrow|tmw)\b/i.test(title)){
    const d = new Date(now); d.setDate(d.getDate()+1);
    dueDate = localDateStr(d);
    title = title.replace(/\b(tomorrow|tmw)\b/i, '');
  } else if(/\b(today)\b/i.test(title)){
    dueDate = localDateStr(now);
    title = title.replace(/\b(today)\b/i, '');
  } else if(/\b(monday|mon)\b/i.test(title)){
    dueDate = getNextDayOfWeekStr(1);
    title = title.replace(/\b(monday|mon)\b/i, '');
  } else if(/\b(tuesday|tue)\b/i.test(title)){
    dueDate = getNextDayOfWeekStr(2);
    title = title.replace(/\b(tuesday|tue)\b/i, '');
  } else if(/\b(wednesday|wed)\b/i.test(title)){
    dueDate = getNextDayOfWeekStr(3);
    title = title.replace(/\b(wednesday|wed)\b/i, '');
  } else if(/\b(thursday|thu)\b/i.test(title)){
    dueDate = getNextDayOfWeekStr(4);
    title = title.replace(/\b(thursday|thu)\b/i, '');
  } else if(/\b(friday|fri)\b/i.test(title)){
    dueDate = getNextDayOfWeekStr(5);
    title = title.replace(/\b(friday|fri)\b/i, '');
  } else if(/\b(saturday|sat)\b/i.test(title)){
    dueDate = getNextDayOfWeekStr(6);
    title = title.replace(/\b(saturday|sat)\b/i, '');
  } else if(/\b(sunday|sun)\b/i.test(title)){
    dueDate = getNextDayOfWeekStr(0);
    title = title.replace(/\b(sunday|sun)\b/i, '');
  }

  // Clean up title whitespace
  title = title.replace(/\s+/g, ' ').trim();
  if(!title) title = rawText.trim();

  return { title, assignedTo, priority, dueDate };
}

function getNextDayOfWeekStr(targetDay) {
  const d = new Date();
  const currentDay = d.getDay();
  let distance = targetDay - currentDay;
  if(distance <= 0) distance += 7;
  d.setDate(d.getDate() + distance);
  return localDateStr(d);
}


window.__openQuickTaskModal = function() {
  const holder = getModalHolder('taskModalHolder');
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>⚡ Quick Create Task (Natural Text)</h2>
    <p style="font-size:0.8rem;color:var(--ink-soft);margin-bottom:12px;">Type naturally with <b>@StaffName</b>, <b>!high/!low</b>, and <b>tomorrow/friday/today</b>.</p>
    <label>Task Input Command</label>
    <input id="quickModalInput" placeholder="e.g. Clean warehouse tomorrow @Anas !high" style="font-size:0.95rem;padding:12px;margin-bottom:14px;" onkeypress="if(event.key==='Enter') window.__submitQuickModal()">
    <div style="background:var(--blue-soft);padding:10px;border-radius:8px;border:1px solid var(--turmeric);font-size:0.75rem;color:var(--turmeric-dark);margin-bottom:14px;">
      💡 <b>Examples:</b><br>
      • "Send invoice Friday @Ramesh"<br>
      • "Check stock balance today !urgent @Anas"
    </div>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="getModalHolder('taskModalHolder').innerHTML=''">Cancel</button>
      <button class="stamp-btn" onclick="window.__submitQuickModal()">⚡ Create Task</button>
    </div>
  </div></div>`;
  setTimeout(()=> { const el = document.getElementById('quickModalInput'); if(el) el.focus(); }, 100);
};

window.__submitQuickModal = async function() {
  const inputEl = document.getElementById('quickModalInput');
  if(!inputEl) return;
  const val = inputEl.value.trim();
  if(!val) return;
  const parsed = parseNaturalTaskText(val);
  if(!parsed || !parsed.title) return;

  const payload = {
    business_id: session.businessId,
    assigned_to: parsed.assignedTo,
    created_by: session.staffId,
    title: parsed.title,
    priority: parsed.priority,
    due_date: parsed.dueDate,
    status: 'pending'
  };

  // 1. Instant local update (0ms) — close modal, show in list NOW
  payload.id = 'loc_task_' + Date.now();
  payload.created_at = new Date().toISOString();
  cache.tasks.unshift(payload);
  taskFilter = { staffId: '', priority: '', search: '' };
  taskSubTab = 'active';
  try { localStorage.setItem('br_tasks_' + session.businessId, JSON.stringify(cache.tasks)); } catch(e){}

  const holder = document.getElementById('quickModalHolder');
  if(holder) holder.remove();

  celebrateDone();
  if (typeof window.showToast === 'function') {
    window.showToast('⚡ Task created! Syncing to cloud...', 'success');
  }
  if (activeTab === 'tasks') renderTabBody(); else { activeTab = 'tasks'; renderShell(); }

  // 2. Background DB sync
  const dbPayload = Object.assign({}, payload);
  delete dbPayload.id;
  if (navigator.onLine && typeof sb !== 'undefined') {
    sb.from('tasks').insert(dbPayload).select().single().then(r => {
      if (r && r.data && r.data.id) {
        const loc = cache.tasks.find(t => t.id === payload.id);
        if (loc) Object.assign(loc, r.data);
        try { localStorage.setItem('br_tasks_' + session.businessId, JSON.stringify(cache.tasks)); } catch(e){}
      }
    }).catch(()=> {
      if (typeof queueOfflineMutation === 'function') queueOfflineMutation('insert', 'tasks', dbPayload);
    });
  } else if (typeof queueOfflineMutation === 'function') {
    queueOfflineMutation('insert', 'tasks', dbPayload);
  }
};


window.__quickAddNaturalTask = async function() {
  const inputEl = document.getElementById('quickTaskInput');
  if(!inputEl) return;
  const val = inputEl.value.trim();
  if(!val) return;

  const parsed = parseNaturalTaskText(val);
  if(!parsed || !parsed.title) return;

  const payload = {
    business_id: session.businessId,
    assigned_to: parsed.assignedTo,
    created_by: session.staffId,
    title: parsed.title,
    priority: parsed.priority,
    due_date: parsed.dueDate,
    status: 'pending'
  };

  // 1. Instant local update (0ms) — show in list NOW
  payload.id = 'loc_task_' + Date.now();
  payload.created_at = new Date().toISOString();
  cache.tasks.unshift(payload);
  taskFilter = { staffId: '', priority: '', search: '' };
  taskSubTab = 'active';
  try { localStorage.setItem('br_tasks_' + session.businessId, JSON.stringify(cache.tasks)); } catch(e){}

  inputEl.value = '';
  celebrateDone();
  if (typeof window.showToast === 'function') {
    window.showToast('⚡ Task created! Syncing to cloud...', 'success');
  }
  renderTabBody();

  // 2. Background DB sync
  const dbPayload = Object.assign({}, payload);
  delete dbPayload.id;
  if (navigator.onLine && typeof sb !== 'undefined') {
    sb.from('tasks').insert(dbPayload).select().single().then(r => {
      if (r && r.data && r.data.id) {
        const loc = cache.tasks.find(t => t.id === payload.id);
        if (loc) Object.assign(loc, r.data);
        try { localStorage.setItem('br_tasks_' + session.businessId, JSON.stringify(cache.tasks)); } catch(e){}
      }
    }).catch(()=> {
      if (typeof queueOfflineMutation === 'function') queueOfflineMutation('insert', 'tasks', dbPayload);
    });
  } else if (typeof queueOfflineMutation === 'function') {
    queueOfflineMutation('insert', 'tasks', dbPayload);
  }
};



window.__setTaskSubTab = function(t) {
  taskSubTab = t;
  renderTabBody();
};


function renderTasksTab(body){
  if(typeof taskSubTab === 'undefined') window.taskSubTab = 'active';
  let list = isManagerPlus() ? cache.tasks : cache.tasks.filter(t=>t.assigned_to===session.staffId);
  if(taskFilter.staffId) list = list.filter(t=>t.assigned_to===taskFilter.staffId);
  if(taskFilter.priority) list = list.filter(t=>t.priority===taskFilter.priority);
  if(taskFilter.search) list = list.filter(t=>t.title.toLowerCase().includes(taskFilter.search.toLowerCase()));
  const pending = list.filter(t=>t.status!=='done');
  const done = list.filter(t=>t.status==='done');
  const row = (t) => `
    <div class="row-card ${isOverdue(t)?'overdue':''}">
      <div class="row-main">
        <div class="meta"><span>${esc(staffName(t.assigned_to))}</span>${t.due_date?`<span>${fmtDue(t)}</span>`:''}</div>
        <h3><span class="status-dot ${t.status==='done'?'green':'red'}"></span>${esc(t.title)}</h3>
        ${t.notes?`<div class="notes">${esc(t.notes)}</div>`:''}
        <div style="margin-top:8px;">
          <span class="stamp ${t.priority}">${t.priority}</span>
          <span class="stamp ${t.status}">${t.status}</span>
          ${isOverdue(t)?`<span class="stamp overdue-badge">overdue</span>`:''}
        </div>
      </div>
      <div class="row-actions" style="display:flex;align-items:center;gap:6px;">
        ${t.status!=='done'?`<button class="icon-btn" style="font-weight:600;color:var(--turmeric);" onclick="window.__markDone('${t.id}')">${icon('check',14)} Done</button>`:''}
        <div class="action-dropdown-holder">
          <button class="action-more-btn" onclick="window.__toggleActionMenu(event, '${t.id}')">More ▾</button>
          <div class="action-dropdown-menu" id="actionMenu_${t.id}">
            ${isManagerPlus()?`<button onclick="window.__editTask('${t.id}')">✎ Edit</button>`:''}
            ${isManagerPlus()?`<button onclick="window.__sendWa('${t.id}')">💬 WhatsApp</button>`:''}
            ${isManagerPlus()?`<button onclick="window.__sendSms('${t.id}')">📲 SMS</button>`:''}
            ${isOwner()?`<button class="danger" onclick="window.__deleteTask('${t.id}')">🗑 Delete</button>`:''}
          </div>
        </div>
      </div>
    </div>`;
  const doneRowCollapsed = (t) => `
    <div class="row-card collapse-row compact-done-card" onclick="window.__toggleDone('${t.id}')">
      <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;overflow:hidden;">
        <span class="collapse-arrow" style="font-size:0.75rem;color:var(--ink-soft);flex-shrink:0;">▸</span>
        <span class="status-dot green" style="flex-shrink:0;"></span>
        <span style="font-size:0.78rem;font-weight:600;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;">${esc(t.title)}</span>
      </div>
      <span class="stamp done" style="font-size:0.58rem;padding:1px 6px;border-radius:999px;flex-shrink:0;margin-left:8px;">✓ Done</span>
    </div>`;

  const doneRow = (t) => expandedDoneIds.has(t.id)
    ? `<div class="row-card collapse-row" style="padding:8px 14px;" onclick="window.__toggleDone('${t.id}')">
         <span class="collapse-arrow open">▸</span><span style="font-size:0.75rem;color:var(--ink-soft);">Tap to collapse</span>
       </div>
       ${row(t)}`
    : doneRowCollapsed(t);
  const filterBar = isManagerPlus() ? `
    <div class="row-card" style="flex-direction:column;align-items:stretch;background:transparent;border-style:dashed;">
      <div class="two-col">
        <div><label style="margin-top:0;">Staff</label>
          <select id="filterStaff" onchange="window.__setTaskFilter()">
            <option value="">All staff</option>
            ${cache.staff.map(s=>`<option value="${s.id}" ${taskFilter.staffId===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}
          </select>
        </div>
        <div><label style="margin-top:0;">Priority</label>
          <select id="filterPriority" onchange="window.__setTaskFilter()">
            <option value="">All priorities</option>
            <option value="high" ${taskFilter.priority==='high'?'selected':''}>High</option>
            <option value="medium" ${taskFilter.priority==='medium'?'selected':''}>Medium</option>
            <option value="low" ${taskFilter.priority==='low'?'selected':''}>Low</option>
          </select>
        </div>
      </div>
      <label>Search title</label>
      <input id="filterSearch" placeholder="Type to search..." value="${esc(taskFilter.search)}" oninput="window.__setTaskFilter()">
    </div>` : '';
  const quickBar = isManagerPlus() ? `
    <div class="row-card" style="flex-direction:column;align-items:stretch;background:var(--paper);border:1.5px solid var(--turmeric-dark);margin-bottom:14px;padding:12px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-weight:700;font-size:0.85rem;color:var(--turmeric-dark);">⚡ Quick Add Task via Natural Text</span>
        <span style="font-size:0.7rem;color:var(--ink-soft);">Try: "Clean store tomorrow @Anas !high"</span>
      </div>
      <div style="display:flex;gap:6px;">
        <input id="quickTaskInput" placeholder="Type task title, @Staff, !priority, due date..." onkeypress="if(event.key==='Enter') window.__quickAddNaturalTask()" style="flex:1;font-size:0.88rem;">
        <button class="stamp-btn" style="padding:8px 14px;font-size:0.85rem;" onclick="window.__quickAddNaturalTask()">+ Add</button>
      </div>
    </div>
  ` : '';

  body.innerHTML = `
    <!-- Tasks Sub-Menu Navigation Bar -->
    <div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;">
      <button class="stamp-btn small ${taskSubTab==='active'?'':'ghost'}" onclick="window.__setTaskSubTab('active')">⚡ Active Tasks (${pending.length})</button>
      <button class="stamp-btn small ${taskSubTab==='history'?'':'ghost'}" onclick="window.__setTaskSubTab('history')">📜 Task History (${done.length})</button>
    </div>

    ${taskSubTab === 'active' ? `
      ${quickBar}
      ${filterBar}
      <div class="section-label">Open Active Tasks ${isManagerPlus()?`<a onclick="window.__sendAllPending()">Send all pending &rarr;</a>`:''}</div>
      ${pending.length ? pending.map(row).join('') : `<div class="empty">No open tasks right now. Great job!</div>`}
    ` : ''}

    ${taskSubTab === 'history' ? `
      <div class="section-label">Completed Task History (${done.length} tasks)</div>
      ${done.length ? done.map(row).join('') : `<div class="empty">No completed tasks in history yet.</div>`}
    ` : ''}`;

  window.__toggleDone = (id) => {
    if(expandedDoneIds.has(id)) expandedDoneIds.delete(id); else expandedDoneIds.add(id);
    renderTabBody();
  };

  window.__setTaskFilter = () => {
    const searchEl = document.getElementById('filterSearch');
    const hadFocus = document.activeElement === searchEl;
    const cursorPos = hadFocus ? searchEl.selectionStart : null;
    taskFilter.staffId = document.getElementById('filterStaff').value;
    taskFilter.priority = document.getElementById('filterPriority').value;
    taskFilter.search = searchEl.value;
    renderTabBody();
    if(hadFocus){ const n=document.getElementById('filterSearch'); if(n){ n.focus(); n.setSelectionRange(cursorPos,cursorPos); } }
  };
  window.__sendAllPending = () => {
    const sendable = cache.tasks.filter(t=>t.status!=='done' && staffPhone(t.assigned_to));
    if(!sendable.length){ alert('No pending tasks with a WhatsApp number to send.'); return; }
    if(!confirm(`Open WhatsApp for ${sendable.length} pending task(s)? Allow pop-ups if asked.`)) return;
    sendable.forEach(async t => { window.open(waLink(t), '_blank'); await sb.from('tasks').update({status:'sent'}).eq('id', t.id); });
    setTimeout(async ()=>{ await loadData(); renderTabBody(); }, 800);
  };
  window.__sendWa = async (id) => {
    const t = cache.tasks.find(x=>x.id===id);
    if(!staffPhone(t.assigned_to)){ alert('No WhatsApp number on file for this person. Add one in Staff.'); return; }
    window.open(waLink(t), '_blank');
    if(t.status!=='done'){ await sb.from('tasks').update({status:'sent'}).eq('id', id); await loadData(); renderTabBody(); }
  };
  window.__sendSms = async (id) => {
    const t = cache.tasks.find(x=>x.id===id);
    if(!staffPhone(t.assigned_to)){ alert('No phone number on file for this person. Add one in Staff.'); return; }
    window.location.href = smsLink(t);
    if(t.status!=='done'){ await sb.from('tasks').update({status:'sent'}).eq('id', id); await loadData(); renderTabBody(); }
  };
  window.__editTask = (id) => openTaskModal(id);
}

// __markDone defined GLOBALLY so it always works regardless of active tab
window.__markDone = function(id) {
  const t = cache.tasks.find(x => x.id === id);
  if (!t) return;

  // Instant local update
  t.status = 'done';
  t.completed_at = new Date().toISOString();
  _tasksSave();
  celebrateDone();
  window.showToast('✓ Task done! Moved to Task History.', 'success');
  logAuditEvent('Task Completed', 'Completed: ' + t.title);

  // Re-render immediately — switch to history to show where it went
  if (activeTab === 'tasks') {
    renderTabBody();
  }

  // Background DB sync (non-blocking)
  if (navigator.onLine && typeof sb !== 'undefined' && !String(id).startsWith('loc_task_')) {
    Promise.resolve(sb.from('tasks').update({ status: 'done' }).eq('id', id)).catch(() => {});
  }
  try { awardTaskPoint(id, 'task').catch(() => {}); } catch(e){}
  try { notifyCompletion(id, 'task'); } catch(e){}
};

function openTaskModal(taskId){
  const t = taskId ? cache.tasks.find(x=>x.id===taskId) : null;
  const holder = getModalHolder('taskModalHolder');
  const assignField = isManagerPlus()
    ? `<label>Assign to</label><select id="mTaskStaff">${cache.staff.map(s=>`<option value="${s.id}" ${t&&t.assigned_to===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`
    : `<label>Assign to</label><input value="${esc(session.name)}" disabled><input type="hidden" id="mTaskStaff" value="${session.staffId}">`;
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>${t?'Edit task':'New task'}</h2>
    ${assignField}
    <label>Title</label>
    <input id="mTaskTitle" value="${t?esc(t.title):''}" placeholder="e.g. Restock shelf">
    <label>Details</label>
    <textarea id="mTaskNotes" placeholder="Optional">${t?esc(t.notes||''):''}</textarea>
    <div class="two-col">
      <div><label>Due date</label><input type="date" id="mTaskDate" value="${t?t.due_date||'':''}"></div>
      <div><label>Due time</label><input type="time" id="mTaskTime" value="${t?t.due_time||'':''}"></div>
    </div>
    <label>Priority</label>
    <select id="mTaskPriority">
      <option value="low" ${t&&t.priority==='low'?'selected':''}>Low</option>
      <option value="medium" ${!t||t.priority==='medium'?'selected':''}>Medium</option>
      <option value="high" ${t&&t.priority==='high'?'selected':''}>High</option>
    </select>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closeModal()">Cancel</button>
      <button class="stamp-btn" onclick="window.__saveTask('${taskId||''}')">Save</button>
    </div>
  </div></div>`;
  window.__closeModal = () => { holder.innerHTML=''; };
  window.__saveTask = (id) => {
    const title = document.getElementById('mTaskTitle').value.trim();
    if (!title) { alert('Give the task a title.'); return; }
    const data = {
      business_id: session.businessId,
      assigned_to: document.getElementById('mTaskStaff').value,
      created_by: session.staffId,
      title,
      notes: document.getElementById('mTaskNotes').value.trim(),
      due_date: document.getElementById('mTaskDate').value || null,
      due_time: document.getElementById('mTaskTime').value || null,
      priority: document.getElementById('mTaskPriority').value,
    };

    // Instant local update
    const locId = id || ('loc_task_' + Date.now());
    if (id) {
      const ex = cache.tasks.find(x => x.id === id);
      if (ex) Object.assign(ex, data);
    } else {
      data.id = locId;
      data.status = 'pending';
      data.created_at = new Date().toISOString();
      cache.tasks.unshift(data);
    }
    _tasksSave();
    holder.innerHTML = '';
    window.showToast(id ? 'Task updated!' : 'Task created!', 'success');
    _tasksRender();

    // Background DB sync
    if (navigator.onLine && typeof sb !== 'undefined') {
      if (id && !String(id).startsWith('loc_task_')) {
        Promise.resolve(sb.from('tasks').update(data).eq('id', id)).catch(() => {});
      } else {
        const db = Object.assign({}, data);
        delete db.id;
        sb.from('tasks').insert(db).select().single().then(r => {
          if (r && r.data && r.data.id) {
            const loc = cache.tasks.find(t => t.id === locId);
            if (loc) { Object.assign(loc, r.data); _tasksSave(); }
          }
        }).catch(() => {});
      }
    }
  };
}
window.__openTask = () => openTaskModal(null);

/* ---------------- DAILY (recurring routine tasks) ---------------- */
let expandedRoutineIds = new Set();
function renderDailyTab(body){
  const today = todayStr();
  let list = isManagerPlus() ? cache.routines : cache.routines.filter(r=>r.assigned_to===session.staffId);
  const row = (r) => {
    const log = cache.routineLog.find(l=>l.routine_id===r.id);
    const done = log && log.status==='done';
    return `
    <div class="row-card">
      <div class="row-main">
        <div class="meta"><span>${esc(staffName(r.assigned_to))}</span>${r.due_time?`<span>Reminder: ${r.due_time.slice(0,5)}</span>`:''}</div>
        <h3><span class="status-dot ${done?'green':'red'}"></span>${esc(r.title)}</h3>
        ${r.notes?`<div class="notes">${esc(r.notes)}</div>`:''}
        <div style="margin-top:8px;">
          <span class="stamp ${r.priority}">${r.priority}</span>
          <span class="stamp ${done?'done':'pending'}">${done?'done today':'pending today'}</span>
        </div>
      </div>
      <div class="row-actions">
        <button class="stamp-btn small ${done?'ghost':''}" onclick="window.__toggleRoutine('${r.id}', ${done})">${done?'Undo':icon('check',14)+' Done today'}</button>
        
        <div class="action-dropdown-holder">
    <button class="action-more-btn" onclick="window.__toggleActionMenu(event, '${r.id}')">More ▾</button>
    <div class="action-dropdown-menu" id="actionMenu_${r.id}">
      ${isManagerPlus() ? `<button onclick="window.__editRoutine('${r.id}')">✎ Edit</button>` : ''}
      ${isOwner() ? `<button class="danger" onclick="window.__deleteRoutine('${r.id}')">🗑 Delete</button>` : ''}
    </div>
  </div>
      </div>
    </div>`;
  };
  const collapsedRow = (r) => `
    <div class="row-card collapse-row compact-done-card" onclick="window.__toggleRoutineExpand('${r.id}')">
      <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;overflow:hidden;">
        <span class="collapse-arrow" style="font-size:0.75rem;color:var(--ink-soft);flex-shrink:0;">▸</span>
        <span class="status-dot green" style="flex-shrink:0;"></span>
        <span style="font-size:0.78rem;font-weight:600;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;">${esc(r.title)}</span>
      </div>
      <span class="stamp done" style="font-size:0.58rem;padding:1px 6px;border-radius:999px;flex-shrink:0;margin-left:8px;">✓ Done</span>
    </div>`;

  const doneWrap = (r) => expandedRoutineIds.has(r.id)
    ? `<div class="row-card collapse-row" style="padding:8px 14px;" onclick="window.__toggleRoutineExpand('${r.id}')">
         <span class="collapse-arrow open">▸</span><span style="font-size:0.75rem;color:var(--ink-soft);">Tap to collapse</span>
       </div>
       ${row(r)}`
    : collapsedRow(r);

  const pending = list.filter(r=>{ const l=cache.routineLog.find(x=>x.routine_id===r.id); return !(l && l.status==='done'); });
  const doneList = list.filter(r=>{ const l=cache.routineLog.find(x=>x.routine_id===r.id); return l && l.status==='done'; });

  body.innerHTML = `
    
    <div class="section-label">
      <span>Everyday schedule — ${today}</span>
      <div style="display:inline-flex;align-items:center;gap:6px;">
        <svg width="22" height="22" viewBox="0 0 36 36" style="transform:rotate(-90deg);vertical-align:middle;">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--paper-line)" stroke-width="4" />
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--turmeric)" stroke-width="4" stroke-dasharray="${list.length ? Math.round((doneList.length / list.length) * 100) : 0}, 100" />
        </svg>
        <span style="font-family:'Roboto Mono',monospace;font-weight:700;font-size:0.8rem;color:var(--turmeric);">${list.length ? Math.round((doneList.length / list.length) * 100) : 0}%</span>
        <span style="color:var(--ink-soft);font-size:0.75rem;">(${doneList.length}/${list.length})</span>
      </div>
    </div>
    ${pending.length ? pending.map(row).join('') : (list.length ? '' : `<div class="empty">No everyday tasks set up yet.${isManagerPlus()?' Tap + to add one — it repeats automatically every day.':''}</div>`)}
    ${doneList.length ? `<div class="section-label">Done today <span style="color:var(--ink-soft);font-weight:600;">tap to expand</span></div>${doneList.map(doneWrap).join('')}` : ''}
    <div id="routineModalHolder"></div>
  `;
  window.__toggleRoutineExpand = (id) => {
    if(expandedRoutineIds.has(id)) expandedRoutineIds.delete(id); else expandedRoutineIds.add(id);
    renderTabBody();
  };
  window.__toggleRoutine = async (routineId, currentlyDone) => {
    const key = 'routine-'+routineId;
    if(__busyKeys.has(key)) return;
    __busyKeys.add(key);
    try{
      const newStatus = currentlyDone ? 'pending' : 'done';
      const existing = cache.routineLog.find(l=>l.routine_id===routineId);
      if(existing) await sbCheck(sb.from('routine_log').update({status:newStatus}).eq('id', existing.id));
      else await sbCheck(sb.from('routine_log').insert({routine_id: routineId, date: today, status: newStatus}));
      if(newStatus==='done'){
        celebrateDone();
        await awardTaskPoint(routineId, 'routine');
        notifyCompletion(routineId, 'routine');
      }
      await loadData(); renderTabBody();
    } catch(e){
      alert('Could not update — please check your connection and try again.\n\n('+(e.message||e)+')');
    } finally { __busyKeys.delete(key); }
  };
  window.__deleteRoutine = function(id) {
  window.__showDeleteConfirm({
    title: 'Delete routine task?',
    message: 'This removes it for everyone on this business. It cannot be undone.',
    onConfirm: async () => {
      showLoading();
      try {
        await sb.from('routines').delete().eq('id', id);
        cache.routines = cache.routines.filter(r => r.id !== id);
      } catch(e){}
      finally {
        hideLoading();
        await loadData();
        renderTabBody();
      }
    }
  });
};
  window.__editRoutine = (id) => openRoutineModal(id);
}
function openRoutineModal(routineId){
  const r = routineId ? cache.routines.find(x=>x.id===routineId) : null;
  const holder = document.getElementById('routineModalHolder');
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>${r?'Edit everyday task':'New everyday task'}</h2>
    <p style="font-size:0.82rem;color:var(--ink-soft);margin:0;">This repeats automatically every day — no need to recreate it. Mark it done each day from the Daily tab.</p>
    <label>Assign to</label>
    <select id="mRoutineStaff">${cache.staff.map(s=>`<option value="${s.id}" ${r&&r.assigned_to===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>
    <label>Title</label>
    <input id="mRoutineTitle" value="${r?esc(r.title):''}" placeholder="e.g. Open the shop shutters">
    <label>Details</label>
    <textarea id="mRoutineNotes" placeholder="Optional">${r?esc(r.notes||''):''}</textarea>
    <label>Reminder time (optional)</label>
    <input type="time" id="mRoutineTime" value="${r?r.due_time||'':''}">
    <small class="hint">If set, a reminder notification tries to fire around this time while the app is open (see Settings for how alerts work).</small>
    <label>Priority</label>
    <select id="mRoutinePriority">
      <option value="low" ${r&&r.priority==='low'?'selected':''}>Low</option>
      <option value="medium" ${!r||r.priority==='medium'?'selected':''}>Medium</option>
      <option value="high" ${r&&r.priority==='high'?'selected':''}>High</option>
    </select>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closeRoutineModal()">Cancel</button>
      <button class="stamp-btn" onclick="window.__saveRoutine('${routineId||''}')">Save</button>
    </div>
  </div></div>`;
  window.__closeRoutineModal = () => { holder.innerHTML=''; };
  window.__saveRoutine = async (id) => {
    const title = document.getElementById('mRoutineTitle').value.trim();
    if(!title){ alert('Give it a title.'); return; }
    const data = {
      business_id: session.businessId,
      assigned_to: document.getElementById('mRoutineStaff').value,
      title,
      notes: document.getElementById('mRoutineNotes').value.trim(),
      due_time: document.getElementById('mRoutineTime').value || null,
      priority: document.getElementById('mRoutinePriority').value,
    };
    await guardedSave('routineForm-'+(id||'new'), async () => {
      if(id) await sbCheck(sb.from('routines').update(data).eq('id', id));
      else await sbCheck(sb.from('routines').insert(data));
      holder.innerHTML='';
      await loadData(); renderTabBody();
    });
  };
}
window.__openRoutine = () => openRoutineModal(null);

/* ---------------- WEEKLY (recurring, resets every Monday) ---------------- */
let expandedWeeklyIds = new Set();
function renderWeeklyTab(body){
  const weekStart = currentWeekStartStr();
  const weekEndDisp = (() => { const d = new Date(weekStart); d.setDate(d.getDate()+6); return d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}); })();
  const weekStartDisp = new Date(weekStart).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  let list = isManagerPlus() ? cache.weeklyTasks : cache.weeklyTasks.filter(w=>w.assigned_to===session.staffId);

  const row = (w) => {
    const log = cache.weeklyTaskLog.find(l=>l.weekly_task_id===w.id);
    const done = log && log.status==='done';
    return `
    <div class="row-card">
      <div class="row-main">
        <div class="meta"><span>${esc(staffName(w.assigned_to))}</span></div>
        <h3><span class="status-dot ${done?'green':'red'}"></span>${esc(w.title)}</h3>
        ${w.notes?`<div class="notes">${esc(w.notes)}</div>`:''}
        <div style="margin-top:8px;">
          <span class="stamp ${w.priority}">${w.priority}</span>
          <span class="stamp ${done?'done':'pending'}">${done?'done this week':'pending this week'}</span>
        </div>
      </div>
      <div class="row-actions">
        <button class="stamp-btn small ${done?'ghost':''}" onclick="window.__toggleWeekly('${w.id}', ${done})">${done?'Undo':icon('check',14)+' Done'}</button>
        
        <div class="action-dropdown-holder">
    <button class="action-more-btn" onclick="window.__toggleActionMenu(event, '${w.id}')">More ▾</button>
    <div class="action-dropdown-menu" id="actionMenu_${w.id}">
      ${isManagerPlus() ? `<button onclick="window.__editWeekly('${w.id}')">✎ Edit</button>` : ''}
      ${isOwner() ? `<button class="danger" onclick="window.__deleteWeekly('${w.id}')">🗑 Delete</button>` : ''}
    </div>
  </div>
      </div>
    </div>`;
  };
  const collapsedRow = (w) => `
    <div class="row-card collapse-row" style="padding:10px 14px;" onclick="window.__toggleWeeklyExpand('${w.id}')">
      <div class="row-main" style="display:flex;align-items:center;">
        <span class="collapse-arrow">▸</span>
        <span class="status-dot green"></span>
        <h3 style="font-size:0.88rem;font-weight:500;color:var(--ink-soft);margin:0;">${esc(w.title)}</h3>
      </div>
    </div>`;
  const doneWrap = (w) => expandedWeeklyIds.has(w.id)
    ? `<div class="row-card collapse-row" style="padding:8px 14px;" onclick="window.__toggleWeeklyExpand('${w.id}')">
         <span class="collapse-arrow open">▸</span><span style="font-size:0.75rem;color:var(--ink-soft);">Tap to collapse</span>
       </div>
       ${row(w)}`
    : collapsedRow(w);

  const pending = list.filter(w=>{ const l=cache.weeklyTaskLog.find(x=>x.weekly_task_id===w.id); return !(l && l.status==='done'); });
  const doneList = list.filter(w=>{ const l=cache.weeklyTaskLog.find(x=>x.weekly_task_id===w.id); return l && l.status==='done'; });

  body.innerHTML = `
    
    <div class="section-label"><span>This week — ${weekStartDisp} to ${weekEndDisp}</span><span style="color:var(--ink-soft);font-weight:600;">${doneList.length}/${list.length} done</span></div>
    ${pending.length ? pending.map(row).join('') : (list.length ? '' : `<div class="empty">No weekly tasks set up yet.${isManagerPlus()?' Tap + to add one — it repeats automatically every week, resetting each Monday.':''}</div>`)}
    ${doneList.length ? `<div class="section-label">Done this week <span style="color:var(--ink-soft);font-weight:600;">tap to expand</span></div>${doneList.map(doneWrap).join('')}` : ''}
    <div id="weeklyModalHolder"></div>
  `;
  window.__toggleWeeklyExpand = (id) => {
    if(expandedWeeklyIds.has(id)) expandedWeeklyIds.delete(id); else expandedWeeklyIds.add(id);
    renderTabBody();
  };
  window.__toggleWeekly = async (weeklyId, currentlyDone) => {
    const key = 'weekly-'+weeklyId;
    if(__busyKeys.has(key)) return;
    __busyKeys.add(key);
    try{
      const newStatus = currentlyDone ? 'pending' : 'done';
      const existing = cache.weeklyTaskLog.find(l=>l.weekly_task_id===weeklyId);
      if(existing) await sbCheck(sb.from('weekly_task_log').update({status:newStatus}).eq('id', existing.id));
      else await sbCheck(sb.from('weekly_task_log').insert({weekly_task_id: weeklyId, week_start: weekStart, status: newStatus}));
      if(newStatus==='done'){
        celebrateDone();
        await awardTaskPoint(weeklyId, 'weekly');
        notifyCompletion(weeklyId, 'weekly');
      }
      await loadData(); renderTabBody();
    } catch(e){
      alert('Could not update — please check your connection and try again.\n\n('+(e.message||e)+')');
    } finally { __busyKeys.delete(key); }
  };
  window.__deleteWeekly = function(id) {
  window.__showDeleteConfirm({
    title: 'Delete weekly task?',
    message: 'This removes it for everyone on this business. It cannot be undone.',
    onConfirm: async () => {
      showLoading();
      try {
        await sb.from('weekly_tasks').delete().eq('id', id);
        cache.weeklyTasks = cache.weeklyTasks.filter(w => w.id !== id);
      } catch(e){}
      finally {
        hideLoading();
        await loadData();
        renderTabBody();
      }
    }
  });
};
  window.__editWeekly = (id) => openWeeklyModal(id);
}
function openWeeklyModal(weeklyId){
  const w = weeklyId ? cache.weeklyTasks.find(x=>x.id===weeklyId) : null;
  const holder = document.getElementById('weeklyModalHolder');
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>${w?'Edit weekly task':'New weekly task'}</h2>
    <p style="font-size:0.82rem;color:var(--ink-soft);margin:0;">This repeats every week — mark it done from the Weekly tab. It resets automatically each Monday.</p>
    <label>Assign to</label>
    <select id="mWeeklyStaff">${cache.staff.map(s=>`<option value="${s.id}" ${w&&w.assigned_to===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>
    <label>Title</label>
    <input id="mWeeklyTitle" value="${w?esc(w.title):''}" placeholder="e.g. Deep clean the store">
    <label>Details</label>
    <textarea id="mWeeklyNotes" placeholder="Optional">${w?esc(w.notes||''):''}</textarea>
    <label>Priority</label>
    <select id="mWeeklyPriority">
      <option value="low" ${w&&w.priority==='low'?'selected':''}>Low</option>
      <option value="medium" ${!w||w.priority==='medium'?'selected':''}>Medium</option>
      <option value="high" ${w&&w.priority==='high'?'selected':''}>High</option>
    </select>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closeWeeklyModal()">Cancel</button>
      <button class="stamp-btn" onclick="window.__saveWeekly('${weeklyId||''}')">Save</button>
    </div>
  </div></div>`;
  window.__closeWeeklyModal = () => { holder.innerHTML=''; };
  window.__saveWeekly = async (id) => {
    const title = document.getElementById('mWeeklyTitle').value.trim();
    if(!title){ alert('Give it a title.'); return; }
    const data = {
      business_id: session.businessId,
      assigned_to: document.getElementById('mWeeklyStaff').value,
      title,
      notes: document.getElementById('mWeeklyNotes').value.trim(),
      priority: document.getElementById('mWeeklyPriority').value,
    };
    await guardedSave('weeklyForm-'+(id||'new'), async () => {
      if(id) await sbCheck(sb.from('weekly_tasks').update(data).eq('id', id));
      else await sbCheck(sb.from('weekly_tasks').insert(data));
      holder.innerHTML='';
      await loadData(); renderTabBody();
    });
  };
}
window.__openWeekly = () => openWeeklyModal(null);

/* ---------------- ATTENDANCE ---------------- */
function timeStr(iso){ return new Date(iso).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'}); }
function getLocation(timeoutMs = 1200){
  return new Promise((resolve) => {
    if(!navigator.geolocation){ resolve(null); return; }
    let done = false;
    const timer = setTimeout(() => {
      if(!done) { done = true; resolve(null); }
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if(!done) { done = true; clearTimeout(timer); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); }
      },
      () => {
        if(!done) { done = true; clearTimeout(timer); resolve(null); }
      },
      { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 60000 }
    );
  });
}
function mapLink(lat, lng){ return `https://www.google.com/maps?q=${lat},${lng}`; }

/* ---------------- celebration + auto incentive point on completion ---------------- */
function playOpenChime(){
  const ctx = getAudioCtx();
  if(!ctx) return;
  try{
    if(ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.setValueAtTime(660, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    o.start(); o.stop(ctx.currentTime + 0.34);
  } catch(e){}
}
function playSuccessChime(){
  const ctx = getAudioCtx();
  if(!ctx) return;
  try{
    if(ctx.state === 'suspended') ctx.resume();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5-E5-G5-C6, a bright little fanfare
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i*0.09;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.001, start);
      g.gain.exponentialRampToValueAtTime(0.13, start+0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start+0.28);
      o.start(start); o.stop(start+0.3);
    });
  } catch(e){}
}
function celebrateDone(){
  playSuccessChime();
  const banner = document.createElement('div');
  banner.className = 'celebrate-banner';
  banner.textContent = 'Well done!';
  document.body.appendChild(banner);
  setTimeout(()=>banner.remove(), 1700);
  const colors = ['#D9932E','#3E7C59','#4A5B8C','#B5473A','#6B4FA0'];
  for(let i=0;i<28;i++){
    const c = document.createElement('div');
    c.className = 'confetti-piece';
    c.style.left = Math.random()*100+'vw';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.animationDuration = (1.6+Math.random()*1.1)+'s';
    c.style.animationDelay = (Math.random()*0.25)+'s';
    document.body.appendChild(c);
    setTimeout(()=>c.remove(), 3200);
  }
}
async function awardTaskPoint(itemId, kind){
  let assignedTo, title;
  if(kind==='task'){
    const t = cache.tasks.find(x=>x.id===itemId);
    if(!t) return;
    assignedTo = t.assigned_to; title = t.title;
  } else if(kind==='routine'){
    const r = cache.routines.find(x=>x.id===itemId);
    if(!r) return;
    assignedTo = r.assigned_to; title = r.title;
  } else {
    const w = cache.weeklyTasks.find(x=>x.id===itemId);
    if(!w) return;
    assignedTo = w.assigned_to; title = w.title;
  }
  if(!assignedTo) return;
  await sb.from('points_log').insert({
    business_id: session.businessId,
    staff_id: assignedTo,
    points: 1,
    reason: `Completed: ${title}`,
    date: todayStr(),
    awarded_by: session.staffId,
  });
}
function computePresenceStreak(staffId){
  let streak = 0;
  let d = new Date();
  // if today isn't marked present yet, start counting from yesterday so a streak in progress still shows
  const todayRec = cache.attendance.find(a=>a.staff_id===staffId && a.date===todayStr());
  if(!todayRec || todayRec.status!=='present') d.setDate(d.getDate()-1);
  while(true){
    const rec = cache.attendance.find(a=>a.staff_id===staffId && a.date===localDateStr(d));
    if(rec && rec.status==='present'){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
  return streak;
}
let attendanceSubTab = 'daily'; // 'daily' | 'calendar'
let attendanceCalendarMonth = monthKey(todayStr());
let attendanceCalendarStaffId = 'all';
let attendanceCalendarStatusFilter = 'all'; // 'all' | 'present' | 'absent'

window.__setAttendanceSubTab = function(sub) {
  attendanceSubTab = sub || 'daily';
  renderTabBody();
};

window.__setCalendarReportMonth = function(m) {
  attendanceCalendarMonth = m || monthKey(todayStr());
  renderTabBody();
};

window.__prevCalendarMonth = function() {
  const parts = attendanceCalendarMonth.split('-');
  let y = parseInt(parts[0], 10) || 2026;
  let m = parseInt(parts[1], 10) - 1;
  if (m < 1) { m = 12; y--; }
  attendanceCalendarMonth = `${y}-${String(m).padStart(2, '0')}`;
  renderTabBody();
};

window.__nextCalendarMonth = function() {
  const parts = attendanceCalendarMonth.split('-');
  let y = parseInt(parts[0], 10) || 2026;
  let m = parseInt(parts[1], 10) + 1;
  if (m > 12) { m = 1; y++; }
  attendanceCalendarMonth = `${y}-${String(m).padStart(2, '0')}`;
  renderTabBody();
};

window.__todayCalendarMonth = function() {
  attendanceCalendarMonth = monthKey(todayStr());
  renderTabBody();
};

window.__setCalendarReportStaff = function(st) {
  attendanceCalendarStaffId = st || 'all';
  renderTabBody();
};

window.__setCalendarStatusFilter = function(f) {
  attendanceCalendarStatusFilter = f || 'all';
  renderTabBody();
};

window.__openCalendarDayDetailModal = function(dateStr, staffId) {
  const activeStaffList = typeof getActiveStaff === 'function' ? getActiveStaff() : cache.staff.filter(s => isStaffActive(s));
  const targetStaffList = (staffId === 'all' || !staffId) ? activeStaffList : activeStaffList.filter(s => s.id === staffId);
  const prettyDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  const pCount = dayRecords.filter(a => a.status === 'present').length;
  const aCount = dayRecords.filter(a => a.status === 'absent').length;
  const totalTarget = targetStaffList.length || 1;
  const attPct = Math.round((pCount / totalTarget) * 100);

  const html = `
    <div class="overlay show" onclick="if(event.target===this) getModalHolder('taskModalHolder').innerHTML=''">
      <div class="modal" style="max-width:480px;width:94%;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div>
            <h3 style="margin:0;font-size:0.95rem;color:var(--ink);display:inline-flex;align-items:center;gap:6px;">
              ${icon('weekly',16)} Attendance Detail
            </h3>
            <div style="font-size:0.75rem;color:var(--ink-soft);margin-top:2px;font-weight:600;">${prettyDate}</div>
          </div>
          <button class="stamp-btn small ghost" onclick="getModalHolder('taskModalHolder').innerHTML=''">✕</button>
        </div>

        <!-- Quick Summary Bar inside modal -->
        <div style="display:flex;gap:6px;margin-bottom:12px;background:var(--paper-line);padding:6px;border-radius:8px;">
          <div style="flex:1;background:var(--paper);padding:6px;border-radius:6px;text-align:center;">
            <div style="font-size:0.9rem;font-weight:700;color:var(--leaf);">${pCount}</div>
            <div style="font-size:0.58rem;color:var(--ink-soft);text-transform:uppercase;font-weight:600;">✓ Present</div>
          </div>
          <div style="flex:1;background:var(--paper);padding:6px;border-radius:6px;text-align:center;">
            <div style="font-size:0.9rem;font-weight:700;color:var(--brick);">${aCount}</div>
            <div style="font-size:0.58rem;color:var(--ink-soft);text-transform:uppercase;font-weight:600;">× Absent</div>
          </div>
          <div style="flex:1;background:var(--paper);padding:6px;border-radius:6px;text-align:center;">
            <div style="font-size:0.9rem;font-weight:700;color:var(--turmeric-dark);">${attPct}%</div>
            <div style="font-size:0.58rem;color:var(--ink-soft);text-transform:uppercase;font-weight:600;">Score</div>
          </div>
        </div>

        <!-- Staff Records List -->
        <div style="display:flex;flex-direction:column;gap:8px;max-height:360px;overflow-y:auto;">
          ${targetStaffList.map(s => {
            const rec = dayRecords.find(a => a.staff_id === s.id);
            const status = rec ? rec.status : 'unmarked';
            const timeVal = rec && rec.marked_at ? timeStr(rec.marked_at) : 'Not marked';
            const locLink = rec && rec.marked_lat != null ? `<a class="link" href="${mapLink(rec.marked_lat, rec.marked_lng)}" target="_blank" style="font-size:0.68rem;display:inline-flex;align-items:center;gap:3px;">${icon('pin',12)} Mapped Location</a>` : '';
            return `
              <div style="background:var(--paper);padding:8px 10px;border-radius:8px;border:1px solid var(--paper-line);display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <b style="font-size:0.8rem;color:var(--ink);display:block;">${esc(s.name)}</b>
                  <span style="font-size:0.68rem;color:var(--ink-soft);font-family:'Roboto Mono',monospace;">${timeVal}</span>
                  ${locLink ? `<div style="margin-top:2px;">${locLink}</div>` : ''}
                </div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <span class="stamp ${status}" style="font-size:0.68rem;">${status}</span>
                  ${isManagerPlus() ? `
                    <button class="stamp-btn small ghost" style="font-size:0.65rem;padding:2px 6px;" onclick="getModalHolder('taskModalHolder').innerHTML=''; window.__markStaffAttendanceForDate('${s.id}', '${dateStr}', '${status==='present'?'absent':'present'}')">
                      Switch
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
  holder.innerHTML = html;
};

window.__markStaffAttendanceForDate = async function(staffId, dateStr, status) {
  const key = 'markatt-' + staffId + '-' + dateStr;
  if (__busyKeys.has(key)) return;
  __busyKeys.add(key);

  const nowIso = new Date().toISOString();
  let existing = cache.attendance.find(a => a.staff_id === staffId && a.date === dateStr);
  if (existing) {
    existing.status = status;
    existing.marked_at = nowIso;
    existing.marked_by = session.staffId;
  } else {
    existing = {
      id: 'loc_att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      business_id: session.businessId,
      staff_id: staffId,
      date: dateStr,
      status: status,
      marked_at: nowIso,
      marked_by: session.staffId
    };
    cache.attendance.unshift(existing);
  }
  if (typeof saveCacheLocally === 'function') saveCacheLocally();
  renderTabBody();
  if (typeof showToast === 'function') showToast(`ATTENDANCE MARKED: ${status.toUpperCase()}`, status === 'present' ? 'success' : 'warning');

  try {
    const data = { status, marked_at: nowIso, marked_by: session.staffId };
    if (existing.id && !existing.id.startsWith('loc_')) {
      await sbCheck(sb.from('attendance').update(data).eq('id', existing.id));
    } else {
      const { data: inserted } = await sb.from('attendance').insert({ business_id: session.businessId, staff_id: staffId, date: dateStr, ...data }).select().single();
      if (inserted && inserted.id) existing.id = inserted.id;
    }
    if (typeof saveCacheLocally === 'function') saveCacheLocally();
  } catch(e) {
    console.warn('Background calendar attendance sync warning:', e.message || e);
  } finally {
    __busyKeys.delete(key);
  }
};

function renderAttendanceCalendarViewReport() {
  const parts = attendanceCalendarMonth.split('-');
  const year = parseInt(parts[0], 10) || 2026;
  const month = parseInt(parts[1], 10) || 8;
  const today = todayStr();

  const monthDateObj = new Date(year, month - 1, 1);
  const monthTitlePretty = monthDateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const selectedStaffId = (attendanceCalendarStaffId === 'all' && !isManagerPlus()) ? session.staffId : attendanceCalendarStaffId;

  const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sun
  const totalDays = new Date(year, month, 0).getDate();

  const monthRecords = cache.attendance.filter(a => monthKey(a.date) === attendanceCalendarMonth);
  let targetRecords = monthRecords;
  if (selectedStaffId !== 'all') {
    targetRecords = monthRecords.filter(a => a.staff_id === selectedStaffId);
  }

  const presentCount = targetRecords.filter(a => a.status === 'present').length;
  const absentCount = targetRecords.filter(a => a.status === 'absent').length;

  let pastWeekdays = 0;
  for (let d = 1; d <= totalDays; d++) {
    const dateNum = String(d).padStart(2, '0');
    const dStr = `${year}-${String(month).padStart(2,'0')}-${dateNum}`;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    if (dayOfWeek !== 0 && dStr <= today) {
      pastWeekdays++;
    }
  }

  const activeStaffList = typeof getActiveStaff === 'function' ? getActiveStaff() : cache.staff;
  const denominator = selectedStaffId === 'all' ? Math.max(1, pastWeekdays * activeStaffList.length) : Math.max(1, pastWeekdays);
  const scorePct = Math.min(100, Math.round((presentCount / denominator) * 100));

  const staffOptions = activeStaffList.map(s => `<option value="${s.id}" ${selectedStaffId===s.id?'selected':''}>${esc(s.name)}</option>`).join('');
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayHeadersHtml = dayNames.map((dName, idx) => `
    <div class="att-cal-header-cell" style="color:${idx===0?'var(--brick)':'var(--ink-soft)'};">
      ${dName}
    </div>
  `).join('');

  let cellsHtml = '';
  for (let i = 0; i < firstDayIndex; i++) {
    cellsHtml += `<div class="att-cal-cell" style="background:var(--paper-line);opacity:0.25;border-color:transparent;cursor:default;"></div>`;
  }

  const totalStaffCount = (selectedStaffId === 'all' ? activeStaffList.length : 1) || 1;

  for (let d = 1; d <= totalDays; d++) {
    const dateNum = String(d).padStart(2, '0');
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${dateNum}`;
    const isToday = dateStr === today;
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const isSunday = dayOfWeek === 0;
    const isSaturday = dayOfWeek === 6;
    const isWeekend = isSunday || isSaturday;

    let pPct = 0;
    let aPct = 0;

    if (selectedStaffId !== 'all') {
      const rec = targetRecords.find(a => a.date === dateStr);
      if (rec) {
        const isP = rec.status === 'present';
        if (isP) { pCount = 1; pPct = 100; } else { aCount = 1; aPct = 100; }
        const badgeColor = isP ? 'var(--leaf)' : 'var(--brick)';
        const badgeBg = isP ? 'var(--leaf-soft)' : '#FEE2E2';
        const timeVal = rec.marked_at ? timeStr(rec.marked_at) : '';
        const hasLoc = rec.marked_lat != null;

        cellContent = `
          <div style="display:flex;flex-direction:column;gap:2px;align-items:flex-start;">
            <span class="att-cal-badge" style="background:${badgeBg};color:${badgeColor};">
              <span class="desktop-only">${isP ? '✓ Present' : '× Absent'}</span>
              <span class="mobile-only">${isP ? '✓P' : '×A'}</span>
            </span>
            ${timeVal ? `<div class="desktop-only" style="font-size:0.68rem;color:var(--ink-soft);margin-top:2px;font-family:'Roboto Mono',monospace;">${timeVal}</div>` : ''}
            ${hasLoc ? `<div class="desktop-only" style="font-size:0.65rem;color:var(--leaf);margin-top:1px;">📍 Mapped</div>` : ''}
          </div>
        `;
      } else if (isSunday) {
        cellContent = `<span style="font-size:0.58rem;font-weight:600;color:var(--ink-soft);display:inline-block;">OFF</span>`;
      } else if (dateStr < today) {
        cellContent = `<span style="font-size:0.58rem;font-weight:700;color:var(--brick);display:inline-block;">—</span>`;
      }
    } else {
      const dayAtts = monthRecords.filter(a => a.date === dateStr);
      pCount = dayAtts.filter(a => a.status === 'present').length;
      aCount = dayAtts.filter(a => a.status === 'absent').length;

      if (pCount > 0 || aCount > 0) {
        pPct = Math.min(100, Math.round((pCount / totalStaffCount) * 100));
        aPct = Math.min(100 - pPct, Math.round((aCount / totalStaffCount) * 100));

        cellContent = `
          <div style="display:flex;flex-wrap:wrap;gap:2px;align-items:center;">
            ${pCount > 0 ? `<span class="att-cal-badge" style="background:var(--leaf-soft);color:var(--leaf);"><span class="desktop-only">✓ ${pCount} Present</span><span class="mobile-only">✓${pCount}</span></span>` : ''}
            ${aCount > 0 ? `<span class="att-cal-badge" style="background:#FEE2E2;color:var(--brick);"><span class="desktop-only">× ${aCount} Absent</span><span class="mobile-only">×${aCount}</span></span>` : ''}
          </div>
        `;
      } else if (isSunday) {
        cellContent = `<span style="font-size:0.58rem;font-weight:600;color:var(--ink-soft);display:inline-block;">OFF</span>`;
      }
    }

    // Status filter matching
    let dimStyle = '';
    if (attendanceCalendarStatusFilter === 'present' && pCount === 0) dimStyle = 'opacity:0.4;';
    if (attendanceCalendarStatusFilter === 'absent' && aCount === 0) dimStyle = 'opacity:0.4;';

    // Weekend background shading
    const weekendBg = isWeekend ? 'background:rgba(241,245,249,0.65);' : '';

    // Cell title hover preview
    const hoverTitle = `${monthTitlePretty} ${d}: ${pCount} Present, ${aCount} Absent`;

    cellsHtml += `
      <div onclick="window.__openCalendarDayDetailModal('${dateStr}', '${selectedStaffId}')" 
           title="${hoverTitle}"
           class="att-cal-cell ${isToday ? 'is-today' : ''}"
           style="${weekendBg} ${dimStyle}">
        <div style="display:flex;justify-content:space-between;align-items:center;width:100%;">
          ${isToday ? `<span style="font-size:0.58rem;font-weight:700;background:var(--turmeric);color:#FFF;padding:1px 5px;border-radius:4px;letter-spacing:0.02em;">TODAY</span>` : '<div></div>'}
          <b style="font-size:0.9rem;color:${isSunday?'var(--brick)':'var(--ink)'};">${d}</b>
        </div>
        
        <div style="flex:1;display:flex;align-items:center;margin:4px 0;">
          ${cellContent}
        </div>

        <!-- Uniform 5-6px Attendance Indicator Bar Pinned at Bottom -->
        <div class="att-cal-indicator-track">
          ${pPct > 0 ? `<div style="width:${pPct}%;background:var(--leaf);height:100%;transition:width 0.3s ease;"></div>` : ''}
          ${aPct > 0 ? `<div style="width:${aPct}%;background:var(--brick);height:100%;transition:width 0.3s ease;"></div>` : ''}
        </div>
      </div>
    `;
  }

  return `
    <!-- Top Executive Controls & Filters -->
    <div class="row-card" style="flex-direction:column;align-items:stretch;gap:10px;padding:12px 14px;margin-bottom:14px;width:100%;box-sizing:border-box;">
      
      <!-- Month Navigation Bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="stamp-btn small ghost" onclick="window.__prevCalendarMonth()" style="padding:4px 10px;font-size:0.78rem;">‹ Prev</button>
          <b style="font-size:0.95rem;color:var(--ink);padding:0 4px;">${monthTitlePretty}</b>
          <button class="stamp-btn small ghost" onclick="window.__nextCalendarMonth()" style="padding:4px 10px;font-size:0.78rem;">Next ›</button>
          <button class="stamp-btn small" onclick="window.__todayCalendarMonth()" style="padding:4px 8px;font-size:0.72rem;background:var(--turmeric);color:#FFF;border-color:var(--turmeric);">Today</button>
        </div>

        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <input type="month" value="${attendanceCalendarMonth}" onchange="window.__setCalendarReportMonth(this.value)" style="font-size:0.78rem;padding:4px 8px;border-radius:6px;border:1px solid var(--paper-line);">
          ${isManagerPlus() ? `
            <select onchange="window.__setCalendarReportStaff(this.value)" style="font-size:0.78rem;padding:4px 8px;border-radius:6px;border:1px solid var(--paper-line);">
              <option value="all" ${selectedStaffId==='all'?'selected':''}>👥 All Staff Members</option>
              ${staffOptions}
            </select>
          ` : ''}
        </div>
      </div>

      <!-- Quick Status Filter Pills & Legend Bar -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding-top:8px;border-top:1px dashed var(--paper-line);">
        <div style="display:flex;align-items:center;gap:4px;">
          <span style="font-size:0.65rem;font-weight:700;color:var(--ink-soft);margin-right:4px;">FILTER:</span>
          <button class="stamp-btn small ${attendanceCalendarStatusFilter==='all'?'':'ghost'}" style="padding:2px 8px;font-size:0.65rem;" onclick="window.__setCalendarStatusFilter('all')">All</button>
          <button class="stamp-btn small ${attendanceCalendarStatusFilter==='present'?'':'ghost'}" style="padding:2px 8px;font-size:0.65rem;${attendanceCalendarStatusFilter==='present'?'background:var(--leaf);border-color:var(--leaf);color:#FFF;':''}" onclick="window.__setCalendarStatusFilter('present')">✓ Present</button>
          <button class="stamp-btn small ${attendanceCalendarStatusFilter==='absent'?'':'ghost'}" style="padding:2px 8px;font-size:0.65rem;${attendanceCalendarStatusFilter==='absent'?'background:var(--brick);border-color:var(--brick);color:#FFF;':''}" onclick="window.__setCalendarStatusFilter('absent')">× Absent</button>
        </div>

        <div style="display:flex;align-items:center;gap:10px;font-size:0.65rem;color:var(--ink-soft);font-weight:600;">
          <span style="display:inline-flex;align-items:center;gap:4px;"><b style="color:var(--leaf);">●</b> Present</span>
          <span style="display:inline-flex;align-items:center;gap:4px;"><b style="color:var(--brick);">●</b> Absent</span>
          <span style="display:inline-flex;align-items:center;gap:4px;"><b style="color:#94A3B8;">●</b> Weekend/Off</span>
        </div>
      </div>

    </div>

    <!-- Attendance KPI Executive Scorecard -->
    <div class="stat-grid" style="margin-bottom:14px;width:100%;box-sizing:border-box;">
      <div class="stat-card" style="border-left:4px solid var(--leaf);padding:10px 12px;">
        <div class="num" style="color:var(--leaf);font-size:1.1rem;">${presentCount} Present</div>
        <div class="label" style="font-size:0.68rem;">Total Monthly Present Marks</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--brick);padding:10px 12px;">
        <div class="num" style="color:var(--brick);font-size:1.1rem;">${absentCount} Absent</div>
        <div class="label" style="font-size:0.68rem;">Total Monthly Absent Marks</div>
      </div>
      <div class="stat-card" style="border-left:4px solid var(--turmeric);padding:10px 12px;">
        <div class="num" style="color:var(--turmeric-dark);font-size:1.1rem;">${scorePct}% Attendance</div>
        <div class="label" style="font-size:0.68rem;">Calculated Rate (${activeStaffList.length} Active Staff)</div>
      </div>
    </div>

    <!-- Calendar Grid Container (Guaranteed 7-Column Layout) -->
    <div class="att-cal-container" style="width:100%;box-sizing:border-box;background:var(--paper);border:1px solid var(--paper-line);border-radius:12px;padding:16px;margin-bottom:20px;">
      <div class="att-cal-grid" style="display:grid !important;grid-template-columns:repeat(7, 1fr) !important;gap:8px;width:100%;box-sizing:border-box;margin-bottom:8px;">
        ${dayHeadersHtml}
      </div>
      <div class="att-cal-grid" style="display:grid !important;grid-template-columns:repeat(7, 1fr) !important;gap:8px;width:100%;box-sizing:border-box;">
        ${cellsHtml}
      </div>
    </div>
  `;
}

function renderAttendanceTab(body){
  const today = todayStr();
  const curMonth = monthKey(today);
  if(!cache.staff.length){ body.innerHTML = `
    <div class="empty">No staff added yet.</div>`; return; }

  const myToday = cache.attendance.find(a=>a.staff_id===session.staffId && a.date===today);
  const myStreak = computePresenceStreak(session.staffId);
  const selfSection = `
    <div class="section-label">Your attendance — ${today}</div>
    ${myStreak>1 ? `<div class="row-card" style="align-items:center;background:var(--blue-soft);border-color:var(--turmeric);"><div class="row-main"><h3 style="margin:0;">${icon('fire',18)} ${myStreak}-day streak</h3></div></div>` : ''}
    <div class="row-card" style="flex-direction:column;align-items:stretch;">
      <div class="row-main">
        <div class="meta">
          <span class="stamp ${myToday?myToday.status:'unmarked'}">${myToday ? myToday.status : 'not marked yet'}</span>
          ${myToday && myToday.marked_at ? `<span>at ${timeStr(myToday.marked_at)}</span>` : ''}
        </div>
      </div>
      <div class="modal-actions">
        <button class="attend-btn present ${myToday&&myToday.status==='present'?'active':''}" onclick="window.__markMyAttendance('present')">Present</button>
        <button class="attend-btn absent ${myToday&&myToday.status==='absent'?'active':''}" onclick="window.__markMyAttendance('absent')">Absent</button>
      </div>
      <div class="modal-actions" style="margin-top:6px;">
        <button class="stamp-btn ghost small" style="flex:1;" onclick="window.__markImIn()">${icon('logout',16)} I'm in (back from break)</button>
      </div>
    </div>`;

  window.__markImIn = async () => {
    const key = 'imin-'+session.staffId;
    if(__busyKeys.has(key)) return;
    __busyKeys.add(key);
    try{
      const loc = await getLocation();
      await sbCheck(sb.from('break_returns').insert({
        business_id: session.businessId, staff_id: session.staffId,
        marked_at: new Date().toISOString(),
        lat: loc?loc.lat:null, lng: loc?loc.lng:null,
      }));
      notifyOwnerOfAttendance("is back in (after a break)", loc);
      const banner = document.createElement('div');
      banner.className = 'celebrate-banner';
      banner.textContent = "Marked — you're in!";
      document.body.appendChild(banner);
      setTimeout(()=>banner.remove(), 1500);
    } catch(e){
      alert('Could not send this — please check your connection and try again.\n\n('+(e.message||e)+')');
    } finally { __busyKeys.delete(key); }
  };

  window.__markMyAttendance = async (status) => {
    const key = 'markatt-' + session.staffId + '-' + today;
    if (__busyKeys.has(key)) return;
    __busyKeys.add(key);

    const nowIso = new Date().toISOString();
    let existing = cache.attendance.find(a => a.staff_id === session.staffId && a.date === today);
    if (existing) {
      existing.status = status;
      existing.marked_at = nowIso;
      existing.marked_by = session.staffId;
    } else {
      existing = {
        id: 'loc_att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        business_id: session.businessId,
        staff_id: session.staffId,
        date: today,
        status: status,
        marked_at: nowIso,
        marked_by: session.staffId
      };
      cache.attendance.unshift(existing);
    }
    if (typeof saveCacheLocally === 'function') saveCacheLocally();
    renderTabBody();
    if (typeof showToast === 'function') showToast(`ATTENDANCE MARKED: ${status.toUpperCase()}`, status === 'present' ? 'success' : 'warning');

    (async () => {
      try {
        const loc = await getLocation(1200);
        const data = { status, marked_at: nowIso, marked_by: session.staffId };
        if (loc) {
          data.marked_lat = loc.lat;
          data.marked_lng = loc.lng;
          existing.marked_lat = loc.lat;
          existing.marked_lng = loc.lng;
        }

        if (existing.id && !existing.id.startsWith('loc_')) {
          await sbCheck(sb.from('attendance').update(data).eq('id', existing.id));
        } else {
          const { data: inserted } = await sb.from('attendance').insert({ business_id: session.businessId, staff_id: session.staffId, date: today, ...data }).select().single();
          if (inserted && inserted.id) existing.id = inserted.id;
        }
        if (typeof saveCacheLocally === 'function') saveCacheLocally();
        if (status === 'present') notifyOwnerOfAttendance('marked present', loc);
      } catch (e) {
        console.warn('Background self attendance sync warning:', e.message || e);
      } finally {
        __busyKeys.delete(key);
      }
    })();
  };

  window.__markStaffAttendance = async (staffId, status) => {
    const key = 'markatt-' + staffId + '-' + today;
    if (__busyKeys.has(key)) return;
    __busyKeys.add(key);

    const nowIso = new Date().toISOString();
    let existing = cache.attendance.find(a => a.staff_id === staffId && a.date === today);
    if (existing) {
      existing.status = status;
      existing.marked_at = nowIso;
      existing.marked_by = session.staffId;
    } else {
      existing = {
        id: 'loc_att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        business_id: session.businessId,
        staff_id: staffId,
        date: today,
        status: status,
        marked_at: nowIso,
        marked_by: session.staffId
      };
      cache.attendance.unshift(existing);
    }
    if (typeof saveCacheLocally === 'function') saveCacheLocally();
    renderTabBody();
    if (typeof showToast === 'function') showToast(`STAFF MARKED: ${status.toUpperCase()}`, status === 'present' ? 'success' : 'warning');

    (async () => {
      try {
        const data = { status, marked_at: nowIso, marked_by: session.staffId };
        if (existing.id && !existing.id.startsWith('loc_')) {
          await sbCheck(sb.from('attendance').update(data).eq('id', existing.id));
        } else {
          const { data: inserted } = await sb.from('attendance').insert({ business_id: session.businessId, staff_id: staffId, date: today, ...data }).select().single();
          if (inserted && inserted.id) existing.id = inserted.id;
        }
        if (typeof saveCacheLocally === 'function') saveCacheLocally();
      } catch (e) {
        console.warn('Background staff attendance sync warning:', e.message || e);
      } finally {
        __busyKeys.delete(key);
      }
    })();
  };

  // Sub-Tab Switcher Navigation Header
  const subTabHeaderHtml = `
    <div class="row-card" style="padding:4px;margin-bottom:12px;background:var(--paper-line);display:flex;gap:4px;">
      <button class="stamp-btn small ${attendanceSubTab==='daily'?'':'ghost'}" style="flex:1;font-size:0.68rem;padding:4px 6px;" onclick="window.__setAttendanceSubTab('daily')">
        ${icon('clipboard',14)} Daily Punch Log
      </button>
      <button class="stamp-btn small ${attendanceSubTab==='calendar'?'':'ghost'}" style="flex:1;font-size:0.68rem;padding:4px 6px;" onclick="window.__setAttendanceSubTab('calendar')">
        ${icon('weekly',14)} Calendar View Report
      </button>
    </div>
  `;

  if (attendanceSubTab === 'calendar') {
    body.innerHTML = subTabHeaderHtml + renderAttendanceCalendarViewReport();
    return;
  }

  if(isManagerPlus()){
    const monthAtt = cache.attendance.filter(a=>monthKey(a.date)===curMonth);
    body.innerHTML = `
      ${subTabHeaderHtml}
      ${selfSection}
      <div class="section-label">Team — Today</div>
      ${getActiveStaff().map(s=>{
        const rec = cache.attendance.find(a=>a.staff_id===s.id && a.date===today);
        const status = rec ? rec.status : 'unmarked';
        const loc = rec && rec.marked_lat!=null ? `<a class="link" href="${mapLink(rec.marked_lat,rec.marked_lng)}" target="_blank">${icon('pin',14)}</a>` : '';
        return `<div class="row-card" style="align-items:center;">
          <div class="row-main"><h3>${esc(s.name)}</h3><div class="meta"><span class="stamp ${status}">${status}</span>${rec&&rec.marked_at?`<span>${timeStr(rec.marked_at)}</span>`:''}${loc?`<span>${loc}</span>`:''}</div></div>
          <div class="row-actions" style="flex-direction:row;">
            <button class="attend-btn present ${status==='present'?'active':''}" onclick="window.__markStaffAttendance('${s.id}','present')">Present</button>
            <button class="attend-btn absent ${status==='absent'?'active':''}" onclick="window.__markStaffAttendance('${s.id}','absent')">Absent</button>
          </div>
        </div>`;
      }).join('')}
      <div class="section-label">Monthly summary — ${curMonth}</div>
      ${getActiveStaff().map(s=>{
        const mine = monthAtt.filter(a=>a.staff_id===s.id);
        const daysPresent = mine.filter(a=>a.status==='present').length;
        const daysAbsent = mine.filter(a=>a.status==='absent').length;
        return `<div class="row-card" style="align-items:center;">
          <div class="row-main"><h3>${esc(s.name)}</h3>
            <div class="kv"><span>Days present</span><b style="color:var(--turmeric)">${daysPresent}</b></div>
            <div class="kv"><span>Days absent</span><b style="color:var(--turmeric)">${daysAbsent}</b></div>
          </div>
        </div>`;
      }).join('')}
      ${isOwner() ? `
      <div class="section-label">History</div>
      ${cache.attendance.filter(a=>a.date!==today && a.status).slice(0,30).map(a=>{
        const loc = a.marked_lat!=null ? `<a class="link" href="${mapLink(a.marked_lat,a.marked_lng)}" target="_blank">${icon('pin',14)}</a>` : '';
        return `<div class="row-card" style="align-items:center;"><div class="row-main"><div class="meta"><span>${a.date}</span><span>${staffName(a.staff_id)}</span>${loc?`<span>${loc}</span>`:''}</div></div>
        <span class="stamp ${a.status}">${a.status}</span></div>`;
      }).join('') || `<div class="empty">No earlier records yet.</div>`}
      ` : ''}
    `;
  } else {
    body.innerHTML = `
      ${subTabHeaderHtml}
      ${selfSection}
      <div class="section-label">Your recent history</div>
      ${cache.attendance.filter(a=>a.staff_id===session.staffId && a.date!==today && a.status).slice(0,20).map(a=>`
        <div class="row-card" style="align-items:center;"><div class="row-main"><div class="meta"><span>${a.date}</span></div></div>
        <span class="stamp ${a.status}">${a.status}</span></div>`).join('') || `<div class="empty">No attendance history yet.</div>`}
    `;
  }
}

