// ─── Formatters ────────────────────────────────────────────────────────────
function fmt(n){var a=Math.abs(n);var s=a.toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2});return(n<0?'-$':'$')+s;}
function fmtW(n){return '$'+Math.abs(n).toLocaleString('en-AU',{minimumFractionDigits:0,maximumFractionDigits:0});}
function rawNum(n){return(Math.round(n*100)/100).toFixed(2);}
function asNum(v){return parseFloat(String(v||0).replace(/[^0-9.-]/g,''))||0;}
var csvData=[];

// ─── FY Config ─────────────────────────────────────────────────────────────
var fyConfig={
'2023-24':{label:'FY 2023-24',dates:'1 Jul 2023 – 30 Jun 2024',superDefault:11.0,medicareLower:24276,medicareUpper:30345,concessionalCap:27500,sgMaxQuarter:60220,div293Threshold:250000,mlsThresholds:{single:[90000,105000,140000],family:[180000,210000,280000]},rates:[0.01,0.0125,0.015],brackets:{resident:[{min:0,max:18200,rate:0},{min:18200,max:45000,rate:0.19},{min:45000,max:120000,rate:0.325},{min:120000,max:180000,rate:0.37},{min:180000,max:Infinity,rate:0.45}],foreign:[{min:0,max:120000,rate:0.325},{min:120000,max:180000,rate:0.37},{min:180000,max:Infinity,rate:0.45}],whm:[{min:0,max:45000,rate:0.15},{min:45000,max:120000,rate:0.325},{min:120000,max:180000,rate:0.37},{min:180000,max:Infinity,rate:0.45}]},lito:function(i){if(i<=45000)return 700;if(i<=66667)return Math.max(0,700-(i-45000)*0.05);return Math.max(0,325-(i-66667)*0.015);},sapto:{single:{max:2230,cutIn:32279,cutOut:50119},couple:{max:1602,cutIn:28974,cutOut:41790},illness:{max:2040,cutIn:31279,cutOut:95198}},noTfnRate:0.47,calcHELP:function(i){var t=[{mn:0,mx:51550,r:0},{mn:51550,mx:59518,r:.01},{mn:59518,mx:63089,r:.02},{mn:63089,mx:66875,r:.025},{mn:66875,mx:70888,r:.03},{mn:70888,mx:75140,r:.035},{mn:75140,mx:79649,r:.04},{mn:79649,mx:84429,r:.045},{mn:84429,mx:89494,r:.05},{mn:89494,mx:94865,r:.055},{mn:94865,mx:100557,r:.06},{mn:100557,mx:106590,r:.065},{mn:106590,mx:112985,r:.07},{mn:112985,mx:119764,r:.075},{mn:119764,mx:126950,r:.08},{mn:126950,mx:134568,r:.085},{mn:134568,mx:142642,r:.09},{mn:142642,mx:151200,r:.095},{mn:151200,mx:Infinity,r:.10}];for(var j=0;j<t.length;j++){if(i>=t[j].mn&&i<t[j].mx)return i*t[j].r;}return i*0.10;},helpShort:'Flat % of total income',ftbA:{rateUnder13:6536,rate13to15:8240,rate16to19:8240,incomeThreshold1:58108,taperRate1:0.20,incomeThreshold2:103368,taperRate2:0.30,baseRatePerChild:1849},ftbB:{primaryUnder5:4441,primary5to18:3186}},
'2024-25':{label:'FY 2024-25',dates:'1 Jul 2024 – 30 Jun 2025',superDefault:11.5,medicareLower:26000,medicareUpper:32500,concessionalCap:30000,sgMaxQuarter:62270,div293Threshold:250000,mlsThresholds:{single:[93000,108000,144000],family:[186000,216000,288000]},rates:[0.01,0.0125,0.015],brackets:{resident:[{min:0,max:18200,rate:0},{min:18200,max:45000,rate:0.16},{min:45000,max:135000,rate:0.30},{min:135000,max:190000,rate:0.37},{min:190000,max:Infinity,rate:0.45}],foreign:[{min:0,max:45000,rate:0.30},{min:45000,max:135000,rate:0.30},{min:135000,max:190000,rate:0.37},{min:190000,max:Infinity,rate:0.45}],whm:[{min:0,max:45000,rate:0.15},{min:45000,max:135000,rate:0.30},{min:135000,max:190000,rate:0.37},{min:190000,max:Infinity,rate:0.45}]},lito:function(i){if(i<=45000)return 700;if(i<=66667)return Math.max(0,700-(i-45000)*0.05);return Math.max(0,325-(i-66667)*0.015);},sapto:{single:{max:2230,cutIn:33532,cutOut:51094},couple:{max:1602,cutIn:31468,cutOut:43750},illness:{max:2040,cutIn:31279,cutOut:95198}},noTfnRate:0.47,calcHELP:function(i){var t=[{mn:0,mx:54435,r:0},{mn:54435,mx:62850,r:.01},{mn:62850,mx:66620,r:.02},{mn:66620,mx:70618,r:.025},{mn:70618,mx:74855,r:.03},{mn:74855,mx:79346,r:.035},{mn:79346,mx:84107,r:.04},{mn:84107,mx:89154,r:.045},{mn:89154,mx:94503,r:.05},{mn:94503,mx:100174,r:.055},{mn:100174,mx:106185,r:.06},{mn:106185,mx:112556,r:.065},{mn:112556,mx:119310,r:.07},{mn:119310,mx:126467,r:.075},{mn:126467,mx:134056,r:.08},{mn:134056,mx:142100,r:.085},{mn:142100,mx:150626,r:.09},{mn:150626,mx:159663,r:.095},{mn:159663,mx:Infinity,r:.10}];for(var j=0;j<t.length;j++){if(i>=t[j].mn&&i<t[j].mx)return i*t[j].r;}return i*0.10;},helpShort:'Flat % of total income',ftbA:{rateUnder13:6706,rate13to15:8454,rate16to19:8454,incomeThreshold1:61063,taperRate1:0.20,incomeThreshold2:107413,taperRate2:0.30,baseRatePerChild:1896},ftbB:{primaryUnder5:4554,primary5to18:3268}},
'2025-26':{label:'FY 2025-26',dates:'1 Jul 2025 – 30 Jun 2026',superDefault:12.0,medicareLower:26000,medicareUpper:32500,concessionalCap:30000,sgMaxQuarter:65070,div293Threshold:250000,mlsThresholds:{single:[96000,112000,148000],family:[192000,224000,296000]},rates:[0.01,0.0125,0.015],brackets:{resident:[{min:0,max:18200,rate:0},{min:18200,max:45000,rate:0.16},{min:45000,max:135000,rate:0.30},{min:135000,max:190000,rate:0.37},{min:190000,max:Infinity,rate:0.45}],foreign:[{min:0,max:45000,rate:0.30},{min:45000,max:135000,rate:0.30},{min:135000,max:190000,rate:0.37},{min:190000,max:Infinity,rate:0.45}],whm:[{min:0,max:45000,rate:0.15},{min:45000,max:135000,rate:0.30},{min:135000,max:190000,rate:0.37},{min:190000,max:Infinity,rate:0.45}]},lito:function(i){if(i<=45000)return 700;if(i<=66667)return Math.max(0,700-(i-45000)*0.05);return Math.max(0,325-(i-66667)*0.015);},sapto:{single:{max:2230,cutIn:33532,cutOut:51094},couple:{max:1602,cutIn:31468,cutOut:43750},illness:{max:2040,cutIn:31279,cutOut:95198}},noTfnRate:0.47,calcHELP:function(i){if(i<67000)return 0;if(i<125000)return(i-67000)*0.15;if(i<179285)return 8700+(i-125000)*0.17;return i*0.10;},helpShort:'Progressive marginal',ftbA:{rateUnder13:6900,rate13to15:8700,rate16to19:8700,incomeThreshold1:62634,taperRate1:0.20,incomeThreshold2:110000,taperRate2:0.30,baseRatePerChild:1950},ftbB:{primaryUnder5:4680,primary5to18:3360}}
};

function getFY(){return fyConfig[document.getElementById('financialYear').value]||fyConfig['2025-26'];}
function isHourly(){return document.getElementById('methodHourly').checked;}
function isSuperInc(){return document.getElementById('superYes').checked;}
function isPartTime(){return document.getElementById('basisPart').checked;}
function getInputSalary(){
  if(isHourly()){
    return (parseFloat(document.getElementById('hourlyRate').value)||0)*(parseFloat(document.getElementById('hourlyHours').value)||0)*(parseFloat(document.getElementById('hourlyWeeks').value)||0);
  }
  return parseFloat(document.getElementById('salary').value)||0;
}
function getSJSuperRate(){
  if(!document.getElementById('hasSecondJob').checked) return 0;
  return (parseFloat(document.getElementById('sjSuperRate').value)||0)/100;
}
function getSJSalSac(){
  if(!document.getElementById('hasSecondJob').checked) return 0;
  return parseFloat(document.getElementById('sjSalSac').value)||0;
}
function getSecondJobIncome(){
  if(!document.getElementById('hasSecondJob').checked) return 0;
  var method=document.querySelector('input[name="sjMethod"]:checked').value;
  var sjSalary=parseFloat(document.getElementById('sjSalary').value)||0;
  var sjHourlyRate=parseFloat(document.getElementById('sjHourlyRate').value)||0;
  var sjHours=parseFloat(document.getElementById('sjHours').value)||0;
  var sjWeeks=parseFloat(document.getElementById('sjWeeks').value)||0;
  if(sjSalary===0 && (sjHourlyRate===0 || sjHours===0 || sjWeeks===0)) return 0;
  var income;
  if(method==='hourly'){
    income=sjHourlyRate*sjHours*sjWeeks;
  } else {
    income=sjSalary;
  }
  var sjPart=document.getElementById('sjBasisPart')&&document.getElementById('sjBasisPart').checked;
  if(sjPart){
    var ah=parseFloat(document.getElementById('sjActualHours').value)||0;
    var fh=parseFloat(document.getElementById('sjFteHours').value)||1;
    var frac=Math.min(1,ah/fh);
    income=income*frac;
    var ff=document.getElementById('sjFteFraction');if(ff)ff.textContent=frac.toFixed(4);
    var sp=document.getElementById('sjProrataSalary');if(sp)sp.textContent='$'+Math.round(income).toLocaleString('en-AU');
  }
  return income;
}

function calcIncomeTax(income,residency,fy){
  var b=fy.brackets[residency];var tax=0;var details=[];
  for(var j=0;j<b.length;j++){
    if(income>b[j].min){var taxable=Math.min(income,b[j].max)-b[j].min;var t=taxable*b[j].rate;tax+=t;details.push({bracket:fmtW(b[j].min)+' – '+(b[j].max===Infinity?'∞':fmtW(b[j].max)),taxable:taxable,tax:t,rate:b[j].rate,active:income>b[j].min});}
    else{details.push({bracket:fmtW(b[j].min)+' – '+(b[j].max===Infinity?'∞':fmtW(b[j].max)),taxable:0,tax:0,rate:b[j].rate,active:false});}
  }
  return{tax:tax,details:details};
}
function calcMedicare(income,fy){
  var lower=fy.medicareLower,upper=fy.medicareUpper;
  if(income<=lower)return 0;
  if(income<=upper)return(income-lower)*0.1;
  return income*0.02;
}
function calcMLS(income,fy,familyStatus){
  var t=fy.mlsThresholds[familyStatus==='family'?'family':'single'];
  if(income<t[0])return 0;
  if(income<t[1])return income*0.01;
  if(income<t[2])return income*0.0125;
  return income*0.015;
}
function calcSAPTO(income,fy,status){
  var s;
  if(status==='couple-each')s=fy.sapto.couple;
  else if(status==='couple-illness')s=fy.sapto.illness;
  else s=fy.sapto.single;
  if(income<=s.cutIn)return s.max;
  if(income>=s.cutOut)return 0;
  return Math.max(0,s.max-(income-s.cutIn)*s.max/(s.cutOut-s.cutIn));
}
function calcFTB(fy,under13,t13to15,t16to19,familyIncome){
  var ftbA=fy.ftbA;
  var maxA=(under13*ftbA.rateUnder13)+(t13to15*ftbA.rate13to15)+(t16to19*ftbA.rate16to19);
  var base=(under13+t13to15+t16to19)*ftbA.baseRatePerChild;
  var reduced=maxA;
  if(familyIncome>ftbA.incomeThreshold2)reduced=Math.max(base,maxA-(familyIncome-ftbA.incomeThreshold2)*ftbA.taperRate2);
  else if(familyIncome>ftbA.incomeThreshold1)reduced=Math.max(base,maxA-(familyIncome-ftbA.incomeThreshold1)*ftbA.taperRate1);
  return Math.max(0,reduced);
}

// ─── Visibility ─────────────────────────────────────────────────────────────
function syncVisibility(){
  var hourly=document.getElementById('methodHourly').checked;
  document.getElementById('annualField').classList.toggle('hidden',hourly);
  document.getElementById('hourlyFields').classList.toggle('hidden',!hourly);
  var superInc=document.getElementById('superYes').checked;
  var di=document.getElementById('derivedInfo');
  if(di){if(superInc)di.classList.remove('hidden');else di.classList.add('hidden');}
  var pt=document.getElementById('basisPart').checked;
  document.getElementById('partTimeFields').classList.toggle('hidden',!pt);
  document.getElementById('ptBadge').classList.toggle('hidden',!pt);
  document.getElementById('purchasedLeaveWrap').classList.toggle('hidden',!document.getElementById('showPurchasedLeave').checked);
  document.getElementById('generalSalSacWrap').classList.toggle('hidden',!document.getElementById('showGeneralSalSac').checked);
  document.getElementById('seniorsFields').classList.toggle('hidden',!document.getElementById('seniorsOffset').checked);
  document.getElementById('ftbFields').classList.toggle('hidden',!document.getElementById('ftbEnabled').checked);
  document.getElementById('mlsFields').classList.toggle('hidden',!document.getElementById('mlsEnabled').checked);
  var hasSJ=document.getElementById('hasSecondJob').checked;
  document.getElementById('secondJobFields').classList.toggle('hidden',!hasSJ);
  var sjHourly=document.querySelector('input[name="sjMethod"]:checked').value==='hourly';
  document.getElementById('sjAnnualField').classList.toggle('hidden',sjHourly);
  document.getElementById('sjHourlyFields').classList.toggle('hidden',!sjHourly);
  var sjPart=document.getElementById('sjBasisPart')&&document.getElementById('sjBasisPart').checked;
  var sjPTF=document.getElementById('sjPartTimeFields');
  if(sjPTF)sjPTF.classList.toggle('hidden',!sjPart);
  var showBonus=document.getElementById('showBonus').checked;
  document.getElementById('bonusWrap').classList.toggle('hidden',!showBonus);
  var showExtraTax=document.getElementById('showExtraTax')&&document.getElementById('showExtraTax').checked;
  var etw=document.getElementById('extraTaxWrap');if(etw)etw.classList.toggle('hidden',!showExtraTax);
}

// ─── Main Calculate ──────────────────────────────────────────────────────────
function calculate(){
  syncVisibility();
  var fy=getFY();
  var freq=parseFloat(document.querySelector('input[name="freqR"]:checked').value)||26;
  var residency=document.getElementById('residency').value;
  var superRate=(parseFloat(document.getElementById('superRate').value)||0)/100;
  var salSac=parseFloat(document.getElementById('salSac').value)||0;
  var extraTax=parseFloat(document.getElementById('extraTax').value)||0;
  var novatedPreTax=0;var novatedPostTax=0;
  var bonus=document.getElementById('showBonus').checked?(parseFloat(document.getElementById('bonus').value)||0):0;
  var inputSalary=getInputSalary();
  var baseSalary=inputSalary;
  var superAmt=0;
  if(isSuperInc()){baseSalary=inputSalary/(1+superRate);superAmt=inputSalary-baseSalary;}
  else{superAmt=baseSalary*superRate;}
  var fteSalary=baseSalary;
  var prorataFraction=1;
  if(isPartTime()){
    var ah=parseFloat(document.getElementById('actualHours').value)||0;
    var fh=parseFloat(document.getElementById('fteHours').value)||1;
    prorataFraction=Math.min(1,ah/fh);
    baseSalary=fteSalary*prorataFraction;
    superAmt=baseSalary*superRate;
    document.getElementById('fteFraction').textContent=prorataFraction.toFixed(4);
    document.getElementById('prorataSalary').textContent=fmtW(baseSalary);
    document.getElementById('prorataInfo').classList.remove('hidden');
  } else {
    document.getElementById('prorataInfo').classList.add('hidden');
  }
  if(isSuperInc()){document.getElementById('derivedSalary').textContent=fmtW(baseSalary);document.getElementById('derivedSuper').textContent=fmtW(superAmt);}
  if(isHourly()){document.getElementById('hourlyAnnual').textContent=fmtW(inputSalary);document.getElementById('hourlyDerived').classList.remove('hidden');}
  else{document.getElementById('hourlyDerived').classList.add('hidden');}
  // SG cap
  var sgMaxAnnual=fy.sgMaxQuarter*4;
  var sgCapBanner=document.getElementById('sgCapBanner');
  if(baseSalary>sgMaxAnnual){
    var cappedSuper=sgMaxAnnual*superRate;
    document.getElementById('sgCapDetail').textContent='Super capped at '+fmtW(cappedSuper)+'/yr based on max earnings base.';
    sgCapBanner.classList.remove('hidden');
    superAmt=cappedSuper;
  } else {
    sgCapBanner.classList.add('hidden');
  }
  // second job income
  var secondJobIncome=getSecondJobIncome();
  var sjSuperRate=getSJSuperRate();
  var sjSalSac=getSJSalSac();
  var sjSuperAmt=0;
  if(secondJobIncome>0){
    if(document.getElementById('sjSuperIncSwitch').checked){
      var sjBase=secondJobIncome/(1+sjSuperRate);
      sjSuperAmt=secondJobIncome-sjBase;
      secondJobIncome=sjBase;
    } else {
      sjSuperAmt=secondJobIncome*sjSuperRate;
    }
  }
  var purchasedLeaveWeeks=document.getElementById('showPurchasedLeave').checked?(parseFloat(document.getElementById('purchasedLeaveWeeks').value)||0):0;
  var purchasedLeaveDeduction=purchasedLeaveWeeks>0?(purchasedLeaveWeeks/52)*baseSalary:0;
  var generalSalSac=document.getElementById('showGeneralSalSac').checked?(parseFloat(document.getElementById('generalSalSacAmt').value)||0):0;
  var taxableSalary=baseSalary-purchasedLeaveDeduction-generalSalSac-salSac+bonus+secondJobIncome;
  var grossTaxable=taxableSalary;
  // tax calc
  var taxResult;
  if(document.getElementById('tfnYes').checked){
    taxResult={tax:grossTaxable*fy.noTfnRate,details:[]};
  } else {
    taxResult=calcIncomeTax(grossTaxable,residency,fy);
  }
  var incomeTax=taxResult.tax;
  // lito
  var lito=0;
  if(residency==='resident'&&!document.getElementById('tfnYes').checked)lito=fy.lito(grossTaxable);
  // sapto
  var sapto=0;
  if(document.getElementById('seniorsOffset').checked&&residency==='resident')sapto=calcSAPTO(grossTaxable,fy,document.getElementById('seniorsStatus').value);
  incomeTax=Math.max(0,incomeTax-lito-sapto);
  // medicare
  var medicare=0;
  if(residency==='resident')medicare=calcMedicare(grossTaxable,fy);
  // mls
  var mls=0;
  if(document.getElementById('mlsEnabled').checked&&residency==='resident')mls=calcMLS(grossTaxable,fy,document.getElementById('mlsFamily').value);
  // help
  var help=0;
  if(document.getElementById('helpDebtYes').checked)help=fy.calcHELP(grossTaxable);
  // concessional cap check
  var totalConcessional=superAmt+salSac+(secondJobIncome>0?sjSuperAmt+sjSalSac:0);
  var capWarning=document.getElementById('capWarning');
  if(totalConcessional>fy.concessionalCap){
    document.getElementById('capWarningTitle').textContent='Concessional cap exceeded by '+fmtW(totalConcessional-fy.concessionalCap);
    document.getElementById('capWarningDetail').textContent='Total concessional contributions of '+fmtW(totalConcessional)+' exceed the '+fmtW(fy.concessionalCap)+' cap. Excess is taxed at marginal rate.';
    capWarning.classList.remove('hidden');
  } else {
    capWarning.classList.add('hidden');
  }
  // div293
  var div293=0;
  var totalInc=grossTaxable+superAmt;
  if(totalInc>fy.div293Threshold)div293=Math.min(superAmt,totalInc-fy.div293Threshold)*0.15;
  // ftb
  var ftbAnnual=0;
  if(document.getElementById('ftbEnabled').checked){
    var fi=parseFloat(document.getElementById('ftbFamilyIncome').value)||0;
    ftbAnnual=calcFTB(fy,parseFloat(document.getElementById('ftbUnder13').value)||0,parseFloat(document.getElementById('ftb13to15').value)||0,parseFloat(document.getElementById('ftb16to19').value)||0,fi);
  }
  var totalTax=incomeTax+medicare+mls+help+(extraTax*freq);
  var netAnnual=grossTaxable-totalTax-novatedPostTax+ftbAnnual;
  var netPeriod=netAnnual/freq;
  var effRate=grossTaxable>0?(totalTax/grossTaxable)*100:0;
  // marginal rate
  var margRate=0;
  if(!document.getElementById('tfnYes').checked){var br=fy.brackets[residency];for(var k=br.length-1;k>=0;k--){if(grossTaxable>br[k].min){margRate=br[k].rate*100;break;}}}
  else{margRate=fy.noTfnRate*100;}
  // update summary boxes
  document.getElementById('takeHomePeriod').textContent=fmt(netPeriod);
  document.getElementById('takeHomeAnnual').textContent=fmtW(netAnnual);
  document.getElementById('grossDisplay').textContent=fmtW(grossTaxable);
  document.getElementById('effectiveRate').textContent=effRate.toFixed(1)+'%';
  document.getElementById('marginalRate').textContent=margRate.toFixed(0)+'%';
  document.getElementById('totalSuperDisplay').textContent=fmtW(superAmt+(secondJobIncome>0?sjSuperAmt:0));
  // build combined table
  var rows=[];
  function addRow(label,annual,opts){opts=opts||{};rows.push({label:label,annual:annual,cls:opts.cls||'',negative:opts.negative||false});}
  function addSection(s){rows.push({section:s});}
  addSection('INCOME');
  addRow('Gross Salary',baseSalary);
  if(secondJobIncome>0)addRow('Second Job Income',secondJobIncome);
  if(bonus>0)addRow('Additional Income / Bonus',bonus);
  if(purchasedLeaveDeduction>0)addRow('Purchased Leave',purchasedLeaveDeduction,{negative:true,cls:'indent negative'});
  if(generalSalSac>0)addRow('General Salary Sacrifice',generalSalSac,{negative:true,cls:'indent negative'});
  if(salSac>0)addRow('Super Salary Sacrifice',salSac,{negative:true,cls:'indent negative'});
  addRow('Gross Taxable Income',grossTaxable,{cls:'subtotal-row'});
  addSection('DEDUCTIONS');
  addRow('Income Tax',incomeTax,{negative:true,cls:'negative'});
  if(lito>0)addRow('LITO Offset',-lito,{cls:'indent'});
  if(sapto>0)addRow('SAPTO Offset',-sapto,{cls:'indent'});
  addRow('Medicare Levy',medicare,{negative:true,cls:'negative'});
  if(mls>0)addRow('Medicare Levy Surcharge',mls,{negative:true,cls:'negative'});
  if(help>0)addRow('HECS/HELP Repayment',help,{negative:true,cls:'help-row'});
  if(extraTax*freq>0)addRow('Extra Tax Withheld',extraTax*freq,{negative:true,cls:'negative'});
  if(div293>0)addRow('Division 293 Tax',div293,{negative:true,cls:'negative'});
  if(ftbAnnual>0)addRow('Family Tax Benefit (A)',-ftbAnnual,{cls:'indent'});
  addSection('TAKE-HOME');
  addRow('Net Take-Home Pay',netAnnual,{cls:'takehome-row'});
  addSection('SUPER');
  addRow('Superannuation (SG)',superAmt,{cls:'super-row'});
  if(salSac>0)addRow('Salary Sacrifice Super',salSac,{cls:'indent super-row'});
  if(secondJobIncome>0){
    addRow('Second Job Super (SG)',sjSuperAmt,{cls:'indent super-row'});
    if(sjSalSac>0)addRow('Second Job Sal. Sacrifice',sjSalSac,{cls:'indent super-row'});
  }
  addRow('Total Superannuation',superAmt+salSac+(secondJobIncome>0?sjSuperAmt+sjSalSac:0),{cls:'super-total-row'});
  // render table
  var tbody=document.getElementById('combinedBody');
  tbody.innerHTML='';
  csvData=[];
  for(var i=0;i<rows.length;i++){
    var r=rows[i];
    if(r.section){var tr=document.createElement('tr');tr.className='section-header';tr.innerHTML='<td colspan="5">'+r.section+'</td>';tbody.appendChild(tr);csvData.push({section:r.section});continue;}
    var cls=r.cls||'';
    var negative=r.negative||false;
    var v=r.annual;
    var tr=document.createElement('tr');tr.className=cls;
    tr.innerHTML='<td>'+r.label+'</td>'+
      '<td class="'+(negative?'negative-val':'')+'">'+fmt(v/52)+'</td>'+
      '<td class="'+(negative?'negative-val':'')+'">'+fmt(v/26)+'</td>'+
      '<td class="'+(negative?'negative-val':'')+'">'+fmt(v/12)+'</td>'+
      '<td class="'+(negative?'negative-val':'')+'">'+fmt(v)+'</td>';
    tbody.appendChild(tr);
    csvData.push({label:r.label,annual:v});
  }
  // brackets
  var bb=document.getElementById('bracketBody');bb.innerHTML='';
  for(var k=0;k<taxResult.details.length;k++){
    var d=taxResult.details[k];var tr=document.createElement('tr');
    tr.className=d.active?'bracket-active':'bracket-inactive';
    tr.innerHTML='<td>'+d.bracket+'</td><td>'+fmtW(d.taxable)+'</td><td>'+fmtW(d.tax)+'</td>';
    bb.appendChild(tr);
  }
  // key rates
  var rb=document.getElementById('ratesBody');rb.innerHTML='';
  function addRate(k,v){var tr=document.createElement('tr');tr.innerHTML='<td>'+k+'</td><td>'+v+'</td>';rb.appendChild(tr);}
  addRate('Super Guarantee Rate',superRate*100+'%');
  addRate('Concessional Cap',fmtW(fy.concessionalCap));
  addRate('Medicare Levy Threshold',fmtW(fy.medicareLower)+' – '+fmtW(fy.medicareUpper));
  addRate('Medicare Levy','2.0% (resident)');
  if(document.getElementById('helpDebtYes').checked)addRate('HELP Repayment Method',fy.helpShort);
  if(totalInc>fy.div293Threshold)addRate('Div 293 Tax (applied)',fmtW(div293));
  if(baseSalary>fy.sgMaxQuarter*4)addRate('SG Max Earnings Base',fmtW(fy.sgMaxQuarter*4)+'/yr');
  if(totalConcessional>fy.concessionalCap)addRate('Concessional Excess',fmtW(totalConcessional-fy.concessionalCap));
  document.getElementById('ratesYear').textContent=fy.label;
  updatePie(netAnnual,incomeTax+medicare+mls+(extraTax*freq),help,superAmt+(secondJobIncome>0?sjSuperAmt:0));
}

// ─── Pie Chart ───────────────────────────────────────────────────────────────
var payChart=null;
function updatePie(takeHome,tax,helpAmt,superAmt){
  var hasHelp=helpAmt>0;
  var data,labels,colors;
  if(hasHelp){
    data=[Math.max(0,takeHome),Math.max(0,tax),Math.max(0,helpAmt),Math.max(0,superAmt)];
    labels=['Take-home pay','Tax and levies','HECS/HELP','Superannuation'];
    colors=['#2a9d67','#e53935','#e67e22','#3f7fb5'];
  } else {
    data=[Math.max(0,takeHome),Math.max(0,tax),Math.max(0,superAmt)];
    labels=['Take-home pay','Tax and levies','Superannuation'];
    colors=['#2a9d67','#e53935','#3f7fb5'];
  }
  var total=data.reduce(function(a,b){return a+b;},0)||1;
  document.getElementById('pieHome').textContent='$'+Math.round(Math.max(0,takeHome)).toLocaleString('en-AU');
  document.getElementById('pieTax').textContent='$'+Math.round(Math.max(0,tax)).toLocaleString('en-AU');
  document.getElementById('pieSuper').textContent='$'+Math.round(Math.max(0,superAmt)).toLocaleString('en-AU');
  document.getElementById('pieHomePct').textContent=((Math.max(0,takeHome)/total)*100).toFixed(1)+'%';
  document.getElementById('pieTaxPct').textContent=((Math.max(0,tax)/total)*100).toFixed(1)+'%';
  document.getElementById('pieSuperPct').textContent=((Math.max(0,superAmt)/total)*100).toFixed(1)+'%';
  var helpRow=document.getElementById('pieHelpRow');
  if(helpRow){
    if(hasHelp)helpRow.classList.remove('hidden');else helpRow.classList.add('hidden');
    document.getElementById('pieHelp').textContent='$'+Math.round(helpAmt).toLocaleString('en-AU');
    document.getElementById('pieHelpPct').textContent=((helpAmt/total)*100).toFixed(1)+'%';
  }
  if(typeof Chart==='undefined') return;
  var canvas=document.getElementById('payPie');
  if(!canvas) return;
  if(payChart){
    payChart.data.labels=labels;
    payChart.data.datasets[0].data=data;
    payChart.data.datasets[0].backgroundColor=colors;
    payChart.update();
  } else {
    payChart=new Chart(canvas,{
      type:'pie',
      data:{labels:labels,datasets:[{data:data,backgroundColor:colors,borderColor:'#ffffff',borderWidth:3,hoverOffset:6}]},
      options:{responsive:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){var v=ctx.raw||0;var pct=((v/total)*100).toFixed(1);return ' '+ctx.label+': $'+Math.round(v).toLocaleString('en-AU')+' ('+pct+'%)';}}}}}
    });
  }
}

// ─── FY Change ───────────────────────────────────────────────────────────────
function onFYChange(){
  var fy=getFY();
  document.getElementById('superRate').value=fy.superDefault;
  document.getElementById('sjSuperRate').value=fy.superDefault;
  calculate();
}

// ─── Reset ───────────────────────────────────────────────────────────────────
function resetAll(){
  // Reset collapsibles to default open state
  document.querySelectorAll('.collapsible-header').forEach(function(h){
    h.setAttribute('aria-expanded','true');
    var body=h.nextElementSibling;
    if(body&&body.classList.contains('collapsible-body'))body.classList.remove('collapsed');
  });
  document.getElementById('financialYear').value='2025-26';
  document.getElementById('salary').value='100000';
  document.getElementById('hourlyRate').value='50';
  document.getElementById('hourlyHours').value='38';
  document.getElementById('hourlyWeeks').value='52';
  document.getElementById('methodAnnual').checked=true;
  document.getElementById('superNo').checked=true;
  document.getElementById('basisFull').checked=true;
  document.getElementById('bonus').value='';
  document.getElementById('showBonus').checked=false;
  document.getElementById('superRate').value='12.0';
  document.getElementById('salSac').value='';
  document.getElementById('residency').value='resident';
  document.getElementById('helpDebtYes').checked=false;
  document.getElementById('tfnYes').checked=false;
  document.getElementById('extraTax').value='';
  var set=document.getElementById('showExtraTax');if(set)set.checked=false;
  document.getElementById('mlsEnabled').checked=false;
  document.getElementById('mlsFamily').value='single';
  document.getElementById('showPurchasedLeave').checked=false;
  document.getElementById('purchasedLeaveWeeks').value='';
  document.getElementById('showGeneralSalSac').checked=false;
  document.getElementById('generalSalSacAmt').value='';
  if(document.getElementById('purchasedLeaveWrap'))document.getElementById('purchasedLeaveWrap').classList.add('hidden');
  if(document.getElementById('generalSalSacWrap'))document.getElementById('generalSalSacWrap').classList.add('hidden');
  document.getElementById('seniorsOffset').checked=false;
  document.getElementById('seniorsStatus').value='single';
  document.getElementById('ftbEnabled').checked=false;
  document.getElementById('ftbUnder13').value='1';
  document.getElementById('ftb13to15').value='0';
  document.getElementById('ftb16to19').value='0';
  document.getElementById('ftbFamilyIncome').value='';
  document.getElementById('actualHours').value='22.8';
  document.getElementById('fteHours').value='38';
  document.getElementById('hasSecondJob').checked=false;
  document.getElementById('sjSalary').value='';
  document.getElementById('sjHourlyRate').value='0';
  document.getElementById('sjHours').value='0';
  document.getElementById('sjWeeks').value='52';
  document.getElementById('sjNoTFN').checked=false;
  document.getElementById('sjAnnual').checked=true;
  document.getElementById('sjSuperRate').value='12.0';
  document.getElementById('sjSalSac').value='';
  onFYChange();
}

// ─── CSV Export ──────────────────────────────────────────────────────────────
function exportCSV(){
  var fy=getFY();var lines=[];
  lines.push('Australian Income Tax Calculator Export');
  lines.push('Financial Year,'+fy.label);
  lines.push('Generated,'+(new Date()).toLocaleDateString('en-AU'));
  lines.push('');lines.push('Component,Weekly,Fortnightly,Monthly,Annual');
  for(var i=0;i<csvData.length;i++){
    var r=csvData[i];
    if(r.section){lines.push('');lines.push(r.section);continue;}
    lines.push('"'+r.label+'",'+rawNum(r.annual/52)+','+rawNum(r.annual/26)+','+rawNum(r.annual/12)+','+rawNum(r.annual));
  }
  lines.push('');lines.push('Effective Tax Rate,'+document.getElementById('effectiveRate').textContent);
  lines.push('Marginal Tax Rate,'+document.getElementById('marginalRate').textContent);
  var blob=new Blob([lines.join('\n')],{type:'text/csv;charset=utf-8;'});
  var link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='income-tax-'+fy.label.replace(/\s/g,'-')+'.csv';link.click();URL.revokeObjectURL(link.href);
}

// ─── Save HTML ───────────────────────────────────────────────────────────────
function saveHTML(){
  var fy=getFY();var now=new Date();
  var dateStr=now.toLocaleDateString('en-AU')+' '+now.toLocaleTimeString('en-AU',{hour:'2-digit',minute:'2-digit'});
  var resultsHTML=document.getElementById('combinedBody').innerHTML;
  var bracketHTML=document.getElementById('bracketBody').innerHTML;
  var ratesHTML=document.getElementById('ratesBody').innerHTML;
  var takeHome=document.getElementById('takeHomePeriod').textContent;
  var gross=document.getElementById('grossDisplay').textContent;
  var eff=document.getElementById('effectiveRate').textContent;
  var marg=document.getElementById('marginalRate').textContent;
  var sup=document.getElementById('totalSuperDisplay').textContent;
  var freqLabel=document.querySelector('label[for="'+document.querySelector('input[name="freqR"]:checked').id+'"]').textContent;
  var h='<!DOCTYPE html><html lang="en-AU"><head><meta charset="UTF-8"><title>Tax Calculation - '+fy.label+' - '+dateStr+'</title>';
  h+='<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f4f8fb;color:#22313f;line-height:1.5}';
  h+='.hd{background:#3e5f75;padding:16px 32px;border-bottom:1px solid #6a92ad;display:flex;align-items:center;gap:16px}.hd-t{color:#fff;font-size:1rem;font-weight:700}.hd-d{color:rgba(255,255,255,.7);font-size:.8rem}';
  h+='.ct{max-width:1200px;margin:0 auto;padding:24px}.cd{background:#fff;border:1px solid #d7e1ea;border-radius:16px;padding:20px 24px;margin-bottom:16px}.cd h2{font-size:1rem;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #2a9d67;color:#2d465b}';
  h+='.sg{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px}.sb{background:#f4f8fb;border:1px solid #d7e1ea;border-radius:12px;padding:12px 14px}.sb.hl{background:#e7f8ef;border-color:#2a9d67}.sb .lb{font-size:.73rem;text-transform:uppercase;letter-spacing:.3px;color:#6c7a89;font-weight:600;margin-bottom:2px}.sb .vl{font-size:1.15rem;font-weight:700;color:#2d465b}.sb.hl .vl{color:#2a9d67;font-size:1.3rem}';
  h+='table{width:100%;border-collapse:collapse;font-size:.88rem}th{text-align:left;padding:8px 10px;background:#f4f8fb;font-weight:600;font-size:.75rem;text-transform:uppercase;letter-spacing:.3px;color:#6c7a89;border-bottom:2px solid #d7e1ea}th:not(:first-child){text-align:right}td{padding:8px 10px;border-bottom:1px solid #d7e1ea;font-variant-numeric:tabular-nums}td:not(:first-child){text-align:right}';
  h+='.total-row td{font-weight:700;border-top:2px solid #2d465b;border-bottom:none}.subtotal-row td{font-weight:600;border-top:1px solid #6c7a89}.indent td:first-child{padding-left:24px;color:#6c7a89;font-size:.82rem}.section-header td{font-weight:700;background:#f4f8fb;padding-top:12px;border-bottom:1px solid #d7e1ea;font-size:.8rem;text-transform:uppercase;letter-spacing:.3px;color:#6c7a89}.negative-val{color:#e53935!important;font-weight:700!important}';
  h+='.bracket-active td{color:#22313f}.bracket-inactive td{color:#6c7a89}.lw{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px}.st{font-size:.85rem;font-weight:700;margin:0 0 8px;color:#2d465b}';
  h+='.stamp{font-size:.78rem;color:#6c7a89;margin-top:16px;padding-top:12px;border-top:1px solid #d7e1ea;line-height:1.5}';
  h+='@media print{body{background:#fff}.ct{padding:16px}.cd{box-shadow:none;break-inside:avoid}}@media(max-width:800px){.sg{grid-template-columns:1fr 1fr}.lw{grid-template-columns:1fr}}';
  h+='</style></head><body>';
  h+='<div class="hd"><div class="hd-t">Income Tax Calculation Record</div><div class="hd-d">Generated: '+dateStr+'</div></div>';
  h+='<div class="ct"><div class="cd"><h2>Results Summary</h2><div class="sg">';
  h+='<div class="sb hl"><div class="lb">Take-Home Pay ('+freqLabel+')</div><div class="vl">'+takeHome+'</div></div>';
  h+='<div class="sb"><div class="lb">Gross Taxable Income</div><div class="vl">'+gross+'</div></div>';
  h+='<div class="sb"><div class="lb">Effective Tax Rate</div><div class="vl">'+eff+'</div></div>';
  h+='<div class="sb"><div class="lb">Marginal Tax Rate</div><div class="vl">'+marg+'</div></div>';
  h+='<div class="sb"><div class="lb">Total Super</div><div class="vl">'+sup+'</div></div>';
  h+='</div></div>';
  h+='<div class="cd"><h2>Detailed Breakdown</h2><table><thead><tr><th>Component</th><th>Weekly</th><th>Fortnightly</th><th>Monthly</th><th>Annual</th></tr></thead><tbody>'+resultsHTML+'</tbody></table></div>';
  h+='<div class="cd"><div class="lw"><div><div class="st">Tax Brackets ('+fy.label+')</div><table><thead><tr><th>Bracket</th><th>Taxable</th><th>Tax Applied</th></tr></thead><tbody>'+bracketHTML+'</tbody></table></div>';
  h+='<div><div class="st">Key Rates</div><table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>'+ratesHTML+'</tbody></table></div></div></div>';
  h+='<p class="stamp">Estimates only — not financial advice. Generated on '+dateStr+' for '+fy.label+'.</p></div></body></html>';
  var blob=new Blob([h],{type:'text/html;charset=utf-8'});
  var link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='tax-calculation-'+fy.label.replace(/\s/g,'-')+'-'+now.toISOString().slice(0,10)+'.html';link.click();URL.revokeObjectURL(link.href);
}

// ─── Collapsible ─────────────────────────────────────────────────────────────
function toggleAdditionalOptions(forceState){
  var btn=document.getElementById('additionalOptionsToggle');
  var body=document.getElementById('additionalOptionsBody');
  if(!btn||!body) return;
  var isOpen=btn.getAttribute('aria-expanded')==='true';
  var open=forceState!==undefined?forceState:!isOpen;
  if(forceState===undefined)_userToggledOptions=true;
  btn.setAttribute('aria-expanded',open?'true':'false');
  body.classList.toggle('collapsed',!open);
}
var _userToggledOptions=false;
function setCollapsibleByViewport(){
  if(_userToggledOptions) return;
  var portrait=window.innerWidth<window.innerHeight||window.innerWidth<900;
  toggleAdditionalOptions(!portrait);
}

// ─── Event Listeners & Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',function(){
  // Salary slider sync
  (function(){
    var si=document.getElementById('salary'),sr=document.getElementById('salaryRange');
    if(si&&sr){
      si.addEventListener('input',function(){if(parseFloat(si.value)<=300000)sr.value=si.value;else sr.value=300000;calculate();});
      sr.addEventListener('input',function(){si.value=sr.value;calculate();});
    }
  })();
  ['sjFreqFortnightly','sjFreqWeekly','sjFreqMonthly'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.addEventListener('change',calculate);
  });
  ['freqFortnightly','freqWeekly','freqMonthly'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.addEventListener('change',calculate);
  });
  setCollapsibleByViewport();
  ['salary','hourlyRate','hourlyHours','hourlyWeeks','superRate','salSac','extraTax','purchasedLeaveWeeks','generalSalSacAmt','bonus','actualHours','fteHours','ftbUnder13','ftb13to15','ftb16to19','ftbFamilyIncome','sjSalary','sjHourlyRate','sjHours','sjWeeks','sjSuperRate','sjSalSac','sjActualHours','sjFteHours'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.addEventListener('input',calculate);
  });
  ['financialYear','residency','mlsFamily','seniorsStatus'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.addEventListener('change',function(){if(id==='financialYear')onFYChange();else calculate();});
  });
  ['methodAnnual','methodHourly','superNo','superYes','basisFull','basisPart','sjAnnual','sjHourly','sjBasisFull','sjBasisPart','helpDebtYes','helpDebtNo','tfnYes','tfnNo'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.addEventListener('change',calculate);
  });
  ['showPurchasedLeave_sw','showGeneralSalSac_sw','seniorsOffset_sw','ftbEnabled_sw','mlsEnabled_sw','hasSecondJob_sw','showBonus_sw','sjNoTFN_sw','showExtraTax_sw','helpDebtSwitch','tfnSwitch','superIncSwitch','sjSuperIncSwitch'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.addEventListener('change',calculate);
  });
  // Reset / export button wiring
  var btnReset=document.getElementById('btnReset');if(btnReset)btnReset.addEventListener('click',resetAll);
  var btnStartOver=document.getElementById('btnStartOver');if(btnStartOver)btnStartOver.addEventListener('click',function(){resetAll();window.scrollTo({top:0,behavior:'smooth'});});
  var btnCSV=document.getElementById('btnExportSummary');if(btnCSV)btnCSV.addEventListener('click',exportCSV);
  var btnSave=document.getElementById('btnSaveSnapshot');if(btnSave)btnSave.addEventListener('click',saveHTML);
  onFYChange();
});


/* ── Topbar: inject Return + Dark Mode buttons ─────────────────────────────
   Reads localStorage on load so theme persists across page navigation.     */
(function () {
  var PREF  = 'auscalc-theme';
  var html  = document.documentElement;

  var saved = localStorage.getItem(PREF);
  if (saved) html.setAttribute('data-theme', saved);

  var ARROW = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>';
  var SUN   = '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  var MOON  = '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function applyTheme(t) {
    html.setAttribute('data-theme', t);
    localStorage.setItem(PREF, t);
  }

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
    btnTheme.className = 'btn-theme';
    btnTheme.setAttribute('aria-label', 'Toggle dark mode');
    btnTheme.innerHTML = SUN + MOON;
    btnTheme.addEventListener('click', function () {
      applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
    container.appendChild(btnTheme);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButtons);
  } else {
    injectButtons();
  }
})();
