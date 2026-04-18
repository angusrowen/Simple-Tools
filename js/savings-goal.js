/* ==========================================================
   AusCalc — Savings Goal  /js/savings-goal.js
   ========================================================== */

let savingsChart = null;
let scheduleRows = [], summaryRows = [];

const PF = { weekly: 52, fortnightly: 26, monthly: 12 };

function calc() {
  const goal     = nv('fGoal');
  const current  = nv('fCurrent');
  const contrib  = nv('fContrib');
  const freq     = sv('fFreq') || 'monthly';
  const rate     = nv('fRate') / 100;
  const mode     = sv('fMode') || 'time';        // 'time' or 'contrib'
  const inf      = nv('fInflation') / 100;
  const maxYrs   = nv('fMaxYears') || 30;

  if (goal <= 0) return;

  const periods = PF[freq];
  const rPer    = rate / periods;

  // Lump sums: parse textarea
  const lumpSums = {};
  const lsText = document.getElementById('fLumpSums')?.value || '';
  lsText.split('\n').forEach(line => {
    const [y, a] = line.split(',').map(s => parseFloat(s.trim()));
    if (!isNaN(y) && !isNaN(a) && y > 0 && a > 0) lumpSums[Math.round(y)] = a;
  });

  let bal = current, totalDeposited = current, totalInterest = 0, totalLumps = 0;
  let periodNum = 0, yearNum = 0, reached = false, reachYear = null, reachPeriod = null;
  let rows = '', labels = ['Start'], bArr = [Math.round(bal)], cArr = [Math.round(current)], intArr = [0];
  scheduleRows = ['Year,Opening,Contributions,Lump Sum,Interest,Closing,Real Value'];

  const startDate = new Date(sv('fStartDate') || new Date().toISOString().slice(0,10));
  let goalDate = null;

  while (yearNum < maxYrs && !reached) {
    yearNum++;
    const yearOpenBal = bal;
    let yearContrib = 0, yearInt = 0, yearLump = lumpSums[yearNum] || 0;

    for (let p = 0; p < periods; p++) {
      bal += contrib;
      yearContrib += contrib;
      const intAmt = bal * rPer;
      bal += intAmt;
      yearInt += intAmt;
      periodNum++;
      if (!reached && bal >= goal) {
        reached = true;
        reachYear   = yearNum;
        reachPeriod = periodNum;
        const d = new Date(startDate);
        const addMonths = Math.ceil(periodNum * 12 / periods);
        d.setMonth(d.getMonth() + addMonths);
        goalDate = d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
      }
    }
    bal += yearLump;
    totalDeposited += yearContrib + yearLump;
    totalInterest  += yearInt;
    totalLumps     += yearLump;
    const realVal   = inf > 0 ? Math.round(bal / Math.pow(1 + inf, yearNum)) : Math.round(bal);
    labels.push(`Yr ${yearNum}`);
    bArr.push(Math.round(bal));
    cArr.push(Math.round(totalDeposited));
    intArr.push(Math.round(totalInterest));
    rows += `<tr${reached && reachYear === yearNum ? ' class="milestone-row"' : ''}><td>${yearNum}</td><td>${fmt(yearOpenBal)}</td><td>${fmt(yearContrib)}</td><td>${yearLump > 0 ? fmt(yearLump) : '—'}</td><td>${fmt(yearInt)}</td><td><strong>${fmt(bal)}</strong></td><td>${fmt(realVal)}</td></tr>`;
    scheduleRows.push([yearNum, Math.round(yearOpenBal), Math.round(yearContrib), Math.round(yearLump), Math.round(yearInt), Math.round(bal), realVal].join(','));
    if (bal >= goal && reached) break;
  }

  const finalReal = inf > 0 ? Math.round(bal / Math.pow(1 + inf, yearNum)) : Math.round(bal);
  summaryRows = [
    'Metric,Value',
    `Goal,${goal}`,
    `Time to Goal,${reachYear ? reachYear + ' years' : '50+ years'}`,
    `Total Deposited,${Math.round(totalDeposited)}`,
    `Interest Earned,${Math.round(totalInterest)}`,
    `Total Lump Sums,${Math.round(totalLumps)}`,
    `Goal Date,${goalDate ?? '—'}`,
  ];

  const pct = Math.min(100, Math.round(current / goal * 100));
  set('rTime',       reachYear ? `${reachYear} yr${reachYear === 1 ? '' : 's'}` : `${maxYrs}+ yrs`);
  set('rDeposited',  fmt(totalDeposited));
  set('rInterest',   fmt(totalInterest));
  set('rLumps',      totalLumps > 0 ? fmt(totalLumps) : '—');
  set('rRealVal',    fmt(finalReal));
  set('rGoalDate',   goalDate ?? '—');

  // Progress bar
  const pb = document.getElementById('progressBar');
  if (pb) { pb.style.width = pct + '%'; pb.style.background = 'var(--accent)'; }
  set('progressPct',  pct + '%');
  set('progressSaved', fmt(current) + ' saved');
  set('progressGoal',  'Goal: ' + fmt(goal));

  // Breakdown table
  const brkRows = [
    ['Initial Savings',  current,       current * periods, current],
    ['Regular Contributions', contrib * periods, contrib * periods, contrib * periods * (reachYear || yearNum)],
    ...(totalLumps > 0 ? [['Lump Sums', '—', '—', fmt(totalLumps)]] : []),
    ['Interest Earned', '—', '—', fmt(totalInterest)],
  ].map(([l, per, annual, total]) =>
    `<tr><td>${l}</td><td>${typeof per === 'string' ? per : fmt(per)}</td><td>${typeof annual === 'string' ? annual : fmt(annual)}</td><td>${typeof total === 'string' ? total : fmt(total)}</td><td>${typeof total === 'number' ? (total / goal * 100).toFixed(1) + '%' : '—'}</td></tr>`
  ).join('');
  html('breakdownBody', brkRows);
  html('amortBody', rows);
  show('emptyState', false);
  show('resultsContent', true);
  drawChart(labels, bArr, cArr, intArr, goal);
}

function drawChart(labels, bArr, cArr, intArr, goal) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('savingsChart');
  if (!canvas) return;
  if (savingsChart) { savingsChart.destroy(); savingsChart = null; }
  const opts = JSON.parse(JSON.stringify(chartDefaults));
  opts.plugins.tooltip.callbacks = { label: i => ` ${i.dataset.label}: ${fmt(i.parsed.y)}` };
  opts.plugins.annotation = undefined;
  savingsChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Savings Balance',         data: bArr,   borderColor: 'rgba(182,134,44,1)',  backgroundColor: 'rgba(182,134,44,0.55)', fill: 'origin', tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5 },
        { label: 'Total Deposited',         data: cArr,   borderColor: 'rgba(63,127,181,0.9)',backgroundColor: 'rgba(63,127,181,0.3)',  fill: 'origin', tension: 0.35, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
        { label: 'Cumulative Interest',     data: intArr, borderColor: 'rgba(42,157,103,0.9)',backgroundColor: 'rgba(42,157,103,0.0)',  fill: false,    tension: 0.35, pointRadius: 0, pointHoverRadius: 4, borderWidth: 1.5, borderDash: [4,3] },
        { label: 'Goal',                    data: labels.map(() => goal), borderColor: 'rgba(232,100,10,0.6)', backgroundColor: 'transparent', fill: false, pointRadius: 0, borderWidth: 1.5, borderDash: [6,4] },
      ]
    },
    options: opts,
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCollapsibles();
  ['fGoal','fCurrent','fContrib','fRate','fInflation','fMaxYears'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', calc));
  document.getElementById('fFreq')?.addEventListener('change', calc);
  document.getElementById('fLumpSums')?.addEventListener('input', calc);

  // Range syncs
  [['fGoal','fGoalRange',200000],['fCurrent','fCurrentRange',50000],['fContrib','fContribRange',5000]].forEach(([nId, rId, max]) => {
    const n = document.getElementById(nId), r = document.getElementById(rId);
    r?.addEventListener('input', () => { n.value = r.value; calc(); });
    n?.addEventListener('input', () => { if (+n.value <= max) r.value = n.value; });
  });

  document.getElementById('amortToggle')?.addEventListener('click', function() {
    const s = document.getElementById('amortSection');
    const open = s.style.display === 'block';
    s.style.display = open ? 'none' : 'block';
    this.textContent = open ? '▼ Show Year-by-Year Schedule' : '▲ Hide Year-by-Year Schedule';
  });
  document.getElementById('btnExportSchedule')?.addEventListener('click', () => dlCSV(scheduleRows, 'savings-schedule.csv'));
  document.getElementById('btnExportSummary')?.addEventListener('click',  () => dlCSV(summaryRows,  'savings-summary.csv'));
  calc();
});
