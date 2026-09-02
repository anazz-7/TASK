/* ---------------- REPORTS & RESPONSIVE AI INSIGHTS ---------------- */
function renderAccReportsHtml(){
  const mode = accReportMode;
  const today = new Date();
  const buckets = [];

  if(mode === 'weekly'){
    for(let i=7; i>=0; i--){
      const anchor = new Date(today); anchor.setDate(anchor.getDate() - i*7);
      const weekStart = getWeekStartDate(anchor);
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate()+6);
      const sKey = localDateStr(weekStart);
      const eKey = localDateStr(weekEnd);
      const total = cache.dailyAccounts.filter(a => a.date >= sKey && a.date <= eKey).reduce((sum,a) => sum + Number(a.total_sales||0), 0);
      buckets.push({ total, label: weekStart.toLocaleDateString('en-IN',{day:'numeric',month:'short'}) });
    }
  } else if(mode === 'monthly'){
    for(let i=11; i>=0; i--){
      const d = new Date(today.getFullYear(), today.getMonth()-i, 1);
      const key = localMonthStr(d);
      const total = cache.dailyAccounts.filter(a => a.date.startsWith(key)).reduce((sum,a) => sum + Number(a.total_sales||0), 0);
      buckets.push({ total, label: d.toLocaleDateString('en-IN',{month:'short',year:'2-digit'}) });
    }
  } else if(mode === 'yearly'){
    const curYear = today.getFullYear();
    for(let y = curYear - 4; y <= curYear; y++){
      const total = cache.dailyAccounts.filter(a => a.date.startsWith(String(y))).reduce((sum,a) => sum + Number(a.total_sales||0), 0);
      buckets.push({ total, label: String(y) });
    }
  } else {
    const dates = cache.dailyAccounts.map(a => a.date).sort();
    if(dates.length){
      const minMonth = dates[0].slice(0,7);
      const maxMonth = dates[dates.length-1].slice(0,7);
      let [y, m] = minMonth.split('-').map(Number);
      const [endY, endM] = maxMonth.split('-').map(Number);

      while(y < endY || (y === endY && m <= endM)){
        const k = `${y}-${String(m).padStart(2,'0')}`;
        const total = cache.dailyAccounts.filter(a => a.date.startsWith(k)).reduce((sum,a) => sum + Number(a.total_sales||0), 0);
        const dObj = new Date(y, m-1, 1);
        buckets.push({ total, label: dObj.toLocaleDateString('en-IN',{month:'short',year:'2-digit'}) });
        m++;
        if(m > 12){ m = 1; y++; }
      }
    }
    if(!buckets.length) buckets.push({ total: 0, label: today.toLocaleDateString('en-IN',{month:'short',year:'2-digit'}) });
  }

  const maxSales = Math.max(1, ...buckets.map(b => b.total));
  const totalSalesPeriod = buckets.reduce((s,b) => s + b.total, 0);
  const avgSalesPeriod = buckets.length ? totalSalesPeriod / buckets.length : 0;
  const highestBucket = Math.max(0, ...buckets.map(b => b.total));

  // Compute AI Financial Intelligence Metrics
  const allAcc = cache.dailyAccounts;
  const totSalesAll = allAcc.reduce((s,a)=>s+Number(a.total_sales||0),0);
  const totCashAll = allAcc.reduce((s,a)=>s+Number(a.amount||0),0);
  const totGpayAll = allAcc.reduce((s,a)=>s+Number(a.gpay||0),0);
  const totCreditAll = allAcc.reduce((s,a)=>s+Number(a.credit||0),0);
  const totExpAll = allAcc.reduce((s,a)=>s+Number(a.expenses||0),0);
  
  const digitalPct = totSalesAll ? Math.round((totGpayAll / totSalesAll) * 100) : 0;
  const creditPct = totSalesAll ? Math.round((totCreditAll / totSalesAll) * 100) : 0;
  const healthScore = Math.max(50, Math.min(99, 100 - creditPct + Math.min(20, digitalPct/2)));

  // SVG Line Graph (Fixed height & padding to prevent label overlap)
  const width = 680;
  const height = 240;
  const padding = 36;

  const points = buckets.map((b, i) => {
    const x = padding + (i / Math.max(1, buckets.length - 1)) * (width - padding * 2);
    const y = height - padding - (b.total / maxSales) * (height - padding * 2);
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
    areaD = pathD + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
  }

  const svgGraphHtml = `
    <div style="background:var(--card);border:1px solid var(--paper-line);border-radius:10px;padding:14px;margin-bottom:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div>
          <h3 style="margin:0;font-size:1.05rem;color:var(--turmeric-dark);">Accounts Total Sales Line Graph</h3>
          <div style="font-size:0.75rem;color:var(--ink-soft);">Sales performance over time</div>
        </div>
        <span class="stamp done">${buckets.length} Buckets</span>
      </div>

      <div style="position:relative;width:100%;overflow-x:auto;">
        <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;min-width:320px;overflow:visible;">
          <defs>
            <linearGradient id="accLineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#1E3A6E" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="#1E3A6E" stop-opacity="0.0"/>
            </linearGradient>
          </defs>

          <line x1="${padding}" y1="${padding}" x2="${width-padding}" y2="${padding}" stroke="var(--paper-line)" stroke-dasharray="3,3"/>
          <line x1="${padding}" y1="${height/2}" x2="${width-padding}" y2="${height/2}" stroke="var(--paper-line)" stroke-dasharray="3,3"/>
          <line x1="${padding}" y1="${height-padding}" x2="${width-padding}" y2="${height-padding}" stroke="var(--paper-line)"/>

          ${areaD ? `<path d="${areaD}" fill="url(#accLineGrad)"/>` : ''}
          ${pathD ? `<path d="${pathD}" fill="none" stroke="#1E3A6E" stroke-width="3" stroke-linecap="round"/>` : ''}

          ${points.map(p => `
            <g>
              <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="var(--paper)" stroke="#1E3A6E" stroke-width="2.5"/>
              <text x="${p.x}" y="${Math.max(16, p.y - 12)}" text-anchor="middle" font-size="11" font-weight="700" fill="var(--turmeric-dark)" font-family="'Roboto Mono',monospace">
                ${p.val > 0 ? '₹' + (p.val >= 1000 ? Math.round(p.val/1000)+'k' : Math.round(p.val)) : ''}
              </text>
              <text x="${p.x}" y="${height - 12}" text-anchor="middle" font-size="11" font-weight="600" fill="var(--ink-soft)" font-family="'Roboto Mono',monospace">
                ${p.label}
              </text>
            </g>
          `).join('')}
        </svg>
      </div>

      <div class="cards-grid" style="grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin-top:16px;">
        <div style="background:var(--paper);padding:10px;border-radius:8px;text-align:center;">
          <div style="font-size:0.72rem;color:var(--ink-soft);text-transform:uppercase;font-weight:600;">Period Total Sales</div>
          <div style="font-family:'Roboto Mono',monospace;font-size:1.15rem;font-weight:700;color:var(--turmeric);margin-top:2px;">₹${totalSalesPeriod.toFixed(0)}</div>
        </div>
        <div style="background:var(--paper);padding:10px;border-radius:8px;text-align:center;">
          <div style="font-size:0.72rem;color:var(--ink-soft);text-transform:uppercase;font-weight:600;">Average Sales</div>
          <div style="font-family:'Roboto Mono',monospace;font-size:1.15rem;font-weight:700;color:var(--turmeric-dark);margin-top:2px;">₹${avgSalesPeriod.toFixed(0)}</div>
        </div>
        <div style="background:var(--paper);padding:10px;border-radius:8px;text-align:center;">
          <div style="font-size:0.72rem;color:var(--ink-soft);text-transform:uppercase;font-weight:600;">Highest Sales</div>
          <div style="font-family:'Roboto Mono',monospace;font-size:1.15rem;font-weight:700;color:var(--turmeric);margin-top:2px;">₹${highestBucket.toFixed(0)}</div>
        </div>
        <div style="background:var(--paper);padding:10px;border-radius:8px;text-align:center;">
          <div style="font-size:0.72rem;color:var(--ink-soft);text-transform:uppercase;font-weight:600;">Days Recorded</div>
          <div style="font-family:'Roboto Mono',monospace;font-size:1.15rem;font-weight:700;color:var(--ink);margin-top:2px;">${cache.dailyAccounts.length} Days</div>
        </div>
      </div>
    </div>
  `;

  // 100% RESPONSIVE AI Financial Insights Container
  const aiInsightsHtml = `
    <div class="row-card" style="flex-direction:column;align-items:stretch;border:1.5px solid var(--turmeric);background:var(--card);box-shadow:0 4px 12px rgba(15,118,110,0.06);margin-top:14px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
        <div>
          <h3 style="margin:0;font-size:1.05rem;color:var(--turmeric);">AI Financial Health Insights & Analytics</h3>
          <div style="font-size:0.75rem;color:var(--ink-soft);">Automated smart cash flow intelligence</div>
        </div>
        <span class="stamp done" style="background:var(--blue-soft);color:var(--turmeric);border-color:var(--turmeric);font-size:0.72rem;">Score: ${healthScore}% Optimal</span>
      </div>

      <!-- Responsive CSS Grid layout for AI Metrics -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;margin-bottom:14px;">
        <div style="background:var(--paper);padding:10px;border-radius:8px;border:1px solid var(--paper-line);">
          <div style="font-size:0.7rem;color:var(--ink-soft);font-weight:700;text-transform:uppercase;">Digital / UPI Ratio</div>
          <div style="font-family:'Roboto Mono',monospace;font-size:1.15rem;font-weight:700;color:var(--turmeric-dark);margin-top:2px;">${digitalPct}%</div>
          <div style="font-size:0.68rem;color:var(--ink-soft);margin-top:2px;">GPay & Bank Receipts</div>
        </div>
        <div style="background:var(--paper);padding:10px;border-radius:8px;border:1px solid var(--paper-line);">
          <div style="font-size:0.7rem;color:var(--ink-soft);font-weight:700;text-transform:uppercase;">Credit Dependency</div>
          <div style="font-family:'Roboto Mono',monospace;font-size:1.15rem;font-weight:700;color:${creditPct>25?'var(--turmeric)':'var(--turmeric)'};margin-top:2px;">${creditPct}%</div>
          <div style="font-size:0.68rem;color:var(--ink-soft);margin-top:2px;">${creditPct>25?'High Credit Risk':'Controlled Credit'}</div>
        </div>
        <div style="background:var(--paper);padding:10px;border-radius:8px;border:1px solid var(--paper-line);">
          <div style="font-size:0.7rem;color:var(--ink-soft);font-weight:700;text-transform:uppercase;">Total Shop Expenses</div>
          <div style="font-family:'Roboto Mono',monospace;font-size:1.15rem;font-weight:700;color:var(--turmeric);margin-top:2px;">₹${totExpAll.toFixed(0)}</div>
          <div style="font-size:0.68rem;color:var(--ink-soft);margin-top:2px;">Operational Cash Out</div>
        </div>
      </div>

      <!-- Actionable AI Recommendations -->
      <div style="background:var(--blue-soft);padding:12px;border-radius:8px;border-left:4px solid var(--turmeric);">
        <div style="font-size:0.82rem;font-weight:700;color:var(--turmeric);margin-bottom:4px;">Smart AI Recommendation</div>
        <div style="font-size:0.8rem;color:var(--ink);line-height:1.4;">
          ${creditPct > 20 ? 'Credit sales account for ' + creditPct + '% of total register revenue. Consider encouraging immediate GPay / UPI payments for small orders to maintain healthy liquidity.' : 'Cash flow is well-balanced with ' + digitalPct + '% digital collections and controlled credit risk.'}
        </div>
      </div>
    </div>
  `;

  return `
    <div class="row-card" style="flex-direction:column;align-items:stretch;margin-bottom:14px;">
      <!-- Duration Toggle Bar -->
      <div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;">
        <button class="stamp-btn small ${mode==='weekly'?'':'ghost'}" onclick="window.__setAccReportMode('weekly')">Weekly</button>
        <button class="stamp-btn small ${mode==='monthly'?'':'ghost'}" onclick="window.__setAccReportMode('monthly')">Monthly</button>
        <button class="stamp-btn small ${mode==='yearly'?'':'ghost'}" onclick="window.__setAccReportMode('yearly')">Yearly</button>
        <button class="stamp-btn small ${mode==='all'?'':'ghost'}" onclick="window.__setAccReportMode('all')">All Time</button>
      </div>

      ${svgGraphHtml}
      ${aiInsightsHtml}
    </div>
  `;
}



function renderAccBackupHtml(){
  return `
    <div class="cards-grid">
      <div class="row-card" style="flex-direction:column;align-items:stretch;">
        <h3>Restore from JSON Backup File</h3>
        <p style="font-size:0.82rem;color:var(--ink-soft);">Restore a previously exported accounts JSON backup file.</p>
        <button class="stamp-btn" onclick="document.getElementById('accJsonInput').click()">Choose JSON Backup File (.json)</button>
        <input type="file" id="accJsonInput" accept=".json" style="display:none" onchange="window.__restoreAccJson(this)">
      </div>

      <div class="row-card" style="flex-direction:column;align-items:stretch;">
        <h3>Export Accounts Data</h3>
        <p style="font-size:0.82rem;color:var(--ink-soft);">Download all recorded daily accounts as an Excel-friendly CSV spreadsheet or JSON backup.</p>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="stamp-btn small" style="flex:1;" onclick="window.__exportAccCsv()">CSV Spreadsheet</button>
          <button class="stamp-btn ghost small" style="flex:1;" onclick="window.__exportAccJson()">JSON Backup</button>
        </div>
      </div>
    </div>
  `;
}

window.__exportAccCsv = function() {
  const sorted = cache.dailyAccounts.slice().sort((a,b) => (a.date < b.date ? -1 : 1));
  const checkedSet = getAccCheckedSet();
  const header = ["Date", ...ACC_FIELDS.map(f => f.label), "Total", "Excess", "Less", "Checked Status", "Notes"];
  const lines = [header.join(",")];
  sorted.forEach(r => {
    const isC = checkedSet.has(r.id) || checkedSet.has(r.date) || Boolean(r.is_checked);
    lines.push([r.date, ...ACC_FIELDS.map(f => r[f.key] ?? 0), r.total ?? 0, r.excess ?? 0, r.less ?? 0, isC ? "Checked" : "Unchecked", '"' + (r.notes||'').replace(/"/g,'""') + '"'].join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Daily-Accounts-${session.businessName.replace(/\s+/g,'-')}-${todayStr()}.csv`;
  a.click();
};

window.__exportAccJson = function() {
  const blob = new Blob([JSON.stringify(cache.dailyAccounts, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Daily-Accounts-Backup-${todayStr()}.json`;
  a.click();
};


/* ---------------- REAL EXCEL (.XLSX) IMPORTER & VERIFIED RESTORE (Issue 1 & Issue 2 Fixes) ---------------- */
window.__importAccExcel = async function(input) {
  const file = input.files[0];
  if (!file) return;

  if (typeof XLSX === 'undefined') {
    alert('Excel parsing library is still loading. Please try again in 5 seconds.');
    return;
  }

  try {
    showLoading();
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows.length) {
      hideLoading();
      alert('The uploaded Excel file appears to be empty.');
      return;
    }

    let cloudSuccessCount = 0;
    let cloudErrorCount = 0;
    let localCount = 0;
    const failedLogs = [];

    // Header mapping helper
    const getVal = (row, keys) => {
      for (const k of keys) {
        for (const rowKey of Object.keys(row)) {
          if (rowKey.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')) {
            return row[rowKey];
          }
        }
      }
      return '';
    };

    for (const row of rawRows) {
      let rawDate = getVal(row, ['date', 'transactiondate', 'entrydate', 'day']);
      if (!rawDate) continue;

      let dateStr = '';
      if (rawDate instanceof Date) {
        dateStr = localDateStr(rawDate);
      } else {
        dateStr = String(rawDate).trim().slice(0, 10);
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue; // Must be YYYY-MM-DD format

      const payload = {
        business_id: session.businessId,
        date: dateStr,
        notes: String(getVal(row, ['notes', 'remarks', 'comments']) || '').trim() || null,
        is_checked: false
      };

      const keyMap = {
        total_sales: ['totalsales', 'sales', 'salesamount'],
        amount: ['amount', 'cash', 'cashamount'],
        vendors: ['vendors', 'vendorpayments', 'payouts'],
        credit: ['credit', 'creditgiven'],
        credit_received: ['creditreceived'],
        gpay: ['gpay', 'googlepay', 'upi', 'online'],
        ba_credit: ['bacredit', 'bacreditamount'],
        expenses: ['expenses', 'expenselist'],
        personal_ac: ['personalac', 'ac'],
        salary_paid: ['salarypaid', 'salary'],
        adjustment: ['adjustment']
      };

      ACC_FIELDS.forEach(f => {
        const aliases = keyMap[f.key] || [f.key];
        const val = getVal(row, aliases);
        payload[f.key] = (val !== '' && val !== null && !isNaN(Number(val))) ? Number(val) : 0;
      });

      const totals = calcAccTotals(payload);
      payload.total = totals.total;
      payload.excess = totals.excess;
      payload.less = totals.less;

      // Verified Supabase Save
      if (navigator.onLine && typeof sb !== 'undefined' && session.businessId) {
        try {
          const { error } = await sb.from('daily_accounts').upsert(payload, { onConflict: 'business_id,date' });
          if (error) {
            cloudErrorCount++;
            failedLogs.push(`${dateStr}: ${error.message}`);
          } else {
            cloudSuccessCount++;
          }
        } catch(err) {
          cloudErrorCount++;
          failedLogs.push(`${dateStr}: ${err.message}`);
        }
      } else {
        queueOfflineMutation('upsert', 'daily_accounts', payload);
      }

      // Local Cache Update
      const existing = cache.dailyAccounts.find(a => a.date === payload.date);
      if (!existing) {
        payload.id = 'loc_' + Date.now() + '_' + Math.random().toString(36).substring(2,5);
        cache.dailyAccounts.push(payload);
      } else {
        Object.assign(existing, payload);
      }
      localCount++;
    }

    localStorage.setItem('br_daily_accounts_' + session.businessId, JSON.stringify(cache.dailyAccounts));
    hideLoading();

    // Show Verified Import Summary Modal
    const holder = getModalHolder('taskModalHolder');
    holder.innerHTML = `
      <div class="overlay show"><div class="modal" style="max-width:440px;">
        <h2>📊 Excel Import Summary</h2>
        <div style="background:var(--paper);padding:14px;border-radius:10px;border:1px solid var(--paper-line);margin-bottom:14px;">
          <div style="font-size:0.9rem;margin-bottom:6px;">Total SpreadSheet Rows Processed: <b>${localCount} Day(s)</b></div>
          <div style="font-size:0.9rem;color:var(--turmeric);font-weight:700;margin-bottom:4px;">✅ Verified Saved to Supabase Cloud: ${cloudSuccessCount}</div>
          ${cloudErrorCount > 0 ? `<div style="font-size:0.88rem;color:var(--turmeric);font-weight:700;">⚠️ Cloud Save Failures: ${cloudErrorCount}</div>` : ''}
        </div>
        ${failedLogs.length ? `
          <div style="max-height:120px;overflow-y:auto;background:var(--blue-soft);padding:8px 10px;border-radius:6px;font-size:0.75rem;color:var(--turmeric);font-family:'Roboto Mono',monospace;margin-bottom:14px;">
            ${failedLogs.map(l => `<div>${esc(l)}</div>`).join('')}
          </div>
        ` : ''}
        <button class="stamp-btn" style="width:100%;" onclick="window.__closeVendorModal();renderTabBody();">Done</button>
      </div></div>
    `;

    await loadData();
    renderTabBody();
  } catch(e) {
    hideLoading();
    alert('Error reading Excel spreadsheet: ' + e.message);
  }
};

window.__restoreAccJson = async function(input) {
  const file = input.files[0];
  if(!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : Object.values(data);
    let cloudSuccessCount = 0;
    let cloudErrorCount = 0;
    let localCount = 0;
    const failedLogs = [];

    showLoading();
    for(const rec of list){
      if(!rec || !rec.date) continue;
      const payload = {
        business_id: session.businessId,
        date: rec.date,
        notes: rec.notes || null,
        is_checked: Boolean(rec.is_checked)
      };
      ACC_FIELDS.forEach(f => {
        payload[f.key] = Number(rec[f.key] !== undefined ? rec[f.key] : (rec[f.label] !== undefined ? rec[f.label] : 0));
      });
      const totals = calcAccTotals(payload);
      payload.total = totals.total;
      payload.excess = totals.excess;
      payload.less = totals.less;

      if (navigator.onLine && typeof sb !== 'undefined' && session.businessId) {
        try {
          const { error } = await sb.from('daily_accounts').upsert(payload, { onConflict: 'business_id,date' });
          if (error) {
            cloudErrorCount++;
            failedLogs.push(`${payload.date}: ${error.message}`);
          } else {
            cloudSuccessCount++;
          }
        } catch(err) {
          cloudErrorCount++;
          failedLogs.push(`${payload.date}: ${err.message}`);
        }
      } else {
        queueOfflineMutation('upsert', 'daily_accounts', payload);
      }
      
      const existing = cache.dailyAccounts.find(a => a.date === payload.date);
      if(!existing){
        payload.id = 'loc_' + Date.now() + '_' + Math.random().toString(36).substring(2,5);
        cache.dailyAccounts.push(payload);
      } else {
        Object.assign(existing, payload);
      }
      localCount++;
    }
    localStorage.setItem('br_daily_accounts_' + session.businessId, JSON.stringify(cache.dailyAccounts));
    hideLoading();

    // Show Verified Import Summary Modal
    const holder = getModalHolder('taskModalHolder');
    holder.innerHTML = `
      <div class="overlay show"><div class="modal" style="max-width:440px;">
        <h2>📥 Backup Restore Summary</h2>
        <div style="background:var(--paper);padding:14px;border-radius:10px;border:1px solid var(--paper-line);margin-bottom:14px;">
          <div style="font-size:0.9rem;margin-bottom:6px;">Total Backup Records Processed: <b>${localCount} Day(s)</b></div>
          <div style="font-size:0.9rem;color:var(--turmeric);font-weight:700;margin-bottom:4px;">✅ Verified Saved to Supabase Cloud: ${cloudSuccessCount}</div>
          ${cloudErrorCount > 0 ? `<div style="font-size:0.88rem;color:var(--turmeric);font-weight:700;">⚠️ Cloud Save Failures: ${cloudErrorCount}</div>` : ''}
        </div>
        ${failedLogs.length ? `
          <div style="max-height:120px;overflow-y:auto;background:var(--blue-soft);padding:8px 10px;border-radius:6px;font-size:0.75rem;color:var(--turmeric);font-family:'Roboto Mono',monospace;margin-bottom:14px;">
            ${failedLogs.map(l => `<div>${esc(l)}</div>`).join('')}
          </div>
        ` : ''}
        <button class="stamp-btn" style="width:100%;" onclick="window.__closeVendorModal();renderTabBody();">Done</button>
      </div></div>
    `;

    await loadData();
    renderTabBody();
  } catch(e){
    hideLoading();
    alert('Error restoring backup file: ' + e.message);
  }
};


/* ---------------- STOCKKEEPER (daily stock check-in with a short questionnaire) ---------------- */
function stockSmsLink(staffName, notes){
  const msg = `Stock issue reported by ${staffName} (${session.businessName}): ${notes}`;
  const sep = isIOS() ? '&' : '?';
  return `sms:${OWNER_NOTIFY_NUMBER}${sep}body=${encodeURIComponent(msg)}`;
}

const GODOWNS = ['Home', 'Underground', 'RMTC', 'Back'];

function renderStockkeeperTab(body){
  const today = todayStr();
  const myCheck = cache.stockChecks.find(c=>c.staff_id===session.staffId && c.date===today);

  let checkedGodowns = new Set();
  if (myCheck) {
    if (myCheck.godowns && Array.isArray(myCheck.godowns)) {
      checkedGodowns = new Set(myCheck.godowns);
    } else if (myCheck.checked_godowns) {
      checkedGodowns = new Set(myCheck.checked_godowns.split(',').map(s=>s.trim()));
    } else if (myCheck.notes && myCheck.notes.includes('[Godowns:')) {
      const match = myCheck.notes.match(/\[Godowns:\s*([^\]]+)\]/);
      if(match) match[1].split(',').forEach(g=>checkedGodowns.add(g.trim()));
    }
  }

  const selfSection = `
    <div class="section-label">Stockkeeper Check — ${today}</div>
    <div class="row-card" style="flex-direction:column;align-items:stretch;">
      <h3 style="margin:0 0 10px;font-size:1.05rem;">Did you check stock today?</h3>
      <div class="modal-actions" style="margin-top:0;">
        <button class="attend-btn present ${myCheck&&myCheck.stock_checked?'active':''}" onclick="window.__setStockCheckedToday(true)">Yes, checked</button>
        <button class="attend-btn absent ${myCheck&&myCheck.stock_checked===false?'active':''}" onclick="window.__setStockCheckedToday(false)">Not yet</button>
      </div>

      ${myCheck&&myCheck.stock_checked ? `
        <label style="margin-top:16px;">Godowns Checked Today:</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
          ${GODOWNS.map(g => {
            const isChecked = checkedGodowns.has(g);
            return `<button class="attend-btn ${isChecked?'present active':''}" onclick="window.__toggleGodownCheck('${g}')">${isChecked?'✓ ':''}${g}</button>`;
          }).join('')}
        </div>

        <label>Is all stock level correct across checked godowns?</label>
        <div class="modal-actions" style="margin-top:4px;">
          <button class="attend-btn present ${myCheck.all_correct===true?'active':''}" onclick="window.__setStockField('all_correct',true)">Yes, all correct</button>
          <button class="attend-btn absent ${myCheck.all_correct===false?'active':''}" onclick="window.__setStockField('all_correct',false)">No, issue found</button>
        </div>

        <label>Stock Notes / Problem Description:</label>
        <textarea id="mStockNotes" placeholder="Describe any missing items, damaged goods, or quantity issues in Home, Underground, RMTC, or Back godowns...">${myCheck.notes?esc(myCheck.notes.replace(/\[Godowns:[^\]]+\]\s*/g, '')):''}</textarea>
        <div class="modal-actions">
          <button class="stamp-btn" onclick="window.__saveStockNotes()">Save Check Record</button>
          <button class="stamp-btn ghost" style="color:var(--turmeric);border-color:var(--turmeric);" onclick="window.__sendStockSms()">${icon('bell',16)} SMS Owner</button>
        </div>
      ` : ''}
    </div>`;

  const historyRecords = cache.stockChecks.sort((a,b) => (b.date > a.date ? 1 : -1));

  const historyHtml = `
    <div class="section-label">Stock Check History</div>
    ${historyRecords.length ? `<div class="cards-grid">${historyRecords.map(c => {
      let gList = [];
      if(c.godowns && Array.isArray(c.godowns)) gList = c.godowns;
      else if(c.checked_godowns) gList = c.checked_godowns.split(',').map(s=>s.trim());
      else if(c.notes && c.notes.includes('[Godowns:')) {
        const match = c.notes.match(/\[Godowns:\s*([^\]]+)\]/);
        if(match) gList = match[1].split(',').map(s=>s.trim());
      }
      const cleanNotes = c.notes ? c.notes.replace(/\[Godowns:[^\]]+\]\s*/g, '') : '';
      const isOk = c.all_correct !== false && c.stock_checked;
      
      return `
        <div class="row-card">
          <div class="row-main">
            <div class="meta">
              <span style="font-weight:700;color:var(--ink);">${c.date}</span>
              <span>${staffName(c.staff_id)}</span>
            </div>
            <div style="margin:6px 0;">
              ${gList.length ? gList.map(g => `<span class="stamp done" style="font-size:0.65rem;">${esc(g)}</span>`).join('') : '<span class="stamp unmarked">No godown selected</span>'}
            </div>
            ${cleanNotes ? `<div class="notes">${esc(cleanNotes)}</div>` : ''}
          </div>
          <span class="stamp ${isOk?'present':'absent'}">${isOk?'All Correct':'Issue Reported'}</span>
        </div>
      `;
    }).join('')}</div>` : '<div class="empty">No stock check history recorded yet.</div>'}
  `;

  body.innerHTML = selfSection + historyHtml;

  window.__sendStockSmsAuto = () => {
    const rawNotes = document.getElementById('mStockNotes') ? document.getElementById('mStockNotes').value.trim() : '';
    const arr = Array.from(checkedGodowns);
    const godownsStr = arr.length ? arr.join(', ') : 'Home, Underground, RMTC, Back';
    const statusStr = (myCheck && myCheck.all_correct === false) ? 'ISSUE REPORTED' : 'All Correct';
    const msg = `Stock Check Alert by ${session.name} (${session.businessName}): Checked Godowns: [${godownsStr}]. Status: ${statusStr}. Notes: ${rawNotes || 'Checked OK'}`;
    sendSmsTo('+916379849947', msg);
  };

  window.__setStockCheckedToday = async (val) => {
    // NOTE: this used to auto-fire an SMS (which redirects the whole page to
    // the phone's SMS app) just from tapping "Yes, checked" — before the
    // staff member had even entered any notes. Sending is now only ever
    // triggered by the explicit "SMS Owner" button below.
    const key = 'stockfield-'+session.staffId;
    if(__busyKeys.has(key)) return;
    __busyKeys.add(key);
    try{
      if(myCheck) await sbCheck(sb.from('stock_checks').update({stock_checked: val}).eq('id', myCheck.id));
      else await sbCheck(sb.from('stock_checks').insert({business_id:session.businessId, staff_id:session.staffId, date:today, stock_checked: val, all_correct: true}));
      await loadData(); renderTabBody();
    } catch(e){ alert('Error saving: ' + (e.message||e)); }
    finally { __busyKeys.delete(key); }
  };

  window.__toggleGodownCheck = async (godownName) => {
    if(!myCheck) return;
    let set = new Set(checkedGodowns);
    if(set.has(godownName)) set.delete(godownName);
    else set.add(godownName);
    const arr = Array.from(set);
    const godownStr = arr.join(', ');
    
    let currentNotes = myCheck.notes ? myCheck.notes.replace(/\[Godowns:[^\]]+\]\s*/g, '') : '';
    let newNotes = arr.length ? `[Godowns: ${godownStr}] ${currentNotes}`.trim() : currentNotes;

    try{
      await sbCheck(sb.from('stock_checks').update({ notes: newNotes, checked_godowns: godownStr }).eq('id', myCheck.id));
      await loadData(); renderTabBody();
    } catch(e){
      await sbCheck(sb.from('stock_checks').update({ notes: newNotes }).eq('id', myCheck.id));
      await loadData(); renderTabBody();
    }
  };

  window.__setStockField = async (field, val) => {
    if(!myCheck) return;
    try{
      await sbCheck(sb.from('stock_checks').update({ [field]: val }).eq('id', myCheck.id));
      await loadData(); renderTabBody();
    } catch(e){ alert('Error: ' + e.message); }
  };

  window.__saveStockNotes = async () => {
    if(!myCheck) return;
    const rawNotes = document.getElementById('mStockNotes') ? document.getElementById('mStockNotes').value.trim() : '';
    const arr = Array.from(checkedGodowns);
    const godownStr = arr.join(', ');
    const finalNotes = arr.length ? `[Godowns: ${godownStr}] ${rawNotes}`.trim() : rawNotes;
    
    await guardedSave('stocknotes', async () => {
      try {
        await sbCheck(sb.from('stock_checks').update({ notes: finalNotes, has_problems: myCheck.all_correct===false, checked_godowns: godownStr }).eq('id', myCheck.id));
      } catch(e) {
        await sbCheck(sb.from('stock_checks').update({ notes: finalNotes, has_problems: myCheck.all_correct===false }).eq('id', myCheck.id));
      }
      await loadData(); renderTabBody();
    });
  };

  window.__sendStockSms = () => {
    const rawNotes = document.getElementById('mStockNotes') ? document.getElementById('mStockNotes').value.trim() : '';
    const arr = Array.from(checkedGodowns);
    const msg = `Stock check alert by ${session.name} (${session.businessName}) - Godowns: ${arr.join(', ')}. Notes: ${rawNotes || 'No notes'}`;
    sendSmsTo(OWNER_NOTIFY_NUMBER, msg);
  };
}

/* ---------------- SALARY (owner only) ---------------- */
let salaryReportMode = 'monthly';
window.__setSalaryReportMode = (m) => { salaryReportMode = m; renderTabBody(); };
const WEEKDAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

let salarySubTab = 'report'; // 'report' | 'payouts' | 'advances' | 'expenses' | 'schedules'

function getStaffMonthlyAssumedSalary(s) {
  if (!s || s.status === 'inactive') return 0;
  const base = Number(s.base_salary || 0);
  const freq = s.salary_frequency || 'monthly';
  if (freq === 'weekly') return Math.round(base * 52 / 12);
  if (freq === 'daily') return Math.round(base * 26);
  return base;
}

function getAssumedSalaryTotals() {
  const activeStaff = typeof getActiveStaff === 'function' ? getActiveStaff() : (cache.staff || []);
  const monthlyTotal = activeStaff.reduce((sum, s) => sum + getStaffMonthlyAssumedSalary(s), 0);
  const weeklyTotal = Math.round(monthlyTotal * 12 / 52);
  const annualTotal = monthlyTotal * 12;
  return { monthlyTotal, weeklyTotal, annualTotal, count: activeStaff.length };
}

function renderSalaryReportHtml() {
  const currentMonth = monthKey(todayStr());
  const activeStaff = typeof getActiveStaff === 'function' ? getActiveStaff() : (cache.staff || []);
  const totals = getAssumedSalaryTotals();

  const actualPaidThisMonth = (cache.salaries || []).filter(sa => monthKey(sa.paid_date) === currentMonth).reduce((sum, sa) => sum + Number(sa.amount||0), 0);
  const advancesThisMonth = (getSalaryAdvances() || []).filter(a => monthKey(a.date) === currentMonth).reduce((sum, a) => sum + Number(a.amount||0), 0);
  const totalOutflowThisMonth = actualPaidThisMonth + advancesThisMonth;
  const remainingDue = Math.max(0, totals.monthlyTotal - totalOutflowThisMonth);
  const paidPct = totals.monthlyTotal > 0 ? Math.min(100, Math.round((totalOutflowThisMonth / totals.monthlyTotal) * 100)) : 0;

  const staffRowsHtml = activeStaff.map(s => {
    const assumedMonthly = getStaffMonthlyAssumedSalary(s);
    const paidThisMonth = (cache.salaries || []).filter(sa => sa.staff_id === s.id && monthKey(sa.paid_date) === currentMonth).reduce((sum, sa) => sum + Number(sa.amount||0), 0);
    const advThisMonth = (getSalaryAdvances() || []).filter(a => a.staff_id === s.id && monthKey(a.date) === currentMonth).reduce((sum, a) => sum + Number(a.amount||0), 0);
    const totalStaffPaid = paidThisMonth + advThisMonth;
    const staffPending = Math.max(0, assumedMonthly - totalStaffPaid);

    return `
      <tr style="border-bottom:1px solid var(--paper-line);font-size:0.8rem;">
        <td style="padding:10px 12px;">
          <b style="color:var(--ink);display:block;">${esc(s.name)}</b>
          <span class="role-pill ${s.role}">${s.role}</span>
        </td>
        <td style="padding:10px 12px;font-family:'Roboto Mono',monospace;color:var(--ink);">
          ₹${Number(s.base_salary||0).toLocaleString('en-IN')} <span style="font-size:0.7rem;color:var(--ink-soft);">/ ${s.salary_frequency||'monthly'}</span>
        </td>
        <td style="padding:10px 12px;font-family:'Roboto Mono',monospace;color:var(--ink);font-weight:700;">
          ₹${assumedMonthly.toLocaleString('en-IN')}
        </td>
        <td style="padding:10px 12px;font-family:'Roboto Mono',monospace;color:var(--leaf);font-weight:700;">
          ₹${totalStaffPaid.toLocaleString('en-IN')}
          ${advThisMonth > 0 ? `<div style="font-size:0.65rem;color:var(--turmeric-dark);">(Incl. ₹${advThisMonth} Adv)</div>` : ''}
        </td>
        <td style="padding:10px 12px;font-family:'Roboto Mono',monospace;color:${staffPending>0?'var(--brick)':'var(--leaf)'};font-weight:700;">
          ${staffPending > 0 ? `₹${staffPending.toLocaleString('en-IN')}` : '✓ Settled'}
        </td>
        <td style="padding:10px 12px;text-align:right;">
          <button class="stamp-btn small ghost" style="font-size:0.7rem;padding:2px 6px;" onclick="window.__editStaff('${s.id}')">✎ Base Rate</button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!-- Salary Expenses Executive Scorecards -->
    <div class="dash-kpi-grid" style="margin-bottom:16px;">
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Assumed Monthly Salary</div>
        <div class="dash-kpi-val" style="color:var(--turmeric-dark);">₹${totals.monthlyTotal.toLocaleString('en-IN')}</div>
        <div class="dash-kpi-sub">Total monthly commitment (${totals.count} active staff)</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Assumed Weekly Salary</div>
        <div class="dash-kpi-val" style="color:var(--ink);">₹${totals.weeklyTotal.toLocaleString('en-IN')}</div>
        <div class="dash-kpi-sub">Weekly payroll commitment</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Actual Paid This Month</div>
        <div class="dash-kpi-val" style="color:var(--leaf);">₹${totalOutflowThisMonth.toLocaleString('en-IN')}</div>
        <div class="dash-kpi-sub">Paid payouts &amp; advances (${currentMonth})</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Remaining Commitment</div>
        <div class="dash-kpi-val" style="color:${remainingDue>0?'var(--brick)':'var(--leaf)'};">₹${remainingDue.toLocaleString('en-IN')}</div>
        <div class="dash-kpi-sub">Outstanding balance for current month</div>
      </div>
    </div>

    <!-- Monthly Salary Expense Progress Bar Widget -->
    <div class="row-card" style="flex-direction:column;align-items:stretch;padding:14px;margin-bottom:18px;background:var(--paper);border:1px solid var(--paper-line);border-radius:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <b style="font-size:0.88rem;color:var(--ink);">Monthly Salary Outflow Progress (${currentMonth})</b>
        <b style="font-family:'Roboto Mono',monospace;font-size:0.85rem;color:var(--leaf);">${paidPct}% Paid</b>
      </div>
      <div class="progress-track" style="height:10px;background:var(--paper-line);border-radius:999px;overflow:hidden;margin-bottom:6px;">
        <div class="progress-fill ${paidPct>=100?'complete':''}" style="width:${paidPct}%;height:100%;border-radius:999px;background:linear-gradient(90deg, #10B981, #059669);"></div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--ink-soft);">
        <span>Paid Outflow: <b style="color:var(--leaf);font-family:'Roboto Mono',monospace;">₹${totalOutflowThisMonth.toLocaleString('en-IN')}</b></span>
        <span>Budgeted Goal: <b style="color:var(--ink);font-family:'Roboto Mono',monospace;">₹${totals.monthlyTotal.toLocaleString('en-IN')}</b></span>
      </div>
    </div>

    <!-- Staff Members Salary Commitment Table -->
    <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">
      <span>Staff Member Salary Breakdown &amp; Commitments</span>
      ${isOwner() ? `<button class="stamp-btn small" onclick="getModalHolder('taskModalHolder').innerHTML='';window.__openSalary();">+ Record Salary Payout</button>` : ''}
    </div>

    <div class="row-card" style="flex-direction:column;align-items:stretch;padding:0;overflow-x:auto;margin-bottom:16px;border:1px solid var(--paper-line);">
      <table style="width:100%;border-collapse:collapse;text-align:left;">
        <thead>
          <tr style="background:var(--paper-line);font-size:0.72rem;color:var(--ink-soft);text-transform:uppercase;letter-spacing:0.03em;">
            <th style="padding:10px 12px;">Staff Member</th>
            <th style="padding:10px 12px;">Base Rate</th>
            <th style="padding:10px 12px;">Assumed Monthly</th>
            <th style="padding:10px 12px;">Paid (${currentMonth})</th>
            <th style="padding:10px 12px;">Pending</th>
            <th style="padding:10px 12px;text-align:right;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${staffRowsHtml || '<tr><td colspan="6" style="padding:20px;text-align:center;color:var(--ink-soft);">No active staff members found.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

/* ---------------- FEATURE 7: SALARY ADVANCES & DEDUCTIONS ---------------- */
function getSalaryAdvances() {
  try {
    if (cache && cache.salaryAdvances && cache.salaryAdvances.length) return cache.salaryAdvances;
    return JSON.parse(localStorage.getItem('br_advances_' + session.businessId) || '[]');
  } catch(e) { return []; }
}

function saveSalaryAdvances(advances) {
  try {
    localStorage.setItem('br_advances_' + session.businessId, JSON.stringify(advances));
    if (cache) cache.salaryAdvances = advances;
    if (typeof syncCustomCloudPayload === 'function') syncCustomCloudPayload('[SALARY_ADVANCES_DATA]', advances);
  } catch(e) {}
}

function saveSalaryAdvanceLocally(adv) {
  const advances = getSalaryAdvances();
  advances.unshift(adv);
  saveSalaryAdvances(advances);
}

window.__openSalaryAdvanceModal = function() {
  const holder = getModalHolder('salaryModalHolder');
  holder.innerHTML = `
  <div class="overlay show" onclick="if(event.target===this) window.__closeSalaryModal()"><div class="modal" style="max-width:440px;width:92%;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <h3 style="margin:0;">💸 Record Salary Advance</h3>
      <button class="stamp-btn small ghost" onclick="window.__closeSalaryModal()">✕</button>
    </div>

    <label>Select Staff Member *</label>
    <select id="mAdvStaffId">
      ${cache.staff.map(s => `<option value="${s.id}">${esc(s.name)} (${s.role})</option>`).join('')}
    </select>
    <label>Advance Amount (₹) *</label>
    <input type="number" step="0.01" id="mAdvAmount" placeholder="e.g. 2000">
    <label>Date of Advance</label>
    <input type="date" id="mAdvDate" value="${todayStr()}">
    <label>Notes / Reason</label>
    <textarea id="mAdvNotes" placeholder="Reason for advance..."></textarea>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closeSalaryModal()">Cancel</button>
      <button class="stamp-btn" onclick="window.__saveSalaryAdvance()">Save Advance</button>
    </div>
  </div></div>`;
};

window.__saveSalaryAdvance = async function() {
  const staffId = document.getElementById('mAdvStaffId').value;
  const amount = Number(document.getElementById('mAdvAmount').value || 0);
  const date = document.getElementById('mAdvDate').value || todayStr();
  const notes = document.getElementById('mAdvNotes').value.trim();

  if (!amount || amount <= 0) { alert('Please enter a valid advance amount.'); return; }

  const localId = 'adv_' + Date.now();
  const payload = {
    business_id: session.businessId,
    staff_id: staffId,
    amount: amount,
    date: date,
    notes: notes
  };

  showLoading();
  try {
    // Don't send our local temp id — salary_advances.id is a uuid generated by the DB.
    const { data: newRow } = await sb.from('salary_advances').insert(payload).select().single();
    if (newRow) saveSalaryAdvanceLocally(newRow);
    else saveSalaryAdvanceLocally(Object.assign({ id: localId }, payload));
  } catch(e) {
    saveSalaryAdvanceLocally(Object.assign({ id: localId }, payload));
  } finally {
    hideLoading();
    const modalHolder = getModalHolder('salaryModalHolder');
    modalHolder.innerHTML = '';
    logAuditEvent('Salary Advance', `Recorded ₹${amount} advance for ${staffName(staffId)}`);
    triggerAppNotification('Advance Recorded', `₹${amount} advance for ${staffName(staffId)}`);
    renderTabBody();
  }
};

window.__deleteSalaryAdvance = function(id) {
  window.__showDeleteConfirm({
    title: 'Delete salary advance?',
    message: 'This removes the advance record. It cannot be undone.',
    onConfirm: async () => {
      showLoading();
      try {
        await sb.from('salary_advances').delete().eq('id', id);
      } catch(e){}
      finally {
        let advances = getSalaryAdvances().filter(a => a.id !== id);
        localStorage.setItem('br_advances_' + session.businessId, JSON.stringify(advances));
        if (cache) cache.salaryAdvances = advances;
        hideLoading();
        renderTabBody();
      }
    }
  });
};


function payScheduleLabel(s){
  const freq = s.salary_frequency || 'monthly';
  const amt = Number(s.base_salary || 0);
  const amtStr = amt > 0 ? ` (₹${amt.toLocaleString('en-IN')})` : '';
  if(freq==='daily') return `Paid Daily${amtStr}`;
  if(freq==='weekly') return s.salary_day != null ? `Paid Weekly on ${WEEKDAY_NAMES[s.salary_day]}${amtStr}` : `Paid Weekly${amtStr}`;
  return s.salary_day ? `Paid Monthly on Day ${s.salary_day}${amtStr}` : `Paid Monthly${amtStr}`;
}

window.__setSalarySubTab = function(t) {
  salarySubTab = t;
  renderTabBody();
};


function getExpensesList() {
  try {
    return JSON.parse(localStorage.getItem('br_expenses_' + session.businessId) || '[]');
  } catch(e) { return []; }
}

function saveExpensesList(expenses) {
  try { localStorage.setItem('br_expenses_' + session.businessId, JSON.stringify(expenses)); } catch(e){}
  if (typeof syncCustomCloudPayload === 'function') syncCustomCloudPayload('[EXPENSES_TRACKER_DATA]', expenses);
}

function renderExpensesTrackerHtml() {
  const expenses = getExpensesList();
  const currentMonth = monthKey(todayStr());
  const totalThisMonth = expenses.filter(e => monthKey(e.date) === currentMonth).reduce((sum, e) => sum + Number(e.amount||0), 0);

  return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <div class="section-label" style="margin:0;">Expenses Tracker Overview (${currentMonth})</div>
      <button class="stamp-btn small" style="background:var(--turmeric);color:white;" onclick="window.__openExpenseModal()">💸 Record Expense</button>
    </div>

    <!-- Summary KPI Stat Cards -->
    <div class="stat-grid" style="margin-bottom:16px;">
      <div class="stat-card">
        <div class="num" style="color:var(--turmeric-dark);">₹${totalMonthExp.toLocaleString('en-IN')}</div>
        <div class="label">Total Spent This Month</div>
      </div>
      <div class="stat-card">
        <div class="num" style="color:var(--turmeric);">₹${cashExp.toLocaleString('en-IN')}</div>
        <div class="label">Cash Expenses</div>
      </div>
      <div class="stat-card">
        <div class="num" style="color:var(--leaf);">₹${gpayExp.toLocaleString('en-IN')}</div>
        <div class="label">GPay / Online Expenses</div>
      </div>
      <div class="stat-card">
        <div class="num">${monthExpenses.length}</div>
        <div class="label">Expense Entries</div>
      </div>
    </div>

    <div class="section-label">Business Expense Ledger (${expenses.length})</div>
    ${expenses.length ? expenses.map(e => `
      <div class="row-card" style="align-items:center;">
        <div class="row-main">
          <div class="meta">
            <span>${e.date}</span>
            <span class="stamp low" style="padding:1px 6px;font-size:0.65rem;">${esc(e.category || 'General')}</span>
            <span>Mode: <b>${esc(e.payment_mode || 'Cash')}</b></span>
          </div>
          <h3>Spent by: ${esc(staffName(e.spent_by || e.staff_id))}</h3>
          ${e.notes ? `<div class="notes">${esc(e.notes)}</div>` : ''}
        </div>
        <b style="font-family:'Roboto Mono',monospace;color:var(--turmeric);font-size:1rem;">₹${Number(e.amount||0).toLocaleString('en-IN')}</b>
        <div class="action-dropdown-holder">
          <button class="action-more-btn" onclick="window.__toggleActionMenu(event, 'exp_tr_${e.id}')">More ▾</button>
          <div class="action-dropdown-menu" id="actionMenu_exp_tr_${e.id}">
            <button onclick="window.__openExpenseModal('${e.id}')">✎ Edit</button>
            <button class="danger" onclick="window.__deleteExpenseItem('${e.id}')">🗑 Delete</button>
          </div>
        </div>
      </div>
    `).join('') : `<div class="empty">No expenses logged yet. Tap "💸 Record Expense" to log staff tea, fuel, travel, or maintenance expenses!</div>`}
  `;
}

window.__openExpenseModal = function(id) {
  const expenses = getExpensesList();
  const exp = id ? expenses.find(x => x.id === id) : null;
  const holder = getModalHolder('taskModalHolder');

  holder.innerHTML = `
  <div class="overlay show"><div class="modal" style="max-width:500px;">
    <h2>${exp ? '✎ Edit Business Expense' : '💸 Record Business Expense'}</h2>
    <p style="font-size:0.8rem;color:var(--ink-soft);margin-bottom:12px;">Log operational and staff expenses (Tea/Food, Travel, Fuel, Maintenance, Utilities).</p>

    <label>Spent By / Staff *</label>
    <select id="mExpStaff">
      ${cache.staff.map(s => `<option value="${s.id}" ${exp && exp.spent_by === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}
    </select>

    <div class="two-col">
      <div>
        <label>Expense Category *</label>
        <select id="mExpCat">
          <option value="Staff Tea & Food" ${exp && exp.category==='Staff Tea & Food'?'selected':''}>Staff Tea & Food</option>
          <option value="Travel & Fuel" ${exp && exp.category==='Travel & Fuel'?'selected':''}>Travel & Fuel</option>
          <option value="Shop Maintenance" ${exp && exp.category==='Shop Maintenance'?'selected':''}>Shop Maintenance</option>
          <option value="Office Supplies" ${exp && exp.category==='Office Supplies'?'selected':''}>Office Supplies</option>
          <option value="Utility Bills" ${exp && exp.category==='Utility Bills'?'selected':''}>Utility Bills</option>
          <option value="Miscellaneous" ${!exp || exp.category==='Miscellaneous'?'selected':''}>Miscellaneous</option>
        </select>
      </div>
      <div>
        <label>Amount (₹) *</label>
        <input type="number" step="any" id="mExpAmount" value="${exp ? exp.amount || '' : ''}" placeholder="e.g. 150" style="font-family:'Roboto Mono',monospace;font-weight:700;">
      </div>
    </div>

    <div class="two-col">
      <div>
        <label>Payment Mode</label>
        <select id="mExpPayMode">
          <option value="Cash" ${!exp || exp.payment_mode==='Cash'?'selected':''}>Cash</option>
          <option value="GPay / Online" ${exp && exp.payment_mode==='GPay / Online'?'selected':''}>GPay / Online</option>
        </select>
      </div>
      <div>
        <label>Date</label>
        <input type="date" id="mExpDate" value="${exp ? exp.date : todayStr()}">
      </div>
    </div>

    <label>Remarks / Notes</label>
    <textarea id="mExpNotes" placeholder="e.g. Tea & snacks for staff during inventory audit">${exp ? esc(exp.notes||'') : ''}</textarea>

    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="getModalHolder('taskModalHolder').innerHTML=''">Cancel</button>
      <button class="stamp-btn" style="background:var(--turmeric);color:white;" onclick="window.__saveExpenseItem('${id||''}')">💾 Save Expense</button>
    </div>
  </div></div>`;
};

window.__saveExpenseItem = function(id) {
  const amt = Number(document.getElementById('mExpAmount').value || 0);
  if (amt <= 0) { alert('Please enter a valid expense amount (₹).'); return; }

  const expenses = getExpensesList();
  const payload = {
    id: id || ('exp_rec_' + Date.now()),
    business_id: session.businessId,
    spent_by: document.getElementById('mExpStaff').value,
    category: document.getElementById('mExpCat').value,
    amount: amt,
    payment_mode: document.getElementById('mExpPayMode').value,
    date: document.getElementById('mExpDate').value || todayStr(),
    notes: document.getElementById('mExpNotes').value.trim(),
    created_at: new Date().toISOString()
  };

  if (id) {
    const idx = expenses.findIndex(x => x.id === id);
    if (idx >= 0) expenses[idx] = payload; else expenses.unshift(payload);
  } else {
    expenses.unshift(payload);
  }

  saveExpensesList(expenses);
  getModalHolder('taskModalHolder').innerHTML = '';
  logAuditEvent('Expense Recorded', `Recorded ₹${amt} expense (${payload.category}) spent by ${staffName(payload.spent_by)}`);
  window.showToast(`💸 Expense of ₹${amt} saved!`, 'success');
  renderTabBody();
};

window.__deleteExpenseItem = function(id) {
  if (!confirm('Delete this expense entry?')) return;
  const expenses = getExpensesList().filter(x => x.id !== id);
  saveExpensesList(expenses);
  window.showToast('🗑 Expense deleted.', 'info');
  renderTabBody();
};


function renderSalaryTab(body){
  const advances = getSalaryAdvances();
  const expenses = getExpensesList();
  const currentMonth = monthKey(todayStr());
  const advancesThisMonth = advances.filter(a => monthKey(a.date) === currentMonth);

  body.innerHTML = `
    <!-- Salary Sub-Menu Navigation Bar -->
    <div style="display:flex;gap:6px;margin-bottom:14px;overflow-x:auto;">
      <button class="stamp-btn small ${salarySubTab==='payouts'?'':'ghost'}" onclick="window.__setSalarySubTab('payouts')">💵 Payout History (${cache.salaries.length})</button>
      <button class="stamp-btn small ${salarySubTab==='advances'?'':'ghost'}" onclick="window.__setSalarySubTab('advances')">💸 Salary Advances (${advances.length})</button>
      <button class="stamp-btn small ${salarySubTab==='expenses'?'':'ghost'}" onclick="window.__setSalarySubTab('expenses')">🧾 Expenses Tracker (${expenses.length})</button>
      <button class="stamp-btn small ${salarySubTab==='schedules'?'':'ghost'}" onclick="window.__setSalarySubTab('schedules')">📅 Schedules (${cache.staff.length})</button>
    </div>


    ${salarySubTab === 'payouts' ? `
      ${buildQtyGraphHtml(cache.salaries, salaryReportMode, '__setSalaryReportMode', '', 'amount', '₹', 'paid_date')}
      <div class="section-label">Salary Payment History</div>
      ${cache.salaries.length ? cache.salaries.map(sa=>{
        const staff = cache.staff.find(s=>s.id===sa.staff_id)||{};
        return `
        <div class="row-card" style="align-items:center;">
          <div class="row-main"><h3>${esc(staffName(sa.staff_id))}</h3><div class="meta"><span>${sa.paid_date}</span>${sa.notes?`<span>${esc(sa.notes)}</span>`:''}</div></div>
          <b style="font-family:'Roboto Mono',monospace;">₹${Number(sa.amount).toFixed(0)}</b>
          <button class="stamp-btn small ghost" style="font-size:0.65rem;padding:4px 8px;" onclick="window.__generateSalarySlip('${sa.id}')">📄 Slip</button>
          <div class="action-dropdown-holder">
            <button class="action-more-btn" onclick="window.__toggleActionMenu(event, '${sa.id}')">More ▾</button>
            <div class="action-dropdown-menu" id="actionMenu_${sa.id}">
              <button onclick="window.__generateSalarySlip('${sa.id}')">📄 Generate Slip</button>
              <button class="danger" onclick="window.__deleteSalary('${sa.id}')">🗑 Delete</button>
            </div>
          </div>
        </div>`;
      }).join('') : `<div class="empty">No salary payments logged yet. Tap + to add one.</div>`}
    ` : ''}

    ${salarySubTab === 'advances' ? `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <div class="section-label" style="margin:0;">Staff Advances Overview (${currentMonth})</div>
        <button class="stamp-btn small" style="background:var(--turmeric);color:white;" onclick="window.__openSalaryAdvanceModal()">💸 Record Salary Advance</button>
      </div>

      <div class="cards-grid" style="margin-bottom:16px;">
        ${cache.staff.map(s => {
          const staffAdvs = advancesThisMonth.filter(a => a.staff_id === s.id);
          const totalAdv = staffAdvs.reduce((sum, a) => sum + Number(a.amount||0), 0);
          return `
            <div class="row-card" style="flex-direction:column;align-items:stretch;padding:12px 14px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div>
                  <b style="font-size:0.92rem;color:var(--ink);">${esc(s.name)}</b>
                  <span class="role-pill ${s.role}">${s.role}</span>
                  <div style="font-size:0.75rem;color:var(--ink-soft);margin-top:2px;">${payScheduleLabel(s)}</div>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:0.68rem;color:var(--ink-soft);font-family:'Roboto Mono',monospace;">ADVANCES THIS MONTH</div>
                  <b style="font-size:1rem;color:${totalAdv > 0 ? 'var(--turmeric)' : 'var(--turmeric)'};font-family:'Roboto Mono',monospace;">₹${totalAdv.toFixed(0)}</b>
                </div>
              </div>
              ${staffAdvs.length ? `
                <div style="margin-top:8px;padding-top:6px;border-top:1px dashed var(--paper-line);">
                  ${staffAdvs.map(a => `
                    <div style="display:flex;justify-content:space-between;font-size:0.75rem;color:var(--ink-soft);margin-top:2px;">
                      <span>${a.date} (${esc(a.notes||'Advance')})</span>
                      <span style="font-family:'Roboto Mono',monospace;font-weight:600;color:var(--turmeric);">₹${Number(a.amount).toFixed(0)}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <div class="section-label">Salary Advance Ledger (${advances.length})</div>
      ${advances.length ? advances.map(a => `
        <div class="row-card" style="align-items:center;">
          <div class="row-main">
            <h3>${esc(staffName(a.staff_id))}</h3>
            <div class="meta"><span>${a.date}</span></div>
            ${a.notes ? `<div class="notes">${esc(a.notes)}</div>` : ''}
          </div>
          <b style="font-family:'Roboto Mono',monospace;color:var(--turmeric);margin-right:6px;">₹${Number(a.amount).toFixed(0)}</b>
          <button class="stamp-btn small ghost" style="font-size:0.65rem;padding:3px 7px;margin-right:6px;" onclick="window.__convertAdvanceToSalaryPaid('${a.id}')" title="Convert Advance to Salary Paid">🔄 Convert to Paid</button>
          <div class="action-dropdown-holder">
            <button class="action-more-btn" onclick="window.__toggleActionMenu(event, '${a.id}')">More ▾</button>
            <div class="action-dropdown-menu" id="actionMenu_${a.id}">
              <button onclick="window.__convertAdvanceToSalaryPaid('${a.id}')">🔄 Convert to Salary Paid</button>
              <button class="danger" onclick="window.__deleteSalaryAdvance('${a.id}')">🗑 Delete</button>
            </div>
          </div>
        </div>
      `).join('') : `<div class="empty">No salary advances recorded.</div>`}
    ` : ''}

    ${salarySubTab === 'expenses' ? `
      ${renderExpensesTrackerHtml()}
    ` : ''}


    ${salarySubTab === 'schedules' ? `

      <div class="section-label">Payout Schedule Per Staff</div>
      ${cache.staff.map(s=>`
        <div class="row-card" style="align-items:center;">
          <div class="row-main"><h3>${esc(s.name)}</h3><div class="meta"><span>${payScheduleLabel(s)}</span></div></div>
          <button class="icon-btn" onclick="window.__setPayoutSchedule('${s.id}')">Edit</button>
        </div>`).join('')}
    ` : ''}

    <div id="salaryModalHolder"></div>
    <div id="scheduleModalHolder"></div>
  `;
  window.__deleteSalary = function(id) {
  window.__showDeleteConfirm({
    title: 'Delete salary record?',
    message: 'This removes it for everyone on this business. It cannot be undone.',
    onConfirm: async () => {
      showLoading();
      try {
        await sb.from('salaries').delete().eq('id', id);
        cache.salaries = cache.salaries.filter(s => s.id !== id);
      } catch(e){}
      finally {
        hideLoading();
        await loadData();
        renderTabBody();
      }
    }
  });
};

  window.__convertAdvanceToSalaryPaid = async function(advanceId) {
    const advances = getSalaryAdvances();
    const adv = advances.find(a => a.id === advanceId);
    if (!adv) return;

    const sName = staffName(adv.staff_id);
    if (!confirm(`Convert Salary Advance of ₹${Number(adv.amount).toLocaleString('en-IN')} for ${sName} to Salary Paid?`)) return;

    showLoading('Converting Salary Advance...');

    // 1. Remove from Salary Advances local list
    const updatedAdvs = advances.filter(a => a.id !== advanceId);
    saveSalaryAdvances(updatedAdvs);

    // 2. Create official Salary Paid entry
    const salData = {
      id: 'loc_sal_' + Date.now(),
      business_id: session.businessId,
      staff_id: adv.staff_id,
      amount: Number(adv.amount),
      paid_date: adv.date || todayStr(),
      notes: (adv.notes ? adv.notes + ' ' : '') + '(Converted from Salary Advance)'
    };

    cache.salaries.unshift(salData);
    localStorage.setItem('br_salaries_' + session.businessId, JSON.stringify(cache.salaries));

    // 3. Background DB sync to Supabase
    if (navigator.onLine && typeof sb !== 'undefined') {
      const dbPayload = Object.assign({}, salData);
      delete dbPayload.id;
      sb.from('salaries').insert(dbPayload).select().single().then(r => {
        if (r && r.data && r.data.id) {
          const locItem = cache.salaries.find(s => s.id === salData.id);
          if (locItem) {
            locItem.id = r.data.id;
            localStorage.setItem('br_salaries_' + session.businessId, JSON.stringify(cache.salaries));
          }
        }
      }).catch(() => {});
    }

    hideLoading();
    window.showToast(`✓ Converted ₹${Number(adv.amount).toLocaleString('en-IN')} advance to Salary Paid!`, 'success');
    logAuditEvent('Salary Converted', `Converted ₹${adv.amount} advance for ${sName} to Salary Paid`);
    
    // Switch to payouts tab to view newly converted salary
    salarySubTab = 'payouts';
    await loadData();
    renderTabBody();
  };

  window.__openSalaryLogModal = function() {
    const holder = getModalHolder('taskModalHolder');
    const salaries = cache.salaries || [];
    const advances = getSalaryAdvances();
    const totalPaid = salaries.reduce((sum, s) => sum + Number(s.amount||0), 0);
    const totalAdv = advances.reduce((sum, a) => sum + Number(a.amount||0), 0);

    holder.innerHTML = `
    <div class="overlay show" onclick="if(event.target===this) this.remove()">
      <div class="modal" style="max-width:560px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--paper-line);">
          <div>
            <h2 style="margin:0;font-size:1.05rem;">📜 Salary Log &amp; Payout Audit</h2>
            <div style="font-size:0.75rem;color:var(--ink-soft);margin-top:2px;">
              Total Paid: <b>₹${totalPaid.toLocaleString('en-IN')}</b> &bull; Total Advances: <b>₹${totalAdv.toLocaleString('en-IN')}</b>
            </div>
          </div>
          <button class="stamp-btn ghost small" onclick="this.closest('.overlay').remove()">✕</button>
        </div>

        <div style="max-height:360px;overflow-y:auto;display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
          ${salaries.length ? salaries.map(sa => {
            return `
              <div class="row-card" style="align-items:center;padding:10px 12px;margin:0;">
                <div class="row-main">
                  <b style="font-size:0.88rem;color:var(--ink);">${esc(staffName(sa.staff_id))}</b>
                  <div style="font-size:0.72rem;color:var(--ink-soft);margin-top:2px;">
                    <span>${sa.paid_date}</span>${sa.notes ? ` &bull; <span>${esc(sa.notes)}</span>` : ''}
                  </div>
                </div>
                <b style="font-family:'Roboto Mono',monospace;font-size:0.95rem;color:var(--leaf);margin-right:6px;">₹${Number(sa.amount).toFixed(0)}</b>
                <button class="stamp-btn small ghost" style="font-size:0.65rem;padding:2px 6px;" onclick="window.__generateSalarySlip('${sa.id}')">📄 Slip</button>
              </div>`;
          }).join('') : '<div class="empty">No salary payments logged yet.</div>'}
        </div>

        <div class="modal-actions">
          <button class="stamp-btn ghost" onclick="getModalHolder('taskModalHolder').innerHTML=''">Close Log</button>
          ${isOwner() ? `<button class="stamp-btn" onclick="getModalHolder('taskModalHolder').innerHTML='';window.__openSalary();">+ Record New Salary</button>` : ''}
        </div>
      </div>
    </div>`;
  };
  window.__setPayoutSchedule = (staffId) => {
    const s = cache.staff.find(x=>x.id===staffId);
    const holder = document.getElementById('scheduleModalHolder');
    const freq = s.salary_frequency || 'monthly';
    const renderFields = (f) => {
      if(f==='daily') return `<p style="font-size:0.82rem;color:var(--ink-soft);">No specific day needed — paid every day worked.</p>`;
      if(f==='weekly') return `<label>Day of the week</label><select id="mScheduleDay">${WEEKDAY_NAMES.map((d,i)=>`<option value="${i}" ${s.salary_day===i?'selected':''}>${d}</option>`).join('')}</select>`;
      return `<label>Day of the month</label><input type="number" id="mScheduleDay" min="1" max="31" value="${s.salary_day&&s.salary_frequency==='monthly'?s.salary_day:''}" placeholder="1-31">`;
    };
    holder.innerHTML = `
    <div class="overlay show"><div class="modal">
      <h2>Payout schedule — ${esc(s.name)}</h2>
      <label>How often paid</label>
      <select id="mScheduleFreq" onchange="window.__refreshScheduleFields()">
        <option value="daily" ${freq==='daily'?'selected':''}>Daily</option>
        <option value="weekly" ${freq==='weekly'?'selected':''}>Weekly</option>
        <option value="monthly" ${freq==='monthly'?'selected':''}>Monthly</option>
      </select>
      <div id="scheduleFieldsWrap">${renderFields(freq)}</div>
      <div class="modal-actions">
        <button class="stamp-btn ghost" onclick="window.__closeScheduleModal()">Cancel</button>
        <button class="stamp-btn" onclick="window.__saveSchedule('${staffId}')">Save</button>
      </div>
    </div></div>`;
    window.__refreshScheduleFields = () => {
      const f = document.getElementById('mScheduleFreq').value;
      document.getElementById('scheduleFieldsWrap').innerHTML = renderFields(f);
    };
    window.__closeScheduleModal = () => { holder.innerHTML=''; };
    window.__saveSchedule = async (id) => {
      const f = document.getElementById('mScheduleFreq').value;
      let day = null;
      if(f!=='daily'){
        const el = document.getElementById('mScheduleDay');
        day = Number(el.value);
        if(f==='monthly' && (!day || day<1 || day>31)){ alert('Enter a day between 1 and 31.'); return; }
      }
      await guardedSave('schedule-'+id, async () => {
        await sbCheck(sb.from('staff').update({salary_frequency:f, salary_day:day}).eq('id', id));
        holder.innerHTML='';
        await loadData(); renderTabBody();
      });
    };
  };
}
window.__openSalary = () => {
  const holder = getModalHolder('salaryModalHolder');
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>Log a salary payment</h2>
    <label>Staff</label>
    <select id="mSalaryStaff">${cache.staff.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
    <label>Amount (₹)</label>
    <input type="number" step="0.01" id="mSalaryAmount" value="0">
    <label>Paid date</label>
    <input type="date" id="mSalaryDate" value="${todayStr()}">
    <label>Notes</label>
    <input id="mSalaryNotes" placeholder="e.g. July salary, advance, bonus">
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__closeSalaryModal()">Cancel</button>
      <button class="stamp-btn" onclick="window.__saveSalary()">Save</button>
    </div>
  </div></div>`;
  window.__closeSalaryModal = () => { holder.innerHTML=''; };
  window.__saveSalary = async () => {
    const amount = Number(document.getElementById('mSalaryAmount').value || 0);
    if(amount<=0){ alert('Enter an amount.'); return; }
    await guardedSave('salary', async () => {
      await sbCheck(sb.from('salaries').insert({
        business_id: session.businessId,
        staff_id: document.getElementById('mSalaryStaff').value,
        amount,
        paid_date: document.getElementById('mSalaryDate').value || todayStr(),
        notes: document.getElementById('mSalaryNotes').value.trim(),
      }));
      holder.innerHTML='';
      await loadData(); renderTabBody();
    });
  };
};

/* ---------------- REPORTS HUB ---------------- */
let reportsCategoryFilter = 'all'; // 'all' | 'pnl' | 'salary' | 'inventory' | 'attendance' | 'sales'

window.__setReportsFilter = function(cat) {
  reportsCategoryFilter = cat;
  renderTabBody();
};

function renderReportsTab(body) {
  const currentMonth = monthKey(todayStr());
  
  // 1. P&L Net Profit Data
  const pnlObj = typeof getPnLDataObj === 'function' ? getPnLDataObj() : { records: [] };
  const pnlRecords = pnlObj.records || [];
  const latestPnL = pnlRecords[0] || {};
  
  // 2. Salary & Payroll Data
  const totals = typeof getAssumedSalaryTotals === 'function' ? getAssumedSalaryTotals() : { monthlyTotal: 0, weeklyTotal: 0, count: 0 };
  const actualPaidThisMonth = (cache.salaries || []).filter(sa => monthKey(sa.paid_date) === currentMonth).reduce((sum, sa) => sum + Number(sa.amount||0), 0);
  const advancesThisMonth = (typeof getSalaryAdvances === 'function' ? getSalaryAdvances() : []).filter(a => monthKey(a.date) === currentMonth).reduce((sum, a) => sum + Number(a.amount||0), 0);
  const totalSalaryOutflow = actualPaidThisMonth + advancesThisMonth;
  const remainingSalaryDue = Math.max(0, totals.monthlyTotal - totalSalaryOutflow);
  const salaryPaidPct = totals.monthlyTotal > 0 ? Math.min(100, Math.round((totalSalaryOutflow / totals.monthlyTotal) * 100)) : 0;
  
  // 3. Inventory Stock Data
  const lowStockList = typeof getLowStockList === 'function' ? getLowStockList() : [];
  const stockItems = cache.stockItems || [];
  const totalStockVal = stockItems.reduce((sum, item) => sum + (Number(item.qty||0) * Number(item.rate||0)), 0);
  
  // 4. Staff & Attendance Data
  const activeStaff = typeof getActiveStaff === 'function' ? getActiveStaff() : (cache.staff || []);
  const todayAtt = (cache.attendance || []).filter(a => a.date === todayStr());
  const todayPresent = todayAtt.filter(a => a.status === 'present').length;
  const attPct = activeStaff.length > 0 ? Math.round((todayPresent / activeStaff.length) * 100) : 0;
  
  // 5. Sales & Customer Data
  const salesList = cache.sales || [];
  const totalSalesThisMonth = salesList.filter(s => monthKey(s.date || s.created_at) === currentMonth).reduce((sum, s) => sum + Number(s.amount||0), 0);

  body.innerHTML = `
    <!-- Reports Hub Header Control Bar -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px;">
      <div>
        <h3 style="margin:0;font-size:1.1rem;color:var(--ink);display:inline-flex;align-items:center;gap:6px;">
          ${icon('reports', 18)} Master Visual Reports Hub
        </h3>
        <p style="margin:2px 0 0;font-size:0.75rem;color:var(--ink-soft);">Real-time executive visual analytics across all business modules</p>
      </div>

      <!-- Filter Categories -->
      <div style="display:flex;gap:6px;overflow-x:auto;align-items:center;">
        <button class="stamp-btn small ${reportsCategoryFilter==='all'?'':'ghost'}" onclick="window.__setReportsFilter('all')">All Reports</button>
        <button class="stamp-btn small ${reportsCategoryFilter==='pnl'?'':'ghost'}" onclick="window.__setReportsFilter('pnl')">P&amp;L Analytics</button>
        <button class="stamp-btn small ${reportsCategoryFilter==='salary'?'':'ghost'}" onclick="window.__setReportsFilter('salary')">Payroll</button>
        <button class="stamp-btn small ${reportsCategoryFilter==='inventory'?'':'ghost'}" onclick="window.__setReportsFilter('inventory')">Inventory</button>
        <button class="stamp-btn small ${reportsCategoryFilter==='attendance'?'':'ghost'}" onclick="window.__setReportsFilter('attendance')">Attendance</button>
        <button class="stamp-btn small ${reportsCategoryFilter==='sales'?'':'ghost'}" onclick="window.__setReportsFilter('sales')">Sales</button>
      </div>
    </div>

    <!-- 1. P&L & Profitability Visual Report Section -->
    ${(reportsCategoryFilter==='all' || reportsCategoryFilter==='pnl') && isOwner() ? `
      <div style="margin-bottom:20px;">
        <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">
          <span>P&amp;L Net Profits &amp; Revenue Analytics</span>
          <button class="stamp-btn small ghost" onclick="window.__setTab('pnl')">View Full P&amp;L Tab ➔</button>
        </div>
        ${typeof buildDashboardPnLLineGraphHtml === 'function' ? buildDashboardPnLLineGraphHtml() : ''}
      </div>
    ` : ''}

    <!-- 2. Salary & Payroll Assumptions Visual Report Section -->
    ${(reportsCategoryFilter==='all' || reportsCategoryFilter==='salary') ? `
      <div style="margin-bottom:20px;">
        <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">
          <span>Salary Assumptions &amp; Expense Outflow Report</span>
          <button class="stamp-btn small ghost" onclick="window.__setTab('salary')">View Salary Tab ➔</button>
        </div>

        <div class="dash-kpi-grid" style="margin-bottom:12px;">
          <div class="dash-kpi-card">
            <div class="dash-kpi-title">Assumed Monthly Salary</div>
            <div class="dash-kpi-val" style="color:var(--turmeric-dark);">₹${totals.monthlyTotal.toLocaleString('en-IN')}</div>
            <div class="dash-kpi-sub">Total monthly commitment (${totals.count} active staff)</div>
          </div>
          <div class="dash-kpi-card">
            <div class="dash-kpi-title">Actual Paid This Month</div>
            <div class="dash-kpi-val" style="color:var(--leaf);">₹${totalSalaryOutflow.toLocaleString('en-IN')}</div>
            <div class="dash-kpi-sub">Paid payouts &amp; advances (${currentMonth})</div>
          </div>
          <div class="dash-kpi-card">
            <div class="dash-kpi-title">Remaining Commitment</div>
            <div class="dash-kpi-val" style="color:${remainingSalaryDue>0?'var(--brick)':'var(--leaf)'};">₹${remainingSalaryDue.toLocaleString('en-IN')}</div>
            <div class="dash-kpi-sub">Outstanding balance for current month</div>
          </div>
        </div>

        <!-- Monthly Salary Outflow Visual Bar -->
        <div class="row-card" style="flex-direction:column;align-items:stretch;padding:12px 14px;background:var(--paper);border:1px solid var(--paper-line);border-radius:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <b style="font-size:0.82rem;color:var(--ink);">Monthly Payroll Outflow Progress (${currentMonth})</b>
            <b style="font-family:'Roboto Mono',monospace;font-size:0.8rem;color:var(--leaf);">${salaryPaidPct}% Paid</b>
          </div>
          <div class="progress-track" style="height:8px;background:var(--paper-line);border-radius:999px;overflow:hidden;margin-bottom:6px;">
            <div class="progress-fill ${salaryPaidPct>=100?'complete':''}" style="width:${salaryPaidPct}%;height:100%;border-radius:999px;background:linear-gradient(90deg, #10B981, #059669);"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--ink-soft);">
            <span>Paid: <b style="color:var(--leaf);">₹${totalSalaryOutflow.toLocaleString('en-IN')}</b></span>
            <span>Assumed Budget: <b style="color:var(--ink);">₹${totals.monthlyTotal.toLocaleString('en-IN')}</b></span>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- 3. Inventory & Stock Visual Report Section -->
    ${(reportsCategoryFilter==='all' || reportsCategoryFilter==='inventory') ? `
      <div style="margin-bottom:20px;">
        <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">
          <span>Inventory &amp; Stock Health Reports</span>
          <button class="stamp-btn small ghost" onclick="window.__setTab('low_stock')">View Low Stock Tab ➔</button>
        </div>

        <div class="dash-kpi-grid" style="margin-bottom:12px;">
          <div class="dash-kpi-card">
            <div class="dash-kpi-title">Low Stock Item Alerts</div>
            <div class="dash-kpi-val" style="color:${lowStockList.length>0?'var(--brick)':'var(--leaf)'};">${lowStockList.length}</div>
            <div class="dash-kpi-sub">Items requiring immediate reorder</div>
          </div>
          <div class="dash-kpi-card">
            <div class="dash-kpi-title">Total Catalog Items</div>
            <div class="dash-kpi-val" style="color:var(--turmeric-dark);">${stockItems.length}</div>
            <div class="dash-kpi-sub">Stock items registered</div>
          </div>
          <div class="dash-kpi-card">
            <div class="dash-kpi-title">Estimated Stock Value</div>
            <div class="dash-kpi-val" style="color:var(--ink);">₹${totalStockVal.toLocaleString('en-IN')}</div>
            <div class="dash-kpi-sub">Total inventory asset valuation</div>
          </div>
        </div>

        ${typeof buildQtyGraphHtml === 'function' && lowStockList.length ? buildQtyGraphHtml(lowStockList, 'monthly', null, 'Low Stock Quantity Distribution', 'qty', 'Pcs', 'created_at') : ''}
      </div>
    ` : ''}

    <!-- 4. Staff & Attendance Visual Report Section -->
    ${(reportsCategoryFilter==='all' || reportsCategoryFilter==='attendance') ? `
      <div style="margin-bottom:20px;">
        <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">
          <span>Staff Attendance &amp; Team Performance Visuals</span>
          <button class="stamp-btn small ghost" onclick="window.__setTab('attendance')">View Attendance Tab ➔</button>
        </div>

        <div class="dash-kpi-grid" style="margin-bottom:12px;">
          <div class="dash-kpi-card">
            <div class="dash-kpi-title">Active Team Members</div>
            <div class="dash-kpi-val" style="color:var(--turmeric-dark);">${activeStaff.length}</div>
            <div class="dash-kpi-sub">Active registered staff</div>
          </div>
          <div class="dash-kpi-card">
            <div class="dash-kpi-title">Today's Attendance Rate</div>
            <div class="dash-kpi-val" style="color:${attPct>=80?'var(--leaf)':'var(--turmeric-dark)'};">${attPct}%</div>
            <div class="dash-kpi-sub">${todayPresent} / ${activeStaff.length} present today</div>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- 5. Sales & Revenue Visual Report Section -->
    ${(reportsCategoryFilter==='all' || reportsCategoryFilter==='sales') ? `
      <div style="margin-bottom:20px;">
        <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">
          <span>Sales &amp; Revenue Reports</span>
          <button class="stamp-btn small ghost" onclick="window.__setTab('sales')">View Sales Tab ➔</button>
        </div>

        <div class="dash-kpi-grid" style="margin-bottom:12px;">
          <div class="dash-kpi-card">
            <div class="dash-kpi-title">Total Sales This Month</div>
            <div class="dash-kpi-val" style="color:var(--leaf);">₹${totalSalesThisMonth.toLocaleString('en-IN')}</div>
            <div class="dash-kpi-sub">Gross logged sales revenue (${currentMonth})</div>
          </div>
          <div class="dash-kpi-card">
            <div class="dash-kpi-title">Total Sales Entries</div>
            <div class="dash-kpi-val" style="color:var(--ink);">${salesList.length}</div>
            <div class="dash-kpi-sub">Total sales records in history</div>
          </div>
        </div>

        ${typeof buildQtyGraphHtml === 'function' && salesList.length ? buildQtyGraphHtml(salesList, 'monthly', null, 'Monthly Sales Volume (₹)', 'amount', '₹', 'date') : ''}
      </div>
    ` : ''}
  `;
}

/* ---------------- ACCOUNT (staff profile page) ---------------- */
window.__openAccount = () => { activeTab = 'account'; renderShell(); };
function computeBadges(s){
  const badges = [];
  const totals = {};
  cache.points.forEach(p=>{ totals[p.staff_id] = (totals[p.staff_id]||0) + Number(p.points||0); });
  const pts = totals[s.id] || 0;
  [[500,icon('trophy',14)+' 500 Club'],[250,icon('trophy',14)+' 250 Club'],[100,icon('star',14)+' Century'],[50,icon('star',14)+' 50 Points']].forEach(([n,label])=>{ if(pts>=n){ badges.push(label); } });
  const streak = computePresenceStreak(s.id);
  if(streak>=30) badges.push(icon('fire',14)+' 30-Day Streak');
  else if(streak>=7) badges.push(icon('fire',14)+' 7-Day Streak');
  const doneCount = cache.tasks.filter(t=>t.assigned_to===s.id && t.status==='done').length;
  [[100,icon('check',14)+' 100 Tasks Done'],[50,icon('check',14)+' 50 Tasks Done'],[10,icon('check',14)+' 10 Tasks Done']].forEach(([n,label])=>{ if(doneCount>=n){ badges.push(label); } });
  if(s.created_at){
    const months = Math.floor((Date.now()-new Date(s.created_at).getTime())/(1000*60*60*24*30));
    if(months>=12) badges.push(icon('weekly',14)+' 1 Year+ Veteran');
    else if(months>=6) badges.push(icon('weekly',14)+' 6 Months+');
  }
  return badges.length ? badges : ['Just getting started'];
}
function tenureStr(createdAt){
  if(!createdAt) return 'Unknown';
  const days = Math.floor((Date.now()-new Date(createdAt).getTime())/(1000*60*60*24));
  if(days<30) return `${days} day(s)`;
  if(days<365) return `${Math.floor(days/30)} month(s)`;
  const years = Math.floor(days/365);
  const months = Math.floor((days%365)/30);
  return `${years} year(s)${months?', '+months+' month(s)':''}`;
}
function renderAccountTab(body){
  const s = cache.staff.find(x=>x.id===session.staffId) || {name:session.name, role:session.role};
  const totals = {};
  cache.points.forEach(p=>{ totals[p.staff_id] = (totals[p.staff_id]||0) + Number(p.points||0); });
  const ranked = cache.staff.slice().sort((a,b)=>(totals[b.id]||0)-(totals[a.id]||0));
  const myRank = ranked.findIndex(x=>x.id===session.staffId);
  const badges = computeBadges(s);
  const doneCount = cache.tasks.filter(t=>t.assigned_to===session.staffId && t.status==='done').length;

  body.innerHTML = `
    
    <div class="row-card" style="flex-direction:column;align-items:center;text-align:center;padding:26px 16px;">
      <div class="avatar-circle ${rankClass(myRank)}" style="width:76px;height:76px;font-size:1.8rem;margin-bottom:10px;">${initials(s.name)}</div>
      <h2 style="margin:0 0 4px;font-family:'Roboto Mono',monospace;">${esc(s.name)}</h2>
      <span class="role-pill ${s.role}">${s.role}</span>
    </div>

    <div class="stat-grid">
      <div class="stat-card"><div class="num" style="color:var(--turmeric-dark);">${totals[session.staffId]||0}</div><div class="label">Total points</div></div>
      <div class="stat-card"><div class="num">#${myRank+1}</div><div class="label">Team rank</div></div>
      <div class="stat-card"><div class="num">${doneCount}</div><div class="label">Tasks completed</div></div>
      <div class="stat-card"><div class="num" style="font-size:1rem;">${tenureStr(s.created_at)}</div><div class="label">On the team</div></div>
    </div>

    <div class="section-label">Badges</div>
    <div class="row-card" style="flex-wrap:wrap;">
      ${badges.map(b=>`<span class="badge-chip">${b}</span>`).join('')}
    </div>

    <div class="section-label">Personal information</div>
    <div class="row-card"><div class="row-main">
      <div class="kv"><span>Name</span><b>${esc(s.name)}</b></div>
      <div class="kv"><span>Role</span><b style="text-transform:capitalize;">${s.role}</b></div>
      <div class="kv"><span>Business</span><b>${esc(session.businessName)}</b></div>
      ${s.salary_day?`<div class="kv"><span>Payday</span><b>Day ${s.salary_day} of the month</b></div>`:''}
    </div></div>

    <div class="section-label">Contact details</div>
    <div class="row-card"><div class="row-main">
      <div class="kv"><span>Phone</span><b>${s.phone?esc(s.phone):'Not on file'}</b></div>
    </div></div>

    <div class="section-label">🔔 Pop-Up &amp; Notification Settings</div>
    <div class="row-card" style="flex-direction:column;align-items:stretch;gap:10px;">
      <p style="font-size:0.78rem;color:var(--ink-soft);margin:0;">Control pop-up reminders and audio alert beeps on your device.</p>
      
      <label style="display:flex;align-items:center;gap:10px;font-size:0.84rem;cursor:pointer;margin-top:4px;">
        <input type="checkbox" id="cfgDisableTaskPopups" ${getFeatureConfig().disablePendingTaskPopups ? 'checked' : ''} style="width:18px;height:18px;">
        <span>🚫 <b>Disable Pending Task Pop-Up Reminders (Every 5 mins)</b></span>
      </label>

      <label style="display:flex;align-items:center;gap:10px;font-size:0.84rem;cursor:pointer;">
        <input type="checkbox" id="cfgDisableBackupPopups" ${getFeatureConfig().disableBackupReminderPopups ? 'checked' : ''} style="width:18px;height:18px;">
        <span>📦 <b>Disable Weekend Backup Reminder Pop-Ups</b></span>
      </label>

      <label style="display:flex;align-items:center;gap:10px;font-size:0.84rem;cursor:pointer;">
        <input type="checkbox" id="cfgDisableAudioBeeps" ${getFeatureConfig().disableAudioNotificationBeeps ? 'checked' : ''} style="width:18px;height:18px;">
        <span>🔇 <b>Mute Audio Sound Effects on Reminders &amp; Alerts</b></span>
      </label>

      <div class="modal-actions" style="margin-top:6px;">
        <button class="stamp-btn" style="background:var(--turmeric);color:#fff;" onclick="window.__saveCustomFeatures()">Save Pop-Up Settings</button>
      </div>
    </div>

    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="window.__setTab('${quickTabs()[0]}')">Back</button>
    </div>
  `;
}

/* ---------------- SETTINGS (owner only) ---------------- */
function renderSettingsTab(body){
  const cfg = getFeatureConfig();
  body.innerHTML = `
    
    <div class="section-label">Business name</div>
    <div class="row-card" style="flex-direction:column;align-items:stretch;">
      <label style="margin-top:0;">Name</label>
      <input id="mBizName" value="${esc(session.businessName)}">
      <div class="modal-actions"><button class="stamp-btn" onclick="window.__renameBusiness()">Save name</button></div>
    </div>

    <div class="section-label">Customise Features &amp; Permissions</div>
    <div class="row-card" style="flex-direction:column;align-items:stretch;gap:12px;">
      <p style="font-size:0.8rem;color:var(--ink-soft);margin:0 0 4px;">Customize feature access, data privacy, and role permissions according to your business needs.</p>
      
      <label style="display:flex;align-items:center;gap:10px;font-size:0.85rem;cursor:pointer;">
        <input type="checkbox" id="cfgMaskCust" ${cfg.maskCustomerDir ? 'checked' : ''} style="width:18px;height:18px;">
        <span><b>Mask Phone Numbers &amp; Address for Staff &amp; Managers</b> (All Customer Names are ALWAYS UNMASKED; phone &amp; address protected)</span>
      </label>

      <label style="display:flex;align-items:center;gap:10px;font-size:0.85rem;cursor:pointer;">
        <input type="checkbox" id="cfgMaskSales" ${cfg.maskSalesDigits ? 'checked' : ''} style="width:18px;height:18px;">
        <span><b>Mask Sales Figures Above 6 Digits (₹1 Lakh+) for Staff</b> (Amounts below 6 digits like ₹48,500 show in full; 6+ digit totals like ₹1,00,000+ mask higher digits)</span>
      </label>


      <label style="display:flex;align-items:center;gap:10px;font-size:0.85rem;cursor:pointer;">
        <input type="checkbox" id="cfgManagerAcc" ${cfg.allowManagerAccounts ? 'checked' : ''} style="width:18px;height:18px;">
        <span><b>Allow Managers Access to Accounts Tab</b></span>
      </label>

      <label style="display:flex;align-items:center;gap:10px;font-size:0.85rem;cursor:pointer;">
        <input type="checkbox" id="cfgManagerSalary" ${cfg.allowManagerSalary ? 'checked' : ''} style="width:18px;height:18px;">
        <span><b>Allow Managers Access to Salary Tab</b></span>
      </label>

      <label style="display:flex;align-items:center;gap:10px;font-size:0.85rem;cursor:pointer;">
        <input type="checkbox" id="cfgManagerReports" ${cfg.allowManagerReports ? 'checked' : ''} style="width:18px;height:18px;">
        <span><b>Allow Managers Access to Reports Tab</b></span>
      </label>

      <div style="border-top:1px dashed var(--paper-line);margin:6px 0;padding-top:10px;">
        <b style="font-size:0.82rem;color:var(--ink);display:block;margin-bottom:8px;">POP-UP &amp; AUTOMATIC REMINDER SETTINGS:</b>
        
        <label style="display:flex;align-items:center;gap:10px;font-size:0.85rem;cursor:pointer;margin-bottom:8px;">
          <input type="checkbox" id="cfgDisableTaskPopups" ${cfg.disablePendingTaskPopups ? 'checked' : ''} style="width:18px;height:18px;">
          <span><b>Disable Pending Task Pop-Up Reminders (Every 5 mins)</b></span>
        </label>

        <label style="display:flex;align-items:center;gap:10px;font-size:0.85rem;cursor:pointer;margin-bottom:8px;">
          <input type="checkbox" id="cfgDisableBackupPopups" ${cfg.disableBackupReminderPopups ? 'checked' : ''} style="width:18px;height:18px;">
          <span><b>Disable Weekend Backup Reminder Pop-Ups</b></span>
        </label>

        <label style="display:flex;align-items:center;gap:10px;font-size:0.85rem;cursor:pointer;">
          <input type="checkbox" id="cfgDisableAudioBeeps" ${cfg.disableAudioNotificationBeeps ? 'checked' : ''} style="width:18px;height:18px;">
          <span><b>Mute Audio Sound Effects on Reminders &amp; Alerts</b></span>
        </label>
      </div>

      <div class="modal-actions" style="margin-top:6px;">
        <button class="stamp-btn" style="background:var(--turmeric);color:#fff;" onclick="window.__saveCustomFeatures()">Save Feature Settings</button>
      </div>
    </div>

    <div class="section-label">Owner alert SMS number</div>
    <div class="row-card" style="flex-direction:column;align-items:stretch;">
      <label style="margin-top:0;">Phone number for attendance &amp; stock alerts</label>
      <input id="mOwnerPhone" value="${esc(getOwnerNotifyNumber())}" placeholder="+916379849947">
      <div class="modal-actions"><button class="stamp-btn" onclick="window.__saveOwnerPhone()">Save alert number</button></div>
    </div>

    <div class="section-label">Backup</div>
    <div class="row-card" style="flex-direction:column;align-items:stretch;">
      <p style="font-size:0.85rem;color:var(--ink-soft);margin:0 0 10px;">Download everything for this business — staff, tasks, attendance, and sales — as a file you can keep safe or restore from later.</p>
      <button class="stamp-btn" onclick="window.__downloadBackup()">Download backup</button>
    </div>
    <div class="row-card" style="flex-direction:column;align-items:stretch;">
      <p style="font-size:0.85rem;color:var(--ink-soft);margin:0 0 10px;">Restore from a backup file. This adds records back in — it won't remove anything currently in the app.</p>
      <input type="file" id="restoreFile" accept="application/json">
      <div class="modal-actions"><button class="stamp-btn ghost" onclick="window.__restoreBackup()">Restore from file</button></div>
      <div id="restoreMsg" style="font-size:0.8rem;margin-top:6px;"></div>
    </div>

    <div class="section-label">Alerts</div>
    <div class="row-card" style="flex-direction:column;align-items:stretch;">
      <p style="font-size:0.85rem;color:var(--ink-soft);margin:0;">In-app browser alerts fire only while this app is open in a tab — they can't wake your phone the way a WhatsApp message can. There's no separate push-notification service behind this (that would need a paid backend), so WhatsApp remains the reliable way to reach staff when the app is closed.</p>
    </div>
  `;
  window.__saveCustomFeatures = () => {
    const newCfg = {
      maskCustomerDir: document.getElementById('cfgMaskCust') ? document.getElementById('cfgMaskCust').checked : true,
      maskSalesDigits: document.getElementById('cfgMaskSales') ? document.getElementById('cfgMaskSales').checked : true,
      allowManagerAccounts: document.getElementById('cfgManagerAcc') ? document.getElementById('cfgManagerAcc').checked : false,
      allowManagerSalary: document.getElementById('cfgManagerSalary') ? document.getElementById('cfgManagerSalary').checked : false,
      allowManagerReports: document.getElementById('cfgManagerReports') ? document.getElementById('cfgManagerReports').checked : false,
      disablePendingTaskPopups: document.getElementById('cfgDisableTaskPopups') ? document.getElementById('cfgDisableTaskPopups').checked : false,
      disableBackupReminderPopups: document.getElementById('cfgDisableBackupPopups') ? document.getElementById('cfgDisableBackupPopups').checked : false,
      disableAudioNotificationBeeps: document.getElementById('cfgDisableAudioBeeps') ? document.getElementById('cfgDisableAudioBeeps').checked : false,
      allowStaffLowStockDelete: true,
      allowStaffExpiryTracker: true
    };
    saveFeatureConfig(newCfg);
    window.showToast('⚙️ Custom feature & pop-up settings saved!', 'success');
    renderShell();
  };


  window.__renameBusiness = async () => {
    const name = document.getElementById('mBizName').value.trim();
    if(!name){ alert('Enter a name.'); return; }
    await guardedSave('renamebiz', async () => {
      await sbCheck(sb.from('businesses').update({name}).eq('id', session.businessId));
      session.businessName = name;
      localStorage.setItem('br_session', JSON.stringify(session));
      await loadData();
      renderShell();
    });
  };
  window.__saveOwnerPhone = () => {
    const phone = document.getElementById('mOwnerPhone').value.trim();
    if(!phone){ alert('Enter a phone number.'); return; }
    localStorage.setItem('br_owner_phone', phone);
    alert('Owner alert phone number updated!');
  };
  window.__downloadBackup = performBackupDownload;
  window.__restoreBackup = async () => {
    const fileInput = document.getElementById('restoreFile');
    const msg = document.getElementById('restoreMsg');
    if(!fileInput.files.length){ msg.textContent = 'Choose a backup file first.'; msg.style.color = 'var(--turmeric)'; return; }
    try{
      const text = await fileInput.files[0].text();
      const data = JSON.parse(text);
      if(data.staff && data.staff.length) await sb.from('staff').upsert(data.staff.map(s=>({...s, business_id: session.businessId})));
      if(data.tasks && data.tasks.length) await sb.from('tasks').upsert(data.tasks.map(t=>({...t, business_id: session.businessId})));
      if(data.attendance && data.attendance.length) await sb.from('attendance').upsert(data.attendance.map(a=>({...a, business_id: session.businessId})));
      if(data.sales && data.sales.length) await sb.from('sales').upsert(data.sales.map(s=>({...s, business_id: session.businessId})));
      if(data.routines && data.routines.length) await sb.from('routines').upsert(data.routines.map(r=>({...r, business_id: session.businessId})));
      if(data.points && data.points.length) await sb.from('points_log').upsert(data.points.map(p=>({...p, business_id: session.businessId})));
      if(data.labels && data.labels.length) await sb.from('labels').upsert(data.labels.map(l=>({...l, business_id: session.businessId})));
      if(data.weeklyTasks && data.weeklyTasks.length) await sb.from('weekly_tasks').upsert(data.weeklyTasks.map(w=>({...w, business_id: session.businessId})));
      if(data.packages && data.packages.length) await sb.from('packages').upsert(data.packages.map(p=>({...p, business_id: session.businessId})));
      if(data.salaries && data.salaries.length) await sb.from('salaries').upsert(data.salaries.map(s=>({...s, business_id: session.businessId})));
      if(data.salesTargets && data.salesTargets.length) await sb.from('sales_targets').upsert(data.salesTargets.map(t=>({...t, business_id: session.businessId})));
      if(data.trophies && data.trophies.length) await sb.from('trophies').upsert(data.trophies.map(t=>({...t, business_id: session.businessId})));
      if(data.stockChecks && data.stockChecks.length) await sb.from('stock_checks').upsert(data.stockChecks.map(c=>({...c, business_id: session.businessId})));
      msg.textContent = 'Restored successfully.'; msg.style.color = 'var(--turmeric)';
      await loadData(); 
    } catch(e){
      msg.textContent = 'Could not read that file: ' + e.message; msg.style.color = 'var(--turmeric)';
    }
  };
}

/* ---------------- tiny haptic + click feedback on every button ---------------- */
let __audioCtx = null;
function getAudioCtx(){
  if(!__audioCtx){ try{ __audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
  return __audioCtx;
}
function playClickSound(){
  const ctx = getAudioCtx();
  if(!ctx) return;
  try{
    if(ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine'; o.frequency.value = 1100;
    g.gain.setValueAtTime(0.001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    o.start(); o.stop(ctx.currentTime + 0.06);
  } catch(e){}
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if(!btn) return;
  if(navigator.vibrate){ try{ navigator.vibrate(8); }catch(err){} }
  playClickSound();
}, true);

/* ---------------- what's new popup, shown once per version per device ---------------- */
const APP_VERSION = '3.4';
const CHANGELOG = {
  '3.0': [
    'New Salary tab (Owner only) — log payments, set each staff member\'s payday, see monthly payout graph',
    'New Salesman tab — opt-in location sharing while out on visits',
    '"I\'m in" button on Attendance — mark returning from a break, with location + SMS to owner',
    'Sales targets with progress bars on the Sales tab',
    'Points tab redesigned with staff profile cards and a fuller leaderboard',
    'Dashboard: payroll, sales target %, packaging, and location-sharing stats added',
  ],
  '3.1': [
    'New account page — tap your avatar (top right) for points, badges, tenure, and contact details',
    'Navigation redesigned — hamburger menu (top left) with all tabs, plus a bottom quick-access bar',
    'First-visit-of-day reminder if you haven\'t marked attendance yet, with a direct "Go to Attendance" button',
    'Business name can now be renamed from Settings — no more re-running SQL to fix it',
    'Fixed: re-running the setup SQL was silently demoting every Manager back to Owner — that no longer happens',
  ],
  '3.2': [
    'Weekend backup reminder for the Owner — a popup on Saturday/Sunday offers a one-tap backup download',
    'Salary now supports daily, weekly, or monthly pay — set each staff member\'s schedule on the Salary tab',
    'Attendance History is now Owner-only (Managers still see today\'s status and the monthly summary)',
    'New Trophy Cabinet on the Points tab — three assignable awards (Champion, Shooting Star, Team Player) you can give to any staff member',
    'Dashboard: fixed a broken graph toggle, and added a second graph (points/activity trend) alongside sales',
  ],
  '3.3': [
    'All emoji replaced with a clean line-icon set throughout the app, for a more professional look',
    'Staff can now create their own tasks (assigned to themselves)',
    'New Stockkeeper tab — daily stock check with a short questionnaire (checked? all correct? any problems?), with an SMS-to-owner option for reporting issues',
  ],
  '3.4': [
    'New "Cool Professional" theme — slate blue and white throughout, replacing the earlier warm cream/turmeric look',
    'Removed the ledger-lined paper background and rotated "stamp" badges for a cleaner, more corporate feel',
    'App icon and browser theme color updated to match',
  ],
};
function showChangelogPopup(){
  const seenKey = 'br_seen_version';
  if(localStorage.getItem(seenKey) === APP_VERSION) return;
  const items = CHANGELOG[APP_VERSION] || [];
  if(!items.length){ localStorage.setItem(seenKey, APP_VERSION); return; }
  const holder = document.createElement('div');
  holder.className = 'overlay show';
  holder.innerHTML = `<div class="modal">
    <h2>What's new — v${APP_VERSION}</h2>
    <ul style="padding-left:18px;margin:0 0 6px;">
      ${items.map(i=>`<li style="font-size:0.88rem;margin-bottom:8px;line-height:1.4;">${esc(i)}</li>`).join('')}
    </ul>
    <div class="modal-actions"><button class="stamp-btn" onclick="this.closest('.overlay').remove()">Got it</button></div>
  </div>`;
  document.body.appendChild(holder);
  localStorage.setItem(seenKey, APP_VERSION);
}

/* ---------------- first-visit-of-day "are you marked present?" prompt ---------------- */
function maybeShowAttendancePrompt(){
  const today = todayStr();
  const promptKey = 'br_att_prompted_' + today + '_' + session.staffId;
  if(localStorage.getItem(promptKey)) return;
  localStorage.setItem(promptKey, '1');
  const myToday = cache.attendance.find(a=>a.staff_id===session.staffId && a.date===today);
  if(myToday) return; // already marked, no need to ask
  const holder = document.createElement('div');
  holder.className = 'overlay show';
  holder.innerHTML = `<div class="modal">
    <h2>${icon('wave',22)} Marked present today?</h2>
    <p style="font-size:0.88rem;color:var(--ink-soft);margin:0;">Looks like you haven't marked your attendance yet today.</p>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="this.closest('.overlay').remove()">Cancel</button>
      <button class="stamp-btn" onclick="window.__goToAttendanceFromPrompt(this)">Go to Attendance</button>
    </div>
  </div>`;
  document.body.appendChild(holder);
  window.__goToAttendanceFromPrompt = (btn) => {
    btn.closest('.overlay').remove();
    activeTab = 'attendance';
    renderShell();
  };
}

/* ---------------- backup download (standalone, usable anywhere) ---------------- */
function performBackupDownload(){
  const payload = {
    exported_at: new Date().toISOString(),
    business: cache.businesses.find(b=>b.id===session.businessId) || {id:session.businessId, name:session.businessName},
    staff: cache.staff, tasks: cache.tasks, attendance: cache.attendance, sales: cache.sales, routines: cache.routines, points: cache.points, labels: cache.labels, weeklyTasks: cache.weeklyTasks, packages: cache.packages, salaries: cache.salaries, salesTargets: cache.salesTargets, trophies: cache.trophies, stockChecks: cache.stockChecks
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${session.businessName.replace(/\s+/g,'-').toLowerCase()}-backup-${todayStr()}.json`;
  a.click();
}

/* ---------------- weekend backup reminder (Owner only) ---------------- */
function maybeShowWeekendBackupPrompt(){
  if(!isOwner()) return;
  const cfg = typeof getFeatureConfig === 'function' ? getFeatureConfig() : {};
  if (cfg.disableBackupReminderPopups) return;
  const dayOfWeek = new Date().getDay(); // 0=Sunday, 6=Saturday
  if(dayOfWeek !== 0 && dayOfWeek !== 6) return;
  const weekKey = localDateStr(getWeekStartDate(new Date()));
  const promptKey = 'br_backup_prompted_' + weekKey;
  if(localStorage.getItem(promptKey)) return;
  localStorage.setItem(promptKey, '1');
  const holder = document.createElement('div');
  holder.className = 'overlay show';
  holder.innerHTML = `<div class="modal">
    <h2>Weekend Backup Reminder</h2>
    <p style="font-size:0.88rem;color:var(--ink-soft);margin:0;">It's the weekend — a good time to download a backup of everything for safekeeping.</p>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="this.closest('.overlay').remove()">Not now</button>
      <button class="stamp-btn" onclick="window.__downloadBackupFromPrompt(this)">Download backup</button>
    </div>
  </div>`;
  document.body.appendChild(holder);
  window.__downloadBackupFromPrompt = (btn) => {
    performBackupDownload();
    btn.closest('.overlay').remove();
  };
}

/* ================================================================
   FEATURE: EXPIRY TRACKER (Low Stock sub-tab)
   Stores items with name, batch, qty, expiry date, category
   ================================================================ */
function getExpiryItems() {
  try { return JSON.parse(localStorage.getItem('br_expiry_' + session.businessId) || '[]'); } catch(e) { return []; }
}
function saveExpiryItems(items) {
  try { localStorage.setItem('br_expiry_' + session.businessId, JSON.stringify(items)); } catch(e){}
  if (typeof syncCustomCloudPayload === 'function') syncCustomCloudPayload('[EXPIRY_ITEMS_DATA]', items);
}


function renderExpiryTrackerHtml() {
  const items = getExpiryItems();
  const today = todayStr();
  const todayDate = new Date(today);

  const expired    = items.filter(i => i.expiry_date && i.expiry_date < today);
  const expiringSoon = items.filter(i => {
    if (!i.expiry_date || i.expiry_date < today) return false;
    const diff = (new Date(i.expiry_date) - todayDate) / (1000*60*60*24);
    return diff <= 7;
  });
  const good = items.filter(i => !i.expiry_date || i.expiry_date >= today && ((new Date(i.expiry_date) - todayDate)/(1000*60*60*24)) > 7);

  const sorted = [...expired, ...expiringSoon, ...good];

  return `
  <div>
    <!-- KPI Row -->
    <div class="stat-grid" style="margin-bottom:16px;">
      <div class="stat-card"><div class="num" style="color:var(--brick);">${expired.length}</div><div class="label">Expired</div></div>
      <div class="stat-card"><div class="num" style="color:var(--turmeric);">${expiringSoon.length}</div><div class="label">Expiring in 7 Days</div></div>
      <div class="stat-card"><div class="num" style="color:var(--leaf);">${good.length}</div><div class="label">Good Stock</div></div>
      <div class="stat-card"><div class="num">${items.length}</div><div class="label">Total Tracked</div></div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div class="section-label" style="margin:0;">Expiry Tracker (${items.length})</div>
      <button class="stamp-btn small" style="background:var(--turmeric);color:#fff;border:none;" onclick="window.__openExpiryModal()">+ Add Item</button>
    </div>

    ${sorted.length ? sorted.map(item => {
      const isExpired = item.expiry_date && item.expiry_date < today;
      const diff = item.expiry_date ? Math.ceil((new Date(item.expiry_date) - todayDate)/(1000*60*60*24)) : null;
      const isSoon = !isExpired && diff !== null && diff <= 7;
      const badgeColor = isExpired ? 'var(--brick)' : isSoon ? 'var(--turmeric)' : 'var(--leaf)';
      const badge = isExpired ? `<span class="stamp high">Expired</span>`
                  : isSoon   ? `<span class="stamp medium">Expires in ${diff}d</span>`
                  : item.expiry_date ? `<span class="stamp done">OK</span>` : '';
      return `
      <div class="row-card ${isExpired ? 'overdue' : ''}" style="align-items:center;">
        <div class="row-main">
          <div class="meta">
            <span>${esc(item.category || 'General')}</span>
            ${item.batch ? `<span>Batch: ${esc(item.batch)}</span>` : ''}
          </div>
          <h3><span class="status-dot ${isExpired ? 'red' : 'green'}"></span>${esc(item.item_name)}</h3>
          <div style="font-size:0.78rem;color:var(--ink-soft);margin-top:4px;display:flex;gap:12px;flex-wrap:wrap;">
            ${item.qty ? `<span>Qty: <b>${esc(String(item.qty))} ${esc(item.unit||'Pcs')}</b></span>` : ''}
            ${item.expiry_date ? `<span>Expires: <b style="color:${badgeColor};">${item.expiry_date}</b></span>` : '<span>No expiry date</span>'}
          </div>
          <div style="margin-top:6px;">${badge}</div>
          ${item.notes ? `<div class="notes">${esc(item.notes)}</div>` : ''}
        </div>
        <div class="action-dropdown-holder">
          <button class="action-more-btn" onclick="window.__toggleActionMenu(event,'exp_${item.id}')">More ▾</button>
          <div class="action-dropdown-menu" id="actionMenu_exp_${item.id}">
            <button onclick="window.__openExpiryModal('${item.id}')">✎ Edit</button>
            <button class="danger" onclick="window.__deleteExpiryItem('${item.id}')">🗑 Delete</button>
          </div>
        </div>
      </div>`;
    }).join('') : `<div class="empty">No items tracked yet. Tap "+ Add Item" to start tracking expiry dates.</div>`}

    <div id="expiryModalHolder"></div>
  </div>`;
}

window.__openExpiryModal = function(id) {
  const items = getExpiryItems();
  const item = id ? items.find(x => x.id === id) : null;
  const holder = getModalHolder('taskModalHolder');
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>${item ? '✎ Edit Expiry Item' : '⏰ Add Expiry Item'}</h2>
    <label>Item / Product Name *</label>
    <input id="mExpName" value="${item ? esc(item.item_name) : ''}" placeholder="e.g. Amul Butter, Bread Loaf">
    <div class="two-col">
      <div><label>Category</label><input id="mExpCategory" value="${item ? esc(item.category||'') : ''}" placeholder="e.g. Dairy, Bakery"></div>
      <div><label>Batch No.</label><input id="mExpBatch" value="${item ? esc(item.batch||'') : ''}" placeholder="e.g. B2024-01"></div>
    </div>
    <div class="two-col">
      <div><label>Qty</label><input type="number" step="any" id="mExpQty" value="${item ? item.qty||'' : ''}" placeholder="e.g. 24"></div>
      <div><label>Unit</label><input id="mExpUnit" value="${item ? esc(item.unit||'Pcs') : 'Pcs'}" placeholder="Pcs, Kg, Ltr"></div>
    </div>
    <label>Expiry Date *</label>
    <input type="date" id="mExpDate" value="${item ? item.expiry_date||'' : ''}">
    <label>Notes</label>
    <textarea id="mExpNotes" placeholder="Optional notes...">${item ? esc(item.notes||'') : ''}</textarea>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="getModalHolder('taskModalHolder').innerHTML=''">Cancel</button>
      <button class="stamp-btn" style="background:var(--turmeric);color:#fff;" onclick="window.__saveExpiryItem('${id||''}')">Save Item</button>
    </div>
  </div></div>`;
};

window.__saveExpiryItem = function(id) {
  const name = (document.getElementById('mExpName').value||'').trim();
  if (!name) { alert('Enter item name.'); return; }
  const items = getExpiryItems();
  const payload = {
    id: id || ('exp_' + Date.now()),
    item_name: name,
    category: (document.getElementById('mExpCategory').value||'').trim() || 'General',
    batch: (document.getElementById('mExpBatch').value||'').trim(),
    qty: document.getElementById('mExpQty').value || '',
    unit: (document.getElementById('mExpUnit').value||'').trim() || 'Pcs',
    expiry_date: document.getElementById('mExpDate').value || '',
    notes: (document.getElementById('mExpNotes').value||'').trim(),
    added_by: session.staffId,
    added_at: new Date().toISOString()
  };
  if (id) {
    const idx = items.findIndex(x => x.id === id);
    if (idx >= 0) items[idx] = payload; else items.push(payload);
  } else {
    items.push(payload);
  }
  saveExpiryItems(items);
  getModalHolder('taskModalHolder').innerHTML = '';
  window.showToast('⏰ Expiry item saved!', 'success');
  renderTabBody();
};


window.__deleteExpiryItem = function(id) {
  if (!confirm('Delete this expiry item?')) return;
  const items = getExpiryItems().filter(x => x.id !== id);
  saveExpiryItems(items);
  window.showToast('🗑 Deleted.', 'info');
  renderTabBody();
};


/* ================================================================
   >>> CROSS-DEVICE CLOUD SYNC ENGINE <<<
================================================================ */
async function syncCustomCloudPayload(keyTitle, data) {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  if (navigator.onLine && typeof sb !== 'undefined' && session && session.businessId) {
    try {
      const { data: existing } = await sb
        .from('tasks')
        .select('id')
        .eq('business_id', session.businessId)
        .eq('title', keyTitle)
        .maybeSingle();

      const payload = {
        business_id: session.businessId,
        title: keyTitle,
        notes: jsonStr,
        status: 'done',
        priority: 'high',
        due_date: todayStr()
      };

      if (existing && existing.id) {
        const { error: upErr } = await sb.from('tasks').update(payload).eq('id', existing.id);
        if (upErr) await sb.from('tasks').upsert(payload, { onConflict: 'business_id,title' });
      } else {
        const { error: insErr } = await sb.from('tasks').insert(payload);
        if (insErr) await sb.from('tasks').upsert(payload, { onConflict: 'business_id,title' });
      }
    } catch(err){
      console.warn('Cloud payload sync notice (' + keyTitle + '):', err);
    }
  }
}

window.__reloadAppData = async function(btn) {
  if (btn && btn.querySelector('svg')) {
    btn.querySelector('svg').style.transition = 'transform 0.5s ease';
    btn.querySelector('svg').style.transform = 'rotate(360deg)';
  }
  showLoading();
  try {
    if (typeof flushOfflineMutations === 'function') await flushOfflineMutations();

    // Push local payloads first so device A's latest updates reach cloud
    try {
      if (typeof getCustomerDirectory === 'function') syncCustomCloudPayload('[CUSTOMER_DIRECTORY_DATA]', getCustomerDirectory());
      if (typeof getCustomerReportsData === 'function') syncCustomCloudPayload('[CUSTOMER_REPORTS_DATA]', getCustomerReportsData());
      if (typeof getExpiryItems === 'function') syncCustomCloudPayload('[EXPIRY_ITEMS_DATA]', getExpiryItems());
      if (typeof getExpensesList === 'function') syncCustomCloudPayload('[EXPENSES_TRACKER_DATA]', getExpensesList());
      if (typeof getSalaryAdvances === 'function') syncCustomCloudPayload('[SALARY_ADVANCES_DATA]', getSalaryAdvances());
      if (typeof getFeatureConfig === 'function') syncCustomCloudPayload('[FEATURE_SETTINGS_DATA]', getFeatureConfig());
      if (typeof getPriceListData === 'function') syncCustomCloudPayload('[PRICE_LIST_DATA]', getPriceListData());
      if (typeof getOfficeLogsData === 'function') syncCustomCloudPayload('[OFFICE_LOGS_DATA]', getOfficeLogsData());
      if (cache.staff && cache.staff.length) syncCustomCloudPayload('[STAFF_DIRECTORY_DATA]', cache.staff);
      if (cache.vendorBills && cache.vendorBills.length) syncCustomCloudPayload('[VENDOR_BILLS_DATA]', cache.vendorBills);
    } catch(e){}

    await loadData();
    renderShell();
    renderTabBody();
    if (typeof window.showToast === 'function') window.showToast('☁️ Cloud Data Synced across all devices!', 'success');
  } catch(e) {
    console.warn('Reload app data error:', e);
  } finally {
    hideLoading();
  }
};


window.safeBackgroundRenderTabBody = function() {
  const activeEl = document.activeElement;
  const isTyping = activeEl && (
    activeEl.tagName === 'INPUT' ||
    activeEl.tagName === 'TEXTAREA' ||
    activeEl.tagName === 'SELECT'
  );
  const isModalOpen = document.querySelector('.overlay.show') || document.querySelector('.modal');
  
  if (isTyping || isModalOpen) {
    console.log('Skipped background DOM refresh: user is actively typing or editing a form modal.');
    return;
  }
  if (typeof renderTabBody === 'function') {
    renderTabBody();
  }
};

// Auto-refresh loop disabled as requested by user. Data is loaded synchronously on app start and manually via the top refresh button.


let customerSegmentFilter = 'all';
let customerSearchQuery = '';

/* Dynamic Customer Deduplication Engine */
function areCustomersEqual(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;

  const phoneA = String(a.mobile || a.phone || '').replace(/\D/g, '');
  const phoneB = String(b.mobile || b.phone || '').replace(/\D/g, '');
  if (phoneA.length >= 7 && phoneB.length >= 7 && phoneA === phoneB) return true;

  const nameA = String(a.name || a.customer_name || '').trim().toLowerCase();
  const nameB = String(b.name || b.customer_name || '').trim().toLowerCase();
  if (nameA && nameB && nameA === nameB) return true;

  return false;
}

function deduplicateDirectory(list) {
  const unique = [];
  (list || []).forEach(item => {
    if (!item || (!item.name && !item.customer_name)) return;
    const existing = unique.find(u => areCustomersEqual(u, item));
    if (!existing) {
      unique.push(item);
    } else {
      if (!existing.mobile && item.mobile) existing.mobile = item.mobile;
      if (!existing.city && item.city) existing.city = item.city;
      if (!existing.address && item.address) existing.address = item.address;
      if (!existing.notes && item.notes) existing.notes = item.notes;
    }
  });
  return unique;
}

function deduplicateReports(list) {
  const unique = [];
  (list || []).forEach(item => {
    if (!item || (!item.customer_name && !item.name)) return;
    const existing = unique.find(u => areCustomersEqual(u, item));
    if (!existing) {
      unique.push(item);
    } else {
      if (Number(item.total_spent || 0) > Number(existing.total_spent || 0)) {
        existing.total_spent = item.total_spent;
      }
      if (Number(item.total_orders || 0) > Number(existing.total_orders || 0)) {
        existing.total_orders = item.total_orders;
      }
      if (!existing.phone && item.phone) existing.phone = item.phone;
      if (!existing.city && item.city) existing.city = item.city;
      if (!existing.remarks && item.remarks) existing.remarks = item.remarks;
    }
  });
  return unique;
}

function getCustomerReportsData() {
  try {
    const raw = JSON.parse(localStorage.getItem('br_customer_reports_' + session.businessId) || '[]');
    if (Array.isArray(raw) && raw.length) {
      cache.customerReports = raw;
    }
  } catch(e){}
  if (!cache.customerReports) cache.customerReports = [];


  // Deduplicate before sync
  cache.customerReports = deduplicateReports(cache.customerReports);

  // Sync directory entries into reports cache with duplicate protection
  const dir = getCustomerDirectory();
  dir.forEach(c => {
    const existing = cache.customerReports.find(r => areCustomersEqual(r, c));
    if (!existing) {
      cache.customerReports.push({
        id: c.id || ('cust_rep_' + Date.now() + '_' + Math.random().toString(36).substring(2,6)),
        customer_name: c.name,
        phone: c.mobile || '',
        city: c.city || '',
        total_spent: 0,
        total_orders: 1,
        last_order_date: (c.created_at || '').slice(0, 10) || todayStr(),
        favorite_item: '',
        segment: 'NEW',
        remarks: c.notes || ''
      });
    }
  });

  cache.customerReports = deduplicateReports(cache.customerReports);
  return cache.customerReports;
}

function saveCustomerReportsData() {
  cache.customerReports = deduplicateReports(cache.customerReports || []);
  try {
    localStorage.setItem('br_customer_reports_' + session.businessId, JSON.stringify(cache.customerReports));
  } catch(e){}

  // Sync to Customer Directory with duplicate protection
  try {
    let dir = getCustomerDirectory();
    (cache.customerReports || []).forEach(r => {
      const existing = dir.find(c => areCustomersEqual(c, r));
      if (!existing) {
        dir.push({
          id: r.id,
          name: r.customer_name,
          mobile: r.phone || '',
          city: r.city || '',
          address: '',
          notes: r.remarks || '',
          created_at: new Date().toISOString()
        });
      } else {
        if (r.customer_name) existing.name = r.customer_name;
        if (r.phone && !existing.mobile) existing.mobile = r.phone;
        if (r.city && !existing.city) existing.city = r.city;
        if (r.remarks && !existing.notes) existing.notes = r.remarks;
      }
    });
    dir = deduplicateDirectory(dir);
    localStorage.setItem('br_cust_dir_' + session.businessId, JSON.stringify(dir));
    syncCustomCloudPayload('[CUSTOMER_DIRECTORY_DATA]', dir);
  } catch(e){}

  syncCustomCloudPayload('[CUSTOMER_REPORTS_DATA]', cache.customerReports);
}


/* ================================================================
   FEATURE CUSTOMIZATION & ROLE PERMISSION CONFIG
   ================================================================ */
function getFeatureConfig() {
  const defaults = {
    maskCustomerDir: true,
    maskSalesDigits: true,
    allowManagerAccounts: false,
    allowManagerSalary: false,
    allowManagerReports: false,
    allowStaffLowStockDelete: true,
    allowStaffExpiryTracker: true,
    disablePendingTaskPopups: false,
    disableBackupReminderPopups: false,
    disableAudioNotificationBeeps: false
  };
  try {
    const bizId = (typeof session !== 'undefined' && session && session.businessId) ? session.businessId : 'default';
    const savedBiz = localStorage.getItem('br_features_' + bizId);
    const savedGlobal = localStorage.getItem('br_features_global');
    const saved = JSON.parse(savedBiz || savedGlobal || '{}');
    return { ...defaults, ...saved };
  } catch(e) {
    return defaults;
  }
}

function saveFeatureConfig(cfg) {
  try {
    const bizId = (typeof session !== 'undefined' && session && session.businessId) ? session.businessId : 'default';
    const jsonStr = JSON.stringify(cfg);
    localStorage.setItem('br_features_' + bizId, jsonStr);
    localStorage.setItem('br_features_global', jsonStr);
  } catch(e){}

  if (typeof syncCustomCloudPayload === 'function') {
    syncCustomCloudPayload('[FEATURE_SETTINGS_DATA]', cfg);
  }
}

window.__saveCustomFeatures = function() {
  const curCfg = getFeatureConfig();
  const newCfg = {
    maskCustomerDir: document.getElementById('cfgMaskCust') ? document.getElementById('cfgMaskCust').checked : curCfg.maskCustomerDir,
    maskSalesDigits: document.getElementById('cfgMaskSales') ? document.getElementById('cfgMaskSales').checked : curCfg.maskSalesDigits,
    allowManagerAccounts: document.getElementById('cfgManagerAcc') ? document.getElementById('cfgManagerAcc').checked : curCfg.allowManagerAccounts,
    allowManagerSalary: document.getElementById('cfgManagerSalary') ? document.getElementById('cfgManagerSalary').checked : curCfg.allowManagerSalary,
    allowManagerReports: document.getElementById('cfgManagerReports') ? document.getElementById('cfgManagerReports').checked : curCfg.allowManagerReports,
    disablePendingTaskPopups: document.getElementById('cfgDisableTaskPopups') ? document.getElementById('cfgDisableTaskPopups').checked : curCfg.disablePendingTaskPopups,
    disableBackupReminderPopups: document.getElementById('cfgDisableBackupPopups') ? document.getElementById('cfgDisableBackupPopups').checked : curCfg.disableBackupReminderPopups,
    disableAudioNotificationBeeps: document.getElementById('cfgDisableAudioBeeps') ? document.getElementById('cfgDisableAudioBeeps').checked : curCfg.disableAudioNotificationBeeps,
    allowStaffLowStockDelete: true,
    allowStaffExpiryTracker: true
  };

  saveFeatureConfig(newCfg);

  if (newCfg.disablePendingTaskPopups) {
    const reminder = document.getElementById('reminderOverlay');
    if (reminder) reminder.remove();
  }

  if (typeof window.showToast === 'function') {
    window.showToast('⚙️ Pop-up & feature settings saved successfully!', 'success');
  }
  renderShell();
};

function maskCustData(text, type) {
  if (!text) return '';
  // UNMASK ALL NAMES FOR ALL USERS AND ROLES
  if (type === 'name') return String(text);

  const cfg = getFeatureConfig();
  if (isOwner() || !cfg.maskCustomerDir) return String(text);

  if (type === 'mobile') {
    const clean = String(text).trim();
    if (clean.length <= 4) return '****';
    return clean.slice(0, 4) + '*****';
  }
  if (type === 'address' || type === 'notes') {
    return '•••••••••••• (Protected)';
  }
  return '••••••';
}

function maskSalesAmount(val) {
  const num = Math.round(Number(val || 0));

  // ONLY OWNER ROLE CAN VIEW UNMASKED FINANCIAL DATA & LEDGER AMOUNTS
  if (isOwner()) {
    return '₹' + num.toLocaleString('en-IN');
  }

  // FOR MANAGERS & ALL STAFF / NON-OWNER ROLES:
  // ALL FINANCIAL MONETARY DATA IS STRICTLY MASKED AND PROTECTED
  return '🔒 Restricted';
}





/* ================================================================
   FEATURE: CUSTOMER DIRECTORY (Customer Report sub-tab)
   Stores: name, mobile, address, notes — pure localStorage + Cloud Sync
   ================================================================ */
let customerReportSubTab = 'directory'; // 'directory' | 'report'
window.expandedCustReportIds = new Set();
window.isCustKpiCollapsed = false;

window.__toggleCustKpiOverview = function() {
  window.isCustKpiCollapsed = !window.isCustKpiCollapsed;
  renderTabBody();
};

window.__toggleExpandCustReport = function(id, e) {
  if (e && e.target && (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || e.target.closest('a') || e.target.closest('button'))) {
    return; // Don't toggle expansion when clicking action buttons or links
  }
  if (e) e.stopPropagation();
  if (window.expandedCustReportIds.has(id)) {
    window.expandedCustReportIds.delete(id);
  } else {
    window.expandedCustReportIds.add(id);
  }
  renderTabBody();
};

window.__toggleExpandAllCustReport = function() {
  const reports = typeof getCustomerReportsData === 'function' ? getCustomerReportsData() : [];
  let filtered = reports.slice();
  if (typeof customerSegmentFilter !== 'undefined' && customerSegmentFilter !== 'all') {
    filtered = filtered.filter(r => r.segment === customerSegmentFilter);
  }
  if (typeof customerSearchQuery !== 'undefined' && customerSearchQuery.trim()) {
    const q = customerSearchQuery.trim().toLowerCase();
    filtered = filtered.filter(r =>
      (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
      (r.phone && r.phone.includes(q)) ||
      (r.city && r.city.toLowerCase().includes(q)) ||
      (r.favorite_item && r.favorite_item.toLowerCase().includes(q)) ||
      (r.remarks && r.remarks.toLowerCase().includes(q))
    );
  }
  
  const filteredIds = filtered.map(r => r.id);
  if (!filteredIds.length) return;

  const allExpanded = filteredIds.every(id => window.expandedCustReportIds.has(id));
  if (allExpanded) {
    filteredIds.forEach(id => window.expandedCustReportIds.delete(id));
  } else {
    filteredIds.forEach(id => window.expandedCustReportIds.add(id));
  }
  renderTabBody();
};

window.__setCustomerReportSubTab = function(t) {
  customerReportSubTab = t;
  renderTabBody();
};



window.__toggleCustMoreMenu = function(e) {
  if (e) e.stopPropagation();
  const menus = document.querySelectorAll('.action-dropdown-menu');
  menus.forEach(m => {
    if (m.id !== 'custSubTabMoreMenu') m.classList.remove('show');
  });
  const menu = document.getElementById('custSubTabMoreMenu');
  if (menu) menu.classList.toggle('show');
};

window.__toggleCustActionsMoreMenu = function(e) {
  if (e) e.stopPropagation();
  const menus = document.querySelectorAll('.action-dropdown-menu');
  menus.forEach(m => {
    if (m.id !== 'custActionsMoreMenu') m.classList.remove('show');
  });
  const menu = document.getElementById('custActionsMoreMenu');
  if (menu) menu.classList.toggle('show');
};


function getCustomerDirectory() {
  try {
    const raw = JSON.parse(localStorage.getItem('br_cust_dir_' + session.businessId) || '[]');
    return deduplicateDirectory(raw);
  } catch(e) { return []; }
}
function saveCustomerDirectory(list) {
  const cleanList = deduplicateDirectory(list);
  try { localStorage.setItem('br_cust_dir_' + session.businessId, JSON.stringify(cleanList)); } catch(e){}
  syncCustomCloudPayload('[CUSTOMER_DIRECTORY_DATA]', cleanList);
}



function renderCustomerDirectoryHtml() {
  const list = getCustomerDirectory();
  let dirSearch = window._dirSearch || '';
  const cfg = getFeatureConfig();
  const isMasked = !isOwner() && cfg.maskCustomerDir;

  let filtered = list.slice();
  if (dirSearch.trim()) {
    const q = dirSearch.trim().toLowerCase();
    filtered = filtered.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.mobile && c.mobile.includes(q)) ||
      (c.address && c.address.toLowerCase().includes(q))
    );
  }

  return `
  <div>
    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-weight:700;font-size:0.95rem;color:var(--ink);">📒 Customer Directory ${isMasked ? '<span style="font-size:0.7rem;color:var(--turmeric-dark);font-weight:600;margin-left:6px;">🔒 [DATA MASKED FOR NON-OWNER]</span>' : ''}</div>
        <div style="font-size:0.68rem;color:var(--ink-soft);">${list.length} customer${list.length!==1?'s':''} saved &bull; Entry allowed for all staff</div>
      </div>
      <button class="stamp-btn small" style="background:var(--turmeric);color:#fff;border:none;" onclick="window.__openCustDirModal()">+ Add Customer Entry</button>
    </div>

    <!-- Search -->
    <input placeholder="🔍 Search by name, mobile or address..." value="${esc(dirSearch)}"
      style="margin-bottom:12px;"
      oninput="window._dirSearch=this.value; renderTabBody();">

    <!-- Stats row -->
    <div class="dash-kpi-grid" style="margin-bottom:16px;">
      <div class="dash-kpi-card"><div class="dash-kpi-title">Total</div><div class="dash-kpi-val">${list.length}</div><div class="dash-kpi-sub">Customers</div></div>
      <div class="dash-kpi-card"><div class="dash-kpi-title">With Mobile</div><div class="dash-kpi-val">${list.filter(c=>c.mobile).length}</div><div class="dash-kpi-sub">Contactable</div></div>
      <div class="dash-kpi-card"><div class="dash-kpi-title">With Address</div><div class="dash-kpi-val">${list.filter(c=>c.address).length}</div><div class="dash-kpi-sub">Mapped</div></div>
      <div class="dash-kpi-card"><div class="dash-kpi-title">Results</div><div class="dash-kpi-val">${filtered.length}</div><div class="dash-kpi-sub">Showing</div></div>
    </div>

    <div class="section-label">Customers (${filtered.length})</div>

    ${filtered.length ? `
    <div class="cards-grid-multi">
      ${filtered.map(c => {
        const displayName = maskCustData(c.name, 'name');
        const displayMobile = maskCustData(c.mobile, 'mobile');
        const displayAddress = maskCustData(c.address, 'address');
        const displayNotes = maskCustData(c.notes, 'notes');
        const cleanPhone = (c.mobile || '').replace(/[^0-9]/g, '');

        return `
        <div class="row-card grid-cust-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;width:100%;flex-wrap:nowrap;">
            <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1 1 auto;max-width:calc(100% - 80px);overflow:hidden;">
              <div class="avatar-circle" style="width:28px;height:28px;font-size:0.75rem;flex-shrink:0;background:var(--paper-line);color:var(--ink);">${(c.name||'?')[0].toUpperCase()}</div>
              <div style="min-width:0;flex:1;overflow:hidden;">
                <b style="font-size:0.8rem;color:var(--ink);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;">${esc(displayName)}</b>
                <div style="font-size:0.66rem;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;margin-top:1px;">📍 ${esc(c.city || 'N/A')}${c.mobile ? ' &bull; 📞 ' + esc(displayMobile) : ''}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;justify-content:flex-end;gap:3px;flex-shrink:0;margin-left:auto;white-space:nowrap;">
              ${(!isMasked && cleanPhone) ? `<a href="tel:${cleanPhone}" class="stamp-btn small ghost" style="padding:2px 5px;font-size:0.68rem;text-decoration:none;" title="Call">📞</a>` : ''}
              ${(!isMasked && cleanPhone) ? `<a href="https://wa.me/91${cleanPhone}" target="_blank" rel="noopener" class="stamp-btn small" style="background:#25D366;color:#fff;border-color:#25D366;padding:2px 5px;font-size:0.68rem;text-decoration:none;" title="WhatsApp">💬</a>` : ''}
              <button class="stamp-btn small ghost" style="padding:2px 5px;font-size:0.68rem;" onclick="window.__openCustDirModal('${c.id}')" title="Edit">✎</button>
              ${isOwner() ? `<button class="stamp-btn small ghost" style="color:var(--brick);border-color:var(--brick);padding:2px 5px;font-size:0.68rem;" onclick="window.__deleteCustDir('${c.id}')" title="Delete">🗑</button>` : ''}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
    ` : `<div class="empty">${dirSearch ? 'No customers match your search.' : 'No customers yet. Tap "+ Add Customer Entry" to build your directory.'}</div>`}

    <div id="custDirModalHolder"></div>
  </div>`;

}


window.__openCustDirModal = function(id) {
  const list = getCustomerDirectory();
  const c = id ? list.find(x => x.id === id) : null;
  let holder = document.getElementById('custDirModalHolder');
  if (!holder) { holder = document.createElement('div'); holder.id='custDirModalHolder'; document.body.appendChild(holder); }
  holder.innerHTML = `
  <div class="overlay show"><div class="modal">
    <h2>${c ? '✎ Edit Customer' : '👤 Add Customer'}</h2>
    <label>Customer / Party Name *</label>
    <input id="mCdName" value="${c ? esc(c.name) : ''}" placeholder="e.g. Ravi Traders, Meena Store">
    <label>Mobile Number</label>
    <input id="mCdMobile" type="tel" value="${c ? esc(c.mobile||'') : ''}" placeholder="e.g. 9876543210">
    <label>City</label>
    <input id="mCdCity" value="${c ? esc(c.city||'') : ''}" placeholder="e.g. Mumbai">
    <label>Full Address</label>
    <textarea id="mCdAddress" placeholder="Street, Area, Pincode...">${c ? esc(c.address||'') : ''}</textarea>
    <label>Notes</label>
    <textarea id="mCdNotes" placeholder="Order preference, payment terms, etc.">${c ? esc(c.notes||'') : ''}</textarea>
    <div class="modal-actions">
      <button class="stamp-btn ghost" onclick="document.getElementById('custDirModalHolder').innerHTML=''">Cancel</button>
      <button class="stamp-btn" style="background:var(--turmeric);color:#fff;" onclick="window.__saveCustDir('${id||''}')">Save Customer</button>
    </div>
  </div></div>`;
};

window.__saveCustDir = function(id) {
  const name = (document.getElementById('mCdName').value||'').trim();
  if (!name) { alert('Enter customer name.'); return; }
  const list = getCustomerDirectory();
  const payload = {
    id: id || ('cd_' + Date.now()),
    name,
    mobile: (document.getElementById('mCdMobile').value||'').trim(),
    city: (document.getElementById('mCdCity').value||'').trim(),
    address: (document.getElementById('mCdAddress').value||'').trim(),
    notes: (document.getElementById('mCdNotes').value||'').trim(),
    created_at: id ? (list.find(x=>x.id===id)||{}).created_at || new Date().toISOString() : new Date().toISOString()
  };

  const existingIdx = list.findIndex(x => (id && x.id === id) || (!id && areCustomersEqual(x, payload)));
  if (existingIdx >= 0) {
    list[existingIdx] = Object.assign({}, list[existingIdx], payload, { id: list[existingIdx].id });
  } else {
    list.unshift(payload);
  }

  saveCustomerDirectory(list);
  const h = document.getElementById('custDirModalHolder');
  if (h) h.innerHTML = '';
  window.showToast('👤 Customer saved!', 'success');
  renderTabBody();
};


window.__deleteCustDir = function(id) {
  if (!confirm('Delete this customer?')) return;
  const list = getCustomerDirectory().filter(x => x.id !== id);
  saveCustomerDirectory(list);
  window.showToast('🗑 Customer deleted.', 'info');
  renderTabBody();
};


/* ---------------- NEW REPORTS ON CUSTOMER TAB ---------------- */

function renderCityReportHtml(reports) {
  const cityMap = {};
  let grandTotal = 0;

  (reports || []).forEach(r => {
    const city = (r.city || '').trim().toUpperCase() || 'OTHER / UNASSIGNED';
    const spent = Number(r.total_spent || 0);
    grandTotal += spent;

    if (!cityMap[city]) {
      cityMap[city] = { city, count: 0, spent: 0, vip: 0 };
    }
    cityMap[city].count += 1;
    cityMap[city].spent += spent;
    if (r.segment === 'VIP') cityMap[city].vip += 1;
  });

  const cityList = Object.values(cityMap).sort((a, b) => b.spent - a.spent);

  if (!cityList.length) {
    return `<div class="empty">No city data available yet. Add city information to customer profiles to see city sales breakdowns.</div>`;
  }

  return `
    <div style="margin-bottom:16px;">
      <div style="font-weight:700;font-size:1.1rem;color:var(--ink);margin-bottom:4px;">🏙️ City &amp; Territory Sales Breakdown</div>
      <div style="font-size:0.78rem;color:var(--ink-soft);">Sales volume and customer distribution by location (${cityList.length} Cities)</div>
    </div>

    <div class="cards-grid-multi" style="margin-bottom:20px;">
      ${cityList.map(c => {
        const pct = grandTotal > 0 ? Math.round((c.spent / grandTotal) * 100) : 0;
        return `
          <div class="row-card" style="flex-direction:column;align-items:stretch;padding:14px;margin-bottom:0;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
              <div>
                <b style="font-size:1rem;color:var(--ink);">📍 ${esc(c.city)}</b>
                <div style="font-size:0.75rem;color:var(--ink-soft);margin-top:2px;">
                  ${c.count} Client${c.count!==1?'s':''} ${c.vip > 0 ? `&bull; <span style="color:var(--turmeric);font-weight:600;">${c.vip} VIP</span>` : ''}
                </div>
              </div>
              <div style="text-align:right;">
                <b style="font-family:'Roboto Mono',monospace;font-size:1.1rem;color:var(--turmeric-dark);">${maskSalesAmount(c.spent)}</b>
                <div style="font-size:0.72rem;color:var(--ink-soft);font-weight:700;">${pct}% of total</div>
              </div>
            </div>
            <div class="progress-track" style="margin-top:6px;">
              <div class="progress-fill" style="width:${pct}%;background:var(--turmeric);"></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}


function renderTopClientsLeaderboardHtml(reports) {
  const ranked = (reports || []).slice().sort((a, b) => Number(b.total_spent || 0) - Number(a.total_spent || 0));
  const topSpent = ranked.length ? Number(ranked[0].total_spent || 0) : 1;

  if (!ranked.length) {
    return `<div class="empty">No customer records available. Import or add customer profiles to build the leaderboard!</div>`;
  }

  return `
    <div style="margin-bottom:16px;">
      <div style="font-weight:700;font-size:1.1rem;color:var(--ink);margin-bottom:4px;">🏆 Top Clients Leaderboard</div>
      <div style="font-size:0.78rem;color:var(--ink-soft);">Highest spending accounts ranked by cumulative sales volume</div>
    </div>

    <div class="cards-grid-multi">
      ${ranked.map((r, idx) => {
        const spent = Number(r.total_spent || 0);
        const pct = topSpent > 0 ? Math.round((spent / topSpent) * 100) : 0;
        const rankMedal = idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx+1}`;

        return `
          <div class="row-card" style="flex-direction:column;align-items:stretch;padding:14px;margin-bottom:0;${idx < 3 ? 'border-left:4px solid var(--turmeric);background:var(--blue-soft);' : ''}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
              <div style="display:flex;gap:10px;align-items:center;">
                <span class="stamp ${idx<3?'present':'done'}" style="font-weight:800;font-size:0.85rem;padding:4px 8px;">${rankMedal}</span>
                <div>
                  <b style="font-size:0.98rem;color:var(--ink);">${esc(r.customer_name || 'UNNAMED PARTY')}</b>
                  <div style="font-size:0.75rem;color:var(--ink-soft);">📍 ${esc(r.city || 'N/A')} &bull; 📞 ${esc(r.phone || 'No Phone')}</div>
                </div>
              </div>
              <div style="text-align:right;">
                <b style="font-family:'Roboto Mono',monospace;font-size:1.15rem;color:var(--turmeric-dark);">${maskSalesAmount(spent)}</b>
                <div style="font-size:0.72rem;color:var(--ink-soft);">${r.total_orders || 1} Orders</div>
              </div>
            </div>

            <div class="progress-track" style="margin:4px 0 8px;">
              <div class="progress-fill" style="width:${pct}%;background:${idx===0?'var(--turmeric)':(idx<3?'var(--turmeric-dark)':'var(--blue)')};"></div>
            </div>

            ${r.favorite_item ? `<div style="font-size:0.72rem;color:var(--ink-soft);"><b>Preferred Item:</b> ${esc(r.favorite_item)}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}


function renderInactiveClientsReportHtml(reports) {
  const inactive = (reports || []).filter(r => r.segment === 'INACTIVE' || !r.last_order_date || r.last_order_date < '2026-07-01');

  if (!inactive.length) {
    return `<div class="empty">🎉 Great news! No inactive accounts found. All clients are currently active!</div>`;
  }

  return `
    <div style="margin-bottom:16px;">
      <div style="font-weight:700;font-size:1.1rem;color:var(--ink);margin-bottom:4px;">💤 Inactive Account Follow-Up List (${inactive.length})</div>
      <div style="font-size:0.78rem;color:var(--ink-soft);">Clients needing follow-up to re-engage orders and boost sales volume</div>
    </div>

    <div class="cards-grid-multi">
      ${inactive.map(r => {
        const cleanPhone = (r.phone || '').replace(/[^0-9]/g, '');
        const waMsg = encodeURIComponent(`Hi ${r.customer_name || 'Valued Client'}, we noticed it's been a while since your last order with ${session.businessName || 'our team'}. We'd love to share our updated catalog and offer special terms for your next order!`);

        return `
          <div class="row-card" style="flex-direction:column;align-items:stretch;padding:14px;margin-bottom:0;border-left:4px solid var(--turmeric-dark);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
              <div>
                <b style="font-size:0.95rem;color:var(--ink);">${esc(r.customer_name || 'UNNAMED PARTY')}</b>
                <div style="font-size:0.75rem;color:var(--ink-soft);">📍 ${esc(r.city || 'N/A')} &bull; 📞 ${esc(r.phone || 'No Phone')}</div>
              </div>
              <span class="stamp absent">💤 INACTIVE</span>
            </div>

            <div style="font-size:0.75rem;color:var(--ink-soft);margin-bottom:10px;">
              <div><b>Past Sales:</b> ${maskSalesAmount(r.total_spent)} (${r.total_orders || 0} orders)</div>
              ${r.last_order_date ? `<div><b>Last Order Date:</b> ${r.last_order_date}</div>` : ''}
              ${r.remarks ? `<div style="margin-top:2px;color:var(--ink);"><b>Notes:</b> ${esc(r.remarks)}</div>` : ''}
            </div>

            <div style="display:flex;gap:6px;margin-top:auto;">
              ${cleanPhone ? `<a href="tel:${cleanPhone}" class="stamp-btn small ghost" style="flex:1;text-decoration:none;">📞 Call Party</a>` : ''}
              ${cleanPhone ? `<a href="https://wa.me/${cleanPhone.length===10?'91'+cleanPhone:cleanPhone}?text=${waMsg}" target="_blank" class="stamp-btn small" style="background:#25D366;color:#fff;border-color:#25D366;flex:1;text-decoration:none;">💬 Re-engage WhatsApp</a>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}


function renderPaymentReportHtml(reports) {
  const allReports = reports || [];
  
  // Calculate Payment Statistics
  const totalVolume = allReports.reduce((sum, r) => sum + Number(r.total_spent || 0), 0);
  const totalDue = allReports.filter(r => (r.due_amount && r.due_amount > 0) || r.segment === 'INACTIVE' || r.payment_status === 'DUE').reduce((sum, r) => sum + Number(r.due_amount || (r.segment === 'INACTIVE' ? Math.round(Number(r.total_spent||0)*0.2) : 0)), 0);
  const totalCollected = Math.max(0, totalVolume - totalDue);
  const dueCount = allReports.filter(r => (r.due_amount && r.due_amount > 0) || r.segment === 'INACTIVE' || r.payment_status === 'DUE').length;

  return `
    <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
      <div>
        <div style="font-weight:700;font-size:1.1rem;color:var(--ink);">💳 Customer Payment &amp; Ledger Settlement Report</div>
        <div style="font-size:0.78rem;color:var(--ink-soft);">Track outstanding party balances, collections, payment reminders, and WhatsApp follow-ups</div>
      </div>
      <button class="stamp-btn small" onclick="window.__openAddCustomerReportModal()">+ Record Payment Entry</button>
    </div>

    ${isOwner() ? `
    <!-- Payment Overview KPI Grid (Owner Only) -->
    <div class="dash-kpi-grid" style="margin-bottom:20px;">
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Total Business Volume</div>
        <div class="dash-kpi-val" style="color:var(--ink);">${maskSalesAmount(totalVolume)}</div>
        <div class="dash-kpi-sub">Total Party Billing</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Total Payments Collected</div>
        <div class="dash-kpi-val" style="color:var(--leaf);">${maskSalesAmount(totalCollected)}</div>
        <div class="dash-kpi-sub">Settled Cash/GPay/Ledger</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Pending Payment Dues</div>
        <div class="dash-kpi-val" style="color:var(--brick);">${maskSalesAmount(totalDue)}</div>
        <div class="dash-kpi-sub">${dueCount} Parties Pending</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Collection Rate</div>
        <div class="dash-kpi-val" style="color:var(--turmeric-dark);">${totalVolume > 0 ? Math.round((totalCollected / totalVolume) * 100) : 100}%</div>
        <div class="dash-kpi-sub">Settlement Ratio</div>
      </div>
    </div>
    ` : ''}


    <div class="section-label">Party Payment Records (${allReports.length})</div>

    <div class="cards-grid-multi">
      ${allReports.map(r => {
        const spent = Number(r.total_spent || 0);
        const dueAmt = Number(r.due_amount || (r.segment === 'INACTIVE' ? Math.round(spent * 0.2) : 0));
        const isPending = dueAmt > 0;
        const cleanPhone = (r.phone || '').replace(/[^0-9]/g, '');
        const waMsg = encodeURIComponent(`Hi ${r.customer_name || 'Valued Client'}, this is a friendly payment reminder from ${session.businessName || 'our business'}. Current outstanding balance: Rs.${dueAmt}. Please arrange payment via UPI / Bank transfer. Thank you!`);

        return `
          <div class="row-card" style="flex-direction:column;align-items:stretch;padding:14px;margin-bottom:0;border-left:4px solid ${isPending ? 'var(--brick)' : 'var(--leaf)'};">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:8px;">
              <div>
                <b style="font-size:0.95rem;color:var(--ink);">${esc(r.customer_name || 'UNNAMED PARTY')}</b>
                <div style="font-size:0.75rem;color:var(--ink-soft);">📍 ${esc(r.city || 'N/A')} &bull; 📞 ${esc(r.phone || 'No Phone')}</div>
              </div>
              <span class="stamp ${isPending ? 'absent' : 'present'}">${isPending ? '🔴 DUES PENDING' : '🟢 SETTLED'}</span>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;background:var(--paper);padding:8px 12px;border-radius:6px;margin:6px 0 10px;font-size:0.8rem;">
              <div>Lifetime Business: <b>${maskSalesAmount(spent)}</b></div>
              <div style="color:${isPending ? 'var(--brick)' : 'var(--leaf)'};font-weight:700;">
                ${isPending ? `Due: ${maskSalesAmount(dueAmt)}` : `Cleared ✓`}
              </div>
            </div>

            <div style="display:flex;gap:6px;margin-top:auto;">
              ${cleanPhone ? `<a href="tel:${cleanPhone}" class="stamp-btn small ghost" style="flex:1;text-decoration:none;">📞 Call</a>` : ''}
              ${cleanPhone && isPending ? `<a href="https://wa.me/${cleanPhone.length===10?'91'+cleanPhone:cleanPhone}?text=${waMsg}" target="_blank" class="stamp-btn small" style="background:#25D366;color:#fff;border-color:#25D366;flex:1;text-decoration:none;">💬 Payment Reminder</a>` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}


function renderCustomerReportTab(body) {
  const reports = getCustomerReportsData();
  const totalSpent = reports.reduce((sum, r) => sum + Number(r.total_spent || 0), 0);
  const totalCount = reports.length;
  const vipCount = reports.filter(r => r.segment === 'VIP').length;
  const inactiveCount = reports.filter(r => r.segment === 'INACTIVE' || !r.last_order_date || r.last_order_date < '2026-07-01').length;
  const avgSpend = totalCount > 0 ? Math.round(totalSpent / totalCount) : 0;

  let filtered = reports.slice();
  if (customerSegmentFilter !== 'all') {
    filtered = filtered.filter(r => r.segment === customerSegmentFilter);
  }

  if (customerSearchQuery.trim()) {
    const q = customerSearchQuery.trim().toLowerCase();
    filtered = filtered.filter(r =>
      (r.customer_name && r.customer_name.toLowerCase().includes(q)) ||
      (r.phone && r.phone.includes(q)) ||
      (r.city && r.city.toLowerCase().includes(q)) ||
      (r.favorite_item && r.favorite_item.toLowerCase().includes(q)) ||
      (r.remarks && r.remarks.toLowerCase().includes(q))
    );
  }

  body.innerHTML = `
    <!-- Sub-menu Navigation with More Dropdown (No Long Swiping Needed) -->
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:16px;flex-wrap:wrap;">
      <button class="stamp-btn small ${customerReportSubTab==='directory'?'':'ghost'}" onclick="window.__setCustomerReportSubTab('directory')">📒 Directory (${getCustomerDirectory().length})</button>
      <button class="stamp-btn small ${customerReportSubTab==='report'?'':'ghost'}" onclick="window.__setCustomerReportSubTab('report')">📊 Analytics (${reports.length})</button>

      <div style="position:relative;display:inline-block;">
        <button class="stamp-btn small ${['city_report','top_clients','payment_report','inactive_list'].includes(customerReportSubTab)?'':'ghost'}" onclick="window.__toggleCustMoreMenu(event)" style="display:flex;align-items:center;gap:4px;">
          ${customerReportSubTab === 'city_report' ? '🏙️ City' : customerReportSubTab === 'top_clients' ? '🏆 Top Clients' : customerReportSubTab === 'payment_report' ? '💳 Payments' : customerReportSubTab === 'inactive_list' ? '💤 Inactive' : '••• More'} ▾
        </button>
        <div class="action-dropdown-menu" id="custSubTabMoreMenu" style="left:0;right:auto;top:100%;margin-top:4px;min-width:185px;">
          <button onclick="window.__setCustomerReportSubTab('city_report')">🏙️ City Breakdown</button>
          <button onclick="window.__setCustomerReportSubTab('top_clients')">🏆 Top Clients</button>
          <button onclick="window.__setCustomerReportSubTab('payment_report')">💳 Payment Report</button>
          <button onclick="window.__setCustomerReportSubTab('inactive_list')">💤 Inactive (${inactiveCount})</button>
        </div>
      </div>
    </div>

    ${customerReportSubTab === 'directory' ? renderCustomerDirectoryHtml() : ''}
    ${customerReportSubTab === 'city_report' ? renderCityReportHtml(reports) : ''}
    ${customerReportSubTab === 'top_clients' ? renderTopClientsLeaderboardHtml(reports) : ''}
    ${customerReportSubTab === 'payment_report' ? renderPaymentReportHtml(reports) : ''}
    ${customerReportSubTab === 'inactive_list' ? renderInactiveClientsReportHtml(reports) : ''}


    ${customerReportSubTab === 'report' ? `

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
      <div>
        <h2 style="margin:0 0 4px;font-size:1.25rem;">CUSTOMER INTELLIGENCE &amp; ANALYTICS REPORT</h2>
        <p style="margin:0;color:var(--ink-soft);font-size:0.78rem;">Import Vyapar backup files (.xlsx, .csv, .json), analyze party purchase behavior, track order volume, and engage customers.</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        ${isOwner() ? `
          <button class="stamp-btn small ghost" onclick="window.__toggleCustKpiOverview()">
            ${window.isCustKpiCollapsed ? '📊 Show KPI Overview' : '📊 Collapse KPI Overview'}
          </button>
        ` : ''}
        <button class="stamp-btn" style="background:var(--turmeric);color:#fff;border-color:var(--turmeric);" onclick="window.__openImportCustomerJsonModal()">📥 Import Vyapar / File</button>
        <div style="position:relative;display:inline-block;">
          <button class="stamp-btn ghost" onclick="window.__toggleCustActionsMoreMenu(event)">••• Actions ▾</button>
          <div class="action-dropdown-menu" id="custActionsMoreMenu" style="right:0;left:auto;top:100%;margin-top:4px;min-width:190px;">
            <button onclick="window.__openAddCustomerReportModal()">➕ Add Customer Entry</button>
            <button onclick="window.__copyChatGPTCustomerPrompt()">📋 Copy ChatGPT Prompt</button>
          </div>
        </div>
      </div>
    </div>


    ${isOwner() && !window.isCustKpiCollapsed ? `
    <!-- Overview Stat KPI Cards (Owner Only) -->
    <div class="dash-kpi-grid" style="margin-bottom:20px;">
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Total Customers</div>
        <div class="dash-kpi-val" style="color:var(--ink);">${totalCount}</div>
        <div class="dash-kpi-sub">Customer Profiles</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Total Ledger Sales</div>
        <div class="dash-kpi-val" style="color:var(--turmeric-dark);">${maskSalesAmount(totalSpent)}</div>
        <div class="dash-kpi-sub">Cumulative Business Volume</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">VIP Key Accounts</div>
        <div class="dash-kpi-val" style="color:var(--turmeric);">${vipCount}</div>
        <div class="dash-kpi-sub">High Priority Clients</div>
      </div>
      <div class="dash-kpi-card">
        <div class="dash-kpi-title">Avg Spend / Customer</div>
        <div class="dash-kpi-val" style="color:var(--ink);">${maskSalesAmount(avgSpend)}</div>
        <div class="dash-kpi-sub">Average Party Lifetime Value</div>
      </div>
    </div>
    ` : ''}


    <!-- Search & Filter Bar -->
    <div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">
      <input type="text" placeholder="Search customer name, phone, city, or items..." value="${esc(customerSearchQuery)}" oninput="customerSearchQuery=this.value;renderTabBody();" style="flex:1;min-width:240px;padding:10px 14px;border:1.5px solid var(--paper-line);border-radius:8px;">
      
      <div style="display:flex;gap:6px;overflow-x:auto;">
        <button class="stamp-btn small ${customerSegmentFilter==='all'?'':'ghost'}" onclick="customerSegmentFilter='all';renderTabBody();">ALL (${totalCount})</button>
        <button class="stamp-btn small ${customerSegmentFilter==='VIP'?'':'ghost'}" style="${customerSegmentFilter==='VIP'?'background:var(--turmeric-dark);color:#fff;border-color:var(--turmeric-dark);':''}" onclick="customerSegmentFilter='VIP';renderTabBody();">⭐ VIP (${vipCount})</button>
        <button class="stamp-btn small ${customerSegmentFilter==='REGULAR'?'':'ghost'}" onclick="customerSegmentFilter='REGULAR';renderTabBody();">👥 REGULAR</button>
        <button class="stamp-btn small ${customerSegmentFilter==='NEW'?'':'ghost'}" onclick="customerSegmentFilter='NEW';renderTabBody();">✨ NEW</button>
        <button class="stamp-btn small ${customerSegmentFilter==='INACTIVE'?'':'ghost'}" onclick="customerSegmentFilter='INACTIVE';renderTabBody();">💤 INACTIVE</button>
      </div>
    </div>

    <!-- Expand / Collapse All Header Bar -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
      <div style="font-weight:700;font-size:0.9rem;color:var(--ink);">Customer Accounts (${filtered.length})</div>
      ${filtered.length ? `
        <button class="stamp-btn small ghost" onclick="window.__toggleExpandAllCustReport()">
          ${filtered.every(r => window.expandedCustReportIds.has(r.id)) ? '📂 Collapse All Details' : '📖 Expand All Details'}
        </button>
      ` : ''}
    </div>

    <!-- Compact Customer Cards Grid with Expand / Collapse -->
    ${!filtered.length ? '<div class="empty">No customer report records found. Click "Import ChatGPT JSON" or "Add Customer Entry" to add customer profiles!</div>' : `
      <div class="cards-grid-multi">
        ${filtered.map(r => {
          const isVip = r.segment === 'VIP';
          const statusClass = isVip ? 'high' : r.segment === 'NEW' ? 'present' : r.segment === 'INACTIVE' ? 'low' : 'done';
          const isExpanded = window.expandedCustReportIds.has(r.id);

          const cleanPhone = (r.phone || '').replace(/[^0-9]/g, '');
          const waMessage = encodeURIComponent(`Hi ${r.customer_name || 'Valued Customer'}, thank you for doing business with ${session.businessName || 'B-INDUSTRIES'}. We appreciate your continued partnership!`);
          
          return `
            <div class="row-card grid-cust-card" style="${isVip ? 'border-left:4px solid var(--turmeric);background:var(--blue-soft);' : ''}">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;cursor:pointer;width:100%;flex-wrap:nowrap;" onclick="window.__toggleExpandCustReport('${r.id}', event)">
                <div style="display:flex;align-items:center;gap:4px;min-width:0;flex:1 1 auto;max-width:calc(100% - 90px);overflow:hidden;">
                  <span class="collapse-arrow ${isExpanded?'open':''}" style="font-size:0.75rem;color:var(--ink-soft);flex-shrink:0;">▸</span>
                  <div style="min-width:0;flex:1;overflow:hidden;">
                    <b style="font-size:0.82rem;color:var(--ink);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;width:100%;">${esc(r.customer_name || 'UNNAMED PARTY')}</b>
                    <div style="font-size:0.68rem;color:var(--ink-soft);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;margin-top:1px;width:100%;">📍 ${esc(r.city || 'N/A')}${cleanPhone ? ' &bull; 📞 ' + esc(r.phone) : ''}</div>
                  </div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:center;gap:2px;flex-shrink:0;margin-left:auto;white-space:nowrap;">
                  <span style="font-family:'Roboto Mono',monospace;font-weight:700;font-size:0.82rem;color:var(--turmeric-dark);line-height:1.1;">${maskSalesAmount(r.total_spent)}</span>
                  <span class="stamp ${statusClass}" style="padding:1px 5px;font-size:0.58rem;border-radius:999px;white-space:nowrap;line-height:1.1;">${isVip ? '⭐ VIP' : r.segment || 'REGULAR'}</span>
                </div>
              </div>






              ${isExpanded ? `
                <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--paper-line);font-size:0.75rem;color:var(--ink-soft);">
                  <div style="display:flex;justify-content:space-between;background:var(--paper);padding:6px 10px;border-radius:6px;margin-bottom:8px;font-size:0.75rem;flex-wrap:wrap;gap:4px;">
                    <div>Total Orders: <b style="color:var(--ink);">${r.total_orders || 0} Orders</b></div>
                    ${r.last_order_date ? `<div>Last Order: <b>${r.last_order_date}</b></div>` : ''}
                  </div>
                  ${r.favorite_item ? `<div style="margin-bottom:4px;"><b>Preferred Item:</b> ${esc(r.favorite_item)}</div>` : ''}
                  ${r.remarks ? `<div style="margin-bottom:8px;color:var(--ink);"><b>Notes:</b> ${esc(r.remarks)}</div>` : ''}

                  <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
                    ${cleanPhone ? `<a href="tel:${cleanPhone}" class="stamp-btn small ghost" style="flex:1 1 70px;text-decoration:none;text-align:center;">📞 Call</a>` : ''}
                    ${cleanPhone ? `<a href="https://wa.me/${cleanPhone.length===10?'91'+cleanPhone:cleanPhone}?text=${waMessage}" target="_blank" class="stamp-btn small" style="background:#25D366;color:#fff;border-color:#25D366;flex:1 1 100px;text-decoration:none;text-align:center;">💬 WhatsApp</a>` : ''}
                    <button class="stamp-btn small ghost" style="flex:1 1 60px;" onclick="window.__editCustomerReportModal('${r.id}')">✎ Edit</button>
                    <button class="stamp-btn small ghost" style="color:var(--brick);border-color:var(--brick);flex:1 1 50px;" onclick="window.__deleteCustomerReport('${r.id}')">🗑</button>
                  </div>
                </div>
              ` : ''}
            </div>



          `;
        }).join('')}
      </div>
    `}

    ` : ''}
  `;
}

let __loadedVyaparFileData = null;

function parseVyaparRow(item) {
  if (typeof item !== 'object' || item === null) return null;
  const keys = Object.keys(item);
  function getVal(patterns) {
    for (const pat of patterns) {
      const foundKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes(pat));
      if (foundKey && item[foundKey] !== undefined && item[foundKey] !== null && String(item[foundKey]).trim() !== '') {
        return item[foundKey];
      }
    }
    return '';
  }

  const name = getVal(['partyname', 'customername', 'party', 'name', 'customer', 'firmname', 'company']) || 'Unnamed Party';
  const phone = String(getVal(['phonenumber', 'mobilenumber', 'phone', 'mobile', 'contact'])).replace(/\D/g, '');
  const city = String(getVal(['city', 'address', 'billingaddress', 'state', 'location']));
  const totalSpent = parseFloat(getVal(['totalsales', 'sales', 'totalspent', 'totalamount', 'spent', 'amount', 'total']) || 0);
  const dueAmount = parseFloat(getVal(['openingbalance', 'receivableamount', 'receivable', 'dueamount', 'balance', 'pendingbalance', 'due', 'pending']) || 0);
  const totalOrders = parseInt(getVal(['totalorders', 'orders', 'ordercount']) || 1, 10);
  const lastOrderDate = String(getVal(['lastorderdate', 'lastdate', 'date']) || '');
  const favoriteItem = String(getVal(['favoriteitem', 'item', 'product', 'category']) || '');
  let segment = String(getVal(['segment', 'type', 'category']) || 'REGULAR').toUpperCase();
  if (!['VIP', 'REGULAR', 'NEW', 'INACTIVE'].includes(segment)) segment = 'REGULAR';
  const remarks = String(getVal(['gstin', 'gst', 'notes', 'remarks', 'comments', 'creditlimit']));

  return { name, phone, city, totalSpent, dueAmount, totalOrders, lastOrderDate, favoriteItem, segment, remarks };
}

window.__handleVyaparFileSelected = function(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const statusEl = document.getElementById('vyaparFileLoadedStatus');
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.innerHTML = `⏳ Reading file: ${esc(file.name)} (${(file.size/1024).toFixed(1)} KB)...`;
  }

  const fname = file.name.toLowerCase();
  const reader = new FileReader();

  if (fname.endsWith('.vyb')) {
    reader.onload = async function(e) {
      try {
        const arrayBuf = e.target.result;
        let rows = [];

        // 1. Try ZIP archive extraction (magic bytes PK..)
        const isZip = new Uint8Array(arrayBuf, 0, 4);
        if (isZip[0] === 0x50 && isZip[1] === 0x4B && typeof JSZip !== 'undefined') {
          try {
            const zip = await JSZip.loadAsync(arrayBuf);
            for (const filename of Object.keys(zip.files)) {
              if (filename.endsWith('.json') || filename.endsWith('.csv') || filename.endsWith('.txt') || filename.includes('party') || filename.includes('customer')) {
                const text = await zip.files[filename].async('string');
                try {
                  const parsed = JSON.parse(text);
                  if (Array.isArray(parsed)) rows.push(...parsed);
                  else if (parsed && Array.isArray(parsed.parties)) rows.push(...parsed.parties);
                  else if (parsed && typeof parsed === 'object') rows.push(parsed);
                } catch(err) {
                  const lines = text.split(/\r?\n/).filter(l => l.trim());
                  if (lines.length > 1) {
                    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                    const parsedCsv = lines.slice(1).map(line => {
                      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                      const obj = {};
                      headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
                      return obj;
                    });
                    rows.push(...parsedCsv);
                  }
                }
              }
            }
          } catch(zipErr) {}
        }

        // 2. Binary / SQLite Stream Parser (Embedded JSON objects + UTF-8 string entities)
        if (!rows.length) {
          const textUtf8 = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuf);
          const textLatin = new TextDecoder('latin1').decode(arrayBuf);
          const combinedText = textUtf8 + '\n' + textLatin;

          // A. Embedded JSON Search
          const jsonRegex = /\{[^{}]*"(?:name|party_name|partyname|customer_name)"[^{}]*\}/gi;
          const jsonMatches = combinedText.match(jsonRegex);
          if (jsonMatches) {
            jsonMatches.forEach(m => {
              try {
                const obj = JSON.parse(m);
                if (obj && (obj.name || obj.party_name || obj.partyname || obj.customer_name)) {
                  rows.push(obj);
                }
              } catch(err){}
            });
          }

          // B. Match 10-digit Indian Phone Numbers + Adjacent Party Names in Binary / SQLite dump
          if (!rows.length) {
            const seenNames = new Set();
            const phoneMatches = [...combinedText.matchAll(/([A-Z0-9\s._\-&]{3,40})[^\d]{1,25}\b([6-9]\d{9})\b/gi)];
            phoneMatches.forEach(m => {
              let pName = m[1].trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '');
              const pPhone = m[2];
              if (pName.length >= 3 && !/^(TABLE|CREATE|INSERT|SELECT|PRIMARY|KEY|INDEX|TEXT|INTEGER|VARCHAR|NOT|NULL)$/i.test(pName)) {
                if (!seenNames.has(pName.toLowerCase())) {
                  seenNames.add(pName.toLowerCase());
                  rows.push({ party_name: pName, phone: pPhone });
                }
              }
            });
          }
        }

        if (rows.length > 0) {
          __loadedVyaparFileData = rows;
          if (statusEl) {
            statusEl.innerHTML = `✅ Ready to Import Vyapar Backup (.VYB): <b>${esc(file.name)}</b> (${rows.length} party records extracted)`;
          }
          window.showToast(`✅ Loaded ${rows.length} Vyapar party records from .VYB backup!`, 'success');
        } else {
          alert('Could not auto-extract party records from this .vyb file. Please export Party List as Excel/CSV from Vyapar or paste raw data.');
        }
      } catch(err) {
        alert('Error parsing .vyb file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  if (fname.endsWith('.xlsx') || fname.endsWith('.xls') || fname.endsWith('.csv')) {
    reader.onload = function(e) {
      try {
        if (typeof XLSX === 'undefined') {
          alert('Excel parser library (XLSX) is not ready. Please refresh the page and try again.');
          return;
        }
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        __loadedVyaparFileData = rows;
        if (statusEl) {
          statusEl.innerHTML = `✅ Ready to Import: <b>${esc(file.name)}</b> (${rows.length} party records found)`;
        }
        window.showToast(`✅ Loaded ${rows.length} Vyapar party records!`, 'success');
      } catch(err) {
        alert('Error reading Excel/CSV file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    reader.onload = function(e) {
      try {
        const text = e.target.result;
        document.getElementById('customerJsonInput').value = text;
        if (statusEl) {
          statusEl.innerHTML = `✅ File Loaded: <b>${esc(file.name)}</b>`;
        }
        window.showToast('✅ Text file loaded into input box!', 'success');
      } catch(err) {
        alert('Error reading file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }
};

/* Modal for importing Vyapar Backup (.VYB), Excel, CSV, or JSON */
window.__openImportCustomerJsonModal = function() {
  let modal = document.getElementById('importCustomerJsonModal');
  if (!modal) {
    const div = document.createElement('div');
    div.id = 'importCustomerJsonModal';
    div.className = 'overlay';
    div.innerHTML = `
      <div class="modal" style="max-width:640px;">
        <h2>📥 Import Vyapar Backup (.VYB), Excel, CSV or JSON</h2>
        <p style="font-size:0.78rem;color:var(--ink-soft);margin-bottom:12px;">
          Directly select your <b>Vyapar App backup file (.vyb, .xlsx, .xls, .csv, .json)</b> or paste raw party data. Party names, phone numbers, total sales, and pending balance dues will be automatically parsed!
        </p>

        <!-- Direct File Upload Box -->
        <input type="file" id="mVyaparFileInput" accept=".vyb,.xlsx,.xls,.csv,.json,.txt" style="display:none;" onchange="window.__handleVyaparFileSelected(event)">
        <div id="vyaparFileDropZone" onclick="document.getElementById('mVyaparFileInput').click()" style="border:2px dashed var(--turmeric);background:var(--blue-soft);padding:18px 14px;border-radius:8px;text-align:center;cursor:pointer;margin-bottom:14px;transition:background 0.2s ease;">
          <div style="font-size:1.6rem;margin-bottom:4px;">📁</div>
          <b style="font-size:0.92rem;color:var(--turmeric-dark);">Tap to Select Vyapar Backup File (.vyb, .xlsx, .xls, .csv, .json)</b>
          <div style="font-size:0.75rem;color:var(--ink-soft);margin-top:2px;">Supports Vyapar Backup (.VYB), Party Exports, Excel Spreadsheets, CSV &amp; JSON</div>
        </div>
        
        <div id="vyaparFileLoadedStatus" style="display:none;margin-bottom:12px;padding:8px 12px;background:#e2e8f0;border-radius:6px;font-size:0.8rem;color:var(--ink);font-weight:700;"></div>

        <div style="margin-bottom:12px;">
          <label style="font-size:0.78rem;font-weight:700;color:var(--ink);">💳 PAYMENT DUES HANDLING ON IMPORT:</label>
          <select id="importPaymentDuesMode" style="width:100%;padding:9px;border-radius:6px;border:1.5px solid var(--paper-line);font-size:0.82rem;">
            <option value="auto">⚡ Auto-Detect Dues from Vyapar Balance / Receivable Columns</option>
            <option value="dues">🔴 Mark Dues Pending for All Imported Records</option>
            <option value="settled">🟢 Mark All Imported Records as Fully Settled (Zero Dues)</option>
          </select>
        </div>

        <label style="font-size:0.78rem;font-weight:700;color:var(--ink);">OR PASTE RAW CSV / TEXT / JSON DATA:</label>
        <textarea id="customerJsonInput" style="height:140px;font-family:monospace;font-size:0.8rem;" placeholder='Paste Vyapar Party List, CSV rows, or JSON here...'></textarea>

        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
          <button class="stamp-btn small ghost" onclick="document.getElementById('mVyaparFileInput').click()">📁 Choose File</button>
          <button class="stamp-btn small ghost" onclick="window.__copyChatGPTCustomerPrompt()">📋 Copy Prompt Guide</button>
        </div>

        <div class="modal-actions" style="margin-top:18px;">
          <button class="stamp-btn ghost" onclick="window.__closeCurrentModal(this)">Cancel</button>
          <button class="stamp-btn" style="background:var(--turmeric);color:#fff;border-color:var(--turmeric);" onclick="window.__submitImportCustomerJson()">📥 Import &amp; Save Customer Ledger</button>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    modal = div;
  }
  modal.classList.add('show');
};

window.__submitImportCustomerJson = function() {
  const duesMode = document.getElementById('importPaymentDuesMode') ? document.getElementById('importPaymentDuesMode').value : 'auto';
  const rawInput = document.getElementById('customerJsonInput') ? document.getElementById('customerJsonInput').value.trim() : '';

  let recordsToImport = [];

  if (__loadedVyaparFileData && Array.isArray(__loadedVyaparFileData) && __loadedVyaparFileData.length > 0) {
    recordsToImport = __loadedVyaparFileData;
  } else if (rawInput) {
    try {
      let parsed = JSON.parse(rawInput);
      if (!Array.isArray(parsed)) {
        if (typeof parsed === 'object' && parsed !== null) parsed = [parsed];
        else throw new Error('Invalid format');
      }
      recordsToImport = parsed;
    } catch(e) {
      // Try CSV parsing line-by-line if JSON parse failed
      const lines = rawInput.split(/\r?\n/).filter(l => l.trim());
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        recordsToImport = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const obj = {};
          headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
          return obj;
        });
      } else {
        alert('Could not parse data. Please select a valid Vyapar Excel file or paste JSON/CSV data.');
        return;
      }
    }
  } else {
    alert('Please select a Vyapar file (.xlsx/.csv) or paste data into the text box.');
    return;
  }

  const current = getCustomerReportsData();
  let count = 0;

  recordsToImport.forEach(item => {
    const row = parseVyaparRow(item);
    if (!row || !row.name) return;

    let dueAmount = 0;
    let paymentStatus = 'SETTLED';

    if (duesMode === 'settled') {
      dueAmount = 0;
      paymentStatus = 'SETTLED';
    } else if (duesMode === 'dues') {
      dueAmount = row.dueAmount > 0 ? row.dueAmount : Math.round((isNaN(row.totalSpent) ? 0 : row.totalSpent) * 0.2);
      paymentStatus = 'DUE';
    } else {
      // Auto-detect
      dueAmount = isNaN(row.dueAmount) ? 0 : row.dueAmount;
      paymentStatus = dueAmount > 0 ? 'DUE' : 'SETTLED';
    }

    const newItem = {
      id: 'cust_rep_' + Date.now() + '_' + Math.random().toString(36).substring(2,6),
      customer_name: row.name,
      phone: row.phone,
      city: row.city,
      total_spent: isNaN(row.totalSpent) ? 0 : row.totalSpent,
      due_amount: dueAmount,
      payment_status: paymentStatus,
      total_orders: isNaN(row.totalOrders) ? 1 : row.totalOrders,
      last_order_date: row.lastOrderDate,
      favorite_item: row.favoriteItem,
      segment: row.segment,
      remarks: row.remarks
    };

    const existingIdx = current.findIndex(r => areCustomersEqual(r, newItem));
    if (existingIdx >= 0) {
      Object.assign(current[existingIdx], newItem, { id: current[existingIdx].id });
    } else {
      current.push(newItem);
      count++;
    }
  });

  saveCustomerReportsData();
  __loadedVyaparFileData = null;
  const modal = document.getElementById('importCustomerJsonModal');
  if (modal) modal.classList.remove('show');

  window.showToast(`✅ Successfully imported ${count} Vyapar customer records!`, 'success');
  renderTabBody();
};

window.__copyChatGPTCustomerPrompt = function() {
  const promptText = `Convert the following customer sales & payment ledger list into a clean JSON array with keys: "customer_name", "phone", "city", "total_spent", "due_amount", "payment_status" ("SETTLED" or "DUE"), "total_orders", "last_order_date", "favorite_item", "segment" (VIP/REGULAR/NEW/INACTIVE), "remarks". Output ONLY valid JSON array without markdown code blocks.`;
  navigator.clipboard.writeText(promptText).then(() => {
    window.showToast('📋 Copied ChatGPT payment prompt guide to clipboard!', 'success');
  }).catch(() => {
    alert('ChatGPT Prompt:\n\n' + promptText);
  });
};


window.__openAddCustomerReportModal = function(editId) {
  const reports = getCustomerReportsData();
  const existing = editId ? reports.find(r => r.id === editId) : null;
  const r = existing || {};

  let modal = document.getElementById('addCustomerReportModal');
  if (!modal) {
    const div = document.createElement('div');
    div.id = 'addCustomerReportModal';
    div.className = 'overlay';
    document.body.appendChild(div);
    modal = div;
  }

  modal.innerHTML = `
    <div class="modal">
      <h2>${existing ? '✎ Edit Customer Report' : '➕ Add Customer Profile'}</h2>
      <label>CUSTOMER / PARTY NAME:</label>
      <input type="text" id="custName" value="${esc(r.customer_name || '')}" placeholder="e.g. ROHIT TRADERS">

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label>PHONE NUMBER:</label>
          <input type="text" id="custPhone" value="${esc(r.phone || '')}" placeholder="e.g. 9876543210">
        </div>
        <div>
          <label>CITY / LOCATION:</label>
          <input type="text" id="custCity" value="${esc(r.city || '')}" placeholder="e.g. MUMBAI">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label>TOTAL SPENT (₹):</label>
          <input type="number" id="custSpent" value="${r.total_spent || ''}" placeholder="e.g. 48500">
        </div>
        <div>
          <label>PENDING DUE AMOUNT (₹):</label>
          <input type="number" id="custDueAmount" value="${r.due_amount !== undefined ? r.due_amount : ''}" placeholder="e.g. 9500 (0 if paid)">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label>PAYMENT STATUS:</label>
          <select id="custPaymentStatus">
            <option value="SETTLED" ${r.payment_status==='SETTLED'||(!r.due_amount&&r.payment_status!=='DUE')?'selected':''}>🟢 SETTLED (PAID)</option>
            <option value="DUE" ${r.payment_status==='DUE'||r.due_amount>0?'selected':''}>🔴 DUES PENDING</option>
          </select>
        </div>
        <div>
          <label>TOTAL ORDERS:</label>
          <input type="number" id="custOrders" value="${r.total_orders || '1'}" placeholder="e.g. 12">
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div>
          <label>SEGMENT:</label>
          <select id="custSegment">
            <option value="REGULAR" ${r.segment==='REGULAR'?'selected':''}>👥 REGULAR</option>
            <option value="VIP" ${r.segment==='VIP'?'selected':''}>⭐ VIP</option>
            <option value="NEW" ${r.segment==='NEW'?'selected':''}>✨ NEW</option>
            <option value="INACTIVE" ${r.segment==='INACTIVE'?'selected':''}>💤 INACTIVE</option>
          </select>
        </div>
        <div>
          <label>LAST ORDER DATE:</label>
          <input type="date" id="custLastDate" value="${r.last_order_date || ''}">
        </div>
      </div>

      <label>PREFERRED ITEM / CATEGORY:</label>
      <input type="text" id="custFavItem" value="${esc(r.favorite_item || '')}" placeholder="e.g. STAINLESS STEEL FLANGE 2 INCH">

      <label>REMARKS / NOTES:</label>
      <textarea id="custNotes" placeholder="e.g. High volume buyer. Prefers Express delivery.">${esc(r.remarks || '')}</textarea>

      <div class="modal-actions">
        <button class="stamp-btn ghost" onclick="window.__closeCurrentModal(this)">Cancel</button>
        <button class="stamp-btn" onclick="window.__saveCustomerReportModal('${editId || ''}')">Save Customer Report</button>
      </div>
    </div>
  `;
  modal.classList.add('show');
};

window.__editCustomerReportModal = function(id) {
  window.__openAddCustomerReportModal(id);
};

window.__saveCustomerReportModal = function(editId) {
  const name = document.getElementById('custName').value.trim();
  const phone = document.getElementById('custPhone').value.trim();
  const city = document.getElementById('custCity').value.trim();
  const spent = parseFloat(document.getElementById('custSpent').value) || 0;
  const dueAmt = parseFloat(document.getElementById('custDueAmount').value) || 0;
  const payStatus = document.getElementById('custPaymentStatus').value;
  const orders = parseInt(document.getElementById('custOrders').value, 10) || 1;
  const segment = document.getElementById('custSegment').value;
  const date = document.getElementById('custLastDate').value;
  const favItem = document.getElementById('custFavItem').value.trim();
  const notes = document.getElementById('custNotes').value.trim();

  if (!name) {
    alert('Please enter a customer or party name.');
    return;
  }

  const reports = getCustomerReportsData();
  if (editId) {
    const existing = reports.find(r => r.id === editId);
    if (existing) {
      existing.customer_name = name;
      existing.phone = phone;
      existing.city = city;
      existing.total_spent = spent;
      existing.due_amount = dueAmt;
      existing.payment_status = payStatus;
      existing.total_orders = orders;
      existing.segment = segment;
      existing.last_order_date = date;
      existing.favorite_item = favItem;
      existing.remarks = notes;
    }
  } else {
    reports.push({
      id: 'cust_rep_' + Date.now(),
      customer_name: name,
      phone: phone,
      city: city,
      total_spent: spent,
      due_amount: dueAmt,
      payment_status: payStatus,
      total_orders: orders,
      segment: segment,
      last_order_date: date,
      favorite_item: favItem,
      remarks: notes
    });
  }

  saveCustomerReportsData();
  document.getElementById('addCustomerReportModal').classList.remove('show');
  window.showToast('✅ Customer report saved!', 'success');
  renderTabBody();
};


window.__deleteCustomerReport = function(id) {
  if (!confirm('Are you sure you want to delete this customer report entry?')) return;
  cache.customerReports = getCustomerReportsData().filter(r => r.id !== id);
  saveCustomerReportsData();
  window.showToast('🗑 Customer report deleted.', 'info');
  renderTabBody();
};


/* ================================================================
   FEATURE: PRICE LIST TAB FOR SALESPERSON (TABLE VIEW)
   Product Name | Beat Name | MRP Price | Scheme Price | Savings
   ================================================================ */

function getPriceListData() {
  if (!session || !session.businessId) return [];
  try {
    const raw = localStorage.getItem('br_pricelist_' + session.businessId);
    if (raw) return JSON.parse(raw);
  } catch(e){}
  // Default Initial Sample Price List Data
  return [
    { id: 'pl_1', product_name: 'Premium Detergent Powder 1kg', mrp_price: 160, scheme_price: 142, beat_name: 'Downtown Beat', created_at: todayStr() },
    { id: 'pl_2', product_name: 'Crisp Laundry Liquid 500ml', mrp_price: 195, scheme_price: 170, beat_name: 'Central Market Beat', created_at: todayStr() },
    { id: 'pl_3', product_name: 'Fabric Softener 1L', mrp_price: 220, scheme_price: 190, beat_name: 'West Industrial Beat', created_at: todayStr() },
    { id: 'pl_4', product_name: 'Stain Remover Gel 250g', mrp_price: 125, scheme_price: 105, beat_name: 'South Retail Beat', created_at: todayStr() },
    { id: 'pl_5', product_name: 'Dishwash Gel Lemon 750ml', mrp_price: 140, scheme_price: 118, beat_name: 'Downtown Beat', created_at: todayStr() }
  ];
}

function savePriceListData(data) {
  if (!session || !session.businessId) return;
  const list = data || cache.priceList || [];
  try {
    localStorage.setItem('br_pricelist_' + session.businessId, JSON.stringify(list));
  } catch(e){}
  if (typeof syncCustomCloudPayload === 'function') {
    syncCustomCloudPayload('[PRICE_LIST_DATA]', list);
  }
}

let priceListSearchQuery = '';
let priceListBeatFilter = '';

window.__onPriceListSearch = function(val) {
  priceListSearchQuery = val || '';
  renderTabBody();
};

window.__onPriceListBeatFilter = function(val) {
  priceListBeatFilter = val || '';
  renderTabBody();
};

function renderPriceListTab(body) {
  if (!cache.priceList) cache.priceList = getPriceListData();
  const items = cache.priceList || [];
  
  // Extract all unique Beat Names for filter dropdown
  const beats = Array.from(new Set(items.map(i => i.beat_name).filter(Boolean))).sort();

  // Filter items based on search query and beat filter
  const filtered = items.filter(i => {
    const q = priceListSearchQuery.toLowerCase().trim();
    const matchesSearch = !q || (i.product_name || '').toLowerCase().includes(q) || (i.beat_name || '').toLowerCase().includes(q);
    const matchesBeat = !priceListBeatFilter || i.beat_name === priceListBeatFilter;
    return matchesSearch && matchesBeat;
  });

  body.innerHTML = `
    <!-- Sales Beat Categories Quick Filter Bar -->
    <div style="margin-bottom:14px;background:var(--paper);padding:12px;border-radius:10px;border:1px solid var(--paper-line);">
      <div style="font-size:0.75rem;font-weight:700;color:var(--ink-soft);text-transform:uppercase;margin-bottom:8px;letter-spacing:0.04em;display:flex;align-items:center;gap:6px;">
        ${icon('pin', 14)} Sales Beat Categories
      </div>
      <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:2px;scrollbar-width:none;-webkit-overflow-scrolling:touch;">
        <button class="stamp-btn small ${!priceListBeatFilter ? '' : 'ghost'}" style="white-space:nowrap;padding:5px 12px;font-size:0.78rem;" onclick="window.__onPriceListBeatFilter('')">
          All Beats (${items.length})
        </button>
        ${beats.map(b => {
          const bCount = items.filter(i => i.beat_name === b).length;
          const isSel = priceListBeatFilter === b;
          return `
            <button class="stamp-btn small ${isSel ? '' : 'ghost'}" style="white-space:nowrap;padding:5px 12px;font-size:0.78rem;${isSel ? 'background:var(--turmeric);color:white;border-color:var(--turmeric);' : ''}" onclick="window.__onPriceListBeatFilter('${esc(b)}')">
              ${icon('pin', 12)} ${esc(b)} (${bCount})
            </button>
          `;
        }).join('')}
      </div>
    </div>

    <!-- Top Filter & Search Control Bar -->
    <div class="row-card" style="flex-wrap:wrap;gap:10px;align-items:center;padding:12px;margin-bottom:16px;">
      <div style="flex:1;min-width:160px;">
        <input type="text" id="priceListSearchInput" placeholder="Search product or beat..." value="${esc(priceListSearchQuery)}" oninput="window.__onPriceListSearch(this.value)" style="width:100%;box-sizing:border-box;">
      </div>
      <div style="flex:0 0 140px;">
        <select id="priceListBeatFilter" onchange="window.__onPriceListBeatFilter(this.value)" style="width:100%;box-sizing:border-box;">
          <option value="">All Beats (${items.length})</option>
          ${beats.map(b => `<option value="${esc(b)}" ${priceListBeatFilter===b?'selected':''}>${esc(b)}</option>`).join('')}
        </select>
      </div>
      ${isManagerPlus() ? `
        <button class="stamp-btn small" onclick="window.__openAddPriceListItemModal()">${icon('plus', 14)} Add Product</button>
      ` : ''}
    </div>

    <div class="section-label" style="display:flex;justify-content:space-between;align-items:center;">
      <span style="display:inline-flex;align-items:center;gap:6px;">${icon('label', 16)} Product Price List &amp; Beat Schemes (${filtered.length} Items)</span>
    </div>

    <!-- Mobile Card View (< 640px) -->
    <div class="mobile-only" style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px;">
      ${filtered.length ? filtered.map(item => {
        const mrp = Number(item.mrp_price || 0);
        const scheme = Number(item.scheme_price || 0);
        const savings = Math.max(0, mrp - scheme);
        const discountPct = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;
        return `
          <div class="row-card" style="flex-direction:column;align-items:stretch;padding:5px 8px;margin:0;border-radius:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <div style="flex:1;min-width:0;display:flex;align-items:center;gap:6px;overflow:hidden;">
                <b style="color:var(--ink);font-size:0.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2;">${esc(item.product_name)}</b>
                <span style="display:inline-flex;align-items:center;gap:2px;background:var(--blue-soft);color:var(--ink);border:1px solid var(--paper-line);border-radius:4px;font-size:0.6rem;font-weight:600;padding:1px 4px;flex-shrink:0;white-space:nowrap;">
                  ${icon('pin', 10)} ${esc(item.beat_name || 'General')}
                </span>
              </div>
              ${isManagerPlus() ? `
                <div style="display:flex;gap:2px;flex-shrink:0;">
                  <button class="stamp-btn small ghost" style="padding:1px 5px;font-size:0.62rem;height:20px;line-height:1;" onclick="window.__editPriceListItem('${item.id}')">✎ Edit</button>
                  <button class="stamp-btn small ghost" style="color:var(--brick);border-color:var(--brick);padding:1px 5px;font-size:0.62rem;height:20px;line-height:1;" onclick="window.__deletePriceListItem('${item.id}')">🗑</button>
                </div>
              ` : ''}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:3px;padding-top:3px;border-top:1px dashed var(--paper-line);font-family:'Roboto Mono',monospace;font-size:0.7rem;">
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:0.65rem;color:var(--ink-soft);text-decoration:line-through;">₹${mrp.toLocaleString('en-IN')}</span>
                <b style="font-size:0.75rem;color:var(--leaf);font-weight:800;">₹${scheme.toLocaleString('en-IN')} Scheme</b>
              </div>
              <span style="padding:1px 5px;border-radius:4px;background:var(--leaf-soft);color:var(--leaf);font-size:0.62rem;font-weight:700;">
                Save ₹${savings.toLocaleString('en-IN')} (${discountPct}%)
              </span>
            </div>
          </div>
        `;
      }).join('') : `
        <div class="empty" style="padding:16px;text-align:center;font-size:0.8rem;">No product prices found matching your search.</div>
      `}
    </div>

    <!-- Desktop Table View (≥ 640px) -->
    <div class="row-card desktop-only" style="flex-direction:column;padding:0;overflow:hidden;margin-bottom:20px;">
      <div style="width:100%;overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;text-align:left;font-size:0.8rem;">
          <thead>
            <tr style="background:var(--paper-line);color:var(--ink-soft);font-family:'Roboto Mono',monospace;font-size:0.72rem;text-transform:uppercase;border-bottom:1.5px solid var(--paper-line);">
              <th style="padding:6px 10px;">Product Name</th>
              <th style="padding:6px 10px;">Beat Name</th>
              <th style="padding:6px 10px;">MRP Price</th>
              <th style="padding:6px 10px;">Scheme Price</th>
              <th style="padding:6px 10px;">Savings</th>
              ${isManagerPlus() ? `<th style="padding:6px 10px;text-align:right;">Actions</th>` : ''}
            </tr>
          </thead>
          <tbody>
            ${filtered.length ? filtered.map(item => {
              const mrp = Number(item.mrp_price || 0);
              const scheme = Number(item.scheme_price || 0);
              const savings = Math.max(0, mrp - scheme);
              const discountPct = mrp > 0 ? Math.round((savings / mrp) * 100) : 0;
              return `
                <tr style="border-bottom:1px solid var(--paper-line);transition:background 0.15s ease;">
                  <td style="padding:6px 10px;">
                    <b style="color:var(--ink);font-size:0.8rem;display:block;">${esc(item.product_name)}</b>
                  </td>
                  <td style="padding:6px 10px;">
                    <span style="display:inline-flex;align-items:center;gap:3px;background:var(--blue-soft);color:var(--ink);border:1px solid var(--paper-line);border-radius:4px;font-size:0.72rem;font-weight:600;padding:2px 6px;">
                      ${icon('pin', 11)} ${esc(item.beat_name || 'General Beat')}
                    </span>
                  </td>
                  <td style="padding:6px 10px;font-family:'Roboto Mono',monospace;color:var(--ink-soft);font-size:0.78rem;text-decoration:line-through;">
                    ₹${mrp.toLocaleString('en-IN')}
                  </td>
                  <td style="padding:6px 10px;font-family:'Roboto Mono',monospace;font-weight:800;color:var(--leaf);font-size:0.8rem;">
                    ₹${scheme.toLocaleString('en-IN')}
                  </td>
                  <td style="padding:6px 10px;font-family:'Roboto Mono',monospace;">
                    <span style="display:inline-block;padding:2px 6px;border-radius:4px;background:var(--leaf-soft);color:var(--leaf);font-size:0.72rem;font-weight:700;">
                      Save ₹${savings.toLocaleString('en-IN')} (${discountPct}%)
                    </span>
                  </td>
                  ${isManagerPlus() ? `
                    <td style="padding:6px 10px;text-align:right;white-space:nowrap;">
                      <button class="stamp-btn small ghost" style="padding:2px 6px;font-size:0.72rem;margin-right:4px;" onclick="window.__editPriceListItem('${item.id}')">✎ Edit</button>
                      <button class="stamp-btn small ghost" style="color:var(--brick);border-color:var(--brick);padding:2px 6px;font-size:0.72rem;" onclick="window.__deletePriceListItem('${item.id}')">🗑 Delete</button>
                    </td>
                  ` : ''}
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="${isManagerPlus() ? 6 : 5}" style="padding:24px;text-align:center;color:var(--ink-soft);font-size:0.82rem;">
                  No product prices found matching your search.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
    <div id="priceListModalHolder"></div>
  `;
}

