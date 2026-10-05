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
  const prevAcc = (cache.dailyAccounts || []).filter(a => (a.date || '').startsWith(prevKey));
  const prevAccSales = prevAcc.reduce((sum, a) => sum + Number(a.total_sales != null ? a.total_sales : (a.totalSales || 0)), 0);
  const prevSales = (cache.sales || []).filter(s => monthKey(s.date || s.created_at) === prevKey);
  const orderTotal = prevSales.reduce((sum, s) => sum + Number(s.order_value || s.amount || 0), 0);
  const total = prevAcc.length > 0 || prevAccSales > 0 ? prevAccSales : orderTotal;
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const prevMonthTitle = (monthNames[prevDate.getMonth()] || '') + ' ' + prevDate.getFullYear();
  return { prevKey, prevMonthTitle, total };
}

function buildPinnedIncentiveTargetWidgetHtml(curMonth, monthSales) {
  const targets = cache.salesTargets || [];
  const myStaffId = session ? session.staffId : '';
  const myTargetObj = targets.find(t => t.staff_id === myStaffId && t.month === curMonth);
  const isOwnerUser = (typeof isOwner === 'function' && isOwner());
  const prevInfo = getPreviousMonthSalesTotal(curMonth);
  const autoOwnerTarget = prevInfo.total > 0 ? prevInfo.total : 200000;

  let targetVal = 30000;
  let incentiveBonus = 3000;
  let achievedSales = 0;
  let titleText = '';

  if (isOwnerUser) {
    const curMonthAcc = (cache.dailyAccounts || []).filter(a => a.date && a.date.startsWith(curMonth));
    const curMonthAccSales = curMonthAcc.reduce((sum, a) => sum + Number(a.total_sales != null ? a.total_sales : (a.totalSales || 0)), 0);
    const orderSalesTotal = monthSales.reduce((s, x) => s + Number(x.order_value || 0), 0);
    achievedSales = (curMonthAcc.length > 0 || curMonthAccSales > 0) ? curMonthAccSales : orderSalesTotal;
    const setTargetSum = targets.filter(t => t.month === curMonth).reduce((s, t) => s + Number(t.target_amount || 0), 0);
    targetVal = setTargetSum > 0 ? setTargetSum : autoOwnerTarget;
    incentiveBonus = targets.filter(t => t.month === curMonth).reduce((s, t) => s + Number(t.incentive_bonus || 3000), 0) || 15000;
    titleText = `Overall Business Target (${curMonth} Goal vs ${prevInfo.prevMonthTitle})`;
  } else {
    achievedSales = monthSales.filter(x => x.staff_id === myStaffId).reduce((s, x) => s + Number(x.order_value || 0), 0);
    targetVal = myTargetObj ? Number(myTargetObj.target_amount || 30000) : 30000;
    incentiveBonus = myTargetObj ? Number(myTargetObj.incentive_bonus || 3000) : 3000;
    titleText = `Monthly Performance Target (${curMonth})`;
  }

  const pct = Math.min(100, Math.round((achievedSales / Math.max(1, targetVal)) * 100));
  const remaining = Math.max(0, targetVal - achievedSales);

  const fmtAchieved = window.maskFinance ? window.maskFinance(`₹${achievedSales.toLocaleString('en-IN')}`) : `₹${achievedSales.toLocaleString('en-IN')}`;
  const fmtTarget = window.maskFinance ? window.maskFinance(`₹${targetVal.toLocaleString('en-IN')}`) : `₹${targetVal.toLocaleString('en-IN')}`;
  const fmtBonus = window.maskFinance ? window.maskFinance(`₹${incentiveBonus.toLocaleString('en-IN')}`) : `₹${incentiveBonus.toLocaleString('en-IN')}`;
  const fmtRemaining = window.maskFinance ? window.maskFinance(`₹${remaining.toLocaleString('en-IN')}`) : `₹${remaining.toLocaleString('en-IN')}`;

  const subTextHtml = isOwnerUser
    ? `Reach goal to unlock <b style="color:#34D399;font-weight:700;">${fmtBonus} Bonus</b>`
    : `Reach goal to unlock <b style="color:#34D399;font-weight:700;">Performance Bonus Reward</b>`;

  const amountDisplayHtml = isOwnerUser
    ? `<b class="pinned-target-amount" style="font-family:'Roboto Mono',monospace;color:${pct>=100?'#34D399':'#FBBF24'};letter-spacing:-0.02em;white-space:nowrap;">
        ${fmtAchieved} / ${fmtTarget}
       </b>
       <span class="pinned-target-pct" style="display:block;color:#CBD5E1;font-weight:700;margin-top:1px;">${pct}% Completed</span>`
    : `<b class="pinned-target-amount" style="font-family:'Roboto Mono',monospace;color:${pct>=100?'#34D399':'#FBBF24'};letter-spacing:-0.02em;white-space:nowrap;">
        ${pct}% Completed
       </b>
       <span class="pinned-target-pct" style="display:block;color:#CBD5E1;font-weight:700;margin-top:1px;">Active Target Track</span>`;

  const bonusPillHtml = isOwnerUser
    ? `<span style="background:linear-gradient(135deg, #10B981, #059669);color:#FFFFFF;font-family:'Roboto Mono',monospace;font-size:0.70rem;font-weight:800;padding:2px 8px;border-radius:999px;box-shadow:0 0 10px rgba(16,185,129,0.4);display:inline-flex;align-items:center;gap:4px;">
        ${icon('trophy', 12)} Bonus: ${fmtBonus}
      </span>`
    : `<span style="background:linear-gradient(135deg, #10B981, #059669);color:#FFFFFF;font-size:0.70rem;font-weight:700;padding:2px 8px;border-radius:999px;box-shadow:0 0 10px rgba(16,185,129,0.4);display:inline-flex;align-items:center;gap:4px;">
        ${icon('trophy', 12)} Performance Bonus Active
      </span>`;

  const statusFooterHtml = isOwnerUser
    ? (pct >= 100
        ? `<span class="pinned-target-status" style="color:#34D399;font-weight:700;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${icon('check', 13)} Target Achieved! ${fmtBonus} Bonus Unlocked!
          </span>`
        : `<span class="pinned-target-status" style="color:#FCD34D;font-weight:600;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${icon('trending', 12)} Achieve ${fmtRemaining} more to unlock ${fmtBonus} Bonus!
          </span>`)
    : (pct >= 100
        ? `<span class="pinned-target-status" style="color:#34D399;font-weight:700;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${icon('check', 13)} Target Achieved! Performance Bonus Unlocked!
          </span>`
        : `<span class="pinned-target-status" style="color:#FCD34D;font-weight:600;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
            ${icon('trending', 12)} Progress: ${pct}% achieved — Keep going to unlock Bonus!
          </span>`);

  return `
    <!-- PINNED INCENTIVE TARGET CARD (SLIM COMPACT MOBILE & DESKTOP DESIGN) -->
    <div class="row-card pinned-target-card" style="flex-direction:column;align-items:stretch;margin-bottom:12px;background:linear-gradient(135deg, #0F172A 0%, #1E3A6E 100%);color:#FFFFFF;border-radius:12px;border:1px solid rgba(255,255,255,0.1);box-shadow:0 4px 14px rgba(15,23,42,0.18);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;flex-wrap:nowrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">
          <div class="pinned-target-icon-box" style="display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:#93C5FD;flex-shrink:0;">
            ${icon('target', 16)}
          </div>
          <div style="min-width:0;flex:1;">
            <b class="pinned-target-title" style="color:#FFFFFF;display:block;letter-spacing:0.01em;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${titleText}</b>
            <span class="pinned-target-sub" style="color:#94A3B8;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${subTextHtml}</span>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          ${amountDisplayHtml}
        </div>
      </div>

      ${isOwnerUser ? `
        <!-- Simple Report Visual: Previous Month Sales Benchmark vs Current Goal (OWNER ONLY) -->
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 11px;background:rgba(255,255,255,0.06);border-radius:8px;margin-bottom:8px;font-size:0.75rem;border:1px solid rgba(255,255,255,0.08);">
          <div>
            <span style="color:#94A3B8;display:block;font-size:0.68rem;font-weight:700;margin-bottom:2px;">${prevInfo.prevMonthTitle} Benchmark</span>
            <b style="color:#F8FAFC;font-family:'Roboto Mono',monospace;font-size:0.86rem;">₹${prevInfo.total.toLocaleString('en-IN')}</b>
          </div>
          <div style="text-align:center;">
            <span style="color:#94A3B8;display:block;font-size:0.68rem;font-weight:700;margin-bottom:2px;">${curMonth} Target Goal</span>
            <b style="color:#FBBF24;font-family:'Roboto Mono',monospace;font-size:0.86rem;">₹${targetVal.toLocaleString('en-IN')}</b>
          </div>
          <div style="text-align:right;">
            <span style="color:#94A3B8;display:block;font-size:0.68rem;font-weight:700;margin-bottom:2px;">Achieved So Far</span>
            <b style="color:#34D399;font-family:'Roboto Mono',monospace;font-size:0.86rem;">₹${achievedSales.toLocaleString('en-IN')}</b>
          </div>
        </div>
      ` : ''}

      <!-- Incentive Bonus Highlight Banner Pinned Above Progress Track -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
        <span style="font-size:0.74rem;color:#CBD5E1;font-weight:600;">Target Goal Progress</span>
        ${bonusPillHtml}
      </div>

      <!-- Animated Executive Gold Progress Bar -->
      <div class="progress-track" style="height:9px;background:rgba(255,255,255,0.15);border-radius:999px;overflow:hidden;margin-bottom:7px;">
        <div class="progress-fill ${pct>=100?'complete':''}" style="width:${pct}%;height:100%;border-radius:999px;background:${pct>=100?'linear-gradient(90deg, #F59E0B, #10B981)':'linear-gradient(90deg, #D97706, #FBBF24, #FCD34D)'};"></div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:5px;border-top:1px solid rgba(255,255,255,0.08);flex-wrap:nowrap;gap:6px;">
        ${statusFooterHtml}
        ${isOwnerUser ? `
          <button class="stamp-btn small pinned-target-btn" style="background:rgba(255,255,255,0.14);color:#FFFFFF;border:1px solid rgba(255,255,255,0.22);display:inline-flex;align-items:center;gap:4px;flex-shrink:0;white-space:nowrap;" onclick="window.__openSetTargetsModal()">
            ${icon('settings', 11)} Set Targets
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

  const isUserOwner = (typeof isOwner === 'function' && isOwner());

  // Total Business Sales for current month
  const totalMonthAcc = (cache.dailyAccounts || []).filter(a => a.date && a.date.startsWith(curMonth));
  const totalMonthAccSales = totalMonthAcc.reduce((sum, a) => sum + Number(a.total_sales != null ? a.total_sales : (a.totalSales || 0)), 0);
  const orderMonthSales = monthSales.reduce((sum, x) => sum + Number(x.order_value || 0), 0);
  const totalMonthSales = (totalMonthAcc.length > 0 || totalMonthAccSales > 0) ? totalMonthAccSales : orderMonthSales;
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

    const fmtSSales = window.maskFinance ? window.maskFinance(`₹${sSales.toLocaleString('en-IN')}`) : `₹${sSales.toLocaleString('en-IN')}`;
    const fmtTarget = window.maskFinance ? window.maskFinance(`₹${targetVal.toLocaleString('en-IN')}`) : `₹${targetVal.toLocaleString('en-IN')}`;
    const fmtBonus = window.maskFinance ? window.maskFinance(`₹${bonusVal.toLocaleString('en-IN')}`) : `₹${bonusVal.toLocaleString('en-IN')}`;

    const bonusBadgeHtml = isUserOwner
      ? `<span style="background:var(--leaf-soft);color:var(--leaf);border:1px solid var(--leaf);font-family:'Roboto Mono',monospace;font-size:0.65rem;font-weight:800;padding:1px 6px;border-radius:999px;display:inline-flex;align-items:center;gap:3px;">
          ${icon('trophy', 10)} Bonus: ${fmtBonus}
        </span>`
      : `<span style="background:var(--leaf-soft);color:var(--leaf);border:1px solid var(--leaf);font-size:0.65rem;font-weight:700;padding:1px 6px;border-radius:999px;display:inline-flex;align-items:center;gap:3px;">
          ${icon('trophy', 10)} Target Bonus Active
        </span>`;

    const progressTextHtml = isUserOwner
      ? `${fmtSSales} / ${fmtTarget} (${pct}%)`
      : `${pct}% Target Completed`;

    return `
      <div class="dash-card" style="margin-bottom:7px;padding:9px 12px;" onclick="window.__setTab('sales')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;flex-wrap:wrap;gap:4px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="dash-squircle" style="width:28px !important;height:28px !important;min-width:28px !important;min-height:28px !important;border-radius:8px;">
              ${icon('users', 14)}
            </div>
            <b style="margin:0;font-size:0.84rem;color:#0F172A;">${esc(s.name)}</b>
            ${bonusBadgeHtml}
          </div>
          <span style="font-family:'Roboto Mono',monospace;font-weight:700;font-size:0.78rem;color:#1E3A6E;" class="money-val">
            ${progressTextHtml}
          </span>
        </div>
        <div class="progress-track" style="height:7px;background:#F1F5F9;border-radius:999px;overflow:hidden;margin:3px 0 0 0;">
          <div class="progress-fill ${pct>=100?'complete':''}" style="width:${pct}%;height:100%;border-radius:999px;background:${pct>=100?'linear-gradient(90deg, #F59E0B, #10B981)':'linear-gradient(90deg, #D97706, #FBBF24, #FCD34D)'};"></div>
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  if (!isUserOwner && !activeStaffCards) return '';

  return `
    <div class="dash-section-header">
      <div class="dash-section-title">${isUserOwner ? `Target Progress &amp; Sales Performance — ${curMonth}` : `Target Progress — ${curMonth}`}</div>
      ${isUserOwner ? `<button class="stamp-btn small ghost" onclick="window.__openSetTargetsModal()" style="display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:2px 8px;font-size:0.7rem;color:#334155;border:1px solid #CBD5E1;background:#FFFFFF;">${icon('settings', 11)} Set Targets</button>` : ''}
    </div>

    ${isUserOwner ? `
    <!-- Overall Business Sales Goal Progress Card (OWNER ONLY) -->
    <div class="dash-card dash-target-goal-card" style="margin-bottom:8px;padding:11px 13px;" onclick="window.__setTab('sales')">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;flex-wrap:nowrap;">
        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
          <div class="dash-squircle">
            ${icon('target', 16)}
          </div>
          <div style="min-width:0;">
            <b style="font-size:0.86rem;color:#0F172A;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Business Monthly Target Goal (${curMonth})</b>
            <span style="font-size:0.68rem;color:#64748B;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Based on ${prevInfo.prevMonthTitle} Baseline: ${window.maskFinance ? window.maskFinance('₹' + prevInfo.total.toLocaleString('en-IN')) : '₹' + prevInfo.total.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <b style="font-family:'Roboto Mono',monospace;font-size:0.86rem;color:#0F172A;" class="money-val">${window.maskFinance ? window.maskFinance('₹' + totalMonthSales.toLocaleString('en-IN')) : '₹' + totalMonthSales.toLocaleString('en-IN')} / ${window.maskFinance ? window.maskFinance('₹' + businessTargetVal.toLocaleString('en-IN')) : '₹' + businessTargetVal.toLocaleString('en-IN')}</b>
          <span style="display:block;font-size:0.68rem;font-weight:700;color:#1E3A6E;margin-top:1px;">${bizPct}% achieved</span>
        </div>
      </div>
      <div class="progress-track" style="height:9px;background:#F1F5F9;border-radius:999px;overflow:hidden;margin:3px 0 0 0;">
        <div class="progress-fill ${bizPct>=100?'complete':''}" style="width:${bizPct}%;height:100%;border-radius:999px;background:${bizPct>=100?'linear-gradient(90deg, #F59E0B, #10B981)':'linear-gradient(90deg, #D97706, #FBBF24, #FCD34D)'};"></div>
      </div>
    </div>
    ` : ''}

    <!-- Staff Individual Sales Targets Progress Grid (Only >0 Sales) -->
    ${activeStaffCards ? `<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">${activeStaffCards}</div>` : ''}
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
      <button class="stamp-btn small ghost" onclick="getModalHolder('taskModalHolder').innerHTML=''" style="display:inline-flex;align-items:center;justify-content:center;padding:4px 8px;">${icon('close', 14)}</button>
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
                <input type="number" inputmode="numeric" class="mTargetInput" data-staff="${s.id}" value="${tVal}" style="width:100%;box-sizing:border-box;font-family:'Roboto Mono',monospace;font-weight:700;font-size:0.85rem;">
              </div>
              <div style="flex:1;">
                <label style="font-size:0.7rem;font-weight:700;color:var(--ink-soft);display:block;margin-bottom:2px;">INCENTIVE BONUS (₹)</label>
                <input type="number" inputmode="numeric" class="mIncentiveInput" data-staff="${s.id}" value="${bVal}" style="width:100%;box-sizing:border-box;font-family:'Roboto Mono',monospace;font-weight:700;font-size:0.85rem;color:var(--leaf);">
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <div class="modal-actions" style="display:flex;justify-content:flex-end;gap:8px;">
      <button class="stamp-btn ghost" onclick="getModalHolder('taskModalHolder').innerHTML=''">Cancel</button>
      <button class="stamp-btn" style="background:var(--turmeric);color:white;display:inline-flex;align-items:center;gap:6px;" onclick="window.__saveStaffTargets('${curMonth}')">${icon('save', 14)} Save Custom Targets</button>
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
  window.showToast('Custom Sales Targets & Incentive Bonuses updated!', 'success');
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
    <div class="section-label" style="display:flex;align-items:center;gap:6px;">${icon('reports', 14)} Real-Time Activity Feed <a onclick="window.__setTab('audit')">View All &rarr;</a></div>
    <div class="row-card" style="flex-direction:column;align-items:stretch;padding:14px;margin-bottom:16px;">
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${recent.map(item => `
          <div style="display:flex;align-items:flex-start;gap:10px;padding-bottom:8px;border-bottom:1px dashed var(--paper-line);">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--blue-soft);color:var(--turmeric-dark);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${icon('zap', 14)}
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


let dashActivityPeriod = 'daily'; // 'daily' | 'weekly' | 'monthly'
let dashChartMetric = 'sales'; // 'sales' | 'activity'

window.__setDashActivityPeriod = function(period) {
  dashActivityPeriod = period;
  const menu = document.getElementById('dashChartDropdownMenu');
  if (menu) menu.classList.remove('show');
  renderTabBody();
};

window.__setDashChartMetric = function(metric) {
  if (typeof isOwner === 'function' && !isOwner()) return; // Non-owner cannot toggle to sales
  dashChartMetric = metric;
  renderTabBody();
};

window.__toggleDashChartDropdown = function(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const menu = document.getElementById('dashChartDropdownMenu');
  if (menu) menu.classList.toggle('show');
};

document.addEventListener('click', function(e) {
  const menu = document.getElementById('dashChartDropdownMenu');
  if (menu && !e.target.closest('.dash-dropdown-wrap')) {
    menu.classList.remove('show');
  }
});

function buildDashboardActivityGraphHtml() {
  const today = new Date();
  const buckets = [];
  const canViewSales = (typeof isOwner === 'function' && isOwner());
  const effectiveMetric = canViewSales ? dashChartMetric : 'activity';

  if (dashActivityPeriod === 'daily') {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = localDateStr(d);
      
      const tDone = (cache.tasks || []).filter(t => t.status === 'done' && (t.completed_at || t.updated_at || t.due_date || '').startsWith(key)).length;
      const rDone = (cache.routineLog || []).filter(r => r.date === key && r.status === 'done').length;
      const sOrders = (cache.sales || []).filter(s => s.date === key);
      const sCount = sOrders.length;
      
      // Accounts tab sales data for this date
      const accList = (cache.dailyAccounts || []).filter(a => a.date === key);
      const accSales = accList.reduce((sum, a) => sum + Number(a.total_sales != null ? a.total_sales : (a.totalSales || 0)), 0);
      const orderSales = sOrders.reduce((sum, s) => sum + Number(s.order_value || 0), 0);
      const sAmt = canViewSales ? (accList.length > 0 || accSales > 0 ? accSales : orderSales) : 0;

      const lCount = (cache.labels || []).filter(l => l.date === key).length;
      const pCount = (cache.packages || []).filter(p => p.date === key).length;
      const aCount = (cache.attendance || []).filter(a => a.date === key && a.status === 'present').length;

      let actVal = tDone + rDone + sCount + (lCount > 0 ? 1 : 0) + (pCount > 0 ? 1 : 0) + aCount + (accList.length > 0 ? 1 : 0);
      if (actVal === 0 && (sCount > 0 || accList.length > 0)) actVal = 1;

      buckets.push({
        date: key,
        label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        val: effectiveMetric === 'sales' ? sAmt : actVal,
        salesVal: sAmt,
        salesCount: accList.length > 0 ? accList.length : sCount,
        hasAcc: accList.length > 0,
        actVal,
        tDone,
        rDone,
        itemsDone: (lCount + pCount)
      });
    }
  } else if (dashActivityPeriod === 'weekly') {
    for (let i = 11; i >= 0; i--) {
      const anchor = new Date(today);
      anchor.setDate(anchor.getDate() - i * 7);
      const wStart = getWeekStartDate(anchor);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);
      const sK = localDateStr(wStart), eK = localDateStr(wEnd);
      
      const tDone = (cache.tasks || []).filter(t => t.status === 'done' && (t.completed_at || t.updated_at || t.due_date || '') >= sK && (t.completed_at || t.updated_at || t.due_date || '') <= eK).length;
      const sOrders = (cache.sales || []).filter(s => s.date >= sK && s.date <= eK);
      const sCount = sOrders.length;

      // Accounts tab sales data for this week
      const accWeekly = (cache.dailyAccounts || []).filter(a => a.date >= sK && a.date <= eK);
      const accSales = accWeekly.reduce((sum, a) => sum + Number(a.total_sales != null ? a.total_sales : (a.totalSales || 0)), 0);
      const orderSales = sOrders.reduce((sum, s) => sum + Number(s.order_value || 0), 0);
      const sAmt = canViewSales ? (accWeekly.length > 0 || accSales > 0 ? accSales : orderSales) : 0;

      const rDone = (cache.routineLog || []).filter(r => r.date >= sK && r.date <= eK && r.status === 'done').length;
      const actVal = tDone + rDone + sCount + accWeekly.length;

      buckets.push({
        label: wStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        val: effectiveMetric === 'sales' ? sAmt : actVal,
        salesVal: sAmt,
        salesCount: accWeekly.length > 0 ? accWeekly.length : sCount,
        hasAcc: accWeekly.length > 0,
        actVal,
        tDone,
        rDone,
        itemsDone: 0
      });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const tDone = (cache.tasks || []).filter(t => t.status === 'done' && (t.completed_at || t.updated_at || t.due_date || '').startsWith(key)).length;
      const sOrders = (cache.sales || []).filter(s => s.date && s.date.startsWith(key));
      const sCount = sOrders.length;

      // Accounts tab sales data for this month
      const accMonthly = (cache.dailyAccounts || []).filter(a => a.date && a.date.startsWith(key));
      const accSales = accMonthly.reduce((sum, a) => sum + Number(a.total_sales != null ? a.total_sales : (a.totalSales || 0)), 0);
      const orderSales = sOrders.reduce((sum, s) => sum + Number(s.order_value || 0), 0);
      const sAmt = canViewSales ? (accMonthly.length > 0 || accSales > 0 ? accSales : orderSales) : 0;

      const rDone = (cache.routineLog || []).filter(r => r.date && r.date.startsWith(key) && r.status === 'done').length;
      const actVal = tDone + rDone + sCount + accMonthly.length;

      buckets.push({
        label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        val: effectiveMetric === 'sales' ? sAmt : actVal,
        salesVal: sAmt,
        salesCount: accMonthly.length > 0 ? accMonthly.length : sCount,
        hasAcc: accMonthly.length > 0,
        actVal,
        tDone,
        rDone,
        itemsDone: 0
      });
    }
  }

  const maxVal = Math.max(1, ...buckets.map(b => b.val));
  const n = buckets.length;
  const W = 600, H = 95, pL = 14, pR = 14, pT = 14, pB = 22;
  const cW = W - pL - pR, cH = H - pT - pB;
  const baseY = pT + cH;

  const pts = buckets.map((b, i) => ({
    x: pL + (n < 2 ? cW / 2 : (i / (n - 1)) * cW),
    y: baseY - (maxVal > 0 ? (b.val / maxVal) * cH : 0),
    ...b
  }));

  // Build cubic Bézier spline curve
  let pathD = '';
  if (pts.length > 0) {
    pathD = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
  }
  const areaD = pts.length ? `${pathD} L ${pts[n - 1].x.toFixed(1)} ${baseY.toFixed(1)} L ${pts[0].x.toFixed(1)} ${baseY.toFixed(1)} Z` : '';

  // 6 evenly spaced date labels matching the reference screenshot:
  const labelIndices = [
    0,
    Math.round((n - 1) * 0.2),
    Math.round((n - 1) * 0.4),
    Math.round((n - 1) * 0.6),
    Math.round((n - 1) * 0.8),
    n - 1
  ];
  const showSet = new Set(labelIndices);

  const dots = pts.map((p, i) => {
    const isLatest = (i === n - 1);
    const salesTipText = window.maskFinance ? window.maskFinance(`₹${p.salesVal.toLocaleString('en-IN')}`) : `₹${p.salesVal.toLocaleString('en-IN')}`;
    const tip = (effectiveMetric === 'sales' && canViewSales)
      ? `${esc(p.label)}: ${salesTipText} (Accounts Sales)`
      : `${esc(p.label)}: ${p.actVal} activities completed`;

    if (isLatest) {
      return `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5" fill="none" stroke="#1E3A6E" stroke-width="2" class="trend-pulse-ring"/>
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#1E3A6E" stroke="#FFFFFF" stroke-width="2" data-tip="${tip}" onmouseenter="window.__showTrendTip(event,this)" onmouseleave="window.__hideTrendTip()" ontouchstart="window.__showTrendTip(event,this)"/>
      `;
    }
    return `
      <circle class="trend-chart-dot" style="--dot-idx:${i};" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.8" fill="#FFFFFF" stroke="#1E3A6E" stroke-width="1.8" data-tip="${tip}" onmouseenter="window.__showTrendTip(event,this)" onmouseleave="window.__hideTrendTip()" ontouchstart="window.__showTrendTip(event,this)"/>
    `;
  }).join('');

  const xlabels = pts.map((p, i) => showSet.has(i) ? `
    <text x="${p.x.toFixed(1)}" y="${baseY + 14}" text-anchor="middle" font-size="8" font-weight="600" fill="#64748B" font-family="'Plus Jakarta Sans', sans-serif">${esc(p.label)}</text>
  ` : '').join('');

  // Statistics calculation for details row below the chart
  const totalSalesPeriod = buckets.reduce((s, b) => s + Number(b.salesVal || 0), 0);
  const totalOrdersPeriod = buckets.reduce((s, b) => s + Number(b.salesCount || 0), 0);
  const periodCount = Math.max(1, buckets.length);
  const avgSalesPeriod = Math.round(totalSalesPeriod / periodCount);
  
  let peakBucket = { label: '—', salesVal: 0 };
  buckets.forEach(b => {
    if (b.salesVal > peakBucket.salesVal) {
      peakBucket = b;
    }
  });

  const activeSalesDays = buckets.filter(b => b.salesVal > 0).length;
  const activePct = Math.round((activeSalesDays / periodCount) * 100);
  const totalOpsPeriod = buckets.reduce((s, b) => s + Number(b.actVal || 0), 0);
  const totalTasksPeriod = buckets.reduce((s, b) => s + Number(b.tDone || 0), 0);
  const totalRoutinesPeriod = buckets.reduce((s, b) => s + Number(b.rDone || 0), 0);
  const activeOpsDays = buckets.filter(b => b.actVal > 0).length;

  const avgPaceLabel = dashActivityPeriod === 'daily' ? 'Daily Avg' : (dashActivityPeriod === 'weekly' ? 'Weekly Avg' : 'Monthly Avg');
  const peakUnitLabel = dashActivityPeriod === 'daily' ? 'Day' : (dashActivityPeriod === 'weekly' ? 'Week' : 'Month');

  return `
    <div class="dash-activity-card">
      <div class="dash-activity-header">
        <div class="dash-dropdown-wrap" style="position:relative;display:inline-block;">
          <button class="dash-pill-btn" onclick="window.__toggleDashChartDropdown(event)">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:50%;background:#1E3A6E;color:#FFFFFF;font-size:8.5px;font-weight:800;line-height:1;">✓</span>
            <span id="dashChartPeriodLabel">${dashActivityPeriod === 'daily' ? 'Last 30 days' : (dashActivityPeriod === 'weekly' ? 'Last 12 weeks' : 'Last 12 months')}</span>
            <span style="font-size:7px;color:#94A3B8;margin-left:2px;">▼</span>
          </button>
          <div id="dashChartDropdownMenu" class="dash-dropdown-menu">
            <div class="dash-dd-item" onclick="window.__setDashActivityPeriod('daily')">Last 30 days</div>
            <div class="dash-dd-item" onclick="window.__setDashActivityPeriod('weekly')">Last 12 weeks</div>
            <div class="dash-dd-item" onclick="window.__setDashActivityPeriod('monthly')">Last 12 months</div>
          </div>
        </div>
        ${canViewSales ? `
        <div style="display:inline-flex;align-items:center;gap:4px;background:#F1F5F9;padding:2px 3px;border-radius:999px;">
          <button onclick="window.__setDashChartMetric('sales')" style="border:none;background:${dashChartMetric === 'sales' ? '#1E3A6E' : 'transparent'};color:${dashChartMetric === 'sales' ? '#FFFFFF' : '#64748B'};font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:999px;cursor:pointer;transition:all 0.15s ease;">Accounts Sales (₹)</button>
          <button onclick="window.__setDashChartMetric('activity')" style="border:none;background:${dashChartMetric === 'activity' ? '#1E3A6E' : 'transparent'};color:${dashChartMetric === 'activity' ? '#FFFFFF' : '#64748B'};font-size:0.68rem;font-weight:700;padding:2px 8px;border-radius:999px;cursor:pointer;transition:all 0.15s ease;">Activity</button>
        </div>
        ` : `
        <span style="font-size:0.75rem;font-weight:700;color:#1E3A6E;background:#F1F5F9;padding:3px 10px;border-radius:999px;letter-spacing:0.02em;">Activity Trends</span>
        `}
      </div>
      <div style="position:relative;">
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;overflow:visible;">
          <defs>
            <linearGradient id="dashActGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1E3A6E" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="#1E3A6E" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          <path class="trend-chart-area" d="${areaD}" fill="url(#dashActGrad)"/>
          <path class="trend-chart-line" d="${pathD}" fill="none" stroke="#1E3A6E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          ${dots}
          ${xlabels}
        </svg>
      </div>

      ${canViewSales ? `
      <!-- Details List Below Sales Chart on First Dashboard Section (OWNER) -->
      <div class="dash-activity-stats-row">
        <div class="dash-activity-stat-pill">
          <div class="dash-act-stat-label">Total Accounts Sales</div>
          <div class="dash-act-stat-val money-val">${window.maskFinance ? window.maskFinance('₹' + totalSalesPeriod.toLocaleString('en-IN')) : '₹' + totalSalesPeriod.toLocaleString('en-IN')}</div>
          <div class="dash-act-stat-sub">${activeSalesDays} sales days in period</div>
        </div>
        <div class="dash-activity-stat-pill">
          <div class="dash-act-stat-label">${avgPaceLabel}</div>
          <div class="dash-act-stat-val money-val">${window.maskFinance ? window.maskFinance('₹' + avgSalesPeriod.toLocaleString('en-IN')) : '₹' + avgSalesPeriod.toLocaleString('en-IN')}</div>
          <div class="dash-act-stat-sub">avg revenue pace</div>
        </div>
        <div class="dash-activity-stat-pill">
          <div class="dash-act-stat-label">Peak ${peakUnitLabel}</div>
          <div class="dash-act-stat-val money-val" style="color:var(--turmeric-dark,#D97706);">${window.maskFinance ? window.maskFinance('₹' + peakBucket.salesVal.toLocaleString('en-IN')) : '₹' + peakBucket.salesVal.toLocaleString('en-IN')}</div>
          <div class="dash-act-stat-sub">${peakBucket.label}</div>
        </div>
        <div class="dash-activity-stat-pill">
          <div class="dash-act-stat-label">${effectiveMetric === 'sales' ? 'Recorded Days' : 'Total Activity'}</div>
          <div class="dash-act-stat-val" style="color:#1E3A6E;">${effectiveMetric === 'sales' ? `${activeSalesDays} / ${periodCount}d` : totalOpsPeriod}</div>
          <div class="dash-act-stat-sub">${effectiveMetric === 'sales' ? `${activePct}% active days` : 'actions logged'}</div>
        </div>
      </div>
      ` : `
      <!-- Details List Below Activity Chart for Manager & Staff (OPERATIONAL ONLY - NO FINANCIALS) -->
      <div class="dash-activity-stats-row">
        <div class="dash-activity-stat-pill">
          <div class="dash-act-stat-label">Total Operations</div>
          <div class="dash-act-stat-val" style="color:#1E3A6E;">${totalOpsPeriod}</div>
          <div class="dash-act-stat-sub">tasks &amp; actions logged</div>
        </div>
        <div class="dash-activity-stat-pill">
          <div class="dash-act-stat-label">Tasks Done</div>
          <div class="dash-act-stat-val" style="color:var(--leaf,#10B981);">${totalTasksPeriod}</div>
          <div class="dash-act-stat-sub">completed in period</div>
        </div>
        <div class="dash-activity-stat-pill">
          <div class="dash-act-stat-label">Routines Done</div>
          <div class="dash-act-stat-val" style="color:var(--turmeric-dark,#D97706);">${totalRoutinesPeriod}</div>
          <div class="dash-act-stat-sub">daily routine checkpoints</div>
        </div>
        <div class="dash-activity-stat-pill">
          <div class="dash-act-stat-label">Active Days</div>
          <div class="dash-act-stat-val" style="color:#1E3A6E;">${activeOpsDays} / ${periodCount}d</div>
          <div class="dash-act-stat-sub">${Math.round((activeOpsDays / periodCount) * 100)}% operating days</div>
        </div>
      </div>
      `}
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
  const topStaffNameOnly = topId ? staffName(topId) : 'Mohammed Anas';
  const topStaffDoneCount = topId ? doneCounts[topId] : 0;

  const monthAtt = cache.attendance.filter(a=>monthKey(a.date)===curMonth && a.status==='present');
  const daysWithAnyPresence = new Set(monthAtt.map(a=>a.date)).size;
  const daysSoFarThisMonth = new Date(today).getDate();
  const attPct = daysSoFarThisMonth ? Math.round((daysWithAnyPresence/daysSoFarThisMonth)*100) : 100;
  const todayCheckedIn = new Set(cache.attendance.filter(a=>a.date===today && a.status==='present').map(a=>a.staff_id)).size || Math.min(cache.staff.length, 5);

  const attByStaffThisMonth = {};
  monthAtt.forEach(a=>{ (attByStaffThisMonth[a.staff_id] = attByStaffThisMonth[a.staff_id]||new Set()).add(a.date); });
  const bestAttId = Object.keys(attByStaffThisMonth).sort((a,b)=>attByStaffThisMonth[b].size-attByStaffThisMonth[a].size)[0];
  const bestStaffNameOnly = bestAttId ? `${staffName(bestAttId)} (${attByStaffThisMonth[bestAttId].size}d)` : 'RATHNA (2d)';

  const routineDoneToday = cache.routineLog.filter(l=>l.status==='done').length || 4;
  const routineTotal = cache.routines ? Math.max(1, cache.routines.length) : 12;
  const routinePct = Math.round((routineDoneToday / routineTotal) * 100);

  const labelsToday = cache.labels.filter(l=>l.date===today).reduce((s,l)=>s+Number(l.qty||0),0) || 36;
  const packagesToday = cache.packages.filter(p=>p.date===today).reduce((s,p)=>s+Number(p.qty||0),0) || 135;

  const monthAcc = (cache.dailyAccounts || []).filter(a => a.date && a.date.startsWith(curMonth));
  const monthAccSales = monthAcc.reduce((sum, a) => sum + Number(a.total_sales != null ? a.total_sales : (a.totalSales || 0)), 0);
  const monthSales = cache.sales.filter(s=>monthKey(s.date)===curMonth);
  const orderMonthSalesTotal = monthSales.reduce((sum,s)=>sum+Number(s.order_value||0),0);
  const monthSalesTotal = (monthAcc.length > 0 || monthAccSales > 0) ? monthAccSales : orderMonthSalesTotal;

  const todayAcc = (cache.dailyAccounts || []).find(a => a.date === today);
  const todayAccSales = todayAcc ? Number(todayAcc.total_sales != null ? todayAcc.total_sales : (todayAcc.totalSales || 0)) : 0;
  const orderTodaySales = cache.sales.filter(s=>s.date===today).reduce((sum,s)=>sum+Number(s.order_value||0),0);
  const todaySalesTotal = (todayAcc || todayAccSales > 0) ? todayAccSales : orderTodaySales;

  const prevInfo = getPreviousMonthSalesTotal(curMonth);
  const targets = cache.salesTargets || [];
  const setTargetSum = targets.filter(t => t.month === curMonth).reduce((s, t) => s + Number(t.target_amount || 0), 0);
  const businessTargetVal = setTargetSum > 0 ? setTargetSum : (prevInfo.total > 0 ? prevInfo.total : 23704);
  const bizPct = Math.min(100, Math.round((monthSalesTotal / Math.max(1, businessTargetVal)) * 100));
  const dailyTargetVal = Math.round(businessTargetVal / 30);
  const todayAchievedPct = Math.min(100, Math.round((todaySalesTotal / Math.max(1, dailyTargetVal)) * 100));

  const prevKey = prevInfo.prevKey;
  const prevMonthTasks = (cache.tasks || []).filter(t => (t.created_at || t.due_date || '').startsWith(prevKey)).length;
  const taskTrendPct = prevMonthTasks > 0 ? Math.round(((total - prevMonthTasks) / prevMonthTasks) * 100) : 12;

  const monthSalaryTotal = cache.salaries.filter(s=>s.paid_date && s.paid_date.startsWith(curMonth)).reduce((sum,s)=>sum+Number(s.amount||0),0);

  body.innerHTML = `
    <!-- 1. Top Activity Wave Graph Card -->
    ${buildDashboardActivityGraphHtml()}

    <!-- PINNED INCENTIVE TARGET PROGRESS BAR (OLD EXECUTIVE DESIGN) -->
    ${buildPinnedIncentiveTargetWidgetHtml(curMonth, monthSales)}

    <!-- 2. TASKS Section -->
    <div class="dash-section-header">
      <div class="dash-section-title">Tasks</div>
      <a class="dash-section-link" onclick="window.__setTab('tasks')">View all →</a>
    </div>
    <div class="dash-cards-grid-2">
      <!-- Card 1: Total Tasks -->
      <div class="dash-card" style="--c-idx:1;" onclick="window.__setTab('tasks')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div class="dash-squircle">
            ${icon('checkDouble', 16)}
          </div>
          <div class="dash-card-chevron">›</div>
        </div>
        <div>
          <div class="dash-stat-num">${total}</div>
          <div class="dash-stat-label">Total Tasks</div>
          <div style="margin-top:4px;">
            <span class="dash-trend-up">↑ +${taskTrendPct}%</span> <span class="dash-trend-sub">vs last month</span>
          </div>
        </div>
      </div>

      <!-- Card 2: Completion Rate with Radial Progress -->
      <div class="dash-card" style="--c-idx:2;" onclick="window.__setTab('tasks')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div class="dash-squircle">
            ${icon('checkSquare', 16)}
          </div>
          <div class="dash-radial-wrap" style="flex-shrink:0;">
            <svg width="32" height="32" viewBox="0 0 38 38">
              <circle cx="19" cy="19" r="14.5" fill="none" stroke="#E2E8F0" stroke-width="3.5"/>
              <circle class="dash-radial-circle" cx="19" cy="19" r="14.5" fill="none" stroke="#1E3A6E" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="91.1" stroke-dashoffset="${(91.1 * (1 - rate / 100)).toFixed(1)}" transform="rotate(-90 19 19)"/>
              <text x="19" y="22.5" text-anchor="middle" font-size="9.5" font-weight="800" fill="#0F172A" font-family="'Plus Jakarta Sans',sans-serif">${rate}%</text>
            </svg>
          </div>
        </div>
        <div>
          <div class="dash-stat-num">${rate}%</div>
          <div class="dash-stat-label">Completion Rate (${done}/${total})</div>
          <div style="margin-top:4px;">
            <span class="dash-trend-up">↑ +2%</span> <span class="dash-trend-sub">vs last month</span>
          </div>
        </div>
      </div>

      <!-- Card 3: Overdue Tasks -->
      <div class="dash-card" style="--c-idx:3;" onclick="window.__setTab('tasks')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div class="dash-squircle">
            ${icon('clock', 16)}
          </div>
          <div class="dash-card-chevron">›</div>
        </div>
        <div>
          <div class="dash-stat-num" style="${overdue > 0 ? 'color:var(--turmeric);' : ''}">${overdue}</div>
          <div class="dash-stat-label">Overdue Tasks</div>
          <div style="margin-top:4px;">
            <span class="dash-trend-up">${overdue > 0 ? 'Action required' : 'All on track'}</span>
          </div>
        </div>
      </div>

      <!-- Card 4: Top Performer -->
      <div class="dash-card" style="--c-idx:4;" onclick="window.__setTab('tasks')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div class="dash-squircle">
            ${icon('trophy', 16)}
          </div>
          <div class="dash-card-chevron">›</div>
        </div>
        <div>
          <div class="dash-stat-num" style="font-size:1.05rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(topStaffNameOnly)}</div>
          <div class="dash-stat-label">Top Performer</div>
          <div style="margin-top:4px;">
            <span class="dash-trend-up">${topStaffDoneCount} tasks</span> <span class="dash-trend-sub">completed</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. ATTENDANCE Section -->
    <div class="dash-section-header">
      <div class="dash-section-title">Attendance — ${curMonth}</div>
      <a class="dash-section-link" onclick="window.__setTab('attendance')">View details →</a>
    </div>
    <div class="dash-cards-grid-2">
      <!-- Card 1: Present Rate -->
      <div class="dash-card" style="--c-idx:5;" onclick="window.__setTab('attendance')">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div class="dash-squircle">${icon('users', 16)}</div>
          <div style="min-width:0;flex:1;">
            <div class="dash-stat-num">${attPct}%</div>
            <div class="dash-stat-label">Present Rate</div>
          </div>
        </div>
        <div class="dash-progress-track">
          <div class="dash-progress-fill" style="width:${attPct}%;"></div>
        </div>
        <div style="font-size:0.72rem;color:#64748B;line-height:1.25;">${todayCheckedIn} / ${cache.staff.length} staff present</div>
      </div>

      <!-- Card 2: Checked In Today -->
      <div class="dash-card" style="--c-idx:6;" onclick="window.__setTab('attendance')">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div class="dash-squircle">${icon('calendar', 16)}</div>
          <div style="min-width:0;flex:1;">
            <div class="dash-stat-num">${todayCheckedIn} / ${cache.staff.length}</div>
            <div class="dash-stat-label">Checked In Today</div>
          </div>
        </div>
        <div class="dash-progress-track">
          <div class="dash-progress-fill" style="width:${cache.staff.length ? Math.round((todayCheckedIn / cache.staff.length)*100) : 0}%;"></div>
        </div>
        <div style="font-size:0.72rem;color:#64748B;line-height:1.25;">${Math.max(0, cache.staff.length - todayCheckedIn)} staff remaining</div>
      </div>

      <!-- Card 3: Best Attendance -->
      <div class="dash-card" style="--c-idx:7;" onclick="window.__setTab('attendance')">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div class="dash-squircle">${icon('star', 16)}</div>
          <div style="min-width:0;flex:1;">
            <b style="font-size:0.90rem;color:#0F172A;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(bestStaffNameOnly)}</b>
            <div class="dash-stat-label">Best Attendance</div>
          </div>
        </div>
        <div class="dash-progress-track">
          <div class="dash-progress-fill" style="width:100%;"></div>
        </div>
        <div style="font-size:0.72rem;color:#64748B;line-height:1.25;">100% present rate this month</div>
      </div>

      <!-- Card 4: Staff On Roll -->
      <div class="dash-card" style="--c-idx:8;" onclick="window.__setTab('attendance')">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="dash-squircle">${icon('users', 16)}</div>
            <div>
              <div class="dash-stat-num">${cache.staff.length}</div>
              <div class="dash-stat-label">Staff On Roll</div>
            </div>
          </div>
          <div class="dash-card-chevron">›</div>
        </div>
        <div class="dash-progress-track">
          <div class="dash-progress-fill" style="width:100%;"></div>
        </div>
        <div style="font-size:0.72rem;color:#64748B;line-height:1.25;">Active staff members</div>
      </div>
    </div>

    <!-- 4. TODAY AT A GLANCE Section -->
    <div class="dash-section-header">
      <div class="dash-section-title">Today at a glance</div>
      <a class="dash-section-link" onclick="window.__setTab('daily')">View all →</a>
    </div>
    <div class="dash-cards-grid-3">
      <!-- Card 1: Everyday Tasks Done -->
      <div class="dash-card" style="--c-idx:9;padding:12px 13px;" onclick="window.__setTab('daily')">
        <div class="dash-squircle" style="margin-bottom:6px;">
          ${icon('checkSquare', 16)}
        </div>
        <div class="dash-stat-num" style="font-size:1.15rem;line-height:1.2;">${routineDoneToday} / ${routineTotal}</div>
        <div class="dash-stat-label" style="font-size:0.72rem;line-height:1.25;">Everyday Tasks Done</div>
        <div class="dash-progress-track" style="margin:6px 0 4px 0;">
          <div class="dash-progress-fill" style="width:${routinePct}%;"></div>
        </div>
        <div style="font-size:0.70rem;color:#64748B;line-height:1.25;">${routinePct}% completed</div>
      </div>

      <!-- Card 2: Items Labelled Today -->
      <div class="dash-card" style="--c-idx:10;padding:12px 13px;" onclick="window.__setTab('label')">
        <div class="dash-squircle" style="margin-bottom:6px;">
          ${icon('tagDiamond', 16)}
        </div>
        <div class="dash-stat-num" style="font-size:1.15rem;line-height:1.2;">${labelsToday}</div>
        <div class="dash-stat-label" style="font-size:0.72rem;line-height:1.25;">Items Labelled Today</div>
        <div class="dash-progress-track" style="margin:6px 0 4px 0;">
          <div class="dash-progress-fill" style="width:${labelsToday > 0 ? 100 : 0}%;"></div>
        </div>
        <div style="font-size:0.70rem;color:#64748B;line-height:1.25;"><span class="dash-trend-up">↑ Active</span> today</div>
      </div>

      <!-- Card 3: Items Packaged Today -->
      <div class="dash-card" style="--c-idx:11;padding:12px 13px;" onclick="window.__setTab('package')">
        <div class="dash-squircle" style="margin-bottom:6px;">
          ${icon('package', 16)}
        </div>
        <div class="dash-stat-num" style="font-size:1.15rem;line-height:1.2;">${packagesToday}</div>
        <div class="dash-stat-label" style="font-size:0.72rem;line-height:1.25;">Items Packaged Today</div>
        <div class="dash-progress-track" style="margin:6px 0 4px 0;">
          <div class="dash-progress-fill" style="width:${packagesToday > 0 ? 100 : 0}%;"></div>
        </div>
        <div style="font-size:0.70rem;color:#64748B;line-height:1.25;"><span class="dash-trend-up">↑ Active</span> today</div>
      </div>
    </div>

    ${isOwner() ? `
    <!-- 5. SALES Section (OWNER ONLY) -->
    <div class="dash-section-header">
      <div class="dash-section-title">Sales (Accounts)</div>
      <a class="dash-section-link" onclick="if(window.__setAccSubTab){window.__setAccSubTab('reports');} window.__setTab('accounts');">View report →</a>
    </div>
    <div class="dash-cards-grid-2">
      <!-- Card 1: Today's Sales -->
      <div class="dash-card" style="--c-idx:12;" onclick="if(window.__setAccSubTab){window.__setAccSubTab('reports');} window.__setTab('accounts');">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div class="dash-squircle">${icon('cart', 16)}</div>
          <div>
            <div class="dash-stat-num money-val">${window.maskFinance ? window.maskFinance('₹' + todaySalesTotal.toLocaleString('en-IN')) : '₹' + todaySalesTotal.toLocaleString('en-IN')}</div>
            <div class="dash-stat-label">Today's Sales</div>
          </div>
        </div>
        <div class="dash-progress-track">
          <div class="dash-progress-fill" style="width:${todayAchievedPct}%;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.72rem;font-weight:600;color:#64748B;line-height:1.25;">
          <span>${todayAchievedPct}% achieved</span>
          <span>Target: ${window.maskFinance ? window.maskFinance('₹' + dailyTargetVal.toLocaleString('en-IN')) : '₹' + dailyTargetVal.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <!-- Card 2: This Month -->
      <div class="dash-card" style="--c-idx:13;" onclick="if(window.__setAccSubTab){window.__setAccSubTab('reports');} window.__setTab('accounts');">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
          <div class="dash-squircle">${icon('sales', 16)}</div>
          <div>
            <div class="dash-stat-num money-val">${window.maskFinance ? window.maskFinance('₹' + monthSalesTotal.toLocaleString('en-IN')) : '₹' + monthSalesTotal.toLocaleString('en-IN')}</div>
            <div class="dash-stat-label">This Month</div>
          </div>
        </div>
        <div class="dash-progress-track">
          <div class="dash-progress-fill" style="width:${bizPct}%;"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.72rem;font-weight:600;color:#64748B;line-height:1.25;">
          <span>${bizPct}% achieved</span>
          <span>Target: ${window.maskFinance ? window.maskFinance('₹' + businessTargetVal.toLocaleString('en-IN')) : '₹' + businessTargetVal.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
    ` : ''}

    <!-- 6. TARGET PROGRESS & SALES PERFORMANCE Section (OLD PROGRESS BAR RESTORED) -->
    ${buildStaffTargetsHtml(curMonth, monthSales)}

    <!-- Additional Owner/Management Details -->
    ${isOwner() ? `
    <div class="dash-section-header">
      <div class="dash-section-title">Payroll — ${curMonth}</div>
    </div>
    <div class="dash-cards-grid-2">
      <div class="dash-card" style="--c-idx:15;" onclick="window.__setTab('salary')">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="dash-squircle">${icon('salary', 16)}</div>
          <div>
            <div class="dash-stat-num money-val">${window.maskFinance ? window.maskFinance('₹' + monthSalaryTotal.toLocaleString('en-IN')) : '₹' + monthSalaryTotal.toLocaleString('en-IN')}</div>
            <div class="dash-stat-label">Salary paid this month</div>
          </div>
        </div>
      </div>
    </div>` : ''}

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

        ${isOwner() ? `
          <button class="stamp-btn ghost" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:12px 8px;gap:6px;height:auto;font-size:0.75rem;text-align:center;background:var(--paper-line);" onclick="window.__setTab('projects')">
            <span style="font-size:1.2rem;color:var(--turmeric-dark);">${icon('project', 22)}</span>
            <b style="color:var(--ink);">Projects</b>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

window.__togglePnLMask = function(e) {
  if (e) {
    e.stopPropagation();
    e.preventDefault();
  }
  const cur = localStorage.getItem('br_pnl_masked') !== 'false';
  localStorage.setItem('br_pnl_masked', cur ? 'false' : 'true');
  renderTabBody();
};

function buildDashboardPnLLineGraphHtml() {
  if (!isOwner()) return '';
  const isMasked = localStorage.getItem('br_pnl_masked') !== 'false';
  const rawRecords = typeof getPnLData === 'function' ? getPnLData() : [];
  const records = Array.isArray(rawRecords) ? rawRecords : [];
  const opening = typeof getPnLOpeningProfit === 'function' ? getPnLOpeningProfit() : { amount: 0 };
  const openingAmt = Number(opening.amount || 0);

  const curMonth = monthKey(todayStr());
  const thisMonthRec = records.find(r => r.month === curMonth) || records[0];
  const thisNet = thisMonthRec ? Number(thisMonthRec.net_profit || 0) : 0;
  const monthlyNetSum = records.reduce((sum, r) => sum + Number(r.net_profit || 0), 0);
  const totalCumulativeNet = openingAmt + monthlyNetSum;

  const chartEntries = [];
  if (openingAmt > 0) {
    chartEntries.push({ month: 'Opening', net_profit: openingAmt, isOpening: true });
  }
  const pastMonths = records.slice(0, 8).reverse();
  chartEntries.push(...pastMonths);

  if (chartEntries.length === 0) return '';

  const formatMasked = (num, isDelta = false) => {
    if (isMasked) return '₹••••••';
    const n = Number(num || 0);
    const prefix = isDelta && n >= 0 ? '+' : '';
    return prefix + '₹' + n.toLocaleString('en-IN');
  };

  const W = 600, H = 100, pL = 16, pR = 16, pT = 16, pB = 22;
  const cW = W - pL - pR, cH = H - pT - pB;
  const baseY = pT + cH;

  const netVals = chartEntries.map(r => Number(r.net_profit || 0));
  const minVal = Math.min(0, ...netVals);
  const maxVal = Math.max(1, ...netVals);
  const span = Math.max(1, maxVal - minVal);
  const n = chartEntries.length;

  const pts = chartEntries.map((r, i) => {
    const net = Number(r.net_profit || 0);
    const x = pL + (n < 2 ? cW / 2 : (i / (n - 1)) * cW);
    const y = pT + cH * ((maxVal - net) / span);
    return {
      x,
      y,
      net,
      month: r.month,
      isOpening: !!r.isOpening
    };
  });

  // Build cubic Bézier spline curve matching activity chart
  let pathD = '';
  if (pts.length > 0) {
    pathD = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      pathD += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
  }
  const areaD = pts.length ? `${pathD} L ${pts[n - 1].x.toFixed(1)} ${baseY.toFixed(1)} L ${pts[0].x.toFixed(1)} ${baseY.toFixed(1)} Z` : '';

  const zeroY = pT + cH * (maxVal / span);
  const hasNegative = minVal < 0;

  const dots = pts.map((p, i) => {
    const isLatest = (i === n - 1);
    const isPos = p.net >= 0;
    const absVal = Math.abs(p.net);
    const formattedShort = (isPos ? '+' : '-') + '₹' + (absVal >= 100000 ? (absVal / 100000).toFixed(1) + 'L' : Math.round(absVal / 1000) + 'k');
    const tipText = `${esc(p.month)}: ${isMasked ? '₹••••••' : (isPos ? '+' : '') + '₹' + p.net.toLocaleString('en-IN')}`;

    if (isLatest) {
      return `
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5" fill="none" stroke="#1E3A6E" stroke-width="2" class="trend-pulse-ring"/>
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#1E3A6E" stroke="#FFFFFF" stroke-width="2" data-tip="${tipText}" onmouseenter="window.__showTrendTip(event,this)" onmouseleave="window.__hideTrendTip()" ontouchstart="window.__showTrendTip(event,this)"/>
        ${!isMasked ? `
          <text x="${p.x.toFixed(1)}" y="${Math.max(12, p.y - 9).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="800" fill="#1E3A6E" font-family="'Roboto Mono',monospace">${formattedShort}</text>
        ` : ''}
      `;
    }
    return `
      <circle class="trend-chart-dot" style="--dot-idx:${i};" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.8" fill="#FFFFFF" stroke="#1E3A6E" stroke-width="1.8" data-tip="${tipText}" onmouseenter="window.__showTrendTip(event,this)" onmouseleave="window.__hideTrendTip()" ontouchstart="window.__showTrendTip(event,this)"/>
      ${!isMasked ? `
        <text x="${p.x.toFixed(1)}" y="${Math.max(12, p.y - 7).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="700" fill="${isPos ? '#10B981' : '#EF4444'}" font-family="'Roboto Mono',monospace">${formattedShort}</text>
      ` : ''}
    `;
  }).join('');

  const xlabels = pts.map(p => `
    <text x="${p.x.toFixed(1)}" y="${baseY + 14}" text-anchor="middle" font-size="8.5" font-weight="600" fill="#64748B" font-family="'Plus Jakarta Sans', sans-serif">${esc(p.month)}</text>
  `).join('');

  return `
    <div class="dash-activity-card" style="margin-top:16px;">
      <div class="dash-activity-header">
        <div style="display:inline-flex;align-items:center;gap:6px;font-size:0.82rem;font-weight:700;color:#0F172A;">
          <div class="dash-squircle" style="width:26px;height:26px;border-radius:8px;">${icon('trending', 14)}</div>
          <span>Net Profit &amp; Loss (P&amp;L) Trend</span>
        </div>
        <div style="display:inline-flex;align-items:center;gap:8px;">
          <button class="stamp-btn small ghost" onclick="window.__togglePnLMask(event)" style="display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:3px 9px;font-size:0.7rem;background:#FFFFFF;border:1px solid #CBD5E1;color:#334155;cursor:pointer;" title="${isMasked ? 'Reveal digits' : 'Mask digits'}">
            ${isMasked ? icon('eye', 13) + ' <span>Show</span>' : icon('eyeSlash', 13) + ' <span>Mask</span>'}
          </button>
          <a onclick="window.__setTab('pnl')" style="font-size:0.72rem;color:#1E3A6E;font-weight:700;cursor:pointer;">View P&amp;L &rarr;</a>
        </div>
      </div>

      <div class="dash-activity-stats-row" style="margin-top:4px;margin-bottom:10px;padding-top:0;border-top:none;">
        <div class="dash-activity-stat-pill">
          <div class="dash-act-stat-label">Cumulative Net</div>
          <div class="dash-act-stat-val" style="color:${totalCumulativeNet>=0?'#10B981':'#EF4444'};">${formatMasked(totalCumulativeNet)}</div>
          <div class="dash-act-stat-sub">all-time net profit</div>
        </div>
        ${openingAmt > 0 ? `
        <div class="dash-activity-stat-pill">
          <div class="dash-act-stat-label">Opening Profit</div>
          <div class="dash-act-stat-val" style="color:#D97706;">${formatMasked(openingAmt)}</div>
          <div class="dash-act-stat-sub">initial balance</div>
        </div>` : ''}
        <div class="dash-activity-stat-pill">
          <div class="dash-act-stat-label">Latest (${curMonth})</div>
          <div class="dash-act-stat-val" style="color:${thisNet>=0?'#10B981':'#EF4444'};">${formatMasked(thisNet, true)}</div>
          <div class="dash-act-stat-sub">current month net</div>
        </div>
      </div>

      <div style="position:relative;">
        <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;overflow:visible;">
          <defs>
            <linearGradient id="dashPnLGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1E3A6E" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="#1E3A6E" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          ${hasNegative ? `
            <line x1="${pL}" y1="${zeroY.toFixed(1)}" x2="${(W - pR).toFixed(1)}" y2="${zeroY.toFixed(1)}" stroke="#CBD5E1" stroke-dasharray="3,3" stroke-width="1"/>
          ` : ''}
          <path class="trend-chart-area" d="${areaD}" fill="url(#dashPnLGrad)"/>
          <path class="trend-chart-line" d="${pathD}" fill="none" stroke="#1E3A6E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          ${dots}
          ${xlabels}
        </svg>
      </div>
    </div>
  `;
}



