'use strict';
function el(id){return document.getElementById(id);}
function fmt2(n){return '$'+Math.abs(n).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fmt0(n){return '$'+Math.round(Math.abs(n)).toLocaleString('en-AU');}
function getFreq(){return document.querySelector('input[name=freq]:checked').value;}
function ppy(f){return f==='weekly'?52:f==='fortnightly'?26:12;}
function fLbl(f){return f==='weekly'?'Weekly':f==='fortnightly'?'Fortnightly':'Monthly';}


function calcPMT(P,annRate,yrs,freq){
  var n=ppy(freq),r=annRate/100/n,tot=yrs*n;
  if(r===0) return tot>0?P/tot:0;
  return P*r*Math.pow(1+r,tot)/(Math.pow(1+r,tot)-1);
}


// Build WITH offset — contrib>0 means offset grows each period
function buildWith(P,annRate,yrs,freq,offsetStart,contrib){
  var n=ppy(freq),r=annRate/100/n,tot=yrs*n;
  var pmt=calcPMT(P,annRate,yrs,freq);
  var moPerPeriod=12/n;
  var bal=P,offsetBal=Math.min(offsetStart,P),rows=[],totInt=0;
  for(var i=0;i<tot;i++){
    if(bal<0.005) break;
    var effP=Math.max(bal-offsetBal,0);
    var intr=effP*r;
    var prin=Math.min(pmt-intr,bal);
    if(prin<0) prin=0;
    var close=Math.max(bal-prin,0);
    totInt+=intr;
    rows.push({period:i+1,offsetBal:offsetBal,effectivePrin:effP,interest:intr,principal:prin,closing:close,opening:bal});
    bal=close;
    if(contrib>0){
      offsetBal=Math.min(offsetBal+contrib*moPerPeriod, bal>0?bal:offsetBal);
    }
    if(bal<0.005) break;
  }
  return{rows:rows,totalInterest:totInt,pmt:pmt};
}


// Build WITHOUT offset
function buildNo(P,annRate,yrs,freq){
  var n=ppy(freq),r=annRate/100/n,tot=yrs*n;
  var pmt=calcPMT(P,annRate,yrs,freq);
  var bal=P,rows=[],totInt=0;
  for(var i=0;i<tot;i++){
    if(bal<0.005) break;
    var intr=bal*r;
    var prin=Math.min(pmt-intr,bal);
    if(prin<0) prin=0;
    var close=Math.max(bal-prin,0);
    totInt+=intr;
    rows.push({interest:intr,closing:close,opening:bal});
    bal=close;
    if(bal<0.005) break;
  }
  return{rows:rows,totalInterest:totInt,pmt:pmt};
}


function termStr(periods,freq){
  var n=ppy(freq),y=Math.floor(periods/n),m=Math.round((periods/n-y)*12);
  if(m===12){y++;m=0;}
  var s='';
  if(y>0) s+=y+' yr'+(y!==1?'s':'');
  if(m>0) s+=(s?' ':'')+m+' mo';
  return s||'< 1 mo';
}


var lineChart=null;
function makeGrad(ctx,splitRatio){
  var h=ctx.canvas.clientHeight||120;
  var gr=ctx.createLinearGradient(0,0,0,h);
  var sp=Math.max(0,Math.min(1,splitRatio));
  gr.addColorStop(0,  'rgba(230,100,20,0.72)');
  gr.addColorStop(sp, 'rgba(230,100,20,0.72)');
  gr.addColorStop(sp, 'rgba(42,157,103,0.65)');
  gr.addColorStop(1,  'rgba(42,157,103,0.65)');
  return gr;
}
function drawChart(withRows,noRows,P,yrs,freq){
  var n=ppy(freq),labels=[],withDebt=[],noDebt=[];
  for(var y=0;y<=yrs;y++){
    labels.push('Yr '+y);
    if(y===0){withDebt.push(P);noDebt.push(P);continue;}
    var eiW=Math.min(y*n-1,withRows.length-1);
    var eiN=Math.min(y*n-1,noRows.length-1);
    withDebt.push(withRows[eiW]?Math.round(withRows[eiW].closing):0);
    noDebt.push(noRows[eiN]?Math.round(noRows[eiN].closing):0);
  }
  var canvas=el('myChart'),ctx=canvas.getContext('2d');
  if(lineChart){lineChart.destroy();lineChart=null;}
  lineChart=new Chart(ctx,{
    type:'line',
    data:{
      labels:labels,
      datasets:[
        {label:'With Offset',data:withDebt,borderColor:'rgba(42,157,103,1)',backgroundColor:'rgba(42,157,103,0.65)',fill:'origin',tension:0.35,pointRadius:1,pointHoverRadius:5,borderWidth:2.5,order:1},
        {label:'Without Offset',data:noDebt,borderColor:'rgba(230,100,20,1)',backgroundColor:'rgba(230,100,20,0.72)',fill:'-1',tension:0.35,pointRadius:1,pointHoverRadius:5,borderWidth:2,order:2}
      ]
    },
    options:{
      responsive:true,
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:'rgba(30,20,50,0.92)',titleColor:'#fff',
          bodyColor:'rgba(255,255,255,0.88)',padding:11,cornerRadius:8,
          callbacks:{
            label:function(item){
              return ' '+item.dataset.label+': $'+Math.round(item.parsed.y).toLocaleString('en-AU');
            }
          }
        }
      },
      scales:{
        x:{grid:{display:false},ticks:{font:{size:10},color:'#6c7a89',maxTicksLimit:16}},
        y:{grid:{color:'rgba(0,0,0,.05)'},ticks:{font:{size:10},color:'#6c7a89',callback:function(v){return '$'+(v/1000).toFixed(0)+'k';}}}
      }
    }
  });
}


function calculate(){
  var P=parseFloat(el('fLoan').value)||0;
  var rate=parseFloat(el('fRate').value)||0;
  var yrs=parseFloat(el('fTerm').value)||0;
  var offset=parseFloat(el('fOffset').value)||0;
  var contrib=parseFloat(el('fContrib').value)||0;
  var freq=getFreq();
  var sv=el('fStart').value;
  var mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if(P<=0||rate<=0||yrs<=0){
    ['rRepay','rEffective','rPeriodSaving','rIntWith','rIntNo','rSaved']
      .forEach(function(id){el(id).innerHTML='&mdash;';});
    el('rRepayLbl').textContent='Monthly Repayment';
    el('rSavingLbl').textContent='Interest Saving / Month';
    el('cmpBody').innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--text-light);font-style:italic;padding:20px">Enter loan details to see results</td></tr>';
    ['bannerSaving','bannerContrib','bannerPayoff'].forEach(function(id){
      el(id).classList.add('hidden');
    });
    el('amortBody').innerHTML='';
    if(lineChart){lineChart.destroy();lineChart=null;}
    return;
  }

  var scW=buildWith(P,rate,yrs,freq,offset,contrib);
  var scNo=buildNo(P,rate,yrs,freq);
  var withRows=scW.rows,noRows=scNo.rows;
  var pmt=scW.pmt;
  var totIntW=scW.totalInterest;
  var totIntNo=scNo.totalInterest;
  var saved=totIntNo-totIntW;
  var effOff=Math.min(offset,P);
  var r0=rate/100/ppy(freq);
  var saving0=effOff*r0;
  var diff=noRows.length-withRows.length;
  var tsDiff=diff>0?termStr(diff,freq):'0';

  el('rRepayLbl').textContent=fLbl(freq)+' Repayment';
  el('rSavingLbl').textContent='Interest Saving / '+fLbl(freq).replace('ly','').replace('ly','');

  el('rRepay').textContent=fmt2(pmt);
  el('rEffective').textContent=fmt0(Math.max(P-effOff,0));
  el('rPeriodSaving').textContent=fmt2(saving0);
  el('rIntWith').textContent=fmt0(totIntW);
  el('rIntNo').textContent=fmt0(totIntNo);
  el('rSaved').textContent=fmt0(saved);

  // Banners — use class="hidden" toggle
  if(offset>0){
    el('bnOffsetAmt').textContent=fmt0(offset);
    el('bnSaved').textContent=fmt0(saved);
    el('bnTime').textContent=tsDiff;
    el('bannerSaving').classList.remove('hidden');
  } else {
    el('bannerSaving').classList.add('hidden');
  }
  if(contrib>0){
    el('bnContrib').textContent=fmt0(contrib);
    el('bannerContrib').classList.remove('hidden');
  } else {
    el('bannerContrib').classList.add('hidden');
  }
  if(sv){
    var pts=sv.split('-');
    var sdW=new Date(parseInt(pts[0]),parseInt(pts[1])-1,1);
    sdW.setMonth(sdW.getMonth()+Math.round(withRows.length/ppy(freq)*12));
    var diff2=noRows.length-withRows.length;
    var tsDiff2=diff2>0?termStr(diff2,freq):'0';
    el('bnPayoff').textContent=mn[sdW.getMonth()]+' '+sdW.getFullYear();
    el('bnPayoffDiff').textContent=tsDiff2;
    if(diff2>0) el('bannerPayoff').classList.remove('hidden');
    else el('bannerPayoff').classList.add('hidden');
  } else {
    el('bannerPayoff').classList.add('hidden');
  }

  var totalRepW=pmt*withRows.length;
  var totalRepNo=pmt*noRows.length;
  el('cmpBody').innerHTML=
    '<tr><td>Loan Term</td><td>'+termStr(withRows.length,freq)+'</td><td>'+termStr(noRows.length,freq)+'</td><td style="color:var(--green);font-weight:700">'+(diff>0?'&minus;'+tsDiff:'&mdash;')+'</td></tr>'+
    '<tr><td>Repayment ('+fLbl(freq)+')</td><td>'+fmt2(pmt)+'</td><td>'+fmt2(pmt)+'</td><td>&mdash;</td></tr>'+
    '<tr><td>Total Interest</td><td>'+fmt0(totIntW)+'</td><td>'+fmt0(totIntNo)+'</td><td style="color:var(--green);font-weight:700">&minus;'+fmt0(saved)+'</td></tr>'+
    '<tr><td>Total Repayments</td><td>'+fmt0(totalRepW)+'</td><td>'+fmt0(totalRepNo)+'</td><td style="color:var(--green);font-weight:700">&minus;'+fmt0(totalRepNo-totalRepW)+'</td></tr>'+
    '<tr class="total-row"><td>Total Cost of Loan</td><td>'+fmt0(totalRepW)+'</td><td>'+fmt0(totalRepNo)+'</td><td style="color:var(--green);font-weight:700">&minus;'+fmt0(totalRepNo-totalRepW)+'</td></tr>';

  drawChart(withRows,noRows,P,yrs,freq);

  var n2=ppy(freq);
  var mn2=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var sd2=null;
  if(sv){var p2=sv.split('-');sd2=new Date(parseInt(p2[0]),parseInt(p2[1])-1,1);}
  var noIntMap={};
  for(var k=0;k<noRows.length;k++) noIntMap[k]=noRows[k].interest;
  var ah='',lastYr=-1;
  for(var i=0;i<withRows.length;i++){
    var row=withRows[i];
    var yr=Math.floor(i/n2)+1;
    if(yr!==lastYr){ah+='<tr class="yr-row"><td colspan="6">Year '+yr+'</td></tr>';lastYr=yr;}
    var noIntr=(noIntMap[i]!==undefined)?noIntMap[i]:0;
    var savingI=noIntr-row.interest;
    var pl='';
    if(sd2){
      var step=freq==='monthly'?i:freq==='fortnightly'?Math.round(i*26/12):Math.round(i*52/12);
      var pd=new Date(sd2.getFullYear(),sd2.getMonth()+step,1);
      pl=mn2[pd.getMonth()]+' '+pd.getFullYear();
    } else {
      pl=fLbl(freq)+' '+(i+1);
    }
    ah+='<tr>'+
      '<td>'+pl+'</td>'+
      '<td>'+fmt0(row.offsetBal)+'</td>'+
      '<td>'+fmt0(row.effectivePrin)+'</td>'+
      '<td>'+fmt2(row.interest)+'</td>'+
      '<td style="color:var(--green)">'+(savingI>0.005?fmt2(savingI):'&mdash;')+'</td>'+
      '<td>'+fmt0(row.closing)+'</td>'+
    '</tr>';
  }
  el('amortBody').innerHTML=ah;
}


// Collapsible
el('addlBtn').addEventListener('click',function(){
  var b=el('addlBody'),exp=this.getAttribute('aria-expanded')==='true';
  this.setAttribute('aria-expanded',String(!exp));
  b.classList.toggle('collapsed',exp);
});


// Schedule toggle
el('amortBtn').addEventListener('click',function(){
  var s=el('amortSection'),hidden=s.classList.toggle('hidden');
  var ico='<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg>';
  this.innerHTML=ico+(hidden?' Show Year-by-Year Schedule':' Hide Year-by-Year Schedule');
});


// Reset
function doReset(){
  document.querySelectorAll('.collapsible-header').forEach(function(h){
    h.setAttribute('aria-expanded','true');
    var body=h.nextElementSibling;
    if(body&&body.classList.contains('collapsible-body'))body.classList.remove('collapsed');
  });
  el('fLoan').value=500000;
  el('fRate').value=6.00;
  el('fTerm').value=30;
  el('fOffset').value=50000;
  el('fContrib').value='';
  el('rMonthly').checked=true;
  var now=new Date();
  el('fStart').value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  calculate();
}
el('btnReset').addEventListener('click',doReset);
el('btnStartOver').addEventListener('click',function(){doReset();window.scrollTo({top:0,behavior:'smooth'});});


// CSV helpers
function dlCSV(name,content){
  var blob=new Blob([content],{type:'text/csv'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;a.click();
}
el('btnSnapshot').addEventListener('click',function(){
  var html=document.documentElement.outerHTML;
  var blob=new Blob([html],{type:'text/html;charset=utf-8'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  var d=new Date();
  a.download='offset-snapshot-'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'.html';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
});
el('btnCSV').addEventListener('click',function(){
  var P=el('fLoan').value,R=el('fRate').value,T=el('fTerm').value;
  if(!P||!R||!T) return;
  var freq=getFreq();
  var lines=[
    'Offset Account Savings Calculator - Summary',
    'Loan Balance,$'+P,
    'Annual Interest Rate,'+R+'%',
    'Remaining Term,'+T+' years',
    'Offset Balance,$'+(el('fOffset').value||0),
    'Monthly Contribution,$'+(el('fContrib').value||0),
    'Repayment Frequency,'+fLbl(freq),
    '',
    'Metric,With Offset,Without Offset,Saving',
    fLbl(freq)+' Repayment,'+el('rRepay').textContent+',,',
    'Effective Principal,'+el('rEffective').textContent+',,',
    'Total Interest,'+el('rIntWith').textContent+','+el('rIntNo').textContent+','+el('rSaved').textContent,
    'Interest Saving per Period,'+el('rPeriodSaving').textContent+',,'
  ];
  dlCSV('offset-account-summary.csv',lines.join('\n'));
});
el('btnSchedCSV').addEventListener('click',function(){
  var trs=el('amortBody').querySelectorAll('tr:not(.yr-row)');
  if(!trs.length) return;
  var lines=['Period,Offset Balance,Effective Principal,Interest,Interest Saved,Closing Balance'];
  trs.forEach(function(tr){
    lines.push(Array.from(tr.querySelectorAll('td')).map(function(td){return td.textContent.replace(/,/g,'');}).join(','));
  });
  dlCSV('offset-account-schedule.csv',lines.join('\n'));
});


// Input listeners
['fLoan','fRate','fTerm','fOffset','fContrib','fStart'].forEach(function(id){
  el(id).addEventListener('input',calculate);
  el(id).addEventListener('change',calculate);
});
document.querySelectorAll('input[name=freq]').forEach(function(r){r.addEventListener('change',calculate);});


// Init
document.addEventListener('DOMContentLoaded',function(){
  var now=new Date();
  el('fStart').value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  calculate();
  var ni=el('fLoan'),sr=el('loanRange');
  if(ni&&sr){
    ni.addEventListener('input',function(){sr.value=Math.min(parseFloat(ni.value)||0,3000000);});
    sr.addEventListener('input',function(){ni.value=sr.value;calculate();});
  }
  var oi=el('fOffset'),or2=el('offsetRange');
  if(oi&&or2){
    oi.addEventListener('input',function(){or2.value=Math.min(parseFloat(oi.value)||0,300000);});
    or2.addEventListener('input',function(){oi.value=or2.value;calculate();});
  }
  if(window.innerWidth<900){
    el('addlBody').classList.add('collapsed');
    el('addlBtn').setAttribute('aria-expanded','false');
  }
});
