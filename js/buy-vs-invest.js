var wealthChart=null,summaryRows=[],scheduleRows=[];
function n(id){var v=parseFloat(document.getElementById(id).value);return isNaN(v)?0:v;}
function fmt(v){return'$'+Math.round(Math.abs(v)).toLocaleString('en-AU');}
function set(id,val){var el=document.getElementById(id);if(el)el.textContent=val;}
function selling(){return document.getElementById('exitYes').checked;}


function estimateStampDuty(p){
  if(p<=16000)return p*0.0125;if(p<=35000)return 200+(p-16000)*0.015;
  if(p<=93000)return 485+(p-35000)*0.0175;if(p<=351000)return 1500+(p-93000)*0.035;
  if(p<=1168000)return 10530+(p-351000)*0.045;return 47295+(p-1168000)*0.055;
}
function estimateLMI(loan,price){
  var lvr=loan/price;if(lvr<=0.80)return 0;if(lvr<=0.85)return loan*0.010;
  if(lvr<=0.90)return loan*0.018;if(lvr<=0.95)return loan*0.030;return loan*0.042;
}
function calcRepayment(P,annRate,termYrs){
  var r=annRate/100/12,nn=termYrs*12;if(r===0)return P/nn;
  return P*r*Math.pow(1+r,nn)/(Math.pow(1+r,nn)-1);
}


function updateExitUI(){
  var s=selling();
  if(s){document.getElementById('exitFields').classList.remove('hidden');}else{document.getElementById('exitFields').classList.add('hidden');}
  var b=document.getElementById('exitBanner');
  if(s){b.className='exit-banner-sell';b.innerHTML='<strong>Sell mode:</strong> Both assets sold at end of period. Property sale costs deducted from proceeds. CGT (50% discount) applied to investment gains.';}
  else{b.className='exit-banner-hold';b.innerHTML='<strong>Hold mode:</strong> Neither asset is sold. Net wealth = property value minus mortgage and portfolio as-is. No selling costs or CGT applied.';}
}


function syncSlider(inputId, sliderId){
  var input=document.getElementById(inputId), slider=document.getElementById(sliderId);
  if(!input||!slider)return;
  input.addEventListener('input',function(){slider.value=this.value;calc();});
  slider.addEventListener('input',function(){input.value=this.value;calc();});
}


function calc(){
  var price=n('fPrice'),deposit=n('fDeposit'),stampDuty=n('fStampDuty');
  var convey=n('fConveyancing'),inspect=n('fInspections'),furnish=n('fFurnishing');
  var rate=n('fRate'),term=n('fTerm')||30;
  var council=n('fCouncil'),insurance=n('fInsurance'),maint=n('fMaintenance');
  var bodyCorp=n('fBodyCorp'),propGrowth=n('fPropertyGrowth'),agentFee=n('fAgentFee');
  var rent=n('fRent'),rentGrowth=n('fRentGrowth'),rentIns=n('fRentInsurance');
  var invReturn=n('fInvReturn'),invFee=n('fInvFee');
  var years=parseInt(document.getElementById('fYears').value)||20;
  var oppYes=document.getElementById('oppYes').checked;
  var s=selling();
  var sellAgentPct=n('fSellAgent')/100;
  var sellOther=n('fSellOther');
  var sellTaxRate=parseFloat(document.getElementById('fSellTax').value)||0;
  if(!price||!deposit)return;


  var baseLoan=price-deposit,lmi=estimateLMI(baseLoan,price),loan=baseLoan+lmi;
  var pct=(deposit/price*100).toFixed(1);
  document.getElementById('depositHint').textContent=pct+'% of purchase price'+(deposit/price>=0.20?' — no LMI required':' — LMI may apply');
  var lmiEl=document.getElementById('lmiInfo');
  if(lmi>0){document.getElementById('lmiAmt').textContent=fmt(lmi);lmiEl.classList.remove('hidden');}
  else lmiEl.classList.add('hidden');

  // Keep deposit slider max in sync with price
  var depositSlider=document.getElementById('depositRange');
  if(depositSlider)depositSlider.max=Math.max(price,parseInt(depositSlider.max));


  var upfrontOther=convey+inspect+furnish;
  var monthlyRepay=calcRepayment(loan,rate,term);
  var annualRepay=monthlyRepay*12;
  var annualOwner=council+insurance+maint+bodyCorp+agentFee;
  var netInvRate=(invReturn-invFee)/100;
  var investorStart=deposit+(oppYes?stampDuty+upfrontOther:0);


  var propValue=price,loanBal=loan,r=rate/100/12;
  var portfolio=investorStart,annualRent=rent*12;
  var totalMortgagePaid=0,totalRentPaid=0,totalInvested=investorStart;


  var yr1BuyerTotal=annualRepay+annualOwner;
  var yr1RenterTotal=annualRent+rentIns;
  var yr1CF=yr1BuyerTotal-yr1RenterTotal;


  var labels=[],buyArr=[],invArr=[],propArr=[],tableRows='';
  scheduleRows=['Year,Property Value,Mortgage Balance,Buy Net Wealth,Invest Portfolio,Rent+Inv Net Wealth,Cash Flow,Difference'];


  for(var y=1;y<=years;y++){
    for(var m=0;m<12;m++){
      if(loanBal>0.01){
        var interest=loanBal*r,principal=Math.min(monthlyRepay-interest,loanBal);
        loanBal=Math.max(loanBal-principal,0);totalMortgagePaid+=monthlyRepay;
      }
    }
    propValue*=(1+propGrowth/100);
    var annualCashFlow=annualRepay+annualOwner-(annualRent+rentIns);
    if(annualCashFlow>0)totalInvested+=annualCashFlow;
    portfolio=portfolio*(1+netInvRate)+annualCashFlow;
    totalRentPaid+=annualRent;
    annualRent*=(1+rentGrowth/100);


    var buyNetWealth,invNetWealth;
    if(s){
      buyNetWealth=propValue*(1-sellAgentPct)-sellOther-loanBal;
      var gain=Math.max(0,portfolio-investorStart);
      invNetWealth=portfolio-gain*0.5*(sellTaxRate/100);
    }else{
      buyNetWealth=propValue-loanBal;
      invNetWealth=portfolio;
    }


    var diff=buyNetWealth-invNetWealth;
    var cls=diff>0?'positive-val':'negative-val';
    var diffStr=diff>0?'Buy +'+fmt(diff):'Invest +'+fmt(Math.abs(diff));
    var cfCol=annualCashFlow>=0?'var(--green)':'var(--accent)';
    labels.push('Yr '+y);buyArr.push(Math.round(buyNetWealth));invArr.push(Math.round(invNetWealth));propArr.push(Math.round(propValue));
    tableRows+='<tr><td><strong>'+y+'</strong></td><td>'+fmt(propValue)+'</td><td>'+fmt(buyNetWealth)+'</td><td>'+fmt(portfolio)+'</td><td>'+fmt(invNetWealth)+'</td><td style="color:'+cfCol+';font-weight:600">'+(annualCashFlow>=0?'+':'')+fmt(annualCashFlow)+'</td><td class="'+cls+'">'+diffStr+'</td></tr>';
    scheduleRows.push([y,Math.round(propValue),Math.round(loanBal),Math.round(buyNetWealth),Math.round(portfolio),Math.round(invNetWealth),Math.round(annualCashFlow),Math.round(diff)].join(','));
  }


  var finalBuy=buyArr[buyArr.length-1],finalInv=invArr[invArr.length-1],finalDiff=finalBuy-finalInv;
  var tie=Math.abs(finalDiff)<1000,buyWins=finalDiff>0;


  set('rBuyWealth',fmt(finalBuy));
  set('rInvWealth',fmt(finalInv));
  var rInvSub=document.getElementById('rInvWealthSub');if(rInvSub)rInvSub.textContent=s?'After CGT on gains (50% discount)':'Portfolio value — no CGT applied';
  set('rPropValue',fmt(propArr[propArr.length-1]));
  set('rPortfolio',fmt(portfolio));
  var rPortSub=document.getElementById('rPortfolioSub');if(rPortSub)rPortSub.textContent=s?'Gross before CGT deduction':'Gross, before any CGT';
  set('rMortgagePaid',fmt(totalMortgagePaid));
  set('rRentPaid',fmt(totalRentPaid));
  set('rAnnualOngoing',fmt(yr1BuyerTotal)+'/yr');
  document.getElementById('rAnnualOngoingSub').textContent='Buyer: mortgage + costs · Renter: '+fmt(yr1RenterTotal)+'/yr';


  var db=document.getElementById('rboxDiff');
  db.className='result-box'+(tie?'':buyWins?' hl-green':' hl-blue');
  set('rDiff',tie?'~Even':(buyWins?'Buy +'+fmt(finalDiff):'Invest +'+fmt(Math.abs(finalDiff))));
  document.getElementById('rDiffSub').textContent=tie?'Similar wealth after '+years+' yrs':(buyWins?'Buying ahead after '+years+' yrs':'Investing ahead after '+years+' yrs');


  var badge=document.getElementById('winnerBadge');
  if(tie)badge.innerHTML='<span class="winner-badge winner-tie">&#9878; Roughly Equal After '+years+' Years</span>';
  else if(buyWins)badge.innerHTML='<span class="winner-badge">&#127968; Buying Wins After '+years+' Years</span>';
  else badge.innerHTML='<span class="winner-badge winner-invest">&#128200; Renting &amp; Investing Wins After '+years+' Years</span>';


  document.getElementById('compBody').innerHTML=tableRows||'<tr><td colspan="7" style="color:var(--text-light);font-style:italic;text-align:center;padding:18px">No results yet</td></tr>';


  var cf1Sign=yr1CF>=0?'+':'-';
  var cf1Col=yr1CF>=0?'color:var(--green)':'color:var(--accent)';
  var exitRow=s
    ?'<tr><td>Exit costs at sale</td><td>Agent '+(sellAgentPct*100).toFixed(1)+'% + '+fmt(sellOther)+' other</td><td>CGT 50% discount at '+sellTaxRate+'% marginal rate</td></tr>'
    :'<tr><td>Exit / tax at end</td><td>No sale — no CGT on PPOR</td><td>No sale — no CGT applied</td></tr>';


  document.getElementById('assumptBody').innerHTML=
    '<tr><td>Capital deployed at start</td><td>'+fmt(deposit)+' deposit + '+fmt(stampDuty+upfrontOther)+' upfront costs</td><td>'+fmt(investorStart)+' invested ('+(oppYes?'incl. upfront costs':'deposit only')+')</td></tr>'
   +'<tr><td>Loan amount</td><td>'+fmt(loan)+(lmi>0?' (incl. LMI '+fmt(lmi)+')':'')+'</td><td>— no mortgage</td></tr>'
   +'<tr><td>Annual mortgage repayments</td><td>'+fmt(annualRepay)+'/yr ('+fmt(monthlyRepay)+'/mo)</td><td>—</td></tr>'
   +'<tr><td>Annual ownership costs (Yr 1)</td><td>'+fmt(annualOwner)+'/yr (rates, insur, maint'+(agentFee?', agent':'')+(bodyCorp?', strata':'')+')</td><td>—</td></tr>'
   +'<tr><td>Annual rent + insurance (Yr 1)</td><td>—</td><td>'+fmt(yr1RenterTotal)+'/yr</td></tr>'
   +'<tr><td>Annual cash flow invested (Yr 1)</td><td>—</td><td><span style="'+cf1Col+';font-weight:700">'+cf1Sign+fmt(yr1CF)+'/yr</span></td></tr>'
   +'<tr><td>Total invested (deposit + cash flows)</td><td>—</td><td>'+fmt(totalInvested)+'</td></tr>'
   +'<tr><td>Total mortgage paid</td><td>'+fmt(totalMortgagePaid)+'</td><td>—</td></tr>'
   +'<tr><td>Total rent paid</td><td>—</td><td>'+fmt(totalRentPaid)+'</td></tr>'
   +exitRow
   +'<tr><td>Growth rate</td><td>'+propGrowth+'% p.a. property</td><td>'+invReturn+'% gross ('+invFee+'% MER)</td></tr>';


  document.getElementById('cfNote').innerHTML='<strong>How the invest scenario works:</strong> The renter invests the deposit upfront'+(oppYes?', plus stamp duty and other upfront costs':'')+'. Each year, the difference between what the buyer pays (mortgage + ownership costs) and what the renter pays (rent + contents insurance) is invested into — or drawn from — the portfolio. In Year 1 the renter '+(yr1CF>=0?'saves <strong>'+fmt(yr1CF)+'</strong> compared to buying, which is invested':'pays <strong>'+fmt(Math.abs(yr1CF))+'</strong> more than the buyer, drawn from the portfolio')+'. This gap shifts each year as rent grows.'+(s?' <strong>Sell mode:</strong> property sale costs deducted; CGT 50% discount applied to investment gains.':'');


  summaryRows=['Metric,Buy Scenario,Rent & Invest Scenario','Net Wealth (end),'+Math.round(finalBuy)+','+Math.round(finalInv),'Property Value (end),'+Math.round(propArr[propArr.length-1])+',N/A','Investment Portfolio (end),N/A,'+Math.round(portfolio),'Total Invested,N/A,'+Math.round(totalInvested),'Annual Buyer Outgoings Yr1,'+Math.round(yr1BuyerTotal)+',N/A','Annual Renter Outgoings Yr1,N/A,'+Math.round(yr1RenterTotal),'Annual Cash Flow Invested Yr1,N/A,'+Math.round(yr1CF),'Total Mortgage Paid,'+Math.round(totalMortgagePaid)+',N/A','Total Rent Paid,N/A,'+Math.round(totalRentPaid)];
  drawChart(labels,buyArr,invArr,propArr);
}


function drawChart(labels,buyArr,invArr,propArr){
  var canvas=document.getElementById('wealthChart');if(!canvas)return;
  if(wealthChart){wealthChart.destroy();wealthChart=null;}
  wealthChart=new Chart(canvas.getContext('2d'),{
    type:'line',
    data:{labels:labels,datasets:[
      {label:'Buy: Net Wealth',data:buyArr,borderColor:'rgba(42,157,103,1)',backgroundColor:'rgba(42,157,103,0.15)',fill:true,tension:0.35,pointRadius:1,pointHoverRadius:5,borderWidth:2.5},
      {label:'Rent & Invest: Net Wealth',data:invArr,borderColor:'rgba(63,127,181,1)',backgroundColor:'rgba(63,127,181,0.15)',fill:true,tension:0.35,pointRadius:1,pointHoverRadius:5,borderWidth:2.5},
      {label:'Property Value',data:propArr,borderColor:'rgba(232,168,56,1)',backgroundColor:'rgba(232,168,56,0.05)',borderDash:[5,4],tension:0.35,pointRadius:0,pointHoverRadius:4,borderWidth:1.8,fill:false}
    ]},
    options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
      plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(30,20,10,.93)',titleColor:'#fff',bodyColor:'rgba(255,255,255,.88)',padding:11,cornerRadius:8,callbacks:{label:function(item){return item.dataset.label+': $'+Math.round(item.parsed.y).toLocaleString('en-AU');}}}},
      scales:{x:{grid:{display:false},ticks:{font:{size:10},color:'#6c7a89',maxTicksLimit:14}},y:{grid:{color:'rgba(0,0,0,.05)'},ticks:{font:{size:10},color:'#6c7a89',callback:function(v){return'$'+(v>=1000000?(v/1000000).toFixed(1)+'m':Math.round(v/1000)+'k');}}}},
      animation:{duration:350}}
  });
}


function dlCSV(rows,fname){if(!rows||!rows.length)return;var a=document.createElement('a');a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(rows.join('\n'));a.download=fname;a.click();}


function resetAll(){
  // Reset collapsibles to default open state
  document.querySelectorAll('.collapsible-header').forEach(function(h){
    h.setAttribute('aria-expanded','true');
    var body=h.nextElementSibling;
    if(body&&body.classList.contains('collapsible-body'))body.classList.remove('collapsed');
  });
  var d={fPrice:800000,fDeposit:160000,fStampDuty:31070,fConveyancing:2000,fInspections:1000,fFurnishing:10000,fRate:6.00,fTerm:30,fCouncil:2000,fInsurance:2000,fMaintenance:4000,fBodyCorp:'',fPropertyGrowth:4.00,fAgentFee:'',fRent:3000,fRentGrowth:3.0,fRentInsurance:600,fInvReturn:8.0,fInvFee:0.20,fSellAgent:2.0,fSellOther:2000,fYears:20};
  for(var k in d){var el=document.getElementById(k);if(el)el.value=d[k];}
  // Reset sliders
  var sliders={priceRange:800000,depositRange:160000};
  for(var s in sliders){var sl=document.getElementById(s);if(sl)sl.value=sliders[s];}
  document.getElementById('exitNo').checked=true;document.getElementById('oppYes').checked=true;
  document.getElementById('fSellTax').value='32.5';
  updateExitUI();calc();
}


['fDeposit','fStampDuty','fConveyancing','fInspections','fFurnishing','fRate','fTerm',
 'fCouncil','fInsurance','fMaintenance','fBodyCorp','fPropertyGrowth','fAgentFee',
 'fRent','fRentGrowth','fRentInsurance','fInvReturn','fInvFee','fSellAgent','fSellOther','fYears'
].forEach(function(id){var el=document.getElementById(id);if(el)el.addEventListener('input',calc);});


// Price slider — also auto-updates stamp duty
document.getElementById('fPrice').addEventListener('input',function(){
  var slider=document.getElementById('priceRange');if(slider)slider.value=this.value;
  document.getElementById('fStampDuty').value=Math.round(estimateStampDuty(parseFloat(this.value)||0));calc();
});
document.getElementById('priceRange').addEventListener('input',function(){
  document.getElementById('fPrice').value=this.value;
  document.getElementById('fStampDuty').value=Math.round(estimateStampDuty(parseFloat(this.value)||0));calc();
});

// Deposit slider
syncSlider('fDeposit','depositRange');

document.getElementById('fSellTax').addEventListener('change',calc);
['oppYes','oppNo'].forEach(function(id){document.getElementById(id).addEventListener('change',calc);});
['exitYes','exitNo'].forEach(function(id){document.getElementById(id).addEventListener('change',function(){updateExitUI();calc();});});


(function(){
  var btn=document.getElementById('rentInvBtn'),body=document.getElementById('rentInvBody');
  btn.addEventListener('click',function(){var open=btn.getAttribute('aria-expanded')==='true';btn.setAttribute('aria-expanded',open?'false':'true');body.classList.toggle('collapsed',open);});
  if(window.innerWidth<900){btn.setAttribute('aria-expanded','false');body.classList.add('collapsed');}
})();


document.getElementById('amortToggle').addEventListener('click',function(){
  var sec=document.getElementById('amortSection'),open=!sec.classList.contains('hidden');
  if(open){sec.classList.add('hidden');}else{sec.classList.remove('hidden');}
  this.innerHTML=open?'<svg viewBox="0 0 24 24"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg>Show Year-by-Year Schedule':'<svg viewBox="0 0 24 24"><path d="M3 4h18v2H3V4zm0 7h18v2H3v-2zm0 7h18v2H3v-2z"/></svg>Hide Year-by-Year Schedule';
});


document.getElementById('btnReset').addEventListener('click',resetAll);
document.getElementById('btnStartOver').addEventListener('click',function(){resetAll();window.scrollTo({top:0,behavior:'smooth'});});
document.getElementById('btnExportSummary').addEventListener('click',function(){dlCSV(summaryRows,'buy-vs-invest-summary.csv');});
document.getElementById('btnExportSchedule').addEventListener('click',function(){dlCSV(scheduleRows,'buy-vs-invest-schedule.csv');});
document.getElementById('btnSaveSnapshot').addEventListener('click',function(){
  var blob=new Blob([document.documentElement.outerHTML],{type:'text/html;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);
  var d=new Date;a.download='buy-vs-invest-'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')+'.html';
  document.body.appendChild(a);a.click();document.body.removeChild(a);
});


updateExitUI();
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
