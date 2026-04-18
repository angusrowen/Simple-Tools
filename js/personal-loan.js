/* ==========================================================
   AusCalc — Personal Loan Repayment  /js/personal-loan.js
   ========================================================== */

let loanChart = null;
let scheduleRows = [], summaryRows = [];
const PF = { weekly:52, fortnightly:26, monthly:12 };

function pmt(rate, n, pv, balloon = 0) {
  if (rate === 0) return (pv - balloon) / n;
  return (pv - balloon * Math.pow(1+rate,-n)) * rate / (1 - Math.pow(1+rate,-n));
}

function calc() {
  const loan    = nv('fLoan');
  const rate    = nv('fRate');
  const term    = nv('fTerm');
  const freq    = sv('fFreq') || 'monthly';
  const balloon = nv('fBalloon');
  const estFee  = nv('fEstFee');
  const mFee    = nv('fMonthlyFee');
  const extra   = nv('fExtra');
  if (loan <= 0 || rate <= 0 || term <= 0) return;

  const periods   = PF[freq];
  const r         = rate / 100 / periods;
  const n         = term * periods;
  const baseRepay = pmt(r, n, loan, balloon);

  let bal = loan, totalInt = 0, totalFees = estFee;
  let rows = '', periodNum = 0;
  let bArr = [Math.round(loan)], iArr = [0], labels = ['Start'];
  scheduleRows = ['#,Period,Opening,Interest,Principal,Extra,Closing'];

  while (bal > 0.01 && periodNum < n + 600) {
    periodNum++;
    const intAmt   = bal * r;
    let princAmt   = Math.min(bal - (periodNum === n ? balloon : 0), Math.max(0, baseRepay - intAmt));
    let extraAmt   = Math.min(extra / periods, Math.max(0, bal - princAmt - (periodNum === n ? balloon : 0)));
    bal           -= (princAmt + extraAmt);
    if (bal < 0) { extraAmt += bal; bal = 0; }
    totalInt  += intAmt;
    totalFees += mFee;

    if (periodNum % periods === 0 || bal < 0.01) {
      const yr = Math.ceil(periodNum / periods);
      const opening = bal + princAmt + extraAmt + intAmt;
      rows += `<tr${bal < 0.01 ? ' class="milestone-row"' : ''}><td>${yr}</td><td>${fmt(opening)}</td><td>${fmt(intAmt)}</td><td>${fmt(princAmt)}</td><td>${extraAmt > 0 ? fmt(extraAmt) : '—'}</td><td><strong>${fmt(Math.max(0,bal))}</strong></td></tr>`;
      scheduleRows.push([yr,`Year ${yr}`,Math.round(opening),Math.round(intAmt),Math.round(princAmt),Math.round(extraAmt),Math.round(Math.max(0,bal))].join(','));
      bArr.push(Math.round(Math.max(0,bal)));
      iArr.push(Math.round(totalInt));
      labels.push(`Yr ${yr}`);
    }
    if (bal <= 0.01) break;
  }

  summaryRows = ['Metric,Value',`Loan Amount,${loan}`,`Repayment,${Math.round(baseRepay)}`,`Total Interest,${Math.round(totalInt)}`,`Total Fees,${Math.round(totalFees)}`,`Total Cost,${Math.round(loan+totalInt+totalFees)}`];
  const perLabel = freq === 'monthly' ? '/mo' : freq === 'weekly' ? '/wk' : '/fn';
  set('rRepayment',  fmt(baseRepay) + perLabel);
  set('rTotalRepay', fmt(loan + totalInt + totalFees));
  set('rTotalInt',   fmt(totalInt));
  set('rCompRate',   rate.toFixed(2) + '% p.a.');
  html('breakdownBody', [['Principal',loan,loan/term,loan/(term*12)],['Interest',totalInt,totalInt/term,totalInt/(term*12)],...(totalFees > 0 ? [['Fees',totalFees,totalFees/term,totalFees/(term*12)]] : [])].map(([l,total,annual,monthly]) => `<tr><td>${l}</td><td>${fmt(total)}</td><td>${fmt(annual)}</td><td>${fmt(monthly)}</td><td>${(total/(loan+totalInt+totalFees)*100).toFixed(1)}%</td></tr>`).join(''));
  html('amortBody', rows);
  show('emptyState', false);
  show('resultsContent', true);
  drawChart(labels, bArr, iArr);
}

function drawChart(labels, bArr, iArr) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('loanChart');
  if (!canvas) return;
  if (loanChart) { loanChart.destroy(); loanChart = null; }
  const opts = JSON.parse(JSON.stringify(chartDefaults));
  opts.plugins.tooltip.callbacks = { label: i => ` ${i.dataset.label}: ${fmt(i.parsed.y)}` };
  loanChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [
      { label:'Remaining Balance',    data:bArr, borderColor:'rgba(46,51,56,1)',   backgroundColor:'rgba(46,51,56,0.6)',  fill:'origin', tension:0.35, pointRadius:2, pointHoverRadius:5, borderWidth:2.5 },
      { label:'Cumulative Interest',  data:iArr, borderColor:'rgba(192,57,43,0.9)',backgroundColor:'rgba(192,57,43,0.3)', fill:'origin', tension:0.35, pointRadius:0, pointHoverRadius:5, borderWidth:2 },
    ]},
    options: opts,
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCollapsibles();
  ['fLoan','fRate','fTerm','fBalloon','fEstFee','fMonthlyFee','fExtra'].forEach(id => document.getElementById(id)?.addEventListener('input', calc));
  document.getElementById('fFreq')?.addEventListener('change', calc);
  const ln = document.getElementById('fLoan'), lr = document.getElementById('fLoanRange');
  lr?.addEventListener('input', () => { ln.value = lr.value; calc(); });
  ln?.addEventListener('input', () => { if (+ln.value <= 100000) lr.value = ln.value; });
  document.getElementById('amortToggle')?.addEventListener('click', function() {
    const s = document.getElementById('amortSection'); const open = s.style.display === 'block';
    s.style.display = open ? 'none' : 'block'; this.textContent = open ? '▼ Show Year-by-Year Schedule' : '▲ Hide Year-by-Year Schedule';
  });
  document.getElementById('btnExportSchedule')?.addEventListener('click', () => dlCSV(scheduleRows, 'personal-loan-schedule.csv'));
  document.getElementById('btnExportSummary')?.addEventListener('click',  () => dlCSV(summaryRows,  'personal-loan-summary.csv'));
  calc();
});
