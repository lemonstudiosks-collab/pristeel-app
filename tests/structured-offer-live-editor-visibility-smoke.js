const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');
const hotfix=fs.readFileSync('pristeel-offer-resave-fix-v1.js','utf8');

const dom=new JSDOM(`<!doctype html><html><body>
<div id="page-workspace-project" class="page pf2-on active" style="display:block">
  <button data-csf-action="edit">Vazhdo editimin</button>
</div>
<div id="page-oferta" class="page" style="display:none">
  <input id="of-nr"><div id="of-pre"></div>
</div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test'});
const w=dom.window;
let renderCount=0,previewCount=0;
w.registerDocNr=function(){};
w.oferPos=[];
w.renderOferPos=()=>{renderCount++;};
w.genOfer=()=>{previewCount++;};
w.scrollTo=()=>{};
w.__pstWorkspaceLegacy={showPage:function(name){
  // Mirrors the captured legacy router: active class changes, but modern Workspace
  // has already left the target legacy page with inline display:none.
  w.document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  w.document.getElementById('page-'+name).classList.add('active');
}};
w.__pstIntegrityLastData={ourOffers:[{
  id:'37f8bfb5-0d56-4b0f-9e61-93bc2a3b9694',
  supplier:'OFERTA JONE - PRISTEEL -> SSP / Fiva Investment',
  offer_ref:'PRISTEEL / EWAS / 25.08.2026 / DRAFT',
  created_at:'2026-08-25T10:50:20.667343Z',
  positions:[
    {key:'pole_6m',qty:null,unit:'pc',description:'Supply, hot-dip galvanizing and erection of 6 m siren pole',unit_price_net_eur:823.73,theoretical_steel_weight_kg:224.31,our_net_eur_per_kg:3.672},
    {key:'pole_9m',qty:null,unit:'pc',description:'Supply, hot-dip galvanizing and erection of 9 m siren pole',unit_price_net_eur:1315.68,theoretical_steel_weight_kg:385.49,our_net_eur_per_kg:3.413},
    {key:'pole_12m',qty:null,unit:'pc',description:'Supply, hot-dip galvanizing and erection of 12 m siren pole',unit_price_net_eur:2470.34,theoretical_steel_weight_kg:760.46,our_net_eur_per_kg:3.248},
    {key:'transport',qty:null,unit:'truck',description:'Transport to site',unit_price_net_eur:250},
    {key:'crane',qty:null,unit:'day',description:'Mobile crane',unit_price_net_eur:500}
  ]
}],currentOurOffer:null};

w.eval(hotfix);
const realSetTimeout=w.setTimeout;
w.setTimeout=(fn)=>{fn();return 1;};
w.document.querySelector('[data-csf-action="edit"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
w.setTimeout=realSetTimeout;

const projectPage=w.document.getElementById('page-workspace-project');
const offerPage=w.document.getElementById('page-oferta');
assert.equal(projectPage.style.display,'none','project workspace must be hidden after edit navigation');
assert.equal(offerPage.style.display,'block','offer editor must be visibly displayed, not merely active');
assert.ok(offerPage.classList.contains('active'),'offer editor must own the active page state');
assert.equal(w.oferPos.length,5,'all structured offer positions must load');
assert.equal(w.oferPos[0].qty,'','pending quantity must remain blank');
assert.equal(w.oferPos[0].price,823.73);
assert.equal(w.oferPos[4].price,500);
assert.equal(w.document.getElementById('of-nr').value,'PRISTEEL / EWAS / 25.08.2026 / DRAFT');
assert.ok(renderCount>0,'editor rows must render');
assert.ok(previewCount>0,'offer preview must regenerate');
console.log('Structured offer live editor visibility smoke passed.');
dom.window.close();
