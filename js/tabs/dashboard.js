/* ---------------- DASHBOARD ---------------- */
let dashSalesMode = 'weekly';
window.__setDashSalesMode = (m) => { dashSalesMode = m; renderTabBody(); };
let dashPointsMode = 'weekly';
window.__setDashPointsMode = (m) => { dashPointsMode = m; renderTabBody(); };

function getPreviousMonthSalesTotal(curMonthKey) {
  const parts = (curMonthKey || monthKey(todayStr())).split('-');
  const y = parseInt(parts[0], 10) || 2026;
  const m = parseInt(parts[1], 10) || 9;
  const prevDate = new Date(y, m - 2, 1);
  const prevKey = monthKey(localDateStr(prevDate));
  const prevSales = (cache.sales || []).filter(s => monthKey(s.date || s.created_at) === prevKey);
  const total = prevSales.reduce((sum, s) => sum + Number(s.order_value || s.amount || 0), 0);
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const prevMonthTitle = (monthNames[prevDate.getMonth()] || '') + ' ' + prevDate.getFullYear();
  return { prevKey, prevMonthTitle, total };
}

function buildPinnedIncentiveTargetWidgetHtml(curMonth, monthSales) {
  const targets = cache.salesTargets || [];
  const myStaffId = session ? session.staffId : '';
  const myTargetObj = targets.find(t => t.staff_id === myStaffId && t.month === curMonth);
  const isOwnerUser = isOwner();
  const prevInfo = getPreviousMonthSalesTotal(curMonth);
  const autoOwnerTarget = prevInfo.total > 0 ? prevInfo.total : 200000;

  let targetVal = 30000;
  let incentiveBonus = 3000;
  let achievedSales = 0;
  let titleText = '';

  if (isOwnerUser) {
    achievedSales = monthSales.reduce((s, x) => s + Number(x.order_value || 0), 0);
    const setTargetSum = targets.filter(t => t.month === curMonth).reduce((s, t) => s + Number(t.target_amount || 0), 0);
    targetVal = setTargetSum > 0 ? setTargetSum : autoOwnerTarget;
    incentiveBonus = targets.filter(t => t.month === curMonth).reduce((s, t) => s + Number(t.incentive_bonus || 3000), 0) || 15000;
    titleText = `Overall Business Target (${curMonth} Goal vs ${prevInfo.prevMonthTitle})`;
  } else {
    achievedSales = monthSales.filter(x => x.staff_id === myStaffId).reduce((s, x) => s + Number(x.order_value || 0), 0);
    targetVal = myTargetObj ? Number(myTargetObj.target_amount || 30000) : 30000;
    incentiveBonus = myTargetObj ? Number(myTargetObj.incentive_bonus || 3000) : 3000;
    titleText = `Monthly Target to Earn Incentive (${curMonth})`;
  }

  const pct = Math.min(100, Math.round((achievedSales / Math.max(1, targetVal)) * 100));
  const remaining = Math.max(0, targetVal - achievedSales);

  return `
    <!-- PINNED INCENTIVE TARGET CARD (SLIM COMPACT MOBILE & DESKTOP DESIGN) -->
    <div class="row-card pinned-target-card" style="flex-direction:column;align-items:stretch;margin-bottom:16px;background:linear-gradient(135deg, #0F172A 0%, #1E293B 100%);color:#FFFFFF;border-radius:12px;border:1px solid rgba(255,255,255,0.08);box-shadow:0 4px 16px rgba(15,23,42,0.22);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:nowrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
          <div class="pinned-target-icon-box" style="display:inline-flex;align-items:center;justify-content:center;background:rgba(56,189,248,0.14);border:1px solid rgba(56,189,248,0.25);color:#38BDF8;flex-shrink:0;">
            ${icon('target', 18)}
          </div>
          <div style="min-width:0;flex:1;">
            <b class="pinned-target-title" style="color:#FFFFFF;display:block;letter-spacing:0.01em;text-transform:uppercase;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${titleText}</b>
            <span class="pinned-target-sub" style="color:#94A3B8;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Reach goal to unlock <b style="color:#34D399;font-weight:700;">₹${incentiveBonus.toLocaleString('en-IN')} Bonus</b></span>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <b class="pinned-target-amount" style="font-family:'Roboto Mono',monospace;color:${pct>=100?'#34D399':'#FBBF24'};letter-spacing:-0.02em;white-space:nowrap;">
            ₹${achievedSales.toLocaleString('en-IN')} / ₹${targetVal.toLocaleString('en-IN')}
          </b>
          <span class="pinned-target-pct" style="display:block;color:#CBD5E1;font-weight:700;margin-top:1px;">${pct}% Completed</span>
        </div>
      </div>

      ${isOwnerUser ? `
        <!-- Simple Report Visual: Previous Month Sales Benchmark vs Current Goal -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(255,255,255,0.06);border-radius:8px;margin-bottom:8px;font-size:0.75rem;border:1px solid rgba(255,255,255,0.08);">
          <div>
            <span style="color:#94A3B8;display:block;font-size:0.62rem;text-transform:uppercase;font-weight:700;">${prevInfo.prevMonthTitle} Sales Benchmark</span>
            <b style="color:#F8FAFC;font-family:'Roboto Mono',monospace;font-size:0.82rem;">₹${prevInfo.total.toLocaleString('en-IN')}</b>
          </div>
          <div style="text-align:center;">
            <span style="color:#94A3B8;display:block;font-size:0.62rem;text-transform:uppercase;font-weight:700;">${curMonth} Target Goal</span>
            <b style="color:#FBBF24;font-family:'Roboto Mono',monospace;font-size:0.82rem;">₹${targetVal.toLocaleString('en-IN')}</b>
          </div>
          <div style="text-align:right;">
            <span style="color:#94A3B8;display:block;font-size:0.62rem;text-transform:uppercase;font-weight:700;">Achieved So Far</span>
            <b style="color:#34D399;font-family:'Roboto Mono',monospace;font-size:0.82rem;">₹${achievedSales.toLocaleString('en-IN')}</b>
          </div>
        </div>
      ` : ''}

      <!-- Catchy Incentive Bonus Highlight Banner Pinned Above Progress Track -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <span style="font-size:0.72rem;color:#CBD5E1;font-weight:600;">Target Goal Progress</span>
        <span style="background:linear-gradient(135deg, #10B981, #059669);color:#FFFFFF;font-family:'Roboto Mono',monospace;font-size:0.72rem;font-weight:800;padding:2px 8px;border-radius:999px;box-shadow:0 0 10px rgba(16,185,129,0.4);display:inline-flex;align-items:center;gap:4px;">
          ${icon('trophy', 12)} INV BONUS: ₹${incentiveBonus.toLocaleString('en-IN')}
        </span>
      </div>

      <!-- Animated Executive Gold Progress Bar -->
      <div class="progress-track" style="height:10px;background:rgba(255,255,255,0.12);border-radius:999px;overflow:hidden;margin-bottom:8px;">
        <div class="progress-fill ${pct>=100?'complete':''}" style="width:${pct}%;height:100%;border-radius:999px;background:${pct>=100?'linear-gradient(90deg, #F59E0B, #10B981)':'linear-gradient(90deg, #D97706, #FBBF24, #FCD34D)'};"></div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08);flex-wrap:nowrap;gap:6px;">
        ${pct >= 100 ? `
          <span class="pinned-target-status" style="color:#34D399;font-weight:700;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${icon('check', 14)} Target Achieved! ₹${incentiveBonus.toLocaleString('en-IN')} Bonus Unlocked!
          </span>
        ` : `
          <span class="pinned-target-status" style="color:#FCD34D;font-weight:600;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${icon('trending', 13)} Achieve ₹${remaining.toLocaleString('en-IN')} more to unlock ₹${incentiveBonus.toLocaleString('en-IN')} Bonus!
          </span>
        `}
        ${isOwner() ? `
          <button class="stamp-btn small pinned-target-btn" style="background:rgba(255,255,255,0.14);color:#FFFFFF;border:1px solid rgba(255,255,255,0.22);display:inline-flex;align-items:center;gap:4px;flex-shrink:0;white-space:nowrap;" onclick="window.__openSetTargetsModal()">
            ${icon('settings', 12)} Set Targets
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function buildStaffTargetsHtml(curMonth, monthSales){
  const targets = cache.salesTargets || [];
  const staffList = cache.staff || [];
  if (!staffList.length) return '';

  // Total Business Sales for current month
  const totalMonthSales = monthSales.reduce((sum, x) => sum + Number(x.order_value || 0), 0);
  const prevInfo = getPreviousMonthSalesTotal(curMonth);
  const setTargetSum = targets.filter(t => t.month === curMonth).reduce((s, t) => s + Number(t.target_amount || 0), 0);
  const businessTargetVal = setTargetSum > 0 ? setTargetSum : (prevInfo.total > 0 ? prevInfo.total : 200000);
  const bizPct = Math.min(100, Math.round((totalMonthSales / Math.max(1, businessTargetVal)) * 100));

  const activeStaffCards = staffList.map(s => {
    const sSales = monthSales.filter(x=>x.staff_id===s.id).reduce((sum,x)=>sum+Number(x.order_value||0),0);
    // HIDE PROGRESS BAR ENTIRELY IF SALES ARE ZERO
    if (sSales <= 0) return '';
    const targetObj = targets.find(t=>t.staff_id===s.id && t.month===curMonth);
    const targetVal = targetObj ? Number(targetObj.target_amount||0) : 25000;
    const bonusVal = targetObj ? Number(targetObj.incentive_bonus||3000) : 3000;
    const pct = Math.min(100, Math.round((sSales / Math.max(1, targetVal)) * 100));
    return `
      <div class="row-card" style="flex-direction:column;align-items:stretch;padding:12px;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:4px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <b style="margin:0;font-size:0.88rem;color:var(--ink);">${esc(s.name)}</b>
            <span style="background:var(--leaf-soft);color:var(--leaf);border:1px solid var(--leaf);font-family:'Roboto Mono',monospace;font-size:0.68rem;font-weight:800;padding:1px 7px;border-radius:999px;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 4px rgba(16,185,129,0.15);">
              ${icon('trophy', 11)} Bonus: ₹${bonusVal.toLocaleString('en-IN')}
            </span>
          </div>
          <span style="font-family:'Roboto Mono',monospace;font-weight:700;font-size:0.8rem;color:var(--turmeric-dark);">
            ₹${sSales.toLocaleString('en-IN')} / ₹${targetVal.toLocaleString('en-IN')} (${pct}%)
          </span>
        </div>
        <div class="progress-track" style="height:8px;background:var(--paper-line);border-radius:999px;overflow:hidden;">
          <div class="progress-fill ${pct>=100?'complete':''}" style="width:${pct}%;height:100%;border-radius:999px;"></div>
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  return `
    <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">
      <span>Target Progress & Sales Performance — ${curMonth}</span>
      ${isManagerPlus() ? `<button class="stamp-btn small ghost" style="padding:2px 8px;font-size:0.7rem;" onclick="window.__openSetTargetsModal()">Set Targets</button>` : ''}
    </div>

    <!-- Overall Business Sales Goal Progress Card -->
    <div class="row-card" style="flex-direction:column;align-items:stretch;padding:12px 14px;margin-bottom:12px;background:var(--blue-soft);border:1px solid var(--paper-line);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
        <div>
          <b style="font-size:0.9rem;color:var(--ink);">Business Monthly Target Goal (${curMonth})</b>
          <div style="font-size:0.7rem;color:var(--ink-soft);margin-top:1px;">Based on ${prevInfo.prevMonthTitle} Total Sales Baseline: <b>₹${prevInfo.total.toLocaleString('en-IN')}</b></div>
        </div>
        <b style="font-family:'Roboto Mono',monospace;font-size:0.85rem;color:var(--ink);">
          ₹${totalMonthSales.toLocaleString('en-IN')} / ₹${businessTargetVal.toLocaleString('en-IN')} (${bizPct}%)
        </b>
      </div>
      <div class="progress-track" style="height:10px;background:var(--paper-line);border-radius:999px;overflow:hidden;">
        <div class="progress-fill ${bizPct>=100?'complete':''}" style="width:${bizPct}%;height:100%;border-radius:999px;"></div>
      </div>
    </div>

    <!-- Staff Individual Sales Targets Progress Grid (Only >0 Sales) -->
    ${activeStaffCards ? `<div class="cards-grid">${activeStaffCards}</div>` : '<div class="empty">No staff sales recorded above zero yet this month.</div>'}
  `;
}

window.__openSetTargetsModal = function() {
  const holder = getModalHolder('taskModalHolder');
  const curMonth = monthKey(todayStr());
  const targets = cache.salesTargets || [];

  holder.innerHTML = `
  <div class="overlay show" onclick="if(event.target===this) getModalHolder('taskModalHolder').innerHTML=''"><div class="modal" style="max-width:520px;width:92%;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;display:inline-flex;align-items:center;gap:6px;">${icon('settings', 16)} Assign Custom Targets & Incentive Bonuses (${curMonth})</h3>
      <button class="stamp-btn small ghost" onclick="getModalHolder('taskModalHolder').innerHTML=''">✕</button>
    </div>
    <p style="font-size:0.8rem;color:var(--ink-soft);margin-bottom:14px;">Set custom monthly target sales amounts and incentive bonus rewards for staff members and managers.</p>

    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px;max-height:360px;overflow-y:auto;padding-right:4px;">
      ${cache.staff.map(s => {
        const targetObj = targets.find(t => t.staff_id === s.id && t.month === curMonth);
        const tVal = targetObj ? targetObj.target_amount : 30000;
        const bVal = targetObj ? (targetObj.incentive_bonus || 3000) : 3000;
        return `
          <div style="display:flex;flex-direction:column;gap:6px;background:var(--paper);padding:10px 12px;border-radius:8px;border:1px solid var(--paper-line);">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <b style="font-size:0.88rem;color:var(--ink);">${esc(s.name)}</b>
              <span class="role-pill" style="font-size:0.75rem;padding:2px 6px;">${s.role || 'staff'}</span>
            </div>
            <div style="display:flex;gap:10px;align-items:center;margin-top:4px;">
              <div style="flex:1;">
                <label style="font-size:0.7rem;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:2px;">TARGET SALES (₹)</label>
                <input type="number" class="mTargetInput" data-staff="${s.id}" value="${tVal}" style="width:100%;box-sizing:border-box;font-family:'Roboto Mono',monospace;font-weight:700;font-size:0.85rem;">
              </div>
              <div style="flex:1;">
                <label style="font-size:0.7rem;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:2px;">INCENTIVE BONUS (₹)</label>
                <input type="number" class="mIncentiveInput" data-staff="${s.id}" value="${bVal}" style="width:100%;box-sizing:border-box;font-family:'Roboto Mono',monospace;font-weight:700;font-size:0.85rem;color:var(--leaf);">
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="modal-actions" style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="stamp-btn ghost" onclick="getModalHolder('taskModalHolder').innerHTML=''">Cancel</button>
      <button class="stamp-btn" style="background:var(--turmeric);color:white;" onclick="window.__saveStaffTargets('${curMonth}')">💾 Save Custom Targets</button>
    </div>
  </div></div>`;
};

window.__saveStaffTargets = async function(curMonth) {
  const tInputs = document.querySelectorAll('.mTargetInput');
  const targets = cache.salesTargets || [];

  for (const input of tInputs) {
    const staffId = input.getAttribute('data-staff');
    const targetAmt = Number(input.value || 0);
    const bInput = document.querySelector(`.mIncentiveInput[data-staff="${staffId}"]`);
    const bonusAmt = bInput ? Number(bInput.value || 0) : 3000;

    let targetObj = targets.find(t => t.staff_id === staffId && t.month === curMonth);
    if (targetObj) {
      targetObj.target_amount = targetAmt;
      targetObj.incentive_bonus = bonusAmt;
    } else {
      targetObj = {
        id: 'targ_' + Date.now() + '_' + Math.random().toString(36).substring(2,6),
        business_id: session.businessId,
        staff_id: staffId,
        month: curMonth,
        target_amount: targetAmt,
        incentive_bonus: bonusAmt
      };
      targets.push(targetObj);
    }

    if (navigator.onLine && typeof sb !== 'undefined') {
      try {
        const payload = Object.assign({}, targetObj);
        delete payload.id;
        await sb.from('sales_targets').upsert(payload, { onConflict: 'business_id,staff_id,month' });
      } catch(e){}
    }
  }

  cache.salesTargets = targets;
  getModalHolder('taskModalHolder').innerHTML = '';
  window.showToast('🎯 Custom Sales Targets & Incentive Bonuses updated!', 'success');
  renderTabBody();
};

function sendSmsDailySummary(){
  const today = todayStr();
  const todaySalesTotal = cache.sales.filter(s=>s.date===today).reduce((sum,s)=>sum+Number(s.order_value||0),0);
  const todayCheckedIn = new Set(cache.attendance.filter(a=>a.date===today && a.status==='present').map(a=>a.staff_id)).size;
  const routineDoneToday = cache.routineLog.filter(l=>l.status==='done').length;
  const stockCheckToday = cache.stockChecks.find(c=>c.date===today);
  const stockStatus = stockCheckToday ? (stockCheckToday.all_correct===false?'Issue Reported':'Checked OK') : 'Not Checked';

  const msg = [
    `Daily Summary Report - ${session.businessName} (${today})`,
    `Sales Today: ₹${todaySalesTotal.toFixed(0)}`,
    `Attendance: ${todayCheckedIn}/${cache.staff.length} checked in`,
    `Stock Check: ${stockStatus}`,
    `Everyday Tasks: ${routineDoneToday}/${cache.routines.length} done`
  ].join(' — ');

  sendSmsTo('+916379849947', msg);
}
window.__sendSmsDailySummary = sendSmsDailySummary;


/* ---------------- DASHBOARD WIDGETS (Features 1, 2, 6) ---------------- */
function buildDashboardVendorBillsHtml() {
  return '';
}

function buildDashboardActivityFeedHtml() {
  const auditLogs = typeof getAuditLogs === 'function' ? getAuditLogs() : [];
  if (!auditLogs.length) return '';

  const recent = auditLogs.slice(0, 5);

  return `
    <div class="section-label">📜 Real-Time Activity Feed <a onclick="window.__setTab('audit')">View All &rarr;</a></div>
    <div class="row-card" style="flex-direction:column;align-items:stretch;padding:14px;margin-bottom:16px;">
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${recent.map(item => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding-bottom:8px;border-bottom:1px dashed var(--paper-line);">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--blue-soft);color:var(--turmeric-dark);display:flex;align-items:center;justify-content:center;font-size:0.75rem;flex-shrink:0;font-weight:700;">
              ⚡
            </div>
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <b style="font-size:0.84rem;color:var(--ink);">${esc(item.actionType)}</b>
                <span style="font-size:0.7rem;color:var(--ink-soft);font-family:'Roboto Mono',monospace;">${item.timestamp ? item.timestamp.slice(11,16) : ''}</span>
              </div>
              <div style="font-size:0.78rem;color:var(--ink-soft);margin-top:2px;">${esc(item.details)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}


function renderDashboardTab(body){
  const today = todayStr();
  const curMonth = monthKey(today);
  const total = cache.tasks.length;
  const done = cache.tasks.filter(t=>t.status==='done').length;
  const overdue = cache.tasks.filter(t=>t.status!=='done' && t.due_date && t.due_date < today).length;
  const rate = total ? Math.round((done/total)*100) : 0;

  const doneCounts = {};
  cache.tasks.filter(t=>t.status==='done').forEach(t=>{ doneCounts[t.assigned_to] = (doneCounts[t.assigned_to]||0)+1; });
  const topId = Object.keys(doneCounts).sort((a,b)=>doneCounts[b]-doneCounts[a])[0];
  const topPerformer = topId ? `${staffName(topId)} (${doneCounts[topId]} done)` : '—';

  const monthAtt = cache.attendance.filter(a=>monthKey(a.date)===curMonth && a.status==='present');
  const daysWithAnyPresence = new Set(monthAtt.map(a=>a.date)).size;
  const daysSoFarThisMonth = new Date(today).getDate();
  const attPct = daysSoFarThisMonth ? Math.round((daysWithAnyPresence/daysSoFarThisMonth)*100) : 0;
  const todayCheckedIn = new Set(cache.attendance.filter(a=>a.date===today && a.status==='present').map(a=>a.staff_id)).size;

  const attByStaffThisMonth = {};
  monthAtt.forEach(a=>{ (attByStaffThisMonth[a.staff_id] = attByStaffThisMonth[a.staff_id]||new Set()).add(a.date); });
  const bestAttId = Object.keys(attByStaffThisMonth).sort((a,b)=>attByStaffThisMonth[b].size-attByStaffThisMonth[a].size)[0];
  const bestAttendance = bestAttId ? `${staffName(bestAttId)} (${attByStaffThisMonth[bestAttId].size}d)` : '—';

  const routineDoneToday = cache.routineLog.filter(l=>l.status==='done').length;
  const labelsToday = cache.labels.filter(l=>l.date===today).reduce((s,l)=>s+Number(l.qty||0),0);

  const monthSales = cache.sales.filter(s=>monthKey(s.date)===curMonth);
  const monthSalesTotal = monthSales.reduce((sum,s)=>sum+Number(s.order_value||0),0);
  const todaySalesTotal = cache.sales.filter(s=>s.date===today).reduce((sum,s)=>sum+Number(s.order_value||0),0);

  const salesByStaff = {};
  monthSales.forEach(s=>{ salesByStaff[s.staff_id] = (salesByStaff[s.staff_id]||0) + Number(s.order_value||0); });
  const leaderboard = Object.entries(salesByStaff).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const monthPoints = cache.points.filter(p=>monthKey(p.date)===curMonth);
  const pointsByStaff = {};
  monthPoints.forEach(p=>{ pointsByStaff[p.staff_id] = (pointsByStaff[p.staff_id]||0) + Number(p.points||0); });
  const pointsLeaderboard = Object.entries(pointsByStaff).sort((a,b)=>b[1]-a[1]).slice(0,5);

  const monthSalaryTotal = cache.salaries.filter(s=>s.paid_date.startsWith(curMonth)).reduce((sum,s)=>sum+Number(s.amount||0),0);
  const monthTargets = cache.salesTargets.filter(t=>t.month===curMonth);
  const totalTarget = monthTargets.reduce((s,t)=>s+Number(t.target_amount||0),0);
  const targetAchievedPct = totalTarget ? Math.round((monthSalesTotal/totalTarget)*100) : null;
  const sharingNowCount = cache.salesmanLocations.filter(l=>l.is_sharing).length;
  const packagesToday = cache.packages.filter(p=>p.date===today).reduce((s,p)=>s+Number(p.qty||0),0);

  const unpaidVendorBills = (cache.vendorBills || []).filter(b => b.status !== 'paid');
  const unpaidVendorTotal = unpaidVendorBills.reduce((sum, b) => sum + getBillAmount(b), 0);

  body.innerHTML = `
    <!-- 🎯 PINNED INCENTIVE TARGET CARD (FIRST ON DASHBOARD) -->
    ${buildPinnedIncentiveTargetWidgetHtml(curMonth, monthSales)}

    <!-- 📈 Sales Trend Interactive Chart (OWNER ONLY SECURITY) -->
    ${isOwner() ? buildSalesTrendChartHtml() : ''}

    <!-- Vendor Bills Payable Widget (OWNER ONLY SECURITY) -->
    ${isOwner() ? buildDashboardVendorBillsHtml() : ''}


    <div class="section-label">Tasks</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="num">${total}</div><div class="label">Total tasks</div></div>
      <div class="stat-card"><div class="num">${rate}%</div><div class="label">Completion rate</div></div>
      <div class="stat-card"><div class="num" style="color:${overdue?'var(--turmeric)':'inherit'}">${overdue}</div><div class="label">Overdue</div></div>
      <div class="stat-card"><div class="num" style="font-size:1rem;">${esc(topPerformer)}</div><div class="label">Top performer</div></div>
    </div>

    <div class="section-label">Attendance — ${curMonth}</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="num">${attPct}%</div><div class="label">Present rate (all staff)</div></div>
      <div class="stat-card"><div class="num">${todayCheckedIn}/${cache.staff.length}</div><div class="label">Checked in today</div></div>
      <div class="stat-card"><div class="num" style="font-size:1rem;">${esc(bestAttendance)}</div><div class="label">Best attendance this month</div></div>
      <div class="stat-card"><div class="num">${cache.staff.length}</div><div class="label">Staff on roll</div></div>
    </div>

    <div class="section-label">Today at a glance</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="num">${routineDoneToday}/${cache.routines.length}</div><div class="label">Everyday tasks done</div></div>
      <div class="stat-card"><div class="num">${labelsToday}</div><div class="label">Items labelled today</div></div>
      <div class="stat-card"><div class="num">${packagesToday}</div><div class="label">Items packaged today</div></div>
    </div>

    ${isOwner() ? `
    <div class="section-label">Sales${targetAchievedPct!==null?` <span style="color:var(--ink-soft);font-weight:600;">${targetAchievedPct}% of target</span>`:''}</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="num">₹${todaySalesTotal.toFixed(0)}</div><div class="label">Today</div></div>
      <div class="stat-card"><div class="num">₹${monthSalesTotal.toFixed(0)}</div><div class="label">This month</div></div>
    </div>
    ` : ''}

    ${buildStaffTargetsHtml(curMonth, monthSales)}
    ${isOwner() ? `
    <div class="section-label">Payroll — ${curMonth}</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="num">₹${monthSalaryTotal.toFixed(0)}</div><div class="label">Salary paid this month</div></div>
    </div>` : ''}
    ${isOwner() ? buildWeeklyEmailReportHtml() : ''}
    ${isOwner() ? buildDashboardPnLLineGraphHtml() : ''}
    ${buildDashboardQuickLinksHtml()}
  `;
}

function buildDashboardQuickLinksHtml() {
  return `
    <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;">
      <span>Operations &amp; Quick Links Hub</span>
    </div>

    <div class="row-card" style="flex-direction:column;align-items:stretch;padding:14px;background:var(--paper);border:1.5px solid var(--paper-line);border-radius:12px;margin-bottom:20px;">
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:10px;width:100%;box-sizing:border-box;">
        <button class="stamp-btn ghost" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 8px;gap:6px;height:auto;font-size:0.75rem;text-align:center;background:var(--paper-line);" onclick="window.__setTab('pricelist')">
          <span style="font-size:1.2rem;color:var(--turmeric-dark);">${icon('clipboard', 22)}</span>
          <b style="color:var(--ink);">Price List</b>
        </button>
        
        <button class="stamp-btn ghost" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 8px;gap:6px;height:auto;font-size:0.75rem;text-align:center;background:var(--paper-line);" onclick="window.__setTab('label')">
          <span style="font-size:1.2rem;color:var(--leaf);">${icon('label', 22)}</span>
          <b style="color:var(--ink);">Label Log</b>
        </button>

        <button class="stamp-btn ghost" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 8px;gap:6px;height:auto;font-size:0.75rem;text-align:center;background:var(--paper-line);" onclick="window.__setTab('package')">
          <span style="font-size:1.2rem;color:var(--blue);">${icon('box', 22)}</span>
          <b style="color:var(--ink);">Package Log</b>
        </button>

        <button class="stamp-btn ghost" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 8px;gap:6px;height:auto;font-size:0.75rem;text-align:center;background:var(--paper-line);" onclick="window.__setTab('points')">
          <span style="font-size:1.2rem;color:var(--turmeric-dark);">${icon('trophy', 22)}</span>
          <b style="color:var(--ink);">Points &amp; Rewards</b>
        </button>

        <button class="stamp-btn ghost" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 8px;gap:6px;height:auto;font-size:0.75rem;text-align:center;background:var(--paper-line);" onclick="window.__setTab('stockkeeper')">
          <span style="font-size:1.2rem;color:var(--ink);">${icon('database', 22)}</span>
          <b style="color:var(--ink);">Stock Keeper</b>
        </button>

        <button class="stamp-btn ghost" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 8px;gap:6px;height:auto;font-size:0.75rem;text-align:center;background:var(--paper-line);" onclick="window.__setTab('low_stock')">
          <span style="font-size:1.2rem;color:var(--brick);">${icon('alert', 22)}</span>
          <b style="color:var(--ink);">Low Stock Alerts</b>
        </button>
      </div>
    </div>
  `;
}

function buildDashboardPnLLineGraphHtml() {
  if (!isOwner()) return '';
  const records = typeof getPnLData === 'function' ? getPnLData() : [];
  const opening = typeof getPnLOpeningProfit === 'function' ? getPnLOpeningProfit() : { amount: 0 };
  const openingAmt = Number(opening.amount || 0);

  const curMonth = monthKey(todayStr());
  const thisMonthRec = records.find(r => r.month === curMonth) || records[0];
  const thisNet = thisMonthRec ? Number(thisMonthRec.net_profit || 0) : 0;
  const monthlyNetSum = records.reduce((sum, r) => sum + Number(r.net_profit || 0), 0);
  const totalCumulativeNet = openingAmt + monthlyNetSum;

  const chartEntries = [];
  if (openingAmt > 0) {
    chartEntries.push({ month: '🏁 Opening', net_profit: openingAmt, isOpening: true });
  }
  const pastMonths = records.slice(0, 8).reverse();
  chartEntries.push(...pastMonths);

  if (chartEntries.length === 0) return '';

  const chartW = 600;
  const chartH = 180;
  const baselineY = 120;
  const paddingX = 40;
  const usableW = chartW - (paddingX * 2);

  const maxAbs = Math.max(1, ...chartEntries.map(r => Math.abs(Number(r.net_profit || 0))));

  const points = chartEntries.map((r, idx) => {
    const net = Number(r.net_profit || 0);
    const stepX = chartEntries.length > 1 ? usableW / (chartEntries.length - 1) : 0;
    const x = paddingX + idx * stepX;
    const isPos = net >= 0;
    const h = Math.round((Math.abs(net) / maxAbs) * 75);
    const y = isPos ? (baselineY - h) : (baselineY + h);
    return { x, y, net, month: r.month, isOpening: r.isOpening };
  });

  let pathD = '';
  if (points.length === 1) {
    pathD = `M ${points[0].x - 20},${points[0].y} L ${points[0].x + 20},${points[0].y}`;
  } else {
    pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const cx1 = p1.x + (p2.x - p1.x) / 2;
      const cy1 = p1.y;
      const cx2 = p1.x + (p2.x - p1.x) / 2;
      const cy2 = p2.y;
      pathD += ` C ${cx1},${cy1} ${cx2},${cy2} ${p2.x},${p2.y}`;
    }
  }

  const areaD = `${pathD} L ${points[points.length - 1].x},${baselineY} L ${points[0].x},${baselineY} Z`;

  return `
    <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;margin-top:18px;">
      <span>📈 Net Profit &amp; Loss (P&amp;L) Trend</span>
      <a onclick="window.__setTab('pnl')" style="font-size:0.75rem;color:var(--turmeric-dark);font-weight:700;cursor:pointer;">View P&amp;L Analytics &rarr;</a>
    </div>

    <div class="att-cal-container" style="margin-bottom:20px;padding:16px;background:var(--paper);border:1px solid var(--paper-line);border-radius:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:12px;font-size:0.82rem;flex-wrap:wrap;">
          <span>Cumulative Net Profit: <b style="color:${totalCumulativeNet>=0?'var(--leaf)':'var(--brick)'};font-family:'Roboto Mono',monospace;">₹${totalCumulativeNet.toLocaleString('en-IN')}</b></span>
          ${openingAmt > 0 ? `<span style="color:var(--turmeric-dark);font-weight:600;">🏁 Opening: ₹${openingAmt.toLocaleString('en-IN')}</span>` : ''}
          <span style="color:var(--leaf);font-weight:600;">Latest: ${thisNet>=0?'+':''}₹${thisNet.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <svg viewBox="0 0 ${chartW} ${chartH}" style="width:100%;height:auto;max-height:220px;overflow:visible;">
        <defs>
          <linearGradient id="pnlDashGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10B981" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#10B981" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <!-- Grid Lines -->
        <line x1="0" y1="35" x2="${chartW}" y2="35" stroke="var(--paper-line)" stroke-dasharray="3,3" stroke-width="1"/>
        <line x1="0" y1="${baselineY}" x2="${chartW}" y2="${baselineY}" stroke="var(--paper-line)" stroke-width="2"/>

        <!-- Filled Gradient Area -->
        <path d="${areaD}" fill="url(#pnlDashGrad)"/>

        <!-- Trend Line -->
        <path d="${pathD}" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round"/>

        <!-- Data Points & Labels -->
        ${points.map(p => {
          const isPos = p.net >= 0;
          const color = p.isOpening ? 'var(--turmeric-dark)' : (isPos ? 'var(--leaf)' : 'var(--brick)');
          const amtText = `${isPos?'+':''}₹${Math.abs(p.net)>=100000 ? (p.net/100000).toFixed(1)+'L' : Math.round(p.net/1000)+'k'}`;
          return `
            <g transform="translate(${p.x}, 0)">
              <!-- Glowing Data Node -->
              <circle cx="0" cy="${p.y}" r="5" fill="${color}" stroke="#FFFFFF" stroke-width="2"/>

              <!-- Amount Callout Badge -->
              <text x="0" y="${isPos ? (p.y - 9) : (p.y + 16)}" text-anchor="middle" font-size="10" font-weight="800" fill="${color}" font-family="'Roboto Mono',monospace">
                ${amtText}
              </text>

              <!-- Month Label below axis -->
              <text x="0" y="152" text-anchor="middle" font-size="10" font-weight="700" fill="var(--ink-soft)" font-family="sans-serif">${p.month}</text>
            </g>
          `;
        }).join('')}
      </svg>
    </div>
  `;
}



