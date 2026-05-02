// ─── ATO 2025-26 brackets ───────────────────────────────────────────────────
const BRACKETS = [
  { min:0,       max:67000,   label:'$0 – $67,000',        calc:'Nil'                               },
  { min:67001,   max:125000,  label:'$67,001 – $125,000',   calc:'15c per $1 over $67,000'           },
  { min:125001,  max:179285,  label:'$125,001 – $179,285',  calc:'$8,700 + 17c per $1 over $125,000' },
  { min:179286,  max:Infinity,label:'$179,286 and above',   calc:'10% of total repayment income'     }
];

function calcAnnualRepayment(income){
  if(income <= 67000)  return 0;
  if(income <= 125000) return (income - 67000) * 0.15;
  if(income <= 179285) return 8700 + (income - 125000) * 0.17;
  return income * 0.10;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const $  = id => document.getElementById(id);
const fmt  = v => '$' + Math.round(v).toLocaleString('en-AU');
const fmt2 = v => '$' + Math.abs(v).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2});
const pct  = v => v.toFixed(2) + '%';

// ─── Range sync ──────────────────────────────────────────────────────────────
function syncRange(inputId, rangeId){
  const inp = $(inputId), rng = $(rangeId);
  inp.addEventListener('input', () => { rng.value = inp.value; calc(); });
  rng.addEventListener('input', () => { inp.value = rng.value; calc(); });
}
syncRange('loanBalance','loanBalanceRange');
syncRange('grossIncome','grossIncomeRange');
['incomeGrowth','indexRate','extraRepay'].forEach(id => $(id).addEventListener('input', calc));

// ─── Collapsible ATO rates panel ─────────────────────────────────────────────
const ratesBtn = $('ratesToggle'), ratesBody = $('ratesBody');
ratesBtn.addEventListener('click', () => {
  const open = ratesBtn.getAttribute('aria-expanded') === 'true';
  ratesBtn.setAttribute('aria-expanded', String(!open));
  ratesBody.classList.toggle('collapsed', open);
});

// ─── Show/hide schedule toggle ────────────────────────────────────────────────
const amortToggle = $('amortToggle'), amortSection = $('amortSection');
let schedVisible = false;
amortToggle.addEventListener('click', () => {
  schedVisible = !schedVisible;
  amortSection.classList.toggle('hidden', !schedVisible);
  amortToggle.innerHTML = schedVisible
    ? '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg> Hide Year-by-Year Schedule'
    : '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg> Show Year-by-Year Schedule';
});

// ─── Chart init ──────────────────────────────────────────────────────────────
let balChart;
function initChart(){
  balChart = new Chart($('balanceChart').getContext('2d'), {
    type: 'bar',
    data: { labels:[], datasets:[
      { label:'Closing Balance',     data:[], backgroundColor:'rgba(230,100,20,0.72)', stack:'balance',   order:1 },
      { label:'Indexation Added',    data:[], backgroundColor:'rgba(229,57,53,0.75)',  stack:'balance',   order:2 },
      { label:'Annual Repayment',    data:[], backgroundColor:'rgba(42,157,103,.75)',  stack:'repayment', order:3 },
      { label:'Voluntary Repayment', data:[], backgroundColor:'rgba(63,127,181,.7)',   stack:'repayment', order:4 }
    ]},
    options:{
      responsive:true, maintainAspectRatio:false,
      scales:{
        x:{ stacked:true, grid:{display:false}, ticks:{font:{size:11}} },
        y:{ stacked:true, ticks:{ callback: v => '$'+(v>=1000 ? Math.round(v/1000)+'k' : v), font:{size:11} }, grid:{color:'rgba(0,0,0,.06)'} }
      },
      plugins:{
        legend:{display:false},
        tooltip:{ callbacks:{ label: c => ' '+c.dataset.label+': '+fmt(c.parsed.y) } }
      }
    }
  });
}

// ─── Schedule builder ────────────────────────────────────────────────────────
function buildSchedule(balance, income, incGrowth, indexRate, extraAnnual){
  const rows = [];
  let bal = balance, inc = income, yr = new Date().getFullYear();
  for(let i = 0; i < 60; i++){
    if(bal < 0.005) break;
    const opening    = bal;
    const indexation = opening * (indexRate / 100);
    const balAfterIdx  = opening + indexation;
    const compulsory   = Math.min(calcAnnualRepayment(inc), balAfterIdx);
    const balAfterComp = balAfterIdx - compulsory;
    const voluntary    = Math.min(extraAnnual, balAfterComp);
    const closing      = Math.max(0, balAfterComp - voluntary);
    rows.push({ n:i+1, year:yr+i, opening, indexation, compulsory, voluntary, closing });
    bal = closing;
    inc *= (1 + incGrowth / 100);
  }
  return rows;
}

// ─── Main calc ───────────────────────────────────────────────────────────────
function calc(){
  const balance   = Math.max(0, parseFloat($('loanBalance').value)  || 0);
  const income    = Math.max(0, parseFloat($('grossIncome').value)   || 0);
  const incGrowth = parseFloat($('incomeGrowth').value) || 0;
  const indexRate = parseFloat($('indexRate').value)    || 0;
  const extra     = Math.max(0, parseFloat($('extraRepay').value)    || 0);
  const showVol   = extra > 0;

  const annualRepay = calcAnnualRepayment(income);

  // Banners — use classList
  if(income <= 67000){
    $('belowThreshBanner').classList.remove('hidden');
    $('aboveThreshBanner').classList.add('hidden');
  } else {
    $('belowThreshBanner').classList.add('hidden');
    $('aboveThreshBanner').classList.remove('hidden');
  }

  // Bracket table
  const bTbody = $('bracketBody'); bTbody.innerHTML = '';
  BRACKETS.forEach(b => {
    const active = income >= b.min && income <= b.max;
    const tr = document.createElement('tr');
    if(active) tr.className = 'active-row';
    tr.innerHTML = `<td>${b.label}</td><td style="text-align:right">${b.calc}</td>`;
    bTbody.appendChild(tr);
  });

  // Schedule
  const sched      = buildSchedule(balance, income, incGrowth, indexRate, extra);
  const totalComp  = sched.reduce((s,r) => s + r.compulsory,  0);
  const totalVol   = sched.reduce((s,r) => s + r.voluntary,   0);
  const totalIndex = sched.reduce((s,r) => s + r.indexation,  0);
  const totalRepaid= totalComp + totalVol;
  const totalAll   = totalRepaid + totalIndex;

  // Summary boxes
  $('rAnnual').textContent     = annualRepay > 0 ? fmt(annualRepay) : '$0';
  $('rMonthly').textContent    = annualRepay > 0 ? fmt(annualRepay / 12) : '$0';
  $('rEffRate').textContent    = balance > 0 ? pct((annualRepay / balance) * 100) : '—';
  $('rPayoffYrs').textContent  = balance === 0 ? 'Paid Off' : sched.length + ' yr' + (sched.length !== 1 ? 's' : '');
  $('rTotalPaid').textContent  = fmt(totalRepaid);
  $('rTotalIndex').textContent = fmt(totalIndex);

  // Breakdown table
  const bdbody = $('breakdownBody'); bdbody.innerHTML = '';
  const bdRows = [
    { label:'Compulsory Repayment', annual:annualRepay,           monthly:annualRepay/12,          life:totalComp,  share:totalAll>0?totalComp/totalAll*100:0  },
    showVol ? { label:'Voluntary Repayment', annual:extra, monthly:extra/12, life:totalVol, share:totalAll>0?totalVol/totalAll*100:0 } : null,
    { label:'Indexation (est.)',    annual:balance*indexRate/100, monthly:balance*indexRate/100/12, life:totalIndex, share:totalAll>0?totalIndex/totalAll*100:0 }
  ].filter(Boolean);
  bdRows.forEach(r => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.label}</td><td>${fmt(r.annual)}</td><td>${fmt(r.monthly)}</td><td>${fmt(r.life)}</td><td>${r.share.toFixed(1)}%</td>`;
    bdbody.appendChild(tr);
  });
  const trTot = document.createElement('tr'); trTot.className = 'total-row';
  trTot.innerHTML = `<td>Total</td><td>—</td><td>—</td><td>${fmt(totalAll)}</td><td>100%</td>`;
  bdbody.appendChild(trTot);

  // Chart
  balChart.data.labels             = sched.map(r => r.year);
  balChart.data.datasets[0].data   = sched.map(r => r.closing);
  balChart.data.datasets[1].data   = sched.map(r => r.indexation);
  balChart.data.datasets[2].data   = sched.map(r => r.compulsory);
  balChart.data.datasets[3].data   = showVol ? sched.map(r => r.voluntary) : [];
  if(showVol) $('legVoluntary').classList.remove('hidden');
  else        $('legVoluntary').classList.add('hidden');
  balChart.update();

  // Year-by-year schedule table
  if(showVol) $('thVoluntary').classList.remove('hidden');
  else        $('thVoluntary').classList.add('hidden');

  const amortBody = $('amortBody'); amortBody.innerHTML = '';
  sched.forEach(r => {
    const yrTr = document.createElement('tr');
    yrTr.className = 'yr-row';
    const colspan = showVol ? 7 : 6;
    yrTr.innerHTML = `<td colspan="${colspan}">${r.year}</td>`;
    amortBody.appendChild(yrTr);

    const tr = document.createElement('tr');
    const volCell = showVol ? `<td style="color:var(--blue)">${fmt2(r.voluntary)}</td>` : '';
    const closingVal = r.closing < 0.01
      ? `<td style="color:var(--green);font-weight:700">Paid Off</td>`
      : `<td>${fmt2(r.closing)}</td>`;
    tr.innerHTML = `
      <td>${r.n}</td>
      <td>${r.year}</td>
      <td>${fmt2(r.opening)}</td>
      <td style="color:var(--red)">${fmt2(r.indexation)}</td>
      <td>${fmt2(r.compulsory)}</td>
      ${volCell}
      ${closingVal}`;
    amortBody.appendChild(tr);
  });

  window._schedData = { sched, showVol, annualRepay, totalComp, totalVol, totalIndex, totalAll };
}

// ─── Export / Snapshot ───────────────────────────────────────────────────────
$('btnSaveSnapshot').addEventListener('click', () => {
  const html = document.documentElement.outerHTML;
  const blob = new Blob([html], {type: 'text/html;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  a.download = 'hecs-calculator-' + d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + '.html';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
});

$('btnExportSummary').addEventListener('click', () => {
  const d = window._schedData || {};
  const balance = parseFloat($('loanBalance').value)||0;
  const income  = parseFloat($('grossIncome').value)||0;
  let csv = 'HECS-HELP Summary\n';
  csv += `Current Balance,$${balance.toLocaleString('en-AU')}\n`;
  csv += `Annual Income,$${income.toLocaleString('en-AU')}\n`;
  csv += `Annual Compulsory Repayment,${fmt(d.annualRepay||0)}\n`;
  csv += `Total Compulsory Repaid,${fmt(d.totalComp||0)}\n`;
  csv += `Total Voluntary Repaid,${fmt(d.totalVol||0)}\n`;
  csv += `Total Indexation Added,${fmt(d.totalIndex||0)}\n`;
  csv += `Total Cost,${fmt(d.totalAll||0)}\n`;
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'hecs-summary.csv';
  a.click();
});

$('btnExportSchedule').addEventListener('click', () => {
  const { sched = [], showVol = false } = window._schedData || {};
  const volHdr = showVol ? ',Voluntary Repayment' : '';
  let csv = `#,Year,Opening Balance,Indexation,Compulsory Repayment${volHdr},Closing Balance\n`;
  sched.forEach(r => {
    const volCell = showVol ? `,${r.voluntary.toFixed(2)}` : '';
    csv += `${r.n},${r.year},${r.opening.toFixed(2)},${r.indexation.toFixed(2)},${r.compulsory.toFixed(2)}${volCell},${r.closing.toFixed(2)}\n`;
  });
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'hecs-schedule.csv';
  a.click();
});

$('btnStartOver').addEventListener('click',function(){$('btnReset').click();window.scrollTo({top:0,behavior:'smooth'});});

$('btnReset').addEventListener('click', () => {
  // Reset collapsibles to default open state
  document.querySelectorAll('.collapsible-header').forEach(function(h){
    h.setAttribute('aria-expanded','true');
    var body=h.nextElementSibling;
    if(body&&body.classList.contains('collapsible-body'))body.classList.remove('collapsed');
  });
  $('loanBalance').value = 35000; $('loanBalanceRange').value = 35000;
  $('grossIncome').value = 75000; $('grossIncomeRange').value = 75000;
  $('incomeGrowth').value = 3;
  $('indexRate').value = 3.2;
  $('extraRepay').value = 0;
  calc();
});

initChart();
calc();
