var superChart = null;
var summaryRows = [];
var scheduleRows = [];
function n(id) {
  var v = parseFloat(document.getElementById(id).value);
  return isNaN(v) ? 0 : v;
}

function radio(name) {
  var els = document.getElementsByName(name);
  for (var i = 0; i < els.length; i++) { if (els[i].checked) return els[i].value; }
  return "";
}

function set(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = val;
}

function fmt(v) {
  return "$" + Math.round(v).toLocaleString("en-AU");
}

// ── NCC bring-forward logic (2025-26 ATO caps) ──────────────────────────────────────────
function nccMaxCap(projectedBal, age) {
  if (age >= 75) return 120000;
  if (projectedBal >= 1900000) return 0;
  if (projectedBal >= 1780000) return 120000;
  if (projectedBal >= 1660000) return 240000;
  return 360000;
}

function validateNCC(projectedBal, ncc, age) {
  var status = document.getElementById("fNCCStatus");
  if (!status) return;
  if (ncc <= 0) { status.classList.add("hidden"); return; }

  var cap    = nccMaxCap(projectedBal, age);
  var isOver = ncc > cap;
  var balFmt = "$" + Math.round(projectedBal).toLocaleString("en-AU");
  var capFmt = "$" + cap.toLocaleString("en-AU");
  var msg    = "";

  if (cap === 0) {
    msg = "⚠ At age " + age + " your projected balance (" + balFmt + ") reaches $1.9m — NCCs not permitted. Contribution will not be applied.";
  } else if (isOver) {
    msg = "⚠ $" + ncc.toLocaleString("en-AU") + " exceeds your bring-forward cap of " + capFmt + " (projected balance " + balFmt + " at age " + age + "). Only " + capFmt + " will be applied.";
  } else if (age >= 75) {
    msg = "✓ Within annual cap (" + capFmt + "). No bring-forward at age 75+.";
  } else if (projectedBal >= 1780000) {
    msg = "✓ Within annual cap (" + capFmt + "). Projected balance limits bring-forward eligibility.";
  } else if (ncc > 240000) {
    msg = "✓ 3-year bring-forward ($360,000 cap). Projected balance at age " + age + ": " + balFmt + ".";
  } else if (ncc > 120000) {
    var bfLabel = cap >= 360000 ? "3-year" : "2-year";
    msg = "✓ Using " + bfLabel + " bring-forward. Cap: " + capFmt + ". Projected balance: " + balFmt + ".";
  } else {
    msg = "✓ Within standard annual cap ($120,000). Projected balance at age " + age + ": " + balFmt + ".";
  }

  status.textContent = msg;
  status.classList.remove("hidden");
  if (cap === 0 || isOver) {
    status.style.background = "#fdecea"; status.style.color = "#b71c1c"; status.style.border = "1px solid #f5c6c6";
  } else {
    status.style.background = "#f0faf5"; status.style.color = "#1b5e38"; status.style.border = "1px solid #b2dfcc";
  }
}

function calc() {
  var ca  = n("fCurrentAge");
  var ra  = n("fRetireAge");
  var sal = n("fSalary");
  var sr  = n("fSuperRate") / 100;
  var sg  = n("fSalGrowth") / 100;
  var bal = n("fCurrentBalance");
  var rr  = (n("fReturnRate") - n("fFee")) / 100;
  var rrr = (n("fReturnRetire") - n("fFee")) / 100;
  var ct  = n("fTax") / 100;
  var inf = n("fInflation") / 100;
  var dw  = n("fDrawdown");
  var le  = n("fLifeExpect");
  var vf  = radio("volFreq");
  var volSw = document.getElementById("volSwitch"); var va = volSw && volSw.checked ? n("fVolContrib") : 0;
  var im  = radio("inflMode");
  var nccSw = document.getElementById("nccSwitch"); var ncc = nccSw && nccSw.checked ? n("fNCC") : 0;
  var nccAge = parseInt(document.getElementById("fNCCAge").value) || ca;

  if (ca < 15 || ra <= ca) return;

  var ytr = Math.floor(ra - ca);
  var ril = document.getElementById("retireInfoLeft");
  if (ril) { ril.textContent = ytr + (ytr === 1 ? " year to retirement" : " years to retirement"); ril.classList.remove("hidden"); }
  var av = 0;
  if (vf === "monthly") av = va * 12;
  else if (vf === "annual") av = va;

  var labels=[], bArr=[], dArr=[], cArr=[];
  var tEmp=0, tVol=0, tGrw=0, cum=0;
  var rows = "";
  var cs = sal;
  scheduleRows = ["Age,Phase,Salary,SGC After Tax,Voluntary After Tax,Growth,Closing Balance"];

  labels.push("Age " + ca);
  bArr.push(Math.round(bal));
  dArr.push(null);
  cArr.push(0);

  var nccApplied = false;
  if (ncc > 0 && nccAge <= ca && nccAge < ra) {
    var nccCap0 = nccMaxCap(bal, nccAge);
    var nccAmt0 = Math.min(ncc, nccCap0);
    if (nccAmt0 > 0) { bal += nccAmt0; cum += nccAmt0; }
    validateNCC(bal - nccAmt0, ncc, nccAge);
    nccApplied = true;
  }
  for (var y = 0; y < ytr; y++) {
    var age   = ca + y + 1;
    if (ncc > 0 && !nccApplied && age === nccAge && nccAge < ra) {
      var nccCap = nccMaxCap(bal, nccAge);
      var nccAmt = Math.min(ncc, nccCap);
      if (nccAmt > 0) { bal += nccAmt; cum += nccAmt; }
      validateNCC(bal - nccAmt, ncc, nccAge);
      nccApplied = true;
    }
    var sgn   = cs * sr * (1 - ct);
    var vn    = av * (1 - ct);
    var grw   = (bal + sgn/2 + vn/2) * rr;
    bal       = bal + sgn + vn + grw;
    tEmp += sgn; tVol += vn; tGrw += grw; cum += sgn + vn;
    labels.push("Age " + age);
    bArr.push(Math.round(bal));
    dArr.push(null);
    cArr.push(Math.round(cum));
    var rc = (age === ra) ? " class=\"milestone-row\"" : "";
    rows += "<tr" + rc + "><td>" + age + "</td><td>" + fmt(cs) + "</td><td>" + fmt(sgn) + "</td><td>" + (av > 0 ? fmt(vn) : "-") + "</td><td>" + fmt(grw) + "</td><td><strong>" + fmt(bal) + "</strong></td></tr>";
    scheduleRows.push([age,"Accumulation",Math.round(cs),Math.round(sgn),Math.round(vn),Math.round(grw),Math.round(bal)].join(","));
    cs = cs * (1 + sg);
  }

  var retBal  = bal;
  var dispBal = (im === "real") ? retBal / Math.pow(1 + inf, ytr) : retBal;
  var pt = 0;
  var nd      = dw > pt ? dw - pt : 0;
  var ry      = Math.floor(le - ra);
  var rb      = retBal;
  var lasts   = ra;

  rows += "<tr class=\"phase-row\"><td colspan=\"6\">Retirement Phase</td></tr>";

  for (var y2 = 0; y2 < ry; y2++) {
    var ar  = ra + y2 + 1;
    var gr2 = rb * rrr;
    var ndAdj = nd * Math.pow(1 + inf, y2);
    rb      = rb + gr2 - ndAdj;
    if (rb < 0) rb = 0;
    labels.push("Age " + ar);
    bArr.push(null);
    dArr.push(Math.round(rb));
    cArr.push(null);
    if (rb > 0) lasts = ar;
    rows += "<tr><td>" + ar + "</td><td>-</td><td>-</td><td>-</td><td>" + fmt(gr2) + "</td><td><strong>" + fmt(rb) + "</strong></td></tr>";
    scheduleRows.push([ar,"Retirement",0,0,0,Math.round(gr2),Math.round(rb)].join(","));
  }

  summaryRows = [
    "Metric,Value",
    "Balance at Retirement," + Math.round(retBal),
    "Balance at Retirement (Display)," + Math.round(dispBal),
    "Total Employer Contributions," + Math.round(tEmp),
    "Total Voluntary Contributions," + Math.round(tVol),
    "Total Investment Growth," + Math.round(tGrw),
    "Annual Drawdown," + dw,
    "Monthly Income," + Math.round(dw/12),
    "Super Lasts Until," + (rb > 0 ? le + "+" : lasts)
  ];

  set("rBalance",       fmt(dispBal));
  set("rBalanceSub",    im === "real" ? "In today’s dollars (inflation adjusted)" : "Nominal future value");
  set("rMonthlyIncome", fmt(dw/12) + "/mo");
  set("rLastsUntil",    rb > 0 ? "Age " + le + "+" : "Age " + lasts);
  set("rLastsUntilSub", rb > 0 ? "Outlasts life expectancy" : "Depleted before life expectancy");
  set("rEmployer",      fmt(tEmp));
  set("rVoluntary",     fmt(tVol));
  var vb = document.getElementById("volBox");
  if (vb) { if (tVol > 0) vb.classList.remove("hidden"); else vb.classList.add("hidden"); }
  var dispGrw = (im === "real") ? tGrw / Math.pow(1 + inf, ytr) : tGrw;
  set("rGrowth",        fmt(dispGrw));
  set("rDrawdownAmt",   fmt(dw) + "/yr");
  document.getElementById("rDrawdownInflSub").textContent = "Adjusts +" + (inf*100).toFixed(1) + "%/yr with inflation";
  document.getElementById("amortBody").innerHTML = rows || "<tr><td colspan=\"6\" style=\"text-align:center;color:var(--text-light);padding:14px\">No results yet</td></tr>";

  var chartBArr = bArr, chartDArr = dArr, chartCArr = cArr;
  if (im === "real" && inf > 0) {
    chartBArr = bArr.map(function(v, i) { return v === null ? null : Math.round(v / Math.pow(1 + inf, i)); });
    chartCArr = cArr.map(function(v, i) { return v === null ? null : Math.round(v / Math.pow(1 + inf, i)); });
    chartDArr = dArr.map(function(v, i) { return v === null ? null : Math.round(v / Math.pow(1 + inf, i)); });
  }

  if (ncc > 0 && !nccApplied) {
    validateNCC(n("fCurrentBalance"), ncc, nccAge);
  } else if (ncc <= 0) {
    var st = document.getElementById("fNCCStatus");
    if (st) st.classList.add("hidden");
  }
  drawChart(labels, chartBArr, chartDArr, chartCArr);
}

function drawChart(labels, bArr, dArr, cArr) {
  if (typeof Chart === "undefined") return;
  var canvas = document.getElementById("superChart");
  if (!canvas) return;
  if (superChart) { superChart.destroy(); superChart = null; }
  superChart = new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        { label: "Cumulative Contributions", data: cArr, borderColor: "rgba(63,127,181,1)",  backgroundColor: "rgba(63,127,181,0.65)",  fill: "origin", tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2, order: 2 },
        { label: "Superannuation Growth",    data: bArr, borderColor: "rgba(232,168,56,1)",  backgroundColor: "rgba(232,168,56,0.65)",  fill: "-1",     tension: 0.35, pointRadius: 1, pointHoverRadius: 5, borderWidth: 2.5, order: 1 },
        { label: "Retirement Balance",       data: dArr, borderColor: "rgba(42,157,103,1)",  backgroundColor: "rgba(42,157,103,0.65)",  fill: "origin", tension: 0.35, pointRadius: 1, pointHoverRadius: 5, borderWidth: 2.5, order: 1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(30,20,10,.93)", titleColor: "#fff", bodyColor: "rgba(255,255,255,.88)", padding: 11, cornerRadius: 8,
          callbacks: { label: function(item) { return item.dataset.label + ": $" + Math.round(item.parsed.y).toLocaleString("en-AU"); } }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#6c7a89", maxTicksLimit: 14 } },
        y: { grid: { color: "rgba(0,0,0,.05)" }, ticks: { font: { size: 10 }, color: "#6c7a89", callback: function(v) { return "$" + (v >= 1000000 ? (v/1000000).toFixed(1)+"m" : Math.round(v/1000)+"k"); } } }
      },
      animation: { duration: 350 }
    }
  });
}

function toggleVol() {
  var sw = document.getElementById("volSwitch");
  var on = sw && sw.checked;
  var fields = document.getElementById("volOnFields");
  if (fields) { if (on) fields.classList.remove("hidden"); else fields.classList.add("hidden"); }
  if (on) {
    var f = radio("volFreq");
    document.getElementById("volContribLabel").textContent = f === "monthly" ? "Monthly Voluntary Contribution" : "Annual Voluntary Contribution";
  }
}

function toggleNCC() {
  var sw = document.getElementById("nccSwitch");
  var on = sw && sw.checked;
  var fields = document.getElementById("nccFields");
  if (fields) { if (on) fields.classList.remove("hidden"); else fields.classList.add("hidden"); }
}

function toggleInflMode() {
  var real = radio("inflMode") === "real";
  document.getElementById("inflModeHint").textContent = real
    ? "Showing values in today’s dollars. Enter an inflation rate below to deflate future amounts."
    : "Nominal shows future dollar amounts at face value. Switch to Real to adjust for inflation and see what your balance is worth in today’s purchasing power.";
  calc();
}

function resetAll() {
  var d = {fCurrentAge:35,fRetireAge:67,fSalary:90000,fSuperRate:12,fSalGrowth:2.5,fCurrentBalance:75000,fVolContrib:200,fReturnRate:7.5,fReturnRetire:5.5,fFee:0.60,fTax:15,fInflation:2.5,fDrawdown:65000,fLifeExpect:87,fNCC:0,fNCCAge:35};
  for (var k in d) document.getElementById(k).value = d[k];
  var volSw = document.getElementById("volSwitch"); if (volSw) volSw.checked = false;
  var nccSw = document.getElementById("nccSwitch"); if (nccSw) nccSw.checked = false;
  document.getElementById("volMonthly").checked = true;
  document.getElementById("fSalaryRange").value = 90000;
  document.getElementById("fCurrentBalanceRange").value = 75000;
  document.getElementById("inflNominal").checked = true;
  toggleVol(); toggleInflMode();
  var ri = document.getElementById("retireInfo"); if (ri) ri.classList.add("hidden");
  var ril = document.getElementById("retireInfoLeft"); if (ril) ril.classList.add("hidden");
  calc();
}

function dlCSV(rows, fname) {
  if (!rows.length) return;
  var a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(rows.join("\n"));
  a.download = fname;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// Wire inputs
["fCurrentAge","fRetireAge","fSalary","fSuperRate","fSalGrowth","fCurrentBalance","fVolContrib","fReturnRate","fReturnRetire","fFee","fTax","fInflation","fDrawdown","fLifeExpect","fNCC","fNCCAge"].forEach(function(id) {
  var el = document.getElementById(id); if (el) el.addEventListener("input", calc);
});

// Salary slider sync
(function(){
  var num = document.getElementById("fSalary");
  var rng = document.getElementById("fSalaryRange");
  if (!num || !rng) return;
  rng.addEventListener("input", function() { num.value = rng.value; calc(); });
  num.addEventListener("input", function() { if (parseFloat(num.value) <= 300000) rng.value = num.value; });
})();

// Balance slider sync
(function(){
  var num = document.getElementById("fCurrentBalance");
  var rng = document.getElementById("fCurrentBalanceRange");
  if (!num || !rng) return;
  rng.addEventListener("input", function() { num.value = rng.value; calc(); });
  num.addEventListener("input", function() { if (parseFloat(num.value) <= 1000000) rng.value = num.value; });
})();

["volMonthly","volAnnual"].forEach(function(id) {
  var el = document.getElementById(id); if (el) el.addEventListener("change", function() { toggleVol(); calc(); });
});

["inflNominal","inflReal"].forEach(function(id) {
  document.getElementById(id).addEventListener("change", function() { toggleInflMode(); calc(); });
});

document.getElementById("btnReset").addEventListener("click", resetAll);
document.getElementById("btnStartOver").addEventListener("click", resetAll);
document.getElementById("btnExportSummary").addEventListener("click",  function() { dlCSV(summaryRows,  "super-summary.csv"); });
document.getElementById("btnExportSchedule").addEventListener("click", function() { dlCSV(scheduleRows, "super-schedule.csv"); });
document.getElementById("btnSaveSnapshot").addEventListener("click", function() {
  var html = document.documentElement.outerHTML;
  var blob = new Blob([html], {type: "text/html;charset=utf-8"});
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  var d = new Date();
  a.download = "super-snapshot-" + d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0") + ".html";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
});

// Collapsibles
[["fundBtn","fundBody"],["volBtn","volBody"]].forEach(function(p) {
  var btn = document.getElementById(p[0]), body = document.getElementById(p[1]);
  btn.addEventListener("click", function() {
    var open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", open ? "false" : "true");
    body.classList.toggle("collapsed", open);
  });
  if (window.innerWidth < 900) { btn.setAttribute("aria-expanded","false"); body.classList.add("collapsed"); }
});

// Year-by-year toggle
document.getElementById("amortToggle").addEventListener("click", function() {
  var sec = document.getElementById("amortSection");
  var hidden = sec.classList.toggle("hidden");
  this.innerHTML = (hidden
    ? '<svg viewBox="0 0 24 24"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg> Show Year-by-Year Schedule'
    : '<svg viewBox="0 0 24 24"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg> Hide Year-by-Year Schedule');
});

// Init
toggleVol();
toggleNCC();
toggleInflMode();
(function(){
  var ca = document.getElementById("fCurrentAge");
  var na = document.getElementById("fNCCAge");
  if (ca && na && na.value === "35") na.value = ca.value;
})();
calc();


/* ── Topbar: inject Return + Dark Mode buttons ─────────────────────────────
   theme.js handles all dark-mode state via localStorage + data-theme.
   This snippet only builds and injects the button DOM.                      */
(function () {
  var ARROW = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>';
  var SUN   = '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  var MOON  = '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function injectButtons() {
    var container = document.querySelector('.topbar-right');
    if (!container || container.querySelector('.btn-home')) return;

    var btnHome = document.createElement('a');
    btnHome.href = 'index.html';
    btnHome.className = 'btn-home';
    btnHome.title = 'Back to all calculators';
    btnHome.innerHTML = ARROW + '<span class="btn-home-label">All Calculators</span>';
    container.appendChild(btnHome);

    var btnTheme = document.createElement('button');
    btnTheme.type = 'button';
    btnTheme.id = 'btnTheme';
    btnTheme.className = 'btn-theme';
    btnTheme.setAttribute('aria-label', 'Toggle dark mode');
    btnTheme.innerHTML = SUN + MOON;
    container.appendChild(btnTheme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButtons);
  } else {
    injectButtons();
  }
})();
