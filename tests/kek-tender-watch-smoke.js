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
let confirmMode=false;
let createdProjectBody=null;
let tenderPatchBody=null;
let createdProject=null;
const tenderRows=[
  {id:'legacy-kek',source_key:'KEK:1',title:'Furnizim me llamarine celiku',authority:'KORPORATA ENERGJETIKE E KOSOVES',procurement_no:'KEK-1',publication_no:'PUB-KEK-1',fpp:'27300000-8',category:'raw_material',relevance_score:92,published_date:'2026-08-14',deadline:'2026-09-10',status:'new',match_reasons:['FPP produkt çeliku'],source_url:'https://e-prokurimi.rks-gov.net',payload:{}},
  {id:'krpp-trepca',source_key:'KRPP:TR-1',title:'Furnizim me material metalik',authority:'TREPÇA Sh.A.',procurement_no:'TR-1',publication_no:'PUB-TR-1',fpp:'27000000-5',category:'raw_material',relevance_score:86,published_date:'2026-08-14',deadline:'2026-09-12',status:'new',match_reasons:['material metalik'],source_url:'https://e-prokurimi.rks-gov.net',payload:{source:'KRPP',country:'XK'}},
  {id:'app-kesh-award',source_key:'APP_AL:APP-1',title:'Blerje strukture metalike',authority:'KESH sh.a.',procurement_no:'APP-1',publication_no:'APP-PUB-1',fpp:'45223100-7',category:'steel_structure',relevance_score:90,published_date:'2026-08-10',deadline:null,status:'new',match_reasons:['CPV strukturë metalike'],source_url:'https://app.gov.al/eksportimi-i-procedurave-te-publikuara/',payload:{source:'APP_AL',country:'AL',notice_phase:'award'}},
  {id:'ted-opportunity',source_key:'TED:TED-PUB-1',title:'Steel structure fabrication',authority:'EU Buyer',procurement_no:'TED-1',publication_no:'TED-PUB-1',fpp:'45223210-1',category:'steel_structure',relevance_score:95,published_date:'2026-08-14',deadline:'2026-09-20',status:'new',match_reasons:['CPV steel structure','titull i qartë për strukturë çeliku'],source_url:'https://ted.europa.eu/en/notice/TED-PUB-1/html',payload:{source:'TED',country:'DE',notice_phase:'opportunity'}}
];
window.supaFetch=function(path,method,body){
  const m=method||'GET';
  if(m!=='GET')writes++;
  if(m==='GET'&&String(path).startsWith('kek_tender_watch?select='))return Promise.resolve(tenderRows);
  if(m==='GET'&&String(path).startsWith('projects?ref=eq.TED-1')&&String(path).includes('order=created_at.desc'))return Promise.resolve(createdProject?[createdProject]:[]);
  if(m==='GET'&&String(path).startsWith('projects?ref=eq.TED-1'))return Promise.resolve([]);
  if(m==='POST'&&path==='projects'){
    createdProjectBody=JSON.parse(JSON.stringify(body));
    createdProject={id:'project-ted-1',name:body.name,ref:body.ref};
    return Promise.resolve([createdProject]);
  }
  if(m==='PATCH'&&String(path).startsWith('kek_tender_watch?id=eq.ted-opportunity')){
    tenderPatchBody=JSON.parse(JSON.stringify(body));
    return Promise.resolve([]);
  }
  return Promise.resolve([]);
};
window.scrollTo=function(){};
window.confirm=function(){return confirmMode;};
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

    const writesBeforePromotion=writes;
    confirmMode=true;
    await window.pstKekPromote('ted-opportunity');
    confirmMode=false;
    assert.ok(createdProjectBody,'TED opportunity should use the existing controlled project creation path after confirmation');
    assert.equal(createdProjectBody.name,'Steel structure fabrication');
    assert.equal(createdProjectBody.client,'EU Buyer','TED buyer must become project client');
    assert.equal(createdProjectBody.ref,'TED-1','stable tender procurement ref must become project ref');
    assert.equal(createdProjectBody.location,'DE','TED country must be preserved');
    assert.equal(createdProjectBody.deadline,'2026-09-20','TED bid deadline must be preserved');
    assert.equal(createdProjectBody.status,'pritje');
    assert.equal(createdProjectBody.pipeline_stage,'rfq_in');
    assert.ok(createdProjectBody.notes.includes('Burimi: EU · TED'));
    assert.ok(createdProjectBody.notes.includes('Source key: TED:TED-PUB-1'),'project must preserve stable tender source key');
    assert.ok(createdProjectBody.notes.includes('Numri i publikimit: TED-PUB-1'));
    assert.ok(createdProjectBody.notes.includes('CPV: 45223210-1'));
    assert.ok(createdProjectBody.notes.includes('Kategoria automatike: Strukturë çeliku (95%)'));
    assert.ok(createdProjectBody.notes.includes('CPV steel structure · titull i qartë për strukturë çeliku'),'project must preserve relevance evidence');
    assert.ok(createdProjectBody.notes.includes('https://ted.europa.eu/en/notice/TED-PUB-1/html'),'project must preserve official tender URL');
    assert.deepEqual(tenderPatchBody&&{status:tenderPatchBody.status,project_id:tenderPatchBody.project_id},{status:'promoted',project_id:'project-ted-1'},'promotion must link the tender to the created project');
    assert.equal(writes,writesBeforePromotion+2,'promotion should perform exactly project creation plus tender-link write');

    console.log('KEK tender watch smoke: OK');
  }catch(err){console.error(err);process.exitCode=1;}
},10);
