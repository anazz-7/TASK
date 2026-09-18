import re
import os

print("Applying Bulletproof Cloud Sync & Offline Auto-Flush Fixes...")

# 1. Update sw.js version to v5.1.9
sw_path = 'sw.js'
with open(sw_path, 'r', encoding='utf-8') as f:
    sw_content = f.read()
sw_content = sw_content.replace("const CACHE_VERSION = 'v5.1.8';", "const CACHE_VERSION = 'v5.1.9';")
with open(sw_path, 'w', encoding='utf-8') as f:
    f.write(sw_content)
print("Updated sw.js to v5.1.9")

# 2. Refactor js/core.js
core_path = 'js/core.js'
with open(core_path, 'r', encoding='utf-8') as f:
    core_code = f.read()

# Refactor queueOfflineMutation
old_queue_fn = """function queueOfflineMutation(actionType, table, payload) {
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
}"""

new_queue_fn = """function queueOfflineMutation(actionType, table, payload) {
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

  if (typeof window._queueFlushTimer !== 'undefined') clearTimeout(window._queueFlushTimer);
  window._queueFlushTimer = setTimeout(() => {
    if (typeof flushOfflineMutationQueue === 'function') {
      flushOfflineMutationQueue(true);
    }
  }, 500);
}"""

if old_queue_fn in core_code:
    core_code = core_code.replace(old_queue_fn, new_queue_fn)
    print("Replaced queueOfflineMutation in core.js")
else:
    print("WARNING: Could not find exact old_queue_fn string in core.js")

# Refactor flushOfflineMutationQueue
old_flush_start = "async function flushOfflineMutationQueue() {"
new_flush_start = "async function flushOfflineMutationQueue(isSilent = false) {"

if old_flush_start in core_code:
    core_code = core_code.replace(old_flush_start, new_flush_start)
    print("Replaced flushOfflineMutationQueue signature")

# Replace !navigator.onLine alert block in flushOfflineMutationQueue
old_online_check = """  if (!navigator.onLine) {
    alert('Cannot sync: Device is offline. Check your internet connection.');
    return;
  }"""

new_online_check = """  if (!navigator.onLine) {
    if (!isSilent) {
      alert('Cannot sync: Device is offline. Check your internet connection.');
    }
    return;
  }"""

if old_online_check in core_code:
    core_code = core_code.replace(old_online_check, new_online_check)
    print("Replaced online check in flushOfflineMutationQueue")

# Replace showLoading() and hideLoading() calls in flushOfflineMutationQueue to check !isSilent
core_code = core_code.replace("showLoading();\n  let syncedCount = 0;", "if (!isSilent) showLoading();\n  let syncedCount = 0;")
core_code = core_code.replace("hideLoading();\n  localStorage.setItem('br_offline_mutation_queue', JSON.stringify(remaining));", "if (!isSilent) hideLoading();\n  localStorage.setItem('br_offline_mutation_queue', JSON.stringify(remaining));")

# Replace alert for lastErrorMsg in flushOfflineMutationQueue to check !isSilent
old_error_alert = "if (lastErrorMsg && remaining.length > 0) {"
new_error_alert = "if (!isSilent && lastErrorMsg && remaining.length > 0) {"
if old_error_alert in core_code:
    core_code = core_code.replace(old_error_alert, new_error_alert)

# Add boot auto-flush in loadData()
old_load_data = "async function loadData(){\n  showLoading();"
new_load_data = """async function loadData(){
  if (typeof flushOfflineMutationQueue === 'function') {
    try { await flushOfflineMutationQueue(true); } catch(e){}
  }
  showLoading();"""

if old_load_data in core_code:
    core_code = core_code.replace(old_load_data, new_load_data)
    print("Added boot auto-flush to loadData() in core.js")

# Add online & periodic event listeners if not present
event_listeners = """
window.addEventListener('online', () => {
  if (typeof flushOfflineMutationQueue === 'function') {
    flushOfflineMutationQueue(true);
  }
});
setInterval(() => {
  if (navigator.onLine && typeof flushOfflineMutationQueue === 'function' && typeof getOfflineQueue === 'function' && getOfflineQueue().length > 0) {
    flushOfflineMutationQueue(true);
  }
}, 15000);
"""

if "window.addEventListener('online'" not in core_code:
    core_code += event_listeners
    print("Added online listener & periodic flush heartbeat to core.js")

# Replace navigator.onLine checks in delete functions in core.js
core_code = core_code.replace("if (navigator.onLine && typeof sb !== 'undefined' && !String(id).startsWith('loc_task_')) {", "if (typeof sb !== 'undefined' && sb && !String(id).startsWith('loc_task_')) {")
core_code = core_code.replace("if (navigator.onLine && typeof sb !== 'undefined' && sb) {", "if (typeof sb !== 'undefined' && sb) {")

with open(core_path, 'w', encoding='utf-8') as f:
    f.write(core_code)
print("Updated js/core.js")

# 3. Refactor js/tabs/work.js
work_path = 'js/tabs/work.js'
with open(work_path, 'r', encoding='utf-8') as f:
    work_code = f.read()

work_code = work_code.replace("if (navigator.onLine && typeof sb !== 'undefined')", "if (typeof sb !== 'undefined' && sb)")
work_code = work_code.replace("if (navigator.onLine && typeof sb !== 'undefined' && !String(id).startsWith('loc_task_'))", "if (typeof sb !== 'undefined' && sb && !String(id).startsWith('loc_task_'))")

with open(work_path, 'w', encoding='utf-8') as f:
    f.write(work_code)
print("Updated js/tabs/work.js")

# 4. Refactor js/tabs/sales.js
sales_path = 'js/tabs/sales.js'
with open(sales_path, 'r', encoding='utf-8') as f:
    sales_code = f.read()

sales_code = sales_code.replace("if (navigator.onLine && typeof sb !== 'utf-defined')", "if (typeof sb !== 'undefined' && sb)")
sales_code = sales_code.replace("if (navigator.onLine && typeof sb !== 'undefined'", "if (typeof sb !== 'undefined' && sb")

with open(sales_path, 'w', encoding='utf-8') as f:
    f.write(sales_code)
print("Updated js/tabs/sales.js")

# 5. Refactor js/tabs/admin.js
admin_path = 'js/tabs/admin.js'
with open(admin_path, 'r', encoding='utf-8') as f:
    admin_code = f.read()

admin_code = admin_code.replace("if (navigator.onLine && typeof sb !== 'undefined'", "if (typeof sb !== 'undefined' && sb")

with open(admin_path, 'w', encoding='utf-8') as f:
    f.write(admin_code)
print("Updated js/tabs/admin.js")

print("All bulletproof cloud sync updates applied successfully.")
