(function(){
'use strict';
function g(id){return document.getElementById(id);}
function fmt2(n){return '$'+Math.abs(n).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmt0(n){return '$'+Math.round(Math.abs(n)).toLocaleString('en-AU');}
function fmtP(n){return n.toFixed(2)+'%';}
function getFreq(){return document.querySelector('input[name="freq"]:checked').value;}
function ppy(f){return f==='weekly'?52:f==='fortnightly'?26:12;}
function fLbl(f){return f==='weekly'?'Weekly':f==='fortnightly'?'Fortnightly':'Monthly';}
function toMo(v,f){return f==='weekly'?v*52/12:f==='fortnightly'?v*26/12:v;}


function buildSched(P,rate,yrs,freq,extra,balloon){
  var n=ppy(freq),r=rate/100/n,tot=yrs*n,eff=P-balloon;
  var pmt=r===0?eff/tot:eff*(r*Math.pow(1+r,tot))/(Math.pow(1+r,tot)-1);
  var bal=P,rows=[],totInt=0;
  for(var i=0;i<tot;i++){
    if(bal<0.005)break;
    var intr=bal*r;
    var prin=i===tot-1?Math.max(bal-intr-balloon,0):Math.min(pmt-intr,bal-balloon);
    if(prin<0)prin=0;
    var ext=i<tot-1?Math.min(extra,Math.max(bal-prin-balloon,0)):0;
    var close=Math.max(bal-prin-ext,0);
    if(i===tot-1&&balloon>0)close=Math.max(close-balloon,0);
    totInt+=intr;
    rows.push({opening:bal,interest:intr,principal:prin,extra:ext,repay:pmt,closing:close});
    bal=close;
    if(bal<0.005&&extra>0)break;
  }
  return{rows:rows,totalInterest:totInt,pmt:pmt};
}


var lineChart=null,lastCD=null;


function chartData(rows,P,yrs,freq){
  var n=ppy(freq),labels=[],debt=[],annInt=[null],cumPaid=[0];
  for(var y=0;y<=yrs;y++){
    labels.push('Yr '+y);
    if(y===0){debt.push(P);continue;}
    var ei=Math.min(y*n-1,rows.length-1);
    debt.push(rows[ei]?Math.round(rows[ei].closing):0);
    var yi=0,yp=0;
    for(var k=(y-1)*n;k<=ei&&k<rows.length;k++){yi+=rows[k].interest;yp+=rows[k].repay+rows[k].extra;}
    annInt.push(Math.round(yi));
    cumPaid.push(Math.round(cumPaid[y-1]+yp));
  }
  return{labels:labels,debt:debt,annInt:annInt,cumPaid:cumPaid};
}


function mkGrad(ctx,ratio){
  var h=ctx.canvas.clientHeight||120,gr=ctx.createLinearGradient(0,0,0,h);
  var s=Math.max(0,Math.min(1,1-ratio));
  gr.addColorStop(0,'rgba(230,100,20,0.72)');
  gr.addColorStop(s,'rgba(230,100,20,0.72)');
  gr.addColorStop(s,'rgba(42,157,103,0.65)');
  gr.addColorStop(1,'rgba(42,157,103,0.65)');
  return gr;
}


function drawLine(cd){
  lastCD=cd;
  var canvas=g('myChart'),ctx=canvas.getContext('2d');
  if(lineChart){lineChart.destroy();lineChart=null;}
  var P0=parseFloat(g('fAmt').value)||0,lastIdx=-1,rafBusy=false;
  var sp={id:'split',afterEvent:function(chart,args){
    var e=args.event;
    if(e.type!=='mousemove'&&e.type!=='mouseout')return;
    var act=chart.tooltip._active,ni=(act&&act.length)?act[0].index:-1;
    if(ni===lastIdx)return;lastIdx=ni;
    if(rafBusy)return;rafBusy=true;
    requestAnimationFrame(function(){
      rafBusy=false;
      var ratio=0;
      if(lastIdx>=0&&lastCD&&lastCD.debt[lastIdx]!=null)ratio=P0>0?(P0-lastCD.debt[lastIdx])/P0:0;
      chart.data.datasets[0].backgroundColor=mkGrad(ctx,ratio);
      chart.update('none');
    });
  }};
  lineChart=new Chart(ctx,{
    type:'line',
    data:{labels:cd.labels,datasets:[
      {label:'Balance',data:cd.debt,borderColor:'#e6641e',backgroundColor:mkGrad(ctx,0),fill:'origin',tension:0.4,pointRadius:1,pointHoverRadius:5,borderWidth:2.5},
      {label:'_p',data:cd.debt,borderWidth:0,pointRadius:0,pointHoverRadius:0,backgroundColor:'transparent',borderColor:'transparent',fill:false},
      {label:'_i',data:cd.annInt,borderWidth:0,pointRadius:0,pointHoverRadius:0,backgroundColor:'transparent',borderColor:'transparent',fill:false},
      {label:'_c',data:cd.cumPaid,borderWidth:0,pointRadius:0,pointHoverRadius:0,backgroundColor:'transparent',borderColor:'transparent',fill:false}
    ]},
    options:{
      responsive:true,interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false},tooltip:{
        backgroundColor:'rgba(30,20,50,0.92)',titleColor:'#fff',bodyColor:'rgba(255,255,255,0.88)',padding:11,cornerRadius:8,position:'nearest',xAlign:'left',yAlign:'bottom',
        callbacks:{
          label:function(item){
            var l=item.dataset.label,v='$'+Math.round(item.parsed.y).toLocaleString('en-AU');
            var P2=parseFloat(g('fAmt').value)||0;
            if(l==='Balance')return '  Remaining balance: '+v;
            if(l==='_p')return '  Principal repaid: $'+Math.round(P2-item.parsed.y).toLocaleString('en-AU');
            if(l==='_i'&&item.parsed.y)return '  Interest this year: '+v;
            if(l==='_c')return '  Total paid to date: '+v;
            return null;
          },
          labelColor:function(item){
            var l=item.dataset.label;
            if(l==='Balance')return{borderColor:'#e6641e',backgroundColor:'#e6641e',borderRadius:2};
            if(l==='_p')return{borderColor:'#2a9d67',backgroundColor:'#2a9d67',borderRadius:2};
            if(l==='_i')return{borderColor:'#e53935',backgroundColor:'#e53935',borderRadius:2};
            if(l==='_c')return{borderColor:'#888',backgroundColor:'#888',borderRadius:2};
            return{borderColor:'transparent',backgroundColor:'transparent'};
          }
        }
      }},
      scales:{
        x:{grid:{display:false},ticks:{font:{size:10},color:'#6c7a89',maxTicksLimit:16}},
        y:{grid:{color:'rgba(0,0,0,.05)'},max:Math.ceil((parseFloat(g('fAmt').value)||0)*1.25/1000)*1000,ticks:{font:{size:10},color:'#6c7a89',callback:function(v){return '$'+v.toLocaleString('en-AU');}}}
      }
    },
    plugins:[sp]
  });
  var midIdx=Math.floor(cd.labels.length/2);
  lastIdx=midIdx;
  var ratio=P0>0?(P0-(cd.debt[midIdx]||0))/P0:0;
  lineChart.data.datasets[0].backgroundColor=mkGrad(ctx,ratio);
  lineChart.update('none');
}


function calculate(){
  var P      = parseFloat(g('fAmt').value)||0;
  var rate   = parseFloat(g('fRate').value)||0;
  var yrs    = parseFloat(g('fTerm').value)||0;
  var extra  = parseFloat(g('fExtra').value)||0;
  var estFee = parseFloat(g('fEstFee').value)||0;
  var mFee   = parseFloat(g('fMFee').value)||0;
  var balloon= Math.min(parseFloat(g('fBalloon').value)||0,P*0.9);
  var freq   = getFreq();
  var n      = ppy(freq);
  var sv     = g('fStart').value;

  if(P<=0||rate<=0||yrs<=0){
    g('rRepay').innerHTML='&#8212;';g('rTotal').innerHTML='&#8212;';g('rInterest').innerHTML='&#8212;';
    g('rFeeBox').style.display='none';g('rCostBox').style.display='none';g('rCmpBox').style.display='none';
    ['bannerExtra','bannerBalloon','bannerPayoff'].forEach(function(id){g(id).classList.add('hidden');});
    g('tBody').innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-light);font-style:italic;padding:20px">Enter loan details to see results</td></tr>';
    g('amortBody').innerHTML='';
    return;
  }

  var sc=buildSched(P,rate,yrs,freq,extra,balloon);
  var rows=sc.rows,pmt=sc.pmt;
  var totInt=rows.reduce(function(a,r){return a+r.interest;},0);
  var nPers=rows.length;
  var mFeePerPer=freq==='monthly'?mFee:freq==='fortnightly'?mFee*12/26:mFee*12/52;
  var totMFees=mFee*(yrs*12);
  var totFees=estFee+totMFees;
  var totRepay=(pmt*nPers)+rows.reduce(function(a,r){return a+r.extra;},0)+balloon;
  var totCost=totRepay+totFees;

  function compRate(){
    var pmtAdj=pmt+mFeePerPer,cf=[-P+estFee];
    for(var i=0;i<nPers;i++)cf.push(pmtAdj);
    if(balloon>0)cf[cf.length-1]+=balloon;
    var r=rate/100/n;
    for(var it=0;it<80;it++){
      var f=cf[0],df=0;
      for(var j=1;j<cf.length;j++){f+=cf[j]/Math.pow(1+r,j);df-=j*cf[j]/Math.pow(1+r,j+1);}
      if(Math.abs(df)<1e-15)break;
      var rn=r-f/df;if(Math.abs(rn-r)<1e-9){r=rn;break;}r=rn;
    }
    return r*n*100;
  }

  g('rRepayLbl').textContent=fLbl(freq)+' Repayment';
  g('rRepay').textContent=fmt2(pmt);
  g('rTotal').textContent=fmt0(totRepay);
  g('rInterest').textContent=fmt0(totInt);

  if(totFees>0){
    g('rFeeBox').style.display='';g('rFees').textContent=fmt0(totFees);
    g('rCostBox').style.display='';g('rCost').textContent=fmt0(totCost);
    g('rCmpBox').style.display='';g('rCmp').textContent=fmtP(compRate());
  }else{
    g('rFeeBox').style.display='none';g('rCostBox').style.display='none';g('rCmpBox').style.display='none';
  }

  if(extra>0){
    var noEx=buildSched(P,rate,yrs,freq,0,balloon);
    var saved=noEx.totalInterest-totInt;
    var ms=Math.round((noEx.rows.length-nPers)*12/n);
    var ts=ms>=12?Math.floor(ms/12)+'yr '+(ms%12)+'m':ms+' months';
    g('bnExtraAmt').textContent=fmt2(extra);g('bnExtraSaved').textContent=fmt0(saved);g('bnExtraTime').textContent=ts;
    g('bannerExtra').classList.remove('hidden');
  }else{g('bannerExtra').classList.add('hidden');}

  if(balloon>0){g('bnBalloon').textContent=fmt0(balloon);g('bannerBalloon').classList.remove('hidden');}
  else{g('bannerBalloon').classList.add('hidden');}

  if(sv){
    var pts=sv.split('-'),sd=new Date(parseInt(pts[0]),parseInt(pts[1])-1,1);
    sd.setMonth(sd.getMonth()+Math.round(nPers*12/n));
    var mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    g('bnPayoff').textContent=mn[sd.getMonth()]+' '+sd.getFullYear();
    g('bannerPayoff').classList.remove('hidden');
  }else{g('bannerPayoff').classList.add('hidden');}

  function trow(lbl,pp,life){
    var mo=toMo(pp,freq),ann=mo*12,pct=totCost>0?(life/totCost*100):0;
    return '<tr><td>'+lbl+'</td><td>'+fmt2(pp)+'</td><td>'+fmt2(mo)+'</td><td>'+fmt0(ann)+'</td><td>'+fmt0(life)+'</td><td>'+pct.toFixed(1)+'%</td></tr>';
  }
  var t=trow('Principal Repayment',rows[0].principal,P);
  t+=trow('Interest',rows[0].interest,totInt);
  if(mFee>0)t+=trow('Monthly Fee',mFeePerPer,totMFees);
  if(estFee>0)t+='<tr><td>Establishment Fee (upfront)</td><td>&#8212;</td><td>&#8212;</td><td>&#8212;</td><td>'+fmt0(estFee)+'</td><td>'+(estFee/totCost*100).toFixed(1)+'%</td></tr>';
  if(balloon>0)t+='<tr><td>Balloon / Residual (at end)</td><td>&#8212;</td><td>&#8212;</td><td>&#8212;</td><td>'+fmt0(balloon)+'</td><td>'+(balloon/totCost*100).toFixed(1)+'%</td></tr>';
  t+='<tr class="total-row"><td>Total Cost of Loan</td><td>&#8212;</td><td>&#8212;</td><td>&#8212;</td><td>'+fmt0(totCost)+'</td><td>100%</td></tr>';
  g('tBody').innerHTML=t;

  drawLine(chartData(rows,P,yrs,freq));

  var mn2=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var sd2=null;
  if(sv){var p2=sv.split('-');sd2=new Date(parseInt(p2[0]),parseInt(p2[1])-1,1);}
  var ah='',lastYr=-1;
  for(var i=0;i<rows.length;i++){
    var row=rows[i],yr=Math.floor(i/n)+1;
    if(yr!==lastYr){ah+='<tr class="yr-row"><td colspan="7">Year '+yr+'</td></tr>';lastYr=yr;}
    var pl='';
    if(sd2){
      var step=freq==='monthly'?i:freq==='fortnightly'?Math.round(i*6/13):Math.round(i*3/13);
      var pd=new Date(sd2.getFullYear(),sd2.getMonth()+step,1);
      pl=mn2[pd.getMonth()]+' '+pd.getFullYear();
    }else{pl=fLbl(freq)+' '+(i+1);}
    ah+='<tr><td>'+(i+1)+'</td><td>'+pl+'</td><td>'+fmt0(row.opening)+'</td><td>'+fmt2(row.interest)+'</td><td>'+fmt2(row.principal)+'</td><td>'+(row.extra>0?fmt2(row.extra):'&#8212;')+'</td><td>'+fmt0(row.closing)+'</td></tr>';
  }
  g('amortBody').innerHTML=ah;
}


document.addEventListener('DOMContentLoaded',function(){

  (function(){
    var ni=g('fAmt'),sr=g('amtRange');
    if(ni&&sr){
      ni.addEventListener('input',function(){sr.value=Math.min(parseFloat(ni.value)||0,100000);});
      sr.addEventListener('input',function(){ni.value=sr.value;calculate();});
    }
  })();
  var now=new Date();
  g('fStart').value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  g('fAmt').value='20000';g('amtRange').value='20000';
  g('fRate').value='15';
  g('fTerm').value='5';
  calculate();
  var b=g('addlBody');
  if(window.innerWidth<900)b.classList.add('collapsed'),g('addlBtn').setAttribute('aria-expanded','false');

  g('addlBtn').addEventListener('click',function(){
    var b=g('addlBody'),exp=this.getAttribute('aria-expanded')==='true';
    this.setAttribute('aria-expanded',String(!exp));
    b.classList.toggle('collapsed',exp);
  });


  g('amortToggle').addEventListener('click',function(){
    var s=g('amortSection'),hidden=s.classList.toggle('hidden');
    var ico='<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg> ';
    this.innerHTML=ico+(hidden?'Show Repayment Schedule':'Hide Repayment Schedule');
  });


  function doReset(){
    document.querySelectorAll('.collapsible-header').forEach(function(h){
      h.setAttribute('aria-expanded','true');
      var body=h.nextElementSibling;
      if(body&&body.classList.contains('collapsible-body'))body.classList.remove('collapsed');
    });
    g('fAmt').value='20000';g('amtRange').value='20000';
    g('fRate').value='15';
    g('fTerm').value='5';
    g('fExtra').value='';
    g('fEstFee').value='';
    g('fMFee').value='';
    g('fBalloon').value='';
    g('fPurpose').value='';
    var now=new Date();
    g('fStart').value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
    g('rMonthly').checked=true;
    g('rRepay').innerHTML='&#8212;';g('rTotal').innerHTML='&#8212;';g('rInterest').innerHTML='&#8212;';
    g('rFeeBox').style.display='none';g('rCostBox').style.display='none';g('rCmpBox').style.display='none';
    ['bannerExtra','bannerBalloon','bannerPayoff'].forEach(function(id){g(id).classList.add('hidden');});
    g('tBody').innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-light);font-style:italic;padding:20px">Enter loan details to see results</td></tr>';
    g('amortBody').innerHTML='';
    calculate();
  }
  g('btnReset').addEventListener('click',doReset);
  g('btnStartOver').addEventListener('click',function(){doReset();window.scrollTo({top:0,behavior:'smooth'});});


  function dlCSV(name,content){
    var blob=new Blob([content],{type:'text/csv'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=name;a.click();
  }


  g('btnExportSummary').addEventListener('click',function(){
    var P=g('fAmt').value,R=g('fRate').value,T=g('fTerm').value;
    if(!P||!R||!T)return;
    var purpose=g('fPurpose').options[g('fPurpose').selectedIndex].text;
    var lines=[
      'Personal Loan Repayment Calculator - Summary',
      'Loan Purpose,'+purpose,
      'Loan Amount,$'+P,
      'Annual Rate,'+R+'%',
      'Term,'+T+' years',
      'Frequency,'+fLbl(getFreq()),
      'Repayment,'+g('rRepay').textContent,
      'Total Repayments,'+g('rTotal').textContent,
      'Total Interest,'+g('rInterest').textContent
    ];
    if(g('rFeeBox').style.display!=='none')lines.push('Total Fees,'+g('rFees').textContent);
    if(g('rCostBox').style.display!=='none')lines.push('Total Cost,'+g('rCost').textContent);
    if(g('rCmpBox').style.display!=='none')lines.push('Comparison Rate (est.),'+g('rCmp').textContent);
    dlCSV('personal-loan-summary.csv',lines.join('\n'));
  });


  g('btnExportSchedule').addEventListener('click',function(){
    var trs=g('amortBody').querySelectorAll('tr:not(.yr-row)');
    if(!trs.length)return;
    var lines=['#,Period,Opening Balance,Interest,Principal,Extra,Closing Balance'];
    trs.forEach(function(tr){
      lines.push(Array.from(tr.querySelectorAll('td')).map(function(td){return td.textContent.replace(/,/g,'');}).join(','));
    });
    dlCSV('personal-loan-schedule.csv',lines.join('\n'));
  });


  g('btnSaveSnapshot').addEventListener('click',function(){
    var blob=new Blob([document.documentElement.outerHTML],{type:'text/html;charset=utf-8'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);
    var d=new Date();
    a.download='personal-loan-calculator-'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'.html';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
  });


  ['fAmt','fRate','fTerm','fExtra','fEstFee','fMFee','fBalloon','fStart','fPurpose'].forEach(function(id){
    g(id).addEventListener('input',calculate);
    g(id).addEventListener('change',calculate);
  });
  document.querySelectorAll('input[name="freq"]').forEach(function(r){r.addEventListener('change',calculate);});
});

})();


/* ── Topbar: inject Return + Dark Mode buttons ───────────────────────────
   Runs once after DOM is ready. Buttons are injected into .topbar-right.  */
(function () {
  var ARROW = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>';
  var SUN   = '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  var MOON  = '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  var html   = document.documentElement;
  var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  function applyTheme(dark) {
    isDark = dark;
    html.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
  applyTheme(isDark);

  function injectButtons() {
    var container = document.querySelector('.topbar-right');
    if (!container || container.querySelector('.btn-home')) return; // already injected

    var btnHome = document.createElement('a');
    btnHome.href = 'index.html';
    btnHome.className = 'btn-home';
    btnHome.title = 'Back to all calculators';
    btnHome.innerHTML = ARROW + '<span class="btn-home-label">All Calculators</span>';
    container.appendChild(btnHome);

    var btnTheme = document.createElement('button');
    btnTheme.type = 'button';
    btnTheme.className = 'btn-theme';
    btnTheme.setAttribute('aria-label', 'Toggle dark mode');
    btnTheme.innerHTML = SUN + MOON;
    btnTheme.addEventListener('click', function () { applyTheme(!isDark); });
    container.appendChild(btnTheme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButtons);
  } else {
    injectButtons();
  }
})();
