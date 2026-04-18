/* ==========================================================
   AusCalc — Offset Account Savings  /js/offset.js
   ========================================================== */

let offsetChart = null;
let scheduleRows = [], summaryRows = [];

const PF = { weekly: 52, fortnightly: 26, monthly: 12 };

function pmt(rate, n, pv) {
  if (rate === 0) return pv / n;
  return pv * rate / (1 - Math.pow(1 + rate, -n));
}

function amortise(loan, annualRate, termYrs, freq, offsetBal, monthlyOffsetContrib) {
  const periods = PF[freq];
  const r       = annualRate / 100 / periods;
  const n       = termYrs * periods;
  const repay   = pmt(r, n, loan); // repayment always on full loan (offset reduces interest only)

  let bal = loan, offset = offsetBal;
  let totalInt = 0, totalPrinc = 0;
  let labels = ['Start'], bArr = [Math.round(loan)];
  const rows = [];
  let payoffPeriod = null;

  for (let p = 1; p <= n; p++) {
    const effBal = Math.max(0, bal - offset);
    const intAmt = effBal * r;
    const princAmt = Math.min(bal, repay - intAmt);
    bal -= princAmt;
    if (bal < 0) bal = 0;
    totalInt   += intAmt;
    totalPrinc += princAmt;
    // Offset grows monthly regardless of freq
    const monthsPerPeriod = 12 / periods;
    offset += monthlyOffsetContrib * monthsPerPeriod;

    if (p % periods === 0 || bal < 0.01) {
      const yr = Math.ceil(p / periods);
      labels.push(`Yr ${yr}`);
      bArr.push(Math.round(Math.max(0, bal)));
      rows.push({ yr, bal: Math.round(Math.max(0, bal)), int: Math.round(intAmt), princ: Math.round(princAmt) });
      if (bal < 0.01 && payoffPeriod === null) payoffPeriod = p;
    }
    if (bal < 0.01) break;
  }
  return { totalInt, totalPrinc, labels, bArr, rows, repay, payoffPeriod };
}

function calc() {
  const loan          = nv('fLoan');
  const rate          = nv('fRate');
  const term          = nv('fTerm');
  const freq          = sv('fFreq') || 'monthly';
  const offsetBal     = nv('fOffset');
  const offsetContrib = nv('fOffsetContrib');

  if (loan <= 0 || rate <= 0 || term <= 0) return;

  const periods = PF[freq];
  const startDate = new Date(sv('fStartDate') || new Date().toISOString().slice(0,10));

  // With offset
  const wo = amortise(loan, rate, term, freq, offsetBal, offsetContrib);
  // Without offset (baseline)
  const no = amortise(loan, rate, term, freq, 0, 0);

  const intSaved  = no.totalInt - wo.totalInt;
  const effBal    = Math.max(0, loan - offsetBal);

  // Payoff dates
  const woPayoffMonths = Math.ceil((wo.payoffPeriod || term * periods) * 12 / periods);
  const noPayoffMonths = term * 12;
  const monthsSaved    = noPayoffMonths - woPayoffMonths;

  const woDate = new Date(startDate); woDate.setMonth(woDate.getMonth() + woPayoffMonths);
  const noDate = new Date(startDate); noDate.setMonth(noDate.getMonth() + noPayoffMonths);
  const fmtDate = d => d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  summaryRows = [
    'Metric,With Offset,Without Offset,You Save',
    `Monthly Repayment,${Math.round(wo.repay)},${Math.round(no.repay)},—`,
    `Total Interest,${Math.round(wo.totalInt)},${Math.round(no.totalInt)},${Math.round(intSaved)}`,
    `Payoff Date,${fmtDate(woDate)},${fmtDate(noDate)},${monthsSaved} months`,
  ];

  const intPerPeriod = (effBal * rate / 100 / periods);
  const intSavedMo   = offsetBal * rate / 100 / 12;

  set('rRepayment',      fmt(wo.repay) + '/mo');
  set('rEffBal',         fmt(effBal));
  set('rIntSavedMo',     fmt(intSavedMo) + '/mo');
  set('rIntWith',        fmt(wo.totalInt));
  set('rIntWithout',     fmt(no.totalInt));
  set('rIntSaved',       fmt(intSaved));
  set('rTimeSaved',      monthsSaved > 0 ? `${Math.floor(monthsSaved/12)}y ${monthsSaved%12}m` : '—');

  // Comparison table
  const cmpRows = [
    ['Monthly Repayment', fmt(wo.repay),    fmt(no.repay),    '—'],
    ['Total Interest',    fmt(wo.totalInt), fmt(no.totalInt), `<span style="color:var(--accent)">${fmt(intSaved)}</span>`],
    ['Loan Term',         fmtDate(woDate),  fmtDate(noDate),  monthsSaved > 0 ? `${Math.floor(monthsSaved/12)}y ${monthsSaved%12}m earlier` : '—'],
  ].map(([l,a,b,c]) => `<tr><td>${l}</td><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('');
  html('cmpBody', cmpRows);

  // Amort table (with offset)
  const amortHtml = wo.rows.map(r =>
    `<tr${r.bal === 0 ? ' class="milestone-row"' : ''}><td>${r.yr}</td><td>${fmt(r.int)}</td><td>${fmt(r.princ)}</td><td><strong>${fmt(r.bal)}</strong></td></tr>`
  ).join('');
  html('amortBody', amortHtml);

  scheduleRows = ['Year,Interest (With Offset),Principal,Closing Balance'];
  wo.rows.forEach(r => scheduleRows.push([r.yr, r.int, r.princ, r.bal].join(',')));

  show('emptyState', false);
  show('resultsContent', true);
  drawChart(wo.labels, wo.bArr, no.bArr);
}

function drawChart(labels, woBArr, noBArr) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('offsetChart');
  if (!canvas) return;
  if (offsetChart) { offsetChart.destroy(); offsetChart = null; }
  const opts = JSON.parse(JSON.stringify(chartDefaults));
  opts.plugins.tooltip.callbacks = { label: i => ` ${i.dataset.label}: ${fmt(i.parsed.y)}` };
  offsetChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'With Offset',    data: woBArr, borderColor: 'rgba(108,91,142,1)',  backgroundColor: 'rgba(108,91,142,0.4)', fill: 'origin', tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5 },
        { label: 'Without Offset', data: noBArr, borderColor: 'rgba(192,57,43,0.7)', backgroundColor: 'rgba(192,57,43,0.15)', fill: 'origin', tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2, borderDash: [5,4] },
      ]
    },
    options: opts,
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCollapsibles();
  ['fLoan','fRate','fTerm','fOffset','fOffsetContrib'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', calc));
  document.getElementById('fFreq')?.addEventListener('change', calc);

  const ln = document.getElementById('fLoan'), lr = document.getElementById('fLoanRange');
  lr?.addEventListener('input', () => { ln.value = lr.value; calc(); });
  ln?.addEventListener('input', () => { if (+ln.value <= 3000000) lr.value = ln.value; });
  const on = document.getElementById('fOffset'), or_ = document.getElementById('fOffsetRange');
  or_?.addEventListener('input', () => { on.value = or_.value; calc(); });
  on?.addEventListener('input', () => { if (+on.value <= 300000) or_.value = on.value; });

  document.getElementById('amortToggle')?.addEventListener('click', function() {
    const s = document.getElementById('amortSection');
    const open = s.style.display === 'block';
    s.style.display = open ? 'none' : 'block';
    this.textContent = open ? '▼ Show Year-by-Year Schedule' : '▲ Hide Year-by-Year Schedule';
  });
  document.getElementById('btnExportSchedule')?.addEventListener('click', () => dlCSV(scheduleRows, 'offset-schedule.csv'));
  document.getElementById('btnExportSummary')?.addEventListener('click',  () => dlCSV(summaryRows,  'offset-summary.csv'));
  calc();
});
