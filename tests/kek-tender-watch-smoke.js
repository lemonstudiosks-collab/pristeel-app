const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div class="content"><div id="page-home" class="page" style="display:block"></div></div>
<div id="pst-ws-sidebar"><div class="pst-ws-nav"><button class="pst-ws-navbtn" data-key="home"><span>Home</span></button><button class="pst-ws-navbtn" data-key="apps"><span>Apps</span></button></div></div>
<div id="page-workspace-apps" class="page"><div class="pst-ws-appgrid"></div></div>
</body></html>`,{url:'https://example.test/',runScripts:'outside-only'});
const {window}=dom;
let writes=0;
const tenderRows=[
  {id:'legacy-kek',title:'Furnizim me llamarine celiku',authority:'KORPORATA ENERGJETIKE E KOSOVES',procurement_no:'KEK-1',publication_no:'PUB-KEK-1',fpp:'27300000-8',category:'raw_material',relevance_score:92,published_date:'2026-08-14',deadline:'2026-09-10',status:'new',match_reasons:['FPP produkt çeliku'],source_url:'https://e-prokurimi.rks-gov.net',payload:{}},
  {id:'krpp-trepca',title:'Furnizim me material metalik',authority:'TREPÇA Sh.A.',procurement_no:'TR-1',publication_no:'PUB-TR-1',fpp:'27000000-5',category:'raw_material',relevance_score:86,published_date:'2026-08-14',deadline:'2026-09-12',status:'new',match_reasons:['material metalik'],source_url:'https://e-prokurimi.rks-gov.net',payload:{source:'KRPP',country:'XK'}},
  {id:'app-kesh-award',title:'Blerje strukture metalike',authority:'KESH sh.a.',procurement_no:'APP-1',publication_no:'APP-PUB-1',fpp:'45223100-7',category:'steel_structure',relevance_score:90,published_date:'2026-08-10',deadline:null,status:'new',match_reasons:['CPV strukturë metalike'],source_url:'https://app.gov.al/eksportimi-i-procedurave-te-publikuara/',payload:{source:'APP_AL',country:'AL',notice_phase:'award'}},
  {id:'ted-opportunity',title:'Steel structure fabrication',authority:'EU Buyer',procurement_no:'TED-1',publication_no:'TED-PUB-1',fpp:'45223210-1',category:'steel_structure',relevance_score:95,published_date:'2026-08-14',deadline:'2026-09-20',status:'new',match_reasons:['CPV steel structure'],source_url:'https://ted.europa.eu',payload:{source:'TED',country:'DE',notice_phase:'opportunity'}}
];
window.supaFetch=function(path,method){
  if(method&&method!=='GET')writes++;
  if((!method||method==='GET')&&String(path).startsWith('kek_tender_watch?select='))return Promise.resolve(tenderRows);
  return Promise.resolve([]);
};
window.scrollTo=function(){};
window.confirm=function(){return false;};
window.alert=function(){};
window.MODULES=[{id:'procurement',pages:['import','rfq','suppliers']}];
window.pageMeta={};window.PAGE_NAV={};window.PAGE_ICON={};

const code=fs.readFileSync('pristeel-kek-tender-watch-v1.js','utf8');
vm.runInContext(code,dom.getInternalVMContext());
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

setTimeout(async()=>{
  try{
    assert.strictEqual(writes,0,'module init must not write to Supabase');
    assert.ok(window.document.querySelector('[data-key="kek-tenders"]'),'workspace navigation button should be added');
    assert.ok(window.document.querySelector('[data-pst-kek-app]'),'Apps tile should be added');
    assert.strictEqual(typeof window.pstWsKekTenders,'function');
    window.pstWsKekTenders();
    await new Promise(r=>setTimeout(r,0));
    assert.ok(window.document.getElementById('page-kek-tenders'));
    assert.strictEqual(writes,0,'opening review page must remain read-only');
    assert.ok(window.MODULES[0].pages.includes('kek-tenders'),'legacy procurement module should register the page');

    const sourceSelect=window.document.getElementById('pst-kek-source');
    assert.deepStrictEqual(Array.from(sourceSelect.options).map(o=>o.value),['all','KRPP','APP_AL','TED']);
    const defaultText=window.document.getElementById('pst-kek-list').textContent;
    assert.ok(defaultText.includes('Kosovë · KRPP'),'legacy KEK and KRPP rows should display under KRPP');
    assert.ok(defaultText.includes('EU · TED'),'TED opportunity should display as TED');
    assert.ok(!defaultText.includes('Shqipëri · APP'),'APP award must be hidden from default opportunity view');
    const krppChips=Array.from(window.document.querySelectorAll('.pst-kek-chip.source')).filter(x=>x.textContent==='Kosovë · KRPP');
    assert.strictEqual(krppChips.length,2,'legacy KEK and public KRPP should share the Kosovo KRPP source group');

    window.document.getElementById('pst-kek-phase').value='award';
    sourceSelect.value='APP_AL';
    window.pstKekRender();
    const appHtml=window.document.getElementById('pst-kek-list').innerHTML;
    const appText=window.document.getElementById('pst-kek-list').textContent;
    assert.ok(appText.includes('Shqipëri · APP'));
    assert.ok(appText.includes('KESH sh.a.'));
    assert.ok(appText.includes('CPV 45223100-7'),'APP rows should label the code as CPV');
    assert.ok(!appHtml.includes('Krijo projekt'),'award/result rows must never offer project creation');
    assert.ok(appHtml.includes('APP ↗'),'APP rows should open the APP source');

    window.document.getElementById('pst-kek-phase').value='opportunity';
    sourceSelect.value='KRPP';
    window.pstKekRender();
    const krppText=window.document.getElementById('pst-kek-list').textContent;
    assert.ok(krppText.includes('FPP 27300000-8'),'KRPP rows should keep FPP label');
    assert.ok(!krppText.includes('EU · TED'));
    console.log('KEK tender watch smoke: OK');
  }catch(err){console.error(err);process.exitCode=1;}
},10);
