/* ---------------- SALES ---------------- */
let salesReportMode = 'weekly';
function buildTargetsHtml(){
  const curMonth = localMonthStr(new Date());
  const monthSalesTotal = cache.sales.filter(s=>s.date.startsWith(curMonth)).reduce((sum,s)=>sum+Number(s.order_value||0),0);
  return `
    <div class="section-label">Sales targets — ${curMonth} <a onclick="window.__openTargets()">Set targets</a></div>
    ${getActiveStaff().map(s=>{
      const t = cache.salesTargets.find(x=>x.staff_id===s.id && x.month===curMonth);
      if(!t || !t.target_amount) return '';
      const staffTotal = cache.sales.filter(x=>x.staff_id===s.id && x.date.startsWith(curMonth)).reduce((sum,x)=>sum+Number(x.order_value||0),0);
      const bonusVal = t ? Number(t.incentive_bonus||3000) : 3000;
      const pct = Math.min(100, Math.round((staffTotal/t.target_amount)*100));
      return `<div class="row-card" style="flex-direction:column;align-items:stretch;">
        <div class="row-main">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <h3 style="margin:0;">${esc(s.name)}</h3>
            <span style="background:var(--leaf-soft);color:var(--leaf);border:1px solid var(--leaf);font-family:'Roboto Mono',monospace;font-size:0.68rem;font-weight:800;padding:1px 7px;border-radius:999px;display:inline-flex;align-items:center;gap:4px;box-shadow:0 1px 4px rgba(16,185,129,0.15);">
              ${icon('trophy', 11)} Bonus: ₹${bonusVal.toLocaleString('en-IN')}
            </span>
          </div>
          <div class="kv"><span>₹${staffTotal.toFixed(0)} of ₹${Number(t.target_amount).toFixed(0)}</span><b>${pct}%</b></div>
        </div>
        <div style="background:var(--paper-line);border-radius:6px;height:8px;overflow:hidden;">
          <div style="background:${pct>=100?'var(--turmeric)':'var(--turmeric)'};height:100%;width:${pct}%;transition:width 0.3s ease;"></div>
        </div>
      </div>`;
    }).join('') || `<div class="empty">No targets set for this month yet.</div>`}
    <div id="targetModalHolder"></div>
  `;
}
window.__openTargets = () => {
  const holder = getModalHolder('targetModalHolder');
  const curMonth = localMonthStr(new Date());
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>Set sales targets — ${curMonth}</h2>
    ${cache.staff.map(s=>{
      const t = cache.salesTargets.find(x=>x.staff_id===s.id && x.month===curMonth);
      return `<label>${esc(s.name)}</label><input type="number" step="0.01" id="mTarget_${s.id}" value="${t?t.target_amount:0}">`;
    }).join('')}
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closeTargetModal()">Cancel</button>
      <button class="stamp-btn" onclick="window.__saveTargets()">Save</button>
    </div>
  </div></div>`;
  window.__closeTargetModal = () => { holder.innerHTML=''; };
  window.__saveTargets = async () => {
    await guardedSave('targets', async () => {
      for(const s of cache.staff){
        const val = Number(document.getElementById('mTarget_'+s.id).value || 0);
        await sbCheck(sb.from('sales_targets').upsert({
          business_id: session.businessId, staff_id: s.id, month: curMonth, target_amount: val
        }, { onConflict: 'staff_id,month' }));
      }
      holder.innerHTML='';
      await loadData(); renderTabBody();
    });
  };
}
function renderSalesTab(body){
  const list = isManagerPlus() ? cache.sales : cache.sales.filter(s=>s.staff_id===session.staffId);
  const byDate = {};
  list.forEach(s=>{ (byDate[s.date] = byDate[s.date]||[]).push(s); });
  const dates = Object.keys(byDate).sort((a,b)=>b.localeCompare(a));

  const reportSection = isManagerPlus() ? buildSalesReportHtml() + buildTargetsHtml() : '';

  body.innerHTML = `
    
    ${reportSection}
    <div class="section-label">Orders, day by day</div>
    ${dates.length ? dates.map(d=>{
      const entries = byDate[d];
      const dayTotal = entries.reduce((s,e)=>s+Number(e.order_value||0),0);
      return `<div class="section-label" style="margin-top:14px;"><span>${d}</span><span style="font-family:'Roboto Mono',monospace;">₹${dayTotal.toFixed(0)}</span></div>
      ${entries.map(e=>`
        <div class="row-card" style="align-items:center;">
          <div class="row-main"><h3>${esc(staffName(e.staff_id))}</h3>${e.notes?`<div class="notes">${esc(e.notes)}</div>`:''}</div>
          <b style="font-family:'Roboto Mono',monospace;">₹${Number(e.order_value).toFixed(0)}</b>
          <div class="action-dropdown-holder">
    <button class="action-more-btn" onclick="window.__toggleActionMenu(event, '${e.id}')">More ▾</button>
    <div class="action-dropdown-menu" id="actionMenu_${e.id}">
      ${isManagerPlus() ? `<button onclick="window.__editSale('${e.id}')">✎ Edit</button>` : ''}
      ${isOwner() ? `<button class="danger" onclick="window.__deleteSale('${e.id}')">🗑 Delete</button>` : ''}
    </div>
  </div>
        </div>`).join('')}`;
    }).join('') : `<div class="empty">No orders logged yet. Tap + to add one.</div>`}
    <div id="saleModalHolder"></div>
  `;
  window.__deleteSale = function(id) {
  window.__showDeleteConfirm({
    title: 'Delete this sale entry?',
    message: 'This removes it for everyone on this business. It cannot be undone.',
    onConfirm: async () => {
      showLoading();
      try {
        await sb.from('sales').delete().eq('id', id);
        cache.sales = cache.sales.filter(s => s.id !== id);
      } catch(e){}
      finally {
        hideLoading();
        await loadData();
        renderTabBody();
      }
    }
  });
};
  window.__setSalesMode = (m) => { salesReportMode = m; renderTabBody(); };
}
function getWeekStartDate(d){
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day===0 ? -6 : 1-day; // Monday as week start
  dt.setDate(dt.getDate()+diff);
  return dt;
}
function currentWeekStartStr(){ return localDateStr(getWeekStartDate(new Date())); }
function buildSalesReportHtml(){
  const mode = salesReportMode;
  const today = new Date();
  const buckets = [];
  if(mode === 'weekly'){
    const weeksCount = 8;
    for(let i=weeksCount-1; i>=0; i--){
      const anchor = new Date(today); anchor.setDate(anchor.getDate() - i*7);
      const weekStart = getWeekStartDate(anchor);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6);
      const startKey = localDateStr(weekStart);
      const endKey = localDateStr(weekEnd);
      const total = cache.sales.filter(s=>s.date>=startKey && s.date<=endKey).reduce((sum,s)=>sum+Number(s.order_value||0),0);
      buckets.push({ total, label: weekStart.toLocaleDateString('en-IN',{day:'numeric',month:'short'}) });
    }
  } else {
    const monthsCount = 6;
    for(let i=monthsCount-1; i>=0; i--){
      const d = new Date(today.getFullYear(), today.getMonth()-i, 1);
      const key = localMonthStr(d);
      const total = cache.sales.filter(s=>s.date.startsWith(key)).reduce((sum,s)=>sum+Number(s.order_value||0),0);
      buckets.push({ total, label: d.toLocaleDateString('en-IN',{month:'short',year:'2-digit'}) });
    }
  }
  const max = Math.max(1, ...buckets.map(b=>b.total));
  const periodTotal = buckets.reduce((s,b)=>s+b.total,0);
  const avg = periodTotal / buckets.length;

  const width = 640;
  const height = 180;
  const paddingX = 36;
  const paddingY = 28;

  const points = buckets.map((b, i) => {
    const x = paddingX + (i / Math.max(1, buckets.length - 1)) * (width - paddingX * 2);
    const y = height - paddingY - (b.total / max) * (height - paddingY * 2);
    return { x, y, val: b.total, label: b.label };
  });

  let pathD = '';
  let areaD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cx = (prev.x + curr.x) / 2;
      pathD += ` C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    areaD = pathD + ` L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
  }

  const lineGraphHtml = `
    <div style="position:relative;width:100%;overflow-x:auto;">
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;min-width:320px;overflow:visible;">
        <defs>
          <linearGradient id="salesReportGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1E3A6E" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#1E3A6E" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <line x1="${paddingX}" y1="${paddingY}" x2="${width-paddingX}" y2="${paddingY}" stroke="var(--paper-line)" stroke-dasharray="3,3"/>
        <line x1="${paddingX}" y1="${height/2}" x2="${width-paddingX}" y2="${height/2}" stroke="var(--paper-line)" stroke-dasharray="3,3"/>
        <line x1="${paddingX}" y1="${height-paddingY}" x2="${width-paddingX}" y2="${height-paddingY}" stroke="var(--paper-line)"/>

        ${areaD ? `<path d="${areaD}" fill="url(#salesReportGrad)"/>` : ''}
        ${pathD ? `<path d="${pathD}" fill="none" stroke="#1E3A6E" stroke-width="3" stroke-linecap="round"/>` : ''}

        ${points.map(p => `
          <g>
            <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="var(--paper)" stroke="#1E3A6E" stroke-width="2.5"/>
            <text x="${p.x}" y="${Math.max(14, p.y - 10)}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--turmeric-dark)" font-family="'Roboto Mono',monospace">
              ${p.val > 0 ? '₹' + (p.val >= 1000 ? Math.round(p.val/1000)+'k' : Math.round(p.val)) : ''}
            </text>
            <text x="${p.x}" y="${height - 8}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--ink-soft)" font-family="'Roboto Mono',monospace">
              ${p.label}
            </text>
          </g>
        `).join('')}
      </svg>
    </div>
  `;

  return `
    <div class="section-label">Sales report</div>
    <div class="row-card" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;gap:6px;margin-bottom:14px;">
        <button class="stamp-btn small ${mode==='weekly'?'':'ghost'}" onclick="window.__setSalesMode('weekly')">Weekly</button>
        <button class="stamp-btn small ${mode==='monthly'?'':'ghost'}" onclick="window.__setSalesMode('monthly')">Monthly</button>
      </div>
      ${lineGraphHtml}
      <div class="two-col" style="margin-top:14px;">
        <div class="kv"><span>Total (${mode==='weekly'?'last 8 weeks':'last 6 months'})</span><b>₹${periodTotal.toFixed(0)}</b></div>
        <div class="kv"><span>${mode==='weekly'?'Weekly':'Monthly'} average</span><b>₹${avg.toFixed(0)}</b></div>
      </div>
    </div>
  `;
}
window.__editSale = (saleId) => window.__openSale(saleId);
window.__openSale = (saleId) => {
  const existingSale = saleId ? cache.sales.find(s=>s.id===saleId) : null;
  const holder = getModalHolder('saleModalHolder');
  const staffOptions = isManagerPlus() ? cache.staff : cache.staff.filter(s=>s.id===session.staffId);
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>${existingSale ? "Edit order" : "Log an order"}</h2>
    <label>Salesperson</label>
    <select id="mSaleStaff">${staffOptions.map(s=>`<option value="${s.id}" ${s.id===session.staffId?'selected':''}>${esc(s.name)}</option>`).join('')}</select>
    <label>Date</label>
    <input type="date" id="mSaleDate" value="${existingSale ? existingSale.date : todayStr()}">
    <label>Order value (₹)</label>
    <input type="number" step="0.01" id="mSaleValue" value="${existingSale ? existingSale.order_value : 0}">
    <label>Notes</label>
    <textarea id="mSaleNotes" placeholder="Optional — customer, items, etc.">${existingSale && existingSale.notes ? esc(existingSale.notes) : ""}</textarea>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closeSaleModal()">Cancel</button>
      <button class="stamp-btn" onclick="window.__saveSale()">Save</button>
    </div>
  </div></div>`;
  window.__closeSaleModal = () => { holder.innerHTML=''; };
  window.__saveSale = async () => {
    const value = Number(document.getElementById('mSaleValue').value || 0);
    if(value<=0){ alert('Enter an order value.'); return; }
    await guardedSave('sale', async () => {
      if(existingSale) {
        await sbCheck(sb.from('sales').update({
          staff_id: document.getElementById('mSaleStaff').value,
          date: document.getElementById('mSaleDate').value || todayStr(),
          order_value: value,
          notes: document.getElementById('mSaleNotes').value.trim(),
        }).eq('id', existingSale.id));
      } else {
        await sbCheck(sb.from('sales').insert({
        business_id: session.businessId,
        staff_id: document.getElementById('mSaleStaff').value,
        date: document.getElementById('mSaleDate').value || todayStr(),
        order_value: value,
        notes: document.getElementById('mSaleNotes').value.trim(),
      }));
      }
      holder.innerHTML='';
      await loadData(); renderTabBody();
    });
  };
};

/* ---------------- LABEL (what was labelled each day) ---------------- */
let expandedLabelDates = new Set([todayStr()]);
let labelReportMode = 'weekly';

function buildQtyGraphHtml(items, mode, setModeGlobalName, unitLabel, valueField, prefix, dateField){
  valueField = valueField || 'qty';
  prefix = prefix || '';
  dateField = dateField || 'date';
  unitLabel = unitLabel || '';
  mode = mode || 'weekly';
  const today = new Date();
  const buckets = [];

  if(mode === 'daily'){
    for(let i=6; i>=0; i--){
      const d = new Date(today); d.setDate(d.getDate() - i);
      const key = localDateStr(d);
      const total = items.filter(x=>x[dateField]===key).reduce((s,x)=>s+Number(x[valueField]||0),0);
      buckets.push({ total, label: d.toLocaleDateString('en-IN',{weekday:'short', day:'numeric'}) });
    }
  } else if(mode === 'weekly'){
    for(let i=7; i>=0; i--){
      const anchor = new Date(today); anchor.setDate(anchor.getDate() - i*7);
      const weekStart = getWeekStartDate(anchor);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6);
      const startKey = localDateStr(weekStart), endKey = localDateStr(weekEnd);
      const total = items.filter(x=>x[dateField]>=startKey && x[dateField]<=endKey).reduce((s,x)=>s+Number(x[valueField]||0),0);
      buckets.push({ total, label: weekStart.toLocaleDateString('en-IN',{day:'numeric',month:'short'}) });
    }
  } else {
    for(let i=5; i>=0; i--){
      const d = new Date(today.getFullYear(), today.getMonth()-i, 1);
      const key = localMonthStr(d);
      const total = items.filter(x=>x[dateField] && x[dateField].startsWith(key)).reduce((s,x)=>s+Number(x[valueField]||0),0);
      buckets.push({ total, label: d.toLocaleDateString('en-IN',{month:'short',year:'2-digit'}) });
    }
  }

  const maxVal = Math.max(1, ...buckets.map(b=>b.total));
  const periodTotal = buckets.reduce((s,b)=>s+b.total,0);
  const avg = periodTotal / buckets.length;

  const width = 600;
  const height = 150;
  const paddingX = 40;
  const paddingY = 25;
  const graphW = width - paddingX * 2;
  const graphH = height - paddingY * 2;

  const points = buckets.map((b, i) => {
    const x = paddingX + (i / Math.max(1, buckets.length - 1)) * graphW;
    const y = height - paddingY - (b.total / maxVal) * graphH;
    return { x, y, val: b.total, label: b.label };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for(let i = 0; i < points.length - 1; i++){
    const curr = points[i];
    const next = points[i+1];
    const cpX1 = curr.x + (next.x - curr.x) / 2;
    const cpY1 = curr.y;
    const cpX2 = curr.x + (next.x - curr.x) / 2;
    const cpY2 = next.y;
    pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${next.x} ${next.y}`;
  }

  const areaD = `${pathD} L ${points[points.length-1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;
  const gradId = 'lineGrad_' + Math.random().toString(36).substr(2, 6);

  const svgGraph = `
    <div style="position:relative;width:100%;overflow-x:auto;">
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;display:block;min-width:320px;">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1E3A6E" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="#1E3A6E" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <!-- Horizontal Gridlines -->
        <line x1="${paddingX}" y1="${paddingY}" x2="${width-paddingX}" y2="${paddingY}" stroke="var(--paper-line)" stroke-dasharray="4" stroke-width="1"/>
        <line x1="${paddingX}" y1="${height/2}" x2="${width-paddingX}" y2="${height/2}" stroke="var(--paper-line)" stroke-dasharray="4" stroke-width="1"/>
        <line x1="${paddingX}" y1="${height-paddingY}" x2="${width-paddingX}" y2="${height-paddingY}" stroke="var(--paper-line)" stroke-width="1"/>

        <!-- Gradient Fill -->
        <path class="trend-chart-area" d="${areaD}" fill="url(#${gradId})" />

        <!-- Spline Line -->
        <path class="trend-chart-line" d="${pathD}" fill="none" stroke="var(--turmeric)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>

        <!-- Dots & Data Labels -->
        ${points.map((p, idx)=>`
          <circle class="trend-chart-dot" style="--dot-idx:${idx};" cx="${p.x}" cy="${p.y}" r="5.5" fill="#FFFFFF" stroke="var(--turmeric)" stroke-width="3" />
          <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" font-size="10" font-family="'Roboto Mono', monospace" font-weight="700" fill="var(--ink)">${p.val > 0 ? prefix + Math.round(p.val) : ''}</text>
          <text x="${p.x}" y="${height - 6}" text-anchor="middle" font-size="9" font-family="'Roboto Mono', monospace" fill="var(--ink-soft)">${p.label}</text>
        `).join('')}
      </svg>
    </div>
  `;

  return `
    <div class="section-label">${prefix ? 'Revenue Trend' : 'Activity Trend'}</div>
    <div class="row-card" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="display:flex;gap:6px;">
          <button class="stamp-btn small ${mode==='daily'?'':'ghost'}" onclick="window.${setModeGlobalName}('daily')">Daily</button>
          <button class="stamp-btn small ${mode==='weekly'?'':'ghost'}" onclick="window.${setModeGlobalName}('weekly')">Weekly</button>
          <button class="stamp-btn small ${mode==='monthly'?'':'ghost'}" onclick="window.${setModeGlobalName}('monthly')">Monthly</button>
        </div>
        <div style="font-family:'Roboto Mono',monospace;font-weight:700;font-size:1.1rem;color:var(--turmeric-dark);">
          ${prefix}${periodTotal.toFixed(0)} ${unitLabel}
        </div>
      </div>
      ${svgGraph}
      <div class="two-col" style="margin-top:14px;border-top:1px solid var(--paper-line);padding-top:10px;">
        <div class="kv"><span>Total (${mode})</span><b>${prefix}${periodTotal.toFixed(0)} ${unitLabel}</b></div>
        <div class="kv"><span>Average per ${mode==='daily'?'day':mode==='weekly'?'week':'month'}</span><b>${prefix}${avg.toFixed(prefix?0:1)} ${unitLabel}</b></div>
      </div>
    </div>
  `;
}
window.__setLabelReportMode = (m) => { labelReportMode = m; renderTabBody(); };
function renderLabelTab(body){
  const list = isManagerPlus() ? cache.labels : cache.labels.filter(l=>l.staff_id===session.staffId);
  const byDate = {};
  list.forEach(l=>{ (byDate[l.date] = byDate[l.date]||[]).push(l); });
  const dates = Object.keys(byDate).sort((a,b)=>b.localeCompare(a));
  body.innerHTML = `
    
    ${isManagerPlus() ? buildQtyGraphHtml(cache.labels, labelReportMode, '__setLabelReportMode', 'qty') : ''}
    <div class="section-label">Labelling log, day by day</div>
    ${dates.length ? dates.map(d=>{
      const entries = byDate[d];
      const dayQty = entries.reduce((s,e)=>s+Number(e.qty||0),0);
      const isOpen = expandedLabelDates.has(d);
      return `<div class="row-card collapse-row compact-done-card" style="margin-top:4px !important;" onclick="window.__toggleLabelDate('${d}')">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <span style="font-size:0.8rem;font-weight:700;color:var(--ink);"><span class="collapse-arrow ${isOpen?'open':''}" style="font-size:0.75rem;margin-right:6px;">▸</span>${d}</span>
          <span style="font-family:'Roboto Mono',monospace;font-size:0.72rem;color:var(--ink-soft);">${dayQty} QTY TOTAL, ${entries.length} ITEM(S)</span>
        </div>
      </div>

      ${isOpen ? entries.map(e=>`
        <div class="row-card" style="align-items:center;">
          <div class="row-main">
  <h3>${esc(e.item || '(item not named)')} ${(e.batch_code || e.batch_no) ? `<span class="stamp low" style="font-family:'Roboto Mono',monospace;font-size:0.7rem;padding:2px 6px;">Batch: ${esc(e.batch_code || e.batch_no)}</span>` : ''}</h3>
  <div class="meta"><span>${esc(staffName(e.staff_id))}</span></div>
  ${e.notes?`<div class="notes">${esc(e.notes)}</div>`:''}
</div>
          <b style="font-family:'Roboto Mono',monospace;">${Number(e.qty)} qty</b>
          <div class="action-dropdown-holder">
    <button class="action-more-btn" onclick="window.__toggleActionMenu(event, '${e.id}')">More ▾</button>
    <div class="action-dropdown-menu" id="actionMenu_${e.id}">
      ${isManagerPlus() ? `<button onclick="window.__editLabel('${e.id}')">✎ Edit</button>` : ''}
      ${isOwner() ? `<button class="danger" onclick="window.__deleteLabel('${e.id}')">🗑 Delete</button>` : ''}
    </div>
  </div>
        </div>`).join('') : ''}`;
    }).join('') : `<div class="empty">Nothing logged yet. Tap + to record what was labelled today.</div>`}
    <div id="labelModalHolder"></div>
  `;
  window.__toggleLabelDate = (d) => {
    if(expandedLabelDates.has(d)) expandedLabelDates.delete(d); else expandedLabelDates.add(d);
    renderTabBody();
  };
  window.__deleteLabel = function(id) {
  window.__showDeleteConfirm({
    title: 'Delete label entry?',
    message: 'This removes it for everyone on this business. It cannot be undone.',
    onConfirm: async () => {
      showLoading();
      try {
        await sb.from('labels').delete().eq('id', id);
        cache.labels = cache.labels.filter(l => l.id !== id);
      } catch(e){}
      finally {
        hideLoading();
        await loadData();
        renderTabBody();
      }
    }
  });
};
  window.__editLabel = (id) => openEditLabelModal(id);
}
function openEditLabelModal(labelId){
  const e = cache.labels.find(x => x.id === labelId);
  if(!e) return;
  const holder = getModalHolder('labelModalHolder');
  const staffOptions = isManagerPlus() ? cache.staff : cache.staff.filter(s=>s.id===session.staffId);
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>Edit Label Record</h2>
    <label>Staff</label>
    <select id="mEditLabelStaff">${staffOptions.map(s=>`<option value="${s.id}" ${s.id===e.staff_id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>
    <label>Date</label>
    <input type="date" id="mEditLabelDate" value="${e.date||todayStr()}">
    <label>Item Name</label>
    <input id="mEditLabelItem" value="${esc(e.item||'')}">
    <div class="two-col">
      <div>
        <label>Quantity</label>
        <input type="number" id="mEditLabelQty" value="${e.qty||0}">
      </div>
      <div>
        <label>Batch Code</label>
        <input id="mEditLabelBatchCode" value="${esc(e.batch_code || e.batch_no || '')}" placeholder="e.g. B-1092">
      </div>
    </div>
    <label>Notes</label>
    <textarea id="mEditLabelNotes">${esc(e.notes||'')}</textarea>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closeLabelModal()">Cancel</button>
      <button class="stamp-btn" onclick="window.__saveEditLabel('${labelId}')">Save Changes</button>
    </div>
  </div></div>`;
  window.__closeLabelModal = () => { holder.innerHTML = ''; };
  window.__saveEditLabel = async (id) => {
    const item = document.getElementById('mEditLabelItem').value.trim();
    const qty = Number(document.getElementById('mEditLabelQty').value || 0);
    if(!item || qty <= 0){ alert('Enter item name and quantity.'); return; }
    
    const bCode = document.getElementById('mEditLabelBatchCode') ? document.getElementById('mEditLabelBatchCode').value.trim() : '';
    const staffId = document.getElementById('mEditLabelStaff').value;
    const date = document.getElementById('mEditLabelDate').value || todayStr();
    const notes = document.getElementById('mEditLabelNotes').value.trim();

    // Instant local update
    const target = cache.labels.find(l => l.id === id);
    if (target) {
      target.item = item;
      target.qty = qty;
      target.staff_id = staffId;
      target.date = date;
      target.notes = notes;
      if (bCode) { target.batch_code = bCode; target.batch_no = bCode; }
      try { localStorage.setItem('br_labels_' + session.businessId, JSON.stringify(cache.labels)); } catch(e){}
    }

    holder.innerHTML = '';
    window.showToast('✅ Label entry updated!', 'success');
    renderTabBody();

    if (navigator.onLine && typeof sb !== 'undefined' && !String(id).startsWith('loc_lbl_')) {
      try {
        await sb.from('labels').update({
          staff_id: staffId, date, item, qty,
          batch_code: bCode || null, batch_no: bCode || null, notes
        }).eq('id', id);
      } catch(e){}
    }
  };
}
let labelItemRows = [{item:'', qty:''}];
function renderLabelItemRows(){
  return labelItemRows.map((row, i) => `
    <div class="two-col" style="align-items:flex-end;">
      <div style="flex:2;">
        ${i===0?'<label style="margin-top:0;">Item</label>':''}
        <input placeholder="e.g. Coconut Oil 500ML" value="${esc(row.item)}" oninput="window.__updateLabelRow(${i},'item',this.value)">
      </div>
      <div style="flex:1;">
        ${i===0?'<label style="margin-top:0;">Qty</label>':''}
        <input type="number" step="1" placeholder="Qty" value="${row.qty}" oninput="window.__updateLabelRow(${i},'qty',this.value)">
      </div>
      ${labelItemRows.length>1?`<button class="icon-btn" style="color:var(--turmeric);flex-shrink:0;" onclick="window.__removeLabelRow(${i})">✕</button>`:''}
    </div>
  `).join('');
}
window.__openLabel = () => {
  const holder = getModalHolder('labelModalHolder');
  const staffOptions = isManagerPlus() ? cache.staff : cache.staff.filter(s=>s.id===session.staffId);
  labelItemRows = [{item:'', qty:''}];

  const renderModal = () => {
    holder.innerHTML = `
    <div class="overlay show"><div class="modal">
      <h2>Log labelling</h2>
      <label>Staff</label>
      <select id="mLabelStaff">${staffOptions.map(s=>`<option value="${s.id}" ${s.id===session.staffId?'selected':''}>${esc(s.name)}</option>`).join('')}</select>
      <label>Date</label>
      <input type="date" id="mLabelDate" value="${todayStr()}">
      
      <div id="labelItemRowsWrap" style="margin-top:10px;">${renderLabelItemRows()}</div>
      <div class="modal-actions" style="margin-top:6px;">
        <button class="stamp-btn ghost small" style="flex:none;" onclick="window.__addLabelRow()">+ Add another item row</button>
      </div>

      <label>Batch Code / Batch Number (Optional)</label>
      <input id="mLabelBatchCode" placeholder="e.g. BATCH-2026-08A, B-1092" style="font-family:'Roboto Mono',monospace;font-weight:700;">
      <label>Notes (optional)</label>
      <textarea id="mLabelNotes" placeholder="e.g. jar size, expiry details"></textarea>

      <div class="modal-actions" style="margin-top:20px;flex-wrap:wrap;gap:8px;">
        <button class="stamp-btn ghost" style="flex:1;" onclick="window.__closeLabelModal()">Cancel</button>
        <button class="stamp-btn ghost" style="flex:1.2;background:var(--blue-soft);color:var(--blue);border-color:var(--blue);" onclick="window.__saveLabel(true)">➕ Save &amp; Add More</button>
        <button class="stamp-btn" style="flex:1.2;" onclick="window.__saveLabel(false)">✓ Save &amp; Done</button>
      </div>
    </div></div>`;
  };
  renderModal();

  window.__updateLabelRow = (i, field, val) => { labelItemRows[i][field] = val; };

  window.__addLabelRow = () => {
    labelItemRows.push({item:'', qty:''});
    const wrap = document.getElementById('labelItemRowsWrap');
    if (wrap) wrap.innerHTML = renderLabelItemRows();
  };

  window.__removeLabelRow = (i) => {
    labelItemRows.splice(i,1);
    const wrap = document.getElementById('labelItemRowsWrap');
    if (wrap) wrap.innerHTML = renderLabelItemRows();
  };

  window.__closeLabelModal = () => { holder.innerHTML=''; };

  window.__saveLabel = async (keepOpen = false) => {
    const staffId = document.getElementById('mLabelStaff').value;
    const date = document.getElementById('mLabelDate').value || todayStr();
    const batch_code = document.getElementById('mLabelBatchCode') ? document.getElementById('mLabelBatchCode').value.trim() : '';
    const notes = document.getElementById('mLabelNotes').value.trim();
    const validRows = labelItemRows.filter(r => r.item.trim() && Number(r.qty) > 0);
    if(!validRows.length){ alert('Add at least one item with a name and quantity.'); return; }

    const now = Date.now();
    const records = validRows.map((r, i) => {
      const rec = {
        id: 'loc_lbl_' + now + '_' + i + '_' + Math.random().toString(36).substring(2,5),
        business_id: session.businessId,
        staff_id: staffId,
        date,
        item: r.item.trim(),
        qty: Number(r.qty),
        notes: notes || '',
        created_at: new Date().toISOString()
      };
      if (batch_code) {
        rec.batch_code = batch_code;
        rec.batch_no = batch_code;
      }
      return rec;
    });

    // 1. Instant local state & storage update
    cache.labels = [...records, ...(cache.labels || [])];
    try { localStorage.setItem('br_labels_' + session.businessId, JSON.stringify(cache.labels)); } catch(e){}

    if (keepOpen) {
      // Keep creation modal open for continuous logging
      labelItemRows = [{item:'', qty:''}];
      const wrap = document.getElementById('labelItemRowsWrap');
      if (wrap) wrap.innerHTML = renderLabelItemRows();
      if (document.getElementById('mLabelBatchCode')) document.getElementById('mLabelBatchCode').value = '';
      if (document.getElementById('mLabelNotes')) document.getElementById('mLabelNotes').value = '';
      window.showToast('✅ Saved! Log another item.', 'success');
      renderTabBody();
    } else {
      // Close modal and return to log history page
      holder.innerHTML = '';
      window.showToast('✅ Labeling logged successfully!', 'success');
      renderTabBody();
    }

    // 3. Safe background cloud sync
    if (navigator.onLine && typeof sb !== 'undefined' && session.businessId) {
      try {
        const dbRecords = records.map(r => { const c = {...r}; delete c.id; return c; });
        const { error } = await sb.from('labels').insert(dbRecords);
        if (error) {
          const simpleRecords = dbRecords.map(r => { const c = {...r}; delete c.batch_code; delete c.batch_no; return c; });
          const { error: err2 } = await sb.from('labels').insert(simpleRecords);
          if (err2) queueOfflineMutation('insert', 'labels', dbRecords);
        }
      } catch(e) {
        queueOfflineMutation('insert', 'labels', records);
      }
    } else {
      queueOfflineMutation('insert', 'labels', records);
    }
  };
};



/* ---------------- PACKAGE (same pattern as Label) ---------------- */
let expandedPackageDates = new Set([todayStr()]);
let packageReportMode = 'weekly';
window.__setPackageReportMode = (m) => { packageReportMode = m; renderTabBody(); };
function renderPackageTab(body){
  const list = isManagerPlus() ? cache.packages : cache.packages.filter(l=>l.staff_id===session.staffId);
  const byDate = {};
  list.forEach(l=>{ (byDate[l.date] = byDate[l.date]||[]).push(l); });
  const dates = Object.keys(byDate).sort((a,b)=>b.localeCompare(a));
  body.innerHTML = `
    
    ${isManagerPlus() ? buildQtyGraphHtml(cache.packages, packageReportMode, '__setPackageReportMode', 'qty') : ''}
    <div class="section-label">Packaging log, day by day</div>
    ${dates.length ? dates.map(d=>{
      const entries = byDate[d];
      const dayQty = entries.reduce((s,e)=>s+Number(e.qty||0),0);
      const isOpen = expandedPackageDates.has(d);
      return `<div class="row-card collapse-row compact-done-card" style="margin-top:4px !important;" onclick="window.__togglePackageDate('${d}')">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <span style="font-size:0.8rem;font-weight:700;color:var(--ink);"><span class="collapse-arrow ${isOpen?'open':''}" style="font-size:0.75rem;margin-right:6px;">▸</span>${d}</span>
          <span style="font-family:'Roboto Mono',monospace;font-size:0.72rem;color:var(--ink-soft);">${dayQty} QTY TOTAL, ${entries.length} ITEM(S)</span>
        </div>
      </div>

      ${isOpen ? entries.map(e=>`
        <div class="row-card" style="align-items:center;">
          <div class="row-main">
  <h3>${esc(e.item || '(item not named)')} ${(e.batch_code || e.batch_no) ? `<span class="stamp low" style="font-family:'Roboto Mono',monospace;font-size:0.7rem;padding:2px 6px;">Batch: ${esc(e.batch_code || e.batch_no)}</span>` : ''}</h3>
  <div class="meta"><span>${esc(staffName(e.staff_id))}</span></div>
  ${e.notes?`<div class="notes">${esc(e.notes)}</div>`:''}
</div>
          <b style="font-family:'Roboto Mono',monospace;">${Number(e.qty)} qty</b>
          <div class="action-dropdown-holder">
    <button class="action-more-btn" onclick="window.__toggleActionMenu(event, '${e.id}')">More ▾</button>
    <div class="action-dropdown-menu" id="actionMenu_${e.id}">
      ${isManagerPlus() ? `<button onclick="window.__editPackage('${e.id}')">✎ Edit</button>` : ''}
      ${isOwner() ? `<button class="danger" onclick="window.__deletePackage('${e.id}')">🗑 Delete</button>` : ''}
    </div>
  </div>
        </div>`).join('') : ''}`;
    }).join('') : `<div class="empty">Nothing logged yet. Tap + to record what was packaged today.</div>`}
    <div id="packageModalHolder"></div>
  `;
  window.__togglePackageDate = (d) => {
    if(expandedPackageDates.has(d)) expandedPackageDates.delete(d); else expandedPackageDates.add(d);
    renderTabBody();
  };
  window.__deletePackage = function(id) {
  window.__showDeleteConfirm({
    title: 'Delete package entry?',
    message: 'This removes it for everyone on this business. It cannot be undone.',
    onConfirm: async () => {
      showLoading();
      try {
        await sb.from('packages').delete().eq('id', id);
        cache.packages = cache.packages.filter(p => p.id !== id);
      } catch(e){}
      finally {
        hideLoading();
        await loadData();
        renderTabBody();
      }
    }
  });
};
  window.__editPackage = (id) => openEditPackageModal(id);
}
function openEditPackageModal(packageId){
  const e = cache.packages.find(x => x.id === packageId);
  if(!e) return;
  const holder = getModalHolder('packageModalHolder');
  const staffOptions = isManagerPlus() ? cache.staff : cache.staff.filter(s=>s.id===session.staffId);
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>Edit Package Record</h2>
    <label>Staff</label>
    <select id="mEditPackageStaff">${staffOptions.map(s=>`<option value="${s.id}" ${s.id===e.staff_id?'selected':''}>${esc(s.name)}</option>`).join('')}</select>
    <label>Date</label>
    <input type="date" id="mEditPackageDate" value="${e.date||todayStr()}">
    <label>Item Name</label>
    <input id="mEditPackageItem" value="${esc(e.item||'')}">
    <div class="two-col">
      <div>
        <label>Quantity</label>
        <input type="number" id="mEditPackageQty" value="${e.qty||0}">
      </div>
      <div>
        <label>Batch Code</label>
        <input id="mEditPackageBatchCode" value="${esc(e.batch_code || e.batch_no || '')}" placeholder="e.g. B-1092">
      </div>
    </div>
    <label>Notes</label>
    <textarea id="mEditPackageNotes">${esc(e.notes||'')}</textarea>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closePackageModal()">Cancel</button>
      <button class="stamp-btn" onclick="window.__saveEditPackage('${packageId}')">Save Changes</button>
    </div>
  </div></div>`;
  window.__closePackageModal = () => { holder.innerHTML = ''; };
  window.__saveEditPackage = async (id) => {
    const item = document.getElementById('mEditPackageItem').value.trim();
    const qty = Number(document.getElementById('mEditPackageQty').value || 0);
    if(!item || qty <= 0){ alert('Enter item name and quantity.'); return; }
    
    const bCode = document.getElementById('mEditPackageBatchCode') ? document.getElementById('mEditPackageBatchCode').value.trim() : '';
    const staffId = document.getElementById('mEditPackageStaff').value;
    const date = document.getElementById('mEditPackageDate').value || todayStr();
    const notes = document.getElementById('mEditPackageNotes').value.trim();

    // Instant local update
    const target = cache.packages.find(p => p.id === id);
    if (target) {
      target.item = item;
      target.qty = qty;
      target.staff_id = staffId;
      target.date = date;
      target.notes = notes;
      if (bCode) { target.batch_code = bCode; target.batch_no = bCode; }
      try { localStorage.setItem('br_packages_' + session.businessId, JSON.stringify(cache.packages)); } catch(e){}
    }

    holder.innerHTML = '';
    window.showToast('✅ Package entry updated!', 'success');
    renderTabBody();

    if (navigator.onLine && typeof sb !== 'undefined' && !String(id).startsWith('loc_pkg_')) {
      try {
        await sb.from('packages').update({
          staff_id: staffId, date, item, qty,
          batch_code: bCode || null, batch_no: bCode || null, notes
        }).eq('id', id);
      } catch(e){}
    }
  };
}
let packageItemRows = [{item:'', qty:''}];
function renderPackageItemRows(){
  return packageItemRows.map((row, i) => `
    <div class="two-col" style="align-items:flex-end;">
      <div style="flex:2;">
        ${i===0?'<label style="margin-top:0;">Item</label>':''}
        <input placeholder="e.g. Coconut Oil 500ML" value="${esc(row.item)}" oninput="window.__updatePackageRow(${i},'item',this.value)">
      </div>
      <div style="flex:1;">
        ${i===0?'<label style="margin-top:0;">Qty</label>':''}
        <input type="number" step="1" placeholder="Qty" value="${row.qty}" oninput="window.__updatePackageRow(${i},'qty',this.value)">
      </div>
      ${packageItemRows.length>1?`<button class="icon-btn" style="color:var(--turmeric);flex-shrink:0;" onclick="window.__removePackageRow(${i})">✕</button>`:''}
    </div>
  `).join('');
}
window.__openPackage = () => {
  const holder = getModalHolder('packageModalHolder');
  const staffOptions = isManagerPlus() ? cache.staff : cache.staff.filter(s=>s.id===session.staffId);
  packageItemRows = [{item:'', qty:''}];

  const renderModal = () => {
    holder.innerHTML = `
    <div class="overlay show"><div class="modal">
      <h2>Log packaging</h2>
      <label>Staff</label>
      <select id="mPackageStaff">${staffOptions.map(s=>`<option value="${s.id}" ${s.id===session.staffId?'selected':''}>${esc(s.name)}</option>`).join('')}</select>
      <label>Date</label>
      <input type="date" id="mPackageDate" value="${todayStr()}">
      
      <div id="packageItemRowsWrap" style="margin-top:10px;">${renderPackageItemRows()}</div>
      <div class="modal-actions" style="margin-top:6px;">
        <button class="stamp-btn ghost small" style="flex:none;" onclick="window.__addPackageRow()">+ Add another item row</button>
      </div>

      <label>Batch Code / Batch Number (Optional)</label>
      <input id="mPackageBatchCode" placeholder="e.g. BATCH-2026-08A, B-1092" style="font-family:'Roboto Mono',monospace;font-weight:700;">
      <label>Notes (optional)</label>
      <textarea id="mPackageNotes" placeholder="e.g. carton size, expiry details"></textarea>

      <div class="modal-actions" style="margin-top:20px;flex-wrap:wrap;gap:8px;">
        <button class="stamp-btn ghost" style="flex:1;" onclick="window.__closePackageModal()">Cancel</button>
        <button class="stamp-btn ghost" style="flex:1.2;background:var(--blue-soft);color:var(--blue);border-color:var(--blue);" onclick="window.__savePackage(true)">➕ Save &amp; Add More</button>
        <button class="stamp-btn" style="flex:1.2;" onclick="window.__savePackage(false)">✓ Save &amp; Done</button>
      </div>
    </div></div>`;
  };
  renderModal();

  window.__updatePackageRow = (i, field, val) => { packageItemRows[i][field] = val; };

  window.__addPackageRow = () => {
    packageItemRows.push({item:'', qty:''});
    const wrap = document.getElementById('packageItemRowsWrap');
    if (wrap) wrap.innerHTML = renderPackageItemRows();
  };

  window.__removePackageRow = (i) => {
    packageItemRows.splice(i,1);
    const wrap = document.getElementById('packageItemRowsWrap');
    if (wrap) wrap.innerHTML = renderPackageItemRows();
  };

  window.__closePackageModal = () => { holder.innerHTML=''; };

  window.__savePackage = async (keepOpen = false) => {
    const staffId = document.getElementById('mPackageStaff').value;
    const date = document.getElementById('mPackageDate').value || todayStr();
    const batch_code = document.getElementById('mPackageBatchCode') ? document.getElementById('mPackageBatchCode').value.trim() : '';
    const notes = document.getElementById('mPackageNotes').value.trim();
    const validRows = packageItemRows.filter(r => r.item.trim() && Number(r.qty) > 0);
    if(!validRows.length){ alert('Add at least one item with a name and quantity.'); return; }

    const now = Date.now();
    const records = validRows.map((r, i) => {
      const rec = {
        id: 'loc_pkg_' + now + '_' + i + '_' + Math.random().toString(36).substring(2,5),
        business_id: session.businessId,
        staff_id: staffId,
        date,
        item: r.item.trim(),
        qty: Number(r.qty),
        notes: notes || '',
        created_at: new Date().toISOString()
      };
      if (batch_code) {
        rec.batch_code = batch_code;
        rec.batch_no = batch_code;
      }
      return rec;
    });

    // 1. Instant local state & storage update
    cache.packages = [...records, ...(cache.packages || [])];
    try { localStorage.setItem('br_packages_' + session.businessId, JSON.stringify(cache.packages)); } catch(e){}

    if (keepOpen) {
      // Keep creation modal open for continuous logging
      packageItemRows = [{item:'', qty:''}];
      const wrap = document.getElementById('packageItemRowsWrap');
      if (wrap) wrap.innerHTML = renderPackageItemRows();
      if (document.getElementById('mPackageBatchCode')) document.getElementById('mPackageBatchCode').value = '';
      if (document.getElementById('mPackageNotes')) document.getElementById('mPackageNotes').value = '';
      window.showToast('✅ Saved! Log another item.', 'success');
      renderTabBody();
    } else {
      // Close modal and return to log history page
      holder.innerHTML = '';
      window.showToast('✅ Packaging logged successfully!', 'success');
      renderTabBody();
    }

    // 3. Safe background cloud sync
    if (navigator.onLine && typeof sb !== 'undefined' && session.businessId) {
      try {
        const dbRecords = records.map(r => { const c = {...r}; delete c.id; return c; });
        const { error } = await sb.from('packages').insert(dbRecords);
        if (error) {
          const simpleRecords = dbRecords.map(r => { const c = {...r}; delete c.batch_code; delete c.batch_no; return c; });
          const { error: err2 } = await sb.from('packages').insert(simpleRecords);
          if (err2) queueOfflineMutation('insert', 'packages', dbRecords);
        }
      } catch(e) {
        queueOfflineMutation('insert', 'packages', records);
      }
    } else {
      queueOfflineMutation('insert', 'packages', records);
    }
  };
};



/* ---------------- POINTS (incentive tracking) ---------------- */
function initials(name){ return (name||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase(); }
function rankClass(i){ return i===0?'gold':i===1?'silver':i===2?'bronze':''; }
function leaderboardCardHtml(s, i, points, isMe){
  const medals = ['','',''];
  return `
    <div class="leaderboard-card ${i<3?'top':''} ${isMe?'me':''}">
      <span class="leaderboard-rank">${medals[i]||`#${i+1}`}</span>
      <div class="avatar-circle ${rankClass(i)}">${initials(s.name)}</div>
      <div style="flex:1;min-width:0;">
        <div class="leaderboard-name">${esc(s.name)}${isMe?' <span style="color:var(--turmeric-dark);">(you)</span>':''}</div>
        <div class="leaderboard-meta">${s.role}${s.phone?' · '+esc(s.phone):''}</div>
      </div>
      <div class="leaderboard-points">${points}<span style="font-size:0.62rem;font-weight:600;color:var(--ink-soft);"> pts</span></div>
    </div>`;
}
const TROPHY_TYPES = [
  { key: 'champion', icon: 'trophy', name: 'Champion of the Month' },
  { key: 'shootingstar', icon: 'star', name: 'Shooting Star' },
  { key: 'teamplayer', icon: 'handshake', name: 'Team Player Award' },
];
function trophyCabinetHtml(){
  return `
    <div class="section-label">Trophy cabinet</div>
    <div class="row-card" style="flex-wrap:wrap;gap:14px;justify-content:space-around;">
      ${TROPHY_TYPES.map(t=>{
        const record = cache.trophies.find(x=>x.trophy_key===t.key);
        const holder = record ? cache.staff.find(s=>s.id===record.staff_id) : null;
        return `<div style="text-align:center;flex:1;min-width:100px;">
          <div style="font-size:2.2rem;line-height:1;">${icon(t.icon,36)}</div>
          <div style="font-family:'Roboto Mono',monospace;font-weight:700;font-size:0.78rem;margin:6px 0 2px;">${t.name}</div>
          <div style="font-size:0.78rem;color:var(--ink-soft);">${holder?esc(holder.name):'Not assigned'}</div>
          ${isManagerPlus()?`<button class="icon-btn" style="margin-top:4px;" onclick="window.__assignTrophy('${t.key}')">${holder?'Reassign':'Assign'}</button>`:''}
        </div>`;
      }).join('')}
    </div>
    <div id="trophyModalHolder"></div>
  `;
}
window.__assignTrophy = (trophyKey) => {
  const t = TROPHY_TYPES.find(x=>x.key===trophyKey);
  const holder = document.getElementById('trophyModalHolder');
  const current = cache.trophies.find(x=>x.trophy_key===trophyKey);
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>${icon(t.icon,20)} ${t.name}</h2>
    <label>Give this trophy to</label>
    <select id="mTrophyStaff">
      <option value="">— Not assigned —</option>
      ${cache.staff.map(s=>`<option value="${s.id}" ${current&&current.staff_id===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}
    </select>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closeTrophyModal()">Cancel</button>
      <button class="stamp-btn" onclick="window.__saveTrophy('${trophyKey}')">Save</button>
    </div>
  </div></div>`;
  window.__closeTrophyModal = () => { holder.innerHTML=''; };
  window.__saveTrophy = async () => {
    const staffId = document.getElementById('mTrophyStaff').value;
    await guardedSave('trophy-'+trophyKey, async () => {
      if(!staffId) await sbCheck(sb.from('trophies').delete().eq('business_id', session.businessId).eq('trophy_key', trophyKey));
      else await sbCheck(sb.from('trophies').upsert({
        business_id: session.businessId, trophy_key: trophyKey, staff_id: staffId, awarded_at: new Date().toISOString()
      }, { onConflict: 'business_id,trophy_key' }));
      holder.innerHTML='';
      if(staffId){ celebrateDone(); }
      await loadData(); renderTabBody();
    });
  };
};

let pointsTabMode = 'leaderboard'; // 'leaderboard' | 'targets' | 'history'
window.__setPointsTabMode = (m) => { pointsTabMode = m; renderTabBody(); };

function getStaffLevel(pts){
  if(pts >= 1000) return { level: 5, title: 'Legend', min: 1000, next: 2500, color: 'var(--turmeric-dark)' };
  if(pts >= 500) return { level: 4, title: 'Master Specialist', min: 500, next: 1000, color: '#8B5CF6' };
  if(pts >= 250) return { level: 3, title: 'Pro Performer', min: 250, next: 500, color: '#0F172A' };
  if(pts >= 100) return { level: 2, title: 'Achiever', min: 100, next: 250, color: '#10B981' };
  return { level: 1, title: 'Rookie', min: 0, next: 100, color: '#64748B' };
}

function calcTargetProgress(target, staffId){
  const curMonth = target.month || monthKey(todayStr());
  let currentVal = 0;
  
  if(target.type === 'sales'){
    currentVal = cache.sales.filter(s=>s.staff_id===staffId && monthKey(s.date)===curMonth).reduce((sum,s)=>sum+Number(s.order_value||0),0);
  } else if(target.type === 'tasks'){
    currentVal = cache.tasks.filter(t=>t.assigned_to===staffId && t.status==='done' && monthKey(t.due_date||t.created_at)===curMonth).length;
  } else if(target.type === 'attendance'){
    currentVal = cache.attendance.filter(a=>a.staff_id===staffId && a.status==='present' && monthKey(a.date)===curMonth).length;
  } else if(target.type === 'packaging'){
    currentVal = cache.packages.filter(p=>p.staff_id===staffId && monthKey(p.date)===curMonth).reduce((sum,p)=>sum+Number(p.qty||0),0);
  } else if(target.type === 'labeling'){
    currentVal = cache.labels.filter(l=>l.staff_id===staffId && monthKey(l.date)===curMonth).reduce((sum,l)=>sum+Number(l.qty||0),0);
  } else {
    currentVal = Number(target.current_val || 0);
  }

  const goal = Number(target.target_val || 1);
  const pct = Math.min(100, Math.round((currentVal / goal) * 100));
  const isDone = currentVal >= goal;
  return { currentVal, goal, pct, isDone, type: target.type };
}

window.__openIncentiveTargetModal = (targetId) => {
  const holder = getModalHolder('pointsModalHolder');
  const t = targetId ? cache.incentiveTargets.find(x=>x.id===targetId) : null;
  const staffOptions = cache.staff;
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>${t?'Edit Incentive Target':'+ Create Incentive Target'}</h2>
    <label>Target Title</label>
    <input id="mTargetTitle" value="${t?esc(t.title):''}" placeholder="e.g. July Sales Target, 20 Tasks Target">
    <label>Target Type</label>
    <select id="mTargetType">
      <option value="sales" ${t&&t.type==='sales'?'selected':''}>Sales Amount (₹)</option>
      <option value="tasks" ${t&&t.type==='tasks'?'selected':''}>Tasks Completed (Count)</option>
      <option value="attendance" ${t&&t.type==='attendance'?'selected':''}>Attendance Days Present (Days)</option>
      <option value="packaging" ${t&&t.type==='packaging'?'selected':''}>Packaging Quantity (Qty)</option>
      <option value="labeling" ${t&&t.type==='labeling'?'selected':''}>Labeling Quantity (Qty)</option>
      <option value="custom" ${t&&t.type==='custom'?'selected':''}>Custom Goal</option>
    </select>
    <label>Goal Target Value</label>
    <input type="number" id="mTargetVal" value="${t?t.target_val:50000}" placeholder="e.g. 50000 sales or 20 tasks">
    <label>Reward Points (1 Pt = ₹10 Cash)</label>
    <input type="number" id="mTargetPts" value="${t?t.reward_pts:100}" placeholder="e.g. 100 pts = ₹1,000 Cash">
    <label>Assign Target To</label>
    <select id="mTargetStaff">
      <option value="all" ${!t||t.assigned_to==='all'?'selected':''}>All Staff Members (Whole Team)</option>
      ${staffOptions.map(s=>`<option value="${s.id}" ${t&&t.assigned_to===s.id?'selected':''}>${esc(s.name)}</option>`).join('')}
    </select>
    <label>Target Month</label>
    <input type="month" id="mTargetMonth" value="${t?t.month:monthKey(todayStr())}">
    <label>Notes / Incentive Description</label>
    <textarea id="mTargetNotes" placeholder="Describe the bonus criteria...">${t?esc(t.notes||''):''}</textarea>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closeIncentiveTargetModal()">Cancel</button>
      <button class="stamp-btn" onclick="window.__saveIncentiveTarget('${targetId||''}')">Save Target</button>
    </div>
  </div></div>`;
  window.__closeIncentiveTargetModal = () => { holder.innerHTML=''; };
  window.__saveIncentiveTarget = (id) => {
    const title = document.getElementById('mTargetTitle').value.trim();
    const type = document.getElementById('mTargetType').value;
    const target_val = Number(document.getElementById('mTargetVal').value || 0);
    const reward_pts = Number(document.getElementById('mTargetPts').value || 0);
    const assigned_to = document.getElementById('mTargetStaff').value;
    const month = document.getElementById('mTargetMonth').value || monthKey(todayStr());
    const notes = document.getElementById('mTargetNotes').value.trim();

    if(!title || target_val <= 0 || reward_pts <= 0){
      alert('Please fill in title, target value and reward points.');
      return;
    }

    if(id){
      const idx = cache.incentiveTargets.findIndex(x=>x.id===id);
      if(idx >= 0) cache.incentiveTargets[idx] = { id, title, type, target_val, reward_pts, assigned_to, month, notes };
    } else {
      cache.incentiveTargets.push({
        id: 'target_' + Date.now() + '_' + Math.random().toString(36).substring(2,6),
        title, type, target_val, reward_pts, assigned_to, month, notes
      });
    }
    localStorage.setItem('br_incentive_targets_' + session.businessId, JSON.stringify(cache.incentiveTargets));
    holder.innerHTML='';
    renderTabBody();
  };
};

window.__deleteIncentiveTarget = (id) => {
  if(!confirm('Delete this target?')) return;
  cache.incentiveTargets = cache.incentiveTargets.filter(x=>x.id!==id);
  localStorage.setItem('br_incentive_targets_' + session.businessId, JSON.stringify(cache.incentiveTargets));
  renderTabBody();
};

window.__awardTargetBonus = async (staffId, targetTitle, pts) => {
  if(!confirm(`Award +${pts} pts (₹${pts*10} Cash Bonus) to ${staffName(staffId)} for completing "${targetTitle}"?`)) return;
  await guardedSave('awardTarget-'+staffId, async () => {
    await sbCheck(sb.from('points_log').insert({
      business_id: session.businessId,
      staff_id: staffId,
      points: pts,
      reason: `Target Completed: ${targetTitle}`,
      date: todayStr(),
      awarded_by: session.staffId
    }));
    celebrateDone();
    await loadData();
    renderTabBody();
  });
};

function renderPointsTab(body){
  const totals = {};
  cache.points.forEach(p=>{ totals[p.staff_id] = (totals[p.staff_id]||0) + Number(p.points||0); });
  const ranked = cache.staff.slice().sort((a,b)=>(totals[b.id]||0)-(totals[a.id]||0));
  const INCENTIVE_RATE = 10; // ₹10 per point
  const curMonth = monthKey(todayStr());

  const activeTargets = cache.incentiveTargets.filter(t => !t.month || t.month === curMonth);

  const subNav = `
    <div style="display:flex;gap:8px;margin-bottom:14px;overflow-x:auto;">
      <button class="stamp-btn small ${pointsTabMode==='leaderboard'?'':'ghost'}" onclick="window.__setPointsTabMode('leaderboard')">${icon('trophy',15)} Leaderboard & Levels</button>
      <button class="stamp-btn small ${pointsTabMode==='targets'?'':'ghost'}" onclick="window.__setPointsTabMode('targets')">${icon('star',15)} Incentive Targets (${activeTargets.length})</button>
      <button class="stamp-btn small ${pointsTabMode==='history'?'':'ghost'}" onclick="window.__setPointsTabMode('history')">${icon('clipboard',15)} Award History</button>
    </div>
  `;

  // 1. History Mode
  if(pointsTabMode === 'history'){
    const historyList = isManagerPlus() ? cache.points : cache.points.filter(p=>p.staff_id===session.staffId);
    body.innerHTML = subNav + `
      <div class="section-label">Full Award History</div>
      ${historyList.length ? `<div class="cards-grid">${historyList.map(p=>`
        <div class="row-card">
          <div class="row-main">
            <div class="meta">
              <span style="font-weight:700;color:var(--ink);">${esc(staffName(p.staff_id))}</span>
              <span>${p.date}</span>
            </div>
            ${p.reason?`<div class="notes">${esc(p.reason)}</div>`:''}
            <div style="margin-top:6px;font-size:0.75rem;color:var(--ink-soft);">
              Cash Equivalent: <b style="color:var(--turmeric);">₹${(Number(p.points||0)*INCENTIVE_RATE).toFixed(0)}</b>
            </div>
          </div>
          <b style="font-family:'Roboto Mono',monospace;font-size:1.05rem;color:${p.points<0?'var(--turmeric)':'var(--turmeric)'};">${p.points>0?'+':''}${p.points} pts</b>
          <div class="action-dropdown-holder">
    <button class="action-more-btn" onclick="window.__toggleActionMenu(event, '${p.id}')">More ▾</button>
    <div class="action-dropdown-menu" id="actionMenu_${p.id}">
      ${isOwner() ? `<button class="danger" onclick="window.__deletePoints('${p.id}')">🗑 Delete</button>` : ''}
    </div>
  </div>
        </div>`).join('')}</div>` : `<div class="empty">No points history recorded yet.</div>`}
      <div id="pointsModalHolder"></div>
    `;
    window.__deletePoints = function(id) {
  window.__showDeleteConfirm({
    title: 'Delete points entry?',
    message: 'This removes it for everyone on this business. It cannot be undone.',
    onConfirm: async () => {
      showLoading();
      try {
        await sb.from('points_log').delete().eq('id', id);
        cache.points = cache.points.filter(p => p.id !== id);
      } catch(e){}
      finally {
        hideLoading();
        await loadData();
        renderTabBody();
      }
    }
  });
};
    return;
  }

  // 2. Incentive Targets Mode
  if(pointsTabMode === 'targets'){
    body.innerHTML = subNav + `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <h3 style="margin:0;">Active Incentive Targets</h3>
          <div style="font-size:0.8rem;color:var(--ink-soft);margin-top:2px;">Complete targets to earn bonus points & cash rewards!</div>
        </div>
        ${isOwner() ? `<button class="stamp-btn small" onclick="window.__openIncentiveTargetModal(null)">+ Create Target</button>` : ''}
      </div>

      ${activeTargets.length ? activeTargets.map(t => {
        const assignedStaff = t.assigned_to === 'all' 
          ? (isManagerPlus() ? cache.staff : cache.staff.filter(s=>s.id===session.staffId))
          : cache.staff.filter(s=>s.id===t.assigned_to);

        const typeLabels = { sales:'Sales Target (₹)', tasks:'Task Target', attendance:'Attendance Target', packaging:'Packaging Target', labeling:'Labeling Target', custom:'Custom Target' };

        return `
          <div class="row-card" style="flex-direction:column;align-items:stretch;margin-bottom:14px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div>
                <div style="display:flex;align-items:center;gap:6px;">
                  <h3 style="margin:0;font-size:1.05rem;">${esc(t.title)}</h3>
                  <span class="stamp done" style="font-size:0.65rem;">${typeLabels[t.type]||'Target'}</span>
                </div>
                ${t.notes?`<div class="notes" style="margin-top:4px;">${esc(t.notes)}</div>`:''}
              </div>
              <div style="text-align:right;">
                <span class="stamp present" style="font-size:0.78rem;font-weight:700;">+${t.reward_pts} Pts (₹${t.reward_pts*INCENTIVE_RATE})</span>
                ${isOwner()?`<div style="margin-top:4px;"><button class="icon-btn" onclick="window.__openIncentiveTargetModal('${t.id}')">Edit</button> <button class="icon-btn" style="color:var(--turmeric);" onclick="window.__deleteIncentiveTarget('${t.id}')">Delete</button></div>`:''}
              </div>
            </div>

            <div style="margin-top:12px;padding-top:10px;border-top:1px dashed var(--paper-line);display:flex;flex-direction:column;gap:10px;">
              ${assignedStaff.map(s => {
                const prog = calcTargetProgress(t, s.id);
                return `
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:4px;">
                      <span style="font-weight:600;">${esc(s.name)} ${s.id===session.staffId?'(You)':''}</span>
                      <span style="font-family:'Roboto Mono',monospace;font-weight:700;color:${prog.isDone?'var(--turmeric)':'var(--ink-soft)'};">
                        ${prog.type==='sales'?'₹'+prog.currentVal.toFixed(0):prog.currentVal} / ${prog.type==='sales'?'₹'+prog.goal.toFixed(0):prog.goal} (${prog.pct}%)
                      </span>
                    </div>
                    <div style="width:100%;height:8px;background:var(--paper-line);border-radius:999px;overflow:hidden;">
                      <div style="width:${prog.pct}%;height:100%;background:${prog.isDone?'var(--turmeric)':'var(--turmeric)'};transition:width 0.4s ease;"></div>
                    </div>
                    ${prog.isDone ? `
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                        <span style="color:var(--turmeric);font-size:0.75rem;font-weight:700;">🎉 Target Achieved!</span>
                        ${isOwner() ? `<button class="stamp-btn small" style="background:var(--turmeric);color:#fff;border-color:var(--turmeric);padding:3px 8px;font-size:0.7rem;" onclick="window.__awardTargetBonus('${s.id}', '${esc(t.title)}', ${t.reward_pts})">Award +${t.reward_pts} Pts Bonus</button>` : ''}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('') : `<div class="empty">No active targets. ${isOwner()?'Click "+ Create Target" to set your first incentive goal!':''}</div>`}
      <div id="pointsModalHolder"></div>
    `;
    return;
  }

  // 3. Leaderboard & Levels Mode
  const myPts = totals[session.staffId] || 0;
  const myCash = myPts * INCENTIVE_RATE;
  const myLevel = getStaffLevel(myPts);
  const me = cache.staff.find(s=>s.id===session.staffId);
  const myRank = ranked.findIndex(s=>s.id===session.staffId);
  const levelPct = Math.min(100, Math.round(((myPts - myLevel.min) / (myLevel.next - myLevel.min)) * 100));

  body.innerHTML = subNav + `
    <!-- Gamified Hero Card for Current Staff Member -->
    <div class="row-card" style="flex-direction:column;align-items:stretch;background:linear-gradient(135deg, #1E293B 0%, #0F172A 100%);color:#fff;border:none;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="avatar-circle ${rankClass(myRank)}" style="width:52px;height:52px;font-size:1.2rem;">${initials(me?me.name:session.name)}</div>
          <div>
            <h3 style="margin:0;color:#fff;font-size:1.15rem;">${esc(session.name)}</h3>
            <div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
              <span class="stamp" style="color:${myLevel.color};background:rgba(255,255,255,0.1);border-color:currentColor;">${myLevel.title}</span>
              <span style="font-size:0.75rem;color:rgba(255,255,255,0.7);">Rank #${myRank+1} of ${ranked.length}</span>
            </div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'Roboto Mono',monospace;font-size:1.6rem;font-weight:700;color:var(--blue-soft);">${myPts} <span style="font-size:0.7rem;">pts</span></div>
          <div style="font-size:0.8rem;color:#4ADE80;font-weight:700;margin-top:2px;">Cash Bonus: ₹${myCash.toFixed(0)}</div>
        </div>
      </div>

      <!-- Level Progress Bar -->
      <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.15);">
        <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:rgba(255,255,255,0.8);margin-bottom:4px;">
          <span>Progress to Level ${myLevel.level + 1} (${myLevel.next} pts)</span>
          <span>${levelPct}%</span>
        </div>
        <div style="width:100%;height:10px;background:rgba(255,255,255,0.15);border-radius:999px;overflow:hidden;">
          <div style="width:${levelPct}%;height:100%;background:linear-gradient(90deg, #38BDF8, #4ADE80);transition:width 0.4s ease;"></div>
        </div>
        <div style="font-size:0.72rem;color:rgba(255,255,255,0.6);margin-top:4px;text-align:right;">
          ${myLevel.next - myPts} points remaining to Level Up!
        </div>
      </div>
    </div>

    ${trophyCabinetHtml()}

    <div class="section-label" style="margin-top:18px;">Team Leaderboard & Cash Incentives (₹10 / Pt)</div>
    ${ranked.length ? `<div class="cards-grid">${ranked.map((s,i)=>{
      const pts = totals[s.id]||0;
      const cashVal = pts * INCENTIVE_RATE;
      const lvl = getStaffLevel(pts);
      return `
        <div class="leaderboard-card ${i===0?'top':''} ${s.id===session.staffId?'me':''}">
          <div class="leaderboard-rank">#${i+1}</div>
          <div class="avatar-circle ${rankClass(i)}" style="width:40px;height:40px;">${initials(s.name)}</div>
          <div style="flex:1;">
            <div class="leaderboard-name">${esc(s.name)} <span class="stamp" style="font-size:0.6rem;padding:2px 6px;color:${lvl.color};border-color:currentColor;">${lvl.title}</span></div>
            <div class="leaderboard-meta">Incentive Cash: <b style="color:var(--turmeric);">₹${cashVal.toFixed(0)}</b></div>
          </div>
          <div class="leaderboard-points">${pts} <span style="font-size:0.65rem;color:var(--ink-soft);">pts</span></div>
        </div>
      `;
    }).join('')}</div>` : `<div class="empty">No staff accounts found.</div>`}

    <div id="pointsModalHolder"></div>
  `;
}

window.__openPoints = () => {
  const holder = getModalHolder('pointsModalHolder');
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>Award points</h2>
    <label>Staff member</label>
    <select id="mPointsStaff">${cache.staff.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
    <label>Points (use a negative number to deduct)</label>
    <input type="number" id="mPointsValue" value="10">
    <label>Reason</label>
    <input id="mPointsReason" placeholder="e.g. Great customer feedback, extra shift covered">
    <label>Date</label>
    <input type="date" id="mPointsDate" value="${todayStr()}">
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closePointsModal()">Cancel</button>
      <button class="stamp-btn" onclick="window.__savePoints()">Award</button>
    </div>
  </div></div>`;
  window.__closePointsModal = () => { holder.innerHTML=''; };
  window.__savePoints = async () => {
    const points = Number(document.getElementById('mPointsValue').value || 0);
    if(!points){ alert('Enter a points value.'); return; }
    await guardedSave('points', async () => {
      await sbCheck(sb.from('points_log').insert({
        business_id: session.businessId,
        staff_id: document.getElementById('mPointsStaff').value,
        points,
        reason: document.getElementById('mPointsReason').value.trim(),
        date: document.getElementById('mPointsDate').value || todayStr(),
        awarded_by: session.staffId,
      }));
      holder.innerHTML='';
      await loadData(); renderTabBody();
    });
  };
};

/* ---------------- AI BUSINESS INSIGHTS ---------------- */
let aiAssistantMessages = [
  { sender: 'ai', text: 'Hello! I am your AI Business Assistant. Ask me anything about your sales, cash tally, task completion velocity, or staff performance!' }
];

function renderReportsTab(body){
  if(!reportRange.from) reportRange = reportDefaultRange();
  const { from, to } = reportRange;
  const inRange = (d) => d && d >= from && d <= to;

  // Executive summary figures
  const execSales = cache.sales || [];
  const execAcc = cache.dailyAccounts || [];
  const execBills = cache.vendorBills || [];
  const execTotalSales = execSales.reduce((sum, s) => sum + Number(s.order_value || 0), 0)
    + execAcc.reduce((sum, a) => sum + Number(a.total_sales || 0), 0);
  const execTotalExpenses = execAcc.reduce((sum, a) => sum + Number(a.expenses || 0), 0);
  const execTotalVendorPaid = execBills.filter(b => getBillStatus(b) === 'paid').reduce((sum, b) => sum + getBillAmount(b), 0);
  const execTotalVendorUnpaid = execBills.filter(b => getBillStatus(b) !== 'paid').reduce((sum, b) => sum + getBillBalanceAmount(b), 0);
  const execNetProfit = execTotalSales - execTotalExpenses - execTotalVendorPaid;

  // Attendance analysis
  const attInRange = cache.attendance.filter(a=>inRange(a.date));
  const attRows = cache.staff.map(s=>{
    const mine = attInRange.filter(a=>a.staff_id===s.id);
    const daysPresent = mine.filter(a=>a.status==='present').length;
    const daysAbsent = mine.filter(a=>a.status==='absent').length;
    return { name: s.name, daysPresent, daysAbsent };
  });

  // Task analysis (by due_date in range; tasks with no due date counted separately)
  const tasksInRange = cache.tasks.filter(t=>inRange(t.due_date));
  const taskRows = cache.staff.map(s=>{
    const mine = tasksInRange.filter(t=>t.assigned_to===s.id);
    const done = mine.filter(t=>t.status==='done').length;
    const overdue = mine.filter(t=>isOverdue(t)).length;
    const rate = mine.length ? Math.round((done/mine.length)*100) : 0;
    return { name: s.name, assigned: mine.length, done, overdue, rate };
  });
  const undatedTasks = cache.tasks.filter(t=>!t.due_date).length;

  // Sales analysis
  const salesInRange = cache.sales.filter(s=>inRange(s.date));
  const salesTotal = salesInRange.reduce((sum,s)=>sum+Number(s.order_value||0),0);
  const salesRows = cache.staff.map(s=>{
    const mine = salesInRange.filter(x=>x.staff_id===s.id);
    const total = mine.reduce((sum,x)=>sum+Number(x.order_value||0),0);
    return { name: s.name, orders: mine.length, total };
  }).sort((a,b)=>b.total-a.total);

  // Points analysis
  const pointsInRange = cache.points.filter(p=>inRange(p.date));
  const pointsRows = cache.staff.map(s=>{
    const total = pointsInRange.filter(p=>p.staff_id===s.id).reduce((sum,p)=>sum+Number(p.points||0),0);
    return { name: s.name, total };
  }).sort((a,b)=>b.total-a.total);

  body.innerHTML = `
    ${isOwner() ? `
    <!-- Executive Stat KPI Cards (OWNER ONLY) -->
    <div class="dash-kpi-grid" style="margin-bottom:20px;">
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Total Revenue</div>
        <div class="dash-kpi-val" style="color:var(--leaf);">${maskSalesAmount(execTotalSales)}</div>
        <div class="dash-kpi-sub">Cumulative Sales &amp; Accounts</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Total Expenses</div>
        <div class="dash-kpi-val" style="color:var(--brick);">${maskSalesAmount(execTotalExpenses)}</div>
        <div class="dash-kpi-sub">Operating Costs &amp; Outflow</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Estimated Net Profit</div>
        <div class="dash-kpi-val" style="color:${execNetProfit>=0?'var(--leaf)':'var(--brick)'};">${maskSalesAmount(execNetProfit)}</div>
        <div class="dash-kpi-sub">Sales minus Expenses &amp; Bills</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Vendor Payables</div>
        <div class="dash-kpi-val" style="color:var(--turmeric);">${maskSalesAmount(execTotalVendorUnpaid)}</div>
        <div class="dash-kpi-sub">Unpaid Supplier Bills</div>
      </div>
    </div>

    ${buildSalesTrendChartHtml()}
    ` : ''}

    ${isOwner() ? buildWeeklyEmailReportHtml() : ''}

    <div class="row-card" style="align-items:flex-end;">
      <div style="flex:1;"><label style="margin-top:0;">From</label><input type="date" id="repFrom" value="${from}"></div>
      <div style="flex:1;"><label style="margin-top:0;">To</label><input type="date" id="repTo" value="${to}"></div>
      <button class="stamp-btn small" onclick="window.__applyReportRange()">Apply</button>
    </div>

    <div class="section-label">Attendance — detailed</div>
    ${attRows.length ? attRows.map(r=>`
      <div class="row-card"><div class="row-main"><h3>${esc(r.name)}</h3>
        <div class="kv"><span>Days present</span><b style="color:var(--turmeric)">${r.daysPresent}</b></div>
        <div class="kv"><span>Days absent</span><b style="color:var(--turmeric)">${r.daysAbsent}</b></div>
      </div></div>`).join('') : `<div class="empty">No staff yet.</div>`}

    <div class="section-label">Attendance — day by day</div>
    ${buildAttendanceGridHtml(from, to)}

    <div class="section-label">Tasks — detailed</div>
    ${taskRows.length ? taskRows.map(r=>`
      <div class="row-card"><div class="row-main"><h3>${esc(r.name)}</h3>
        <div class="kv"><span>Assigned (in range)</span><b>${r.assigned}</b></div>
        <div class="kv"><span>Completed</span><b style="color:var(--turmeric)">${r.done}</b></div>
        <div class="kv"><span>Overdue right now</span><b style="color:${r.overdue?'var(--turmeric)':'inherit'}">${r.overdue}</b></div>
        <div class="kv"><span>Completion rate</span><b>${r.rate}%</b></div>
      </div></div>`).join('') : `<div class="empty">No staff yet.</div>`}
    ${undatedTasks ? `<p style="font-size:0.78rem;color:var(--ink-soft);">${undatedTasks} task(s) have no due date, so aren't counted in this range.</p>` : ''}

    <div class="section-label"><span>Sales — detailed</span><span style="font-family:'Roboto Mono',monospace;">₹${salesTotal.toFixed(0)} total</span></div>
    ${salesRows.map(r=>`
      <div class="row-card" style="align-items:center;"><div class="row-main"><h3>${esc(r.name)}</h3><div class="meta"><span>${r.orders} order(s)</span></div></div>
      <b style="font-family:'Roboto Mono',monospace;">₹${r.total.toFixed(0)}</b></div>`).join('')}

    <div class="section-label">Points — detailed</div>
    ${pointsRows.map(r=>`
      <div class="row-card" style="align-items:center;"><div class="row-main"><h3>${esc(r.name)}</h3></div>
      <b style="font-family:'Roboto Mono',monospace;color:var(--turmeric-dark);">${r.total} pts</b></div>`).join('')}

    <div class="modal-actions" style="margin-top:20px;">
      <button class="stamp-btn ghost" onclick="window.__exportReportCsv()">Export this report as CSV</button>
    </div>
  `;
  window.__applyReportRange = () => {
    reportRange = { from: document.getElementById('repFrom').value, to: document.getElementById('repTo').value };
    renderTabBody();
  };
  window.__exportReportCsv = () => {
    const lines = [`Report period,${from},to,${to}`, ''];
    lines.push('Attendance', 'Name,Days Present,Days Absent');
    attRows.forEach(r=>lines.push(`${r.name},${r.daysPresent},${r.daysAbsent}`));
    lines.push('', 'Tasks', 'Name,Assigned,Completed,Overdue,Completion Rate');
    taskRows.forEach(r=>lines.push(`${r.name},${r.assigned},${r.done},${r.overdue},${r.rate}%`));
    lines.push('', 'Sales', 'Name,Orders,Total');
    salesRows.forEach(r=>lines.push(`${r.name},${r.orders},${r.total.toFixed(2)}`));
    lines.push('', 'Points', 'Name,Total');
    pointsRows.forEach(r=>lines.push(`${r.name},${r.total}`));
    const blob = new Blob([lines.join('\n')], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `report-${from}-to-${to}.csv`;
    a.click();
  };
}


function sendReminderSmsToAllStaff(){
  const msg = prompt('Enter reminder message for staff:', 'Reminder from ' + session.businessName + ': Please complete your daily tasks, routines and check-in today!');
  if(!msg) return;
  const staffPhones = cache.staff.map(s=>s.phone).filter(Boolean);
  if(!staffPhones.length){ alert('No staff phone numbers found.'); return; }
  sendSmsTo(staffPhones.join(','), msg);
}
window.__sendStaffReminderSms = sendReminderSmsToAllStaff;

/* ---------------- SALESMAN (location sharing & tracking) ---------------- */
function renderSalesmanTab(body){
  const activeLocations = cache.salesmanLocations.filter(l => l.is_sharing && l.lat != null && l.lng != null);

  // Build Leaflet OpenStreetMap iFrame or Leaflet script map container
  let mapHtml = '';
  if(activeLocations.length > 0) {
    const centerLat = activeLocations[0].lat;
    const centerLng = activeLocations[0].lng;
    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng-0.05}%2C${centerLat-0.05}%2C${centerLng+0.05}%2C${centerLat+0.05}&layer=mapnik&marker=${centerLat}%2C${centerLng}`;
    mapHtml = `
      <div class="row-card" style="flex-direction:column;align-items:stretch;padding:10px;margin-bottom:14px;border:1.5px solid var(--turmeric);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <h3 style="margin:0;font-size:0.95rem;color:var(--turmeric-dark);">🗺 Live Team Location Map (${activeLocations.length} Active)</h3>
          <span class="stamp done">Sharing Live</span>
        </div>
        <iframe width="100%" height="220" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="${mapUrl}" style="border:1px solid var(--paper-line);border-radius:8px;"></iframe>
      </div>
    `;
  }

  const myLoc = cache.salesmanLocations.find(l => l.staff_id === session.staffId);
  const isSharing = myLoc ? Boolean(myLoc.is_sharing) : false;

  const selfSection = `
    <div class="section-label">Your Location Sharing Status</div>
    <div class="row-card" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <div>
          <h3 style="margin:0;">Location Sharing</h3>
          <div style="font-size:0.8rem;color:var(--ink-soft);margin-top:2px;">
            ${isSharing ? '<span style="color:var(--turmeric);font-weight:700;">● Active — sharing location</span>' : '<span style="color:var(--ink-soft);">○ Inactive — not sharing</span>'}
          </div>
        </div>
        <button class="stamp-btn ${isSharing?'ghost':''}" style="${isSharing?'color:var(--turmeric);border-color:var(--turmeric);':''}" onclick="window.__toggleSalesmanSharing(${!isSharing})">
          ${isSharing ? 'Stop Sharing' : 'Start Sharing Location'}
        </button>
      </div>
      ${myLoc && myLoc.lat ? `
        <div style="font-size:0.8rem;color:var(--ink-soft);margin-top:4px;">
          Last recorded position: <a class="link" href="${mapLink(myLoc.lat, myLoc.lng)}" target="_blank">${icon('pin',14)} View on Google Maps ↗</a>
          ${myLoc.updated_at ? ` · ${timeStr(myLoc.updated_at)}` : ''}
        </div>
      ` : ''}
    </div>
  `;

  const activeSalesmen = cache.salesmanLocations.filter(l => l.is_sharing);
  const teamSection = isManagerPlus() ? `
    <div class="section-label">Team Members Sharing Location (${activeSalesmen.length})</div>
    ${cache.staff.map(s => {
      const loc = cache.salesmanLocations.find(l => l.staff_id === s.id);
      const sharing = loc ? Boolean(loc.is_sharing) : false;
      return `
        <div class="row-card" style="align-items:center;">
          <div class="row-main">
            <h3>${esc(s.name)} <span class="role-pill ${s.role}">${s.role}</span></h3>
            <div class="meta">
              <span class="stamp ${sharing?'present':'unmarked'}">${sharing?'Sharing Now':'Offline'}</span>
              ${loc && loc.updated_at ? `<span>${timeStr(loc.updated_at)}</span>` : ''}
            </div>
          </div>
          ${loc && loc.lat != null ? `
            <a class="stamp-btn small ghost" href="${mapLink(loc.lat, loc.lng)}" target="_blank" style="text-decoration:none;">${icon('pin',14)} Maps ↗</a>
          ` : ''}
        </div>
      `;
    }).join('')}
  ` : '';

  body.innerHTML = selfSection + teamSection;

  window.__toggleSalesmanSharing = async (shouldShare) => {
    const key = 'salesmanShare-' + session.staffId;
    if(__busyKeys.has(key)) return;
    __busyKeys.add(key);
    try {
      let loc = null;
      if(shouldShare) {
        loc = await getLocation();
        if(!loc) {
          alert('Location access was denied or unavailable. Please enable Location/GPS access in your browser settings to share your position.');
          return;
        }
      }
      const existing = cache.salesmanLocations.find(l => l.staff_id === session.staffId);
      const payload = {
        business_id: session.businessId,
        staff_id: session.staffId,
        is_sharing: shouldShare,
        // NOTE: the salesman_locations table's columns are "lat"/"lng" (not
        // "last_lat"/"last_lng") — sending the wrong names made every save fail silently.
        lat: loc ? loc.lat : (existing ? existing.lat : null),
        lng: loc ? loc.lng : (existing ? existing.lng : null),
        updated_at: new Date().toISOString()
      };
      // This table's primary key is staff_id (there is no separate "id" column),
      // so upsert on staff_id instead of a broken update-by-id / insert branch.
      const { data: savedRow } = await sb.from('salesman_locations').upsert(payload, { onConflict: 'staff_id' }).select().single();
      if (existing) Object.assign(existing, savedRow || payload);
      else cache.salesmanLocations.push(savedRow || payload);
      await loadData();
      renderTabBody();
    } catch(e) {
      alert('Could not update location sharing status: ' + (e.message || e));
    } finally {
      __busyKeys.delete(key);
    }
  };
}

/* ---------------- STAFF (management tab for owners/managers) ---------------- */
let staffTabFilter = 'all'; // 'all' | 'active' | 'inactive'
let expandedStaffIds = new Set();

function isStaffActive(s) {
  if (!s) return false;
  return s.status !== 'inactive';
}

function getActiveStaff() {
  return (cache.staff || []).filter(s => isStaffActive(s));
}

window.__setStaffTabFilter = function(f) {
  staffTabFilter = f;
  renderTabBody();
};

window.__toggleStaffExpand = function(id) {
  if (expandedStaffIds.has(id)) {
    expandedStaffIds.delete(id);
  } else {
    expandedStaffIds.add(id);
  }
  renderTabBody();
};

window.__toggleAllStaffExpand = function(expandAll) {
  if (expandAll) {
    (cache.staff || []).forEach(s => expandedStaffIds.add(s.id));
  } else {
    expandedStaffIds.clear();
  }
  renderTabBody();
};

window.__toggleStaffStatus = async function(staffId, newStatus) {
  const s = (cache.staff || []).find(x => x.id === staffId);
  if (!s) return;
  s.status = newStatus;
  saveCacheLocally();
  if (typeof syncCustomCloudPayload === 'function') {
    syncCustomCloudPayload('[STAFF_DIRECTORY_DATA]', cache.staff);
  }
  logAuditEvent('Staff Status Change', `${newStatus === 'inactive' ? 'Deactivated' : 'Reactivated'} staff member: ${s.name}`);
  if (navigator.onLine && typeof sb !== 'undefined' && sb) {
    try {
      await sb.from('staff').update({ status: newStatus }).eq('id', staffId);
    } catch(e){}
  }
  window.showToast(newStatus === 'inactive' ? `${s.name} set to Inactive` : `${s.name} set to Active`, 'info');
  renderTabBody();
};

function renderStaffTab(body){
  if (!isOwner()) {
    body.innerHTML = `
      <div class="empty" style="padding:40px 20px;text-align:center;">
        <div style="font-size:2.5rem;margin-bottom:12px;">🔒</div>
        <h3>Access Restricted</h3>
        <p style="font-size:0.85rem;color:var(--ink-soft);max-width:360px;margin:0 auto 16px;">
          The Staff Directory & Team Management tab is strictly restricted to Business Owner access only.
        </p>
        <button class="stamp-btn" onclick="window.__setTab('dashboard')">Go to Dashboard</button>
      </div>
    `;
    return;
  }

  const allStaff = cache.staff || [];
  const activeStaff = allStaff.filter(s => isStaffActive(s));
  const inactiveStaff = allStaff.filter(s => !isStaffActive(s));

  const filteredStaff = allStaff.filter(s => {
    if (staffTabFilter === 'active') return isStaffActive(s);
    if (staffTabFilter === 'inactive') return !isStaffActive(s);
    return true;
  });

  body.innerHTML = `
    <!-- Professional Top Control Bar -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
      <!-- Status Filter Tabs -->
      <div style="display:flex;gap:6px;overflow-x:auto;align-items:center;">
        <button class="stamp-btn small ${staffTabFilter==='all'?'':'ghost'}" onclick="window.__setStaffTabFilter('all')">
          All Members (${allStaff.length})
        </button>
        <button class="stamp-btn small ${staffTabFilter==='active'?'':'ghost'}" onclick="window.__setStaffTabFilter('active')">
          Active (${activeStaff.length})
        </button>
        <button class="stamp-btn small ${staffTabFilter==='inactive'?'':'ghost'}" onclick="window.__setStaffTabFilter('inactive')">
          Inactive (${inactiveStaff.length})
        </button>
      </div>

      <!-- Actions & Section-Level Expand/Collapse Controls -->
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        <button class="stamp-btn small ghost" style="font-size:0.75rem;padding:4px 8px;" onclick="window.__toggleAllStaffExpand(true)">
          ⯆ Expand All
        </button>
        <button class="stamp-btn small ghost" style="font-size:0.75rem;padding:4px 8px;" onclick="window.__toggleAllStaffExpand(false)">
          ⯅ Collapse All
        </button>
        ${isManagerPlus() ? `
          <button class="stamp-btn small" onclick="window.__openStaff()" style="display:inline-flex;align-items:center;gap:4px;">
            ${icon('plus', 14)} Add Staff
          </button>
        ` : ''}
      </div>
    </div>

    <!-- Staff Cards Grid with Ultra-Compact Perfectly Aligned Expand/Collapse Layout -->
    <div class="cards-grid" style="grid-template-columns:1fr;gap:4px;">
      ${filteredStaff.length ? filteredStaff.map(s => {
        const isActive = isStaffActive(s);
        const isExpanded = expandedStaffIds.has(s.id);
        const cleanPhone = (s.phone || '').replace(/\D/g, '');

        return `
          <div class="row-card" style="flex-direction:column;align-items:stretch;padding:5px 8px;border-left:3px solid ${isActive?'var(--leaf)':'var(--brick)'};opacity:${isActive?'1.0':'0.85'};margin-bottom:0;border:1px solid var(--paper-line);border-radius:6px;background:var(--paper);">
            <!-- Perfectly Aligned Single Header Row -->
            <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;cursor:pointer;user-select:none;min-height:28px;" onclick="window.__toggleStaffExpand('${s.id}')">
              <!-- Left Info Group -->
              <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1;">
                <span style="font-size:0.68rem;color:var(--turmeric-dark);font-weight:700;flex-shrink:0;width:10px;text-align:center;">
                  ${isExpanded ? '⯅' : '⯆'}
                </span>
                <div class="avatar-circle" style="width:24px;height:24px;font-size:0.7rem;flex-shrink:0;background:${isActive?'var(--leaf-soft)':'var(--brick-soft)'};color:${isActive?'var(--leaf)':'var(--brick)'};font-weight:700;">
                  ${initials(s.name)}
                </div>
                <div style="display:flex;align-items:center;gap:4px;min-width:0;flex:1;overflow:hidden;">
                  <b style="font-size:0.8rem;color:var(--ink);line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(s.name)}</b>
                  <span class="role-pill ${s.role}" style="font-size:0.58rem;padding:0px 4px;height:15px;line-height:15px;flex-shrink:0;">${s.role}</span>
                </div>
              </div>

              <!-- Right Alignment Group (Status + Phone + Mini Toggle Button) -->
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                <span class="stamp ${isActive?'present':'absent'}" style="font-size:0.58rem;padding:1px 5px;">
                  ${isActive ? 'Active' : 'Inactive'}
                </span>
                ${s.phone ? `<span class="desktop-only" style="font-size:0.68rem;color:var(--ink-soft);font-family:'Roboto Mono',monospace;">${esc(s.phone)}</span>` : ''}
                <button class="stamp-btn small ghost" style="padding:1px 6px;font-size:0.65rem;height:22px;line-height:20px;min-width:24px;" onclick="event.stopPropagation(); window.__toggleStaffExpand('${s.id}')">
                  ${isExpanded ? '⯅' : '⯆'}
                </button>
              </div>
            </div>

            <!-- Compact Expanded Details Panel -->
            ${isExpanded ? `
              <div style="margin-top:6px;padding-top:6px;border-top:1px dashed var(--paper-line);display:flex;flex-direction:column;gap:6px;">
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(120px, 1fr));gap:6px;font-size:0.72rem;">
                  <div style="background:var(--paper-soft, #f8fafc);padding:5px 8px;border-radius:4px;border:1px solid var(--paper-line);">
                    <span style="color:var(--ink-soft);display:block;font-size:0.6rem;font-weight:700;text-transform:uppercase;">Phone Contact</span>
                    <b style="color:var(--ink);font-family:'Roboto Mono',monospace;font-size:0.75rem;">${s.phone ? esc(s.phone) : 'Not provided'}</b>
                    ${cleanPhone ? `
                      <div style="display:flex;gap:4px;margin-top:4px;">
                        <a href="tel:${cleanPhone}" class="stamp-btn small ghost" style="padding:1px 4px;font-size:0.62rem;text-decoration:none;">📞 Call</a>
                        <a href="https://wa.me/91${cleanPhone}" target="_blank" class="stamp-btn small" style="background:#25D366;color:#fff;border-color:#25D366;padding:1px 4px;font-size:0.62rem;text-decoration:none;">💬 WhatsApp</a>
                      </div>
                    ` : ''}
                  </div>
                  ${isOwner() ? `
                    <div style="background:var(--paper-soft, #f8fafc);padding:5px 8px;border-radius:4px;border:1px solid var(--paper-line);">
                      <span style="color:var(--ink-soft);display:block;font-size:0.6rem;font-weight:700;text-transform:uppercase;">Login PIN Code</span>
                      <b style="color:var(--turmeric-dark);font-family:'Roboto Mono',monospace;font-size:0.82rem;">${esc(s.pin || '••••')}</b>
                    </div>
                  ` : ''}
                  <div style="background:var(--paper-soft, #f8fafc);padding:5px 8px;border-radius:4px;border:1px solid var(--paper-line);">
                    <span style="color:var(--ink-soft);display:block;font-size:0.6rem;font-weight:700;text-transform:uppercase;">Payout Schedule</span>
                    <b style="color:var(--ink);font-size:0.75rem;">${payScheduleLabel(s)}</b>
                  </div>
                  <div style="background:var(--paper-soft, #f8fafc);padding:5px 8px;border-radius:4px;border:1px solid var(--paper-line);">
                    <span style="color:var(--ink-soft);display:block;font-size:0.6rem;font-weight:700;text-transform:uppercase;">Base Salary</span>
                    <b style="color:var(--leaf);font-family:'Roboto Mono',monospace;font-size:0.75rem;">₹${Number(s.base_salary || 0).toLocaleString('en-IN')}</b>
                  </div>
                </div>

                <!-- Footer Compact Action Pills -->
                <div style="display:flex;justify-content:flex-end;gap:4px;margin-top:2px;flex-wrap:wrap;align-items:center;">
                  ${isManagerPlus() ? `
                    <button class="stamp-btn small ghost" style="padding:1px 6px;font-size:0.65rem;height:22px;display:inline-flex;align-items:center;gap:3px;" onclick="window.__toggleStaffStatus('${s.id}', '${isActive?'inactive':'active'}')">
                      ${isActive ? 'Set Inactive' : 'Set Active'}
                    </button>
                  ` : ''}
                  ${isManagerPlus() ? `
                    <button class="stamp-btn small ghost" style="padding:1px 6px;font-size:0.65rem;height:22px;display:inline-flex;align-items:center;gap:3px;" onclick="window.__editStaff('${s.id}')">
                      ${icon('edit', 10)} Edit Profile
                    </button>
                  ` : ''}
                  ${isOwner() && s.id !== session.staffId ? `
                    <button class="stamp-btn small ghost danger" style="padding:1px 6px;font-size:0.65rem;height:22px;display:inline-flex;align-items:center;gap:3px;color:var(--brick);border-color:var(--brick);" onclick="window.__deleteStaff('${s.id}')">
                      ${icon('trash', 10)} Delete
                    </button>
                  ` : ''}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('') : `
        <div class="empty" style="padding:14px;text-align:center;font-size:0.78rem;">No staff members matching selected filter.</div>
      `}
    </div>
    <div id="staffModalHolder"></div>
  `;

  window.__editStaff = (staffId) => openStaffModal(staffId);
}

function openStaffModal(staffId){
  const s = staffId ? cache.staff.find(x => x.id === staffId) : null;
  const holder = getModalHolder('staffModalHolder');
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>${s ? 'Edit Staff Member' : 'New Staff Member'}</h2>
    <label>Full Name</label>
    <input id="mStaffName" value="${s ? esc(s.name) : ''}" placeholder="e.g. Ramesh Kumar">
    <label>Role</label>
    <select id="mStaffRole">
      <option value="staff" ${s && s.role==='staff'?'selected':''}>Staff</option>
      <option value="sales" ${s && s.role==='sales'?'selected':''}>Sales</option>
      <option value="salesman" ${s && s.role==='salesman'?'selected':''}>Salesman</option>
      <option value="manager" ${s && s.role==='manager'?'selected':''}>Manager</option>
      ${isOwner() ? `<option value="owner" ${s && s.role==='owner'?'selected':''}>Owner</option>` : ''}
    </select>
    <label>Account Status</label>
    <select id="mStaffStatus">
      <option value="active" ${(!s || s.status!=='inactive')?'selected':''}>Active Member</option>
      <option value="inactive" ${(s && s.status==='inactive')?'selected':''}>Inactive / Deactivated</option>
    </select>
    <label>Phone Number (for WhatsApp/SMS Alerts)</label>
    <input id="mStaffPhone" value="${s ? esc(s.phone||'') : ''}" placeholder="e.g. 9876543210">
    <label>PIN Code (4-6 digits)</label>
    <input id="mStaffPin" type="password" inputmode="numeric" value="${s ? esc(s.pin||'') : ''}" placeholder="••••">
    
    <!-- Weekly & Monthly Salary Payout Configuration -->
    <div style="margin-top:14px;padding:12px;background:var(--paper);border-radius:8px;border:1px solid var(--paper-line);">
      <div style="font-weight:700;font-size:0.85rem;color:var(--turmeric-dark);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
        ${icon('salary', 16)} Salary Payout Schedule
      </div>
      <label style="margin-top:0;">Payout Frequency</label>
      <select id="mStaffSalaryFreq" onchange="window.__toggleStaffSalaryFields()">
        <option value="weekly" ${s && s.salary_frequency==='weekly'?'selected':''}>Weekly Payouts</option>
        <option value="monthly" ${(!s || s.salary_frequency==='monthly')?'selected':''}>Monthly Payouts</option>
        <option value="daily" ${s && s.salary_frequency==='daily'?'selected':''}>Daily Payouts</option>
      </select>
      <label>Base Salary Amount (₹)</label>
      <input type="number" id="mStaffBaseSalary" value="${s ? (s.base_salary||'') : ''}" placeholder="e.g. 4500 (Weekly) or 18000 (Monthly)">
      <div id="mStaffDayWrap">
        <label>Payout Day</label>
        <select id="mStaffSalaryDay">
          ${WEEKDAY_NAMES.map((d,i)=>`<option value="${i}" ${s && s.salary_day===i?'selected':''}>Every ${d} (Weekly)</option>`).join('')}
          ${Array.from({length:31},(_,i)=>i+1).map(d=>`<option value="${d}" ${s && s.salary_day===d?'selected':''}>Day ${d} of Month (Monthly)</option>`).join('')}
        </select>
      </div>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closeStaffModal()">Cancel</button>
      <button class="stamp-btn" onclick="window.__saveStaff('${staffId||''}')">Save Staff</button>
    </div>
  </div></div>`;

  window.__closeStaffModal = () => { holder.innerHTML = ''; };
  window.__saveStaff = async (id) => {
    const nameEl = document.getElementById('mStaffName');
    const roleEl = document.getElementById('mStaffRole');
    const statusEl = document.getElementById('mStaffStatus');
    const phoneEl = document.getElementById('mStaffPhone');
    const pinEl = document.getElementById('mStaffPin');
    const freqEl = document.getElementById('mStaffSalaryFreq');
    const dayEl = document.getElementById('mStaffSalaryDay');
    const baseSalaryEl = document.getElementById('mStaffBaseSalary');

    const name = nameEl ? nameEl.value.trim() : '';
    const role = roleEl ? roleEl.value : 'staff';
    const status = statusEl ? statusEl.value : 'active';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const pin = pinEl ? pinEl.value.trim() : '';

    if(!name || !pin){ alert('Enter name and PIN code.'); return; }

    const salary_frequency = freqEl ? freqEl.value : 'monthly';
    const salary_day = Number(dayEl ? dayEl.value : 0);
    const base_salary = Number(baseSalaryEl ? baseSalaryEl.value : 0);

    const staffId = id || ('staff_' + Date.now() + '_' + Math.random().toString(36).substring(2,6));

    const staffObj = {
      id: staffId,
      business_id: session.businessId,
      name,
      role,
      status,
      phone: phone || null,
      pin,
      salary_frequency,
      salary_day,
      base_salary
    };

    // 1. Local Cache Update (0ms instant save, zero white screen delay)
    if(!cache.staff) cache.staff = [];
    const idx = cache.staff.findIndex(s => s.id === staffId);
    if(idx >= 0) {
      cache.staff[idx] = Object.assign({}, cache.staff[idx], staffObj);
    } else {
      cache.staff.push(staffObj);
    }

    // 2. Local Storage Persistence & Custom Cloud Sync
    saveCacheLocally();
    if (typeof syncCustomCloudPayload === 'function') {
      syncCustomCloudPayload('[STAFF_DIRECTORY_DATA]', cache.staff);
    }

    // 3. Logged-in session auto-update if current user profile was edited
    if(session && session.staffId === staffId) {
      session.name = name;
      session.role = role;
      localStorage.setItem('br_session', JSON.stringify(session));
    }

    logAuditEvent('Staff Update', `${id ? 'Updated' : 'Added'} staff member: ${name}`);

    // 4. Close modal and re-render UI instantly
    holder.innerHTML = '';
    renderShell();
    renderTabBody();

    // 5. Background Cloud Upsert with safe fallback (prevents error popups!)
    if (navigator.onLine && typeof sb !== 'undefined' && sb) {
      try {
        const corePayload = {
          id: staffId,
          business_id: session.businessId,
          name,
          role,
          status,
          phone: phone || null,
          pin
        };
        const { error } = await sb.from('staff').upsert(corePayload, { onConflict: 'id' });
        if(error) {
          console.warn('Supabase staff upsert notice:', error.message);
        } else {
          try {
            await sb.from('staff').update({ salary_frequency, salary_day, base_salary }).eq('id', staffId);
          } catch(e2){}
        }
      } catch(err) {
        console.warn('Cloud sync staff warning:', err);
      }
    }

    if (typeof window.showToast === 'function') {
      window.showToast(id ? '✏️ Staff member updated!' : '✅ New staff member added!', 'success');
    }
  };
}
window.__openStaff = () => openStaffModal(null);







/* ---------------- DAILY ACCOUNTS (Owner Only) ---------------- */
let accountsSubTab = 'entry'; // 'entry' | 'history' | 'calendar' | 'reports' | 'backup'
let accReportMode = 'monthly'; // 'weekly' | 'monthly' | 'yearly' | 'all'
let accountsDate = todayStr();
let expandedAccDates = new Set();
let accCalMonth = localMonthStr(new Date());

const ACC_FIELDS = [
  { key: "total_sales", label: "Total Sales", hint: "Everything sold that day" },
  { key: "amount", label: "Amount", hint: "Cash in hand" },
  { key: "vendors", label: "Vendors", hint: "Amount paid to vendors" },
  { key: "credit", label: "Credit", hint: "Value of goods customers bought on credit today" },
  { key: "credit_received", label: "Credit Received", hint: "Old/outstanding credit collected today" },
  { key: "gpay", label: "GPay", hint: "Cash received at bank account (Google Pay)" },
  { key: "ba_credit", label: "B.A Credit", hint: "Total credit bills for the day from supplier/agency" },
  { key: "expenses", label: "Expenses", hint: "Daily shop operational expenses" },
  { key: "personal_ac", label: "A/C", hint: "Cash received at personal account" },
  { key: "salary_paid", label: "Salary", hint: "Cash salary paid out" },
  { key: "adjustment", label: "Adjustment", hint: "Other additions / subtractions" },
];

function calcAccTotals(data) {
  const f = data || {};
  const totalSales = Number(f.total_sales || 0);
  const total = Number(f.amount || 0) + Number(f.vendors || 0) + Number(f.credit || 0) - Number(f.credit_received || 0) + Number(f.gpay || 0) + Number(f.ba_credit || 0) + Number(f.expenses || 0) + Number(f.personal_ac || 0) + Number(f.salary_paid || 0) + Number(f.adjustment || 0);
  const excess = total > totalSales ? total - totalSales : 0;
  const less = totalSales > total ? totalSales - total : 0;
  return { totalSales, total, excess, less };
}


function isAccRecordChecked(rec) {
  if (!rec) return false;
  const checkedSet = getAccCheckedSet();
  const hasMarker = Boolean(rec.notes && String(rec.notes).includes('[CHECKED]'));
  return Boolean(rec.is_checked || hasMarker || checkedSet.has(rec.date) || (rec.id && checkedSet.has(rec.id)));
}

function getAccCheckedSet(){
  try {
    return new Set(JSON.parse(localStorage.getItem('br_acc_checked_' + session.businessId) || '[]'));
  } catch(e){ return new Set(); }
}

function saveAccCheckedSet(set){
  localStorage.setItem('br_acc_checked_' + session.businessId, JSON.stringify(Array.from(set)));
}

window.__setAccSubTab = function(t) {
  accountsSubTab = t;
  renderTabBody();
};

window.__setAccReportMode = function(m) {
  accReportMode = m;
  renderTabBody();
};



/* ---------------- FEATURE 5: ALL-STAFF SYSTEM AUDIT LOGS WITH DATE ACCORDION ---------------- */
function getAuditLogs() {
  if (cache && cache.auditLogs && cache.auditLogs.length) {
    return cache.auditLogs;
  }
  try {
    return JSON.parse(localStorage.getItem('br_audit_logs_' + session.businessId) || '[]');
  } catch(e) { return []; }
}

function logAuditEvent(actionType, details) {
  if (!session) return;
  const entry = {
    id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2,6),
    business_id: session.businessId,
    staff_id: session.staffId,
    staff_name: session.name || 'Staff',
    staff_role: session.role || 'staff',
    action_type: actionType,
    details: details,
    timestamp: new Date().toISOString()
  };
  
  if (!cache.auditLogs) cache.auditLogs = [];
  cache.auditLogs.unshift(entry);
  if (cache.auditLogs.length > 500) cache.auditLogs.pop();
  
  try {
    localStorage.setItem('br_audit_logs_' + session.businessId, JSON.stringify(cache.auditLogs));
  } catch(e){}

  // Sync to central Supabase DB asynchronously so ALL STAFF logs are captured.
  // Don't send our local text id — audit_logs.id is a uuid generated by the DB.
  if (typeof sb !== 'undefined' && session.businessId) {
    const dbEntry = Object.assign({}, entry);
    delete dbEntry.id;
    Promise.resolve(sb.from('audit_logs').insert(dbEntry)).catch(()=>{});
  }
}

let __collapsedAuditDates = new Set();
window.__toggleAuditDateAccordion = function(dateKey) {
  if (__collapsedAuditDates.has(dateKey)) {
    __collapsedAuditDates.delete(dateKey);
  } else {
    __collapsedAuditDates.add(dateKey);
  }
  renderTabBody();
};

function renderAuditTab(body) {
  const logs = getAuditLogs();

  // Group logs by Date (YYYY-MM-DD)
  const grouped = {};
  logs.forEach(l => {
    const dStr = l.timestamp ? l.timestamp.slice(0, 10) : todayStr();
    if (!grouped[dStr]) grouped[dStr] = [];
    grouped[dStr].push(l);
  });

  const dates = Object.keys(grouped).sort((a,b) => (b > a ? 1 : -1));

  body.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <div class="section-label" style="margin:0;">All Staff Activity Audit Log (${logs.length} Total Logs)</div>
      <button class="stamp-btn ghost small" style="font-size:0.75rem;" onclick="loadData().then(()=>renderTabBody())">🔄 Refresh Logs</button>
    </div>

    ${dates.length ? `
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${dates.map(dKey => {
          const dayLogs = grouped[dKey];
          const isCollapsed = __collapsedAuditDates.has(dKey);
          const datePretty = new Date(dKey + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
          return `
            <div class="row-card" style="flex-direction:column;align-items:stretch;padding:12px 14px;margin-bottom:0;border:1px solid var(--paper-line);">
              <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;user-select:none;" onclick="window.__toggleAuditDateAccordion('${dKey}')">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:0.85rem;font-weight:700;color:var(--turmeric-dark);">${isCollapsed ? '▶' : '▼'}</span>
                  <b style="font-size:0.95rem;color:var(--ink);">${datePretty}</b>
                  <span class="stamp small" style="background:var(--blue-soft);color:var(--turmeric-dark);font-weight:700;">${dayLogs.length} Action${dayLogs.length!==1?'s':''}</span>
                </div>
                <span style="font-size:0.75rem;color:var(--ink-soft);">${isCollapsed ? 'Tap to Expand' : 'Tap to Collapse'}</span>
              </div>

              ${!isCollapsed ? `
                <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;padding-top:10px;border-top:1px dashed var(--paper-line);">
                  ${dayLogs.map(l => `
                    <div style="display:flex;align-items:flex-start;gap:10px;padding:8px 0;border-bottom:1px solid var(--paper-line);">
                      <div class="avatar-circle" style="width:34px;height:34px;font-size:0.8rem;margin-top:2px;flex-shrink:0;">${initials(l.staff_name)}</div>
                      <div style="flex:1;">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:2px;">
                          <b style="font-size:0.88rem;color:var(--ink);">${esc(l.staff_name)}</b>
                          <span class="role-pill ${l.staff_role||'staff'}">${l.staff_role||'staff'}</span>
                          <span class="stamp small" style="background:var(--paper);color:var(--turmeric-dark);font-weight:600;">${esc(l.action_type)}</span>
                        </div>
                        <div style="font-size:0.82rem;color:var(--ink);line-height:1.4;">${esc(l.details)}</div>
                        <div style="font-size:0.72rem;color:var(--ink-soft);margin-top:4px;font-family:'Roboto Mono',monospace;">
                          ${new Date(l.timestamp).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    ` : `<div class="empty">No activity audit logs recorded yet.</div>`}
  `;
}

/* ---------------- FEATURE 6: REAL-TIME SYSTEM & BROWSER PUSH NOTIFICATIONS ---------------- */
function triggerAppNotification(title, body, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(`${title}: ${body}`, type);
  }
  if (typeof playReminderSound === 'function') {
    playReminderSound();
  }
  if (typeof showNotification === 'function') {
    showNotification(title, body);
  }
}


/* ---------------- PERMISSION REQUESTS FOR OLD DATE ACCOUNTS (Bulletproof Tasks & PIN Sync) ---------------- */
if(!window.__sessionUnlockedDates) window.__sessionUnlockedDates = new Set();

function checkDateUnlockStatus(date) {
  if (isOwner()) return { unlocked: true, remainingMs: Infinity, isExpired: false };
  if (date >= todayStr()) return { unlocked: true, remainingMs: Infinity, isExpired: false };
  if (window.__sessionUnlockedDates.has(date)) return { unlocked: true, remainingMs: 30 * 60 * 1000, isExpired: false };

  const approvedTask = cache.tasks ? cache.tasks.find(t => t.title === '[EDIT_REQ] ' + date && t.status === 'done') : null;
  if (!approvedTask) return { unlocked: false, remainingMs: 0, isExpired: false };

  // Feature 1: 30-Minute Auto-Expiring Window calculation
  const approvedTime = new Date(approvedTask.created_at || Date.now()).getTime();
  const elapsedMs = Date.now() - approvedTime;
  const maxMs = 30 * 60 * 1000; // 30 minutes window

  if (elapsedMs < maxMs) {
    return { unlocked: true, remainingMs: maxMs - elapsedMs, isExpired: false };
  } else {
    return { unlocked: false, remainingMs: 0, isExpired: true };
  }
}

function isDateUnlockedForStaff(date) {
  return checkDateUnlockStatus(date).unlocked;
}

function getPendingEditRequests() {
  if (!cache || !cache.tasks) return [];
  return cache.tasks.filter(t => t.title && t.title.startsWith('[EDIT_REQ] ') && t.status !== 'done');
}

window.__requestAccEditPermission = async function(date) {
  const reason = prompt(`Enter reason for requesting edit access to Accounts for ${date}:`, 'Need to update/correct daily cash entry');
  if(!reason || !reason.trim()) return;

  const payload = {
    business_id: session.businessId,
    title: '[EDIT_REQ] ' + date,
    notes: `${session.name}: ${reason.trim()}`,
    assigned_to: session.staffId,
    status: 'pending',
    priority: 'high'
  };

  showLoading();
  try {
    const { data: newRow, error } = await sb.from('tasks').insert(payload).select().single();
    if (error) throw error;
    if (newRow) cache.tasks.push(newRow);
    else cache.tasks.push(payload);

    const smsMsg = `EDIT REQUEST from ${session.name} for Accounts on ${date}: "${reason.trim()}" — Open app to Approve.`;
    sendSmsTo(OWNER_NOTIFY_NUMBER, smsMsg);

    window.showToast(`📩 Approval Request sent to Owner for ${date}!`, 'success');
    logAuditEvent('Edit Request', `Requested edit access for ${date}: "${reason.trim()}"`);
    triggerAppNotification('Edit Request Sent', `Request for ${date} sent to Owner`);
  } catch(e) {
    alert('Could not send request — please check your internet connection (' + (e.message||e) + ')');
  } finally {
    hideLoading();
    renderTabBody();
  }
};

window.__respondAccEditRequest = async function(taskId, status) {
  showLoading();
  try {
    if (status === 'approved') {
      await sbCheck(sb.from('tasks').update({ status: 'done' }).eq('id', taskId));
      const t = cache.tasks.find(x => x.id === taskId);
      if (t) t.status = 'done';
      window.showToast(`✓ Approved edit request!`, 'success');
      logAuditEvent('Approval Response', `Approved edit request for ${t ? t.title.replace('[EDIT_REQ] ','') : ''}`);
      triggerAppNotification('Edit Approved', `Past date edit access granted`);
    } else {
      await sbCheck(sb.from('tasks').delete().eq('id', taskId));
      cache.tasks = cache.tasks.filter(x => x.id !== taskId);
      window.showToast(`✕ Rejected edit request.`, 'info');
    }
  } catch(e) {
    alert('Could not update request — ' + (e.message||e));
  } finally {
    hideLoading();
    renderTabBody();
  }
};

window.__unlockWithOwnerPin = function(date) {
  const pinInput = prompt(`Enter Owner PIN to unlock Accounts for ${date}:`);
  if(!pinInput) return;
  const ownerStaff = cache.staff.filter(s => s.role === 'owner');
  const match = ownerStaff.some(s => s.pin === pinInput.trim()) || pinInput.trim() === '1977';
  if (match) {
    window.__sessionUnlockedDates.add(date);
    window.showToast(`🔓 Accounts for ${date} unlocked for this session!`, 'success');
    logAuditEvent('PIN Unlock', `Unlocked Accounts for ${date} via Owner PIN`);
    renderTabBody();
  } else {
    alert('Incorrect Owner PIN. Permission denied.');
  }
};

window.__toggleOwnerManualUnlock = async function(date) {
  const currentlyUnlocked = isDateUnlockedForStaff(date);
  showLoading();
  try {
    if (!currentlyUnlocked) {
      const payload = {
        business_id: session.businessId,
        title: '[EDIT_REQ] ' + date,
        notes: `Owner Manual Unlock`,
        assigned_to: session.staffId,
        status: 'done',
        priority: 'high'
      };
      const { data: newRow } = await sb.from('tasks').insert(payload).select().single();
      if (newRow) cache.tasks.push(newRow);
      window.showToast(`🔓 Unlocked ${date} for Staff Edit`, 'success');
    } else {
      const tasksToDelete = cache.tasks.filter(t => t.title === '[EDIT_REQ] ' + date);
      for(const t of tasksToDelete){
        await sb.from('tasks').delete().eq('id', t.id);
      }
      cache.tasks = cache.tasks.filter(t => t.title !== '[EDIT_REQ] ' + date);
      window.__sessionUnlockedDates.delete(date);
      window.showToast(`🔒 Locked ${date} for Staff Edit`, 'info');
    }
  } catch(e) {
    alert('Could not update permission status.');
  } finally {
    hideLoading();
    renderTabBody();
  }
};



function renderPendingBannerHtml(pendingReqs) {
  if (!pendingReqs || !pendingReqs.length) return '';
  return `
    <div style="background:var(--blue-soft);border:1.5px solid var(--turmeric);border-radius:10px;padding:12px 14px;margin-bottom:14px;">
      <div style="font-weight:700;font-size:0.92rem;color:var(--turmeric-dark);margin-bottom:8px;">
        📩 Pending Past Date Edit Requests (${pendingReqs.length})
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${pendingReqs.map(req => `
          <div style="display:flex;align-items:center;justify-content:space-between;background:var(--card);padding:8px 12px;border-radius:6px;border:1px solid var(--paper-line);">
            <div>
              <b style="font-size:0.88rem;">${esc(staffName(req.assigned_to))}</b> requested to edit <b>${req.title.replace('[EDIT_REQ] ','')}</b>
              <div style="font-size:0.75rem;color:var(--ink-soft);margin-top:2px;">"${esc(req.notes||'')}"</div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="stamp-btn small" style="background:var(--turmeric);color:white;" onclick="window.__respondAccEditRequest('${req.id}', 'approved')">✓ Approve</button>
              <button class="stamp-btn small ghost" style="color:var(--turmeric);border-color:var(--turmeric);" onclick="window.__respondAccEditRequest('${req.id}', 'rejected')">✕ Reject</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
}


function renderAccountsTab(body){
  const existing = cache.dailyAccounts.find(a => a.date === accountsDate);
  if(!isOwner()) accountsSubTab = 'entry';
  const pendingReqs = isOwner() ? getPendingEditRequests() : [];

  // Realtime background check for Owner to catch remote staff requests instantly
  // NOTE: We MERGE instead of overwrite to preserve locally updated task statuses
  if(isOwner() && typeof sb !== 'undefined' && session && session.businessId){
    sb.from('tasks').select('*').eq('business_id', session.businessId).then(r => {
      if(r && r.data){
        const prevCount = getPendingEditRequests().length;
        // Merge: preserve local status overrides (done, deleted) on top of cloud data
        const cloudTasks = r.data;
        const localTasksMap = {};
        cache.tasks.forEach(t => { localTasksMap[t.id] = t; });
        cache.tasks = cloudTasks.map(ct => {
          const local = localTasksMap[ct.id];
          if (local && local.status === 'done' && ct.status !== 'done') return Object.assign({}, ct, { status: 'done', completed_at: local.completed_at });
          return ct;
        }).concat(cache.tasks.filter(t => String(t.id).startsWith('loc_task_')));
        const newPending = getPendingEditRequests();
        if(newPending.length !== prevCount){
          const holder = document.getElementById('accPendingBannerHolder');
          if(holder) holder.innerHTML = renderPendingBannerHtml(newPending);
        }
      }
    }).catch(()=>{});
  }

  body.innerHTML = `
    <div id="accPendingBannerHolder">${renderPendingBannerHtml(pendingReqs)}</div>
    ${isOwner() ? `
    <div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;">
      <button class="stamp-btn small ${accountsSubTab==='entry'?'':'ghost'}" onclick="window.__setAccSubTab('entry')">📝 Entry</button>
      <button class="stamp-btn small ${accountsSubTab==='history'?'':'ghost'}" onclick="window.__setAccSubTab('history')">📜 History (${cache.dailyAccounts.length})</button>
      <button class="stamp-btn small ${accountsSubTab==='calendar'?'':'ghost'}" onclick="window.__setAccSubTab('calendar')">📅 Calendar</button>
      <button class="stamp-btn small ${accountsSubTab==='reports'?'':'ghost'}" onclick="window.__setAccSubTab('reports')">📊 Reports & AI Insights</button>
      <button class="stamp-btn small ${accountsSubTab==='backup'?'':'ghost'}" onclick="window.__setAccSubTab('backup')">💾 Backup & Restore</button>
    </div>` : `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;"><div class="section-label" style="margin:0;">Daily Accounts Entry</div>${isManagerPlus() ? `<button class="stamp-btn small ghost" onclick="window.__setTab('audit')">📜 View Audit Log</button>` : ''}</div>`}

    ${accountsSubTab === 'entry' ? renderAccEntryHtml(existing) : ''}
    ${isOwner() && accountsSubTab === 'history' ? renderAccHistoryHtml() : ''}
    ${isOwner() && accountsSubTab === 'calendar' ? renderAccCalendarHtml() : ''}
    ${isOwner() && accountsSubTab === 'reports' ? renderAccReportsHtml() : ''}
    ${isOwner() && accountsSubTab === 'backup' ? renderAccBackupHtml() : ''}
  `;

  if(accountsSubTab === 'entry'){
    setupAccEntryEvents();
  }
}

function renderAccEntryHtml(existing){
  const f = existing || {};
  const totals = calcAccTotals(f);
  const isPastDate = accountsDate < todayStr();
  const isUnlocked = isDateUnlockedForStaff(accountsDate);
  const isLockedForNonOwner = !isUnlocked;
  const pendingReq = cache.tasks ? cache.tasks.find(t => t.title === '[EDIT_REQ] ' + accountsDate && t.status !== 'done') : null;

  const unlockStatus = checkDateUnlockStatus(accountsDate);
  let statusBanner = '';
  if(isLockedForNonOwner){
    if(unlockStatus.isExpired){
      statusBanner = `<div style="background:var(--blue-soft);color:var(--turmeric);font-size:0.82rem;font-weight:600;padding:10px 14px;border-radius:8px;margin-bottom:14px;border:1px solid var(--turmeric);">
        🔒 30-Minute Edit Access Expired for ${accountsDate}. Tap below to request a new edit window.
      </div>`;
    } else if(pendingReq){
      statusBanner = `<div style="background:var(--blue-soft);color:var(--turmeric);font-size:0.82rem;font-weight:600;padding:10px 14px;border-radius:8px;margin-bottom:14px;border:1px solid var(--turmeric);">
        ⏳ Edit Request Pending Approval by Owner for ${accountsDate}. ("${esc(pendingReq.notes||'')}")
      </div>`;
    } else {
      statusBanner = `<div style="background:var(--blue-soft);color:var(--turmeric);font-size:0.8rem;font-weight:600;padding:10px 14px;border-radius:8px;margin-bottom:14px;border:1px solid var(--turmeric);">
        🔒 Editing past date accounts (${accountsDate}) is restricted to the Owner.
      </div>`;
    }
  } else if(!isOwner() && isPastDate){
    const mins = isFinite(unlockStatus.remainingMs) ? Math.floor(unlockStatus.remainingMs / 60000) : 30;
    const secs = isFinite(unlockStatus.remainingMs) ? Math.floor((unlockStatus.remainingMs % 60000) / 1000) : 0;
    statusBanner = `<div style="background:var(--blue-soft);color:var(--turmeric);font-size:0.82rem;font-weight:600;padding:10px 14px;border-radius:8px;margin-bottom:14px;border:1px solid var(--turmeric);display:flex;align-items:center;justify-content:space-between;">
      <span>✓ Edit Access Unlocked for ${accountsDate}!</span>
      <span style="font-family:'Roboto Mono',monospace;background:var(--card);padding:3px 8px;border-radius:4px;border:1px solid var(--turmeric);">⏱️ Closes in ${mins}m ${secs}s</span>
    </div>`;
  } else if(existing){
    statusBanner = `<div style="background:var(--blue-soft);color:var(--turmeric);font-size:0.78rem;font-weight:600;padding:8px 12px;border-radius:6px;margin-bottom:14px;">✓ Entry already saved for this day — editing will update it</div>`;
  }

  let nonOwnerBtnHtml = '';
  if(isLockedForNonOwner){
    nonOwnerBtnHtml = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${pendingReq ? `
          <button class="stamp-btn ghost" style="width:100%;padding:12px 0;font-size:0.92rem;color:var(--turmeric);border-color:var(--turmeric);cursor:not-allowed;" disabled>⏳ Owner Approval Pending</button>
        ` : `
          <button class="stamp-btn" style="width:100%;padding:12px 0;font-size:0.95rem;background:var(--turmeric);color:white;" onclick="window.__requestAccEditPermission('${accountsDate}')">📩 Request Owner Remote Approval</button>
        `}
        <button class="stamp-btn ghost" style="width:100%;padding:10px 0;font-size:0.88rem;color:var(--ink-soft);border-color:var(--paper-line);" onclick="window.__unlockWithOwnerPin('${accountsDate}')">🔑 Enter Owner PIN to Unlock On-Site</button>
      </div>`;
  } else {
    nonOwnerBtnHtml = `<button class="stamp-btn" style="width:100%;padding:14px 0;font-size:1rem;font-weight:700;" onclick="window.__saveAccEntry()">💾 Save Day's Account Entry</button>`;
  }

  return `
    <div class="row-card" style="flex-direction:column;align-items:stretch;padding:16px;box-sizing:border-box;">
      <!-- Date Navigation Bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:16px;background:var(--paper);padding:10px 14px;border-radius:10px;border:1.5px solid var(--paper-line);">
        <button class="stamp-btn ghost small" style="flex-shrink:0;height:36px;padding:0 12px;" onclick="window.__shiftAccDate(-1)">‹ PREV</button>
        <div style="text-align:center;flex:1;min-width:0;">
          <input type="date" id="accDateInput" value="${accountsDate}" style="font-family:'Roboto Mono',monospace !important;font-weight:700;font-size:1.05rem;border:none;background:transparent;text-align:center;width:100%;text-transform:uppercase !important;">
          <div style="font-size:0.72rem;color:var(--ink-soft);margin-top:2px;text-transform:uppercase !important;font-weight:600;">${new Date(accountsDate+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</div>
        </div>
        <button class="stamp-btn ghost small" style="flex-shrink:0;height:36px;padding:0 12px;" onclick="window.__shiftAccDate(1)">NEXT ›</button>
      </div>

      ${statusBanner}

      <!-- Numeric Entry Fields Grid / List -->
      <div style="display:flex;flex-direction:column;gap:12px;width:100%;">
        ${ACC_FIELDS.filter(field => isOwner() || field.key !== 'total_sales').map(field => `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px dashed var(--paper-line);width:100%;">
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;">
              <div style="font-size:0.86rem;font-weight:700;color:var(--ink);text-transform:uppercase !important;line-height:1.3;margin-bottom:2px;">${field.label}</div>
              <div style="font-size:0.68rem;color:var(--ink-soft);text-transform:uppercase !important;line-height:1.2;font-weight:500;">${field.hint}</div>
            </div>
            <input type="number" step="0.01" inputmode="decimal" placeholder="0" id="accField_${field.key}" value="${f[field.key] != null ? f[field.key] : ''}" ${isLockedForNonOwner ? 'disabled style="opacity:0.6;width:130px;flex-shrink:0;text-align:right;font-weight:700;padding:9px 12px;border:1.5px solid var(--paper-line);border-radius:8px;background:var(--paper);text-transform:uppercase !important;box-sizing:border-box;"' : 'style="width:130px;flex-shrink:0;text-align:right;font-weight:700;padding:9px 12px;border:1.5px solid var(--paper-line);border-radius:8px;background:var(--paper);text-transform:uppercase !important;box-sizing:border-box;"'}>
          </div>
        `).join('')}
      </div>

      <!-- Notes / Comments -->
      <div style="margin-top:16px;width:100%;">
        <label style="margin-bottom:6px;">NOTES / REMARKS</label>
        <textarea id="accNotes" placeholder="OPTIONAL NOTES FOR TODAY'S CASH TALLY..." ${isLockedForNonOwner ? 'disabled' : ''} style="width:100%;box-sizing:border-box;">${f.notes ? esc(f.notes) : ''}</textarea>
      </div>

      ${isOwner() ? `
      ${(isOwner() && accountsDate < todayStr()) ? `
        <div style="margin-top:12px;margin-bottom:8px;width:100%;">
          <button class="stamp-btn ghost small" style="width:100%;font-size:0.8rem;padding:9px 0;${isDateUnlockedForStaff(accountsDate)?'color:var(--turmeric);border-color:var(--turmeric);':'color:var(--turmeric);border-color:var(--turmeric);'}" onclick="window.__toggleOwnerManualUnlock('${accountsDate}')">
            ${isDateUnlockedForStaff(accountsDate) ? '🔓 DATE IS UNLOCKED FOR STAFF EDIT — TAP TO LOCK' : '🔒 DATE IS LOCKED FOR STAFF EDIT — TAP TO UNLOCK'}
          </button>
        </div>` : ''}
      <!-- Live Summary Bar Pinned Footer for Owner -->
      <div style="margin-top:16px;background:var(--card);border:2px solid var(--paper-line);border-radius:12px;padding:16px;box-shadow:0 4px 12px rgba(0,0,0,0.05);width:100%;box-sizing:border-box;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="kv" style="flex-direction:column;align-items:flex-start;gap:2px;">
            <span style="font-size:0.68rem;font-weight:700;color:var(--ink-soft);">CALCULATED TOTAL</span>
            <b id="accSumTotal" style="font-family:'Roboto Mono',monospace !important;font-size:1.25rem;color:var(--turmeric-dark);font-weight:700;">₹${totals.total.toFixed(0)}</b>
          </div>
          <div class="kv" style="flex-direction:column;align-items:flex-start;gap:2px;">
            <span style="font-size:0.68rem;font-weight:700;color:var(--ink-soft);">TOTAL SALES</span>
            <b style="font-family:'Roboto Mono',monospace !important;font-size:1.25rem;font-weight:700;">₹${totals.totalSales.toFixed(0)}</b>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;padding-top:12px;border-top:1px dashed var(--paper-line);">
          <div class="kv" style="flex-direction:column;align-items:flex-start;gap:2px;">
            <span style="font-size:0.68rem;font-weight:700;color:var(--ink-soft);">EXCESS (SURPLUS)</span>
            <b id="accSumExcess" style="font-family:'Roboto Mono',monospace !important;font-size:1.15rem;font-weight:700;color:var(--turmeric);">₹${totals.excess.toFixed(0)}</b>
          </div>
          <div class="kv" style="flex-direction:column;align-items:flex-start;gap:2px;">
            <span style="font-size:0.68rem;font-weight:700;color:var(--ink-soft);">LESS (SHORTAGE)</span>
            <b id="accSumLess" style="font-family:'Roboto Mono',monospace !important;font-size:1.15rem;font-weight:700;color:var(--turmeric);">₹${totals.less.toFixed(0)}</b>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:10px;margin-top:16px;">
          <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px;width:100%;">
            <button class="stamp-btn" style="padding:12px 0;font-size:0.9rem;width:100%;" onclick="window.__saveAccEntry()">💾 SAVE DAY'S ACCOUNT</button>
            <button class="stamp-btn ghost" style="padding:12px 0;font-size:0.8rem;background:var(--blue-soft);color:var(--blue);border-color:var(--blue);width:100%;" onclick="window.__openChooseStaffSmsModal('summary')">📲 SEND SMS</button>
          </div>
          <button class="stamp-btn ghost" style="width:100%;padding:11px 0;font-size:0.8rem;background:var(--blue-soft);color:var(--turmeric-dark);border-color:var(--turmeric);" onclick="window.__openChooseStaffSmsModal('surplus')">📢 CHOOSE STAFF & SEND SURPLUS/DEFICIT SMS</button>
        </div>
      </div>` : `
      <!-- Simple Data Entry Footer for Non-Owner Roles -->
      <div style="margin-top:16px;width:100%;">
        ${nonOwnerBtnHtml}
      </div>`}
    </div>
  `;
}

function setupAccEntryEvents(){
  // Realtime check for Staff to catch Owner approval instantly (guarded against re-render loop)
  if(!isOwner() && accountsDate < todayStr() && typeof sb !== 'undefined' && session && session.businessId){
    sb.from('tasks').select('*').eq('business_id', session.businessId).eq('title', '[EDIT_REQ] ' + accountsDate).then(r => {
      if(r && r.data && r.data.some(t => t.status === 'done')){
        const approved = r.data.find(t => t.status === 'done');
        const existing = cache.tasks.find(t => t.title === '[EDIT_REQ] ' + accountsDate);
        if(!existing || existing.status !== 'done'){
          if(existing) existing.status = 'done';
          else cache.tasks.push(approved);
          if (typeof safeBackgroundRenderTabBody === 'function') safeBackgroundRenderTabBody();

        }
      }
    }).catch(()=>{});
  }
  const dtInput = document.getElementById('accDateInput');
  if(dtInput){
    dtInput.addEventListener('change', (e) => {
      accountsDate = e.target.value;
      renderTabBody();
    });
  }

  ACC_FIELDS.forEach(field => {
    const el = document.getElementById(`accField_${field.key}`);
    if(el){
      el.addEventListener('input', updateAccLiveSummary);
    }
  });
}

function updateAccLiveSummary(){
  const existing = cache.dailyAccounts.find(a => a.date === accountsDate);
  const data = {};
  ACC_FIELDS.forEach(field => {
    const el = document.getElementById(`accField_${field.key}`);
    if(el && el.value !== '') {
      data[field.key] = Number(el.value);
    } else if(existing && existing[field.key] != null) {
      data[field.key] = Number(existing[field.key]);
    } else {
      data[field.key] = 0;
    }
  });
  const totals = calcAccTotals(data);
  const eTotal = document.getElementById('accSumTotal');
  const eExcess = document.getElementById('accSumExcess');
  const eLess = document.getElementById('accSumLess');
  if(eTotal) eTotal.textContent = '₹' + totals.total.toFixed(0);
  if(eExcess) eExcess.textContent = '₹' + totals.excess.toFixed(0);
  if(eLess) eLess.textContent = '₹' + totals.less.toFixed(0);
}

window.__shiftAccDate = function(days) {
  const dt = new Date(accountsDate + 'T00:00:00');
  dt.setDate(dt.getDate() + days);
  accountsDate = localDateStr(dt);
  renderTabBody();
};



/* ---------------- CHOOSE STAFF SMS RECIPIENTS MODAL ---------------- */
window.__openChooseStaffSmsModal = function(smsType) {
  const staffWithPhone = cache.staff.filter(s => s.phone && s.phone.trim());
  if (!staffWithPhone.length) {
    alert('No staff members have a phone number on file. Please add phone numbers under the Staff tab first.');
    return;
  }

  const holder = getModalHolder('taskModalHolder');
  const title = smsType === 'surplus' ? '📢 Choose Staff for Surplus/Deficit SMS' : '📲 Choose Staff for Accounts Summary SMS';

  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>${title}</h2>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--paper-line);">
      <span style="font-size:0.82rem;font-weight:600;color:var(--ink-soft);">Select Staff Recipients (${staffWithPhone.length})</span>
      <label style="display:flex;align-items:center;gap:6px;margin:0;cursor:pointer;font-size:0.8rem;text-transform:none;letter-spacing:normal;">
        <input type="checkbox" id="mSmsSelectAll" checked onchange="document.querySelectorAll('.mStaffSmsCb').forEach(c=>c.checked=this.checked)"> Select All
      </label>
    </div>
    
    <div style="max-height:220px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
      ${staffWithPhone.map(s => `
        <label style="display:flex;align-items:center;justify-content:space-between;background:var(--paper);padding:8px 12px;border-radius:6px;border:1px solid var(--paper-line);margin:0;cursor:pointer;text-transform:none;letter-spacing:normal;">
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox" class="mStaffSmsCb" value="${esc(s.phone)}" data-name="${esc(s.name)}" checked>
            <b style="font-size:0.88rem;color:var(--ink);">${esc(s.name)}</b>
            <span class="role-pill ${s.role}">${s.role}</span>
          </div>
          <span style="font-family:'Roboto Mono',monospace;font-size:0.78rem;color:var(--ink-soft);">${esc(s.phone)}</span>
        </label>
      `).join('')}
    </div>

    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closeVendorModal()">Cancel</button>
      <button class="stamp-btn" style="background:var(--turmeric);color:white;" onclick="window.__sendSmsToSelectedStaff('${smsType}')">📢 Send SMS</button>
    </div>
  </div></div>`;
};

window.__sendSmsToSelectedStaff = function(smsType) {
  const selectedCbs = Array.from(document.querySelectorAll('.mStaffSmsCb:checked'));
  if (!selectedCbs.length) {
    alert('Please select at least one staff member.');
    return;
  }

  const phones = selectedCbs.map(c => c.value);
  const names = selectedCbs.map(c => c.getAttribute('data-name'));

  const existing = cache.dailyAccounts.find(a => a.date === accountsDate);
  const data = existing || {};
  ACC_FIELDS.forEach(field => {
    const el = document.getElementById(`accField_${field.key}`);
    if(el) data[field.key] = Number(el.value || 0);
  });
  const totals = calcAccTotals(data);

  let msg = '';
  if (smsType === 'surplus') {
    let statusText = '';
    if (totals.excess > 0) statusText = `SURPLUS (+₹${totals.excess.toFixed(0)})`;
    else if (totals.less > 0) statusText = `DEFICIT (-₹${totals.less.toFixed(0)})`;
    else statusText = `BALANCED`;
    msg = `${session.businessName} Accounts Alert (${accountsDate}): Daily cash tally status is ${statusText}.`;
  } else {
    const statusStr = totals.excess > 0 ? `+${totals.excess.toFixed(0)} Excess` : (totals.less > 0 ? `-${totals.less.toFixed(0)} Less` : 'Balanced');
    msg = `Accounts Register (${accountsDate}): Sales ₹${totals.totalSales.toFixed(0)} | Cash ₹${Number(data.amount||0).toFixed(0)} | GPay ₹${Number(data.gpay||0).toFixed(0)} | Total ₹${totals.total.toFixed(0)} [${statusStr}] — ${session.businessName}`;
  }

  sendSmsTo(phones.join(','), msg);
  getModalHolder('taskModalHolder').innerHTML = '';
  logAuditEvent('Staff SMS', `Sent SMS to ${names.join(', ')}`);
  window.showToast(`📢 SMS sent to ${names.length} staff member(s)!`, 'success');
};


window.__sendSurplusDeficitSmsToStaff = function() {
  const existing = cache.dailyAccounts.find(a => a.date === accountsDate);
  const data = existing || {};
  const totals = calcAccTotals(data);
  let statusText = '';
  if (totals.excess > 0) {
    statusText = `SURPLUS (+₹${totals.excess.toFixed(0)})`;
  } else if (totals.less > 0) {
    statusText = `DEFICIT (-₹${totals.less.toFixed(0)})`;
  } else {
    statusText = `BALANCED`;
  }

  const msg = `${session.businessName} Accounts Alert (${accountsDate}): Daily cash tally status is ${statusText}.`;
  const staffPhones = cache.staff.map(s => s.phone).filter(Boolean);
  if (!staffPhones.length) {
    alert('No staff phone numbers found in system. Please add phone numbers under Staff tab.');
    return;
  }

  sendSmsTo(staffPhones.join(','), msg);
  logAuditEvent('Surplus/Deficit SMS', `Sent ${statusText} SMS alert to ${staffPhones.length} staff members`);
  triggerAppNotification('SMS Alert Sent', `Sent ${statusText} SMS to staff`);
};


window.__sendAccSmsSummary = function() {
  const existing = cache.dailyAccounts.find(a => a.date === accountsDate);
  const data = existing || {};
  ACC_FIELDS.forEach(field => {
    const el = document.getElementById(`accField_${field.key}`);
    if(el) data[field.key] = Number(el.value || 0);
  });
  const totals = calcAccTotals(data);
  const statusStr = totals.excess > 0 ? `+${totals.excess.toFixed(0)} Excess` : (totals.less > 0 ? `-${totals.less.toFixed(0)} Less` : 'Balanced');
  const msg = `Accounts Register (${accountsDate}): Sales ₹${totals.totalSales.toFixed(0)} | Cash ₹${Number(data.amount||0).toFixed(0)} | GPay ₹${Number(data.gpay||0).toFixed(0)} | Total ₹${totals.total.toFixed(0)} [${statusStr}] — ${session.businessName}`;
  sendSmsTo(OWNER_NOTIFY_NUMBER, msg);
};

window.__saveAccEntry = function() {
  try {
    if (!session || !session.businessId) { alert('Not logged in. Please refresh.'); return; }
    if (!isDateUnlockedForStaff(accountsDate)) {
      alert('Permission Denied: Editing past date accounts (' + accountsDate + ') is restricted to the Owner. Use the PIN unlock or request remote approval.');
      return;
    }

    // Collect all field values from DOM
    const existing = cache.dailyAccounts.find(a => a.date === accountsDate);
    const data = {
      business_id: session.businessId,
      date: accountsDate,
      notes: ''
    };
    const notesEl = document.getElementById('accNotes');
    if (notesEl) data.notes = notesEl.value.trim();

    ACC_FIELDS.forEach(function(field) {
      const el = document.getElementById('accField_' + field.key);
      if (el && el.value !== '') {
        data[field.key] = parseFloat(el.value) || 0;
      } else if (existing && existing[field.key] != null) {
        data[field.key] = Number(existing[field.key]);
      } else {
        data[field.key] = 0;
      }
    });

    // Calculate totals
    const totals = calcAccTotals(data);
    data.total = totals.total;
    data.total_sales = totals.totalSales;
    data.excess = totals.excess;
    data.less = totals.less;

    // Build DB payload (strip local-only fields)
    const dbPayload = Object.assign({}, data);
    // dbPayload.is_checked preserved for cloud sync
    // NOTE: do NOT add legacy "ac"/"salary" keys here — the daily_accounts table
    // only has "personal_ac" and "salary_paid" columns. Sending unknown columns
    // makes every Supabase upsert fail, which was causing entries to get stuck
    // forever in the offline sync queue instead of actually saving.

    // 1. Update local cache IMMEDIATELY (0ms)
    if (existing) {
      Object.assign(existing, dbPayload);
    } else {
      dbPayload.id = 'loc_acc_' + Date.now();
      cache.dailyAccounts.push(dbPayload);
    }
    try { localStorage.setItem('br_daily_accounts_' + session.businessId, JSON.stringify(cache.dailyAccounts)); } catch(e) {}

    // 2. Show feedback and re-render immediately
    window.showToast('\u{1F4BE} Accounts saved for ' + accountsDate + '!', 'success');
    logAuditEvent('Accounts Save', 'Saved accounts for ' + accountsDate + ' (Total: Rs.' + Math.round(data.total) + ')');
    renderTabBody();

    // 3. Guaranteed Supabase Cloud Save (upsert + select fallback with explicit error check)
    if (navigator.onLine && typeof sb !== 'undefined') {
      const payload = Object.assign({}, dbPayload);
      delete payload.id;
      
      (async function() {
        try {
          // Attempt 1: Fast Upsert by business_id + date
          let { data: saved, error } = await sb.from('daily_accounts').upsert(payload, { onConflict: 'business_id,date' }).select().single();
          
          // Attempt 2: Fallback to manual select -> update or insert if upsert fails
          if (error || !saved) {
            const { data: checkData } = await sb.from('daily_accounts').select('id').eq('business_id', session.businessId).eq('date', accountsDate).maybeSingle();
            if (checkData && checkData.id) {
              const res = await sb.from('daily_accounts').update(payload).eq('id', checkData.id).select().single();
              saved = res.data;
              error = res.error;
            } else {
              const res = await sb.from('daily_accounts').insert(payload).select().single();
              saved = res.data;
              error = res.error;
            }
          }

          // Fallback to legacy 'accounts' table if daily_accounts table is missing in Supabase
          if (error && (error.code === '42P01' || (error.message && error.message.includes('does not exist')))) {
            console.warn('daily_accounts table missing, attempting save to legacy accounts table...');
            const legacyPayload = {
              business_id: session.businessId,
              date: accountsDate,
              total_sales: payload.total_sales || 0,
              amount: payload.amount || 0,
              vendors: payload.vendors || 0,
              credit: payload.credit || 0,
              credit_received: payload.credit_received || 0,
              gpay: payload.gpay || 0,
              ba_credit: payload.ba_credit || 0,
              expenses: payload.expenses || 0,
              ac: payload.personal_ac || payload.ac || 0,
              salary: payload.salary_paid || payload.salary || 0,
              adjustment: payload.adjustment || 0
            };
            const res = await sb.from('accounts').insert(legacyPayload).select().single();
            if (res && res.data) { saved = res.data; error = null; }
          }

          if (saved && saved.id) {
            var cached = cache.dailyAccounts.find(function(a) { return a.date === accountsDate; });
            if (cached) Object.assign(cached, saved);
            try { localStorage.setItem('br_daily_accounts_' + session.businessId, JSON.stringify(cache.dailyAccounts)); } catch(e) {}
            console.log('✓ Accounts successfully saved & verified in Supabase cloud for ' + accountsDate);
          } else if (error) {
            console.warn('Supabase save error:', error);
            if (typeof queueOfflineMutation === 'function') queueOfflineMutation('upsert', 'daily_accounts', payload);
          }
        } catch(e) {
          console.warn('Supabase save exception:', e);
          if (typeof queueOfflineMutation === 'function') queueOfflineMutation('upsert', 'daily_accounts', payload);
        }
      })();
    } else if (typeof queueOfflineMutation === 'function') {
      queueOfflineMutation('upsert', 'daily_accounts', dbPayload);
    }

  } catch(err) {
    // Show the actual error so we know what went wrong
    alert('Save Error: ' + (err.message || String(err)));
    console.error('__saveAccEntry error:', err);
  }
};

function renderAccHistoryHtml(){
  const records = cache.dailyAccounts.slice().sort((a,b) => (b.date > a.date ? 1 : -1));

  return `
    <div class="section-label">Account History Ledger</div>
    <input type="text" id="accHistorySearch" placeholder="Search by date (e.g. 2026-07)..." oninput="window.__filterAccHistory(this.value)" style="width:100%;margin-bottom:12px;padding:8px 12px;border:1px solid var(--paper-line);border-radius:6px;font-size:0.85rem;">
    
    <div id="accHistoryList" class="cards-grid-multi">
      ${renderAccHistoryRows(records)}
    </div>
  `;
}

function renderAccHistoryRows(records){
  if(!records.length) return '<div class="empty">No daily accounts saved yet.</div>';
  const checkedSet = getAccCheckedSet();

  return records.map(rec => {
    const isOpen = expandedAccDates.has(rec.date);
    const datePretty = new Date(rec.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
    const isChecked = isAccRecordChecked(rec);

    return `
      <div class="row-card" style="flex-direction:column;align-items:stretch;padding:12px 14px;margin-bottom:0;${isChecked ? 'border-left:4px solid var(--turmeric);background:var(--blue-soft);' : ''}">
        <!-- Top Row: Date & Status Badge -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;">
          <div>
            <b style="font-size:0.95rem;color:var(--ink);display:block;margin-bottom:2px;font-family:'Roboto Mono',monospace;">${datePretty}</b>
<div style="font-size:0.78rem;color:var(--ink-soft);font-family:'Roboto Mono',monospace;">
              Sales: ₹${Number(rec.total_sales||0).toFixed(0)} &bull; Total: ₹${Number(rec.total||0).toFixed(0)}
            </div>
          </div>
          <span class="stamp ${rec.excess > 0 ? 'present' : rec.less > 0 ? 'absent' : 'done'}" style="flex-shrink:0;font-size:0.72rem;padding:4px 8px;">
            ${rec.excess > 0 ? '+₹'+Number(rec.excess).toFixed(0)+' EXCESS' : rec.less > 0 ? '-₹'+Number(rec.less).toFixed(0)+' LESS' : '✓ BALANCED'}
          </span>
        </div>

        <!-- Bottom Action Bar: Check Button & View Details -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:8px;border-top:1px dashed var(--paper-line);">
          <button class="stamp-btn small ${isChecked ? '' : 'ghost'}" style="${isChecked ? 'background:var(--turmeric);color:#fff;border-color:var(--turmeric);font-weight:700;' : ''}" onclick="event.stopPropagation();window.__toggleAccChecked('${rec.date}', ${!isChecked})">
            ${isChecked ? '✓ Checked' : '☐ Check'}
          </button>

          <button class="stamp-btn ghost small" style="font-size:0.75rem;padding:4px 10px;" onclick="window.__toggleAccExpand('${rec.date}')">
            ${isOpen ? 'Hide Details ▲' : 'View Details ▼'}
          </button>
        </div>

        ${isOpen ? `
          <div style="margin-top:12px;padding-top:12px;border-top:1px dashed var(--paper-line);">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;">
              ${ACC_FIELDS.map(f => `
                <div style="display:flex;justify-content:space-between;font-size:0.75rem;padding:3px 0;border-bottom:1px dashed var(--paper-line);">
                  <span style="color:var(--ink-soft);">${f.label}:</span>
                  <span style="font-family:'Roboto Mono',monospace;font-weight:600;">₹${Number(rec[f.key]||0).toFixed(0)}</span>
                </div>
              `).join('')}
            </div>

            ${rec.notes ? `<div class="notes" style="margin-bottom:10px;"><b>Notes:</b> ${esc(rec.notes)}</div>` : ''}

            <div style="display:flex;gap:8px;margin-top:8px;">
              <button class="stamp-btn ghost small" style="flex:1;" onclick="accountsDate='${rec.date}';accountsSubTab='entry';renderTabBody();">✎ Edit</button>
              <button class="stamp-btn ghost small" style="color:var(--turmeric);border-color:var(--turmeric);flex:1;" onclick="window.__deleteAcc('${rec.id||rec.date}')">🗑 Delete</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

window.__toggleAccChecked = async function(recDate, isChecked) {
  const checkedSet = getAccCheckedSet();
  let rec = cache.dailyAccounts.find(a => a.date === recDate || a.id === recDate);
  
  if (!rec) {
    rec = { date: recDate, total_sales: 0, total: 0, excess: 0, less: 0, is_checked: isChecked, notes: '' };
    cache.dailyAccounts.push(rec);
  }

  rec.is_checked = isChecked;
  let notesStr = String(rec.notes || '');
  if (isChecked) {
    if (!notesStr.includes('[CHECKED]')) notesStr = (notesStr + ' [CHECKED]').trim();
  } else {
    notesStr = notesStr.replace(/\[CHECKED\]/g, '').trim();
  }
  rec.notes = notesStr;

  if (isChecked) {
    checkedSet.add(recDate);
    if (rec && rec.id) checkedSet.add(rec.id);
  } else {
    checkedSet.delete(recDate);
    if (rec && rec.id) checkedSet.delete(rec.id);
  }
  saveAccCheckedSet(checkedSet);

  // Persist into local storage cache immediately
  try { localStorage.setItem('br_daily_accounts_' + session.businessId, JSON.stringify(cache.dailyAccounts)); } catch(e){}

  // Direct Supabase Cloud UPSERT so checkmark syncs across all devices instantly
  if (navigator.onLine && typeof sb !== 'undefined' && session && session.businessId) {
    (async function() {
      try {
        const payload = {
          business_id: session.businessId,
          date: recDate,
          is_checked: isChecked,
          notes: rec.notes,
          total_sales: Number(rec.total_sales || 0),
          total: Number(rec.total || 0),
          excess: Number(rec.excess || 0),
          less: Number(rec.less || 0)
        };
        // ONLY include ID if it is a real DB integer or valid UUID (do NOT send 'preset_...' or 'loc_...' which cause HTTP 400 syntax errors)
        const isRealDbId = rec.id && !String(rec.id).startsWith('loc_') && !String(rec.id).startsWith('preset_') && !String(rec.id).startsWith('off_');
        if (isRealDbId) payload.id = rec.id;

        // Multi-tier cloud write with fallback
        let { data: saved, error: upErr } = await sb.from('daily_accounts').upsert(payload, { onConflict: 'business_id,date' }).select().single();
        if (upErr) {
          // If upsert failed due to invalid id or column error, strip id and retry with onConflict on (business_id, date)
          delete payload.id;
          const retryRes = await sb.from('daily_accounts').upsert(payload, { onConflict: 'business_id,date' }).select().single();
          if (!retryRes.error && retryRes.data) saved = retryRes.data;
          else {
            // Fallback if is_checked column is missing in schema: save notes marker
            const safePayload = { business_id: session.businessId, date: recDate, notes: rec.notes };
            const safeRes = await sb.from('daily_accounts').upsert(safePayload, { onConflict: 'business_id,date' }).select().single();
            if (safeRes.data) saved = safeRes.data;
          }
        }
        if (saved && saved.id) rec.id = saved.id;
      } catch(e) { console.error('Cloud checked sync error:', e); }
    })();
  }

  renderTabBody();
};

window.__toggleAccExpand = function(d) {
  if(expandedAccDates.has(d)) expandedAccDates.delete(d);
  else expandedAccDates.add(d);
  renderTabBody();
};

window.__filterAccHistory = function(q) {
  const query = (q||'').trim().toLowerCase();
  const filtered = cache.dailyAccounts.filter(r => r.date.includes(query));
  const listEl = document.getElementById('accHistoryList');
  if(listEl) listEl.innerHTML = renderAccHistoryRows(filtered);
};


/* ---------------- VENDOR PAYMENTS & PURCHASE BILL SCANNER MODULE ---------------- */
let vendorSubTab = 'unpaid'; // 'unpaid' | 'paid' | 'all'
let currentBillPhotoData = '';

window.__setVendorSubTab = function(tab) {
  vendorSubTab = tab;
  renderTabBody();
};


/* Robust fallback helpers for Vendor name, amount, and invoice number */
function getBillAmount(b) {
  if (!b) return 0;
  return Number(b.amount || b.total_amount || b.invoice_amount || b.bill_amount || 0);
}

// Cumulative amount paid so far. Falls back to the old single-payment model
// (status === 'paid' meaning the whole bill was paid) for bills created
// before paid_amount/balance_amount tracking existed.
function getBillPaidAmount(b) {
  if (!b) return 0;
  if (b.paid_amount != null) return Number(b.paid_amount) || 0;
  return b.status === 'paid' ? getBillAmount(b) : 0;
}

function getBillBalanceAmount(b) {
  if (!b) return 0;
  if (b.balance_amount != null) return Math.max(0, Number(b.balance_amount) || 0);
  return Math.max(0, getBillAmount(b) - getBillPaidAmount(b));
}

function getBillStatus(b) {
  if (!b) return 'unpaid';
  const balance = getBillBalanceAmount(b);
  const paid = getBillPaidAmount(b);
  if (balance <= 0 && getBillAmount(b) > 0) return 'paid';
  if (paid > 0 && balance > 0) return 'partial';
  return b.status === 'paid' ? 'paid' : 'unpaid';
}

function getVendorName(b) {
  if (!b) return 'Vendor';
  return (b.vendor_name || b.vendor || b.supplier_name || b.supplier || 'Vendor').trim();
}

function getBillNo(b) {
  if (!b) return 'N/A';
  return (b.bill_no || b.invoice_no || b.bill_number || b.inv_no || 'N/A').trim();
}



/* ---------------- TALLY-STYLE BILL-WISE PRINTABLE RECEIPT ---------------- */
function numberToWords(amount) {
  const num = Math.floor(amount);
  if (num === 0) return 'Zero';
  const a = ['','One ','Two ','Three ','Four ','Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  function inWords(n) {
    if ((n = n.toString()).length > 9) return 'Overflow';
    let n_array = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n_array) return '';
    let str = '';
    str += (n_array[1] != 0) ? (a[Number(n_array[1])] || (b[n_array[1][0]] + ' ' + a[n_array[1][1]])) + 'Crore ' : '';
    str += (n_array[2] != 0) ? (a[Number(n_array[2])] || (b[n_array[2][0]] + ' ' + a[n_array[2][1]])) + 'Lakh ' : '';
    str += (n_array[3] != 0) ? (a[Number(n_array[3])] || (b[n_array[3][0]] + ' ' + a[n_array[3][1]])) + 'Thousand ' : '';
    str += (n_array[4] != 0) ? (a[Number(n_array[4])] || (b[n_array[4][0]] + ' ' + a[n_array[4][1]])) + 'Hundred ' : '';
    str += (n_array[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n_array[5])] || (b[n_array[5][0]] + ' ' + a[n_array[5][1]])) : '';
    return str;
  }
  return inWords(num).trim();
}

window.__printVendorBillReceipt = function(id) {
  const bill = (cache.vendorBills || []).find(b => b.id === id);
  if (!bill) return;

  const vName = getVendorName(bill);
  const vNo = getBillNo(bill);
  const vAmt = getBillAmount(bill);
  const datePretty = new Date(bill.bill_date + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  const paidDatePretty = bill.paid_at ? new Date(bill.paid_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : 'Pending Settlement';
  const staff = cache.staff.find(s => s.id === bill.scanned_by);
  const staffName = staff ? staff.name : 'Staff';

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Payment Voucher - ${esc(vNo)}</title>
      \x3Cstyle\x3E


  /* Global Roboto Mono Font & Uppercase Capitalization Styling */
  body, button, input, select, textarea, h1, h2, h3, h4, .stamp-btn, .section-label, label, .stamp, .stat-card, .row-card, .leaderboard-card, .drawer-item, .bottom-nav button, .sidebar-item, .sidebar-section-title {
    font-family: 'Roboto Mono', monospace, sans-serif !important;
  }

  h1, h2, h3, h4,
  .section-label,
  .stamp-btn,
  .stamp,
  label,
  nav.tabs button,
  .drawer-item,
  .sidebar-item,
  .sidebar-section-title,
  .bottom-nav button,
  .dash-kpi-title,
  .dash-kpi-sub,
  .stat-card .label,
  .row-main h3,
  .kv span,
  .role-pill,
  .owner-fab-item,
  .owner-fab-btn,
  .badge-chip,
  .action-dropdown-menu button,
  table th,
  .modal h2,
  .auth-card h1 {
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

        body { font-family: 'Courier New', Courier, monospace; margin: 30px; color: #111; background: #fff; }
        .voucher-box { border: 2px solid #000; padding: 24px; max-width: 700px; margin: 0 auto; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
        .header h2 { margin: 0; font-size: 1.4rem; text-transform: uppercase; letter-spacing: 1px; }
        .header p { margin: 4px 0 0; font-size: 0.85rem; }
        .v-title { text-align: center; font-weight: bold; font-size: 1.1rem; text-decoration: underline; margin-bottom: 16px; letter-spacing: 2px; }
        .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.95rem; }
        .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .table th, .table td { border: 1px solid #000; padding: 8px 12px; font-size: 0.9rem; text-align: left; }
        .table th { background: #f0f0f0; font-weight: bold; }
        .total-row td { font-weight: bold; font-size: 1rem; }
        .footer-sig { display: flex; justify-content: space-between; margin-top: 50px; font-size: 0.88rem; }
        .sig-box { text-align: center; border-top: 1px solid #000; width: 200px; padding-top: 4px; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      



  /* Top Sync Progress Bar & Floating Badge Pill */
  .sync-progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    width: 0%;
    height: 3px;
    background: linear-gradient(90deg, #F59E0B, #10B981, #0F172A, #F59E0B);
    background-size: 200% 100%;
    z-index: 100000;
    transition: width 0.3s ease, opacity 0.3s ease;
    opacity: 0;
    pointer-events: none;
  }
  .sync-progress-bar.active {
    opacity: 1;
    width: 75%;
    animation: syncProgressPulse 1.5s infinite linear;
  }
  .sync-progress-bar.complete {
    width: 100%;
    opacity: 1;
  }
  @keyframes syncProgressPulse {
    0% { background-position: 0% 0%; }
    100% { background-position: 200% 0%; }
  }

  .sync-badge-pill {
    position: fixed;
    top: 14px;
    right: 16px;
    z-index: 99999;
    font-family: 'Roboto Mono', monospace;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 999px;
    background: #181B20;
    color: #F59E0B;
    border: 1px solid rgba(245, 158, 11, 0.4);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 6px;
    opacity: 0;
    transform: translateY(-8px);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }
  .sync-badge-pill.show {
    opacity: 1;
    transform: translateY(0);
  }


  /* Small Reload Icon Button & Spin Animation */
  .reload-btn {
    border: 1.5px solid var(--paper-line);
    background: var(--card);
    color: var(--ink);
    border-radius: 8px;
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    box-shadow: 0 2px 0 rgba(0,0,0,0.06);
  }
  .reload-btn:hover {
    background: var(--paper);
    border-color: var(--turmeric);
    color: var(--turmeric-dark);
  }
  .reload-btn:active {
    transform: scale(0.92);
    background: var(--paper-line);
  }
  .reload-btn.spinning svg {
    animation: reloadSpin 0.75s linear infinite;
  }
  @keyframes reloadSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Attendance Calendar Grid Responsive Overhaul (Full Desktop View + Mobile Scaled) */
  .att-cal-container {
    width: 100% !important;
    box-sizing: border-box !important;
    background: var(--paper) !important;
    border: 1px solid var(--paper-line) !important;
    border-radius: 12px !important;
    padding: 16px !important;
    margin-bottom: 20px !important;
  }

  .att-cal-grid {
    display: grid !important;
    grid-template-columns: repeat(7, 1fr) !important;
    gap: 8px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  .att-cal-header-cell {
    font-size: 0.75rem !important;
    font-weight: 700 !important;
    text-align: center !important;
    padding: 8px 0 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.04em !important;
  }

  .att-cal-cell {
    background: var(--card) !important;
    border: 1.5px solid var(--paper-line) !important;
    border-radius: 8px !important;
    padding: 8px 10px !important;
    min-height: 82px !important;
    cursor: pointer !important;
    transition: all 0.18s ease !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    box-sizing: border-box !important;
    width: 100% !important;
  }

  .att-cal-cell:hover {
    border-color: var(--turmeric) !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.06) !important;
    transform: translateY(-1px) !important;
  }

  .att-cal-cell.is-today {
    border-color: var(--turmeric) !important;
    box-shadow: 0 0 0 2.5px rgba(234, 179, 8, 0.35) !important;
    background: var(--paper) !important;
  }

  .att-cal-badge {
    font-size: 0.70rem !important;
    font-weight: 700 !important;
    padding: 3px 6px !important;
    border-radius: 4px !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 4px !important;
  }

  /* Attendance Indicator Line Track (Uniform 5-6px Straight Bar with Fully Rounded Ends) */
  .att-cal-indicator-track {
    width: 100% !important;
    height: 5px !important;
    background: var(--paper-line) !important;
    border-radius: 999px !important;
    overflow: hidden !important;
    display: flex !important;
    align-items: center !important;
    flex-shrink: 0 !important;
    margin-top: auto !important;
    box-sizing: border-box !important;
  }

  /* Mobile Responsiveness & Layout Alignment Overhaul */
  @media (max-width: 640px) {
    .att-cal-container {
      padding: 6px 4px !important;
      border-radius: 8px !important;
    }
    .att-cal-grid {
      gap: 2px !important;
    }
    .att-cal-header-cell {
      font-size: 0.50rem !important;
      padding: 2px 0 !important;
    }
    .att-cal-cell {
      padding: 2px 3px !important;
      min-height: 40px !important;
      border-radius: 4px !important;
      border-width: 1px !important;
    }
    .att-cal-cell b {
      font-size: 0.65rem !important;
    }
    .att-cal-badge {
      font-size: 0.46rem !important;
      padding: 1px 2px !important;
      border-radius: 3px !important;
    }
    .att-cal-indicator-track {
      height: 4px !important;
      margin-top: 2px !important;
    }
  }

  @media (max-width: 480px) {
    .att-cal-container {
      padding: 4px 2px !important;
      border-radius: 6px !important;
    }
    .att-cal-grid {
      gap: 2px !important;
    }
    .att-cal-header-cell {
      font-size: 0.46rem !important;
      padding: 2px 0 !important;
    }
    .att-cal-cell {
      padding: 2px 2px !important;
      min-height: 36px !important;
      border-radius: 4px !important;
      border-width: 1px !important;
    }
    .att-cal-cell b {
      font-size: 0.60rem !important;
    }
    .att-cal-badge {
      font-size: 0.42rem !important;
      padding: 0px 2px !important;
      letter-spacing: -0.02em !important;
    }
    .att-cal-indicator-track {
      height: 3px !important;
      margin-top: 1px !important;
    }
    .wrap {
      padding: 12px 8px 140px !important;
    }
    header.top {
      padding: 10px 8px 6px !important;
      gap: 4px !important;
    }
    .header-title-area h1 {
      font-size: 0.85rem !important;
    }
    .section-label {
      font-size: 0.7rem !important;
      margin-bottom: 6px !important;
    }
    .pinned-target-card {
      padding: 8px 10px !important;
      margin-bottom: 12px !important;
      border-radius: 10px !important;
    }
    .pinned-target-title {
      font-size: 0.60rem !important;
      letter-spacing: 0.01em !important;
      line-height: 1.15 !important;
    }
    .pinned-target-sub {
      font-size: 0.54rem !important;
      margin-top: 1px !important;
    }
    .pinned-target-amount {
      font-size: 0.70rem !important;
    }
    .pinned-target-pct {
      font-size: 0.54rem !important;
    }
    .pinned-target-status {
      font-size: 0.54rem !important;
    }
    .pinned-target-btn {
      font-size: 0.54rem !important;
      padding: 2px 6px !important;
    }
    .pinned-target-icon-box {
      width: 24px !important;
      height: 24px !important;
      border-radius: 5px !important;
    }
    .pinned-target-icon-box svg {
      width: 12px !important;
      height: 12px !important;
    }
    .row-card {
      padding: 8px 8px !important;
      gap: 4px !important;
      border-radius: 8px !important;
    }
    .row-card h3, .row-card b {
      font-size: 0.76rem !important;
    }
    .stat-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 6px !important;
    }
    .stat-card {
      padding: 6px 6px !important;
    }
    .stat-card .num {
      font-size: clamp(0.78rem, 3.5vw, 0.95rem) !important;
    }
    .stat-card .label {
      font-size: 0.62rem !important;
    }
    .modal {
      max-width: min(520px, calc(100vw - 16px)) !important;
      padding: 14px 12px !important;
      max-height: 88vh !important;
      overflow-y: auto !important;
      border-radius: 12px !important;
    }
    .stamp-btn {
      padding: 6px 10px !important;
      font-size: 0.72rem !important;
    }
    .stamp-btn.small {
      padding: 2px 5px !important;
      font-size: 0.62rem !important;
    }
    table {
      font-size: 0.68rem !important;
    }
    th, .table th {
      padding: 4px 6px !important;
      font-size: 0.60rem !important;
      letter-spacing: 0.01em !important;
    }
    td, .table td {
      padding: 4px 6px !important;
      font-size: 0.65rem !important;
    }
    td b, th b {
      font-size: 0.68rem !important;
    }
  }

  @media (max-width: 768px) {
    table {
      font-size: 0.70rem !important;
    }
    th, .table th {
      padding: 5px 6px !important;
      font-size: 0.62rem !important;
      letter-spacing: 0.01em !important;
    }
    td, .table td {
      padding: 5px 6px !important;
      font-size: 0.68rem !important;
    }
    td b, th b {
      font-size: 0.70rem !important;
    }
  }

  .due-badge-overdue {
    background: var(--blue-soft);
    color: var(--turmeric);
    border: 1px solid var(--turmeric);
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .due-badge-warning {
    background: var(--blue-soft);
    color: var(--turmeric-dark);
    border: 1px solid var(--turmeric);
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }


  /* Compact Card Density Mode (8-10 Items / Screen) */
  .compact-density .row-card {
    padding: 8px 10px !important;
    margin-bottom: 6px !important;
    gap: 6px !important;
    border-radius: 8px !important;
  }
  .compact-density .row-main h3 {
    font-size: 0.85rem !important;
    margin-bottom: 1px !important;
  }
  .compact-density .row-main .meta {
    font-size: 0.68rem !important;
    margin-bottom: 1px !important;
  }
  .compact-density .row-main .notes {
    display: none !important;
  }
  .compact-density .stamp {
    font-size: 0.58rem !important;
    padding: 2px 6px !important;
  }
  .compact-density .stamp-btn {
    padding: 5px 8px !important;
    font-size: 0.7rem !important;
  }




\x3C/style\x3E
    </head>

    <body>
      <div class="no-print" style="margin-bottom:16px;text-align:right;">
        <button onclick="window.print()" style="padding:8px 16px;font-size:1rem;font-weight:bold;cursor:pointer;">Print Receipt / Voucher</button>
      </div>

      <div class="voucher-box">
        <div class="header">
          <h2>${esc(session.businessName)}</h2>
          <p>Official Purchase & Vendor Payment Receipt (Tally Format)</p>
        </div>

        <div class="v-title">PAYMENT VOUCHER</div>

        <div class="row">
          <span>Voucher No: <b>VCH-${bill.id.slice(-6).toUpperCase()}</b></span>
          <span>Date: <b>${datePretty}</b></span>
        </div>

        <div class="row">
          <span>Paid To (Party Name): <b>${esc(vName)}</b></span>
          <span>Status: <b>${bill.status === 'paid' ? 'PAID / SETTLED' : 'UNPAID / PAYABLE'}</b></span>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Particulars / Bill Ref</th>
              <th>Bill Date</th>
              <th>Due Date</th>
              <th style="text-align:right;">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Bill No: <b>${esc(vNo)}</b><br>
                <small>Logged by: ${esc(staffName)} ${bill.notes ? ' | ' + esc(bill.notes) : ''}</small>
              </td>
              <td>${datePretty}</td>
              <td>${bill.due_date || 'N/A'}</td>
              <td style="text-align:right;font-weight:bold;">₹${vAmt.toFixed(2)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3" style="text-align:right;">Total Settlement Amount:</td>
              <td style="text-align:right;">₹${vAmt.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div style="font-size:0.85rem;margin-top:12px;">
          <b>Amount in words:</b> Rupees ${numberToWords(vAmt)} Only
        </div>
        ${bill.paid_at ? `<div style="font-size:0.8rem;color:#444;margin-top:4px;">Settled on: ${paidDatePretty}</div>` : ''}

        <div class="footer-sig">
          <div class="sig-box">Receiver Signature</div>
          <div class="sig-box">Authorized Signatory</div>
        </div>
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
};



/* ---------------- BULK VENDOR BILL PAYMENT FEATURE ---------------- */
window.__selectedVendorBillIds = new Set();

window.__toggleVendorBillSelection = function(id) {
  if (window.__selectedVendorBillIds.has(id)) {
    window.__selectedVendorBillIds.delete(id);
  } else {
    window.__selectedVendorBillIds.add(id);
  }
  window.__updateBulkVendorSummary();
};

window.__toggleSelectAllUnpaidVendorBills = function(masterCb) {
  const unpaid = (cache.vendorBills || []).filter(b => b.status !== 'paid');
  if (masterCb.checked) {
    unpaid.forEach(b => window.__selectedVendorBillIds.add(b.id));
  } else {
    window.__selectedVendorBillIds.clear();
  }
  renderTabBody();
};

window.__updateBulkVendorSummary = function() {
  const selectedCount = window.__selectedVendorBillIds.size;
  const bills = cache.vendorBills || [];
  const selectedBills = bills.filter(b => window.__selectedVendorBillIds.has(b.id));
  const totalAmt = selectedBills.reduce((sum, b) => sum + getBillAmount(b), 0);

  const summaryEl = document.getElementById('vBillBulkSummaryArea');
  if (summaryEl) {
    summaryEl.innerHTML = selectedCount > 0 ? `
      <div style="background:var(--blue-soft);border:1.5px solid var(--turmeric);padding:10px 14px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <b style="font-size:0.9rem;color:var(--turmeric-dark);">${selectedCount} Bill${selectedCount!==1?'s':''} Selected for Bulk Settlement</b>
          <div style="font-size:0.75rem;color:var(--ink-soft);">Total Selected Amount: ₹${totalAmt.toFixed(0)}</div>
        </div>
        <button class="stamp-btn" style="background:var(--turmeric);color:#fff;border-color:var(--turmeric);font-weight:700;padding:8px 14px;" onclick="window.__paySelectedVendorBillsBulk()">💳 Pay ${selectedCount} Bill${selectedCount!==1?'s':''} (₹${totalAmt.toFixed(0)})</button>
      </div>
    ` : '';
  }
};

window.__paySelectedVendorBillsBulk = async function() {
  const selectedIds = Array.from(window.__selectedVendorBillIds);
  if (!selectedIds.length) {
    alert('Please select at least one unpaid bill to settle.');
    return;
  }

  const bills = cache.vendorBills || [];
  const selectedBills = bills.filter(b => selectedIds.includes(b.id));
  const totalAmt = selectedBills.reduce((sum, b) => sum + getBillAmount(b), 0);

  if (!confirm(`Are you sure you want to mark ${selectedIds.length} vendor bill(s) totaling ₹${totalAmt.toFixed(0)} as PAID?`)) {
    return;
  }

  // 1. Instantly update local cache (0ms delay)
  const nowIso = new Date().toISOString();
  selectedBills.forEach(b => {
    b.status = 'paid';
    b.paid_at = nowIso;
    b.paid_by = session.staffId;
  });

  window.__selectedVendorBillIds.clear();
  logAuditEvent('Bulk Vendor Bills Paid', `Verified & paid ${selectedBills.length} bills totaling ₹${totalAmt.toFixed(0)}`);
  triggerAppNotification('Bulk Bills Paid', `Paid ${selectedBills.length} vendor bills (₹${totalAmt.toFixed(0)})`);
  if (typeof window.showToast === 'function') {
    window.showToast(`Paid ${selectedBills.length} vendor bills totaling ₹${totalAmt.toFixed(0)}!`, 'success');
  }

  renderTabBody(); // Instant UI re-render

  // 2. Perform Supabase DB write in background
  if (typeof sb !== 'undefined' && session.businessId) {
    for (const b of selectedBills) {
      if (b.id && !b.id.startsWith('loc_')) {
        Promise.resolve(sb.from('vendor_bills').update({ status: 'paid', paid_at: nowIso, paid_by: session.staffId }).eq('id', b.id)).catch(()=>{});
      }
    }
  }
};


function renderVendorBillsTab(body) {
  const bills = cache.vendorBills || [];
  const unpaid = bills.filter(b => getBillStatus(b) !== 'paid');
  const paid = bills.filter(b => getBillStatus(b) === 'paid');
  const partial = bills.filter(b => getBillStatus(b) === 'partial');

  const totalUnpaidBalance = unpaid.reduce((sum, b) => sum + getBillBalanceAmount(b), 0);
  const totalPaid = paid.reduce((sum, b) => sum + getBillAmount(b), 0);

  const overdueList = bills.filter(b => getBillStatus(b) !== 'paid' && b.due_date && (new Date(b.due_date + 'T23:59:59').getTime() < new Date().getTime()));
  const displayList = vendorSubTab === 'unpaid' ? unpaid : (vendorSubTab === 'overdue' ? overdueList : (vendorSubTab === 'paid' ? paid : bills));

  body.innerHTML = `
    <!-- Top Summary Banner Card -->
    <div class="row-card" style="flex-direction:column;align-items:stretch;background:linear-gradient(135deg, var(--paper), var(--card));border:1.5px solid var(--turmeric);margin-bottom:14px;padding:16px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div>
          <span style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);letter-spacing:0.04em;text-transform:uppercase;">Total Outstanding Balance</span>
          <h2 style="font-family:'Roboto Mono',monospace;font-size:1.6rem;font-weight:800;color:var(--turmeric);margin:4px 0 0;">₹${totalUnpaidBalance.toLocaleString('en-IN')}</h2>
          <div style="font-size:0.78rem;color:var(--ink-soft);margin-top:2px;">${unpaid.length} Pending Bills (${partial.length} Partially Paid)</div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:0.72rem;font-weight:600;color:var(--turmeric);display:block;">Settled Bills Total</span>
          <b style="font-family:'Roboto Mono',monospace;font-size:1.1rem;color:var(--turmeric);">₹${totalPaid.toLocaleString('en-IN')}</b>
        </div>
      </div>

      <div style="margin-top:14px;display:flex;gap:8px;">
        <button class="stamp-btn" style="flex:1;padding:12px 0;font-size:0.9rem;" onclick="window.__openScanVendorBillModal()">➕ Add Purchase Bill</button>
        <button class="stamp-btn" style="flex:1;padding:12px 0;font-size:0.9rem;background:var(--turmeric);color:#fff;border-color:var(--turmeric);" onclick="window.__openBulkVendorSettlementModal()">💳 Bulk Pay & Voucher</button>
      </div>
    </div>

    <!-- Bulk Payment Summary Action Area -->
    <div id="vBillBulkSummaryArea"></div>

    <!-- Navigation Sub-Menu Bar & Select All Toggle -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
      <div style="display:flex;gap:6px;overflow-x:auto;">
        <button class="stamp-btn small ${vendorSubTab==='unpaid'?'':'ghost'}" onclick="window.__setVendorSubTab('unpaid')">Unpaid Bills (${unpaid.length})</button>
        <button class="stamp-btn small ${vendorSubTab==='overdue'?'':'ghost'}" style="${vendorSubTab==='overdue'?'background:var(--turmeric);color:#fff;border-color:var(--turmeric);':''}" onclick="window.__setVendorSubTab('overdue')">Overdue (${bills.filter(b => getBillStatus(b)!=='paid' && b.due_date && (new Date(b.due_date+'T23:59:59').getTime() < new Date().getTime())).length})</button>
        <button class="stamp-btn small ${vendorSubTab==='paid'?'':'ghost'}" onclick="window.__setVendorSubTab('paid')">Paid History (${paid.length})</button>
        <button class="stamp-btn small ${vendorSubTab==='all'?'':'ghost'}" onclick="window.__setVendorSubTab('all')">All Bills (${bills.length})</button>
        <button class="stamp-btn small ${isCompactView?'':'ghost'}" onclick="window.__toggleCompactView()">${isCompactView?'📄 Compact':'📋 Detailed'}</button>
      </div>

      ${(isOwner() && unpaid.length > 0 && vendorSubTab !== 'paid') ? `
        <label style="font-size:0.82rem;font-weight:700;color:var(--turmeric-dark);display:flex;align-items:center;gap:6px;cursor:pointer;margin:0;">
          <input type="checkbox" onchange="window.__toggleSelectAllUnpaidVendorBills(this)" ${unpaid.every(b => window.__selectedVendorBillIds.has(b.id)) ? 'checked' : ''}> Select All Unpaid Bills
        </label>
      ` : ''}
    </div>

    <!-- Bills List -->
    <div class="section-label">${vendorSubTab==='unpaid'?'Pending Unpaid Bills Payable':'Bill History'} (${displayList.length})</div>
    ${displayList.length ? displayList.map(renderVendorBillCard).join('') : `<div class="empty">No ${vendorSubTab} vendor bills found.</div>`}
    
    <div id="vendorModalHolder"></div>`;
}

function renderVendorBillCard(b) {
  const st = getBillStatus(b);
  const isPaid = st === 'paid';
  const isPartial = st === 'partial';
  const staff = cache.staff.find(s => s.id === b.scanned_by);
  const staffNameVal = staff ? staff.name : (b.scanned_by || 'Staff');
  const datePretty = new Date(b.bill_date + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  const duePretty = b.due_date ? new Date(b.due_date + 'T00:00:00').toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : 'None';

  let dueBadgeHtml = '';
  if (!isPaid && b.due_date) {
    const dueTime = new Date(b.due_date + 'T23:59:59').getTime();
    const nowTime = new Date().getTime();
    const daysLeft = Math.ceil((dueTime - nowTime) / (86400 * 1000));
    if (daysLeft < 0) {
      dueBadgeHtml = `<span class="due-badge-overdue">⚠️ ${Math.abs(daysLeft)}d Overdue</span>`;
    } else if (daysLeft <= 3) {
      dueBadgeHtml = `<span class="due-badge-warning">⏰ Due in ${daysLeft}d</span>`;
    }
  }

  const amt = getBillAmount(b);
  const paidAmt = getBillPaidAmount(b);
  const balance = getBillBalanceAmount(b);

  const statusStampText = isPaid ? 'PAID' : (isPartial ? 'PARTIALLY PAID' : 'UNPAID');
  const statusStampClass = isPaid ? 'done' : (isPartial ? 'medium' : 'pending');
  const borderLeftColor = isPaid ? 'var(--turmeric)' : (isPartial ? 'var(--turmeric)' : 'var(--turmeric)');

  return `
    <div class="row-card" style="flex-direction:column;align-items:stretch;padding:14px 16px;margin-bottom:12px;border-left:4px solid ${borderLeftColor};">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div style="display:flex;gap:10px;align-items:center;">
          ${(!isPaid && isOwner()) ? `
            <input type="checkbox" style="width:18px;height:18px;cursor:pointer;flex-shrink:0;" ${window.__selectedVendorBillIds.has(b.id)?'checked':''} onchange="window.__toggleVendorBillSelection('${b.id}')">
          ` : ''}
          ${b.photo_url ? `
            <div style="width:54px;height:54px;border-radius:8px;overflow:hidden;background:#000;flex-shrink:0;cursor:pointer;border:1px solid var(--paper-line);" onclick="window.__viewVendorBillPhoto('${b.id}')">
              <img src="${b.photo_url}" style="width:100%;height:100%;object-fit:cover;">
            </div>
          ` : `
            <div style="width:46px;height:46px;border-radius:8px;background:var(--paper-line);display:flex;align-items:center;justify-content:center;color:var(--ink-soft);font-size:1.2rem;flex-shrink:0;">
              🧾
            </div>
          `}
          <div>
            <b style="font-size:1rem;color:var(--ink);display:block;margin-bottom:2px;font-family:'Roboto Mono',monospace;">${esc(getVendorName(b))}</b>
            <div style="font-size:0.78rem;color:var(--ink-soft);font-family:'Roboto Mono',monospace;">
              Bill No: <b>#${esc(getBillNo(b))}</b> &bull; Date: ${datePretty}
            </div>
            <div style="font-size:0.72rem;color:var(--ink-soft);margin-top:2px;">
              Scanned by: <b>${esc(staffNameVal)}</b> ${b.due_date ? `&bull; Due: <span style="color:var(--turmeric);font-weight:600;">${duePretty}</span> ${dueBadgeHtml}` : ''}
            </div>
          </div>
        </div>
        
        <div style="text-align:right;flex-shrink:0;">
          <span class="stamp ${statusStampClass}" style="margin-bottom:4px;display:inline-block;">${statusStampText}</span>
          <div style="font-family:'Roboto Mono',monospace;font-size:0.95rem;font-weight:700;color:var(--ink);">
            Bill: <b>₹${amt.toLocaleString('en-IN')}</b>
          </div>
          <div style="font-family:'Roboto Mono',monospace;font-size:0.78rem;color:var(--turmeric);">
            Paid: ₹${paidAmt.toLocaleString('en-IN')}
          </div>
          <div style="font-family:'Roboto Mono',monospace;font-size:0.82rem;font-weight:700;color:${balance>0?'var(--turmeric)':'var(--turmeric)'};">
            Balance: ₹${balance.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px dashed var(--paper-line);">
        <div style="display:flex;gap:6px;align-items:center;">
          ${!isPaid ? `
            <button class="stamp-btn small" style="background:var(--turmeric);color:#fff;border:none;font-weight:700;" onclick="window.__openRecordPaymentModal('${b.id}')">💳 Pay Now</button>
          ` : ''}
          <button class="stamp-btn small ghost" onclick="window.__openVendorPaymentHistoryModal('${b.id}')">📜 History</button>
        </div>

        <div class="action-dropdown-holder">
          <button class="action-more-btn" onclick="window.__toggleActionMenu(event, '${b.id}')">More ▾</button>
          <div class="action-dropdown-menu" id="actionMenu_${b.id}">
            <button onclick="window.__openVendorLedgerModal('${esc(getVendorName(b))}')">📊 Statement</button>
            ${b.photo_url ? `<button onclick="window.__viewVendorBillPhoto('${b.id}')">👁 View Photo</button>` : ''}
            <button onclick="window.__showPaymentVoucherModal({vendorName:'${esc(getVendorName(b))}', bills:[cache.vendorBills.find(x=>x.id==='${b.id}')], totalAmount:${amt}, paymentMode:'Cash'})">🖨 Print Voucher</button>
            ${(isPaid || isPartial) && isOwner() ? `<button onclick="window.__revertVendorBillToUnpaid('${b.id}')">↩ Move to Unpaid</button>` : ''}
            ${isOwner() ? `<button class="danger" onclick="window.__deleteVendorBill('${b.id}')">🗑 Delete</button>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

window.__revertVendorBillToUnpaid = async function(billId) {
  const b = (cache.vendorBills || []).find(x => x.id === billId);
  if (!b) return;

  const paidSoFar = getBillPaidAmount(b);
  const ok = confirm(
    `Move this bill back to UNPAID?\n\n` +
    `This clears the ₹${paidSoFar.toLocaleString('en-IN')} recorded as paid and deletes its ` +
    `payment history entries — use this if it was marked paid by mistake.\n\n` +
    `This cannot be undone.`
  );
  if (!ok) return;

  // Find the payment transactions tied to this bill so we can remove them too —
  // otherwise the History popup would still show old payments for a bill that
  // now says nothing has been paid.
  const vendorName = getVendorName(b);
  const billNo = getBillNo(b);
  const relatedPayments = (cache.vendorPayments || []).filter(p => p.bill_id === b.id || (p.vendor_name === vendorName && p.bill_no === billNo));

  b.paid_amount = 0;
  b.balance_amount = getBillAmount(b);
  b.status = 'pending';
  b.paid_at = null;
  b.paid_by = null;

  cache.vendorPayments = (cache.vendorPayments || []).filter(p => !relatedPayments.includes(p));

  showLoading();
  try {
    localStorage.setItem('br_vendor_bills_' + session.businessId, JSON.stringify(cache.vendorBills));
    localStorage.setItem('br_vendor_payments_' + session.businessId, JSON.stringify(cache.vendorPayments));

    if (typeof sb !== 'undefined' && !String(b.id).startsWith('loc_')) {
      await sb.from('vendor_bills').update({
        paid_amount: 0,
        balance_amount: getBillAmount(b),
        status: 'pending',
        paid_at: null,
        paid_by: null
      }).eq('id', b.id);

      for (const p of relatedPayments) {
        Promise.resolve(sb.from('vendor_payments').delete().eq('id', p.id)).catch(()=>{});
      }
    }
  } catch(e) {
    console.warn('Revert-to-unpaid cloud save exception:', e);
    if (typeof queueOfflineMutation === 'function') {
      queueOfflineMutation('update', 'vendor_bills', { id: b.id, paid_amount: 0, balance_amount: getBillAmount(b), status: 'pending', paid_at: null, paid_by: null });
    }
  } finally {
    hideLoading();
  }

  logAuditEvent('Vendor Bill Reverted to Unpaid', `Moved Bill #${billNo} (${vendorName}) back to Unpaid — cleared ₹${paidSoFar} recorded payment`);
  window.showToast(`↩ Bill moved back to Unpaid`, 'success');
  renderTabBody();
};

window.__closeVendorModal = function() {
  const holder = getModalHolder('taskModalHolder');
  if (holder) holder.innerHTML = '';
};


window.__openScanVendorBillModal = function() {
  const holder = getModalHolder('taskModalHolder');

  // Compute 15-day default due date
  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 15);
  const dueStr = localDateStr(defaultDue);

  holder.innerHTML = `
  <div class="overlay show"><div class="modal" style="max-width:440px;">
    <h2>🧾 Add Purchase Bill</h2>

    <label>Vendor / Supplier Name</label>
    ${(cache.vendorBills && cache.vendorBills.length > 0) ? `
      <select id="vBillVendorSelect" onchange="if(this.value){ document.getElementById('vBillVendor').value = this.value; }" style="margin-bottom:6px;font-size:0.85rem;">
        <option value="">-- Choose Existing Vendor --</option>
        ${Array.from(new Set(cache.vendorBills.map(getVendorName).filter(Boolean))).map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}
      </select>
    ` : ''}
    <input id="vBillVendor" list="vendorPartyDatalist" placeholder="e.g. Modern Garments Wholesalers" style="width:100%;">
    <datalist id="vendorPartyDatalist">
      ${getVendorPartiesList().map(v => `<option value="${esc(v)}"></option>`).join('')}
    </datalist>

    <div class="two-col">
      <div>
        <label>Purchase Bill No</label>
        <input id="vBillNo" placeholder="e.g. INV-8891">
      </div>
      <div>
        <label>Bill Amount (₹)</label>
        <input type="number" step="0.01" id="vBillAmount" placeholder="e.g. 12500">
      </div>
    </div>

    <div class="two-col">
      <div>
        <label>Bill Date</label>
        <input type="date" id="vBillDate" value="${todayStr()}">
      </div>
      <div>
        <label>Payment Due Date</label>
        <input type="date" id="vBillDueDate" value="${dueStr}">
      </div>
    </div>

    <label>Notes / Order Details</label>
    <textarea id="vBillNotes" placeholder="Optional supplier notes or item details..."></textarea>

    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closeVendorModal()">Cancel</button>
      <button class="stamp-btn" style="background:var(--turmeric);color:white;" onclick="window.__saveVendorBill()">💾 Save Purchase Bill</button>
    </div>
  </div></div>`;

  setTimeout(() => {
    const vEl = document.getElementById('vBillVendor');
    if (vEl) vEl.focus();
  }, 150);
};


/* ---------------- AI OCR PURCHASE BILL TEXT PARSER ---------------- */
function parseExtractedBillText(rawText) {
  if (!rawText) return;
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // 1. Extract Vendor Name (first prominent non-generic line)
  let vendorName = '';
  const genericKeywords = ['invoice', 'bill', 'cash', 'memo', 'tax', 'receipt', 'date', 'total', 'amount', 'gstin', 'phone', 'address', 'original'];
  for (let line of lines) {
    const lower = line.toLowerCase();
    if (!genericKeywords.some(k => lower.includes(k)) && line.length >= 3 && /[a-zA-Z]/.test(line)) {
      vendorName = line.replace(/[^a-zA-Z0-9\s&.-]/g, '').trim();
      break;
    }
  }

  // 2. Extract Invoice / Bill Number
  let billNo = '';
  const invMatch = rawText.match(/(?:inv|invoice|bill|no|no\.|code|ref)[\s#:-]*([A-Z0-9\/-]{3,20})/i);
  if (invMatch && invMatch[1] && invMatch[1].length >= 3) {
    billNo = invMatch[1].trim();
  }

  // 3. Smart Extract Total Amount (₹) with Phone/GSTIN Noise Filtering
  let amount = 0;
  const amountsFound = [];
  const amountRegex = /(?:total|net|amount|rs\.?|inr|₹|payable|due|grand)[\s:-]*[₹rRsS\.]*[\s]*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/gi;
  let match;
  while ((match = amountRegex.exec(rawText)) !== null) {
    if (match[1]) {
      const numStr = match[1].replace(/,/g, '');
      const val = parseFloat(numStr);
      // Filter out phone numbers (10 digits starting 6-9), pin codes (6 digits), GSTIN numbers
      const isPhoneNumber = /^[6-9]\d{9}$/.test(numStr);
      const isPinCode = /^\d{6}$/.test(numStr) && val > 100000;
      if (!isNaN(val) && val > 0 && val < 1000000 && !isPhoneNumber && !isPinCode) {
        amountsFound.push(val);
      }
    }
  }
  if (amountsFound.length > 0) {
    amount = Math.max(...amountsFound);
  }

  // 4. Extract Date
  let billDate = '';
  const dateMatch = rawText.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
  if (dateMatch) {
    const d = parseInt(dateMatch[1], 10);
    const m = parseInt(dateMatch[2], 10);
    let y = parseInt(dateMatch[3], 10);
    if (y < 100) y += 2000;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      billDate = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
  }

  // Auto-populate detected fields into modal form
  const vendorEl = document.getElementById('vBillVendor');
  if (vendorEl && vendorName) vendorEl.value = vendorName;

  const billNoEl = document.getElementById('vBillNo');
  if (billNoEl && billNo) billNoEl.value = billNo;

  const amountEl = document.getElementById('vBillAmount');
  if (amountEl && amount > 0) amountEl.value = amount;

  const dateEl = document.getElementById('vBillDate');
  if (dateEl && billDate) dateEl.value = billDate;

  const area = document.getElementById('vBillPhotoArea');
  if (area) {
    area.innerHTML = `<span style="font-size:0.8rem;color:var(--turmeric);font-weight:700;">✨ AI OCR Scan Complete! Detected ${amount > 0 ? '₹'+amount : ''} ${billNo ? '#'+billNo : ''}</span>`;
  }

  if (typeof window.showToast === 'function') {
    window.showToast(`✨ OCR Scanned: ${amount > 0 ? '₹'+amount : 'Details Auto-Detected'}!`, 'success');
  }
}

function runBillOCRScan(imageSrc) {
  const area = document.getElementById('vBillPhotoArea');
  if (area) {
    area.innerHTML = '<span style="font-size:0.82rem;color:var(--turmeric-dark);font-weight:700;">🔍 AI OCR Scanning Bill Text... Please wait.</span>';
  }

  if (typeof Tesseract !== 'undefined') {
    Tesseract.recognize(imageSrc, 'eng')
      .then(({ data: { text } }) => {
        parseExtractedBillText(text);
      })
      .catch(() => {
        if (area) area.innerHTML = '<span style="font-size:0.8rem;color:var(--turmeric);font-weight:700;">✓ Bill Photo Attached & Details Auto-Filled!</span>';
      });
  }
}


window.__handleBillPhotoSelected = function(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
      currentBillPhotoData = e.target.result;
      const img = document.getElementById('vBillPreviewImg');
      const area = document.getElementById('vBillPhotoArea');
      if (img) {
        img.src = currentBillPhotoData;
        img.style.display = 'block';
      }
      if (area) {
        area.innerHTML = '<span style="font-size:0.8rem;color:var(--turmeric);font-weight:700;">✓ Bill Photo Attached & Details Auto-Filled!</span>';
      }

      // Auto-fill Bill Number if empty
      const billNoEl = document.getElementById('vBillNo');
      if (billNoEl && !billNoEl.value) {
        const d = new Date();
        const autoNo = 'INV-' + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0') + '-' + Math.floor(10 + Math.random() * 90);
        billNoEl.value = autoNo;
      }

      // Auto-fill Payment Due Date (15-day default credit)
      const dueDateEl = document.getElementById('vBillDueDate');
      if (dueDateEl && !dueDateEl.value) {
        const d = new Date();
        d.setDate(d.getDate() + 15);
        dueDateEl.value = localDateStr(d);
      }

      // Auto-fill recent vendor if available
      const vendorEl = document.getElementById('vBillVendor');
      if (vendorEl && !vendorEl.value && cache.vendorBills && cache.vendorBills.length > 0) {
        vendorEl.value = cache.vendorBills[0].vendor_name;
      }

      // Auto-focus Amount input for 1-tap entry
      const amountEl = document.getElementById('vBillAmount');
      if (amountEl) {
        setTimeout(() => { amountEl.focus(); }, 150);
      }

      // Run AI OCR Text Scan on the photo
      runBillOCRScan(currentBillPhotoData);
    };
    reader.readAsDataURL(file);
  }
};

function compressImageBase64(dataUrl, maxDimension = 600, quality = 0.5) {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl || '');
      return;
    }
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

window.__saveVendorBill = async function() {
  const vendor_name = document.getElementById('vBillVendor') ? document.getElementById('vBillVendor').value.trim() : '';
  const raw_bill_no = document.getElementById('vBillNo') ? document.getElementById('vBillNo').value.trim() : '';
  const amount = Number(document.getElementById('vBillAmount') ? document.getElementById('vBillAmount').value : 0);
  const bill_date = document.getElementById('vBillDate') ? document.getElementById('vBillDate').value : todayStr();
  const due_date = document.getElementById('vBillDueDate') ? document.getElementById('vBillDueDate').value : '';
  const notes = document.getElementById('vBillNotes') ? document.getElementById('vBillNotes').value.trim() : '';

  if (!vendor_name) {
    alert('Please enter Vendor / Supplier Name.');
    return;
  }
  if (!amount || amount <= 0) {
    alert('Please enter a valid Bill Amount (₹).');
    return;
  }

  // Auto-generate Bill Number if not provided
  const bill_no = raw_bill_no || ('INV-' + bill_date.replace(/-/g,'') + '-' + Math.floor(100 + Math.random() * 900));

  if (vendor_name) {
    if (!cache.vendorParties) cache.vendorParties = [];
    if (!cache.vendorParties.includes(vendor_name)) {
      cache.vendorParties.push(vendor_name);
      try { localStorage.setItem('br_vendor_parties_' + session.businessId, JSON.stringify(cache.vendorParties)); } catch(e){}
    }
  }

  showLoading();
  let compressedPhoto = '';
  if (currentBillPhotoData) {
    compressedPhoto = await compressImageBase64(currentBillPhotoData, 600, 0.5);
  }

  const billObj = {
    id: 'vbill_' + Date.now() + '_' + Math.random().toString(36).substring(2,6),
    business_id: session.businessId,
    vendor_name: vendor_name,
    bill_no: bill_no,
    amount: amount,
    paid_amount: 0,
    balance_amount: amount,
    bill_date: bill_date,
    due_date: due_date || null,
    notes: notes || '',
    photo_url: compressedPhoto || '',
    scanned_by: session.staffId,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  // 1. Instant local update (0ms delay)
  if (!cache.vendorBills) cache.vendorBills = [];
  cache.vendorBills.unshift(billObj);
  try { localStorage.setItem('br_vendor_bills_' + session.businessId, JSON.stringify(cache.vendorBills)); } catch(e){}

  // 2. Cross-Device Cloud Sync Payload
  if (typeof syncCustomCloudPayload === 'function') {
    syncCustomCloudPayload('[VENDOR_BILLS_DATA]', cache.vendorBills);
  }

  // 3. Supabase Cloud Table Save (background clean insert)
  const cleanDbPayload = {
    business_id: session.businessId,
    vendor_name: vendor_name,
    bill_no: bill_no,
    amount: amount,
    bill_date: bill_date,
    due_date: due_date || null,
    notes: notes || '',
    photo_url: compressedPhoto || '',
    scanned_by: session.staffId,
    status: 'pending'
  };

  if (navigator.onLine && typeof sb !== 'undefined') {
    (async function() {
      try {
        const { data, error } = await sb.from('vendor_bills').insert(cleanDbPayload).select().single();
        if (data && data.id) {
          billObj.id = data.id;
          try { localStorage.setItem('br_vendor_bills_' + session.businessId, JSON.stringify(cache.vendorBills)); } catch(e){}
        } else if (error) {
          console.warn('Supabase vendor_bills insert notice:', error);
          queueOfflineMutation('insert', 'vendor_bills', cleanDbPayload);
        }
      } catch(err){
        console.warn('Supabase vendor_bills insert background notice:', err);
        queueOfflineMutation('insert', 'vendor_bills', cleanDbPayload);
      }
    })();
  } else {
    queueOfflineMutation('insert', 'vendor_bills', cleanDbPayload);
  }


  currentBillPhotoData = ''; // Reset photo buffer
  hideLoading();
  getModalHolder('taskModalHolder').innerHTML = '';
  logAuditEvent('Vendor Bill Scanned', `Saved Bill #${bill_no} for ₹${amount} from ${vendor_name}`);
  triggerAppNotification('Bill Logged', `Vendor bill of ₹${amount} saved`);
  window.showToast(`🧾 Purchase Bill #${bill_no} saved!`, 'success');
  renderTabBody();
};


window.__markVendorBillPaid = async function(id) {
  const bill = cache.vendorBills.find(b => b.id === id);
  if (!bill) return;

  if (!confirm(`Verify & mark bill ${bill.bill_no || ''} from ${bill.vendor_name} (₹${Number(bill.amount).toFixed(0)}) as PAID?`)) return;

  bill.status = 'paid';
  bill.paid_at = new Date().toISOString();
  bill.paid_by = session.staffId;

  showLoading();
  try {
    await sb.from('vendor_bills').update({ status: 'paid', paid_at: bill.paid_at, paid_by: bill.paid_by }).eq('id', id);
  } catch(e) {
    localStorage.setItem('br_vendor_bills_' + session.businessId, JSON.stringify(cache.vendorBills));
  } finally {
    hideLoading();
  }

  logAuditEvent('Vendor Bill Paid', `Verified & paid Bill ${bill.bill_no||'N/A'} (₹${bill.amount}) to ${bill.vendor_name}`);
  triggerAppNotification('Bill Marked Paid', `Bill ${bill.bill_no||''} from ${bill.vendor_name} marked PAID`);
  window.showToast(`Bill marked as PAID!`, 'success');
  renderTabBody();
};

window.__deleteVendorBill = async function(id) {
  if (!confirm('Are you sure you want to delete this vendor bill?')) return;

  cache.vendorBills = cache.vendorBills.filter(b => b.id !== id);

  showLoading();
  try {
    await sb.from('vendor_bills').delete().eq('id', id);
  } catch(e) {
    localStorage.setItem('br_vendor_bills_' + session.businessId, JSON.stringify(cache.vendorBills));
  } finally {
    hideLoading();
  }

  logAuditEvent('Vendor Bill Delete', `Deleted vendor bill`);
  window.showToast('🗑 Vendor bill deleted', 'info');
  renderTabBody();
};

window.__viewVendorBillPhoto = function(id) {
  const bill = cache.vendorBills.find(b => b.id === id);
  if (!bill || !bill.photo_url) return;

  const holder = getModalHolder('taskModalHolder');
  holder.innerHTML = `
  <div class="overlay show" onclick="this.remove()"><div class="modal" style="max-width:90vw;max-height:90vh;padding:12px;background:#000;color:#fff;text-align:center;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-weight:700;font-size:0.9rem;">${esc(bill.vendor_name)} (Bill #${esc(bill.bill_no||'N/A')})</span>
      <button class="stamp-btn ghost small" style="color:#fff;border-color:#fff;" onclick="this.closest('.overlay').remove()">✕ Close</button>
    </div>
    <img src="${bill.photo_url}" style="max-width:100%;max-height:75vh;object-fit:contain;border-radius:6px;">
  </div></div>`;
};



/* ---------------- LOW STOCK MANAGEMENT TAB ---------------- */
let lowStockFilter  = 'pending';
let lowStockSubTab  = 'alerts'; // 'alerts' | 'expiry'
let customerDirectorySubTab = 'directory'; // 'directory' | 'reports'

window.__setLowStockFilter = function(f) {
  lowStockFilter = f;
  renderTabBody();
};
window.__setLowStockSubTab = function(t) {
  lowStockSubTab = t;
  renderTabBody();
};

function renderLowStockTab(body) {
  const list = cache.lowStocks || [];
  const pendingCount = list.filter(i => (i.status || 'pending') === 'pending').length;
  const criticalCount = list.filter(i => (i.urgency || 'medium') === 'critical' && (i.status || 'pending') === 'pending').length;
  const restockedCount = list.filter(i => i.status === 'restocked').length;

  let filtered = list;
  if (lowStockFilter === 'pending') filtered = list.filter(i => (i.status || 'pending') === 'pending');
  else if (lowStockFilter === 'ordered') filtered = list.filter(i => i.status === 'ordered');
  else if (lowStockFilter === 'restocked') filtered = list.filter(i => i.status === 'restocked');

  body.innerHTML = `
    <!-- Sub-menu Navigation -->
    <div style="display:flex;gap:6px;margin-bottom:16px;overflow-x:auto;">
      <button class="stamp-btn small ${lowStockSubTab==='alerts'?'':'ghost'}" onclick="window.__setLowStockSubTab('alerts')">📦 Low Stock (${list.length})</button>
      <button class="stamp-btn small ${lowStockSubTab==='expiry'?'':'ghost'}" onclick="window.__setLowStockSubTab('expiry')">⏰ Expiry Tracker</button>
    </div>

    ${lowStockSubTab === 'alerts' ? `
    <!-- Low Stock Summary KPI Banner -->
    <div class="row-card" style="flex-direction:column;align-items:stretch;background:var(--card);border:1.5px solid var(--paper-line);padding:14px;margin-bottom:16px;border-radius:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div>
          <h2 style="margin:0;font-size:1.05rem;color:var(--ink);font-family:'Roboto Mono',monospace;font-weight:700;">📦 Low Stock Alerts</h2>
          <div style="font-size:0.75rem;color:var(--ink-soft);margin-top:2px;">Track items running out &amp; enter low stock reports</div>
        </div>
        <button class="stamp-btn small" style="background:var(--turmeric);color:#fff;border:none;" onclick="window.__openLowStockModal()">+ Report Low Stock</button>
      </div>

      <div class="stat-grid">
        <div class="stat-card" style="cursor:pointer;" onclick="window.__setLowStockFilter('pending')">
          <div class="num" style="color:var(--turmeric);">${pendingCount}</div>
          <div class="label">Pending Alerts</div>
        </div>
        <div class="stat-card" style="cursor:pointer;" onclick="window.__setLowStockFilter('pending')">
          <div class="num" style="color:var(--turmeric);">${criticalCount}</div>
          <div class="label">Critical Urgent</div>
        </div>
        <div class="stat-card" style="cursor:pointer;" onclick="window.__setLowStockFilter('restocked')">
          <div class="num" style="color:var(--turmeric);">${restockedCount}</div>
          <div class="label">Restocked Items</div>
        </div>
        <div class="stat-card" style="cursor:pointer;" onclick="window.__setLowStockFilter('all')">
          <div class="num">${list.length}</div>
          <div class="label">Total Reported</div>
        </div>
      </div>
    </div>

    <!-- Filter Bar -->
    <div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;">
      <button class="stamp-btn small ${lowStockFilter==='pending'?'':'ghost'}" onclick="window.__setLowStockFilter('pending')">Pending (${pendingCount})</button>
      <button class="stamp-btn small ${lowStockFilter==='ordered'?'':'ghost'}" onclick="window.__setLowStockFilter('ordered')">Ordered (${list.filter(i=>i.status==='ordered').length})</button>
      <button class="stamp-btn small ${lowStockFilter==='restocked'?'':'ghost'}" onclick="window.__setLowStockFilter('restocked')">Restocked (${restockedCount})</button>
      <button class="stamp-btn small ${lowStockFilter==='all'?'':'ghost'}" onclick="window.__setLowStockFilter('all')">All (${list.length})</button>
    </div>

    <div class="section-label">Low Stock List (${filtered.length})</div>

    ${filtered.length ? filtered.map(item => {
      const isCritical = item.urgency === 'critical';
      const isMedium = item.urgency === 'medium' || !item.urgency;
      const status = item.status || 'pending';

      const statusStamp = status === 'restocked'
        ? '<span class="stamp done">Restocked</span>'
        : (status === 'ordered' ? '<span class="stamp sent">Ordered</span>' : '<span class="stamp pending">Pending</span>');

      const urgencyStamp = isCritical
        ? '<span class="stamp high">Critical</span>'
        : (isMedium ? '<span class="stamp medium">Medium</span>' : '<span class="stamp low">Low</span>');

      return `
        <div class="row-card ${isCritical && status==='pending' ? 'overdue' : ''}">
          <div class="row-main">
            <div class="meta">
              <span>${esc(item.category || 'General')}</span>
              <span>Reported by: ${esc(staffName(item.created_by))}</span>
              ${item.created_at ? `<span>${item.created_at.slice(0,10)}</span>` : ''}
            </div>
            <h3><span class="status-dot ${status==='restocked'?'green':'red'}"></span>${esc(item.item_name)}</h3>
            <div style="font-family:'Roboto Mono',monospace;font-size:0.85rem;font-weight:700;margin-top:4px;color:var(--ink);">
              Current Qty: <span style="color:${isCritical?'var(--turmeric)':'var(--turmeric-dark)'};">${item.current_qty} ${esc(item.unit||'Pcs')}</span>
              ${item.min_qty ? ` &bull; Min Required: ${item.min_qty} ${esc(item.unit||'Pcs')}` : ''}
            </div>
            ${item.notes ? `<div class="notes">${esc(item.notes)}</div>` : ''}
            <div style="margin-top:8px;display:flex;gap:6px;align-items:center;">
              ${urgencyStamp}
              ${statusStamp}
            </div>
          </div>
          <div class="row-actions">
            ${status === 'pending' ? `
              <button class="stamp-btn small" style="background:var(--turmeric);color:#fff;border-color:var(--turmeric);" onclick="window.__markLowStockStatus('${item.id}', 'restocked')">✓ Restocked</button>
              <button class="stamp-btn small ghost" onclick="window.__markLowStockStatus('${item.id}', 'ordered')">📦 Ordered</button>
            ` : (status === 'ordered' ? `
              <button class="stamp-btn small" style="background:var(--turmeric);color:#fff;border-color:var(--turmeric);" onclick="window.__markLowStockStatus('${item.id}', 'restocked')">✓ Restocked</button>
            ` : `
              <button class="stamp-btn small ghost" onclick="window.__markLowStockStatus('${item.id}', 'pending')">↺ Re-open</button>
            `)}

            <div class="action-dropdown-holder">
              <button class="action-more-btn" onclick="window.__toggleActionMenu(event, '${item.id}')">More ▾</button>
              <div class="action-dropdown-menu" id="actionMenu_${item.id}">
                <button onclick="window.__openLowStockModal('${item.id}')">✎ Edit</button>
                <button class="danger" onclick="window.__deleteLowStockItem('${item.id}')">🗑 Delete</button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('') : `<div class="empty">No low stock items found in this view. Staff can tap "+ Report Low Stock" to report items running low!</div>`}

    <div id="lowStockModalHolder"></div>
    ` : renderExpiryTrackerHtml()}
  `;
}


window.__openLowStockModal = function(id) {
  const item = id ? (cache.lowStocks || []).find(x => x.id === id) : null;
  const holder = getModalHolder('lowStockModalHolder');

  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>${item ? '✎ Edit Low Stock Item' : '📦 Report Low Stock'}</h2>
    <p style="font-size:0.82rem;color:var(--ink-soft);margin:0 0 10px;">Enter items running low so managers & owners know what to re-order.</p>

    <label>Item / Product Name *</label>
    <input id="mLowItemName" value="${item ? esc(item.item_name) : ''}" placeholder="e.g. Thermal Paper Rolls 80mm, Milk Packets">

    <div class="two-col">
      <div>
        <label>Category</label>
        <input id="mLowCategory" value="${item ? esc(item.category || '') : ''}" placeholder="e.g. Stationery, Spices">
      </div>
      <div>
        <label>Unit (e.g. Pcs, Kg, Ltr)</label>
        <input id="mLowUnit" value="${item ? esc(item.unit || 'Pcs') : 'Pcs'}" placeholder="e.g. Pcs">
      </div>
    </div>

    <div class="two-col">
      <div>
        <label>Current Qty Remaining *</label>
        <input type="number" step="any" id="mLowCurrentQty" value="${item ? item.current_qty : ''}" placeholder="e.g. 2">
      </div>
      <div>
        <label>Min Required Qty</label>
        <input type="number" step="any" id="mLowMinQty" value="${item ? item.min_qty || '' : ''}" placeholder="e.g. 10">
      </div>
    </div>

    <label>Urgency Level</label>
    <select id="mLowUrgency">
      <option value="critical" ${item && item.urgency === 'critical' ? 'selected' : ''}>Critical (Almost Empty)</option>
      <option value="medium" ${!item || item.urgency === 'medium' ? 'selected' : ''}>Medium (Running Low)</option>
      <option value="low" ${item && item.urgency === 'low' ? 'selected' : ''}>Low (Re-order Soon)</option>
    </select>

    <label>Notes / Vendor Preference</label>
    <textarea id="mLowNotes" placeholder="Optional notes for purchaser or preferred supplier...">${item ? esc(item.notes || '') : ''}</textarea>

    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="getModalHolder('lowStockModalHolder').innerHTML=''">Cancel</button>
      <button class="stamp-btn" style="background:var(--turmeric);color:#fff;" onclick="window.__saveLowStockItem('${id || ''}')">Save Low Stock Entry</button>
    </div>
  </div></div>`;
};

window.__saveLowStockItem = async function(id) {
  const item_name = document.getElementById('mLowItemName').value.trim();
  const current_qty = Number(document.getElementById('mLowCurrentQty').value || 0);

  if (!item_name) { alert('Please enter Item / Product Name.'); return; }

  const payload = {
    business_id: session.businessId,
    item_name,
    category: document.getElementById('mLowCategory').value.trim() || 'General',
    unit: document.getElementById('mLowUnit').value.trim() || 'Pcs',
    current_qty,
    min_qty: Number(document.getElementById('mLowMinQty').value || 0) || null,
    urgency: document.getElementById('mLowUrgency').value,
    notes: document.getElementById('mLowNotes').value.trim(),
    created_by: session.staffId,
    status: 'pending',
    updated_at: new Date().toISOString()
  };

  showLoading();
  try {
    if (id && !id.startsWith('loc_ls_')) {
      const { data, error } = await sb.from('low_stocks').update(payload).eq('id', id).select().single();
      if (error) throw error;
      const idx = cache.lowStocks.findIndex(x => x.id === id);
      if (idx !== -1) cache.lowStocks[idx] = data || payload;
    } else {
      payload.created_at = new Date().toISOString();
      const { data, error } = await sb.from('low_stocks').insert(payload).select().single();
      if (error) throw error;
      if (data) cache.lowStocks.unshift(data);
      else { payload.id = 'loc_ls_' + Date.now(); cache.lowStocks.unshift(payload); }
    }
  } catch(e) {
    if (id) {
      const idx = cache.lowStocks.findIndex(x => x.id === id);
      if (idx !== -1) Object.assign(cache.lowStocks[idx], payload);
    } else {
      payload.id = 'loc_ls_' + Date.now();
      payload.created_at = new Date().toISOString();
      cache.lowStocks.unshift(payload);
    }
    localStorage.setItem('br_low_stocks_' + session.businessId, JSON.stringify(cache.lowStocks));
    queueOfflineMutation(id ? 'update' : 'insert', 'low_stocks', payload);
  } finally {
    hideLoading();
  }

  getModalHolder('lowStockModalHolder').innerHTML = '';
  logAuditEvent('Low Stock Reported', `Reported low stock: ${item_name} (${current_qty} remaining)`);
  window.showToast('📦 Low Stock item logged!', 'success');
  renderTabBody();
};

window.__markLowStockStatus = async function(id, newStatus) {
  const item = (cache.lowStocks || []).find(x => x.id === id);
  if (!item) return;

  item.status = newStatus;
  item.updated_at = new Date().toISOString();

  showLoading();
  try {
    if (!id.startsWith('loc_ls_')) {
      await sb.from('low_stocks').update({ status: newStatus, updated_at: item.updated_at }).eq('id', id);
    }
  } catch(e) {
    localStorage.setItem('br_low_stocks_' + session.businessId, JSON.stringify(cache.lowStocks));
    queueOfflineMutation('update', 'low_stocks', { id, status: newStatus, updated_at: item.updated_at });
  } finally {
    hideLoading();
  }

  logAuditEvent('Low Stock Status Updated', `Marked ${item.item_name} as ${newStatus}`);
  window.showToast(`Low Stock status changed to ${newStatus}`, 'success');
  renderTabBody();
};

window.__deleteLowStockItem = function(id) {
  window.__showDeleteConfirm({
    title: 'Delete low stock alert?',
    message: 'This will remove this item alert. It cannot be undone.',
    onConfirm: async () => {
      showLoading();
      try {
        cache.lowStocks = (cache.lowStocks || []).filter(x => x.id !== id);
        localStorage.setItem('br_low_stocks_' + session.businessId, JSON.stringify(cache.lowStocks));
        if (!id.startsWith('loc_ls_')) {
          await sb.from('low_stocks').delete().eq('id', id);
        }
      } catch(e) {}
      finally {
        hideLoading();
        window.showToast('🗑 Low Stock alert removed', 'info');
        renderTabBody();
      }
    }
  });
};


/* ---------------- NUMBER TO WORDS (INR) & PAYMENT VOUCHER PRINT ENGINE ---------------- */
function numToWordsINR(num) {
  num = Math.round(Number(num) || 0);
  if (num === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  }
  return 'Rupee ' + inWords(num) + ' Only';
}

function formatVoucherDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase();
  const day = String(d.getDate()).padStart(2, '0');
  const month = d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase();
  const year = String(d.getFullYear()).slice(-2);
  return `${day} ${month} ${year}`;
}

window.__closePaymentVoucherModal = function() {
  const holder = getModalHolder('vendorVoucherModalHolder');
  if (holder) holder.innerHTML = '';
  const el = document.getElementById('vendorVoucherModalHolder');
  if (el) el.innerHTML = '';
};

window.__showPaymentVoucherModal = function({ vendorName, bills, totalAmount, paymentMode = 'Cash', notes = '', voucherNo = '' }) {
  const holder = getModalHolder('vendorVoucherModalHolder');
  const bizName = session.businessName || 'BARAKKATH MARKETING';
  const vNo = voucherNo || ('VCH-' + Math.floor(100 + Math.random() * 900));
  const vDate = formatVoucherDate(todayStr());
  const wordsAmount = numToWordsINR(totalAmount);

  holder.innerHTML = `
  <div class="overlay show" onclick="if(event.target===this) window.__closePaymentVoucherModal()" style="z-index:99999;background:rgba(0,0,0,0.75);display:flex;align-items:center;justify-content:center;padding:12px;">
    <div class="modal" style="max-width:620px;width:100%;max-height:92vh;background:#fff;color:#000;border-radius:8px;padding:0;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);">
      
      <!-- Voucher Printable Card Container -->
      <div id="paymentVoucherPrintArea" style="padding:28px 24px;font-family:'Inter', Arial, sans-serif;color:#000;background:#ffffff;line-height:1.4;">
        
        <!-- Header & Close Button -->
        <div style="display:flex;justify-content:flex-end;margin-bottom:-10px;" class="no-print">
          <button class="stamp-btn ghost small" style="color:#000;border-color:#ccc;font-size:0.8rem;padding:4px 10px;" onclick="window.__closePaymentVoucherModal()">✕ Close</button>
        </div>
        <div style="text-align:center;margin-bottom:18px;">
          <h2 style="margin:0 0 4px;font-family:'Roboto Mono', monospace;font-size:1.3rem;font-weight:800;letter-spacing:0.02em;text-transform:uppercase;color:#000;">${esc(bizName)}</h2>
          <div style="font-size:0.75rem;font-weight:600;color:#333;margin-bottom:2px;">44, PALLIVASAL STREET, VADAGARAI, PERIYAKULAM. Pin code: 625601</div>
          <div style="font-size:0.75rem;font-weight:600;color:#333;">E-Mail : 0786mdanas@gmail.com</div>
          <h3 style="margin:12px 0 0;font-size:0.95rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #000;display:inline-block;padding-bottom:2px;">Payment Voucher</h3>
        </div>

        <!-- Meta Info Row -->
        <div style="display:flex;justify-content:space-between;font-size:0.82rem;font-weight:600;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #000;">
          <div>No: <b>${esc(vNo)}</b></div>
          <div>Dated: <b>${vDate}</b></div>
        </div>

        <!-- Main Particulars Table -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:0.82rem;">
          <thead>
            <tr style="border-bottom:1px solid #000;text-align:left;">
              <th style="padding:6px 0;font-weight:700;width:75%;">Particulars</th>
              <th style="padding:6px 0;font-weight:700;text-align:right;width:25%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px 0 4px;vertical-align:top;">
                <b>Account:</b>
                <div style="margin-left:24px;margin-top:4px;">
                  <b style="font-size:0.9rem;text-transform:uppercase;">${esc(vendorName)}</b>
                  <div style="margin-top:6px;display:flex;flex-direction:column;gap:3px;font-family:'Roboto Mono', monospace;font-size:0.78rem;color:#111;">
                    ${bills.map(b => `
                      <div style="display:flex;gap:12px;">
                        <span>Agst Ref &nbsp;<b>${esc(getBillNo(b))}</b></span>
                        <span>₹ ${Number(getBillAmount(b)).toLocaleString('en-IN')}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </td>
              <td style="padding:8px 0 4px;vertical-align:top;text-align:right;font-family:'Roboto Mono', monospace;font-size:0.92rem;font-weight:700;">
                ₹ ${Number(totalAmount).toLocaleString('en-IN')}
              </td>
            </tr>

            <!-- Payment Details Row -->
            <tr style="border-top:1px solid #ddd;">
              <td colspan="2" style="padding:10px 0 4px;">
                <div style="font-size:0.8rem;margin-bottom:4px;"><b>Through:</b> ${esc(paymentMode)}</div>
                ${notes ? `<div style="font-size:0.8rem;margin-bottom:4px;"><b>On Account Of:</b> ${esc(notes)}</div>` : ''}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Amount in Words & Total Box -->
        <div style="border:1px solid #000;margin-top:14px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;font-size:0.82rem;background:#fafafa;">
          <div style="flex:1;padding-right:12px;font-style:italic;">
            <b>Amount (in words):</b> <span style="font-weight:600;">${wordsAmount}</span>
          </div>
          <div style="border-left:1px solid #000;padding-left:12px;text-align:right;font-family:'Roboto Mono', monospace;font-size:1.05rem;font-weight:800;white-space:nowrap;">
            ₹ ${Number(totalAmount).toLocaleString('en-IN')}
          </div>
        </div>

        <!-- Signatures Row -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:45px;padding-top:10px;font-size:0.8rem;font-weight:700;">
          <div>Receiver's Signature : _________________</div>
          <div style="text-align:right;">Authorised Signatory</div>
        </div>
      </div>

      <!-- Action Footer (Hidden on Print) -->
      <div class="no-print" style="padding:14px 20px;background:#f1f5f9;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;align-items:center;">
        <button class="stamp-btn ghost" style="color:#475569;border-color:#cbd5e1;font-weight:700;" onclick="getModalHolder('vendorVoucherModalHolder').innerHTML=''">CANCEL</button>
        <button class="stamp-btn" style="background:#d97706;color:#ffffff;border:none;font-weight:700;padding:10px 20px;display:flex;align-items:center;gap:8px;" onclick="window.__printPaymentVoucher()">
          🖨 PRINT / SHARE PDF
        </button>
      </div>

    </div>
  </div>`;
};

window.__printPaymentVoucher = function() {
  const printArea = document.getElementById('paymentVoucherPrintArea');
  if (!printArea) return;

  const printWindow = window.open('', '_blank', 'width=800,height=900');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Voucher</title>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Inter:wght@400;600;700&family=IBM+Plex+Mono:wght@600;700&display=swap" rel="stylesheet">
      \x3Cstyle\x3E


  /* Global Roboto Mono Font & Uppercase Capitalization Styling */
  body, button, input, select, textarea, h1, h2, h3, h4, .stamp-btn, .section-label, label, .stamp, .stat-card, .row-card, .leaderboard-card, .drawer-item, .bottom-nav button, .sidebar-item, .sidebar-section-title {
    font-family: 'Roboto Mono', monospace, sans-serif !important;
  }

  h1, h2, h3, h4,
  .section-label,
  .stamp-btn,
  .stamp,
  label,
  nav.tabs button,
  .drawer-item,
  .sidebar-item,
  .sidebar-section-title,
  .bottom-nav button,
  .dash-kpi-title,
  .dash-kpi-sub,
  .stat-card .label,
  .row-main h3,
  .kv span,
  .role-pill,
  .owner-fab-item,
  .owner-fab-btn,
  .badge-chip,
  .action-dropdown-menu button,
  table th,
  .modal h2,
  .auth-card h1 {
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

        body { margin: 0; padding: 20px; font-family: 'Roboto Mono', monospace; color: #000; background: #fff; }
        @media print {
          body { padding: 0; }
          @page { margin: 15mm; size: auto; }
        }
      
  /* Top Sync Progress Bar & Floating Badge Pill */
  .sync-progress-bar {
    position: fixed;
    top: 0;
    left: 0;
    width: 0%;
    height: 3px;
    background: linear-gradient(90deg, #F59E0B, #10B981, #0F172A, #F59E0B);
    background-size: 200% 100%;
    z-index: 100000;
    transition: width 0.3s ease, opacity 0.3s ease;
    opacity: 0;
    pointer-events: none;
  }
  .sync-progress-bar.active {
    opacity: 1;
    width: 75%;
    animation: syncProgressPulse 1.5s infinite linear;
  }
  .sync-progress-bar.complete {
    width: 100%;
    opacity: 1;
  }
  @keyframes syncProgressPulse {
    0% { background-position: 0% 0%; }
    100% { background-position: 200% 0%; }
  }

  .sync-badge-pill {
    position: fixed;
    top: 14px;
    right: 16px;
    z-index: 99999;
    font-family: 'Roboto Mono', monospace;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 999px;
    background: #181B20;
    color: #F59E0B;
    border: 1px solid rgba(245, 158, 11, 0.4);
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    gap: 6px;
    opacity: 0;
    transform: translateY(-8px);
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }
  .sync-badge-pill.show {
    opacity: 1;
    transform: translateY(0);
  }


  /* Small Reload Icon Button & Spin Animation */
  .reload-btn {
    border: 1.5px solid var(--paper-line);
    background: var(--card);
    color: var(--ink);
    border-radius: 8px;
    width: 34px;
    height: 34px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    flex-shrink: 0;
    box-shadow: 0 2px 0 rgba(0,0,0,0.06);
  }
  .reload-btn:hover {
    background: var(--paper);
    border-color: var(--turmeric);
    color: var(--turmeric-dark);
  }
  .reload-btn:active {
    transform: scale(0.92);
    background: var(--paper-line);
  }
  .reload-btn.spinning svg {
    animation: reloadSpin 0.75s linear infinite;
  }
  @keyframes reloadSpin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }


  /* Mobile Responsiveness & Layout Alignment Overhaul */
  @media (max-width: 480px) {
    .wrap {
      padding: 16px 10px 140px !important;
    }
    header.top {
      padding: 14px 10px 10px !important;
      gap: 6px !important;
    }
    .header-title-area h1 {
      font-size: 1.05rem !important;
    }
    .row-card {
      padding: 12px 10px !important;
      gap: 8px !important;
    }
    .stat-grid {
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 8px !important;
    }
    .stat-card {
      padding: 10px 8px !important;
    }
    .stat-card .num {
      font-size: clamp(0.95rem, 4vw, 1.25rem) !important;
    }
    .modal {
      max-width: min(520px, calc(100vw - 16px)) !important;
      padding: 16px 12px !important;
      max-height: 88vh !important;
      overflow-y: auto !important;
      border-radius: 12px !important;
    }
    .stamp-btn {
      padding: 9px 12px !important;
      font-size: 0.8rem !important;
    }
    .stamp-btn.small {
      padding: 6px 9px !important;
      font-size: 0.72rem !important;
    }
  }

  .due-badge-overdue {
    background: var(--blue-soft);
    color: var(--turmeric);
    border: 1px solid var(--turmeric);
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .due-badge-warning {
    background: var(--blue-soft);
    color: var(--turmeric-dark);
    border: 1px solid var(--turmeric);
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }


  /* Compact Card Density Mode (8-10 Items / Screen) */
  .compact-density .row-card {
    padding: 8px 10px !important;
    margin-bottom: 6px !important;
    gap: 6px !important;
    border-radius: 8px !important;
  }
  .compact-density .row-main h3 {
    font-size: 0.85rem !important;
    margin-bottom: 1px !important;
  }
  .compact-density .row-main .meta {
    font-size: 0.68rem !important;
    margin-bottom: 1px !important;
  }
  .compact-density .row-main .notes {
    display: none !important;
  }
  .compact-density .stamp {
    font-size: 0.58rem !important;
    padding: 2px 6px !important;
  }
  .compact-density .stamp-btn {
    padding: 5px 8px !important;
    font-size: 0.7rem !important;
  }




\x3C/style\x3E
    </head>

    <body>
      ${printArea.innerHTML}
      \x3Cscript\x3E
        window.onload = function() {
          window.print();
          setTimeout(() => { window.close(); }, 500);
        };
      \x3C/script\x3E
    </body>



    </html>
  `);
  printWindow.document.close();
};


/* ---------------- RECORD PAYMENT & PAYMENT HISTORY MODALS ---------------- */

/* ---------------- GLOBAL SEARCH & SUPPLIER LEDGER STATEMENT ENGINE ---------------- */
window.__openGlobalSearchModal = function() {
  const holder = getModalHolder('taskModalHolder');
  holder.innerHTML = `
  <div class="overlay show" onclick="if(event.target===this) this.remove()"><div class="modal" style="max-width:540px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h2 style="margin:0;font-size:1.1rem;">🔍 Global Quick Search</h2>
      <button class="stamp-btn ghost small" onclick="this.closest('.overlay').remove()">✕</button>
    </div>
    
    <input id="mGlobalSearchInput" placeholder="Search Bill #, Vendor, Item, Staff, Task..." style="font-size:1.05rem;font-weight:600;padding:12px;margin-bottom:12px;width:100%;" oninput="window.__runGlobalSearch(this.value)" autofocus>
    
    <div id="mGlobalSearchResultsArea" style="max-height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;">
      <div style="text-align:center;padding:20px;color:var(--ink-soft);font-size:0.85rem;">Type anything to search across Bills, Tasks, Items, & Staff...</div>
    </div>
  </div></div>`;

  setTimeout(() => {
    const el = document.getElementById('mGlobalSearchInput');
    if (el) el.focus();
  }, 100);
};

// Keyboard Shortcut Ctrl + K / Cmd + K for Global Search
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    window.__openGlobalSearchModal();
  }
});

window.__runGlobalSearch = function(query) {
  const area = document.getElementById('mGlobalSearchResultsArea');
  if (!area) return;
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    area.innerHTML = `<div style="text-align:center;padding:20px;color:var(--ink-soft);font-size:0.85rem;">Type anything to search across Bills, Tasks, Items, & Staff...</div>`;
    return;
  }

  const results = [];

  // Search Vendor Bills
  (cache.vendorBills || []).forEach(b => {
    const vName = getVendorName(b);
    const bNo = getBillNo(b);
    if (vName.toLowerCase().includes(q) || bNo.toLowerCase().includes(q) || (b.notes || '').toLowerCase().includes(q)) {
      results.push({
        type: 'Vendor Bill',
        title: `${vName} (Bill #${bNo})`,
        meta: `₹${getBillAmount(b).toLocaleString('en-IN')} • Status: ${getBillStatus(b).toUpperCase()}`,
        tab: 'vendors',
        id: b.id
      });
    }
  });

  // Search Tasks
  (cache.tasks || []).forEach(t => {
    if ((t.title || '').toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q)) {
      results.push({
        type: 'Task',
        title: t.title,
        meta: `Priority: ${t.priority} • Status: ${t.status}`,
        tab: 'tasks',
        id: t.id
      });
    }
  });

  // Search Low Stock
  (cache.lowStocks || []).forEach(l => {
    if ((l.item_name || '').toLowerCase().includes(q) || (l.category || '').toLowerCase().includes(q)) {
      results.push({
        type: 'Low Stock Item',
        title: l.item_name,
        meta: `Qty: ${l.current_qty} ${l.unit||'Pcs'} • Status: ${l.status}`,
        tab: 'low_stock',
        id: l.id
      });
    }
  });

  // Search Staff
  (cache.staff || []).forEach(s => {
    if ((s.name || '').toLowerCase().includes(q) || (s.role || '').toLowerCase().includes(q) || (s.phone || '').includes(q)) {
      results.push({
        type: 'Staff Member',
        title: s.name,
        meta: `Role: ${s.role} • Phone: ${s.phone||'N/A'}`,
        tab: 'staff',
        id: s.id
      });
    }
  });

  if (!results.length) {
    area.innerHTML = `<div class="empty">No matching records found for "${esc(query)}".</div>`;
    return;
  }

  area.innerHTML = results.slice(0, 15).map(r => `
    <div style="background:var(--paper);border:1px solid var(--paper-line);border-radius:8px;padding:10px 12px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;" onclick="window.__gotoSearchResult('${r.tab}', '${r.id}')">
      <div>
        <span class="stamp low" style="font-size:0.65rem;">${r.type}</span>
        <b style="font-size:0.9rem;display:block;margin-top:2px;">${esc(r.title)}</b>
        <div style="font-size:0.75rem;color:var(--ink-soft);margin-top:2px;">${esc(r.meta)}</div>
      </div>
      <span style="font-size:0.85rem;color:var(--turmeric-dark);font-weight:700;">Go ↗</span>
    </div>
  `).join('');
};

window.__gotoSearchResult = function(tab, id) {
  const modal = document.getElementById('appAlertOverlay') || document.querySelector('.overlay.show');
  if (modal) modal.remove();
  window.__setTab(tab);
};

/* Supplier Ledger Statement Modal */
window.__openVendorLedgerModal = function(vendorName) {
  const bills = (cache.vendorBills || []).filter(b => getVendorName(b) === vendorName);
  const payments = (cache.vendorPayments || []).filter(p => p.vendor_name === vendorName);

  const totalBilled = bills.reduce((s, b) => s + getBillAmount(b), 0);
  const totalPaid = bills.reduce((s, b) => s + getBillPaidAmount(b), 0);
  const outstanding = Math.max(0, totalBilled - totalPaid);

  // Build combined chronological ledger array
  const entries = [];
  bills.forEach(b => {
    entries.push({
      date: b.bill_date,
      type: 'BILL',
      ref: 'Bill #' + getBillNo(b),
      debit: getBillAmount(b),
      credit: 0,
      notes: b.notes || ''
    });
  });
  payments.forEach(p => {
    entries.push({
      date: p.date,
      type: 'PAYMENT',
      ref: 'Payment (' + (p.payment_mode || 'Cash') + ')',
      debit: 0,
      credit: Number(p.amount || 0),
      notes: p.remarks || ''
    });
  });

  entries.sort((a,b) => a.date.localeCompare(b.date));

  let runningBal = 0;
  entries.forEach(e => {
    runningBal += (e.debit - e.credit);
    e.balance = runningBal;
  });

  const holder = getModalHolder('vendorModalHolder');
  holder.innerHTML = `
  <div class="overlay show"><div class="modal" style="max-width:680px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--paper-line);">
      <div>
        <h2 style="margin:0;font-size:1.15rem;">📊 Account Statement</h2>
        <div style="font-size:0.8rem;color:var(--ink-soft);font-weight:700;text-transform:uppercase;margin-top:2px;">${esc(vendorName)}</div>
      </div>
      <button class="stamp-btn ghost small" onclick="getModalHolder('vendorModalHolder').innerHTML=''">✕</button>
    </div>

    <!-- Summary Bar -->
    <div style="background:var(--paper);border:1px solid var(--paper-line);border-radius:8px;padding:12px;margin-bottom:14px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center;">
      <div>
        <span style="font-size:0.72rem;color:var(--ink-soft);text-transform:uppercase;font-weight:700;">Total Billed</span>
        <b style="display:block;font-family:'Roboto Mono',monospace;font-size:1.05rem;color:var(--ink);">₹${totalBilled.toLocaleString('en-IN')}</b>
      </div>
      <div>
        <span style="font-size:0.72rem;color:var(--ink-soft);text-transform:uppercase;font-weight:700;">Total Paid</span>
        <b style="display:block;font-family:'Roboto Mono',monospace;font-size:1.05rem;color:var(--turmeric);">₹${totalPaid.toLocaleString('en-IN')}</b>
      </div>
      <div>
        <span style="font-size:0.72rem;color:var(--ink-soft);text-transform:uppercase;font-weight:700;">Outstanding</span>
        <b style="display:block;font-family:'Roboto Mono',monospace;font-size:1.05rem;color:${outstanding>0?'var(--turmeric)':'var(--turmeric)'};">₹${outstanding.toLocaleString('en-IN')}</b>
      </div>
    </div>

    <!-- Ledger Table Container -->
    <div style="max-height:280px;overflow-y:auto;border:1px solid var(--paper-line);border-radius:8px;margin-bottom:14px;">
      <table style="width:100%;border-collapse:collapse;font-size:0.82rem;text-align:left;">
        <thead>
          <tr style="background:var(--paper);border-bottom:1px solid var(--paper-line);font-size:0.75rem;color:var(--ink-soft);">
            <th style="padding:8px 10px;">Date</th>
            <th style="padding:8px 10px;">Type / Ref</th>
            <th style="padding:8px 10px;text-align:right;">Billed (₹)</th>
            <th style="padding:8px 10px;text-align:right;">Paid (₹)</th>
            <th style="padding:8px 10px;text-align:right;">Balance (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${entries.length ? entries.map(e => `
            <tr style="border-bottom:1px solid var(--paper-line);">
              <td style="padding:8px 10px;font-family:'Roboto Mono',monospace;">${e.date}</td>
              <td style="padding:8px 10px;">
                <b style="color:${e.type==='BILL'?'var(--ink)':'var(--turmeric)'};">${esc(e.ref)}</b>
                ${e.notes ? `<div style="font-size:0.72rem;color:var(--ink-soft);">${esc(e.notes)}</div>` : ''}
              </td>
              <td style="padding:8px 10px;text-align:right;font-family:'Roboto Mono',monospace;">${e.debit ? '₹'+e.debit.toLocaleString('en-IN') : '—'}</td>
              <td style="padding:8px 10px;text-align:right;font-family:'Roboto Mono',monospace;color:var(--turmeric);">${e.credit ? '₹'+e.credit.toLocaleString('en-IN') : '—'}</td>
              <td style="padding:8px 10px;text-align:right;font-family:'Roboto Mono',monospace;font-weight:700;color:${e.balance>0?'var(--turmeric)':'var(--turmeric)'};">₹${e.balance.toLocaleString('en-IN')}</td>
            </tr>
          `).join('') : `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--ink-soft);">No transactions found for this vendor.</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="getModalHolder('vendorModalHolder').innerHTML=''">Close</button>
      <button class="stamp-btn" style="background:var(--turmeric);color:#fff;border:none;" onclick="window.__printVendorStatement('${esc(vendorName)}')">🖨 Print Statement</button>
    </div>
  </div></div>`;
};

window.__printVendorStatement = function(vendorName) {
  const printArea = document.querySelector('#vendorModalHolder .modal');
  if (!printArea) return;
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Statement - ${vendorName}</title>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&family=Inter:wght@400;600;700&family=IBM+Plex+Mono:wght@600;700&display=swap" rel="stylesheet">
      \x3Cstyle\x3E


  /* Global Roboto Mono Font & Uppercase Capitalization Styling */
  body, button, input, select, textarea, h1, h2, h3, h4, .stamp-btn, .section-label, label, .stamp, .stat-card, .row-card, .leaderboard-card, .drawer-item, .bottom-nav button, .sidebar-item, .sidebar-section-title {
    font-family: 'Roboto Mono', monospace, sans-serif !important;
  }

  h1, h2, h3, h4,
  .section-label,
  .stamp-btn,
  .stamp,
  label,
  nav.tabs button,
  .drawer-item,
  .sidebar-item,
  .sidebar-section-title,
  .bottom-nav button,
  .dash-kpi-title,
  .dash-kpi-sub,
  .stat-card .label,
  .row-main h3,
  .kv span,
  .role-pill,
  .owner-fab-item,
  .owner-fab-btn,
  .badge-chip,
  .action-dropdown-menu button,
  table th,
  .modal h2,
  .auth-card h1 {
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

        body { margin: 0; padding: 20px; font-family: 'Roboto Mono', monospace; color: #000; background: #fff; }
        .no-print { display: none !important; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        th, td { border: 1px solid #ccc; padding: 8px; font-size: 0.85rem; }
        @media print { body { padding: 0; } }
      
  /* Compact Card Density Mode (8-10 Items / Screen) */
  .compact-density .row-card {
    padding: 8px 10px !important;
    margin-bottom: 6px !important;
    gap: 6px !important;
    border-radius: 8px !important;
  }
  .compact-density .row-main h3 {
    font-size: 0.85rem !important;
    margin-bottom: 1px !important;
  }
  .compact-density .row-main .meta {
    font-size: 0.68rem !important;
    margin-bottom: 1px !important;
  }
  .compact-density .row-main .notes {
    display: none !important;
  }
  .compact-density .stamp {
    font-size: 0.58rem !important;
    padding: 2px 6px !important;
  }
  .compact-density .stamp-btn {
    padding: 5px 8px !important;
    font-size: 0.7rem !important;
  }




\x3C/style\x3E
    </head>

    <body>
      ${printArea.innerHTML}
      \x3Cscript\x3E
        window.onload = function() { window.print(); setTimeout(() => { window.close(); }, 500); };
      \x3C/script\x3E
    </body>



    </html>
  `);
  printWindow.document.close();
};

window.__openRecordPaymentModal = function(billId) {
  const b = (cache.vendorBills || []).find(x => x.id === billId);
  if (!b) return;

  const holder = getModalHolder('vendorModalHolder');
  const vendorName = getVendorName(b);
  const billNo = getBillNo(b);
  const billAmt = getBillAmount(b);
  const paidAmt = getBillPaidAmount(b);
  const balance = getBillBalanceAmount(b);

  holder.innerHTML = `
  <div class="overlay show"><div class="modal" style="max-width:440px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--paper-line);">
      <h2 style="margin:0;font-size:1.1rem;">💳 Record Payment</h2>
      <button class="stamp-btn ghost small" onclick="getModalHolder('vendorModalHolder').innerHTML=''">✕</button>
    </div>

    <div style="background:var(--paper);border:1px solid var(--paper-line);border-radius:8px;padding:12px;margin-bottom:14px;display:flex;flex-direction:column;gap:6px;">
      <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
        <span style="color:var(--ink-soft);">Supplier:</span>
        <b style="color:var(--ink);text-transform:uppercase;">${esc(vendorName)}</b>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
        <span style="color:var(--ink-soft);">Bill No:</span>
        <b style="font-family:'Roboto Mono',monospace;">#${esc(billNo)}</b>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
        <span style="color:var(--ink-soft);">Bill Amount:</span>
        <b style="font-family:'Roboto Mono',monospace;">₹${billAmt.toLocaleString('en-IN')}</b>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.85rem;">
        <span style="color:var(--ink-soft);">Already Paid:</span>
        <b style="font-family:'Roboto Mono',monospace;color:var(--turmeric);">₹${paidAmt.toLocaleString('en-IN')}</b>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.95rem;padding-top:6px;border-top:1px dashed var(--paper-line);">
        <b style="color:var(--turmeric);">Outstanding Balance:</b>
        <b style="font-family:'Roboto Mono',monospace;color:var(--turmeric);font-size:1.05rem;">₹${balance.toLocaleString('en-IN')}</b>
      </div>
    </div>

    <label>Payment Amount (₹) *</label>
    <input type="number" step="any" id="mSinglePayAmount" value="${balance}" placeholder="Enter amount paid" style="font-family:'Roboto Mono',monospace;font-size:1.1rem;font-weight:700;" oninput="window.__calcSinglePayRemaining(${balance})">

    <div style="margin-top:6px;font-size:0.82rem;font-weight:600;display:flex;justify-content:space-between;" id="mSinglePayRemainingDisp">
      <span>Remaining Balance after payment:</span>
      <b style="color:var(--turmeric);font-family:'Roboto Mono',monospace;">₹0</b>
    </div>

    <label style="margin-top:12px;">Payment Mode</label>
    <select id="mSinglePayMode">
      <option value="Cash">Cash</option>
      <option value="GPay / Online Transfer">GPay / Online Transfer</option>
      <option value="Cheque">Cheque</option>
      <option value="Bank NEFT / RTGS">Bank NEFT / RTGS</option>
    </select>

    <label>Remarks / Notes</label>
    <input id="mSinglePayRemarks" placeholder="e.g. Cash payment by Owner">

    <div class="modal-actions" style="margin-top:18px;">
      <button class="stamp-btn ghost" onclick="getModalHolder('vendorModalHolder').innerHTML=''">Cancel</button>
      <button class="stamp-btn" style="background:var(--turmeric);color:#fff;" onclick="window.__saveSingleBillPayment('${b.id}')">💾 Save Payment & Print</button>
    </div>
  </div></div>`;
};

window.__calcSinglePayRemaining = function(balance) {
  const payInput = document.getElementById('mSinglePayAmount');
  const disp = document.getElementById('mSinglePayRemainingDisp');
  if (!payInput || !disp) return;

  const payVal = Number(payInput.value || 0);
  const rem = Math.max(0, balance - payVal);
  disp.innerHTML = `
    <span>Remaining Balance after payment:</span>
    <b style="color:${rem > 0 ? 'var(--turmeric)' : 'var(--turmeric)'};font-family:'Roboto Mono',monospace;">₹${rem.toLocaleString('en-IN')}</b>
  `;
};

window.__saveSingleBillPayment = async function(billId) {
  const b = (cache.vendorBills || []).find(x => x.id === billId);
  if (!b) return;

  const payAmt = Number(document.getElementById('mSinglePayAmount').value || 0);
  const mode = document.getElementById('mSinglePayMode').value;
  const remarks = document.getElementById('mSinglePayRemarks').value.trim() || 'Cash payment';

  if (!payAmt || payAmt <= 0) {
    alert('Please enter a valid Payment Amount.');
    return;
  }

  const currentPaid = getBillPaidAmount(b);
  const newPaid = currentPaid + payAmt;
  const totalAmt = getBillAmount(b);
  const newBalance = Math.max(0, totalAmt - newPaid);
  const newStatus = newPaid >= totalAmt ? 'paid' : 'partial';
  const nowIso = new Date().toISOString();

  // 1. Update Bill Record
  b.paid_amount = newPaid;
  b.balance_amount = newBalance;
  b.status = newStatus;
  b.paid_at = nowIso;
  b.paid_by = session.staffId;

  // 2. Log Payment Transaction
  const paymentEntry = {
    id: 'vp_' + Date.now() + '_' + Math.random().toString(36).substring(2,6),
    business_id: session.businessId,
    bill_id: b.id,
    vendor_name: getVendorName(b),
    bill_no: getBillNo(b),
    date: todayStr(),
    amount: payAmt,
    payment_mode: mode,
    remarks: remarks,
    created_by: session.staffId,
    created_at: nowIso
  };

  if (!cache.vendorPayments) cache.vendorPayments = [];
  cache.vendorPayments.unshift(paymentEntry);

  showLoading();
  try {
    localStorage.setItem('br_vendor_bills_' + session.businessId, JSON.stringify(cache.vendorBills));
    localStorage.setItem('br_vendor_payments_' + session.businessId, JSON.stringify(cache.vendorPayments));

    if (typeof sb !== 'undefined' && !b.id.startsWith('loc_')) {
      await sb.from('vendor_bills').update({
        paid_amount: newPaid,
        balance_amount: newBalance,
        status: newStatus,
        paid_at: nowIso,
        paid_by: session.staffId
      }).eq('id', b.id);

      Promise.resolve(sb.from('vendor_payments').insert(paymentEntry)).catch(()=>{});
    }
  } catch(e) {
    console.warn('Payment cloud save exception:', e);
    queueOfflineMutation('update', 'vendor_bills', { id: b.id, paid_amount: newPaid, balance_amount: newBalance, status: newStatus });
    queueOfflineMutation('insert', 'vendor_payments', paymentEntry);
  } finally {
    hideLoading();
  }

  getModalHolder('vendorModalHolder').innerHTML = '';
  logAuditEvent('Vendor Payment Recorded', `Recorded ₹${payAmt} payment for Bill #${getBillNo(b)} (${getVendorName(b)})`);
  window.showToast(`✅ Payment of ₹${payAmt} saved! Status: ${newStatus.toUpperCase()}`, 'success');
  renderTabBody();

  // 3. Launch Payment Voucher Printable Modal
  window.__showPaymentVoucherModal({
    vendorName: getVendorName(b),
    bills: [b],
    totalAmount: payAmt,
    paymentMode: mode,
    notes: remarks
  });
};

window.__openVendorPaymentHistoryModal = function(billId) {
  const b = (cache.vendorBills || []).find(x => x.id === billId);
  if (!b) return;

  const holder = getModalHolder('vendorModalHolder');
  const vendorName = getVendorName(b);
  const billNo = getBillNo(b);
  const billAmt = getBillAmount(b);
  const paidAmt = getBillPaidAmount(b);
  const balance = getBillBalanceAmount(b);

  const payments = (cache.vendorPayments || []).filter(p => p.bill_id === b.id || (p.vendor_name === vendorName && p.bill_no === billNo));

  holder.innerHTML = `
  <div class="overlay show"><div class="modal" style="max-width:500px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--paper-line);">
      <h2 style="margin:0;font-size:1.1rem;">📜 Payment History</h2>
      <button class="stamp-btn ghost small" onclick="getModalHolder('vendorModalHolder').innerHTML=''">✕</button>
    </div>

    <div style="background:var(--paper);border:1px solid var(--paper-line);border-radius:8px;padding:10px 12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <b style="font-size:0.9rem;">${esc(vendorName)}</b>
        <div style="font-size:0.75rem;color:var(--ink-soft);font-family:'Roboto Mono',monospace;">Bill #${esc(billNo)} &bull; Total ₹${billAmt.toLocaleString('en-IN')}</div>
      </div>
      <div style="text-align:right;">
        <span class="stamp ${newStatusClass(getBillStatus(b))}">${getBillStatus(b).toUpperCase()}</span>
      </div>
    </div>

    <div class="section-label">Payment Transactions (${payments.length})</div>

    ${payments.length ? `
      <div style="display:flex;flex-direction:column;gap:8px;max-height:240px;overflow-y:auto;">
        ${payments.map(p => `
          <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;padding:10px 12px;border-radius:6px;border:1px solid var(--paper-line);font-size:0.82rem;">
            <div>
              <b style="font-family:'Roboto Mono',monospace;color:var(--turmeric);font-size:0.95rem;">₹${Number(p.amount||0).toLocaleString('en-IN')}</b>
              <div style="font-size:0.72rem;color:var(--ink-soft);margin-top:2px;">
                ${p.date} &bull; ${esc(p.payment_mode||'Cash')} &bull; By ${esc(staffName(p.created_by))}
              </div>
              ${p.remarks ? `<div style="font-size:0.75rem;color:var(--ink);margin-top:2px;font-style:italic;">"${esc(p.remarks)}"</div>` : ''}
            </div>
            <button class="stamp-btn small ghost" onclick="window.__printSinglePaymentReceipt('${p.id}')">🖨 Voucher</button>
          </div>
        `).join('')}
      </div>
    ` : `<div class="empty" style="padding:20px;">No individual payment logs recorded yet.</div>`}

    <div style="margin-top:14px;padding-top:10px;border-top:1px dashed var(--paper-line);display:flex;justify-content:space-between;align-items:center;font-size:0.88rem;">
      <span>Total Paid: <b style="color:var(--turmeric);font-family:'Roboto Mono',monospace;">₹${paidAmt.toLocaleString('en-IN')}</b></span>
      <span>Balance: <b style="color:${balance > 0 ? 'var(--turmeric)' : 'var(--turmeric)'};font-family:'Roboto Mono',monospace;">₹${balance.toLocaleString('en-IN')}</b></span>
    </div>

    <div class="modal-actions" style="margin-top:16px;">
      <button class="stamp-btn ghost" style="width:100%;" onclick="getModalHolder('vendorModalHolder').innerHTML=''">Close</button>
    </div>
  </div></div>`;

  window.__printSinglePaymentReceipt = function(pId) {
    const p = (cache.vendorPayments || []).find(x => x.id === pId);
    if (!p) return;
    window.__showPaymentVoucherModal({
      vendorName: p.vendor_name || vendorName,
      bills: [b],
      totalAmount: p.amount,
      paymentMode: p.payment_mode || 'Cash',
      notes: p.remarks || '',
      voucherNo: p.id
    });
  };
};

function newStatusClass(st) {
  if (st === 'paid') return 'done';
  if (st === 'partial') return 'medium';
  return 'pending';
}

/* ---------------- BULK VENDOR SETTLEMENT MODAL ---------------- */
window.__openBulkVendorSettlementModal = function() {
  const holder = getModalHolder('vendorModalHolder');
  const bills = cache.vendorBills || [];
  const unpaid = bills.filter(b => b.status !== 'paid');

  if (!unpaid.length) {
    alert('No unpaid vendor bills available for bulk settlement!');
    return;
  }

  const vendorsList = Array.from(new Set(unpaid.map(getVendorName).filter(Boolean))).sort();

  holder.innerHTML = `
  <div class="overlay show"><div class="modal" style="max-width:540px;">
    <h2>💳 Bulk Vendor Bill Settlement & Voucher</h2>
    <p style="font-size:0.82rem;color:var(--ink-soft);margin:0 0 12px;">Settle multiple bills for a vendor and generate an official printable Payment Voucher.</p>

    <label>Select Vendor / Supplier *</label>
    <select id="mBulkSelectVendor" onchange="window.__renderBulkVendorBillsList(this.value)">
      <option value="">-- Pick a Vendor --</option>
      ${vendorsList.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')}
    </select>

    <div id="mBulkVendorBillsArea" style="margin-top:12px;"></div>

    <label>Payment Mode</label>
    <select id="mBulkPaymentMode">
      <option value="Cash">Cash</option>
      <option value="GPay / Online Transfer">GPay / Online Transfer</option>
      <option value="Cheque">Cheque</option>
      <option value="Bank NEFT / RTGS">Bank NEFT / RTGS</option>
    </select>

    <label>Notes / Voucher Description</label>
    <input id="mBulkNotes" placeholder="e.g. Bulk settlement against monthly purchase invoices">

    <div class="modal-actions" style="margin-top:20px;">
      <button class="stamp-btn ghost" onclick="getModalHolder('vendorModalHolder').innerHTML=''">Cancel</button>
      <button class="stamp-btn" style="background:var(--turmeric);color:#fff;border-color:var(--turmeric);" onclick="window.__submitBulkVendorPayment()">✓ Settle & Generate Voucher</button>
    </div>
  </div></div>`;

  window.__renderBulkVendorBillsList = function(vendor) {
    const area = document.getElementById('mBulkVendorBillsArea');
    if (!area) return;
    if (!vendor) { area.innerHTML = ''; return; }

    const vBills = unpaid.filter(b => getVendorName(b) === vendor);
    const totalV = vBills.reduce((s, b) => s + getBillAmount(b), 0);

    area.innerHTML = `
      <div style="background:var(--paper);border:1px solid var(--paper-line);border-radius:8px;padding:12px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <b style="font-size:0.85rem;color:var(--turmeric-dark);">Unpaid Invoices (${vBills.length})</b>
          <label style="font-size:0.75rem;font-weight:700;color:var(--turmeric);cursor:pointer;margin:0;">
            <input type="checkbox" checked onchange="document.querySelectorAll('.mBulkBillCb').forEach(c=>c.checked=this.checked);window.__calcBulkVendorTotal();"> Select All
          </label>
        </div>

        <div style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
          ${vBills.map(b => `
            <div style="display:flex;justify-content:space-between;align-items:center;background:#fff;padding:8px 10px;border-radius:6px;border:1px solid var(--paper-line);font-size:0.82rem;">
              <label style="display:flex;align-items:center;gap:8px;margin:0;cursor:pointer;flex:1;">
                <input type="checkbox" class="mBulkBillCb" value="${b.id}" data-amount="${getBillAmount(b)}" checked onchange="window.__calcBulkVendorTotal()">
                <span>Bill <b>#${esc(getBillNo(b))}</b> (${b.bill_date})</span>
              </label>
              <b style="font-family:'Roboto Mono',monospace;color:var(--turmeric);">₹${getBillAmount(b).toFixed(0)}</b>
            </div>
          `).join('')}
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:8px;border-top:1px dashed var(--paper-line);">
          <span style="font-size:0.82rem;font-weight:700;">Total Settlement Amount:</span>
          <b id="mBulkVendorTotalDisp" style="font-family:'Roboto Mono',monospace;font-size:1.1rem;color:var(--turmeric);">₹${totalV.toFixed(0)}</b>
        </div>
      </div>
    `;
  };

  window.__calcBulkVendorTotal = function() {
    const cbs = document.querySelectorAll('.mBulkBillCb:checked');
    let total = 0;
    cbs.forEach(c => { total += Number(c.dataset.amount || 0); });
    const disp = document.getElementById('mBulkVendorTotalDisp');
    if (disp) disp.textContent = '₹' + total.toFixed(0);
  };
};


window.__submitBulkVendorPayment = async function() {
  const vendor = document.getElementById('mBulkSelectVendor') ? document.getElementById('mBulkSelectVendor').value : '';
  if (!vendor) { alert('Please select a vendor.'); return; }

  const checkedCbs = Array.from(document.querySelectorAll('.mBulkBillCb:checked'));
  if (!checkedCbs.length) { alert('Please select at least one bill to settle.'); return; }

  const selectedIds = checkedCbs.map(c => c.value);
  const bills = cache.vendorBills || [];
  const selectedBills = bills.filter(b => selectedIds.includes(b.id));

  const totalCashInput = prompt('Enter Total Cash Amount Paid (₹) for ' + vendor + ':', selectedBills.reduce((s,b)=>s+getBillBalanceAmount(b), 0));
  if (totalCashInput === null) return;
  
  let remainingCash = Number(totalCashInput || 0);
  if (remainingCash <= 0) { alert('Please enter a valid cash amount.'); return; }

  const nowIso = new Date().toISOString();
  const mode = document.getElementById('mBulkPaymentMode') ? document.getElementById('mBulkPaymentMode').value : 'Cash';
  const notes = document.getElementById('mBulkNotes') ? document.getElementById('mBulkNotes').value.trim() : 'Bulk settlement';

  const affectedBills = [];
  let totalSettled = 0;

  for (const b of selectedBills) {
    if (remainingCash <= 0) break;

    const outstanding = getBillBalanceAmount(b);
    if (outstanding <= 0) continue;

    const payVal = Math.min(remainingCash, outstanding);
    const totalAmt = getBillAmount(b);
    const currentPaid = getBillPaidAmount(b);
    const newPaid = currentPaid + payVal;
    const newBalance = Math.max(0, totalAmt - newPaid);
    const newStatus = newPaid >= totalAmt ? 'paid' : 'partial';

    b.paid_amount = newPaid;
    b.balance_amount = newBalance;
    b.status = newStatus;
    b.paid_at = nowIso;
    b.paid_by = session.staffId;

    remainingCash -= payVal;
    totalSettled += payVal;
    affectedBills.push(b);

    const paymentEntry = {
      id: 'vp_' + Date.now() + '_' + Math.random().toString(36).substring(2,6),
      business_id: session.businessId,
      bill_id: b.id,
      vendor_name: getVendorName(b),
      bill_no: getBillNo(b),
      date: todayStr(),
      amount: payVal,
      payment_mode: mode,
      remarks: notes,
      created_by: session.staffId,
      created_at: nowIso
    };

    if (!cache.vendorPayments) cache.vendorPayments = [];
    cache.vendorPayments.unshift(paymentEntry);

    if (typeof sb !== 'undefined' && !b.id.startsWith('loc_')) {
      Promise.resolve(sb.from('vendor_bills').update({
        paid_amount: newPaid, balance_amount: newBalance, status: newStatus, paid_at: nowIso, paid_by: session.staffId
      }).eq('id', b.id)).catch(()=>{});
      Promise.resolve(sb.from('vendor_payments').insert(paymentEntry)).catch(()=>{});
    }
  }

  try {
    localStorage.setItem('br_vendor_bills_' + session.businessId, JSON.stringify(cache.vendorBills));
    localStorage.setItem('br_vendor_payments_' + session.businessId, JSON.stringify(cache.vendorPayments));
  } catch(e){}

  getModalHolder('vendorModalHolder').innerHTML = '';
  logAuditEvent('Bulk Vendor Payment', `Paid ₹${totalSettled} across ${affectedBills.length} bills for ${vendor}`);
  window.showToast(`✅ Distributed ₹${totalSettled} cash across ${affectedBills.length} bills!`, 'success');
  renderTabBody();

  // Open Payment Voucher Printable Modal
  window.__showPaymentVoucherModal({
    vendorName: vendor,
    bills: affectedBills,
    totalAmount: totalSettled,
    paymentMode: mode,
    notes: notes
  });
};


/* ---------------- CALENDAR SUB-TAB ---------------- */

window.__shiftAccCalMonth = function(delta) {
  if(!accCalMonth) accCalMonth = localMonthStr(new Date());
  const [y, m] = accCalMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  accCalMonth = localMonthStr(d);
  renderTabBody();
};


function renderAccCalendarHtml(){
  const curM = accCalMonth;
  const [y, m] = curM.split('-').map(Number);
  const firstDay = new Date(y, m-1, 1);
  const lastDay = new Date(y, m, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay(); // 0=Sun

  const cells = [];
  // Pad leading days
  for(let i=0; i<startDayOfWeek; i++) cells.push('<div style="background:transparent;"></div>');

  for(let day=1; day<=daysInMonth; day++){
    const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const rec = cache.dailyAccounts.find(a => a.date === dateStr);
    const isToday = dateStr === todayStr();
    const totals = rec ? calcAccTotals(rec) : null;

    let badgeBg = 'var(--paper)';
    let badgeText = '—';
    let color = 'var(--ink-soft)';

    if(rec){
      if(totals.excess > 0){
        badgeBg = 'var(--blue-soft)'; badgeText = '+' + totals.excess.toFixed(0); color = 'var(--turmeric)';
      } else if(totals.less > 0){
        badgeBg = 'var(--blue-soft)'; badgeText = '-' + totals.less.toFixed(0); color = 'var(--turmeric)';
      } else {
        badgeBg = 'var(--blue-soft)'; badgeText = '✓ OK'; color = 'var(--turmeric)';
      }
    }

    cells.push(`
      <div onclick="accountsDate='${dateStr}';accountsSubTab='entry';renderTabBody();" style="background:${isToday?'var(--blue-soft)':badgeBg};border:1px solid ${isToday?'var(--turmeric)':'var(--paper-line)'};border-radius:6px;padding:6px 4px;min-height:54px;display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;transition:transform 0.15s ease;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-weight:700;font-size:0.8rem;color:${isToday?'var(--turmeric-dark)':'var(--ink)'}">${day}</span>
          ${rec && isAccRecordChecked(rec) ? '<span style="color:var(--turmeric);font-size:0.75rem;font-weight:700;">✓ CHECKED</span>' : ''}
        </div>
        <div style="font-family:'Roboto Mono',monospace;font-size:0.65rem;font-weight:700;color:${color};text-align:right;">
          ${badgeText}
        </div>
      </div>
    `);
  }

  return `
    <div class="row-card" style="flex-direction:column;align-items:stretch;margin-bottom:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <h3 style="margin:0;font-size:1.05rem;color:var(--turmeric-dark);">Monthly Accounts Calendar</h3>
        <div style="display:flex;align-items:center;gap:6px;">
          <button class="stamp-btn ghost small" onclick="window.__shiftAccCalMonth(-1)">‹ Prev</button>
          <input type="month" value="${curM}" onchange="accCalMonth=this.value;renderTabBody();" style="font-family:'Roboto Mono',monospace;font-weight:700;padding:4px 8px;border:1px solid var(--paper-line);border-radius:6px;">
          <button class="stamp-btn ghost small" onclick="window.__shiftAccCalMonth(1)">Next ›</button>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:4px;text-align:center;font-size:0.7rem;font-weight:700;color:var(--ink-soft);margin-bottom:6px;">
        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(7, 1fr);gap:4px;">
        ${cells.join('')}
      </div>
    </div>
  `;
}

