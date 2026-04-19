(function() {
  'use strict';

  // ── Refs ──────────────────────────────────────────────────────────────────
  var el = function(id) { return document.getElementById(id); };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function d2(n)  { return '$' + Math.abs(n).toLocaleString('en-AU', {minimumFractionDigits:2, maximumFractionDigits:2}); }
  function d0(n)  { return '$' + Math.round(Math.abs(n)).toLocaleString('en-AU'); }
  function pct(n) { return n.toFixed(1) + '%'; }

  function getFreq() { return document.querySelector('input[name="freq"]:checked').value; }
  function getLType(){ return document.querySelector('input[name="ltype"]:checked').value; }
  function ppy(f)    { return f === 'weekly' ? 52 : f === 'fortnightly' ? 26 : 12; }
  function fLbl(f)   { return f === 'weekly' ? 'Weekly' : f === 'fortnightly' ? 'Fortnightly' : 'Monthly'; }

  // ── Amortisation builder ──────────────────────────────────────────────────
  function buildSched(P, annRate, termYrs, freq, extraPP, offsetBal, ltype, ioYrs) {
    var n      = ppy(freq);
    var r      = annRate / 100 / n;
    var total  = termYrs * n;
    var ioPers = ltype === 'io' ? (ioYrs || 0) * n : 0;
    var piPers = total - ioPers;
    var bal    = P;
    var rows   = [];
    var totInt = 0;

    var piPmt = 0;
    if (piPers > 0) {
      piPmt = r === 0 ? P / piPers : P * (r * Math.pow(1+r, piPers)) / (Math.pow(1+r, piPers) - 1);
    }
    var postIOPmt = 0;

    for (var i = 0; i < total; i++) {
      if (bal < 0.005) break;
      var eff  = Math.max(bal - offsetBal, 0);
      var intr = eff * r;
      var pmt, prin, ext;

      if (i < ioPers) {
        pmt  = eff * r;
        prin = 0;
        ext  = 0;
      } else {
        if (ioPers > 0 && i === ioPers) {
          var rem = total - i;
          postIOPmt = r === 0 ? bal / rem : bal * (r * Math.pow(1+r,rem)) / (Math.pow(1+r,rem) - 1);
        }
        pmt  = (ioPers > 0 && postIOPmt > 0) ? postIOPmt : piPmt;
        prin = Math.min(pmt - intr, bal);
        ext  = Math.min(extraPP, Math.max(bal - prin, 0));
      }

      var closing = Math.max(bal - prin - ext, 0);
      totInt += intr;
      rows.push({ opening: bal, interest: intr, principal: prin, extra: ext, repay: pmt, closing: closing });
      bal = closing;
    }
    return { rows: rows, totalInterest: totInt };
  }

  // ── Chart ─────────────────────────────────────────────────────────────────
  var chartObj  = null;
  var chartStd  = null;

  function buildChartArrays(rows, P, termYrs, freq) {
    var n = ppy(freq);
    var labels = [], debt = [], annInt = [null], cumPaid = [0];
    for (var y = 0; y <= termYrs; y++) {
      labels.push('Yr ' + y);
      if (y === 0) {
        debt.push(P);
      } else {
        var ei  = Math.min(y * n - 1, rows.length - 1);
        var row = rows[ei];
        debt.push(row ? Math.round(row.closing) : 0);
        var yi = 0, yr = 0;
        for (var k = (y-1)*n; k <= ei && k < rows.length; k++) {
          yi += rows[k].interest;
          yr += rows[k].repay + rows[k].extra;
        }
        annInt.push(Math.round(yi));
        cumPaid.push(Math.round(cumPaid[y-1] + yr));
      }
    }
    return { labels: labels, debt: debt, annInt: annInt, cumPaid: cumPaid };
  }

  function makeGrad(ctx, paidRatio) {
    var h    = ctx.canvas.clientHeight || 120;
    var g    = ctx.createLinearGradient(0, 0, 0, h);
    var sp   = Math.max(0, Math.min(1, 1 - paidRatio));
    g.addColorStop(0,  'rgba(230,100,20,0.72)');
    g.addColorStop(sp, 'rgba(230,100,20,0.72)');
    g.addColorStop(sp, 'rgba(42,157,103,0.65)');
    g.addColorStop(1,  'rgba(42,157,103,0.65)');
    return g;
  }

  function drawChart(cd) {
    chartStd = cd;
    var canvas = el('myChart');
    var ctx    = canvas.getContext('2d');
    if (chartObj) { chartObj.destroy(); chartObj = null; }

    var P = parseFloat(el('fLoanAmt').value) || 0;
    var lastIdx = -1, rafBusy = false;

    var splitPlugin = {
      id: 'split',
      afterEvent: function(chart, args) {
        var e = args.event;
        if (e.type !== 'mousemove' && e.type !== 'mouseout') return;
        var act = chart.tooltip._active;
        var ni  = (act && act.length) ? act[0].index : -1;
        if (ni === lastIdx) return;
        lastIdx = ni;
        if (rafBusy) return;
        rafBusy = true;
        requestAnimationFrame(function() {
          rafBusy = false;
          var ratio = 0;
          if (lastIdx >= 0 && chartStd && chartStd.debt[lastIdx] != null) {
            ratio = P > 0 ? (P - chartStd.debt[lastIdx]) / P : 0;
          }
          chart.data.datasets[0].backgroundColor = makeGrad(ctx, ratio);
          chart.update('none');
        });
      }
    };

    chartObj = new Chart(ctx, {
      type: 'line',
      data: {
        labels: cd.labels,
        datasets: [
          { label:'Balance', data:cd.debt,    borderColor:'#e6641e', backgroundColor:makeGrad(ctx,0), fill:'origin', tension:0.35, pointRadius:1, pointHoverRadius:5, borderWidth:2.5 },
          { label:'_p', data:cd.debt,    borderWidth:0, pointRadius:0, pointHoverRadius:0, backgroundColor:'transparent', borderColor:'transparent', fill:false },
          { label:'_i', data:cd.annInt,  borderWidth:0, pointRadius:0, pointHoverRadius:0, backgroundColor:'transparent', borderColor:'transparent', fill:false },
          { label:'_c', data:cd.cumPaid, borderWidth:0, pointRadius:0, pointHoverRadius:0, backgroundColor:'transparent', borderColor:'transparent', fill:false }
        ]
      },
      options: {
        responsive: true,
        interaction: { mode:'index', intersect:false },
        plugins: {
          legend: { display:false },
          tooltip: {
            backgroundColor:'rgba(30,20,50,0.92)', titleColor:'#fff', bodyColor:'rgba(255,255,255,0.88)', padding:11, cornerRadius:8,
            callbacks: {
              label: function(item) {
                var l = item.dataset.label;
                var v = '$' + Math.round(item.parsed.y).toLocaleString('en-AU');
                var P2 = parseFloat(el('fLoanAmt').value) || 0;
                if (l === 'Balance')             return '  Remaining debt: ' + v;
                if (l === '_p')                  return '  Principal paid: $' + Math.round(P2 - item.parsed.y).toLocaleString('en-AU');
                if (l === '_i' && item.parsed.y) return '  Interest this year: ' + v;
                if (l === '_c')                  return '  Total paid to date: ' + v;
                return null;
              },
              labelColor: function(item) {
                var l = item.dataset.label;
                if (l === 'Balance') return { borderColor:'#e6641e', backgroundColor:'#e6641e', borderRadius:2 };
                if (l === '_p')      return { borderColor:'#2a9d67', backgroundColor:'#2a9d67', borderRadius:2 };
                if (l === '_i')      return { borderColor:'#e53935', backgroundColor:'#e53935', borderRadius:2 };
                if (l === '_c')      return { borderColor:'#888',    backgroundColor:'#888',    borderRadius:2 };
                return { borderColor:'transparent', backgroundColor:'transparent' };
              }
            }
          }
        },
        scales: {
          x: { grid:{display:false}, ticks:{font:{size:10}, color:'#6c7a89', maxTicksLimit:16} },
          y: { min:0, max:P, grid:{color:'rgba(0,0,0,.05)'}, ticks:{font:{size:10}, color:'#6c7a89', callback: function(v){ return '$'+(v/1000).toFixed(0)+'k'; }} }
        },
        animation: { duration:350 }
      },
      plugins: [splitPlugin]
    });
  }

  // ── Main calculate ────────────────────────────────────────────────────────
  var savedRows = [];

  function calculate() {
    var P      = parseFloat(el('fLoanAmt').value)    || 0;
    var rate   = parseFloat(el('fRate').value)        || 0;
    var term   = parseFloat(el('fTerm').value)        || 0;
    var freq   = getFreq();
    var n      = ppy(freq);
    var ltype  = getLType();
    var ioPer  = parseFloat(el('fIOPer').value)       || 0;
    var extra  = parseFloat(el('fExtra').value)       || 0;
    var offset = parseFloat(el('fOffset').value)      || 0;
    var estFee = parseFloat(el('fEstFee').value)      || 0;
    var mFee   = parseFloat(el('fMFee').value)        || 0;
    var startV = el('fStart').value;

    if (!P || !rate || !term) { clearAll(); return; }

    var r = rate / 100 / n;

    var baseS   = buildSched(P, rate, term, freq, 0, 0, 'pi', 0);
    var actualS = buildSched(P, rate, term, freq, extra, offset, ltype, ioPer);

    savedRows = actualS.rows;

    var totInt     = actualS.totalInterest;
    var mFeePerPer = freq==='monthly' ? mFee : freq==='fortnightly' ? mFee*12/26 : mFee*12/52;
    var totMFees   = mFee * term * 12;
    var totalFees  = estFee + totMFees;
    var totRepay   = P + totInt;
    var totCost    = totRepay + totalFees;
    var actPers    = actualS.rows.length;
    var basePers   = baseS.rows.length;
    var baseInt    = baseS.totalInterest;

    var piPers = term * n - (ltype === 'io' ? ioPer * n : 0);
    var piPmt  = r === 0 ? P / Math.max(piPers, 1) : P * (r * Math.pow(1+r,piPers)) / (Math.pow(1+r,piPers)-1);
    var ioPmt  = P * r;
    var basePmt= r === 0 ? P / (term*n) : P * (r * Math.pow(1+r,term*n)) / (Math.pow(1+r,term*n)-1);
    var dispPmt= ltype === 'io' ? ioPmt : basePmt;

    el('rRepayLbl').textContent = fLbl(freq) + ' Repayment';
    el('rRepay').textContent    = d2(dispPmt);
    el('rTotal').textContent    = d0(totRepay);
    el('rInterest').textContent = d0(totInt);

    if (totalFees > 0) {
      function compRate() {
        var pmtAdj = dispPmt + mFeePerPer;
        var cf = [-(P - estFee)];
        for (var i = 0; i < actPers; i++) cf.push(pmtAdj);
        var cr = rate / 100 / n;
        for (var it = 0; it < 80; it++) {
          var f = cf[0], df = 0;
          for (var j = 1; j < cf.length; j++) { f += cf[j]/Math.pow(1+cr,j); df -= j*cf[j]/Math.pow(1+cr,j+1); }
          if (Math.abs(df) < 1e-15) break;
          var rn = cr - f/df; if (Math.abs(rn-cr) < 1e-9) { cr=rn; break; } cr=rn;
        }
        return cr * n * 100;
      }
      el('rFeeBox').style.display  = '';
      el('rFees').textContent      = d0(totalFees);
      el('rCostBox').style.display = '';
      el('rCost').textContent      = d0(totCost);
      el('rCmpBox').style.display  = '';
      el('rCmp').textContent       = compRate().toFixed(2) + '%';
    } else {
      el('rFeeBox').style.display  = 'none';
      el('rCostBox').style.display = 'none';
      el('rCmpBox').style.display  = 'none';
    }

    if (ltype === 'io' && ioPer > 0) {
      el('ioMetrics').classList.remove('hidden');
      el('rIORepay').textContent = d2(ioPmt);
      el('rPIAfter').textContent = d2(piPmt);
    } else {
      el('ioMetrics').classList.add('hidden');
    }

    // ── Banners — use classList
    var saved  = baseInt - totInt;
    var tSaved = basePers - actPers;
    if (extra > 0 && saved > 100) {
      el('bannerExtra').classList.remove('hidden');
      el('bnExtraAmt').textContent   = d2(extra);
      el('bnExtraSaved').textContent = d0(saved);
      el('bnExtraTime').textContent  = fmtTime(tSaved, freq);
    } else {
      el('bannerExtra').classList.add('hidden');
    }

    if (offset > 0) {
      var noOff  = buildSched(P, rate, term, freq, extra, 0, 'pi', 0);
      var oSaved = noOff.totalInterest - totInt;
      var oTime  = noOff.rows.length - actPers;
      el('bannerOffset').classList.remove('hidden');
      el('bnOffAmt').textContent    = d0(offset);
      el('bnOffSaved').textContent  = d0(oSaved);
      el('bnOffTime').textContent   = fmtTime(oTime, freq);
    } else {
      el('bannerOffset').classList.add('hidden');
    }

    if (startV) {
      var sp    = startV.split('-');
      var sDate = new Date(parseInt(sp[0]), parseInt(sp[1])-1, 1);
      var payoff;
      if      (freq === 'monthly')     { payoff = new Date(sDate); payoff.setMonth(payoff.getMonth() + actPers); }
      else if (freq === 'fortnightly') { payoff = new Date(sDate.getTime() + actPers * 14 * 86400000); }
      else                             { payoff = new Date(sDate.getTime() + actPers * 7  * 86400000); }
      el('bannerPayoff').classList.remove('hidden');
      el('bnPayoff').textContent     = payoff.toLocaleDateString('en-AU', {month:'long', year:'numeric'});
      el('bnPayoffNote').textContent = tSaved > 0 ? ' That is ' + fmtTime(tSaved, freq) + ' earlier than standard.' : '';
    } else {
      el('bannerPayoff').classList.add('hidden');
    }

    // ── Breakdown table
    function trow(lbl, pp, life) {
      var mo  = freq==='weekly' ? pp*52/12 : freq==='fortnightly' ? pp*26/12 : pp;
      var ann = mo * 12;
      var pc  = totCost > 0 ? (life/totCost*100) : 0;
      return '<tr><td>'+lbl+'</td>'
           + '<td style="text-align:right">'+d2(pp)+'</td>'
           + '<td style="text-align:right">'+d2(mo)+'</td>'
           + '<td style="text-align:right">'+d0(ann)+'</td>'
           + '<td style="text-align:right">'+d0(life)+'</td>'
           + '<td style="text-align:right">'+pc.toFixed(1)+'%</td></tr>';
    }
    var rows = '';
    rows += trow('Minimum Repayment', dispPmt, dispPmt * actPers);
    if (extra > 0) rows += trow('+ Extra Repayment', extra, extra * actPers);
    rows += trow('Principal Repayment', actualS.rows[0] ? actualS.rows[0].principal : 0, P);
    rows += trow('Interest', actualS.rows[0] ? actualS.rows[0].interest : 0, totInt);
    if (mFee > 0)   rows += trow('Monthly Fee', mFeePerPer, totMFees);
    if (estFee > 0) rows += '<tr><td>Establishment Fee (upfront)</td>'
                          + '<td style="text-align:right">—</td><td style="text-align:right">—</td>'
                          + '<td style="text-align:right">—</td>'
                          + '<td style="text-align:right">'+d0(estFee)+'</td>'
                          + '<td style="text-align:right">'+(estFee/totCost*100).toFixed(1)+'%</td></tr>';
    if (offset > 0) {
      var noOff2 = buildSched(P, rate, term, freq, extra, 0, 'pi', 0);
      var oSv2   = noOff2.totalInterest - totInt;
      rows += '<tr style="background:var(--blue-light)"><td style="color:var(--blue);font-weight:600">&#8627; Offset Saving ('+d0(offset)+')</td>'
            + '<td style="text-align:right">—</td><td style="text-align:right">—</td>'
            + '<td style="text-align:right;color:var(--blue)">'+d0(oSv2/term)+'/yr</td>'
            + '<td style="text-align:right;color:var(--blue)">&#8722;'+d0(oSv2)+'</td>'
            + '<td style="text-align:right;color:var(--blue)">'+(oSv2/noOff2.totalInterest*100).toFixed(1)+'% less</td></tr>';
    }
    rows += '<tr class="total-row"><td>Total Cost of Loan</td>'
          + '<td style="text-align:right">—</td><td style="text-align:right">—</td><td style="text-align:right">—</td>'
          + '<td style="text-align:right">'+d0(totCost)+'</td>'
          + '<td style="text-align:right">100%</td></tr>';
    el('tBody').innerHTML = rows;

    // ── Chart
    drawChart(buildChartArrays(actualS.rows, P, term, freq));

    if (!el('amortSection').classList.contains('hidden')) renderAmort();
  }

  // ── Clear ─────────────────────────────────────────────────────────────────
  function clearAll() {
    el('rRepay').textContent    = '—';
    el('rTotal').textContent    = '—';
    el('rInterest').textContent = '—';
    el('tBody').innerHTML = '<tr><td colspan="6" style="color:var(--text-light);font-style:italic;text-align:center;padding:18px">Enter loan details to see results</td></tr>';
    ['bannerExtra','bannerOffset','bannerPayoff'].forEach(function(id){ el(id).classList.add('hidden'); });
    if (chartObj) { chartObj.destroy(); chartObj = null; }
    el('amortBody').innerHTML = '';
  }

  function doReset() {
    ['fLoanAmt','fRate','fTerm','fExtra','fOffset','fIOPer','fEstFee','fMFee'].forEach(function(id){ el(id).value=''; });
    el('fStart').value = '';
    el('rMonthly').checked = true;
    el('rPI').checked = true;
    el('ioBlock').classList.add('hidden');
    el('ioMetrics').classList.add('hidden');
    el('amortSection').classList.add('hidden');
    el('amortBtn').textContent = ' Show Amortisation Schedule';
    clearAll();
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  // ── Amort table ───────────────────────────────────────────────────────────
  function renderAmort() {
    var freq   = getFreq();
    var n      = ppy(freq);
    var startV = el('fStart').value;
    var sDate  = null;
    if (startV) { var sp=startV.split('-'); sDate=new Date(parseInt(sp[0]),parseInt(sp[1])-1,1); }
    var unit = freq==='weekly'?'Week':freq==='fortnightly'?'Fortnight':'Month';
    var html = '', yr = 0;
    savedRows.forEach(function(row, i) {
      var y = Math.floor(i / n) + 1;
      if (y !== yr) { yr=y; html+='<tr class="yr"><td colspan="7">Year '+y+'</td></tr>'; }
      var lbl = unit + ' ' + (i+1);
      if (sDate) {
        var d;
        if      (freq==='monthly')     { d=new Date(sDate); d.setMonth(d.getMonth()+i); }
        else if (freq==='fortnightly') { d=new Date(sDate.getTime()+i*14*86400000); }
        else                           { d=new Date(sDate.getTime()+i*7*86400000); }
        lbl = d.toLocaleDateString('en-AU',{month:'short',year:'numeric'});
      }
      html += '<tr>'
            + '<td>'+(i+1)+'</td>'
            + '<td>'+lbl+'</td>'
            + '<td>'+d0(row.opening)+'</td>'
            + '<td style="color:var(--red)">'+d0(row.interest)+'</td>'
            + '<td>'+d0(row.principal)+'</td>'
            + '<td>'+(row.extra>0?d0(row.extra):'—')+'</td>'
            + '<td>'+d0(row.closing)+'</td>'
            + '</tr>';
    });
    el('amortBody').innerHTML = html;
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function exportCSV() {
    if (!savedRows.length) { alert('Please calculate first.'); return; }
    var P    = parseFloat(el('fLoanAmt').value)||0;
    var rate = parseFloat(el('fRate').value)||0;
    var term = parseFloat(el('fTerm').value)||0;
    var lines= ['Loan Amount,'+P,'Interest Rate,'+rate+'%','Loan Term,'+term+' years','','Component,Per Period,Monthly,Annual,Loan Life'];
    el('tBody').querySelectorAll('tr').forEach(function(tr){
      var cells=[]; tr.querySelectorAll('td').forEach(function(td){ cells.push('"'+td.textContent.trim()+'"'); });
      if(cells.length) lines.push(cells.join(','));
    });
    var a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(lines.join('\n'));
    a.download='home-loan-summary.csv'; a.click();
  }

  function exportAmortCSV() {
    if (!savedRows.length) { alert('Please calculate first.'); return; }
    var freq  = getFreq();
    var startV= el('fStart').value;
    var sDate = null;
    if (startV) { var sp=startV.split('-'); sDate=new Date(parseInt(sp[0]),parseInt(sp[1])-1,1); }
    var unit  = freq==='weekly'?'Week':freq==='fortnightly'?'Fortnight':'Month';
    var csv   = 'Period,Date,Opening Balance,Interest,Principal,Extra Repayment,Closing Balance,Cumulative Interest,Cumulative Principal\n';
    var cumI  = 0, cumP = 0;
    savedRows.forEach(function(row,i){
      var lbl = unit+' '+(i+1);
      if (sDate) {
        var d;
        if      (freq==='monthly')     { d=new Date(sDate); d.setMonth(d.getMonth()+i); }
        else if (freq==='fortnightly') { d=new Date(sDate.getTime()+i*14*86400000); }
        else                           { d=new Date(sDate.getTime()+i*7*86400000); }
        lbl=d.toLocaleDateString('en-AU',{month:'short',year:'numeric'});
      }
      cumI+=row.interest; cumP+=row.principal+row.extra;
      csv+=(i+1)+',"'+lbl+'",'+row.opening.toFixed(2)+','+row.interest.toFixed(2)+','+row.principal.toFixed(2)+','+row.extra.toFixed(2)+','+row.closing.toFixed(2)+','+cumI.toFixed(2)+','+cumP.toFixed(2)+'\n';
    });
    var a=document.createElement('a');
    a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download='home-loan-amortisation.csv'; a.click();
  }

  // ── Time formatter ────────────────────────────────────────────────────────
  function fmtTime(periods, freq) {
    if (periods <= 0) return 'no time';
    var n   = ppy(freq);
    var yrs = Math.floor(periods/n);
    var rem = periods % n;
    var u   = freq==='weekly'?'week':freq==='fortnightly'?'fortnight':'month';
    var s   = yrs > 0 ? yrs+' year'+(yrs!==1?'s':'') : '';
    if (rem > 0) { if(s) s+=' and '; s+=rem+' '+u+(rem!==1?'s':''); }
    return s || 'no time';
  }

  // ── Collapsible ───────────────────────────────────────────────────────────
  function initCollapsible() {
    var btn  = el('addlBtn');
    var body = el('addlBody');
    function setOpen(open) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) body.classList.remove('collapsed'); else body.classList.add('collapsed');
    }
    btn.addEventListener('click', function() { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
    setOpen(window.innerWidth >= 900);
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    initCollapsible();

    var t = new Date();
    el('fStart').value   = t.getFullYear() + '-' + String(t.getMonth()+1).padStart(2,'0');
    el('fLoanAmt').value = '500000';
    el('fRate').value    = '6.00';
    el('fTerm').value    = '30';
    calculate();

    // Loan amount slider sync
    (function() {
      var ni = el('fLoanAmt'), sr = el('loanRange');
      if (ni && sr) {
        ni.addEventListener('input', function() { sr.value = Math.min(parseFloat(ni.value) || 0, 3000000); });
        sr.addEventListener('input', function() { ni.value = sr.value; calculate(); });
      }
    })();

    ['fLoanAmt','fRate','fTerm','fExtra','fOffset','fIOPer','fStart','fEstFee','fMFee']
      .forEach(function(id){ el(id).addEventListener('input', calculate); });

    document.querySelectorAll('input[name="freq"], input[name="ltype"]')
      .forEach(function(r){ r.addEventListener('change', calculate); });

    el('rIO').addEventListener('change', function() { el('ioBlock').classList.remove('hidden'); calculate(); });
    el('rPI').addEventListener('change', function() { el('ioBlock').classList.add('hidden');    calculate(); });

    el('btnReset1').addEventListener('click', doReset);
    el('btnStartOver').addEventListener('click', doReset);
    el('btnCSV').addEventListener('click', exportCSV);
    el('btnAmortCSV').addEventListener('click', exportAmortCSV);

    el('btnSaveSnapshot').addEventListener('click', function() {
      var blob = new Blob([document.documentElement.outerHTML], {type:'text/html;charset=utf-8'});
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      var d = new Date();
      a.download = 'home-loan-calculator-' + d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + '.html';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });

    el('amortBtn').addEventListener('click', function() {
      var sec  = el('amortSection');
      var open = sec.classList.contains('hidden');
      if (open) { sec.classList.remove('hidden'); renderAmort(); this.textContent=' Hide Amortisation Schedule'; }
      else       { sec.classList.add('hidden');                   this.textContent=' Show Amortisation Schedule'; }
    });
  });

})();
