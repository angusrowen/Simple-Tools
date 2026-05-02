(function(){
'use strict';
function el(id){return document.getElementById(id);}
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
  var canvas=el('myChart'),ctx=canvas.getContext('2d');
  if(lineChart){lineChart.destroy();lineChart=null;}
  var P0=parseFloat(el('fAmt').value)||0,lastIdx=-1,rafBusy=false;
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
            var P2=parseFloat(el('fAmt').value)||0;
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
        y:{grid:{color:'rgba(0,0,0,.05)'},max:Math.ceil((parseFloat(el('fAmt').value)||0)*1.25/1000)*1000,ticks:{font:{size:10},color:'#6c7a89',callback:function(v){return '$'+v.toLocaleString('en-AU');}}}
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
  var P      = parseFloat(el('fAmt').value)||0;
  var rate   = parseFloat(el('fRate').value)||0;
  var yrs    = parseFloat(el('fTerm').value)||0;
  var extra  = parseFloat(el('fExtra').value)||0;
  var estFee = parseFloat(el('fEstFee').value)||0;
  var mFee   = parseFloat(el('fMFee').value)||0;
  var balloon= Math.min(parseFloat(el('fBalloon').value)||0,P*0.9);
  var freq   = getFreq();
  var n      = ppy(freq);
  var sv     = el('fStart').value;

  if(P<=0||rate<=0||yrs<=0){
    el('rRepay').innerHTML='&#8212;';el('rTotal').innerHTML='&#8212;';el('rInterest').innerHTML='&#8212;';
    el('rFeeBox').classList.add('hidden');el('rCostBox').classList.add('hidden');el('rCmpBox').classList.add('hidden');
    ['bannerExtra','bannerBalloon','bannerPayoff'].forEach(function(id){g(id).classList.add('hidden');});
    el('tBody').innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-light);font-style:italic;padding:20px">Enter loan details to see results</td></tr>';
    el('amortBody').innerHTML='';
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

  el('rRepayLbl').textContent=fLbl(freq)+' Repayment';
  el('rRepay').textContent=fmt2(pmt);
  el('rTotal').textContent=fmt0(totRepay);
  el('rInterest').textContent=fmt0(totInt);

  if(totFees>0){
    el('rFeeBox').classList.remove('hidden');el('rFees').textContent=fmt0(totFees);
    el('rCostBox').classList.remove('hidden');el('rCost').textContent=fmt0(totCost);
    el('rCmpBox').classList.remove('hidden');el('rCmp').textContent=fmtP(compRate());
  }else{
    el('rFeeBox').classList.add('hidden');el('rCostBox').classList.add('hidden');el('rCmpBox').classList.add('hidden');
  }

  if(extra>0){
    var noEx=buildSched(P,rate,yrs,freq,0,balloon);
    var saved=noEx.totalInterest-totInt;
    var ms=Math.round((noEx.rows.length-nPers)*12/n);
    var ts=ms>=12?Math.floor(ms/12)+'yr '+(ms%12)+'m':ms+' months';
    el('bnExtraAmt').textContent=fmt2(extra);el('bnExtraSaved').textContent=fmt0(saved);el('bnExtraTime').textContent=ts;
    el('bannerExtra').classList.remove('hidden');
  }else{el('bannerExtra').classList.add('hidden');}

  if(balloon>0){el('bnBalloon').textContent=fmt0(balloon);el('bannerBalloon').classList.remove('hidden');}
  else{el('bannerBalloon').classList.add('hidden');}

  if(sv){
    var pts=sv.split('-'),sd=new Date(parseInt(pts[0]),parseInt(pts[1])-1,1);
    sd.setMonth(sd.getMonth()+Math.round(nPers*12/n));
    var mn=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    el('bnPayoff').textContent=mn[sd.getMonth()]+' '+sd.getFullYear();
    el('bannerPayoff').classList.remove('hidden');
  }else{el('bannerPayoff').classList.add('hidden');}

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
  el('tBody').innerHTML=t;

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
  el('amortBody').innerHTML=ah;
}


el('addlBtn').addEventListener('click',function(){
  var b=el('addlBody'),exp=this.getAttribute('aria-expanded')==='true';
  this.setAttribute('aria-expanded',String(!exp));
  b.classList.toggle('collapsed',exp);
});


el('amortToggle').addEventListener('click',function(){
  var s=el('amortSection'),hidden=s.classList.toggle('hidden');
  var ico='<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg> ';
  this.innerHTML=ico+(hidden?'Show Repayment Schedule':'Hide Repayment Schedule');
});


function doReset(){
  // Reset collapsibles to default open state
  document.querySelectorAll('.collapsible-header').forEach(function(h){
    h.setAttribute('aria-expanded','true');
    var body=h.nextElementSibling;
    if(body&&body.classList.contains('collapsible-body'))body.classList.remove('collapsed');
  });
  el('fAmt').value='20000';el('amtRange').value='20000';
  el('fRate').value='15';
  el('fTerm').value='5';
  el('fExtra').value='';
  el('fEstFee').value='';
  el('fMFee').value='';
  el('fBalloon').value='';
  el('fPurpose').value='';
  var now=new Date();
  el('fStart').value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  el('rMonthly').checked=true;
  el('rRepay').innerHTML='&#8212;';el('rTotal').innerHTML='&#8212;';el('rInterest').innerHTML='&#8212;';
  el('rFeeBox').classList.add('hidden');el('rCostBox').classList.add('hidden');el('rCmpBox').classList.add('hidden');
  ['bannerExtra','bannerBalloon','bannerPayoff'].forEach(function(id){g(id).classList.add('hidden');});
  el('tBody').innerHTML='<tr><td colspan="6" style="text-align:center;color:var(--text-light);font-style:italic;padding:20px">Enter loan details to see results</td></tr>';
  el('amortBody').innerHTML='';
  calculate();
}
el('btnReset').addEventListener('click',doReset);
el('btnStartOver').addEventListener('click',function(){doReset();window.scrollTo({top:0,behavior:'smooth'});});


function dlCSV(name,content){
  var blob=new Blob([content],{type:'text/csv'});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;a.click();
}
document.addEventListener('DOMContentLoaded',function(){

  (function(){
    var ni=el('fAmt'),sr=el('amtRange');
    if(ni&&sr){
      ni.addEventListener('input',function(){sr.value=Math.min(parseFloat(ni.value)||0,100000);});
      sr.addEventListener('input',function(){ni.value=sr.value;calculate();});
    }
  })();
  var now=new Date();
  el('fStart').value=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  el('fAmt').value='20000';el('amtRange').value='20000';
  el('fRate').value='15';
  el('fTerm').value='5';
  calculate();
  var b=el('addlBody');
  if(window.innerWidth<900)b.classList.add('collapsed'),el('addlBtn').setAttribute('aria-expanded','false');

  el('btnExportSummary').addEventListener('click',function(){
    var P=el('fAmt').value,R=el('fRate').value,T=el('fTerm').value;
    if(!P||!R||!T)return;
    var purpose=el('fPurpose').options[el('fPurpose').selectedIndex].text;
    var lines=[
      'Personal Loan Repayment Calculator - Summary',
      'Loan Purpose,'+purpose,
      'Loan Amount,$'+P,
      'Annual Rate,'+R+'%',
      'Term,'+T+' years',
      'Frequency,'+fLbl(getFreq()),
      'Repayment,'+el('rRepay').textContent,
      'Total Repayments,'+el('rTotal').textContent,
      'Total Interest,'+el('rInterest').textContent
    ];
    !if(el('rFeeBox').classList.contains('hidden'))lines.push('Total Fees,'+el('rFees').textContent);
    !if(el('rCostBox').classList.contains('hidden'))lines.push('Total Cost,'+el('rCost').textContent);
    !if(el('rCmpBox').classList.contains('hidden'))lines.push('Comparison Rate (est.),'+el('rCmp').textContent);
    dlCSV('personal-loan-summary.csv',lines.join('\n'));
  });
  
  
  el('btnExportSchedule').addEventListener('click',function(){
    var trs=el('amortBody').querySelectorAll('tr:not(.yr-row)');
    if(!trs.length)return;
    var lines=['#,Period,Opening Balance,Interest,Principal,Extra,Closing Balance'];
    trs.forEach(function(tr){
      lines.push(Array.from(tr.querySelectorAll('td')).map(function(td){return td.textContent.replace(/,/g,'');}).join(','));
    });
    dlCSV('personal-loan-schedule.csv',lines.join('\n'));
  });
  
  
  el('btnSaveSnapshot').addEventListener('click',function(){
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
