/* ==========================================================
   AusCalc — Superannuation Projector  /js/super-projector.js
   ========================================================== */

let superChart = null;
let summaryRows = [], scheduleRows = [];

/* ── NCC bring-forward caps (2025-26 ATO) ── */
function nccMaxCap(projBal, age) {
  if (age >= 75) return 120000;
  if (projBal >= 1900000) return 0;
  if (projBal >= 1780000) return 120000;
  if (projBal >= 1660000) return 240000;
  return 360000;
}

function validateNCC(projBal, ncc, age) {
  const el = document.getElementById('fNCCStatus');
  if (!el || ncc <= 0) { if (el) el.style.display = 'none'; return; }
  const cap = nccMaxCap(projBal, age);
  const isOver = ncc > cap;
  const bFmt = Math.round(projBal).toLocaleString('en-AU');
  const cFmt = cap.toLocaleString('en-AU');
  let msg;
  if (cap === 0)              msg = `At age ${age} your projected balance $${bFmt} reaches $1.9m — NCCs not permitted.`;
  else if (isOver)            msg = `$${ncc.toLocaleString('en-AU')} exceeds bring-forward cap of $${cFmt} (projected balance $${bFmt} at age ${age}). Only $${cFmt} will be applied.`;
  else if (age >= 75)         msg = `Within annual cap $${cFmt}. No bring-forward at age 75.`;
  else if (projBal >= 1780000) msg = `Within annual cap $${cFmt}. Projected balance limits bring-forward eligibility.`;
  else if (ncc > 240000)      msg = `3-year bring-forward ($360k cap). Projected balance at age ${age}: $${bFmt}.`;
  else if (ncc > 120000)      msg = `Using ${cap === 360000 ? '3-year' : '2-year'} bring-forward. Cap $${cFmt}. Projected balance $${bFmt}.`;
  else                        msg = `Within standard annual cap ($120,000). Projected balance at age ${age}: $${bFmt}.`;
  el.textContent = msg;
  el.style.display = 'block';
  const isErr = cap === 0 || isOver;
  el.style.background = isErr ? '#2e1a1a' : '#1a2e22';
  el.style.color       = isErr ? '#f88'   : '#6ddc9a';
  el.style.border      = `1px solid ${isErr ? '#7b3030' : '#2a7a4a'}`;
}

function calc() {
  const ca  = nv('fCurrentAge'), ra = nv('fRetireAge');
  const sal = nv('fSalary'),     sr = nv('fSuperRate') / 100;
  const sg  = nv('fSalGrowth')  / 100;
  const bal0 = nv('fCurrentBalance');
  const rr  = (nv('fReturnRate')   - nv('fFee')) / 100;
  const rrr = (nv('fReturnRetire') - nv('fFee')) / 100;
  const ct  = nv('fTax') / 100;
  const inf = nv('fInflation') / 100;
  const dw  = nv('fDrawdown');
  const le  = nv('fLifeExpect');
  const volSw = document.getElementById('volSwitch');
  const vf  = rv('volFreq');
  const va  = volSw?.checked ? nv('fVolContrib') : 0;
  const im  = rv('inflMode');
  const nccSw = document.getElementById('nccSwitch');
  const ncc = nccSw?.checked ? nv('fNCC') : 0;
  const nccAge = parseInt(document.getElementById('fNCCAge')?.value) || ca;

  if (ca < 15 || ra <= ca) return;
  const ytr = Math.floor(ra - ca);
  const av  = vf === 'monthly' ? va * 12 : va;

  let bal = bal0, cs = sal;
  let tEmp = 0, tVol = 0, tGrw = 0, cum = 0;
  const labels = [`Age ${ca}`], bArr = [Math.round(bal)], dArr = [null], cArr = [0];
  let rows = '', lasts = ra;
  scheduleRows = ['Age,Phase,Salary,SGC After Tax,Voluntary After Tax,Growth,Closing Balance'];
  summaryRows  = ['Metric,Value'];

  let nccApplied = false;
  if (ncc > 0 && nccAge === ca && nccAge < ra) {
    const cap0 = nccMaxCap(bal, nccAge);
    const amt0 = Math.min(ncc, cap0);
    if (amt0 > 0) { bal += amt0; cum += amt0; validateNCC(bal - amt0, ncc, nccAge); nccApplied = true; }
  }

  for (let y = 0; y < ytr; y++) {
    const age = ca + y + 1;
    if (ncc > 0 && !nccApplied && age === nccAge && nccAge < ra) {
      const cap = nccMaxCap(bal, nccAge);
      const amt = Math.min(ncc, cap);
      if (amt > 0) { bal += amt; cum += amt; validateNCC(bal - amt, ncc, nccAge); nccApplied = true; }
    }
    const sgn = cs * sr * (1 - ct);
    const vn  = av * (1 - ct);
    const grw = (bal + sgn / 2 + vn / 2) * rr;
    bal += sgn + vn + grw;
    tEmp += sgn; tVol += vn; tGrw += grw; cum += sgn + vn;
    labels.push(`Age ${age}`);
    bArr.push(Math.round(bal)); dArr.push(null); cArr.push(Math.round(cum));
    rows += `<tr><td>${age}</td><td>${fmt(cs)}</td><td>${fmt(sgn)}</td><td>${av > 0 ? fmt(vn) : '—'}</td><td>${fmt(grw)}</td><td><strong>${fmt(bal)}</strong></td></tr>`;
    scheduleRows.push([age,'Accumulation',Math.round(cs),Math.round(sgn),Math.round(vn),Math.round(grw),Math.round(bal)].join(','));
    cs *= (1 + sg);
  }

  const retBal = bal;
  const dispBal = im === 'real' ? retBal / Math.pow(1 + inf, ytr) : retBal;
  rows += `<tr class="phase-row"><td colspan="6">— Retirement Phase —</td></tr>`;
  let rb = retBal;
  const ry = Math.floor(le - ra);
  for (let y2 = 0; y2 < ry; y2++) {
    const ar = ra + y2 + 1;
    const gr2 = rb * rrr;
    const ndAdj = dw * Math.pow(1 + inf, y2);
    rb = rb + gr2 - ndAdj;
    if (rb < 0) rb = 0;
    labels.push(`Age ${ar}`);
    bArr.push(null); dArr.push(Math.round(rb)); cArr.push(null);
    if (rb > 0) lasts = ar;
    rows += `<tr><td>${ar}</td><td>—</td><td>—</td><td>—</td><td>${fmt(gr2)}</td><td><strong>${fmt(rb)}</strong></td></tr>`;
    scheduleRows.push([ar,'Retirement',0,0,0,Math.round(gr2),Math.round(rb)].join(','));
  }

  // Summary rows for CSV
  summaryRows.push(
    `Balance at Retirement,${Math.round(retBal)}`,
    `Balance at Retirement (${im === 'real' ? "Today's $" : "Nominal"}),${Math.round(dispBal)}`,
    `Total Employer Contributions,${Math.round(tEmp)}`,
    `Total Voluntary Contributions,${Math.round(tVol)}`,
    `Total Investment Growth,${Math.round(tGrw)}`,
    `Annual Drawdown,${dw}`,
    `Monthly Income,${Math.round(dw / 12)}`,
    `Super Lasts Until,${rb > 0 ? `Age ${le}` : `Age ${lasts}`}`
  );

  // Update result boxes
  set('rBalance',    fmt(dispBal));
  set('rBalanceSub', im === 'real' ? "In today's dollars" : "Nominal future value");
  set('rMonthlyIncome', fmt(dw / 12) + '/mo');
  set('rDrawdownAmt',   fmt(dw) + '/yr');
  set('rEmployer',  fmt(tEmp));
  set('rVoluntary', fmt(tVol));
  const dispGrw = im === 'real' ? tGrw / Math.pow(1 + inf, ytr) : tGrw;
  set('rGrowth',    fmt(dispGrw));
  set('rLastsUntil', rb > 0 ? `Age ${le}+` : `Age ${lasts}`);
  set('rLastsUntilSub', rb > 0 ? 'Outlasts life expectancy ✓' : 'Depleted before life expectancy');
  set('rDrawdownInflSub', `Adjusts ${(inf * 100).toFixed(1)}%/yr with inflation`);
  show('volBox', tVol > 0);
  show('retireYears', true);
  set('retireYearsText', `${ytr} ${ytr === 1 ? 'year' : 'years'} to retirement`);

  html('amortBody', rows);
  show('emptyState', false);
  show('resultsContent', true);

  // Deflate chart arrays for real mode
  let cB = bArr, cD = dArr, cC = cArr;
  if (im === 'real' && inf > 0) {
    cB = bArr.map((v, i) => v == null ? null : Math.round(v / Math.pow(1 + inf, i)));
    cC = cArr.map((v, i) => v == null ? null : Math.round(v / Math.pow(1 + inf, i)));
    cD = dArr.map((v, i) => v == null ? null : Math.round(v / Math.pow(1 + inf, i)));
  }
  if (!nccApplied && ncc > 0) validateNCC(nv('fCurrentBalance'), ncc, nccAge);

  drawChart(labels, cB, cD, cC);
}

function drawChart(labels, bArr, dArr, cArr) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('superChart');
  if (!canvas) return;
  if (superChart) { superChart.destroy(); superChart = null; }
  const opts = JSON.parse(JSON.stringify(chartDefaults));
  opts.plugins.tooltip.callbacks = {
    label: item => ` ${item.dataset.label}: ${fmt(item.parsed.y)}`
  };
  superChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Cumulative Contributions', data: cArr, borderColor: 'rgba(63,127,181,1)',  backgroundColor: 'rgba(63,127,181,0.55)', fill: 'origin', tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2, order: 2 },
        { label: 'Super Balance',            data: bArr, borderColor: 'rgba(232,168,56,1)',  backgroundColor: 'rgba(232,168,56,0.55)', fill: '-1',     tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5, order: 1 },
        { label: 'Retirement Balance',       data: dArr, borderColor: 'rgba(42,157,103,1)',  backgroundColor: 'rgba(42,157,103,0.55)', fill: 'origin', tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5, order: 1 },
      ]
    },
    options: opts,
  });
}

function toggleVol() {
  const on = document.getElementById('volSwitch')?.checked;
  show('volOnFields', on);
  if (on) {
    const f = rv('volFreq');
    set('volContribLabel', f === 'monthly' ? 'Monthly Voluntary Contribution' : 'Annual Voluntary Contribution');
  }
}

function toggleNCC() {
  show('nccFields', document.getElementById('nccSwitch')?.checked);
}

function toggleInflMode() {
  const real = rv('inflMode') === 'real';
  set('inflModeHint', real
    ? "Showing values in today's dollars. Enter an inflation rate to deflate future amounts."
    : "Nominal shows future dollar amounts at face value. Switch to Real to adjust for inflation.");
}

function resetAll() {
  const d = { fCurrentAge:35, fRetireAge:67, fSalary:90000, fSuperRate:12, fSalGrowth:2.5,
    fCurrentBalance:75000, fVolContrib:200, fReturnRate:7.5, fReturnRetire:5.5,
    fFee:0.60, fTax:15, fInflation:2.5, fDrawdown:65000, fLifeExpect:87, fNCC:0, fNCCAge:35 };
  Object.entries(d).forEach(([k, v]) => { const el = document.getElementById(k); if (el) el.value = v; });
  ['volSwitch','nccSwitch'].forEach(id => { const el = document.getElementById(id); if (el) el.checked = false; });
  const nom = document.getElementById('inflNominal'); if (nom) nom.checked = true;
  const vm  = document.getElementById('volMonthly');  if (vm)  vm.checked  = true;
  const sr  = document.getElementById('fSalaryRange');       if (sr) sr.value = 90000;
  const br  = document.getElementById('fCurrentBalanceRange'); if (br) br.value = 75000;
  toggleVol(); toggleNCC(); toggleInflMode(); calc();
}

/* ── Wire inputs ── */
document.addEventListener('DOMContentLoaded', () => {
  initCollapsibles();

  ['fCurrentAge','fRetireAge','fSalary','fSuperRate','fSalGrowth','fCurrentBalance',
   'fVolContrib','fReturnRate','fReturnRetire','fFee','fTax','fInflation',
   'fDrawdown','fLifeExpect','fNCC','fNCCAge'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calc);
  });

  // Salary range sync
  const salNum = document.getElementById('fSalary'), salRng = document.getElementById('fSalaryRange');
  salRng?.addEventListener('input', () => { salNum.value = salRng.value; calc(); });
  salNum?.addEventListener('input', () => { if (+salNum.value <= 300000) salRng.value = salNum.value; });

  // Balance range sync
  const balNum = document.getElementById('fCurrentBalance'), balRng = document.getElementById('fCurrentBalanceRange');
  balRng?.addEventListener('input', () => { balNum.value = balRng.value; calc(); });
  balNum?.addEventListener('input', () => { if (+balNum.value <= 1000000) balRng.value = balNum.value; });

  ['volMonthly','volAnnual'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', () => { toggleVol(); calc(); }));
  ['inflNominal','inflReal'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', () => { toggleInflMode(); calc(); }));

  document.getElementById('volSwitch')?.addEventListener('change', () => { toggleVol(); calc(); });
  document.getElementById('nccSwitch')?.addEventListener('change', () => { toggleNCC(); calc(); });
  document.getElementById('btnReset')?.addEventListener('click', resetAll);
  document.getElementById('btnStartOver')?.addEventListener('click', resetAll);
  document.getElementById('btnExportSummary')?.addEventListener('click', () => dlCSV(summaryRows, 'super-summary.csv'));
  document.getElementById('btnExportSchedule')?.addEventListener('click', () => dlCSV(scheduleRows, 'super-schedule.csv'));

  document.getElementById('amortToggle')?.addEventListener('click', function() {
    const sec = document.getElementById('amortSection');
    const open = sec.style.display === 'block';
    sec.style.display = open ? 'none' : 'block';
    this.textContent = open ? '▼ Show Year-by-Year Schedule' : '▲ Hide Year-by-Year Schedule';
  });

  document.getElementById('btnSaveSnapshot')?.addEventListener('click', () => {
    const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const d = new Date();
    a.download = `super-snapshot-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.html`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });

  toggleVol(); toggleNCC(); toggleInflMode(); calc();
});
