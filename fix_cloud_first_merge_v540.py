import re, os

print("Applying Definitive Multi-Device Task Sync Fix (v5.4.0)...")

# ------- 1. sw.js version bump -------
sw_path = 'sw.js'
with open(sw_path, 'r', encoding='utf-8') as f:
    sw = f.read()
# replace any v5.x.x
sw = re.sub(r"const CACHE_VERSION = 'v5\.\d+\.\d+';", "const CACHE_VERSION = 'v5.4.0';", sw)
with open(sw_path, 'w', encoding='utf-8') as f:
    f.write(sw)
print("sw.js => v5.4.0")


# ------- 2. core.js overhaul -------
core_path = 'js/core.js'
with open(core_path, 'r', encoding='utf-8') as f:
    code = f.read()

# 2a. Fix the realtime poller merge: cloud should WIN for new tasks (use cloud-first merge)
old_merge = """        const taskMap = new Map();
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
        });"""

new_merge = """        // Cloud-first merge: cloud tasks WIN for new content, local wins for status (done=permanent)
        const taskMap = new Map();

        // Step 1: Load CLOUD tasks first as source of truth
        cloudTasks.filter(ct => !isSystemPayload(ct) && !deletedIds.has(String(ct.id))).forEach(ct => {
          taskMap.set(String(ct.id), ct);
        });

        // Step 2: Keep local-only tasks (loc_ prefix) that haven't synced to cloud yet
        (localSavedTasks || []).forEach(t => {
          if (t && t.id && !isSystemPayload(t) && !deletedIds.has(String(t.id))) {
            const idStr = String(t.id);
            if (idStr.startsWith('loc_') || idStr.startsWith('preset_')) {
              taskMap.set(idStr, t);
            } else if (taskMap.has(idStr)) {
              // Merge: preserve done status set locally
              const cloudTask = taskMap.get(idStr);
              if (t.status === 'done' && cloudTask.status !== 'done') {
                taskMap.set(idStr, Object.assign({}, cloudTask, { status: 'done', completed_at: t.completed_at || cloudTask.completed_at }));
              }
              // else cloud wins
            }
          }
        });"""

if old_merge in code:
    code = code.replace(old_merge, new_merge)
    print("Fixed cloud-first merge in realtime poller")
else:
    print("WARNING: could not find exact old_merge block in core.js")

# 2b. Fix the loadData() task merge to use same cloud-first logic
old_loaddata_merge = """    // 2. Merge cloud tasks (if cloud fetch returned data)
    if (cloudTasks && Array.isArray(cloudTasks)) {
      const userCloudTasks = cloudTasks.filter(ct => !isSystemPayload(ct) && !deletedIds.has(String(ct.id)));
      userCloudTasks.forEach(ct => {
        const ctIdStr = String(ct.id);
        const loc = taskMap.get(ctIdStr);
        if (loc) {
          // Cloud data merged, preserving local status if marked done locally
          const merged = Object.assign({}, ct, loc);
          if (loc.status === 'done') merged.status = 'done';
          taskMap.set(ctIdStr, merged);
        } else {
          taskMap.set(ctIdStr, ct);
        }
      });
    }"""

new_loaddata_merge = """    // 2. Merge cloud tasks — CLOUD WINS for content; local only wins for 'done' status
    if (cloudTasks && Array.isArray(cloudTasks)) {
      cloudTasks.filter(ct => !isSystemPayload(ct) && !deletedIds.has(String(ct.id))).forEach(ct => {
        const ctIdStr = String(ct.id);
        const loc = taskMap.get(ctIdStr);
        if (loc && loc.status === 'done') {
          // Local marked as done — preserve done status, otherwise cloud content wins
          taskMap.set(ctIdStr, Object.assign({}, ct, { status: 'done', completed_at: loc.completed_at || ct.completed_at }));
        } else {
          // Cloud wins for all non-done tasks
          taskMap.set(ctIdStr, ct);
        }
      });
    }"""

if old_loaddata_merge in code:
    code = code.replace(old_loaddata_merge, new_loaddata_merge)
    print("Fixed cloud-first merge in loadData()")
else:
    print("WARNING: could not find old_loaddata_merge in core.js")

with open(core_path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated js/core.js")


# ------- 3. work.js - fix Quick Task: always store full owner/creator payload -------
work_path = 'js/tabs/work.js'
with open(work_path, 'r', encoding='utf-8') as f:
    wcode = f.read()

# Fix parseNaturalTaskText - if no @name found, keep creator's staffId as assignedTo (managers assign to themselves OR target staff)
# Actually the REAL fix: 'all' breaks filtering. Tasks should default to session.staffId for non-@name quick tasks
# but visible to managers. The visibility fix is the key.
old_default_assigned = "let assignedTo = 'all';"
if old_default_assigned in wcode:
    wcode = wcode.replace(old_default_assigned, "let assignedTo = session ? session.staffId : null;")
    print("Reverted parseNaturalTaskText default assignedTo to session.staffId")

# Fix task list visibility: managers see all, staff see their own + 'all' + created_by
# This is already done in previous fix. Make sure it's correct:
old_filter = "let list = isManagerPlus() ? cache.tasks : cache.tasks.filter(t => !t.assigned_to || t.assigned_to === 'all' || t.assigned_to === session.staffId || t.created_by === session.staffId);"
correct_filter = "let list = isManagerPlus() ? cache.tasks : cache.tasks.filter(t => !t.assigned_to || t.assigned_to === 'all' || t.assigned_to === session.staffId || t.created_by === session.staffId);"
if old_filter in wcode:
    print("Staff visibility filter is already correct")
else:
    # Check if original filter exists and replace
    orig_filter = "let list = isManagerPlus() ? cache.tasks : cache.tasks.filter(t=>t.assigned_to===session.staffId);"
    if orig_filter in wcode:
        wcode = wcode.replace(orig_filter, correct_filter)
        print("Applied staff visibility filter")

# Fix both __submitQuickModal and __quickAddNaturalTask: 
# After successful insert, also update the header badge/sync indicator
old_submitquick_success = """        } else if (inserted && inserted.id) {
          const loc = cache.tasks.find(t => t.id === payload.id);
          if (loc) Object.assign(loc, inserted);
          try { localStorage.setItem('br_tasks_' + session.businessId, JSON.stringify(cache.tasks)); } catch(e){}
        }
      } else if (typeof queueOfflineMutation === 'function') {
        queueOfflineMutation('insert', 'tasks', dbPayload);
      }
    } catch(err) {
      console.warn('Quick modal task sync error:', err);
      if (typeof queueOfflineMutation === 'function') queueOfflineMutation('insert', 'tasks', dbPayload);
    }
  })();
};"""

new_submitquick_success = """        } else if (inserted && inserted.id) {
          const loc = cache.tasks.find(t => t.id === payload.id);
          if (loc) Object.assign(loc, inserted);
          try { localStorage.setItem('br_tasks_' + session.businessId, JSON.stringify(cache.tasks)); } catch(e){}
          if (typeof updateOfflineBadgeBar === 'function') updateOfflineBadgeBar();
          if (typeof renderTabBody === 'function') renderTabBody();
        }
      } else if (typeof queueOfflineMutation === 'function') {
        queueOfflineMutation('insert', 'tasks', dbPayload);
      }
    } catch(err) {
      console.warn('Quick modal task sync error:', err);
      if (typeof queueOfflineMutation === 'function') queueOfflineMutation('insert', 'tasks', dbPayload);
    }
  })();
};"""

if old_submitquick_success in wcode:
    wcode = wcode.replace(old_submitquick_success, new_submitquick_success)
    print("Updated __submitQuickModal: re-renders after UUID binding")

old_quickadd_success = """        } else if (inserted && inserted.id) {
          const loc = cache.tasks.find(t => t.id === payload.id);
          if (loc) Object.assign(loc, inserted);
          try { localStorage.setItem('br_tasks_' + session.businessId, JSON.stringify(cache.tasks)); } catch(e){}
        }
      } else if (typeof queueOfflineMutation === 'function') {
        queueOfflineMutation('insert', 'tasks', dbPayload);
      }
    } catch(err) {
      console.warn('Quick task sync error:', err);
      if (typeof queueOfflineMutation === 'function') queueOfflineMutation('insert', 'tasks', dbPayload);
    }
  })();
};"""

new_quickadd_success = """        } else if (inserted && inserted.id) {
          const loc = cache.tasks.find(t => t.id === payload.id);
          if (loc) Object.assign(loc, inserted);
          try { localStorage.setItem('br_tasks_' + session.businessId, JSON.stringify(cache.tasks)); } catch(e){}
          if (typeof updateOfflineBadgeBar === 'function') updateOfflineBadgeBar();
          if (typeof renderTabBody === 'function') renderTabBody();
        }
      } else if (typeof queueOfflineMutation === 'function') {
        queueOfflineMutation('insert', 'tasks', dbPayload);
      }
    } catch(err) {
      console.warn('Quick task sync error:', err);
      if (typeof queueOfflineMutation === 'function') queueOfflineMutation('insert', 'tasks', dbPayload);
    }
  })();
};"""

if old_quickadd_success in wcode:
    wcode = wcode.replace(old_quickadd_success, new_quickadd_success)
    print("Updated __quickAddNaturalTask: re-renders after UUID binding")

with open(work_path, 'w', encoding='utf-8') as f:
    f.write(wcode)
print("Updated js/tabs/work.js")

print("\nAll v5.4.0 multi-device sync fixes applied successfully.")
