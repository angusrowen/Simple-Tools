/* ==========================================================
   AusCalc — Australian Income Tax  /js/income-tax.js  FY 2025-26
   ========================================================== */

const TAX_BRACKETS = [
  { min:0,       max:18200,    rate:0,     base:0      },
  { min:18200,   max:45000,    rate:0.19,  base:0      },
  { min:45000,   max:135000,   rate:0.325, base:5092   },
  { min:135000,  max:190000,   rate:0.37,  base:34792  },
  { min:190000,  max:Infinity, rate:0.45,  base:55192  },
];

function incomeTax(inc) {
  for (const b of [...TAX_BRACKETS].reverse())
    if (inc > b.min) return b.base + (inc - b.min) * b.rate;
  return 0;
}
function lito(inc) {
  if (inc <= 37500) return 700;
  if (inc <= 45000) return 700 - (inc - 37500) * 0.05;
  if (inc <= 66667) return 325 - (inc - 45000) * 0.015;
  return 0;
}
function medicare(inc, hasPHI) {
  if (hasPHI) return 0;
  if (inc <= 26000) return 0;
  if (inc <= 32500) return (inc - 26000) * 0.1;
  return inc * 0.02;
}
function mls(inc, hasPHI) {
  if (hasPHI) return 0;
  if (inc <= 93000)  return 0;
  if (inc <= 108000) return inc * 0.01;
  if (inc <= 144000) return inc * 0.0125;
  return inc * 0.015;
}
function div293(inc, concessional) {
  const threshold = 250000;
  if (inc + concessional <= threshold) return 0;
  return Math.max(0, Math.min(concessional, inc + concessional - threshold)) * 0.15;
}
function hecsWithholding(income) {
  const B = [{min:0,rate:0},{min:54435,rate:.01},{min:62850,rate:.02},{min:66620,rate:.025},{min:70618,rate:.03},{min:74855,rate:.035},{min:79346,rate:.04},{min:84107,rate:.045},{min:89154,rate:.05},{min:94503,rate:.055},{min:100174,rate:.06},{min:106185,rate:.065},{min:112556,rate:.07},{min:119309,rate:.075},{min:126467,rate:.08},{min:134056,rate:.085},{min:142100,rate:.09},{min:150626,rate:.095},{min:159663,rate:.10}];
  let total = 0, rem = income;
  for (let i = B.length-1; i >= 0; i--) {
    if (rem > B[i].min) { total += (rem - B[i].min) * B[i].rate; rem = B[i].min; }
  }
  return Math.round(total);
}

const PF = { weekly:52, fortnightly:26, monthly:12, annual:1 };

function calc() {
  const gross     = nv('fIncome');
  const superRate = nv('fSuperRate') / 100;
  const freq      = sv('fFreq') || 'monthly';
  const hasPHI    = document.getElementById('fPHI')?.checked ?? false;
  const hasHECS   = document.getElementById('fHECS')?.checked ?? false;
  const hasSS     = document.getElementById('fSalSac')?.checked ?? false;
  const salSacAmt = hasSS ? nv('fSalSacAmt') : 0;
  const hasSecond = document.getElementById('fSecondJob')?.checked ?? false;
  const secondInc = hasSecond ? nv('fSecondIncome') : 0;

  const superAmt      = Math.round(gross * superRate);
  const concessional  = Math.min(superAmt + salSacAmt, 30000);
  const taxableInc    = gross - salSacAmt + secondInc;
  const rawTax        = incomeTax(taxableInc);
  const litOff        = lito(taxableInc);
  const medLev        = medicare(taxableInc, hasPHI);
  const mlsAmt        = mls(taxableInc, hasPHI);
  const div293Amt     = div293(taxableInc, concessional);
  const hecsAmt       = hasHECS ? hecsWithholding(taxableInc) : 0;
  const totalTax      = Math.max(0, rawTax - litOff) + medLev + mlsAmt + hecsAmt;
  const takeHome      = gross - salSacAmt - totalTax;
  const effRate       = taxableInc > 0 ? (totalTax / taxableInc * 100).toFixed(1) : '0.0';
  const marginalRate  = (() => { for (const b of [...TAX_BRACKETS].reverse()) if (taxableInc > b.min) return (b.rate*100).toFixed(0); return '0'; })();
  const periods       = PF[freq] || 12;
  const thp           = takeHome / periods;

  set('rTHP',      fmtC(thp));
  set('rAnnual',   fmt(takeHome));
  set('rGross',    fmt(taxableInc));
  set('rSuper',    fmt(superAmt));
  set('rEffRate',  effRate + '%');
  set('rMargRate', marginalRate + '%');

  const brkRows = [
    ['Gross Income',    gross/52, gross/26, gross/12, gross],
    ['Salary Sacrifice',salSacAmt/52, salSacAmt/26, salSacAmt/12, salSacAmt],
    ['Income Tax',      (rawTax-litOff)/52, (rawTax-litOff)/26, (rawTax-litOff)/12, rawTax-litOff],
    ['Medicare Levy',   medLev/52, medLev/26, medLev/12, medLev],
    ...(mlsAmt > 0 ? [['MLS', mlsAmt/52, mlsAmt/26, mlsAmt/12, mlsAmt]] : []),
    ...(hecsAmt > 0 ? [['HECS/HELP', hecsAmt/52, hecsAmt/26, hecsAmt/12, hecsAmt]] : []),
    ['Superannuation',  superAmt/52, superAmt/26, superAmt/12, superAmt],
    ['Take-Home Pay',   takeHome/52, takeHome/26, takeHome/12, takeHome],
  ].map(([label, w, fn, m, a]) =>
    `<tr><td>${label}</td><td>${fmt(w)}</td><td>${fmt(fn)}</td><td>${fmt(m)}</td><td>${fmt(a)}</td></tr>`
  ).join('');
  html('breakdownBody', brkRows);

  const bracketRows = TAX_BRACKETS.map(b => {
    const taxable = Math.max(0, Math.min(taxableInc, b.max) - b.min);
    const applied = taxable > 0 ? taxable * b.rate : 0;
    const label   = b.max === Infinity ? `$${b.min.toLocaleString('en-AU')}+` : `$${b.min.toLocaleString('en-AU')} – $${b.max.toLocaleString('en-AU')}`;
    return `<tr ${taxable > 0 ? 'class="milestone-row"' : ''}><td>${label} @ ${(b.rate*100).toFixed(0)}%</td><td>${taxable > 0 ? fmt(taxable) : '—'}</td><td>${applied > 0 ? fmt(applied) : '—'}</td></tr>`;
  }).join('');
  html('bracketBody', bracketRows);

  if (div293Amt > 0) { show('div293Row', true); set('rDiv293', fmt(div293Amt)); } else { show('div293Row', false); }
  show('emptyState', false);
  show('resultsContent', true);
}

document.addEventListener('DOMContentLoaded', () => {
  initCollapsibles();
  ['fIncome','fSuperRate','fSalSacAmt','fSecondIncome'].forEach(id => document.getElementById(id)?.addEventListener('input', calc));
  ['fFreq'].forEach(id => document.getElementById(id)?.addEventListener('change', calc));
  ['fPHI','fHECS','fSalSac','fSecondJob'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      show('salSacField',    document.getElementById('fSalSac')?.checked);
      show('secondJobField', document.getElementById('fSecondJob')?.checked);
      calc();
    });
  });
  const sn = document.getElementById('fIncome'), sr = document.getElementById('fIncomeRange');
  sr?.addEventListener('input', () => { sn.value = sr.value; calc(); });
  sn?.addEventListener('input', () => { if (+sn.value <= 300000) sr.value = sn.value; });
  show('salSacField', false);
  show('secondJobField', false);
  calc();
});
