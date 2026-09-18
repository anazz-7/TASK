import re
import os

print("Applying Quick Task Multi-Device Synchronization Fixes...")

# 1. Update sw.js version to v5.3.0
sw_path = 'sw.js'
with open(sw_path, 'r', encoding='utf-8') as f:
    sw_content = f.read()
sw_content = sw_content.replace("const CACHE_VERSION = 'v5.2.0';", "const CACHE_VERSION = 'v5.3.0';")
sw_content = sw_content.replace("const CACHE_VERSION = 'v5.1.9';", "const CACHE_VERSION = 'v5.3.0';")
with open(sw_path, 'w', encoding='utf-8') as f:
    f.write(sw_content)
print("Updated sw.js to v5.3.0")

# 2. Add Background Realtime Cloud Sync Poller in js/core.js
core_path = 'js/core.js'
with open(core_path, 'r', encoding='utf-8') as f:
    core_code = f.read()

realtime_poller_code = """
/* ---------------- REALTIME MULTI-DEVICE CLOUD SYNC ENGINE ---------------- */
let _cloudSyncInterval = null;

function startRealtimeCloudSyncTimer() {
  if (_cloudSyncInterval) return;
  _cloudSyncInterval = setInterval(async () => {
    if (!navigator.onLine || document.hidden || !session || !session.businessId) return;
    
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
      return; // Do not interrupt user typing
    }
    
    try {
      if (typeof flushOfflineMutationQueue === 'function' && typeof getOfflineQueue === 'function' && getOfflineQueue().length > 0) {
        await flushOfflineMutationQueue(true);
      }

      const bizId = session.businessId;
      if (typeof sb === 'undefined' || !sb) return;

      const { data: cloudTasks, error: tErr } = await sb.from('tasks').select('*').eq('business_id', bizId).order('due_date', { ascending: true, nullsFirst: false });
      
      if (!tErr && cloudTasks && Array.isArray(cloudTasks)) {
        const localSavedTasks = JSON.parse(localStorage.getItem('br_tasks_' + bizId) || '[]');
        const deletedIds = new Set((localSavedTasks || []).filter(t => t && t.is_deleted).map(t => String(t.id)));
        const systemPrefixes = ['[CUSTOMER_', '[EDIT_REQ]', '[EXPIRY_', '[EXPENSES_', '[SALARY_', '[FUTURE_', '[FEATURE_', '[VENDOR_', '[SALES_'];
        const isSystemPayload = (t) => t && t.title && systemPrefixes.some(p => t.title.startsWith(p));

        const taskMap = new Map();
        (localSavedTasks || []).forEach(t => {
          if (t && t.id && !isSystemPayload(t) && !deletedIds.has(String(t.id))) {
            taskMap.set(String(t.id), t);
          }
        });

        cloudTasks.filter(ct => !isSystemPayload(ct) && !deletedIds.has(String(ct.id))).forEach(ct => {
          const ctIdStr = String(ct.id);
          const loc = taskMap.get(ctIdStr);
          if (loc) {
            const merged = Object.assign({}, ct, loc);
            if (loc.status === 'done') merged.status = 'done';
            taskMap.set(ctIdStr, merged);
          } else {
            taskMap.set(ctIdStr, ct);
          }
        });

        const newTasks = Array.from(taskMap.values());
        const oldJson = JSON.stringify(cache.tasks || []);
        const newJson = JSON.stringify(newTasks);

        if (oldJson !== newJson) {
          cache.tasks = newTasks;
          try { localStorage.setItem('br_tasks_' + bizId, JSON.stringify(cache.tasks)); } catch(e){}
          if (typeof safeBackgroundRenderTabBody === 'function') {
            safeBackgroundRenderTabBody();
          } else if (typeof renderTabBody === 'function' && typeof activeTab !== 'undefined' && activeTab === 'tasks') {
            renderTabBody();
          }
        }
      }
    } catch(e) {}
  }, 10000); // 10s multi-device cloud polling heartbeat
}
"""

if "startRealtimeCloudSyncTimer" not in core_code:
    core_code += realtime_poller_code
    print("Added startRealtimeCloudSyncTimer to core.js")

# Trigger poller inside loadData()
old_loaddata_end = "    localStorage.setItem('br_incentive_targets_' + bizId, JSON.stringify(cache.incentiveTargets));\n    }"
new_loaddata_end = "    localStorage.setItem('br_incentive_targets_' + bizId, JSON.stringify(cache.incentiveTargets));\n    }\n    if(typeof startRealtimeCloudSyncTimer === 'function') startRealtimeCloudSyncTimer();"

if old_loaddata_end in core_code:
    core_code = core_code.replace(old_loaddata_end, new_loaddata_end)
    print("Triggered startRealtimeCloudSyncTimer in loadData()")

with open(core_path, 'w', encoding='utf-8') as f:
    f.write(core_code)
print("Updated js/core.js")

# 3. Refactor Quick Task & Visibility in js/tabs/work.js
work_path = 'js/tabs/work.js'
with open(work_path, 'r', encoding='utf-8') as f:
    work_code = f.read()

# Default assignedTo to 'all' if no staff tag present in parseNaturalTaskText
old_parse_assigned = "let assignedTo = session ? session.staffId : null;"
new_parse_assigned = "let assignedTo = 'all';"

if old_parse_assigned in work_code:
    work_code = work_code.replace(old_parse_assigned, new_parse_assigned)
    print("Updated parseNaturalTaskText default assignedTo to 'all'")

# Update staff task list filter to include 'all', unassigned, and created_by
old_list_filter = "let list = isManagerPlus() ? cache.tasks : cache.tasks.filter(t=>t.assigned_to===session.staffId);"
new_list_filter = "let list = isManagerPlus() ? cache.tasks : cache.tasks.filter(t => !t.assigned_to || t.assigned_to === 'all' || t.assigned_to === session.staffId || t.created_by === session.staffId);"

if old_list_filter in work_code:
    work_code = work_code.replace(old_list_filter, new_list_filter)
    print("Updated renderTasksTab list filter for multi-device staff visibility")

with open(work_path, 'w', encoding='utf-8') as f:
    f.write(work_code)
print("Updated js/tabs/work.js")

print("All Quick Task Multi-Device sync fixes applied successfully.")
