document.addEventListener('DOMContentLoaded', function() {
// ── helpers ──────────────────────────────────────────────────────────────
  function el(id)   { return document.getElementById(id); }
  function dn(id)   { el(id).classList.add('dn'); }
  function sh(id)   { el(id).classList.remove('dn'); }
  function f0(n)    { return '$' + Math.round(Math.abs(n)).toLocaleString('en-AU'); }
  function f2(n)    { return '$' + Math.abs(n).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function pct(n)   { return n.toFixed(1) + '%'; }
  function freq()   { return parseInt(document.querySelector('input[name="freq"]:checked').value); }
  function mode()   { return document.querySelector('input[name="mode"]:checked').value; }
  function inflOn() { return document.querySelector('input[name="infl"]:checked').value === 'on'; }

  var MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function addMonths(ym, months) {
    var p  = ym.split('-');
    var yr = parseInt(p[0]), mo = parseInt(p[1]) - 1;
    var d  = new Date(yr, mo + months, 1);
    return MN[d.getMonth()] + ' ' + d.getFullYear();
  }

  // ── set default start date ────────────────────────────────────────────────
  var now = new Date();
  el('fStart').value = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');

  // ── lump sums ─────────────────────────────────────────────────────────────
  var lumpId = 0;
  el('btnAddLump').onclick = function () {
    var id  = lumpId++;
    var div = document.createElement('div');
    div.id  = 'lump_' + id;
    div.className = 'lump-row';
    div.innerHTML =
      '<div class="field" style="margin:0"><label>Amount ($)</label>'
      + '<div class="iw"><span class="pre">$</span>'
      + '<input type="number" id="la'+id+'" class="pl" min="0" step="100" value="1000"></div></div>'
      + '<div class="field" style="margin:0"><label>At Year #</label>'
      + '<input type="number" id="ly'+id+'" min="1" max="50" value="1"></div>'
      + '<button type="button" class="lump-rm" data-id="'+id+'">&#x2715;</button>';
    el('lumpList').appendChild(div);
    el('la'+id).oninput = calculate;
    el('ly'+id).oninput = calculate;
    div.querySelector('.lump-rm').onclick = function () { div.remove(); calculate(); };
    calculate();
  };

  function getLumps() {
    var m = {};
    el('lumpList').querySelectorAll('input[id^="la"]').forEach(function(inp) {
      var id  = inp.id.slice(2);
      var lyE = el('ly'+id);
      if (!lyE) return;
      var amt = parseFloat(inp.value) || 0;
      var yr  = parseInt(lyE.value)  || 1;
      m[yr] = (m[yr] || 0) + amt;
    });
    return m;
  }

  // ── chart ─────────────────────────────────────────────────────────────────
  var myChart = null;

  function drawChart(labels, cC, cI, cL) {
    var canvas = el('chart');
    var ctx    = canvas.getContext('2d');
    if (myChart) { myChart.destroy(); myChart = null; }
    var datasets = [
      { label:'Initial+Contributions', data:cC, backgroundColor:'rgba(42,157,103,0.78)', stack:'s' },
      { label:'Interest',              data:cI, backgroundColor:'rgba(232,168,56,0.65)',  stack:'s' }
    ];
    if (cL.some(function(v){return v>0;})) {
      datasets.push({ label:'Lump Sums', data:cL, backgroundColor:'rgba(182,134,44,0.78)', stack:'s' });
    }
    myChart = new Chart(ctx, {
      type: 'bar',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        interaction: { mode:'index', intersect:false },
        plugins: {
          legend: { display:false },
          tooltip: {
            backgroundColor: 'rgba(30,20,50,0.9)',
            padding: 10, cornerRadius: 8,
            callbacks: {
              label: function(item) { return '  ' + item.dataset.label + ': ' + f0(item.raw); }
            }
          }
        },
        scales: {
          x: { stacked:true, grid:{display:false}, ticks:{font:{size:10},color:'#6c7a89'} },
          y: { stacked:true, grid:{color:'rgba(0,0,0,.05)'}, ticks:{font:{size:10},color:'#6c7a89',
            callback: function(v) { return '$' + v.toLocaleString('en-AU'); }
          }}
        }
      }
    });
  }

  // ── main calculate ────────────────────────────────────────────────────────
  var lastRows = [], lastGoal = 0, lastFreq = 12;

  function calculate() {
    var goal    = parseFloat(el('fGoal').value)    || 0;
    var initial = parseFloat(el('fInitial').value) || 0;
    var fq      = freq();
    var rate    = parseFloat(el('fRate').value)    || 0;
    var md      = mode();
    var startYM = el('fStart').value;
    var lumps   = getLumps();
    var useInfl = inflOn();
    var inflRate = useInfl ? (parseFloat(el('fInfl').value) || 0) : 0;
    var r       = rate / 100 / fq;
    var contrib = parseFloat(el('fContrib').value) || 0;

    if (goal <= 0) return;

    var periods;

    if (md === 'contrib') {
      var ty = parseFloat(el('fTarget').value) || 1;
      periods = Math.round(ty * fq);
      var growth = Math.pow(1 + r, periods);
      contrib = r === 0
        ? Math.max(0, (goal - initial) / periods)
        : Math.max(0, (goal - initial * growth) * r / (growth - 1));
      el('fContrib').value = contrib.toFixed(2);
    } else {
      if (initial >= goal) {
        periods = 0;
      } else {
        var bal = initial, p = 0, maxP = fq * 60;
        while (bal < goal && p < maxP) {
          var chkYr = Math.floor(p / fq) + 1;
          if (p % fq === 0 && lumps[chkYr]) bal += lumps[chkYr];
          bal += contrib;
          bal += bal * r;
          p++;
        }
        periods = p;
      }
    }

    // build year rows
    var years   = Math.max(1, Math.ceil(periods / fq));
    var balance = initial;
    var totC = 0, totI = 0, totL = 0;
    var rows = [], lbls = [], chartC = [], chartI = [], chartL = [];

    for (var y = 1; y <= years; y++) {
      var opening = balance;
      var yC = 0, yI = 0, yL = 0;
      var ppy = (y === years) ? (periods - (y-1)*fq) : fq;
      if (lumps[y]) { balance += lumps[y]; yL += lumps[y]; }
      for (var pp = 0; pp < ppy; pp++) {
        if (balance >= goal * 1.0001) break;
        balance += contrib; yC += contrib;
        var intr = balance * r; balance += intr; yI += intr;
      }
      balance = Math.min(balance, goal * 1.001);
      totC += yC; totI += yI; totL += yL;
      var realVal = useInfl ? (balance / Math.pow(1 + inflRate/100, y)) : null;
      rows.push({ y:y, open:opening, c:yC, l:yL, i:yI, close:balance, real:realVal });
      lbls.push('Yr ' + y);
      chartC.push(Math.round(initial + totC));
      chartI.push(Math.round(totI));
      chartL.push(Math.round(totL));
    }
    lastRows = rows; lastGoal = goal; lastFreq = fq;

    // time string
    var yn = periods / fq;
    var yf = Math.floor(yn), mr = Math.round((yn - yf) * 12);
    var ts = '';
    if (yf > 0) ts += yf + (yf===1?' yr':' yrs');
    if (mr > 0) ts += (ts?' ':'') + mr + (mr===1?' mth':' mths');
    if (!ts) ts = '< 1 mth';

    var goalDate = startYM ? addMonths(startYM, Math.ceil(periods / (fq/12))) : '—';

    // result tiles
    el('rLbl').textContent  = md==='contrib' ? 'Required / ' + (fq===52?'wk':fq===26?'fn':fq===12?'mo':'yr') : 'Time to Goal';
    el('rMain').textContent = md==='contrib' ? f0(contrib) : ts;
    el('rDep').textContent  = f0(initial + totC);
    el('rInt').textContent  = f0(totI);
    el('rDate').textContent = goalDate;

    if (totL > 0) { sh('rLumpBox'); el('rLump').textContent = f0(totL); } else dn('rLumpBox');
    if (useInfl && rows.length) { sh('rRealBox'); el('rReal').textContent = f0(rows[rows.length-1].real); } else dn('rRealBox');

    // banner
    var lbl = el('fLabel').value || 'your goal';
    sh('banner');
    el('banner').innerHTML = 'You will reach <strong>' + lbl + '</strong> (' + f0(goal) + ') in <strong>' + ts + '</strong>'
      + (goalDate !== '—' ? ' — by <strong>' + goalDate + '</strong>' : '') + '.';

    // progress
    var pp2 = Math.min(100, initial/goal*100);
    el('pBar').style.width  = pp2.toFixed(1) + '%';
    el('pPct').textContent  = pp2.toFixed(1) + '%';
    el('pSaved').textContent = f0(initial) + ' saved';
    el('pGoal').textContent  = 'Goal: ' + f0(goal);
    el('pTarget').textContent = 'Target: ' + goalDate;

    // breakdown table
    var t = '<tr><td>Initial Savings</td><td>—</td><td>—</td><td>' + f0(initial) + '</td><td>' + pct(initial/goal*100) + '</td></tr>'
      + '<tr><td>Regular Contributions</td><td>' + f2(contrib) + '</td><td>' + f0(contrib*fq) + '</td><td>' + f0(totC) + '</td><td>' + pct(totC/goal*100) + '</td></tr>';
    if (totL > 0) t += '<tr><td>Lump Sum Top-Ups</td><td>—</td><td>—</td><td>' + f0(totL) + '</td><td>' + pct(totL/goal*100) + '</td></tr>';
    t += '<tr><td>Interest Earned</td><td>—</td><td>—</td><td>' + f0(totI) + '</td><td>' + pct(totI/goal*100) + '</td></tr>'
      + '<tr class="tot"><td>Total at Goal</td><td>—</td><td>—</td><td>' + f0(initial+totC+totL+totI) + '</td><td>100%</td></tr>';
    el('tBody').innerHTML = t;

    // chart
    if (totL > 0) sh('legLump'); else dn('legLump');
    drawChart(lbls, chartC, chartI, chartL);

    // schedule
    if (useInfl) sh('realCol'); else dn('realCol');
    var sh2 = '';
    rows.forEach(function(row) {
      var yDate = startYM ? addMonths(startYM, row.y * 12) : 'Year ' + row.y;
      sh2 += '<tr>'
        + '<td>Year ' + row.y + '</td><td>' + yDate + '</td>'
        + '<td>' + f0(row.open) + '</td>'
        + '<td style="color:var(--gr)">' + f0(row.c) + '</td>'
        + '<td style="color:var(--am)">' + (row.l > 0 ? f0(row.l) : '—') + '</td>'
        + '<td style="color:var(--am)">' + f0(row.i) + '</td>'
        + '<td style="font-weight:700">' + f0(row.close) + '</td>'
        + (useInfl ? '<td style="color:var(--am)">' + f0(row.real) + '</td>' : '')
        + '<td>' + pct(Math.min(100, row.close/goal*100)) + '</td>'
        + '</tr>';
    });
    el('sBody').innerHTML = sh2;
  }

  // ── event wiring ──────────────────────────────────────────────────────────
  ['fGoal','fInitial','fContrib','fRate','fTarget','fLabel','fInfl','fStart'].forEach(function(id) {
    el(id).oninput  = calculate;
    el(id).onchange = calculate;
  });

  document.querySelectorAll('input[name="freq"]').forEach(function(r) { r.onchange = calculate; });
  document.querySelectorAll('input[name="mode"]').forEach(function(r) {
    r.onchange = function() {
      var isC = mode() === 'contrib';
      if (isC) sh('targetRow'); else dn('targetRow');
      el('fContrib').readOnly = isC;
      el('fContrib').style.opacity = isC ? '0.5' : '1';
      calculate();
    };
  });
  document.querySelectorAll('input[name="infl"]').forEach(function(r) {
    r.onchange = function() {
      if (inflOn()) sh('inflRow'); else dn('inflRow');
      calculate();
    };
  });

  el('schedBtn').onclick = function() {
    var hidden = el('schedWrap').classList.toggle('dn');
    this.textContent = (hidden ? '☰ Show' : '☰ Hide') + ' Year-by-Year Schedule';
  };

  el('btnReset').onclick = function() {
    el('fGoal').value='50000'; el('fInitial').value='5000';
    el('fContrib').value='800'; el('fRate').value='4.5';
    el('fTarget').value='5'; el('fLabel').value='';
    el('fqM').checked=true; el('mTime').checked=true; el('inflOff').checked=true;
    el('fContrib').readOnly=false; el('fContrib').style.opacity='1';
    dn('targetRow'); dn('inflRow'); dn('rRealBox'); dn('rLumpBox');
    el('lumpList').innerHTML='';
    var n=new Date();
    el('fStart').value=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0');
    calculate();
  };

  function dlCSV(name, rows2) {
    var a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(rows2.join('\n'));
    a.download=name; a.click();
  }
  el('btnCSV').onclick = function() {
    var lbl = el('fLabel').value || 'Savings';
    dlCSV(lbl+'_summary.csv', [
      'Savings Goal Calculator',
      'Goal,' + f0(lastGoal),
      'Rate,' + el('fRate').value + '%',
      'Contribution,' + f2(parseFloat(el('fContrib').value)||0),
      'Total Deposited,' + el('rDep').textContent,
      'Interest Earned,' + el('rInt').textContent,
      'Goal Date,' + el('rDate').textContent
    ]);
  };
  el('btnSchedCSV').onclick = function() {
    if (!lastRows.length) return;
    var startYM = el('fStart').value;
    var useInfl = inflOn();
    var lines = [['Year','Date','Opening','Contributions','Lump Sum','Interest','Closing'+(useInfl?',Real Value':''),]+',%Goal'];
    lastRows.forEach(function(row) {
      var yDate = startYM ? addMonths(startYM, row.y*12) : 'Year'+row.y;
      var r2 = [row.y, yDate, Math.round(row.open), Math.round(row.c),
        Math.round(row.l), Math.round(row.i), Math.round(row.close)];
      if (useInfl) r2.push(Math.round(row.real));
      r2.push(pct(Math.min(100,row.close/lastGoal*100)));
      lines.push(r2.join(','));
    });
    var lbl = el('fLabel').value || 'Savings';
    dlCSV(lbl+'_schedule.csv', lines);
  };

  el('btnSaveSnapshot').onclick = function() {
    var h = document.documentElement.outerHTML;
    var blob = new Blob([h], {type:'text/html;charset=utf-8'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    var d = new Date();
    a.download = 'savings-goal-snapshot-' + d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + '.html';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  el('btnStartOver').onclick = function() {
    if (confirm('Reset all fields to defaults?')) {
      location.reload();
    }
  };


  // ── slider sync ──────────────────────────────────────────
  [
    ['fGoal',    'fGoalRange',    200000],
    ['fInitial', 'fInitialRange', 50000],
    ['fContrib', 'fContribRange', 5000]
  ].forEach(function(pair) {
    var num = el(pair[0]), rng = el(pair[1]), cap = pair[2];
    if (!num || !rng) return;
    rng.addEventListener('input', function() {
      num.value = rng.value;
      calculate();
    });
    num.addEventListener('input', function() {
      var v = parseFloat(num.value) || 0;
      if (v <= cap) rng.value = v;
      calculate();
    });
  });

  // ── run on startup ────────────────────────────────────────────────────────
  calculate();


});
