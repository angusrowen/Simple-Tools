/* ==========================================================
   AusCalc — Home Loan Repayment  /js/home-loan.js
   ========================================================== */

let loanChart = null;
let scheduleRows = [], summaryRows = [];
const PF = { weekly:52, fortnightly:26, monthly:12 };

function pmt(rate, n, pv) { return rate === 0 ? pv/n : pv * rate / (1 - Math.pow(1+rate,-n)); }

function calc() {
  const loan    = nv('fLoan');
  const rate    = nv('fRate');
  const term    = nv('fTerm');
  const freq    = sv('fFreq') || 'monthly';
  const type    = sv('fType') || 'pi';
  const ioYrs   = type === 'io' ? nv('fIOTerm') : 0;
  const estFee  = nv('fEstFee');
  const mFee    = nv('fMonthly');
  const extra   = nv('fExtra');
  const offset  = nv('fOffset');
  if (loan <= 0 || rate <= 0 || term <= 0) return;

  const periods = PF[freq];
  const r       = rate / 100 / periods;
  const n       = term * periods;
  const nIO     = ioYrs * periods;
  const effBal  = Math.max(0, loan - offset);
  const ioRepay = ioYrs > 0 ? effBal * r : 0;
  const piN     = n - nIO;
  const piRepay = pmt(r, piN > 0 ? piN : n, effBal);
  const baseRepay = type === 'io' ? ioRepay : piRepay;

  let bal = effBal, totalInt = 0, totalFees = estFee;
  let rows = '', periodNum = 0;
  scheduleRows = ['#,Period,Opening,Interest,Principal,Extra,Fees,Closing'];
  let payoffDate = null;
  const startDate = new Date(sv('fStartDate') || new Date().toISOString().slice(0,10));
  const bArr = [Math.round(loan)], labels = ['Start'];

  while (bal > 0.01 && periodNum < n + 600) {
    periodNum++;
    const isIO     = type === 'io' && periodNum <= nIO;
    const curRepay = isIO ? ioRepay : (type === 'io' ? pmt(r, Math.max(1, nIO + piN - periodNum + 1), bal) : piRepay);
    const intAmt   = bal * r;
    let princAmt   = isIO ? 0 : Math.min(bal, curRepay - intAmt);
    let extraAmt   = isIO ? 0 : Math.min(extra / periods, bal - princAmt);
    bal           -= (princAmt + extraAmt);
    if (bal < 0) { extraAmt += bal; bal = 0; }
    totalInt  += intAmt;
    totalFees += mFee;

    if (periodNum % periods === 0 || bal < 0.01) {
      const yr = Math.ceil(periodNum / periods);
      rows += `<tr${bal < 0.01 ? ' class="milestone-row"' : ''}><td>${yr}</td><td>${fmt(bal + princAmt + extraAmt + intAmt)}</td><td>${fmt(intAmt)}</td><td>${fmt(princAmt)}</td><td>${fmt(extraAmt)}</td><td><strong>${fmt(Math.max(0,bal))}</strong></td></tr>`;
      scheduleRows.push([yr,`Year ${yr}`,Math.round(bal+princAmt+extraAmt+intAmt),Math.round(intAmt),Math.round(princAmt),Math.round(extraAmt),Math.round(mFee),Math.round(Math.max(0,bal))].join(','));
      labels.push(`Yr ${yr}`);
      bArr.push(Math.round(Math.max(0,bal)));
      if (bal <= 0.01 && payoffDate === null) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + Math.ceil(periodNum * 12 / periods));
        payoffDate = d.toLocaleDateString('en-AU', { month:'long', year:'numeric' });
      }
    }
    if (bal <= 0.01) break;
  }

  summaryRows = ['Metric,Value',`Loan Amount,${loan}`,`Repayment,${Math.round(baseRepay)}`,`Total Interest,${Math.round(totalInt)}`,`Total Repayments,${Math.round(loan + totalInt + totalFees)}`,`Payoff Date,${payoffDate ?? '—'}`];

  set('rRepayment',  fmt(baseRepay) + ` / ${freq === 'monthly' ? 'mo' : freq === 'weekly' ? 'wk' : 'fn'}`);
  set('rTotalRepay', fmt(loan + totalInt + totalFees));
  set('rTotalInt',   fmt(totalInt));
  if (type === 'io') { show('ioRow', true); show('piRow', true); set('rIORepay', fmt(ioRepay)+'/period (IO)'); set('rPIRepay', fmt(piRepay)+'/period (P&I)'); }
  else { show('ioRow', false); show('piRow', false); }
  set('rPayoffDate', payoffDate ?? '—');

  html('breakdownBody', [['Principal',loan,loan/12,loan/term],['Total Interest',totalInt,totalInt/12,totalInt/term],...(totalFees > 0 ? [['Fees',totalFees,totalFees/12,totalFees/term]] : [])].map(([l,a,m,y]) => `<tr><td>${l}</td><td>${fmt(a)}</td><td>${fmt(m)}</td><td>${fmt(y)}</td><td>${(a/(loan+totalInt+totalFees)*100).toFixed(1)}%</td></tr>`).join(''));
  html('amortBody', rows || '<tr><td colspan="6" style="text-align:center;color:var(--muted)">No data</td></tr>');
  show('emptyState', false);
  show('resultsContent', true);
  drawChart(loan, totalInt);
}

function drawChart(principal, totalInt) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('loanChart');
  if (!canvas) return;
  if (loanChart) { loanChart.destroy(); loanChart = null; }
  loanChart = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: { labels:['Principal','Total Interest'], datasets:[{ data:[Math.round(principal),Math.round(totalInt)], backgroundColor:['rgba(63,127,181,0.8)','rgba(232,101,10,0.8)'], borderWidth:0 }] },
    options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:true, position:'bottom', labels:{ color:'#e8eaf0', font:{ size:11 } } }, tooltip:{ callbacks:{ label: i => ` ${i.label}: ${fmt(i.parsed)}` } } } }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCollapsibles();
  ['fLoan','fRate','fTerm','fIOTerm','fEstFee','fMonthly','fExtra','fOffset'].forEach(id => document.getElementById(id)?.addEventListener('input', calc));
  ['fFreq','fType'].forEach(id => document.getElementById(id)?.addEventListener('change', () => { show('ioTermField', sv('fType') === 'io'); calc(); }));
  const ln = document.getElementById('fLoan'), lr = document.getElementById('fLoanRange');
  lr?.addEventListener('input', () => { ln.value = lr.value; calc(); });
  ln?.addEventListener('input', () => { if (+ln.value <= 3000000) lr.value = ln.value; });
  document.getElementById('amortToggle')?.addEventListener('click', function() {
    const s = document.getElementById('amortSection'); const open = s.style.display === 'block';
    s.style.display = open ? 'none' : 'block'; this.textContent = open ? '▼ Show Year-by-Year Schedule' : '▲ Hide Year-by-Year Schedule';
  });
  document.getElementById('btnExportSchedule')?.addEventListener('click', () => dlCSV(scheduleRows, 'home-loan-schedule.csv'));
  document.getElementById('btnExportSummary')?.addEventListener('click',  () => dlCSV(summaryRows,  'home-loan-summary.csv'));
  show('ioTermField', false);
  calc();
});
