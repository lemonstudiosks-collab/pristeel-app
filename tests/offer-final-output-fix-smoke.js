const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const code=fs.readFileSync('pristeel-offer-final-output-fix-v1.js','utf8');
const dom=new JSDOM(`<!doctype html><html><body>
<div id="page-oferta">
  <select id="of-lang"><option value="sr" selected>Srpski</option><option value="de">Deutsch</option><option value="en">English</option><option value="sq">Shqip</option></select>
  <input id="of-proj" value="ITALIAN STYLE - Dukley Seafront Restoran - BUDVA">
  <input id="of-kg" value="0">
  <input id="of-pr" value="1.97">
  <input id="of-zn" value="0.43">
  <input id="of-tr" value="750">
  <input id="pst-sale-base" value="1.97">
  <input id="pst-sale-zinc" value="0.43">
  <input id="pst-sale-coat" value="0.58">
  <input id="pst-sale-transport" value="750">
  <input id="pst-sale-install" value="">
  <select id="pst-install-unit"><option value="kg" selected>EUR/kg</option><option value="ls">EUR total</option></select>
  <select id="of-pay-preset">
    <option value="net30" selected>30 dite neto (100%)</option>
    <option value="net14">14 dite neto (100%)</option>
    <option value="net60">60 dite neto (100%)</option>
    <option value="custom">E personalizuar...</option>
  </select>
  <div id="of-pre"></div>
</div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
const w=dom.window;
const d=w.document;

w.oferPos=[];
w.renderOferPos=function(){};
w.PSTOfferPositionPreservationV1={
  _removed:[],
  removed(){return this._removed.slice();},
  inferKey(p){
    if(p&&p._pstKey)return p._pstKey;
    const x=String(p&&p.desc||'').toLowerCase();
    if(/powder|pulver|coating|ngjyros/.test(x))return'coat';
    if(/cink|zink|galvan/.test(x))return'zinc';
    if(/transport|fracht|prevoz/.test(x))return'transport';
    if(/montage|installation|montim|montaž/.test(x))return'install';
    if(/steel|stahl|čeli|celik|konstruks/.test(x))return'base';
    return'';
  }
};

w.buildPayPlan=function(){
  const p=d.getElementById('of-pay-preset').value;
  if(p==='net14')return[{pct:100,ev:'net',days:14}];
  if(p==='net60')return[{pct:100,ev:'net',days:60}];
  return[{pct:100,ev:'net',days:30}];
};
w.payPlanText=function(plan){return plan[0].days+' days';};
w.collectOfferFormState=function(){return{payPreset:d.getElementById('of-pay-preset').value,oferPos:JSON.parse(JSON.stringify(w.oferPos))};};
w.applyOfferFormState=function(st){
  d.getElementById('of-pay-preset').value=st.payPreset||'net30';
  w.oferPos=JSON.parse(JSON.stringify(st.oferPos||[]));
  w.genOfer();
};
w.genOfer=function(){
  const proj=d.getElementById('of-proj').value;
  const pay=w.payPlanText(w.buildPayPlan());
  if(!w.oferPos.length){
    d.getElementById('of-pre').innerHTML='<table><tbody><tr><td>01</td><td>'+proj+'</td><td></td><td>—</td><td>—</td></tr></tbody></table><div id="paytxt">'+pay+'</div>';
  }else{
    d.getElementById('of-pre').innerHTML='<div id="paytxt">'+pay+'</div><div id="poscount">'+w.oferPos.length+'</div>';
  }
};
w.saveOfferState=function(){return w.collectOfferFormState();};
w.printOfer=function(){};
w.ofertaStartNewDraft=function(){w.oferPos=[];d.getElementById('of-pay-preset').value='net30';};
w.resetOfferForm=function(){d.getElementById('of-pay-preset').value='net30';};

w.eval(code);
const api=w.PSTOfferFinalOutputFixV1;
assert(api,'final output fix should load');
api.install();

// Old hard-coded net30 must migrate to agreement when it was not explicitly chosen.
assert.strictEqual(d.getElementById('of-pay-preset').value,'agreement','default payment must be according to agreement');
assert.strictEqual(w.payPlanText(w.buildPayPlan()),'Po dogovoru','Serbian generated payment text must say Po dogovoru');

// Commercial positions must be generated even when total kg is still unknown/zero.
w.genOfer();
assert.strictEqual(w.oferPos.length,4,'base, zinc, powder coating and transport must all exist as offer positions');
assert(w.oferPos.some(p=>p._pstKey==='base'&&p.price===1.97),'base position missing');
assert(w.oferPos.some(p=>p._pstKey==='zinc'&&p.price===0.43),'zinc position missing');
assert(w.oferPos.some(p=>p._pstKey==='coat'&&p.price===0.58),'powder coating position missing');
assert(w.oferPos.some(p=>p._pstKey==='transport'&&p.price===750&&p.unit==='ls'),'transport position missing');
assert.strictEqual(w.oferPos.filter(p=>p._pstKey==='coat').length,1,'powder coating must not duplicate');
assert.strictEqual(w.oferPos.filter(p=>p._pstKey==='transport').length,1,'transport must not duplicate');

// Repeated generation must be idempotent and must preserve manual/BOM rows.
w.oferPos.push({desc:'Ankera speciale',qty:20,unit:'pc',price:8,_pstSource:'manual'});
w.genOfer();
assert.strictEqual(w.oferPos.length,5,'manual row must survive generation');
assert(w.oferPos.some(p=>p.desc==='Ankera speciale'),'manual row was lost');

// A supplier/source deletion decision in our draft must be respected.
w.PSTOfferPositionPreservationV1._removed=['coat'];
w.oferPos=w.oferPos.filter(p=>p._pstKey!=='coat');
api.ensureCommercialPositions();
assert.strictEqual(w.oferPos.some(p=>p._pstKey==='coat'),false,'explicitly removed coating must not auto-return');
w.PSTOfferPositionPreservationV1._removed=[];

// Transport is never invented from cost. If selling transport is blank/zero, no row is added.
w.oferPos=w.oferPos.filter(p=>p._pstKey!=='transport');
d.getElementById('pst-sale-transport').value='0';d.getElementById('of-tr').value='0';
api.ensureCommercialPositions();
assert.strictEqual(w.oferPos.some(p=>p._pstKey==='transport'),false,'zero/blank selling transport must not be invented');
d.getElementById('pst-sale-transport').value='750';d.getElementById('of-tr').value='750';

// Manual payment selection must override the agreement default and persist in draft state.
const pay=d.getElementById('of-pay-preset');
pay.value='net14';pay.dispatchEvent(new w.Event('change',{bubbles:true}));
assert.strictEqual(w.payPlanText(w.buildPayPlan()),'14 days','manual net14 selection must remain active');
const explicitState=w.collectOfferFormState();
assert.strictEqual(explicitState.paymentExplicit,true,'manual payment selection must be marked explicit');
assert.strictEqual(explicitState.paymentPreset,'net14');

// Reopening a legacy net30 draft with no explicit flag migrates to agreement.
w.applyOfferFormState({payPreset:'net30',oferPos:[]});
assert.strictEqual(pay.value,'agreement','legacy implicit net30 must migrate to agreement');
assert.strictEqual(d.getElementById('paytxt').textContent,'Po dogovoru');

// A clearly non-default legacy term is treated as an intentional/manual choice.
w.applyOfferFormState({payPreset:'net14',oferPos:[]});
assert.strictEqual(pay.value,'net14','legacy net14 must be preserved as intentional');
assert.strictEqual(d.getElementById('paytxt').textContent,'14 days');

// New drafts always return to agreement.
w.ofertaStartNewDraft();
assert.strictEqual(pay.value,'agreement','new draft must reset payment to agreement');

// Fallback protection: project name must never be rendered as a profile.
w.oferPos=[];
d.getElementById('of-pre').innerHTML='<table><tbody><tr><td>01</td><td>ITALIAN STYLE - Dukley Seafront Restoran - BUDVA</td><td></td><td>—</td><td>—</td></tr></tbody></table>';
api.patchFallbackProfile();
const cells=d.querySelectorAll('#of-pre td');
assert.strictEqual(cells[1].textContent,'Čelična konstrukcija','project name must not be used as profile');

// Language-specific agreement text.
d.getElementById('of-lang').value='de';
assert.strictEqual(w.payPlanText([{pct:100,ev:'agreement',days:0}]),'Nach Vereinbarung');
d.getElementById('of-lang').value='en';
assert.strictEqual(w.payPlanText([{pct:100,ev:'agreement',days:0}]),'As agreed');
d.getElementById('of-lang').value='sq';
assert.strictEqual(w.payPlanText([{pct:100,ev:'agreement',days:0}]),'Sipas marrëveshjes');

dom.window.close();
console.log('Final offer output and agreement payment default smoke test passed.');
