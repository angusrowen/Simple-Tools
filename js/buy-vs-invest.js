/* ==========================================================
   AusCalc — Buy vs Invest  /js/buy-vs-invest.js
   ========================================================== */

let bviChart = null;
let summaryRows = [], scheduleRows = [];

/* ── Stamp duty estimate (NSW 2025-26) ── */
function stampDuty(price) {
  const brackets = [
    { min: 0,       max: 16000,   rate: 0.0125, base: 0       },
    { min: 16000,   max: 35000,   rate: 0.015,  base: 200     },
    { min: 35000,   max: 93000,   rate: 0.0175, base: 485     },
    { min: 93000,   max: 351000,  rate: 0.035,  base: 1500    },
    { min: 351000,  max: 1168000, rate: 0.045,  base: 10530   },
    { min: 1168000, max: 3505000, rate: 0.055,  base: 47295   },
    { min: 3505000, max: Infinity,rate: 0.07,   base: 175790  },
  ];
  for (const b of [...brackets].reverse())
    if (price > b.min) return Math.round(b.base + (price - b.min) * b.rate);
  return 0;
}

/* ── LMI estimate (Genworth approximation) ── */
function lmiEstimate(price, deposit) {
  const lvr = (price - deposit) / price;
  if (lvr <= 0.80) return 0;
  if (lvr <= 0.85) return Math.round((price - deposit) * 0.0085);
  if (lvr <= 0.90) return Math.round((price - deposit) * 0.017);
  return Math.round((price - deposit) * 0.035);
}

/* ── PMT helper ── */
function pmt(r, n, pv) {
  if (r === 0) return pv / n;
  return pv * r / (1 - Math.pow(1 + r, -n));
}

function calc() {
  const price         = nv('fPrice');
  const depositPct    = nv('fDepositPct') / 100;
  const deposit       = Math.round(price * depositPct);
  const loanTermYrs   = nv('fLoanTerm');
  const mortgageRate  = nv('fMortgageRate') / 100 / 12;
  const propGrowth    = nv('fPropGrowth')   / 100;
  const rentYield     = nv('fRentYield')    / 100;      // rental income if buy-to-let (0 for PPOR)
  const ownerCosts    = nv('fOwnerCosts')   / 100;      // % of property value p.a.
  const propMgmt      = nv('fPropMgmt')     / 100;
  const rent          = nv('fRent') * 12;               // annual rent paid in invest scenario
  const rentGrowth    = nv('fRentGrowth')   / 100;
  const etfReturn     = nv('fEtfReturn')    / 100;
  const etfFee        = nv('fEtfFee')       / 100;
  const years         = nv('fYears');
  const oppCost       = document.getElementById('fOppCost')?.checked ?? true;
  const sellAtEnd     = document.getElementById('fSellAtEnd')?.checked ?? true;
  const cgTaxRate     = nv('fCGTRate') / 100;
  const state         = sv('fState') || 'nsw';

  if (price <= 0 || years <= 0) return;

  /* ── Upfront costs ── */
  const sd     = stampDuty(price);          // NSW default
  const lmi    = lmiEstimate(price, deposit);
  const other  = nv('fOtherUpfront');
  const totalUpfront = sd + lmi + other;
  const loanAmount   = price - deposit + lmi;
  const n            = loanTermYrs * 12;
  const monthlyRepay = pmt(mortgageRate, n, loanAmount);

  // Update auto-fields
  set('rStampDuty', fmt(sd));
  set('rLMI',       lmi > 0 ? fmt(lmi) : 'None required');
  set('rDeposit',   fmt(deposit) + ` (${(depositPct*100).toFixed(1)}%)`);
  set('rUpfront',   fmt(totalUpfront));

  /* ── Year-by-year simulation ── */
  let propVal       = price;
  let loanBal       = loanAmount;
  let buyWealth     = 0;                          // equity
  let investPortfolio = deposit + (oppCost ? totalUpfront : 0);
  let annualRent    = rent;
  let cumulativeMortgage = 0;
  let cumulativeOwner    = 0;
  let cumulativeRent     = 0;
  let cumulativeEtfContrib = investPortfolio;

  const labels  = ['Start'];
  const buyArr  = [Math.round(deposit)];
  const invArr  = [Math.round(investPortfolio)];
  scheduleRows  = ['Year,Property Value,Loan Balance,Buy Equity,Invest Portfolio,Difference'];

  for (let y = 1; y <= years; y++) {
    // Property side
    propVal *= (1 + propGrowth);
    const annualMortgage = Math.min(loanBal, monthlyRepay * 12);
    const annualInt      = loanBal * (mortgageRate * 12);
    const annualPrinc    = Math.max(0, annualMortgage - annualInt);
    loanBal              = Math.max(0, loanBal - annualPrinc);
    const ownerCostAmt   = propVal * ownerCosts;
    const rentalIncome   = propVal * rentYield;
    const mgmtAmt        = rentalIncome * propMgmt;
    cumulativeMortgage  += annualMortgage;
    cumulativeOwner     += ownerCostAmt;
    buyWealth            = propVal - loanBal;

    // Invest side — contribute what would have been mortgage - rent paid
    const mortgageEquiv  = monthlyRepay * 12;
    const annualContrib  = Math.max(0, mortgageEquiv - annualRent - ownerCostAmt);
    investPortfolio     += annualContrib;
    investPortfolio     *= (1 + etfReturn - etfFee);
    cumulativeRent      += annualRent;
    cumulativeEtfContrib += annualContrib;
    annualRent          *= (1 + rentGrowth);

    labels.push(`Yr ${y}`);
    buyArr.push(Math.round(buyWealth));
    invArr.push(Math.round(investPortfolio));
    scheduleRows.push([y, Math.round(propVal), Math.round(loanBal), Math.round(buyWealth), Math.round(investPortfolio), Math.round(buyWealth - investPortfolio)].join(','));
  }

  /* ── Exit / sale ── */
  let buyFinal = buyWealth, invFinal = investPortfolio;
  const agentFee = price * 0.02 * (years > 0 ? (1 + propGrowth) ** years : 1) / propVal * propVal * 0.02;
  const propCGT  = sellAtEnd && cgTaxRate > 0
    ? Math.max(0, (propVal - price) * 0.5 * cgTaxRate)   // 50% CGT discount (held >12 months)
    : 0;
  const etfCGT   = sellAtEnd && cgTaxRate > 0
    ? Math.max(0, (investPortfolio - cumulativeEtfContrib) * 0.5 * cgTaxRate)
    : 0;
  if (sellAtEnd) { buyFinal = propVal - loanBal - propCGT - agentFee; invFinal = investPortfolio - etfCGT; }

  const winner = buyFinal >= invFinal ? 'Buy' : 'Invest';
  const diff   = Math.abs(buyFinal - invFinal);

  summaryRows = [
    'Metric,Buy Property,Invest in ETF',
    `Final Wealth,${Math.round(buyFinal)},${Math.round(invFinal)}`,
    `Property Value,${Math.round(propVal)},—`,
    `Loan Balance,${Math.round(loanBal)},—`,
    `ETF Portfolio,—,${Math.round(investPortfolio)}`,
    `CGT (est.),${Math.round(propCGT)},${Math.round(etfCGT)}`,
    `Winner,${winner},`,
    `Difference,${Math.round(diff)},`,
  ];

  set('rBuyWealth',   fmt(buyFinal));
  set('rInvWealth',   fmt(invFinal));
  set('rPropVal',     fmt(propVal));
  set('rLoanBal',     fmt(loanBal));
  set('rPortfolio',   fmt(investPortfolio));
  set('rWinner',      `${winner} wins by ${fmt(diff)}`);
  set('rMortgageTotal', fmt(cumulativeMortgage));
  set('rRentTotal',   fmt(cumulativeRent));
  set('rPropCGT',     fmt(propCGT));
  set('rEtfCGT',      fmt(etfCGT));

  const winEl = document.getElementById('rWinner');
  if (winEl) winEl.style.color = winner === 'Buy' ? '#3f7fb5' : '#2a9d67';

  show('emptyState', false);
  show('resultsContent', true);
  drawChart(labels, buyArr, invArr);
}

function drawChart(labels, buyArr, invArr) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('bviChart');
  if (!canvas) return;
  if (bviChart) { bviChart.destroy(); bviChart = null; }
  const opts = JSON.parse(JSON.stringify(chartDefaults));
  opts.plugins.tooltip.callbacks = { label: i => ` ${i.dataset.label}: ${fmt(i.parsed.y)}` };
  bviChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Buy (Equity)',      data: buyArr, borderColor: 'rgba(63,127,181,1)',  backgroundColor: 'rgba(63,127,181,0.2)', fill: false, tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5 },
        { label: 'Invest (Portfolio)',data: invArr, borderColor: 'rgba(42,157,103,1)',  backgroundColor: 'rgba(42,157,103,0.2)', fill: false, tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5 },
      ]
    },
    options: opts,
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initCollapsibles();

  const autoFields = ['fPrice','fDepositPct','fLoanTerm','fMortgageRate','fPropGrowth',
    'fRentYield','fOwnerCosts','fPropMgmt','fRent','fRentGrowth',
    'fEtfReturn','fEtfFee','fYears','fOtherUpfront','fCGTRate'];
  autoFields.forEach(id => document.getElementById(id)?.addEventListener('input', calc));
  ['fState'].forEach(id => document.getElementById(id)?.addEventListener('change', calc));
  ['fOppCost','fSellAtEnd'].forEach(id => document.getElementById(id)?.addEventListener('change', calc));

  // Price range sync
  const pn = document.getElementById('fPrice'), pr = document.getElementById('fPriceRange');
  pr?.addEventListener('input', () => { pn.value = pr.value; calc(); });
  pn?.addEventListener('input', () => { if (+pn.value <= 3000000) pr.value = pn.value; });

  // Deposit pct → show LMI warning
  document.getElementById('fDepositPct')?.addEventListener('input', () => {
    const pct = nv('fDepositPct');
    show('lmiWarning', pct < 20);
    calc();
  });

  document.getElementById('btnExportSummary')?.addEventListener('click', () => dlCSV(summaryRows, 'buy-vs-invest-summary.csv'));
  document.getElementById('btnExportSchedule')?.addEventListener('click', () => dlCSV(scheduleRows, 'buy-vs-invest-schedule.csv'));
  document.getElementById('amortToggle')?.addEventListener('click', function() {
    const s = document.getElementById('amortSection');
    const open = s.style.display === 'block';
    s.style.display = open ? 'none' : 'block';
    this.textContent = open ? '▼ Show Year-by-Year Schedule' : '▲ Hide Year-by-Year Schedule';
  });

  calc();
});
