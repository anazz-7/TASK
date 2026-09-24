/**
 * Dedicated Task Synchronization Test Suite
 * Tests:
 * 1. Offline insert, metadata assignment (local_id, client_task_id, sync_status, updated_at)
 * 2. Mutation queue integrity and retry count
 * 3. Supabase insert reconciliation (local_id -> cloud UUID)
 * 4. Duplicate prevention & idempotency via client_task_id
 * 5. Offline update & Done status propagation
 * 6. Deletion & tombstone protection against resurrection
 * 7. Multi-device deterministic merge (Device A <-> Device B)
 * 8. Diagnostics window.__taskSyncDiagnostics()
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--------------------------------------------------');
console.log('RUNNING COMPREHENSIVE TASK SYNC TEST SUITE');
console.log('--------------------------------------------------');

// Set up mock DOM environment
function createTestEnvironment(sharedCloudDb) {
  const store = {};
  const mockLocalStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };

  const listeners = {};
  const mockWindow = {
    location: { href: '' },
    addEventListener: (evt, fn) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    },
    dispatchEvent: (evt) => {
      if (listeners[evt]) listeners[evt].forEach(fn => fn());
    },
    showToast: () => {}
  };

  const mockDocument = {
    visibilityState: 'visible',
    activeElement: { tagName: 'DIV' },
    getElementById: () => ({
      innerHTML: '',
      value: '',
      style: {},
      focus: () => {},
      classList: { add: ()=>{}, remove: ()=>{} },
      addEventListener: ()=>{},
      querySelectorAll: () => []
    }),
    createElement: () => ({ innerHTML: '', style: {}, appendChild: ()=>{}, querySelectorAll: () => [] }),
    body: { appendChild: ()=>{} },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (evt, fn) => {
      listeners[evt] = listeners[evt] || [];
      listeners[evt].push(fn);
    }
  };

  const mockNavigator = {
    onLine: true,
    userAgent: 'NodeTest'
  };

  // Mock Supabase database in memory
  const cloudDb = sharedCloudDb || {
    tasks: []
  };

  const mockSb = {
    from: (table) => {
      return {
        select: (cols) => {
          let rows = (cloudDb[table] || []).map(r => Object.assign({}, r));
          const query = {
            eq: (col, val) => {
              rows = rows.filter(r => String(r[col]) === String(val));
              return query;
            },
            ilike: (col, pattern) => {
              const cleanPattern = pattern.replace(/%/g, '');
              rows = rows.filter(r => String(r[col] || '').includes(cleanPattern));
              return query;
            },
            order: () => query,
            limit: (n) => {
              rows = rows.slice(0, n);
              return query;
            },
            maybeSingle: async () => ({ data: rows[0] || null, error: null }),
            single: async () => ({ data: rows[0] || null, error: rows[0] ? null : { message: 'Not found' } }),
            then: (resolve) => resolve({ data: rows, error: null })
          };
          return query;
        },
        insert: (payload) => {
          const items = Array.isArray(payload) ? payload : [payload];
          const inserted = items.map(p => {
            const row = Object.assign({}, p, {
              id: p.id || ('uuid_' + Math.random().toString(36).substring(2, 9)),
              created_at: p.created_at || new Date().toISOString(),
              updated_at: p.updated_at || new Date().toISOString()
            });
            cloudDb[table].push(row);
            return row;
          });
          return {
            select: () => ({
              single: async () => ({ data: inserted[0], error: null })
            }),
            then: (resolve) => resolve({ data: inserted, error: null })
          };
        },
        update: (updates) => {
          let filterCol = null;
          let filterVal = null;
          const uQuery = {
            eq: (col, val) => {
              filterCol = col;
              filterVal = val;
              const matches = (cloudDb[table] || []).filter(r => String(r[col]) === String(val));
              matches.forEach(r => Object.assign(r, updates));
              return {
                then: (resolve) => resolve({ data: matches, error: null })
              };
            }
          };
          return uQuery;
        },
        delete: () => {
          return {
            eq: (col, val) => {
              const arr = cloudDb[table] || [];
              for (let i = arr.length - 1; i >= 0; i--) {
                if (String(arr[i][col]) === String(val)) {
                  arr.splice(i, 1);
                }
              }
              return {
                then: (resolve) => resolve({ error: null })
              };
            }
          };
        }
      };
    }
  };

  const coreCode = fs.readFileSync(path.join(__dirname, 'js', 'core.js'), 'utf8');
  const workCode = fs.readFileSync(path.join(__dirname, 'js', 'tabs', 'work.js'), 'utf8');

  const context = {
    window: mockWindow,
    document: mockDocument,
    localStorage: mockLocalStorage,
    navigator: mockNavigator,
    sb: mockSb,
    console: console,
    setTimeout: (fn) => fn(),
    setInterval: () => 1,
    todayStr: () => '2026-09-24',
    esc: (s) => s || '',
    icon: () => '',
    isManagerPlus: () => true,
    isOwner: () => true,
    staffName: () => 'Staff 1',
    staffPhone: () => '919999999999',
    fmtDue: () => '2026-09-24',
    isOverdue: () => false,
    celebrateDone: () => {},
    logAuditEvent: () => {},
    getModalHolder: () => ({ innerHTML: '' }),
    renderTabBody: () => {},
    renderShell: () => {},
    showLoading: () => {},
    hideLoading: () => {},
    cloudDb: cloudDb
  };

  mockLocalStorage.setItem('br_session', JSON.stringify({
    staffId: 'staff_1',
    name: 'Mohammed Anas',
    role: 'owner',
    businessId: 'biz_1',
    businessName: 'BM Super Mart'
  }));
  mockWindow.sb = mockSb;
  mockWindow.navigator = mockNavigator;

  vm.createContext(context);
  vm.runInContext(coreCode, context);
  vm.runInContext(workCode, context);

  context.createTaskLocally = context.window.createTaskLocally;
  context.updateTaskLocally = context.window.updateTaskLocally;
  context.deleteTaskLocally = context.window.deleteTaskLocally;
  context.syncTasks = context.window.syncTasks;
  context.getOfflineQueue = () => JSON.parse(context.localStorage.getItem('br_offline_mutation_queue') || '[]');
  context.cache = context.window.cache;
  context._deterministicTaskMerge = context.window._deterministicTaskMerge;
  context.__taskSyncDiagnostics = context.window.__taskSyncDiagnostics;

  return context;
}

// ---------------- TEST SUITE ----------------
(async () => {
  try {
    console.log('\n[TEST 1] Offline Task Creation & Metadata Assignment');
    const envA = createTestEnvironment();
    envA.navigator.onLine = false; // Simulate offline

    const task = envA.createTaskLocally({
      title: 'Buy Milk',
      priority: 'high',
      notes: 'Fresh dairy milk'
    });

    assert(task, 'Task should be created');
    assert(task.id.startsWith('loc_task_'), 'Temporary local ID should start with loc_task_');
    assert.strictEqual(task.sync_status, 'pending', 'sync_status must be pending');
    assert(task.client_task_id, 'client_task_id must be generated');
    assert(task.updated_at, 'updated_at must be populated');
    assert.strictEqual(envA.cache.tasks.length, 1, 'Task should be in local cache');

    const queue = envA.getOfflineQueue();
    assert.strictEqual(queue.length, 1, 'Mutation should be queued in offline queue');
    assert.strictEqual(queue[0].action_type, 'insert', 'Queue action should be insert');
    assert.strictEqual(queue[0].local_id, task.id, 'Queue item must retain local_id');
    assert.strictEqual(queue[0].client_task_id, task.client_task_id, 'Queue item must retain client_task_id');
    console.log('✔ Passed: Offline task created with loc_task_ ID, client_task_id, pending status, and queued mutation.');

    console.log('\n[TEST 2] Reconnection & Reconciliation to Cloud UUID');
    envA.navigator.onLine = true; // Reconnect
    envA.window.navigator = envA.navigator;
    const syncRes = await envA.syncTasks();
    console.log('DEBUG syncRes:', syncRes);
    assert(syncRes.success, 'Sync should succeed: ' + JSON.stringify(syncRes));
    assert(envA.cache.tasks[0].id.startsWith('uuid_'), 'Local task ID should be reconciled to real cloud UUID');
    assert.strictEqual(envA.cache.tasks[0].sync_status, 'synced', 'sync_status should now be synced');
    assert.strictEqual(envA.getOfflineQueue().length, 0, 'Offline queue should be empty after successful sync');
    assert.strictEqual(envA.cloudDb.tasks.length, 1, 'Cloud database should have exactly 1 task');
    console.log('✔ Passed: Task reconciled from loc_task_ to cloud UUID, marked synced, queue emptied.');

    console.log('\n[TEST 3] Idempotency & Duplicate Prevention');
    // Simulate a scenario where network interrupted: task is in cloudDb, but local queue has retry insert
    const duplicateMutation = {
      id: 'off_test_dup',
      action_type: 'insert',
      table: 'tasks',
      local_id: 'loc_task_retry_999',
      client_task_id: envA.cache.tasks[0].client_task_id,
      payload: {
        business_id: 'biz_1',
        title: 'Buy Milk',
        client_task_id: envA.cache.tasks[0].client_task_id
      },
      timestamp: new Date().toISOString(),
      retryCount: 1
    };
    envA.localStorage.setItem('br_offline_mutation_queue', JSON.stringify([duplicateMutation]));
    await envA.syncTasks();

    assert.strictEqual(envA.cloudDb.tasks.length, 1, 'Cloud database must NOT contain duplicate task');
    assert.strictEqual(envA.getOfflineQueue().length, 0, 'Duplicate mutation should be reconciled and dropped');
    console.log('✔ Passed: Retried insert recognized existing task via client_task_id and avoided duplicate.');

    console.log('\n[TEST 4] Task Update & Mark Done Sync');
    const cloudId = envA.cache.tasks[0].id;
    envA.updateTaskLocally(cloudId, { status: 'done', completed_at: '2026-09-24T18:00:00Z' });

    assert.strictEqual(envA.cache.tasks[0].status, 'done', 'Local status must be done immediately');
    await envA.syncTasks();

    const cloudTask = envA.cloudDb.tasks.find(t => t.id === cloudId);
    assert(cloudTask, 'Cloud task should exist');
    assert.strictEqual(cloudTask.status, 'done', 'Cloud task status must be updated to done');
    console.log('✔ Passed: Done status propagated to cloud successfully.');

    console.log('\n[TEST 5] Multi-Device Sync (Device A -> Device B)');
    const envB = createTestEnvironment(envA.cloudDb);
    assert.strictEqual(envB.cache.tasks.length, 0, 'Device B starts with empty local cache');

    await envB.syncTasks();
    assert.strictEqual(envB.cache.tasks.length, 1, 'Device B should receive task from Device A');
    assert.strictEqual(envB.cache.tasks[0].id, cloudId, 'Device B should have matching task ID');
    assert.strictEqual(envB.cache.tasks[0].status, 'done', 'Device B should see done status');
    assert.strictEqual(envB.cache.tasks[0].sync_status, 'synced', 'Device B task should be marked synced');
    console.log('✔ Passed: Device B received task with exact status from Device A via syncTasks.');

    console.log('\n[TEST 6] Local Tombstone & Deletion Propagation');
    // Device A deletes the task
    envA.deleteTaskLocally(cloudId);
    assert.strictEqual(envA.cache.tasks.length, 0, 'Task should be removed immediately from Device A');

    await envA.syncTasks();
    assert.strictEqual(envA.cloudDb.tasks.length, 0, 'Task should be deleted from cloud database');

    // Device B syncs
    await envB.syncTasks();
    assert.strictEqual(envB.cache.tasks.length, 0, 'Task should be deleted on Device B');
    console.log('✔ Passed: Deletion propagated across both devices without resurrecting.');

    console.log('\n[TEST 7] Offline Edit Conflict Resolution (Newer Local Edits Win)');
    // Insert base task into cloudDb
    const baseCloudTask = {
      id: 'uuid_conflict_1',
      business_id: 'biz_1',
      title: 'Old Title from Cloud',
      priority: 'low',
      status: 'pending',
      created_at: '2026-09-24T10:00:00Z',
      updated_at: '2026-09-24T10:00:00Z',
      notes: '[cid:cid_conflict_1][upd:2026-09-24T10:00:00Z]'
    };
    envA.cloudDb.tasks = [baseCloudTask];
    await envA.syncTasks();

    // Now Device A goes offline and updates the task with a NEWER timestamp
    envA.navigator.onLine = false;
    envA.updateTaskLocally('uuid_conflict_1', {
      title: 'Newer Offline Title on Device A',
      priority: 'high'
    });
    envA.cache.tasks[0].updated_at = '2026-09-24T12:00:00Z'; // Newer than cloud

    // Simulate merge
    const merged = envA._deterministicTaskMerge(envA.cache.tasks, envA.cloudDb.tasks, 'biz_1');
    assert.strictEqual(merged[0].title, 'Newer Offline Title on Device A', 'Newer local edit must win over older cloud copy');
    console.log('✔ Passed: Deterministic merge preserves newer offline local edits over older cloud copy.');

    console.log('\n[TEST 8] Diagnostics Verification');
    const diag = envA.__taskSyncDiagnostics();
    assert('online' in diag, 'Diagnostics must include online');
    assert('queuedMutations' in diag, 'Diagnostics must include queuedMutations');
    assert('pendingTasks' in diag, 'Diagnostics must include pendingTasks');
    assert('failedTasks' in diag, 'Diagnostics must include failedTasks');
    assert('localTasks' in diag, 'Diagnostics must include localTasks');
    assert('lastSyncAt' in diag, 'Diagnostics must include lastSyncAt');
    assert('lastSyncError' in diag, 'Diagnostics must include lastSyncError');
    console.log('✔ Passed: window.__taskSyncDiagnostics() returns correct structure:', diag);

    console.log('\n--------------------------------------------------');
    console.log('ALL 8 DEDICATED TASK SYNC TESTS PASSED SUCCESSFULLY!');
    console.log('--------------------------------------------------');
  } catch(err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exit(1);
  }
})();
