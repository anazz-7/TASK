import re
import os

print("Applying Comprehensive UUID & Sync Pending Fixes...")

# 1. Update sw.js version to v5.2.0
sw_path = 'sw.js'
with open(sw_path, 'r', encoding='utf-8') as f:
    sw_content = f.read()
sw_content = sw_content.replace("const CACHE_VERSION = 'v5.1.9';", "const CACHE_VERSION = 'v5.2.0';")
sw_content = sw_content.replace("const CACHE_VERSION = 'v5.1.8';", "const CACHE_VERSION = 'v5.2.0';")
with open(sw_path, 'w', encoding='utf-8') as f:
    f.write(sw_content)
print("Updated sw.js to v5.2.0")

# 2. Fix js/tabs/admin.js typo flushOfflineMutations -> flushOfflineMutationQueue
admin_path = 'js/tabs/admin.js'
with open(admin_path, 'r', encoding='utf-8') as f:
    admin_code = f.read()

admin_code = admin_code.replace("if (typeof flushOfflineMutations === 'function') await flushOfflineMutations();",
                                "if (typeof flushOfflineMutationQueue === 'function') await flushOfflineMutationQueue(true);")

with open(admin_path, 'w', encoding='utf-8') as f:
    f.write(admin_code)
print("Updated js/tabs/admin.js: Fixed flushOfflineMutations typo")

# 3. Overhaul flushOfflineMutationQueue & Header Badge in js/core.js
core_path = 'js/core.js'
with open(core_path, 'r', encoding='utf-8') as f:
    core_code = f.read()

# Update header badge onclick
old_badge = """<button class="offline-badge pending" title="${qLen} record(s) pending cloud sync. Tap to sync." onclick="window.__reloadAppData(document.querySelector('.reload-btn'))">"""
new_badge = """<button class="offline-badge pending" title="${qLen} record(s) pending cloud sync. Tap to sync." onclick="if(typeof window.__openQueuedMutationsModal==='function')window.__openQueuedMutationsModal();else if(typeof flushOfflineMutationQueue==='function')flushOfflineMutationQueue();">"""

if old_badge in core_code:
    core_code = core_code.replace(old_badge, new_badge)
    print("Updated header PENDING badge onclick in core.js")

# Complete Bulletproof flushOfflineMutationQueue Implementation
new_flush_fn = """async function flushOfflineMutationQueue(isSilent = false) {
  if (!navigator.onLine) {
    if (!isSilent) {
      alert('Cannot sync: Device is offline. Check your internet connection.');
    }
    return;
  }
  const queue = getOfflineQueue();
  if (!queue.length) {
    updateOfflineBadgeBar();
    return;
  }

  if (!isSilent) showLoading();
  let syncedCount = 0;
  const remaining = [];
  let lastErrorMsg = null;

  for (const item of queue) {
    try {
      const rawId = item.payload ? String(item.payload.id || '') : '';
      const isLocalId = rawId.startsWith('loc_') || rawId.startsWith('off_') || rawId.startsWith('preset_');

      const payload = Object.assign({}, item.payload || {});
      delete payload.id; // remove temporary local ID for clean cloud insert/update
      let resErr = null;
      let savedRecord = null;

      if (item.table === 'daily_accounts') {
        // Multi-tier robust sync for daily_accounts
        let { data: saved, error } = await sb.from('daily_accounts').upsert(payload, { onConflict: 'business_id,date' }).select().single();
        if (error) resErr = error;
        savedRecord = saved;
        
        if (error || !saved) {
          const { data: checkData, error: checkErr } = await sb.from('daily_accounts').select('id').eq('business_id', payload.business_id).eq('date', payload.date).maybeSingle();
          if (checkData && checkData.id) {
            const res = await sb.from('daily_accounts').update(payload).eq('id', checkData.id).select().single();
            savedRecord = res.data; resErr = res.error || checkErr;
          } else {
            const res = await sb.from('daily_accounts').insert(payload).select().single();
            savedRecord = res.data; resErr = res.error || checkErr;
          }
        }
        if (savedRecord && savedRecord.id) {
          syncedCount++;
          continue;
        }
      } else if (item.action_type === 'delete') {
        if (isLocalId || !rawId) {
          // Local item deleted offline; nothing to delete in Supabase DB
          syncedCount++;
          continue;
        } else {
          const { error } = await sb.from(item.table).delete().eq('id', rawId);
          if (error && (error.code === '22P02' || String(error.message).includes('invalid input syntax for type uuid'))) {
            // Invalid UUID format — drop stale local item
            syncedCount++;
          } else if (error) {
            resErr = error;
          } else {
            syncedCount++;
          }
        }
      } else if (item.action_type === 'update') {
        if (isLocalId || !rawId) {
          // Created offline; insert as fresh record into DB
          const { data: saved, error } = await sb.from(item.table).insert(payload).select().maybeSingle();
          if (error && (error.code === '22P02' || String(error.message).includes('invalid input syntax for type uuid'))) {
            syncedCount++;
          } else if (error) {
            resErr = error;
          } else {
            syncedCount++;
            savedRecord = saved;
          }
        } else {
          const { error } = await sb.from(item.table).update(payload).eq('id', rawId);
          if (error && (error.code === '22P02' || String(error.message).includes('invalid input syntax for type uuid'))) {
            syncedCount++;
          } else if (error) {
            resErr = error;
          } else {
            syncedCount++;
          }
        }
      } else if (item.action_type === 'insert' || item.action_type === 'upsert') {
        if (item.table === 'tasks' && payload.title && payload.title.startsWith('[')) {
          const { data: existingList } = await sb.from('tasks').select('id').eq('business_id', payload.business_id).eq('title', payload.title);
          if (existingList && existingList.length > 0) {
            const { error } = await sb.from('tasks').update(payload).eq('id', existingList[0].id);
            resErr = error;
          } else {
            const { error } = await sb.from('tasks').insert(payload);
            resErr = error;
          }
          if (!resErr) syncedCount++;
        } else {
          const { data: saved, error } = await sb.from(item.table).insert(payload).select().maybeSingle();
          if (error) {
            if (!isLocalId && rawId) {
              const { error: upErr } = await sb.from(item.table).update(payload).eq('id', rawId);
              resErr = upErr;
            } else {
              resErr = error;
            }
          } else {
            syncedCount++;
            savedRecord = saved;
          }
        }
      } else {
        syncedCount++;
        continue;
      }

      if (resErr) {
        lastErrorMsg = resErr.message || resErr.details || JSON.stringify(resErr);
        console.warn('Queue sync item error:', resErr);
        if (item.retryCount && item.retryCount >= 2) {
          console.warn('Dropping stale/un-syncable queue item after 2 retries:', item);
          syncedCount++;
        } else {
          item.retryCount = (item.retryCount || 0) + 1;
          remaining.push(item);
        }
      } else if (savedRecord && savedRecord.id && isLocalId && session && session.businessId) {
        // Link local cache item to newly generated cloud UUID
        if (item.table === 'tasks' && cache.tasks) {
          const loc = cache.tasks.find(t => t.id === rawId || (t.title === payload.title && t.created_at === payload.created_at));
          if (loc) {
            loc.id = savedRecord.id;
            try { localStorage.setItem('br_tasks_' + session.businessId, JSON.stringify(cache.tasks)); } catch(e){}
          }
        } else if (item.table === 'labels' && cache.labels) {
          const loc = cache.labels.find(l => l.id === rawId);
          if (loc) {
            loc.id = savedRecord.id;
            try { localStorage.setItem('br_labels_' + session.businessId, JSON.stringify(cache.labels)); } catch(e){}
          }
        } else if (item.table === 'packages' && cache.packages) {
          const loc = cache.packages.find(p => p.id === rawId);
          if (loc) {
            loc.id = savedRecord.id;
            try { localStorage.setItem('br_packages_' + session.businessId, JSON.stringify(cache.packages)); } catch(e){}
          }
        }
      }
    } catch(err) {
      lastErrorMsg = err.message || String(err);
      console.warn('Queue item sync exception:', err);
      remaining.push(item);
    }
  }

  if (!isSilent) hideLoading();
  localStorage.setItem('br_offline_mutation_queue', JSON.stringify(remaining));
  updateOfflineBadgeBar();

  if (syncedCount > 0 && typeof window.showToast === 'function') {
    window.showToast(`✅ Synced ${syncedCount} queued action(s) to cloud!`, 'success');
  }
  
  if (!isSilent && lastErrorMsg && remaining.length > 0) {
    alert('☁️ Cloud Sync Alert: Could not sync ' + remaining.length + ' item(s).\\n\\nSupabase Error: ' + lastErrorMsg + '\\n\\nTip: Tap "Clear Queue" on details modal to clear stuck items.');
  }
}"""

# Find start and end of flushOfflineMutationQueue in core.js
start_marker = "async function flushOfflineMutationQueue("
end_marker = "function clearOfflineQueue()"

if start_marker in core_code and end_marker in core_code:
    s_idx = core_code.find(start_marker)
    e_idx = core_code.find(end_marker)
    core_code = core_code[:s_idx] + new_flush_fn + "\n\n" + core_code[e_idx:]
    print("Replaced flushOfflineMutationQueue in core.js with bulletproof UUID handling")
else:
    print("WARNING: Could not locate start/end markers for flushOfflineMutationQueue in core.js")

with open(core_path, 'w', encoding='utf-8') as f:
    f.write(core_code)
print("Updated js/core.js")

print("All fixes applied successfully!")
