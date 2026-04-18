/* ==========================================================
   AusCalc — HECS/HELP Repayment  /js/hecs.js
   ========================================================== */

const HECS_BRACKETS = [
  { min:0,       max:54435,   rate:0,      label:'Below $54,435' },
  { min:54435,   max:62850,   rate:0.010,  label:'$54,435 – $62,850' },
  { min:62850,   max:66620,   rate:0.020,  label:'$62,850 – $66,620' },
  { min:66620,   max:70618,   rate:0.025,  label:'$66,620 – $70,618' },
  { min:70618,   max:74855,   rate:0.030,  label:'$70,618 – $74,855' },
  { min:74855,   max:79346,   rate:0.035,  label:'$74,855 – $79,346' },
  { min:79346,   max:84107,   rate:0.040,  label:'$79,346 – $84,107' },
  { min:84107,   max:89154,   rate:0.045,  label:'$84,107 – $89,154' },
  { min:89154,   max:94503,   rate:0.050,  label:'$89,154 – $94,503' },
  { min:94503,   max:100174,  rate:0.055,  label:'$94,503 – $100,174' },
  { min:100174,  max:106185,  rate:0.060,  label:'$100,174 – $106,185' },
  { min:106185,  max:112556,  rate:0.065,  label:'$106,185 – $112,556' },
  { min:112556,  max:119309,  rate:0.070,  label:'$112,556 – $119,309' },
  { min:119309,  max:126467,  rate:0.075,  label:'$119,309 – $126,467' },
  { min:126467,  max:134056,  rate:0.080,  label:'$126,467 – $134,056' },
  { min:134056,  max:142100,  rate:0.085,  label:'$134,056 – $142,100' },
  { min:142100,  max:150626,  rate:0.090,  label:'$142,100 – $150,626' },
  { min:150626,  max:159663,  rate:0.095,  label:'$150,626 – $159,663' },
  { min:159663,  max:Infinity,rate:0.100,  label:'$159,663+' },
];

function hecsRepayment(income) {
  let total = 0;
  for (const b of HECS_BRACKETS) {
    if (income <= b.min) break;
    total += (Math.min(income, b.max) - b.min) * b.rate;
  }
  return Math.round(total);
}

function activeBracket(income) {
  for (let i = HECS_BRACKETS.length - 1; i >= 0; i--)
    if (income > HECS_BRACKETS[i].min) return i;
  return 0;
}

let hecsChart = null;
let summaryRows = [], scheduleRows = [];

function calc() {
  let bal       = nv('fBalance');
  const inc     = nv('fIncome');
  const idx     = nv('fIndexation') / 100;
  const vol     = nv('fVoluntary');
  const incGrow = nv('fIncomeGrowth') / 100;
  if (bal <= 0 || inc <= 0) return;

  const compulsory = hecsRepayment(inc);
  const effRate    = inc > 0 ? (compulsory / inc * 100).toFixed(2) : '0.00';

  let curBal = bal, curInc = inc, year = 0, totalRepaid = 0, totalIdx = 0;
  const labels = ['Start'], bArr = [Math.round(curBal)];
  scheduleRows = ['#,Year,Opening,Indexation,Compulsory,Voluntary,Closing'];
  let payoffYear = null;

  while (curBal > 0 && year < 50) {
    year++;
    const fy     = `${2025 + year - 1}–${String(26 + year - 1).padStart(2,'0')}`;
    const idxAmt = Math.round(curBal * idx);
    curBal      += idxAmt;
    const comp   = hecsRepayment(curInc);
    const total  = Math.min(curBal, comp + vol);
    curBal      -= total;
    if (curBal < 0) curBal = 0;
    totalRepaid += total; totalIdx += idxAmt;
    labels.push(`Yr ${year}`);
    bArr.push(Math.round(curBal));
    scheduleRows.push([year, fy, Math.round(curBal + total - idxAmt), idxAmt, comp, vol, Math.round(curBal)].join(','));
    if (curBal === 0 && payoffYear === null) payoffYear = year;
    curInc *= (1 + incGrow);
    if (curBal === 0) break;
  }

  summaryRows = [
    'Metric,Value',
    `Annual Repayment,${compulsory}`,
    `Monthly Estimate,${Math.round(compulsory/12)}`,
    `Effective Rate,${effRate}%`,
    `Payoff In,${payoffYear ?? '50+'} years`,
    `Total Repaid,${totalRepaid}`,
    `Total Indexation,${totalIdx}`,
  ];

  set('rAnnual',    fmt(compulsory) + '/yr');
  set('rMonthly',   fmt(compulsory / 12) + '/mo');
  set('rEffective', effRate + '%');
  set('rPayoff',    payoffYear ? `${payoffYear} year${payoffYear === 1 ? '' : 's'}` : '50+ years');
  set('rTotal',     fmt(totalRepaid));
  set('rTotalIdx',  fmt(totalIdx));

  const bRows = `
    <tr><td>Compulsory</td><td>${fmt(compulsory)}</td><td>${fmt(compulsory/12)}</td><td>${fmt(compulsory*(payoffYear||year))}</td><td>${(compulsory/totalRepaid*100).toFixed(1)}%</td></tr>
    ${vol > 0 ? `<tr><td>Voluntary</td><td>${fmt(vol)}</td><td>${fmt(vol/12)}</td><td>${fmt(vol*(payoffYear||year))}</td><td>${(vol*(payoffYear||year)/totalRepaid*100).toFixed(1)}%</td></tr>` : ''}
    <tr><td>Indexation Added</td><td>—</td><td>—</td><td style="color:#e8650a">${fmt(totalIdx)}</td><td>—</td></tr>
  `;
  html('breakdownBody', bRows);
  show('emptyState', false);
  show('resultsContent', true);
  drawChart(labels, bArr);
  renderThresholdTable(inc);
}

function drawChart(labels, bArr) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('hecsChart');
  if (!canvas) return;
  if (hecsChart) { hecsChart.destroy(); hecsChart = null; }
  const opts = JSON.parse(JSON.stringify(chartDefaults));
  opts.plugins.tooltip.callbacks = { label: i => ` ${i.dataset.label}: ${fmt(i.parsed.y)}` };
  hecsChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{ label: 'Closing Balance', data: bArr, borderColor: 'rgba(232,101,10,1)', backgroundColor: 'rgba(232,101,10,0.35)', fill: 'origin', tension: 0.4, pointRadius: 2, pointHoverRadius: 5, borderWidth: 2.5 }] },
    options: opts,
  });
}

function renderThresholdTable(income) {
  const active = activeBracket(income);
  const rows = HECS_BRACKETS.map((b, i) => {
    const cls = i === active ? ' class="milestone-row"' : '';
    const rateStr = b.rate === 0 ? 'Nil' : (b.rate * 100).toFixed(1) + '% of income above ' + fmt(b.min);
    return `<tr${cls}><td>${b.label}</td><td>${rateStr}</td></tr>`;
  }).join('');
  html('thresholdBody', rows);
}

document.addEventListener('DOMContentLoaded', () => {
  initCollapsibles();
  ['fBalance','fIncome','fIndexation','fVoluntary','fIncomeGrowth'].forEach(id =>
    document.getElementById(id)?.addEventListener('input', calc));
  const balNum = document.getElementById('fBalance'), balRng = document.getElementById('fBalanceRange');
  balRng?.addEventListener('input', () => { balNum.value = balRng.value; calc(); });
  balNum?.addEventListener('input', () => { if (+balNum.value <= 200000) balRng.value = balNum.value; });
  const incNum = document.getElementById('fIncome'), incRng = document.getElementById('fIncomeRange');
  incRng?.addEventListener('input', () => { incNum.value = incRng.value; calc(); });
  incNum?.addEventListener('input', () => { if (+incNum.value <= 300000) incRng.value = incNum.value; });
  document.getElementById('btnExportSummary')?.addEventListener('click', () => dlCSV(summaryRows, 'hecs-summary.csv'));
  document.getElementById('btnExportSchedule')?.addEventListener('click', () => dlCSV(scheduleRows, 'hecs-schedule.csv'));
  document.getElementById('amortToggle')?.addEventListener('click', function() {
    const sec = document.getElementById('amortSection');
    const open = sec.style.display === 'block';
    sec.style.display = open ? 'none' : 'block';
    this.textContent = open ? '▼ Show Year-by-Year Schedule' : '▲ Hide Year-by-Year Schedule';
  });
  calc();
});
