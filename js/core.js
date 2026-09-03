let createClient;
if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
  createClient = window.supabase.createClient;
} else if (window['sb'] && window['sb'].createClient) {
  createClient = window['sb'].createClient;
} else {
  createClient = function() {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [] }),
            single: () => Promise.resolve({ data: null }),
            maybeSingle: () => Promise.resolve({ data: null })
          }),
          order: () => Promise.resolve({ data: [] })
        }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null }) }) }),
        upsert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null }) }) }),
        update: () => ({ eq: () => Promise.resolve({ data: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ data: null }) })
      })
    };
  };
}


/* ================================================================
   >>> EDIT THIS SECTION BEFORE DEPLOYING <<<
   Paste your Supabase anon/publishable key on the line below,
   between the quotes. Get it from: Supabase → Settings → API Keys
   ================================================================ */
const DEFAULT_SUPABASE_URL = 'https://uxkimcabvvgbrdpkvond.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_g3dzrIJkPdEPu4Aw7LxsnA_hpQIo5Qw';   // <-- paste your full key here, inside the quotes
/* ================================================================ */




/* Completely Disabled Old Top Progress Bar Loader */
window.__showSyncProgress = function() {};
window.__hideSyncProgress = function() {};


/* ---------------- SMALL RELOAD ICON BUTTON ENGINE ---------------- */
window.__reloadAppData = async function(btn) {
  if (btn) btn.classList.add('spinning');
  showLoading('Reloading Data...');
  try {
    await loadData();
    renderTabBody();
    if (typeof window.showToast === 'function') window.showToast('🔄 Data refreshed!', 'success');
  } catch(e) {
    console.warn('Reload exception:', e);
  } finally {
    hideLoading('✓ Refreshed');
    if (btn) setTimeout(() => btn.classList.remove('spinning'), 500);
  }
};


/* ---------------- MOBILE HAPTIC VIBRATION ENGINE (Feature 5) ---------------- */
window.__vibrate = function(pattern = 15) {
  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch(e){}
};

/* ---------------- COMPACT CARD DENSITY TOGGLE ENGINE (Feature 2) ---------------- */
let isCompactView = localStorage.getItem('br_compact_view') === '1';

window.__toggleCompactView = function() {
  isCompactView = !isCompactView;
  localStorage.setItem('br_compact_view', isCompactView ? '1' : '0');
  const appEl = document.getElementById('app');
  if (appEl) {
    if (isCompactView) appEl.classList.add('compact-density');
    else appEl.classList.remove('compact-density');
  }
  window.__vibrate(20);
  renderTabBody();
  if (typeof window.showToast === 'function') {
    window.showToast(isCompactView ? '📄 Compact View Enabled (8-10 items/screen)' : '📋 Detailed View Enabled', 'info');
  }
};

function showLoading(msg) {
  const tabBody = document.getElementById('tabBody');
  if (tabBody && typeof window.__renderSkeletonHtml === 'function') {
    tabBody.innerHTML = window.__renderSkeletonHtml(4);
  }
  if (typeof window.__showSyncProgress === 'function') window.__showSyncProgress(msg || 'Syncing to Cloud...');
}
function hideLoading(successMsg) {
  if (typeof window.__hideSyncProgress === 'function') window.__hideSyncProgress(successMsg || '✓ Cloud Synced');
}


/* ---- Task local persistence helper ---- */
function _tasksSave() {
  if (!session || !session.businessId) return;
  try { localStorage.setItem('br_tasks_' + session.businessId, JSON.stringify(cache.tasks)); } catch(e){}
}
function _tasksRender() {
  taskFilter = { staffId: '', priority: '', search: '' };
  taskSubTab = 'active';
  renderTabBody();
}

const app = document.getElementById('app');
let sb = null;
let session = JSON.parse(localStorage.getItem('br_session') || 'null'); // {staffId, name, role, businessId, businessName}
let cache = { businesses: [], staff: [], tasks: [], attendance: [], sales: [], routines: [], routineLog: [], points: [], labels: [], weeklyTasks: [], weeklyTaskLog: [], packages: [], salesmanLocations: [], salaries: [], salesTargets: [], trophies: [], stockChecks: [], dailyAccounts: [], vendorBills: [], lowStocks: [], vendorParties: [], vendorPayments: [] };
let activeTab = 'tasks';
let taskFilter = { staffId: '', priority: '', search: '' };
let taskSubTab = 'active'; // 'active' | 'history'
let expandedDoneIds = new Set();

function saveCacheLocally() {
  if (!session || !session.businessId) return;
  const bizId = session.businessId;
  try {
    if (cache.staff) localStorage.setItem('br_staff_' + bizId, JSON.stringify(cache.staff));
    if (cache.tasks) localStorage.setItem('br_tasks_' + bizId, JSON.stringify(cache.tasks));
  } catch(e){}
}

/* ---------------- bootstrap ---------------- */
function getConfig(){
  const stored = JSON.parse(localStorage.getItem('br_config') || 'null');
  if(stored) return stored;
  if(DEFAULT_SUPABASE_URL && DEFAULT_SUPABASE_KEY) return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_KEY };
  return null;
}
function saveConfig(url, key){ localStorage.setItem('br_config', JSON.stringify({url,key})); }

function renderBootErrorUI(err) {
  const appEl = document.getElementById('app') || document.body;
  const msg = (err && err.message) ? err.message : String(err);
  appEl.innerHTML = `
    <div class="center-screen" style="padding:20px;">
      <div class="auth-card" style="text-align:center;max-width:420px;margin:auto;">
        <h2 style="color:var(--turmeric);margin:0 0 10px;font-size:1.2rem;">⚠️ App Launch Notice</h2>
        <p style="color:var(--ink-soft);font-size:0.85rem;line-height:1.4;margin:0 0 18px;">${esc(msg)}</p>
        <div class="modal-actions" style="display:flex;gap:10px;flex-direction:column;">
          <button class="stamp-btn" style="width:100%;" onclick="localStorage.removeItem('br_session'); location.reload();">🔄 Re-login &amp; Reload</button>
          <button class="stamp-btn ghost" style="width:100%;" onclick="localStorage.clear(); location.reload();">🗑 Reset App Data &amp; Reload</button>
        </div>
      </div>
    </div>
  `;
}

window.addEventListener('error', function(e) {
  console.error('Global Error Captured:', e.error || e.message);
  if (!document.getElementById('app') || !document.getElementById('app').children.length) {
    renderBootErrorUI(e.error || e.message || 'System initialization error.');
  }
});

window.addEventListener('unhandledrejection', function(e) {
  console.error('Unhandled Promise Rejection Captured:', e.reason);
  if (!document.getElementById('app') || !document.getElementById('app').children.length) {
    renderBootErrorUI(e.reason || 'Network or Async Promise Rejection');
  }
});

async function boot(){
  try {
    const cfg = getConfig();
    if(!cfg){ renderSetup(); return; }
    if(typeof createClient === 'function') {
      sb = createClient(cfg.url, cfg.key);
    }
    if(!session){ renderLogin(); return; }

    // Instant UI Render from local cache (0ms delay — eliminates white screen)
    activeTab = (typeof currentTabs === 'function' && currentTabs()[0]) ? currentTabs()[0] : (isManagerPlus() ? 'dashboard' : 'tasks');
    renderShell();

    // Background Async Cloud Data Load
    try {
      await loadData();
      renderTabBody();
    } catch(dataErr) {
      console.warn('Background loadData notice:', dataErr);
    }

    startReminderLoop();
    startPopupReminders();
    playOpenChime();
    showChangelogPopup();
    maybeShowAttendancePrompt();
    maybeShowWeekendBackupPrompt();
  } catch(err) {
    console.error('Fatal boot error:', err);
    renderBootErrorUI(err);
  }
}



/* ---------------- setup screen ---------------- */
function renderSetup(){
  app.innerHTML = `
  <div class="center-screen"><div class="auth-card">
    <h1>Connect your database</h1>
    <p>One-time setup. Create a free project at <a class="link" href="https://sb.com" target="_blank">sb.com</a>, run the schema in its SQL editor, then paste your Project URL and anon public key below (Settings &rarr; API).</p>
    <label>Project URL</label>
    <input id="cfgUrl" placeholder="https://xxxx.supabase.co">
    <label>Anon public key</label>
    <input id="cfgKey" placeholder="eyJhbGciOi...">
    <div class="modal-actions"><button class="stamp-btn" onclick="window.__saveCfg()">Connect</button></div>
    <div id="cfgErr" class="err"></div>
  </div></div>`;
  window.__saveCfg = async () => {
    const url = document.getElementById('cfgUrl').value.trim();
    const key = document.getElementById('cfgKey').value.trim();
    if(!url || !key){ document.getElementById('cfgErr').textContent = 'Both fields are needed.'; return; }
    saveConfig(url, key);
    boot();
  };
}

/* ---------------- login / onboarding ---------------- */
async function renderLogin(){
  const { data: businesses } = await sb.from('businesses').select('*').order('name');
  if(!businesses || businesses.length === 0){ renderOnboarding(); return; }

  app.innerHTML = `
  <div class="center-screen"><div class="auth-card">
    <h1>Sign in</h1>
    <p>Pick your business and name, then enter your PIN.</p>
    <label>Business</label>
    <select id="loginBiz"></select>
    <label>Your name</label>
    <select id="loginStaff"></select>
    <label>PIN</label>
    <input id="loginPin" type="password" inputmode="numeric" placeholder="••••">
    <div class="modal-actions"><button class="stamp-btn" onclick="window.__doLogin()">Sign in</button></div>
    <div id="loginErr" class="err"></div>
    <p style="margin-top:16px;">New business? <a class="link" onclick="window.__toOnboard()">Set one up</a></p>
  </div></div>`;

  const bizSel = document.getElementById('loginBiz');
  bizSel.innerHTML = businesses.map(b=>`<option value="${b.id}">${b.name}</option>`).join('');
  async function loadStaffFor(bizId){
    const { data: staffList } = await sb.from('staff').select('*').eq('business_id', bizId).order('name');
    const sel = document.getElementById('loginStaff');
    sel.innerHTML = (staffList||[]).map(s=>`<option value="${s.id}">${s.name} (${s.role})</option>`).join('') || `<option value="">No staff yet</option>`;
  }
  bizSel.onchange = () => loadStaffFor(bizSel.value);
  await loadStaffFor(bizSel.value);

  window.__toOnboard = renderOnboarding;
  window.__doLogin = async () => {
    const staffId = document.getElementById('loginStaff').value;
    const pin = document.getElementById('loginPin').value.trim();
    if(!staffId || !pin){ document.getElementById('loginErr').textContent='Choose your name and enter your PIN.'; return; }
    const { data: staffRow } = await sb.from('staff').select('*').eq('id', staffId).single();
    if(!staffRow || staffRow.pin !== pin){ document.getElementById('loginErr').textContent='Wrong PIN.'; return; }
    const biz = businesses.find(b=>b.id===staffRow.business_id);
    session = { staffId: staffRow.id, name: staffRow.name, role: staffRow.role, businessId: biz.id, businessName: biz.name };
    localStorage.setItem('br_session', JSON.stringify(session));
    await loadData();
    activeTab = (typeof currentTabs === 'function' && currentTabs()[0]) ? currentTabs()[0] : (isManagerPlus() ? 'dashboard' : 'tasks');
    renderShell();
    startReminderLoop();
    startPopupReminders();
    playOpenChime();
    showChangelogPopup();
    maybeShowAttendancePrompt();
    maybeShowWeekendBackupPrompt();
  };
}

async function renderOnboarding(){
  app.innerHTML = `
  <div class="center-screen"><div class="auth-card">
    <h1>Set up your business</h1>
    <p>Create your business and your own owner account — full control, including staff, roles, and deleting records. You can add staff after signing in.</p>
    <label>Business name</label>
    <input id="obBiz" placeholder="e.g. your shop or company name">
    <label>Your name</label>
    <input id="obName" placeholder="Your name">
    <label>Choose a PIN</label>
    <input id="obPin" type="password" inputmode="numeric" placeholder="4-6 digits">
    <div class="modal-actions"><button class="stamp-btn" onclick="window.__doOnboard()">Create</button></div>
    <div id="obErr" class="err"></div>
  </div></div>`;
  window.__doOnboard = async () => {
    const bizName = document.getElementById('obBiz').value.trim();
    const name = document.getElementById('obName').value.trim();
    const pin = document.getElementById('obPin').value.trim();
    if(!bizName || !name || !pin){ document.getElementById('obErr').textContent='Fill in all fields.'; return; }
    const { data: biz, error: e1 } = await sb.from('businesses').insert({name:bizName}).select().single();
    if(e1){ document.getElementById('obErr').textContent = e1.message; return; }
    const { data: owner, error: e2 } = await sb.from('staff').insert({business_id:biz.id, name, role:'owner', pin}).select().single();
    if(e2){ document.getElementById('obErr').textContent = e2.message; return; }
    session = { staffId: owner.id, name: owner.name, role:'owner', businessId: biz.id, businessName: biz.name };
    localStorage.setItem('br_session', JSON.stringify(session));
    await loadData();
    activeTab = 'dashboard';
    renderShell();
  };
}




window.__showAppAlert = function({ title, message, type = 'info', buttonText = 'OK' }) {
  const old = document.getElementById('appAlertOverlay');
  if(old) old.remove();

  const typeIcons = {
    error: `<div style="width:48px;height:48px;border-radius:50%;background:#FEF2F2;color:#DC2626;border:1px solid #FCA5A5;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.3rem;font-weight:700;">⚠️</div>`,
    success: `<div style="width:48px;height:48px;border-radius:50%;background:#F0FDF4;color:#16A34A;border:1px solid #86EFAC;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.3rem;font-weight:700;">✓</div>`,
    info: `<div style="width:48px;height:48px;border-radius:50%;background:#EFF6FF;color:#2563EB;border:1px solid #93C5FD;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.3rem;font-weight:700;">ℹ</div>`
  };

  const html = `
  <div class="overlay show" id="appAlertOverlay" style="z-index:9999;background:rgba(15,23,42,0.55);">
    <div class="modal" style="max-width:360px;width:90%;background:#FFFFFF;border:1.5px solid var(--paper-line);border-radius:14px;padding:22px 20px;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.2);margin:auto;">
      ${typeIcons[type] || typeIcons.info}
      <h3 style="margin:0 0 6px;font-size:1rem;font-weight:700;color:var(--ink);font-family:'Roboto Mono',monospace;text-transform:uppercase;">${esc(title || 'Notice')}</h3>
      <p style="margin:0 0 16px;font-size:0.8rem;color:var(--ink-soft);line-height:1.4;font-family:'Roboto Mono',monospace;text-transform:uppercase;">${esc(message || '')}</p>
      <button class="stamp-btn" style="width:100%;background:var(--ink);color:#FFFFFF;border:1.5px solid var(--ink);padding:9px 0;border-radius:8px;font-weight:700;font-family:'Roboto Mono',monospace;" onclick="document.getElementById('appAlertOverlay').remove()">${esc(buttonText || 'OK')}</button>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
};

window.__showDeleteConfirm = function({ title, message, onConfirm }) {
  const old = document.getElementById('deleteConfirmOverlay');
  if(old) old.remove();

  const html = `
  <div class="overlay show" id="deleteConfirmOverlay" style="z-index:9999;background:rgba(15,23,42,0.55);">
    <div class="modal" style="max-width:360px;width:90%;background:#FFFFFF;border:1.5px solid var(--paper-line);border-radius:14px;padding:22px 20px;text-align:center;box-shadow:0 16px 40px rgba(0,0,0,0.2);margin:auto;">
      <div style="width:48px;height:48px;border-radius:50%;background:#FEF2F2;color:#DC2626;border:1px solid #FCA5A5;display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:1.3rem;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </div>
      <h3 style="margin:0 0 6px;font-size:1rem;font-weight:700;color:var(--ink);font-family:'Roboto Mono',monospace;text-transform:uppercase;">${esc(title || 'Delete entry?')}</h3>
      <p style="margin:0 0 18px;font-size:0.8rem;color:var(--ink-soft);line-height:1.4;font-family:'Roboto Mono',monospace;text-transform:uppercase;">${esc(message || "This removes it for everyone on this business. It can't be undone.")}</p>
      <div style="display:flex;gap:10px;">
        <button class="stamp-btn ghost" style="flex:1;border:1.5px solid var(--paper-line);color:var(--ink);background:var(--paper);padding:9px 0;" onclick="document.getElementById('deleteConfirmOverlay').remove()">Cancel</button>
        <button class="stamp-btn" style="flex:1;background:var(--brick);color:#FFFFFF;border:1px solid var(--brick);padding:9px 0;" id="deleteConfirmBtn">Delete</button>
      </div>
    </div>
  </div>`;
  document.body.insertAdjacentHTML('beforeend', html);
  document.getElementById('deleteConfirmBtn').onclick = async () => {
    document.getElementById('deleteConfirmOverlay').remove();
    if(typeof onConfirm === 'function') {
      try {
        await onConfirm();
      } catch(err) {
        console.error('Delete action failed:', err);
      }
    }
  };
};

window.__deleteTask = function(id) {
  if (!confirm('Delete this task? This cannot be undone.')) return;

  // 1. Instantly remove from cache & localStorage
  cache.tasks = cache.tasks.filter(t => t.id !== id);
  _tasksSave();
  window.showToast('Task deleted!', 'success');
  renderTabBody();

  // 2. Background DB delete
  if (navigator.onLine && typeof sb !== 'undefined' && !String(id).startsWith('loc_task_')) {
    Promise.resolve(sb.from('tasks').delete().eq('id', id)).catch(() => {});
  }
  logAuditEvent('Task Deleted', 'Deleted task ' + id);
};

window.__deleteAcc = function(identifier) {
  window.__showDeleteConfirm({
    title: 'Delete account entry?',
    message: 'This removes it for everyone on this business. It cannot be undone.',
    onConfirm: async () => {
      showLoading();
      try {
        const target = cache.dailyAccounts.find(a => a.id === identifier || a.date === identifier);
        const dateVal = target ? target.date : identifier;
        
        // Try deleting by UUID or date
        if(target && target.id && !target.id.startsWith('loc_')) {
          await sb.from('daily_accounts').delete().eq('id', target.id);
        } else {
          await sb.from('daily_accounts').delete().eq('business_id', session.businessId).eq('date', dateVal);
        }
      } catch(e){}
      finally {
        const targetDate = (cache.dailyAccounts.find(a => a.id === identifier || a.date === identifier) || {}).date || identifier;
        cache.dailyAccounts = cache.dailyAccounts.filter(a => a.id !== identifier && a.date !== identifier && a.date !== targetDate);
        localStorage.setItem('br_daily_accounts_' + session.businessId, JSON.stringify(cache.dailyAccounts));
        hideLoading();
        await loadData();
        renderTabBody();
      }
    }
  });
}

window.__deleteStaff = function(staffId) {
  window.__showDeleteConfirm({
    title: 'Delete staff member?',
    message: 'This will remove their profile and access to the app. It cannot be undone.',
    onConfirm: async () => {
      showLoading();
      try {
        cache.staff = (cache.staff || []).filter(s => s.id !== staffId);
        saveCacheLocally();
        if (typeof syncCustomCloudPayload === 'function') {
          syncCustomCloudPayload('[STAFF_DIRECTORY_DATA]', cache.staff);
        }
        if (navigator.onLine && typeof sb !== 'undefined' && sb) {
          await sb.from('staff').delete().eq('id', staffId);
        }
      } catch(e){}
      finally {
        hideLoading();
        renderShell();
      }
    }
  });
};



window.__togglePinReveal = function(staffId, realPin) {
  const el = document.getElementById('pinText_' + staffId);
  if(!el) return;
  if(el.textContent === '••••') {
    el.textContent = realPin;
  } else {
    el.textContent = '••••';
  }
};



window.__toggleActionMenu = function(e, id) {
  if (e) {
    e.stopPropagation();
    if (e.preventDefault) e.preventDefault();
  }
  const menus = document.querySelectorAll('.action-dropdown-menu');
  menus.forEach(m => {
    if (m.id !== 'actionMenu_' + id) {
      m.classList.remove('show');
    }
  });

  const menu = document.getElementById('actionMenu_' + id);
  if (menu) {
    menu.classList.toggle('show');
  }
};

document.addEventListener('click', () => {
  const menus = document.querySelectorAll('.action-dropdown-menu');
  menus.forEach(m => m.classList.remove('show'));
});



/* ---------------- UNIFIED 15-POINT UI/UX ENHANCEMENT ENGINE ---------------- */

// 1. Page Transition Helper
window.__triggerPageTransition = function() {
  const tabBody = document.getElementById('tabBody');
  if (tabBody) {
    tabBody.classList.remove('tab-body-animating');
    void tabBody.offsetWidth; // Force reflow
    tabBody.classList.add('tab-body-animating');
  }
};

// 2. Skeleton Loading Helper (Uiverse.io by Deri-Kurniawan)
window.__renderSkeletonHtml = function(count = 4) {
  let html = `
    <div class="stat-grid" style="margin-bottom:14px;">
      <div class="uiverse-skeleton-row" style="height:62px;border-radius:10px;margin:0;"></div>
      <div class="uiverse-skeleton-row" style="height:62px;border-radius:10px;margin:0;"></div>
    </div>
  `;
  for (let i = 0; i < count; i++) {
    html += `
      <!-- From Uiverse.io by Deri-Kurniawan -->
      <div class="uiverse-skeleton-row">
        <div class="uiverse-skeleton-avatar"></div>
        <div class="uiverse-skeleton-col">
          <div class="uiverse-skeleton-bar-top"></div>
          <div class="uiverse-skeleton-bar-bottom"></div>
        </div>
      </div>`;
  }
  return html;
};

// 3. Button States Helper
window.__setButtonState = function(btn, state = 'loading', labelText = '') {
  if (!btn) return;
  if (state === 'loading') {
    btn.dataset.origText = btn.innerHTML;
    btn.classList.add('is-loading');
    btn.disabled = true;
    if (labelText) btn.innerHTML = labelText;
  } else if (state === 'success') {
    btn.classList.remove('is-loading');
    btn.classList.add('is-success');
    btn.innerHTML = labelText || '✓ Saved!';
    setTimeout(() => {
      btn.classList.remove('is-success');
      btn.disabled = false;
      if (btn.dataset.origText) btn.innerHTML = btn.dataset.origText;
    }, 1800);
  } else if (state === 'error') {
    btn.classList.remove('is-loading');
    btn.classList.add('is-error');
    btn.innerHTML = labelText || '⚠️ Failed!';
    setTimeout(() => {
      btn.classList.remove('is-error');
      btn.disabled = false;
      if (btn.dataset.origText) btn.innerHTML = btn.dataset.origText;
    }, 2000);
  } else {
    btn.classList.remove('is-loading', 'is-success', 'is-error');
    btn.disabled = false;
    if (btn.dataset.origText) btn.innerHTML = btn.dataset.origText;
  }
};

// 5. Premium toasts & 6. Undo actions
window.showToast = function(msg, type = 'success', duration = 4000, actionText = null, actionHandler = null) {
  if (typeof window.__vibrate==='function') window.__vibrate(15);
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const icons = { success: '✓', error: '⚠️', info: 'ℹ️', warning: '⚡' };
  const toast = document.createElement('div');
  toast.className = 'toast-banner toast-' + (type || 'success');

  toast.innerHTML = `
    <span style="font-size:0.9rem;">${icons[type] || '✓'}</span>
    <span style="flex:1;">${esc(msg)}</span>
    ${actionText ? `<button class="toast-undo-btn" id="toastActionBtn">${esc(actionText)}</button>` : ''}
    <div class="toast-progress" style="transition-duration:${duration}ms;"></div>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    const prog = toast.querySelector('.toast-progress');
    if (prog) prog.style.width = '0%';
  });

  if (actionText && actionHandler) {
    const btn = toast.querySelector('#toastActionBtn');
    if (btn) {
      btn.onclick = (e) => {
        e.stopPropagation();
        toast.remove();
        actionHandler();
      };
    }
  }

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 250);
  }, duration);
};

window.__showUndoToast = function(msg, undoCallback, duration = 5000) {
  window.showToast(msg, 'info', duration, '↩ UNDO', undoCallback);
};

// 7. Smart empty states
window.__renderEmptyStateHtml = function({ icon = '📋', title = 'No Records Found', desc = 'Nothing to show here yet.', actionLabel = '', onAction = '' }) {
  return `
    <div class="empty-state-card">
      <div class="empty-icon">${icon}</div>
      <div class="empty-title">${esc(title)}</div>
      <div class="empty-desc">${esc(desc)}</div>
      ${actionLabel ? `<button class="stamp-btn small" style="margin-top:8px;" onclick="${esc(onAction)}">${esc(actionLabel)}</button>` : ''}
    </div>
  `;
};

// 10. Number animations
window.__animateCounter = function(element, targetVal, prefix = '', suffix = '') {
  if (!element) return;
  const startVal = parseFloat(element.dataset.curVal || 0);
  const endVal = parseFloat(targetVal || 0);
  if (isNaN(endVal)) { element.textContent = prefix + targetVal + suffix; return; }
  element.dataset.curVal = endVal;

  const startTime = performance.now();
  const duration = 600;

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = startVal + (endVal - startVal) * easeProgress;
    element.textContent = prefix + Math.round(current).toLocaleString('en-IN') + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
};

// Automatic KPI Cards Count-Up Animation Engine
window.__animateKpiCards = function(container = document) {
  const elements = container.querySelectorAll('.dash-kpi-val, .stat-card .num, .num-animate');
  elements.forEach(el => {
    // Save original target text if not already stored
    if (!el.dataset.targetText || el.dataset.animating !== 'true') {
      el.dataset.targetText = el.textContent.trim();
    }
    const rawText = el.dataset.targetText;
    if (!rawText || rawText === '—' || rawText === 'N/A') return;

    // Check for ratio format (e.g., '3/5')
    const ratioMatch = rawText.match(/^([₹$]?)\s*(\d+)\s*\/\s*(\d+)\s*(.*)$/);
    if (ratioMatch) {
      const prefix = ratioMatch[1];
      const targetVal = parseInt(ratioMatch[2], 10);
      const denom = '/' + ratioMatch[3];
      const suffix = ratioMatch[4];
      el.dataset.animating = 'true';
      const startTime = performance.now();
      const duration = 650;

      function stepRatio(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(targetVal * ease);
        el.textContent = `${prefix}${current}${denom}${suffix ? ' ' + suffix : ''}`;
        if (progress < 1) requestAnimationFrame(stepRatio);
        else {
          el.textContent = rawText;
          el.dataset.animating = 'false';
        }
      }
      requestAnimationFrame(stepRatio);
      return;
    }

    // Check for number/currency format (e.g., '₹48,500' or '85%' or '12 pts')
    const numMatch = rawText.match(/^([^\d-]*)\s*([\d,.]+)\s*(.*)$/);
    if (numMatch && !isNaN(parseFloat(numMatch[2].replace(/,/g, '')))) {
      const prefix = numMatch[1];
      const targetVal = parseFloat(numMatch[2].replace(/,/g, ''));
      const isFloat = numMatch[2].includes('.');
      const decimals = isFloat ? (numMatch[2].split('.')[1] || '').length : 0;
      const suffix = numMatch[3];

      el.dataset.animating = 'true';
      const startTime = performance.now();
      const duration = 650;

      function stepNum(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = targetVal * ease;
        const formatted = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString('en-IN');
        el.textContent = `${prefix}${formatted}${suffix ? ' ' + suffix : ''}`;
        if (progress < 1) requestAnimationFrame(stepNum);
        else {
          el.textContent = rawText;
          el.dataset.animating = 'false';
        }
      }
      requestAnimationFrame(stepNum);
    }
  });
};

// 13. Save-state indicators & 14. Autosave
let __appSaveState = 'saved';
window.__setSaveState = function(state) {
  __appSaveState = state;
  const badge = document.getElementById('globalSaveStateBadge');
  if (!badge) return;
  badge.className = `save-state-badge ${state}`;
  if (state === 'saving') badge.innerHTML = `⚡ Saving...`;
  else if (state === 'saved') badge.innerHTML = `🟢 Saved`;
  else if (state === 'unsaved') badge.innerHTML = `⚠️ Unsaved Draft`;
  else if (state === 'error') badge.innerHTML = `🔴 Save Failed`;
};

let __autosaveTimers = {};
window.__debounceAutosave = function(key, callback, delay = 1000) {
  window.__setSaveState('unsaved');
  if (__autosaveTimers[key]) clearTimeout(__autosaveTimers[key]);
  __autosaveTimers[key] = setTimeout(() => {
    window.__setSaveState('saving');
    try {
      callback();
      window.__setSaveState('saved');
    } catch(e) {
      window.__setSaveState('error');
    }
  }, delay);
};

// Global Browser Alert Override for Professional Popups
window.alert = function(msg) {
  if(!msg) return;
  if(typeof msg !== 'string') msg = String(msg);
  if(msg.toLowerCase().includes('error') || msg.toLowerCase().includes('could not') || msg.toLowerCase().includes('failed') || msg.toLowerCase().includes('denied')) {
    window.__showAppAlert({ title: 'System Notice', message: msg, type: 'error' });
  } else {
    window.showToast(msg, 'success');
  }
};



/* Owner Quick Access FAB Handler */
window.__toggleOwnerFab = function() {
  const menu = document.getElementById('ownerFabMenu');
  const overlay = document.getElementById('ownerFabOverlay');
  if (menu && overlay) {
    const isShowing = menu.classList.contains('show');
    if (isShowing) {
      menu.classList.remove('show');
      overlay.classList.remove('show');
    } else {
      menu.classList.add('show');
      overlay.classList.add('show');
    }
  }
};


function logout(){ localStorage.removeItem('br_session'); session=null; renderLogin(); }

/* ---------------- PRESET ACCOUNTS SEEDER ---------------- */
const PRESET_ACCOUNTS_DATA = {
  "2026-07-16": { "date": "2026-07-16", "totalSales": 40643, "amount": 20600, "vendors": 6352, "credit": 1580, "creditReceived": 4198, "gpay": 8046, "baCredit": 7268, "expenses": 70, "ac": 0, "salary": 950, "adjustment": 0, "total": 40668, "excess": 25, "less": 0 },
  "2026-07-17": { "date": "2026-07-17", "totalSales": 35463, "amount": 21640, "vendors": 0, "credit": 34, "creditReceived": 0, "gpay": 10028, "baCredit": 2946, "expenses": 70, "ac": 0, "salary": 750, "adjustment": 0, "total": 35468, "excess": 5, "less": 0 },
  "2026-07-18": { "date": "2026-07-18", "totalSales": 47623, "amount": 29970, "vendors": 0, "credit": 0, "creditReceived": 0, "gpay": 11392, "baCredit": 7342, "expenses": 295, "ac": 0, "salary": 400, "adjustment": 0, "total": 49399, "excess": 1776, "less": 0 },
  "2026-07-19": { "date": "2026-07-19", "totalSales": 30389, "amount": 14770, "vendors": 994, "credit": 3143, "creditReceived": 0, "gpay": 10674, "baCredit": 282, "expenses": 70, "ac": 41, "salary": 400, "adjustment": 0, "total": 30374, "excess": 0, "less": 15 },
  "2026-07-20": { "date": "2026-07-20", "totalSales": 46123, "amount": 14490, "vendors": 12650, "credit": 3770, "creditReceived": 4905, "gpay": 17763, "baCredit": 1625, "expenses": 70, "ac": 0, "salary": 750, "adjustment": 0, "total": 46213, "excess": 90, "less": 0 },
  "2026-07-21": { "date": "2026-07-21", "totalSales": 40850, "amount": 10560, "vendors": 6940, "credit": 13475, "creditReceived": 7115, "gpay": 13871, "baCredit": 2196, "expenses": 90, "ac": 40, "salary": 350, "adjustment": 0, "total": 40407, "excess": 0, "less": 443 },
  "2026-07-22": { "date": "2026-07-22", "totalSales": 41336, "amount": 18140, "vendors": 325, "credit": 3731, "creditReceived": 0, "gpay": 17147, "baCredit": 1030, "expenses": 70, "ac": 1000, "salary": 750, "adjustment": 0, "total": 42193, "excess": 857, "less": 0 },
  "2026-07-23": { "date": "2026-07-23", "totalSales": 32342, "amount": 13460, "vendors": 1560, "credit": 2738, "creditReceived": 2616, "gpay": 10410, "baCredit": 6456, "expenses": 70, "ac": 0, "salary": 750, "adjustment": 0, "total": 32828, "excess": 486, "less": 0 },
  "2026-07-24": { "date": "2026-07-24", "totalSales": 23471, "amount": 13650, "vendors": 4000, "credit": 226, "creditReceived": 1994, "gpay": 5894, "baCredit": 1522, "expenses": 70, "ac": 0, "salary": 200, "adjustment": 0, "total": 23568, "excess": 97, "less": 0 },
  "2026-07-25": { "date": "2026-07-25", "totalSales": 31146, "amount": 17960, "vendors": 0, "credit": 1940, "creditReceived": 25, "gpay": 8442, "baCredit": 985, "expenses": 75, "ac": 1360, "salary": 400, "adjustment": 0, "total": 31137, "excess": 0, "less": 9 },
  "2026-07-26": { "date": "2026-07-26", "totalSales": 44692, "amount": 24490, "vendors": 2700, "credit": 567, "creditReceived": 720, "gpay": 16746, "baCredit": 304, "expenses": 35, "ac": 300, "salary": 750, "adjustment": 0, "total": 45172, "excess": 480, "less": 0 }
};

async function ensurePresetAccountsSeeded(bizId){
  const missingDates = Object.keys(PRESET_ACCOUNTS_DATA).filter(d => !cache.dailyAccounts.some(a => a.date === d));
  if(!missingDates.length) return;

  const ALIAS_MAP = {
    total_sales: ['total_sales', 'totalSales'],
    amount: ['amount', 'cash_amount', 'cashAmount'],
    vendors: ['vendors', 'vendor_payments'],
    credit: ['credit', 'credit_given'],
    credit_received: ['credit_received', 'creditReceived'],
    gpay: ['gpay', 'gpay_online'],
    ba_credit: ['ba_credit', 'baCredit'],
    expenses: ['expenses'],
    personal_ac: ['personal_ac', 'ac'],
    salary_paid: ['salary_paid', 'salary'],
    adjustment: ['adjustment']
  };

  for(const dateKey of missingDates){
    const rec = PRESET_ACCOUNTS_DATA[dateKey];
    const payload = {
      business_id: bizId,
      date: dateKey,
      notes: rec.notes || null,
      is_checked: Boolean(rec.is_checked)
    };

    ACC_FIELDS.forEach(f => {
      const aliases = ALIAS_MAP[f.key] || [f.key];
      let val = undefined;
      for(const k of aliases){
        if(rec[k] !== undefined && rec[k] !== null && rec[k] !== ''){
          val = Number(rec[k]);
          break;
        }
      }
      payload[f.key] = (val !== undefined && !isNaN(val)) ? val : 0;
    });

    const totals = calcAccTotals(payload);
    payload.total = totals.total;
    payload.excess = totals.excess;
    payload.less = totals.less;

    try {
      const { data: upserted } = await sb.from('daily_accounts').upsert(payload, { onConflict: 'business_id,date' }).select().single();
      if(upserted && upserted.id) payload.id = upserted.id;
    } catch(e){
      try {
        const { data: inserted } = await sb.from('daily_accounts').insert(payload).select().single();
        if(inserted && inserted.id) payload.id = inserted.id;
      } catch(err){}
    }

    if(!payload.id) payload.id = 'loc_' + Date.now() + '_' + Math.random().toString(36).substring(2,5);
    cache.dailyAccounts.push(payload);
  }
  cache.dailyAccounts.sort((a,b) => (a.date < b.date ? 1 : -1));
}


/* ---------------- OFFLINE MUTATION QUEUE MANAGER (Issue 3 Fix) ---------------- */
function getOfflineQueue() {
  try {
    return JSON.parse(localStorage.getItem('br_offline_mutation_queue') || '[]');
  } catch(e) { return []; }
}

function queueOfflineMutation(actionType, table, payload) {
  const queue = getOfflineQueue();
  const entry = {
    id: 'off_' + Date.now() + '_' + Math.random().toString(36).substring(2,6),
    action_type: actionType,
    table: table,
    payload: payload,
    timestamp: new Date().toISOString()
  };
  queue.push(entry);
  localStorage.setItem('br_offline_mutation_queue', JSON.stringify(queue));
  updateOfflineBadgeBar();
}

async function flushOfflineMutationQueue() {
  if (!navigator.onLine) {
    alert('Cannot sync: Device is offline. Check your internet connection.');
    return;
  }
  const queue = getOfflineQueue();
  if (!queue.length) {
    updateOfflineBadgeBar();
    return;
  }

  showLoading();
  let syncedCount = 0;
  const remaining = [];
  let lastErrorMsg = null;

  for (const item of queue) {
    try {
      const payload = Object.assign({}, item.payload || {});
      delete payload.id; // remove local temporary ID for clean cloud insert/update
      let resErr = null;

      if (item.table === 'daily_accounts') {
        // Multi-tier robust sync for daily_accounts
        let { data: saved, error } = await sb.from('daily_accounts').upsert(payload, { onConflict: 'business_id,date' }).select().single();
        if (error) resErr = error;
        
        if (error || !saved) {
          const { data: checkData, error: checkErr } = await sb.from('daily_accounts').select('id').eq('business_id', payload.business_id).eq('date', payload.date).maybeSingle();
          if (checkData && checkData.id) {
            const res = await sb.from('daily_accounts').update(payload).eq('id', checkData.id).select().single();
            saved = res.data; resErr = res.error || checkErr;
          } else {
            const res = await sb.from('daily_accounts').insert(payload).select().single();
            saved = res.data; resErr = res.error || checkErr;
          }
        }
        if (saved && saved.id) {
          syncedCount++;
          continue;
        }
      } else if (item.action_type === 'insert') {
        const { error } = await sb.from(item.table).insert(payload);
        if (error) resErr = error; else syncedCount++;
      } else if (item.action_type === 'update') {
        const { error } = await sb.from(item.table).update(payload).eq('id', item.payload.id);
        if (error) resErr = error; else syncedCount++;
      } else if (item.action_type === 'delete') {
        const { error } = await sb.from(item.table).delete().eq('id', item.payload.id);
        if (error) resErr = error; else syncedCount++;
      } else {
        syncedCount++;
        continue;
      }

      if (resErr) {
        lastErrorMsg = resErr.message || resErr.details || JSON.stringify(resErr);
        console.warn('Queue sync item error:', resErr);
        if (item.retryCount && item.retryCount >= 2) {
          console.warn('Dropping stale queue item after retries:', item);
        } else {
          item.retryCount = (item.retryCount || 0) + 1;
          remaining.push(item);
        }
      }
    } catch(err) {
      lastErrorMsg = err.message || String(err);
      console.warn('Queue item sync exception:', err);
      remaining.push(item);
    }
  }

  hideLoading();
  localStorage.setItem('br_offline_mutation_queue', JSON.stringify(remaining));
  updateOfflineBadgeBar();

  if (syncedCount > 0 && typeof window.showToast === 'function') {
    window.showToast(`✅ Synced ${syncedCount} queued action(s) to cloud!`, 'success');
  }
  
  if (lastErrorMsg && remaining.length > 0) {
    alert('☁️ Cloud Sync Alert: Could not sync ' + remaining.length + ' item(s).\n\nSupabase Error: ' + lastErrorMsg + '\n\nTip: If your API key or database schema changed, tap "Clear Queue" on the status bar to clear stuck items.');
  }
}

function clearOfflineQueue() {
  if (confirm('Clear all pending offline queued items?')) {
    localStorage.removeItem('br_offline_mutation_queue');
    updateOfflineBadgeBar();
    if (typeof window.showToast === 'function') {
      window.showToast('Cleared offline sync queue.', 'info');
    }
  }
}

function updateOfflineBadgeBar() {
  const queue = getOfflineQueue();
  const isOffline = !navigator.onLine;
  let bar = document.getElementById('offlineSyncStatusBanner');
  
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'offlineSyncStatusBanner';
    bar.onclick = function(e) {
      if (e.target.tagName !== 'BUTTON') window.__openQueuedMutationsModal();
    };
    document.body.appendChild(bar);
  }

  bar.style.display = 'flex';
  bar.style.cursor = 'pointer';

  if (queue.length > 0) {
    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;overflow:hidden;">
        <span style="color:#F59E0B;font-size:0.9rem;">⚡</span>
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><b>${queue.length} ITEM(S) QUEUED FOR CLOUD SYNC</b> ${isOffline ? '(OFFLINE)' : ''}</span>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        ${navigator.onLine ? `<button class="stamp-btn small" style="background:#F59E0B;color:#000;padding:2px 8px;font-size:0.68rem;font-weight:700;border:none;" onclick="event.stopPropagation();flushOfflineMutationQueue()">⚡ SYNC NOW</button>` : ''}
        <button class="stamp-btn small ghost" style="color:#fff;border-color:rgba(255,255,255,0.3);padding:2px 8px;font-size:0.68rem;" onclick="event.stopPropagation();window.__openQueuedMutationsModal()">📜 DETAILS</button>
      </div>
    `;
  } else {
    bar.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;overflow:hidden;">
        <span style="color:#10B981;font-size:0.85rem;">🟢</span>
        <span style="color:rgba(255,255,255,0.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"><b>CLOUD DATA SYNCED (0 QUEUED)</b> &bull; REALTIME SYNC ACTIVE</span>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;">
        <button class="stamp-btn small ghost" style="color:#fff;border-color:rgba(255,255,255,0.3);padding:2px 8px;font-size:0.68rem;" onclick="event.stopPropagation();window.__openQueuedMutationsModal()">📜 DETAILS</button>
      </div>
    `;
  }
}

window.__openQueuedMutationsModal = function() {
  const queue = getOfflineQueue();
  const holder = getModalHolder('taskModalHolder');
  const isOffline = !navigator.onLine;

  holder.innerHTML = `
  <div class="overlay show" onclick="if(event.target===this) this.remove()"><div class="modal" style="max-width:520px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--paper-line);">
      <div>
        <h2 style="margin:0;font-size:1.05rem;">☁️ Queued Cloud Sync Details</h2>
        <div style="font-size:0.72rem;color:var(--ink-soft);margin-top:2px;">
          ${isOffline ? '⚡ Device Status: Offline' : '🟢 Device Status: Online & Connected'} &bull; ${queue.length} Queued Action(s)
        </div>
      </div>
      <button class="stamp-btn ghost small" onclick="this.closest('.overlay').remove()">✕</button>
    </div>

    ${queue.length ? `
      <div style="max-height:260px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">
        ${queue.map(q => {
          const tableName = (q.table || 'data').toUpperCase();
          const actionName = (q.action_type || 'SAVE').toUpperCase();
          const timeStrPretty = q.timestamp ? q.timestamp.slice(11, 19) : '';
          const detailsStr = q.payload ? (q.payload.vendor_name || q.payload.title || q.payload.date || q.payload.item || 'Record Entry') : 'Entry';

          return `
          <div style="background:var(--paper);border:1px solid var(--paper-line);border-radius:8px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;">
            <div>
              <div style="font-weight:700;color:var(--ink);">${actionName} &bull; ${tableName}</div>
              <div style="font-size:0.68rem;color:var(--ink-soft);margin-top:2px;">"${esc(String(detailsStr))}" &bull; ${timeStrPretty}</div>
            </div>
            <span class="stamp ${q.retryCount ? 'high' : 'present'}" style="font-size:0.62rem;padding:2px 6px;">
              ${q.retryCount ? 'Retry #' + q.retryCount : 'Queued'}
            </span>
          </div>`;
        }).join('')}
      </div>

      <div class="modal-actions" style="flex-wrap:wrap;gap:8px;">
        <button class="stamp-btn ghost" style="flex:1;" onclick="clearOfflineQueue();this.closest('.overlay').remove();">🗑 Clear Queue</button>
        ${navigator.onLine ? `<button class="stamp-btn" style="flex:1.4;background:var(--turmeric);color:white;" onclick="flushOfflineMutationQueue();this.closest('.overlay').remove();">⚡ Sync All Queued Now</button>` : ''}
      </div>
    ` : `
      <div class="empty" style="padding:24px 12px;">
        🟢 All offline and online data mutations are 100% synced to the cloud database! Zero items queued.
      </div>
    `}
  </div></div>`;
};


window.addEventListener('online', () => { updateOfflineBadgeBar(); flushOfflineMutationQueue(); });
window.addEventListener('offline', () => { updateOfflineBadgeBar(); });



/* ---------------- NETWORK TIMEOUT & RETRY SUPABASE HELPER ---------------- */
async function safeSupabaseCall(promiseFn, fallbackData = null, timeoutMs = 7000) {
  if (!navigator.onLine) {
    return { data: fallbackData, error: new Error('Device is offline') };
  }
  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), timeoutMs));
  try {
    const res = await Promise.race([promiseFn(), timeoutPromise]);
    return res || { data: fallbackData, error: null };
  } catch (err) {
    return { data: fallbackData, error: err };
  }
}




/* ---------------- VENDOR PARTY AUTO-COMPLETE HELPER ---------------- */
function getVendorPartiesList() {
  const set = new Set();
  (cache.vendorBills || []).forEach(b => {
    const name = b.vendor_name || b.vendor || b.supplier_name;
    if (name && name.trim()) set.add(name.trim());
  });
  (cache.vendorParties || []).forEach(p => {
    if (p && String(p).trim()) set.add(String(p).trim());
  });
  return Array.from(set).sort();
}

/* ---------------- data ---------------- */
async function loadData(){
  showLoading();
  try {
    const bizId = session.businessId;
    const [staffR, tasksR, attR, salesR, routinesR, pointsR, labelsR, weeklyR, packagesR, locR, salariesR, targetsR, trophiesR, stockR, auditR] = await Promise.all([
      sb.from('staff').select('*').eq('business_id', bizId).order('name'),
      sb.from('tasks').select('*').eq('business_id', bizId).order('due_date', {ascending:true, nullsFirst:false}),
      sb.from('attendance').select('*').eq('business_id', bizId).order('date', {ascending:false}),
      sb.from('sales').select('*').eq('business_id', bizId).order('date', {ascending:false}),
      sb.from('routines').select('*').eq('business_id', bizId).order('title'),
      sb.from('points_log').select('*').eq('business_id', bizId).order('date', {ascending:false}),
      sb.from('labels').select('*').eq('business_id', bizId).order('date', {ascending:false}),
      sb.from('weekly_tasks').select('*').eq('business_id', bizId).order('title'),
      sb.from('packages').select('*').eq('business_id', bizId).order('date', {ascending:false}),
      sb.from('salesman_locations').select('*').eq('business_id', bizId),
      sb.from('salaries').select('*').eq('business_id', bizId).order('paid_date', {ascending:false}),
      sb.from('sales_targets').select('*').eq('business_id', bizId),
      sb.from('trophies').select('*').eq('business_id', bizId),
      sb.from('stock_checks').select('*').eq('business_id', bizId).order('date', {ascending:false}),
      sb.from('audit_logs').select('*').eq('business_id', bizId).order('timestamp', {ascending:false}).limit(300),
    ]);
    cache.staff = staffR.data || [];
    let localSavedStaff = [];
    try {
      localSavedStaff = JSON.parse(localStorage.getItem('br_staff_' + bizId) || '[]');
    } catch(e){}

    if (localSavedStaff && localSavedStaff.length) {
      const staffMap = new Map();
      cache.staff.forEach(s => staffMap.set(s.id, s));
      localSavedStaff.forEach(s => {
        const existing = staffMap.get(s.id);
        staffMap.set(s.id, Object.assign({}, existing || {}, s));
      });
      cache.staff = Array.from(staffMap.values());
    }
    const cloudTasks = tasksR.data || [];
    let localSavedTasks = [];
    try {
      localSavedTasks = JSON.parse(localStorage.getItem('br_tasks_' + bizId) || '[]');
    } catch(e){}

    const localUnsynced = localSavedTasks.filter(t => t.id && t.id.startsWith('loc_task_'));
    const deletedIds = new Set(localSavedTasks.filter(t => t.is_deleted).map(t => t.id));

    // Filter out internal system payload tasks from user task list
    const userCloudTasks = cloudTasks.filter(ct => !ct.title || !ct.title.startsWith('['));
    const combinedTasks = [...localUnsynced, ...userCloudTasks.filter(ct => !deletedIds.has(ct.id))];
    
    // Preserve local status updates if local is newer
    combinedTasks.forEach(ct => {
      const loc = localSavedTasks.find(lt => lt.id === ct.id);
      if (loc && loc.status === 'done') ct.status = 'done';
    });

    cache.tasks = combinedTasks;
    try {
      localStorage.setItem('br_tasks_' + bizId, JSON.stringify(cache.tasks));
    } catch(e){}

    // Restore Cross-Device Cloud Payloads for Customer Directory, Reports, Expiry & Feature Settings
    cloudTasks.forEach(ct => {
      if (ct.title === '[CUSTOMER_DIRECTORY_DATA]' && ct.notes) {
        try { localStorage.setItem('br_cust_dir_' + bizId, ct.notes); } catch(e){}
      }
      if (ct.title === '[CUSTOMER_REPORTS_DATA]' && ct.notes) {
        try {
          cache.customerReports = JSON.parse(ct.notes);
          localStorage.setItem('br_customer_reports_' + bizId, ct.notes);
        } catch(e){}
      }
      if (ct.title === '[EXPIRY_ITEMS_DATA]' && ct.notes) {
        try { localStorage.setItem('br_expiry_' + bizId, ct.notes); } catch(e){}
      }
      if (ct.title === '[EXPENSES_TRACKER_DATA]' && ct.notes) {
        try { localStorage.setItem('br_expenses_' + bizId, ct.notes); } catch(e){}
      }
      if (ct.title === '[SALARY_ADVANCES_DATA]' && ct.notes) {
        try {
          const advs = JSON.parse(ct.notes);
          localStorage.setItem('br_advances_' + bizId, ct.notes);
          if (cache) cache.salaryAdvances = advs;
        } catch(e){}
      }
      if (ct.title === '[FUTURE_PROJECTS_DATA]' && ct.notes) {
        try {
          const parsed = JSON.parse(ct.notes);
          if (Array.isArray(parsed)) {
            cache.projects = parsed;
            localStorage.setItem('br_projects_' + bizId, ct.notes);
          }
        } catch(e){}
      }
      if (ct.title === '[FEATURE_SETTINGS_DATA]' && ct.notes) {
        try { localStorage.setItem('br_features_' + bizId, ct.notes); } catch(e){}
      }
      if (ct.title === '[VENDOR_BILLS_DATA]' && ct.notes) {
        try {
          const parsed = JSON.parse(ct.notes);
          if (Array.isArray(parsed) && parsed.length) {
            cache.vendorBills = parsed;
            localStorage.setItem('br_vendor_bills_' + bizId, ct.notes);
          }
        } catch(e){}
      }
      if (ct.title === '[PRICE_LIST_DATA]' && ct.notes) {
        try {
          const parsed = JSON.parse(ct.notes);
          if (Array.isArray(parsed) && parsed.length) {
            cache.priceList = parsed;
            localStorage.setItem('br_pricelist_' + bizId, ct.notes);
          }
        } catch(e){}
      }
      if (ct.title === '[OFFICE_LOGS_DATA]' && ct.notes) {
        try {
          const parsed = JSON.parse(ct.notes);
          if (Array.isArray(parsed)) {
            const localRaw = localStorage.getItem('br_office_logs_' + bizId);
            const localArr = localRaw ? JSON.parse(localRaw) : [];
            const mergedMap = new Map();
            localArr.forEach(i => { if (i && i.id) mergedMap.set(i.id, i); });
            parsed.forEach(i => { if (i && i.id) mergedMap.set(i.id, i); });
            cache.officeLogs = Array.from(mergedMap.values());
            localStorage.setItem('br_office_logs_' + bizId, JSON.stringify(cache.officeLogs));
          }
        } catch(e){}
      }
      if (ct.title === '[PNL_RECORDS_DATA]' && ct.notes) {
        try {
          const parsed = JSON.parse(ct.notes);
          let cloudRecs = [];
          let cloudOpening = null;
          if (Array.isArray(parsed)) {
            cloudRecs = parsed;
          } else if (parsed && typeof parsed === 'object') {
            cloudRecs = parsed.records || [];
            cloudOpening = parsed.opening || null;
          }

          if (cloudOpening) {
            cache.pnlOpeningProfit = cloudOpening;
            localStorage.setItem('br_pnl_opening_' + bizId, JSON.stringify(cloudOpening));
          }

          const localRaw = localStorage.getItem('br_pnl_records_' + bizId);
          let localArr = [];
          if (localRaw) {
            try {
              const lParsed = JSON.parse(localRaw);
              localArr = Array.isArray(lParsed) ? lParsed : (lParsed.records || []);
            } catch(e){}
          }

          const mergedMap = new Map();
          localArr.forEach(i => { if (i && (i.id || i.month)) mergedMap.set(i.id || i.month, i); });
          cloudRecs.forEach(i => { if (i && (i.id || i.month)) mergedMap.set(i.id || i.month, i); });
          cache.pnlRecords = Array.from(mergedMap.values());
          localStorage.setItem('br_pnl_records_' + bizId, JSON.stringify({ records: cache.pnlRecords, opening: cache.pnlOpeningProfit || getPnLOpeningProfit() }));
        } catch(e){}
      }
      if (ct.title === '[STAFF_DIRECTORY_DATA]' && ct.notes) {
        try {
          const parsed = JSON.parse(ct.notes);
          if (Array.isArray(parsed) && parsed.length) {
            cache.staff = parsed;
            localStorage.setItem('br_staff_' + bizId, ct.notes);
          }
        } catch(e){}
      }
    });


    cache.attendance = attR.data || [];
    cache.sales = salesR.data || [];
    cache.routines = routinesR.data || [];
    cache.points = pointsR.data || [];
    
    try {
      const localLbl = JSON.parse(localStorage.getItem('br_labels_' + bizId) || '[]');
      const cloudLbl = labelsR.data || [];
      const unsyncedLbl = localLbl.filter(l => l.id && String(l.id).startsWith('loc_lbl_'));
      cache.labels = [...unsyncedLbl, ...cloudLbl.filter(c => !unsyncedLbl.some(u => u.id === c.id))];
      localStorage.setItem('br_labels_' + bizId, JSON.stringify(cache.labels));
    } catch(e) {
      const localLbl = localStorage.getItem('br_labels_' + bizId);
      cache.labels = localLbl ? JSON.parse(localLbl) : (labelsR.data || []);
    }

    cache.weeklyTasks = weeklyR.data || [];
    
    try {
      const localPkg = JSON.parse(localStorage.getItem('br_packages_' + bizId) || '[]');
      const cloudPkg = packagesR.data || [];
      const unsyncedPkg = localPkg.filter(p => p.id && String(p.id).startsWith('loc_pkg_'));
      cache.packages = [...unsyncedPkg, ...cloudPkg.filter(c => !unsyncedPkg.some(u => u.id === c.id))];
      localStorage.setItem('br_packages_' + bizId, JSON.stringify(cache.packages));
    } catch(e) {
      const localPkg = localStorage.getItem('br_packages_' + bizId);
      cache.packages = localPkg ? JSON.parse(localPkg) : (packagesR.data || []);
    }

    cache.salesmanLocations = locR.data || [];
    cache.salaries = salariesR.data || [];
    cache.salesTargets = targetsR.data || [];
    cache.trophies = trophiesR.data || [];
    cache.stockChecks = stockR.data || [];
    cache.auditLogs = auditR.data || [];
    try {
      const { data: vBillsData, error: vBillsErr } = await sb.from('vendor_bills').select('*').eq('business_id', bizId).order('bill_date', {ascending:false});
      if (vBillsErr) throw vBillsErr;
      cache.vendorBills = vBillsData || [];
      localStorage.setItem('br_vendor_bills_' + bizId, JSON.stringify(cache.vendorBills));
    } catch(e) {
      // Query failed (bad connection, timeout, etc.) — Supabase resolves with
      // {data:null, error} instead of throwing, so without the check above this
      // would silently wipe the bills list to empty on this device instead of
      // keeping the last-synced copy. This was why bills showed on some
      // devices/loads and not others.
      console.warn('vendor_bills load failed, using last-synced local copy:', e && e.message);
      const localSaved = localStorage.getItem('br_vendor_bills_' + bizId);
      cache.vendorBills = localSaved ? JSON.parse(localSaved) : (cache.vendorBills || []);
    }
    try {
      const { data: lsData } = await sb.from('low_stocks').select('*').eq('business_id', bizId).order('created_at', {ascending:false});
      cache.lowStocks = lsData || [];
    } catch(e) {
      const localLS = localStorage.getItem('br_low_stocks_' + bizId);
      cache.lowStocks = localLS ? JSON.parse(localLS) : [];
    }

    try {
      const { data: dAccData, error: dErr } = await sb.from('daily_accounts').select('*').eq('business_id', bizId).order('date', {ascending:false});
      if(dErr) throw dErr;
      const localAcc = JSON.parse(localStorage.getItem('br_daily_accounts_' + bizId) || '[]');
      const cloudAcc = dAccData || [];
      const unsyncedAcc = localAcc.filter(a => a.id && String(a.id).startsWith('loc_acc_'));
      cache.dailyAccounts = [...unsyncedAcc, ...cloudAcc.filter(c => !unsyncedAcc.some(u => u.date === c.date))];
      localStorage.setItem('br_daily_accounts_' + bizId, JSON.stringify(cache.dailyAccounts));
    } catch(e) {
      const localDA = localStorage.getItem('br_daily_accounts_' + bizId);
      cache.dailyAccounts = localDA ? JSON.parse(localDA) : (cache.dailyAccounts || []);
    }

    try {
      const localParties = localStorage.getItem('br_vendor_parties_' + bizId);
      cache.vendorParties = localParties ? JSON.parse(localParties) : [];
    } catch(e) { cache.vendorParties = []; }

    try {
      const { data: vpData } = await sb.from('vendor_payments').select('*').eq('business_id', bizId).order('date', {ascending:false});
      cache.vendorPayments = vpData || [];
    } catch(e) {
      const localVP = localStorage.getItem('br_vendor_payments_' + bizId);
      cache.vendorPayments = localVP ? JSON.parse(localVP) : [];
    }


    const cSet = getAccCheckedSet();
    cache.dailyAccounts.forEach(a => {
      const hasMarker = Boolean(a.notes && String(a.notes).includes('[CHECKED]'));
      if (Boolean(a.is_checked) || hasMarker) {
        a.is_checked = true;
        cSet.add(a.date);
        if (a.id) cSet.add(a.id);
      } else if (cSet.has(a.date) || (a.id && cSet.has(a.id))) {
        a.is_checked = true;
        if (!a.notes || !String(a.notes).includes('[CHECKED]')) {
          a.notes = (String(a.notes || '') + ' [CHECKED]').trim();
        }
      }
    });
    saveAccCheckedSet(cSet);

    // Sync any locally checked items to cloud in background
    if (navigator.onLine && typeof sb !== 'undefined' && session && session.businessId) {
      (async function() {
        const itemsToSync = cache.dailyAccounts.filter(a => Boolean(a.is_checked));
        for (const item of itemsToSync) {
          try {
            const p = {
              business_id: session.businessId,
              date: item.date,
              is_checked: true,
              notes: item.notes || '[CHECKED]'
            };
            if (item.id && !String(item.id).startsWith('loc_') && !String(item.id).startsWith('preset_')) p.id = item.id;
            await sb.from('daily_accounts').upsert(p, { onConflict: 'business_id,date' });
          } catch(err){}
        }
      })();
    }
    await ensurePresetAccountsSeeded(bizId);
    localStorage.setItem('br_daily_accounts_' + bizId, JSON.stringify(cache.dailyAccounts));

    const localTargets = localStorage.getItem('br_incentive_targets_' + bizId);
    if(localTargets){
      try { cache.incentiveTargets = JSON.parse(localTargets); } catch(e){ cache.incentiveTargets = []; }
    } else {
      cache.incentiveTargets = [
        { id: 'target_sample_1', title: 'Monthly Sales Target', type: 'sales', target_val: 50000, reward_pts: 100, assigned_to: 'all', month: monthKey(todayStr()), notes: 'Achieve ₹50,000 monthly sales' },
        { id: 'target_sample_2', title: 'Task Master Target', type: 'tasks', target_val: 20, reward_pts: 50, assigned_to: 'all', month: monthKey(todayStr()), notes: 'Complete 20 tasks this month' },
        { id: 'target_sample_3', title: 'Perfect Attendance Target', type: 'attendance', target_val: 25, reward_pts: 50, assigned_to: 'all', month: monthKey(todayStr()), notes: '25 present days this month' }
      ];
      localStorage.setItem('br_incentive_targets_' + bizId, JSON.stringify(cache.incentiveTargets));
    }

    const routineIds = cache.routines.map(r=>r.id);
    if(routineIds.length){
      const routineLogR = await sb.from('routine_log').select('*').eq('date', todayStr()).in('routine_id', routineIds);
      cache.routineLog = routineLogR.data || [];
    } else {
      cache.routineLog = [];
    }

    const weeklyIds = cache.weeklyTasks.map(r=>r.id);
    if(weeklyIds.length){
      const weeklyLogR = await sb.from('weekly_task_log').select('*').eq('week_start', currentWeekStartStr()).in('weekly_task_id', weeklyIds);
      cache.weeklyTaskLog = weeklyLogR.data || [];
    } else {
      cache.weeklyTaskLog = [];
    }
  } finally {
    hideLoading();
  }
}

function staffName(id){ const s = cache.staff.find(x=>x.id===id); return s ? s.name : 'Unassigned'; }
function staffPhone(id){ const s = cache.staff.find(x=>x.id===id); return s ? s.phone : ''; }
function isOwner(){ return session.role === 'owner'; }
function isManagerPlus(){ return session.role === 'owner' || session.role === 'manager'; }
function esc(s){ return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ---------------- reliability helpers: stop double-submits, surface real errors ---------------- */
let __busyKeys = new Set();
async function guardedSave(key, fn){
  showLoading();
  if(__busyKeys.has(key)) return; // already saving — ignore the extra tap
  __busyKeys.add(key);
  const btns = Array.from(document.querySelectorAll('.overlay.show .modal-actions .stamp-btn'));
  btns.forEach(b=>{ b.disabled = true; if(!b.dataset.origText) b.dataset.origText = b.textContent; if(!b.classList.contains('ghost')) b.textContent = 'Saving…'; });
  try{
    await fn();
  } catch(e){
    alert('Could not save — please check your connection and try again.\n\n(' + (e.message||e) + ')');
  } finally {
    __busyKeys.delete(key);
    btns.forEach(b=>{ b.disabled = false; if(b.dataset.origText) b.textContent = b.dataset.origText; });
    hideLoading();
  }
}
async function sbCheck(promise){
  const { data, error } = await promise;
  if(error) throw new Error(error.message);
  return data;
}
function getModalHolder(id){
  let holder = document.getElementById(id);
  if(!holder || holder.parentElement !== document.body){
    if (holder && holder.parentElement) holder.parentElement.removeChild(holder);
    holder = document.createElement('div');
    holder.id = id;
    document.body.appendChild(holder);
  }
  return holder;
}
// IMPORTANT: never use .toISOString().slice(0,10) on a locally-built Date — in India
// (UTC+5:30), that silently shifts the date backward (e.g. midnight local becomes
// 6:30pm the day before in UTC), which was causing the wrong month/week to be picked
// in reports. These two helpers read the local calendar fields directly instead.
function localDateStr(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function localMonthStr(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function todayStr(){ return localDateStr(new Date()); }
function monthKey(d){ return d.slice(0,7); }

/* ---------------- notifications (in-app, tab must be open; needs service worker on mobile) ---------------- */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{ /* fine if this fails, e.g. file:// preview */ });
}
async function showNotification(title, body){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  try{
    if('serviceWorker' in navigator && navigator.serviceWorker.controller){
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification(title, { body, icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [200, 100, 200] });
    } else {
      new Notification(title, { body, icon: 'icon-192.png' });
    }
  } catch(e){
    try{ new Notification(title, { body, icon: 'icon-192.png' }); }catch(err){}
  }
}
function maybeNotify(){
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  const today = todayStr();
  const nowTime = new Date().toTimeString().slice(0,5); // "HH:MM"

  // Overdue/due-today one-off tasks — once per day
  const notifiedKey = 'br_notified_' + today + '_' + session.staffId;
  if(!localStorage.getItem(notifiedKey)){
    const mine = isManagerPlus() ? cache.tasks : cache.tasks.filter(t=>t.assigned_to===session.staffId);
    const urgent = mine.filter(t=>t.status!=='done' && t.due_date && t.due_date<=today);
    if(urgent.length){
      showNotification(`${urgent.length} task(s) need attention`, urgent.slice(0,3).map(t=>t.title).join(', '));
    }
    localStorage.setItem(notifiedKey, '1');
  }

  // Everyday routines with a reminder time that has just passed and aren't done yet — checked repeatedly
  const myRoutines = isManagerPlus() ? cache.routines : cache.routines.filter(r=>r.assigned_to===session.staffId);
  myRoutines.forEach(r=>{
    if(!r.due_time) return;
    const rTime = r.due_time.slice(0,5);
    if(nowTime < rTime) return; // not due yet
    const log = cache.routineLog.find(l=>l.routine_id===r.id);
    if(log && log.status==='done') return; // already done
    const routineKey = 'br_routine_notified_' + today + '_' + r.id;
    if(localStorage.getItem(routineKey)) return; // already reminded today
    showNotification('Everyday task due: ' + r.title, staffName(r.assigned_to) + ' — reminder for ' + rTime);
    localStorage.setItem(routineKey, '1');
  });
}
let __reminderInterval = null;
function startReminderLoop(){
  if(__reminderInterval) return;
  maybeNotify();
  __reminderInterval = setInterval(maybeNotify, 60000); // recheck every minute while the tab is open
}

/* ---------------- PWA Install Prompt Listener ---------------- */
let __deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  __deferredInstallPrompt = e;
  window.__showInstallPromptBtn = true;
  if(typeof renderShell === 'function' && session) renderShell();
});

window.__triggerPwaInstall = async () => {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if(isIOS){
    const isIOSChrome = /Crios/i.test(navigator.userAgent);
    const holder = getModalHolder('pwaModalHolder');
    holder.innerHTML = `
      <div class="overlay show"><div class="modal">
        <h2>Install App on iOS</h2>
        <div style="font-size:0.88rem;color:var(--ink);line-height:1.5;margin:12px 0;">
          ${isIOSChrome
            ? '<b>Chrome on iOS Installation:</b><br><br>1. Tap the <b>Share</b> icon at top-right of your address bar.<br>2. Scroll down and tap <b>Add to Home Screen</b>.'
            : '<b>Safari on iOS Installation:</b><br><br>1. Tap the <b>Share</b> icon (square with arrow) at the bottom.<br>2. Scroll down and tap <b>Add to Home Screen</b>.'}
        </div>
        <div class="modal-actions">
          <button class="stamp-btn" onclick="this.closest('.overlay').remove()">Got it</button>
        </div>
      </div></div>
    `;
    return;
  }

  if(!__deferredInstallPrompt){
    const holder = getModalHolder('pwaModalHolder');
    holder.innerHTML = `
      <div class="overlay show"><div class="modal">
        <h2>Install App Instructions</h2>
        <div style="font-size:0.88rem;color:var(--ink);line-height:1.5;margin:12px 0;">
          <b>Android (Chrome):</b> Tap the 3 dots menu ➔ "Add to Home screen" or "Install app".<br><br>
          <b>Desktop (Chrome/Edge):</b> Click the Install icon in your browser address bar.
        </div>
        <div class="modal-actions">
          <button class="stamp-btn" onclick="this.closest('.overlay').remove()">Got it</button>
        </div>
      </div></div>
    `;
    return;
  }
  __deferredInstallPrompt.prompt();
  const choice = await __deferredInstallPrompt.userChoice;
  if(choice && choice.outcome === 'accepted'){
    __deferredInstallPrompt = null;
    window.__showInstallPromptBtn = false;
    if(typeof renderShell === 'function') renderShell();
  }
};

/* ---------------- guaranteed on-site popup reminder (no permission needed, works every time) ---------------- */
function playReminderSound(){
  try{
    const cfg = typeof getFeatureConfig === 'function' ? getFeatureConfig() : {};
    if (cfg.disableAudioNotificationBeeps) return;
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    [0, 180].forEach(delay => {
      setTimeout(()=>{
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        o.start(); o.stop(ctx.currentTime + 0.25);
      }, delay);
    });
    setTimeout(()=>ctx.close(), 700);
  } catch(e){ /* audio not available */ }
}
function showPendingPopup(){
  const cfg = typeof getFeatureConfig === 'function' ? getFeatureConfig() : {};
  if (cfg.disablePendingTaskPopups) return;
  if(document.getElementById('reminderOverlay')) return; // one at a time
  if(!session) return;

  // Show ONLY ONCE per session / day:
  const today = todayStr();
  const sessionPromptedKey = 'br_pending_prompted_' + (session.staffId || 'user') + '_' + today;
  if (localStorage.getItem(sessionPromptedKey)) return; // Already shown once today!

  const mine = isManagerPlus() ? cache.tasks : cache.tasks.filter(t=>t.assigned_to===session.staffId);
  const pending = mine.filter(t=>t.status!=='done');
  if(!pending.length) return;

  // Mark as prompted for today so it NEVER repeats
  try { localStorage.setItem(sessionPromptedKey, '1'); } catch(e){}

  playReminderSound();
  const holder = document.createElement('div');
  holder.id = 'reminderOverlay';
  holder.className = 'overlay show';
  holder.innerHTML = `<div class="modal">
    <h2>${icon('bell',22)} ${pending.length} pending task${pending.length>1?'s':''}</h2>
    ${pending.slice(0,6).map(t=>`
      <div class="row-card"><div class="row-main">
        <h3>${esc(t.title)}</h3>
        <div class="meta"><span>${esc(staffName(t.assigned_to))}</span>${t.due_date?`<span>${fmtDue(t)}</span>`:''}</div>
      </div><span class="stamp ${t.priority}">${t.priority}</span></div>
    `).join('')}
    ${pending.length>6?`<p style="font-size:0.8rem;color:var(--ink-soft);margin:6px 0 0;">+ ${pending.length-6} more</p>`:''}
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__dismissReminder()">Skip</button>
      <button class="stamp-btn" onclick="window.__gotoTasksFromReminder()">View tasks</button>
    </div>
  </div>`;
  document.body.appendChild(holder);
  window.__dismissReminder = () => { holder.remove(); };
  window.__gotoTasksFromReminder = () => { holder.remove(); activeTab='tasks'; renderShell(); };
}
let __initialPopupTimer = null;
function startPopupReminders(){
  if(__initialPopupTimer) return;
  // Show ONLY ONCE per session after 15 seconds (0 repeated interval loops!)
  __initialPopupTimer = setTimeout(() => {
    showPendingPopup();
  }, 15000);
}
function requestNotifications(){
  if(!('Notification' in window)){ alert('Notifications are not supported in this browser.'); return; }
  Notification.requestPermission().then(async p => {
    if(p==='granted'){
      if('serviceWorker' in navigator){
        try {
          const reg = await navigator.serviceWorker.register('sw.js');
          if(reg) {
            reg.showNotification('BABM TASK Connected', {
              body: 'Web Push Notifications enabled! You will receive alerts even when the site is closed.',
              icon: 'icon-192.png',
              vibrate: [200, 100, 200]
            });
          }
        } catch(e){}
      }
      if(typeof window.showToast==='function') window.showToast('🔔 Web Push Notifications Enabled!', 'success');
      startReminderLoop();
    } else if(p==='denied'){
      alert('Notifications were blocked. To turn them on, check your browser/site settings for this page and allow notifications.');
    }
    if(typeof renderShell==='function') renderShell();
  });
}

/* ---------------- FEATURE 5: CONFETTI PARTICLE FX ENGINE ---------------- */
function triggerConfetti(options = {}) {
  const count = options.count || 85;
  let canvas = document.getElementById('confettiCanvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'confettiCanvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:99999;';
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#1E3A6E', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'];
  const particles = [];

  for (let i = 0; i < count; i++) {
    particles.push({
      x: canvas.width / 2 + (Math.random() - 0.5) * (canvas.width * 0.5),
      y: canvas.height * 0.35 + (Math.random() - 0.5) * 80,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 18 - 4,
      size: Math.random() * 8 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      decay: Math.random() * 0.016 + 0.012
    });
  }

  function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let active = false;

    particles.forEach(p => {
      if (p.opacity <= 0) return;
      active = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.38; // gravity
      p.vx *= 0.98;
      p.rotation += p.rSpeed;
      p.opacity -= p.decay;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    });

    if (active) {
      requestAnimationFrame(update);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  update();
}

/* ---------------- FEATURE 8: GLASSMORTIC TRANSLUCENT TOAST ALERTS ---------------- */
window.showToast = function(message, type = 'info', duration = 3200) {
  let container = document.getElementById('glassToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'glassToastContainer';
    container.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;width:92%;max-width:420px;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `glass-toast glass-toast-${type}`;
  const iconSymbol = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : type === 'error' ? '❌' : 'ℹ️';

  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;">
      <span style="font-size:1.1rem;flex-shrink:0;">${iconSymbol}</span>
      <div style="flex:1;font-size:0.82rem;font-weight:700;line-height:1.3;color:#fff;">${message}</div>
    </div>
    <div class="glass-toast-timer" style="animation-duration:${duration}ms;"></div>
  `;

  container.appendChild(toast);

  if (type === 'success') {
    try { triggerConfetti({ count: 45 }); } catch(e){}
  }

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 250);
  }, duration);
};

/* ---------------- UNIVERSAL MODAL CLOSE ENGINE ---------------- */
window.__closeCurrentModal = function(btnEl) {
  if (btnEl && typeof btnEl.closest === 'function') {
    const overlay = btnEl.closest('.overlay');
    if (overlay) {
      overlay.classList.remove('show');
      if (overlay.parentElement && overlay.parentElement.id && (overlay.parentElement.id.endsWith('Holder') || overlay.parentElement.id.endsWith('Modal'))) {
        overlay.parentElement.innerHTML = '';
      } else {
        setTimeout(() => { try { overlay.remove(); } catch(e){} }, 50);
      }
      return;
    }
  }
  // Fallback: Clean up all open modal overlays
  document.querySelectorAll('.overlay.show, .overlay').forEach(el => {
    if (el.id === 'reminderOverlay' || el.id === 'deleteConfirmOverlay') return;
    el.classList.remove('show');
    if (el.parentElement && el.parentElement.id && (el.parentElement.id.endsWith('Holder') || el.parentElement.id.endsWith('Modal'))) {
      el.parentElement.innerHTML = '';
    } else {
      setTimeout(() => { try { el.remove(); } catch(e){} }, 50);
    }
  });
};

// Global Named Modal Close Aliases
window.__closeModal = function(b) { window.__closeCurrentModal(b); };
window.__closeRoutineModal = function(b) { window.__closeCurrentModal(b); };
window.__closeWeeklyModal = function(b) { window.__closeCurrentModal(b); };
window.__closeTargetModal = function(b) { window.__closeCurrentModal(b); };
window.__closeSaleModal = function(b) { window.__closeCurrentModal(b); };
window.__closeLabelModal = function(b) { window.__closeCurrentModal(b); };
window.__closePackageModal = function(b) { window.__closeCurrentModal(b); };
window.__closeTrophyModal = function(b) { window.__closeCurrentModal(b); };
window.__closeIncentiveTargetModal = function(b) { window.__closeCurrentModal(b); };
window.__closePointsModal = function(b) { window.__closeCurrentModal(b); };
window.__closeStaffModal = function(b) { window.__closeCurrentModal(b); };
window.__closeVendorModal = function(b) { window.__closeCurrentModal(b); };
window.__closeSalaryModal = function(b) { window.__closeCurrentModal(b); };
window.__closeScheduleModal = function(b) { window.__closeCurrentModal(b); };
window.__closePaymentVoucherModal = function(b) { window.__closeCurrentModal(b); };

/* ---------------- shell ---------------- */

const ICONS = {

  dashboard: '<path d="M3 13h7V3H3v10Zm0 8h7v-6H3v6Zm11 0h7V11h-7v10Zm0-18v6h7V3h-7Z"/>',
  tasks: '<path d="M9 11l2 2 4-4" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke-width="2"/>',
  daily: '<path d="M17 2v4M7 2v4M3 9h18" stroke-width="2" stroke-linecap="round" fill="none"/><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke-width="2"/><path d="M8 14l2 2 4-4" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  weekly: '<rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke-width="2"/><path d="M17 2v4M7 2v4M3 9h18" stroke-width="2" stroke-linecap="round" fill="none"/>',
  attendance: '<circle cx="12" cy="12" r="9" fill="none" stroke-width="2"/><path d="M12 7v5l3 3" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  salesman: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" fill="none" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.3" fill="none" stroke-width="2"/>',
  sales: '<path d="M3 17l5-5 4 4 8-9" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 7h6v6" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  label: '<path d="M20.6 12.7 12.7 20.6a2 2 0 0 1-2.8 0l-7-7a2 2 0 0 1 0-2.8L10.8 2.9a2 2 0 0 1 1.4-.6H19a2 2 0 0 1 2 2v6.9a2 2 0 0 1-.6 1.4Z" fill="none" stroke-width="2" stroke-linejoin="round"/><circle cx="15.5" cy="7.5" r="1.5"/>',
  package: '<path d="M21 8 12 3 3 8l9 5 9-5Z" fill="none" stroke-width="2" stroke-linejoin="round"/><path d="M3 8v8l9 5 9-5V8M12 13v8" fill="none" stroke-width="2" stroke-linejoin="round"/>',
  points: '<path d="M8 21h8M12 17v4" stroke-width="2" stroke-linecap="round"/><path d="M6 4h12v5a6 6 0 0 1-12 0V4Z" fill="none" stroke-width="2" stroke-linejoin="round"/><path d="M6 6H4a2 2 0 0 0 0 4h2M18 6h2a2 2 0 0 1 0 4h-2" fill="none" stroke-width="2"/>',
  salary: '<circle cx="12" cy="12" r="9" fill="none" stroke-width="2"/><path d="M12 7v10M9.5 9.3c0-1.3 1.1-2.3 2.5-2.3s2.5.8 2.5 2c0 2.7-5 1.3-5 4 0 1.2 1.1 2 2.5 2s2.5-1 2.5-2.3" fill="none" stroke-width="1.6" stroke-linecap="round"/>',
  reports: '<path d="M4 19V10M11 19V5M18 19v-7" stroke-width="2" stroke-linecap="round"/><path d="M3 19h18" stroke-width="2" stroke-linecap="round"/>',
  staff: '<circle cx="9" cy="8" r="3.2" fill="none" stroke-width="2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" fill="none" stroke-width="2" stroke-linecap="round"/><circle cx="17.5" cy="9" r="2.5" fill="none" stroke-width="2"/><path d="M15.5 14.2c2.6.4 4.5 2.6 4.5 5.3" fill="none" stroke-width="2" stroke-linecap="round"/>',
  settings: '<circle cx="12" cy="12" r="3" fill="none" stroke-width="2"/><path d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" fill="none" stroke-width="1.6" stroke-linejoin="round"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18" stroke-width="2" stroke-linecap="round"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 4.5 1.5 6 1.5 6h-15S6 12.5 6 8Z" fill="none" stroke-width="2" stroke-linejoin="round"/><path d="M9.5 18a2.5 2.5 0 0 0 5 0" fill="none" stroke-width="2" stroke-linecap="round"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 17l5-5-5-5M21 12H9" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" fill="none" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="9.5" r="2.3" fill="none" stroke-width="2"/>',
  check: '<path d="M20 6 9 17l-5-5" fill="none" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  trophy: '<path d="M8 21h8M12 17v4" stroke-width="2" stroke-linecap="round"/><path d="M6 4h12v5a6 6 0 0 1-12 0V4Z" fill="none" stroke-width="2" stroke-linejoin="round"/><path d="M6 6H4a2 2 0 0 0 0 4h2M18 6h2a2 2 0 0 1 0 4h-2" fill="none" stroke-width="2"/>',
  user: '<circle cx="12" cy="8" r="4" fill="none" stroke-width="2"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="none" stroke-width="2" stroke-linecap="round"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" fill="none" stroke-width="2" stroke-linejoin="round"/><path d="M8 3v6h8V3M7 21v-8h10v8" fill="none" stroke-width="2" stroke-linejoin="round"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2" fill="none" stroke-width="2"/><rect x="9" y="2" width="6" height="4" rx="1" fill="none" stroke-width="2"/>',
  fire: '<path d="M12 2s-6 5.5-6 10.5a6 6 0 0 0 12 0c0-1.7-.7-3-1.5-4 0 2-1.5 3-1.5 3 1-3-1-6-3-9.5Z" fill="none" stroke-width="2" stroke-linejoin="round"/>',
  wave: '<path d="M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V6a1.5 1.5 0 0 1 3 0v6M6 12l1.5 6a4 4 0 0 0 4 3h2a5 5 0 0 0 5-5v-3a1.5 1.5 0 0 0-3 0" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  star: '<path d="M12 2.5l2.9 6 6.6.7-4.9 4.5 1.3 6.5L12 16.9l-5.9 3.3 1.3-6.5-4.9-4.5 6.6-.7Z" fill="none" stroke-width="1.6" stroke-linejoin="round"/>',
  handshake: '<path d="M2 12l4-4 4 3 3-3 4 4M9 15l2 2M13 12l3 3M6 8l-3 4 3 3M18 8l3 4-3 3" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  sparkles: '<path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" fill="none" stroke-width="2" stroke-linecap="round"/>',
  vendors: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="none" stroke-width="2" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" fill="none" stroke-width="2"/><line x1="16" y1="13" x2="8" y2="13" stroke-width="2"/><line x1="16" y1="17" x2="8" y2="17" stroke-width="2"/><line x1="10" y1="9" x2="8" y2="9" stroke-width="2"/>',
  low_stock: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" fill="none" stroke-width="2" stroke-linejoin="round"/><polyline points="3.27 6.96 12 12.01 20.73 6.96" fill="none" stroke-width="2"/><line x1="12" y1="22.08" x2="12" y2="12" stroke-width="2"/>',
  building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M6 12h12M6 17h12M10 6h4" fill="none" stroke-width="2" stroke-linecap="round"/>',
  target: '<circle cx="12" cy="12" r="10" fill="none" stroke-width="2"/><circle cx="12" cy="12" r="6" fill="none" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
  trending: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="17 6 23 6 23 12" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke-width="2" stroke-linecap="round"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" fill="none" stroke-width="2" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  trash: '<polyline points="3 6 5 6 21 6" fill="none" stroke-width="2" stroke-linecap="round"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  outbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="12 2 12 10" stroke-width="2" stroke-linecap="round"/><polyline points="9 5 12 2 15 5" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  search: '<circle cx="11" cy="11" r="8" fill="none" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2" stroke-linecap="round"/>',
  box: '<path d="M21 8 12 3 3 8l9 5 9-5Z" fill="none" stroke-width="2" stroke-linejoin="round"/><path d="M3 8v8l9 5 9-5V8M12 13v8" fill="none" stroke-width="2" stroke-linejoin="round"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3" fill="none" stroke-width="2"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M21 5v14c0 1.66-4 3-9 3s-9-1.34-9-3V5" fill="none" stroke-width="2"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" fill="none" stroke-width="2" stroke-linejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke-width="2" stroke-linecap="round"/>',
  stockkeeper: '<ellipse cx="12" cy="5" rx="9" ry="3" fill="none" stroke-width="2"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M21 5v14c0 1.66-4 3-9 3s-9-1.34-9-3V5" fill="none" stroke-width="2"/>',
  project: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" fill="none" stroke-width="2" stroke-linejoin="round"/><path d="M12 11v6M9 14h6" stroke-width="2" stroke-linecap="round"/>',
};
function icon(name, size){
  size = size || 18;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" style="vertical-align:-4px;">${ICONS[name]||''}</svg>`;
}
const TAB_META = {
  dashboard: {icon:'dashboard', label:'Dashboard'},
  tasks: {icon:'tasks', label:'Tasks'},
  daily: {icon:'daily', label:'Daily'},
  weekly: {icon:'weekly', label:'Weekly'},
  attendance: {icon:'attendance', label:'Attendance'},
  office_logs: {icon:'building', label:'Office Logs'},
  pnl: {icon:'trending', label:'P&L Analytics'},
  sales: {icon:'sales', label:'Sales'},
  pricelist: {icon:'clipboard', label:'Price List'},
  label: {icon:'label', label:'Label'},
  package: {icon:'package', label:'Package'},
  points: {icon:'points', label:'Points'},
  salary: {icon:'salary', label:'Salary'},
  reports: {icon:'reports', label:'Reports'},
  staff: {icon:'staff', label:'Staff'},
  settings: {icon:'settings', label:'Settings'},
  stockkeeper: {icon:'clipboard', label:'Stockkeeper'},
  accounts: {icon:'save', label:'Accounts'},
  customer_report: {icon:'user', label:'Customer Report'},
  audit: {icon:'clipboard', label:'Audit Log'},
  low_stock: {icon:'low_stock', label:'Low Stock'},
  projects: {icon:'project', label:'Projects'},
};
function currentTabs(){
  if(session.role === 'sales' || session.role === 'salesman') return ['pricelist', 'sales', 'tasks', 'accounts', 'low_stock'];
  return isManagerPlus()
    ? (isOwner() ? ['dashboard','tasks','daily','weekly','attendance','office_logs','pnl','sales','pricelist','label','package','stockkeeper','points','salary','accounts','customer_report','low_stock','reports','audit','projects','staff','settings'] : ['dashboard','tasks','daily','weekly','attendance','sales','pricelist','label','package','stockkeeper','points','accounts','customer_report','low_stock','reports','audit'])
    : ['pricelist', 'tasks','daily','weekly','attendance','sales','label','package','stockkeeper','points','accounts','low_stock'];
}
function quickTabs(){
  if(session.role === 'sales' || session.role === 'salesman') return ['pricelist', 'sales', 'tasks', 'accounts'];
  return isOwner() ? ['dashboard','tasks','sales','office_logs','pnl'] : (isManagerPlus() ? ['dashboard','tasks','sales','pricelist'] : ['pricelist','tasks','sales','attendance']);
}
function getPrimaryActionBtn(t){
  if(t==='office_logs') return `<button class="stamp-btn compact-mobile" onclick="window.__openOfficeLogModal()"><span class="btn-text">+ Log Cash</span><span class="btn-short">+</span></button>`;
  if(t==='pnl' && isOwner()) return `<button class="stamp-btn compact-mobile" onclick="window.__openPnLModal()"><span class="btn-text">+ Log P&amp;L</span><span class="btn-short">+</span></button>`;
  if(t==='tasks') return `<button class="stamp-btn compact-mobile" onclick="window.__openTask()"><span class="btn-text">+ Add Task</span><span class="btn-short">+</span></button>`;
  if(t==='daily' && isManagerPlus()) return `<button class="stamp-btn compact-mobile" onclick="window.__openRoutine()"><span class="btn-text">+ Add Daily Task</span><span class="btn-short">+</span></button>`;
  if(t==='weekly' && isManagerPlus()) return `<button class="stamp-btn compact-mobile" onclick="window.__openWeekly()"><span class="btn-text">+ Add Weekly Task</span><span class="btn-short">+</span></button>`;
  if(t==='staff' && isOwner()) return `<button class="stamp-btn compact-mobile" onclick="window.__openStaff()"><span class="btn-text">+ Add Staff</span><span class="btn-short">+</span></button>`;
  if(t==='sales') return `<button class="stamp-btn compact-mobile" onclick="window.__openSale()"><span class="btn-text">+ Log Sale</span><span class="btn-short">+</span></button>`;
  if(t==='pricelist' && isManagerPlus()) return `<button class="stamp-btn compact-mobile" onclick="window.__openAddPriceListItemModal()"><span class="btn-text">+ Add Product</span><span class="btn-short">+</span></button>`;
  if(t==='label') return `<button class="stamp-btn compact-mobile" onclick="window.__openLabel()"><span class="btn-text">+ Log Label</span><span class="btn-short">+</span></button>`;
  if(t==='package') return `<button class="stamp-btn compact-mobile" onclick="window.__openPackage()"><span class="btn-text">+ Log Package</span><span class="btn-short">+</span></button>`;
  if(t==='salary' && (isOwner() || isManager())) return `<button class="stamp-btn compact-mobile" onclick="window.__openSalaryLogModal()"><span class="btn-text">📜 Salary Log</span><span class="btn-short">📜</span></button>${isOwner() ? `<button class="stamp-btn compact-mobile" style="margin-left:6px;" onclick="window.__openSalary()"><span class="btn-text">+ Record Salary</span><span class="btn-short">+</span></button>` : ''}`;
  if(t==='points' && isManagerPlus()) return `<button class="stamp-btn compact-mobile" onclick="window.__openPoints()"><span class="btn-text">+ Award Points</span><span class="btn-short">+</span></button>`;
  if(t==='low_stock') return `<button class="stamp-btn compact-mobile" onclick="window.__openLowStockModal()"><span class="btn-text">+ Report Low Stock</span><span class="btn-short">+</span></button>`;
  if(t==='customer_report') return `<button class="stamp-btn compact-mobile" onclick="window.__openImportCustomerJsonModal()"><span class="btn-text">📥 Import</span><span class="btn-short">📥</span></button><button class="stamp-btn compact-mobile" style="margin-left:6px;" onclick="window.__openAddCustomerReportModal()"><span class="btn-text">+ Add Customer</span><span class="btn-short">+</span></button>`;
  if(t==='projects' && isOwner()) return `<button class="stamp-btn compact-mobile" onclick="window.__openAddProjectModal()"><span class="btn-text">+ New Project</span><span class="btn-short">+</span></button>`;
  return '';
}

function renderShell(){
  const tabs = currentTabs();
  const notifState = ('Notification' in window) ? Notification.permission : 'unsupported';
  const activeLabel = TAB_META[activeTab] ? TAB_META[activeTab].label : 'Dashboard';

  app.innerHTML = `
  <div class="app-layout">
    <!-- Desktop Left Sidebar -->
    <aside class="desktop-sidebar">
      <div class="sidebar-brand">
        <div class="avatar-circle" style="width:40px;height:40px;">${initials(session.name)}</div>
        <div class="brand-info">
          <div class="biz-name">${esc(session.businessName)}</div>
          <div class="user-meta">${esc(session.name)} <span class="role-pill ${session.role}">${session.role}</span></div>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="sidebar-section-title">Navigation</div>
        ${tabs.map(t=>`
          <button class="sidebar-item ${activeTab===t?'active':''}" onclick="window.__setTab('${t}')">
            <span class="ic">${icon(TAB_META[t].icon, 19)}</span>
            <span class="label">${TAB_META[t].label}</span>
          </button>
        `).join('')}
      </nav>

      <div class="sidebar-footer">
        <button class="sidebar-item" onclick="window.__triggerPwaInstall()">
          <span class="ic">${icon('save',18)}</span>Install App
        </button>
        <button class="sidebar-item ${activeTab==='account'?'active':''}" onclick="window.__openAccount()">
          <span class="ic">${icon('user',18)}</span>My Account
        </button>
        ${notifState==='default' ? `
          <button class="sidebar-item" onclick="window.__reqNotif()">
            <span class="ic">${icon('bell',18)}</span>Enable Alerts
          </button>
        ` : ''}
        <button class="sidebar-item logout-btn" onclick="window.__logout()">
          <span class="ic">${icon('logout',18)}</span>Sign Out
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="app-main">
      <header class="top">
        <div class="header-title-area">
          <button class="header-icon-btn mobile-only" onclick="window.__openDrawer()" style="margin-right:2px;display:flex;align-items:center;justify-content:center;">${icon('menu',22)}</button>
          <div style="display:flex;flex-direction:column;justify-content:center;">
            <h1 style="font-size:1.15rem;margin:0;line-height:1.2;">${activeLabel}</h1>
            <p class="desktop-only" style="margin:2px 0 0;font-size:0.75rem;color:var(--ink-soft);line-height:1.2;">${esc(session.businessName)} &bull; ${esc(session.name)} (${session.role})</p>
          </div>
        </div>
        <div class="header-actions">
          ${(() => {
            const qLen = (() => { try { return JSON.parse(localStorage.getItem('br_offline_mutation_queue')||'[]').length; } catch(e){ return 0; } })();
            return qLen > 0
              ? `<button class="offline-badge pending" title="${qLen} record(s) pending cloud sync. Tap to sync." onclick="window.__reloadAppData(document.querySelector('.reload-btn'))">
                  ● ${qLen} PENDING
                </button>`
              : `<span class="offline-badge synced" title="All data synced to cloud">✓ SYNCED</span>`;
          })()}
          <button class="reload-btn" title="Refresh App Data" onclick="window.__reloadAppData(this)">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6"/><path d="M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.3L2.5 16"/></svg>
          </button>
          ${isManagerPlus() ? `<button class="stamp-btn compact-mobile" style="background:var(--turmeric-dark);color:#fff;border-color:var(--turmeric-dark);" onclick="window.__openQuickTaskModal()"><span class="btn-short">⚡</span><span class="btn-text">⚡ Quick Add</span></button>` : ''}
          ${getPrimaryActionBtn(activeTab)}
          <button class="avatar-circle mobile-only" style="width:34px;height:34px;font-size:0.75rem;border:none;cursor:pointer;" onclick="window.__openAccount()">${initials(session.name)}</button>
        </div>
      </header>

      <div class="wrap" id="tabBody"></div>
    </div>
  </div>

  <!-- Mobile Bottom Nav -->
  <div class="bottom-nav mobile-only" id="bottomNav"></div>

  <!-- Mobile Drawer Overlay -->
  <div class="drawer-overlay" id="drawerOverlay">
    <div class="drawer" onclick="event.stopPropagation()">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <div class="avatar-circle" style="width:44px;height:44px;">${initials(session.name)}</div>
        <div><div style="font-weight:700;">${esc(session.name)}</div><span class="role-pill ${session.role}">${session.role}</span></div>
      </div>
      <!-- Regrouped 5 Labeled Sections -->
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${[
          { section: 'Overview', keys: ['dashboard','reports','projects'] },
          { section: 'Work', keys: ['tasks','daily','weekly','attendance'] },
          { section: 'Sales', keys: ['sales'] },
          { section: 'Money', keys: ['accounts','office_logs','pnl','customer_report','vendors','salary'] },
          { section: 'Admin', keys: ['staff','audit','settings'] }
        ].map(grp => {
          const validKeys = grp.keys.filter(k => tabs.includes(k));
          if(!validKeys.length) return '';
          return `
            <div>
              <div style="font-size:11px;color:var(--ink-soft);margin:0 0 6px 4px;font-family:'Roboto Mono',monospace;letter-spacing:0.04em;text-transform:uppercase;">${grp.section}</div>
              <div style="display:flex;flex-direction:column;gap:2px;">
                ${validKeys.map(k => `
                  <div class="drawer-item ${activeTab===k?'active':''}" onclick="window.__setTab('${k}')">
                    <span class="ic">${icon(TAB_META[k].icon,18)}</span>
                    <span style="font-size:13px;">${TAB_META[k].label}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div style="border-top:1px solid var(--paper-line);margin:12px 0;"></div>
      <div class="drawer-item" onclick="window.__openAccount()"><span class="ic">${icon('user',18)}</span>My Account</div>
      ${notifState==='default' ? `<div class="drawer-item" onclick="window.__reqNotif()"><span class="ic">${icon('bell',18)}</span>Enable alerts</div>` : ''}
      <div class="drawer-item" style="color:var(--turmeric);" onclick="window.__logout()"><span class="ic">${icon('logout',18)}</span>Sign out</div>
    </div>
  </div>

  <!-- Owner-Only Quick Access Floating Action Button -->
  ${(activeTab === 'dashboard' && isOwner()) ? `
    <div class="owner-fab-overlay" id="ownerFabOverlay" onclick="window.__toggleOwnerFab()"></div>
    <div class="owner-fab-menu" id="ownerFabMenu">
      <div class="owner-fab-item" onclick="window.__setTab('accounts');window.__toggleOwnerFab();">📝 Accounts Entry</div>
      <div class="owner-fab-item" onclick="window.__openSalaryAdvanceModal();window.__toggleOwnerFab();">💸 Record Salary Advance</div>
      <div class="owner-fab-item" onclick="window.__openQuickTaskModal();window.__toggleOwnerFab();">⚡ Add Quick Task</div>
      <div class="owner-fab-item" onclick="window.__openSale();window.__toggleOwnerFab();">🛒 Log Sale</div>
      <div class="owner-fab-item" onclick="window.__setTab('audit');window.__toggleOwnerFab();">📜 Activity Audit Log</div>
    </div>
    <button class="owner-fab-btn" id="ownerFabBtn" onclick="window.__toggleOwnerFab()" title="Owner Quick Actions">⚡ Quick Access</button>
  ` : `
    <!-- Mobile Floating Action Buttons for Non-Owner Roles -->
    ${activeTab==='tasks' ? '<button class="fab mobile-only" onclick="window.__openTask()">+</button>' : ''}
    ${activeTab==='daily' && isManagerPlus() ? '<button class="fab mobile-only" onclick="window.__openRoutine()">+</button>' : ''}
    ${activeTab==='weekly' && isManagerPlus() ? '<button class="fab mobile-only" onclick="window.__openWeekly()">+</button>' : ''}
    ${activeTab==='staff' ? '<button class="fab mobile-only" onclick="window.__openStaff()">+</button>' : ''}
    ${activeTab==='sales' ? '<button class="fab mobile-only" onclick="window.__openSale()">+</button>' : ''}
    ${activeTab==='label' ? '<button class="fab mobile-only" onclick="window.__openLabel()">+</button>' : ''}
    ${activeTab==='package' ? '<button class="fab mobile-only" onclick="window.__openPackage()">+</button>' : ''}
    ${activeTab==='points' && isManagerPlus() ? '<button class="fab mobile-only" onclick="window.__openPoints()">+</button>' : ''}
    ${activeTab==='low_stock' ? '<button class="fab mobile-only" onclick="window.__openLowStockModal()">+</button>' : ''}
  `}
  `;

  window.__logout = logout;
  window.__reqNotif = requestNotifications;
  window.__openDrawer = () => { document.getElementById('drawerOverlay').classList.add('show'); };
  document.getElementById('drawerOverlay').onclick = () => { document.getElementById('drawerOverlay').classList.remove('show'); };
  window.__setTab = (t) => {
    activeTab = t;
    const body = document.getElementById('tabBody');
    if (body && typeof window.__renderSkeletonHtml === 'function') {
      body.innerHTML = window.__renderSkeletonHtml(4);
    }
    document.getElementById('drawerOverlay').classList.remove('show');
    renderShell();
    if (typeof window.__triggerPageTransition === 'function') window.__triggerPageTransition();
  };

  const quick = quickTabs();
  const bNav = document.getElementById('bottomNav');
  if(bNav) {
    bNav.innerHTML = quick.map(t=>
      `<button class="${activeTab===t?'active':''}" onclick="window.__setTab('${t}')"><span class="ic">${icon(TAB_META[t].icon,18)}</span>${TAB_META[t].label}</button>`
    ).join('') + `<button class="${activeTab==='account'?'active':''}" onclick="window.__openDrawer()"><span class="ic">${icon('menu',18)}</span>More</button>`;
  }
  renderTabBody();
}

function renderTabBody(){
  const body = document.getElementById('tabBody');
  if(!body) return;
  if(activeTab==='dashboard') renderDashboardTab(body);
  else if(activeTab==='tasks') renderTasksTab(body);
  else if(activeTab==='daily') renderDailyTab(body);
  else if(activeTab==='weekly') renderWeeklyTab(body);
  else if(activeTab==='attendance') renderAttendanceTab(body);
  else if(activeTab==='sales') renderSalesTab(body);
  else if(activeTab==='pricelist') renderPriceListTab(body);
  else if(activeTab==='label') renderLabelTab(body);
  else if(activeTab==='package') renderPackageTab(body);
  else if(activeTab==='stockkeeper') renderStockkeeperTab(body);
  else if(activeTab==='accounts') renderAccountsTab(body);
  else if(activeTab==='office_logs' && isOwner()) renderOfficeLogsTab(body);
  else if(activeTab==='pnl' && isOwner()) renderPnLTab(body);
  else if(activeTab==='customer_report') renderCustomerReportTab(body);
  else if(activeTab==='low_stock') renderLowStockTab(body);
  else if(activeTab==='audit' && isManagerPlus()) renderAuditTab(body);
  else if(activeTab==='salary' && (isOwner() || (isManager() && getFeatureConfig().allowManagerSalary))) renderSalaryTab(body);
  else if(activeTab==='points') renderPointsTab(body);
  else if(activeTab==='staff' && isOwner()) renderStaffTab(body);
  else if(activeTab==='projects') renderProjectsTab(body);
  else if(activeTab==='reports' && (isOwner() || (isManager() && getFeatureConfig().allowManagerReports))) renderReportsTab(body);
  else if(activeTab==='settings') renderSettingsTab(body);
  else if(activeTab==='account') renderAccountTab(body);

  setTimeout(() => {
    if (typeof window.__animateKpiCards === 'function') window.__animateKpiCards(body);
  }, 30);
}

function isStaffActive(s) {
  if (!s) return false;
  if (s.is_active === false || s.active === false) return false;
  if (s.status && String(s.status).toLowerCase() === 'inactive') return false;
  return true;
}

function getActiveStaff() {
  return (cache.staff || []).filter(s => isStaffActive(s));
}




