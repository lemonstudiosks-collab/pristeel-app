const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const html='<!doctype html><html><body><div id="page-kek-tenders" style="display:block"><div class="pst-kek-eye"></div><div class="pst-kek-sub"></div><input id="pst-kek-search"><select id="pst-kek-source"><option value="all" selected>all</option><option value="TED">TED</option><option value="KRPP">KRPP</option><option value="APP_AL">APP</option></select><select id="pst-kek-phase"></select><select id="pst-kek-category"><option value="all" selected>all</option></select><select id="pst-kek-status"></select><div id="pst-kek-list"></div></div><b id="pst-kek-nav-badge"></b></body></html>';
const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only'});
const {window}=dom;
window.setTimeout=(fn)=>{fn();return 1;};
window.alert=()=>{};window.confirm=()=>true;window.open=()=>{};
let writes=[];
const rows=[
 {id:'ted-award',source_key:'TED:A',procurement_no:'TED-A',title:'Structural steel award',authority:'Buyer GmbH',category:'steel_structure',relevance_score:96,status:'new',published_date:'2026-08-14',fpp:'45223210',match_reasons:['steel'],payload:{source:'TED',notice_phase:'award',winner:{name:'Winner Stahl GmbH',email:'sales@winner.example',website:'https://winner.example',city:'Berlin',country:'DE'}}},
 {id:'ted-open',source_key:'TED:O',procurement_no:'TED-O',title:'Open TED steel tender',authority:'Other Buyer',category:'steel_structure',relevance_score:90,status:'review',published_date:'2026-08-14',deadline:'2026-09-01',fpp:'45223210',match_reasons:['steel'],payload:{source:'TED',notice_phase:'opportunity'}},
 {id:'krpp-open',source_key:'KRPP:K',procurement_no:'K-1',title:'Furnizim me profile çeliku',authority:'Kosovo authority',category:'raw_material',relevance_score:88,status:'new',published_date:'2026-08-14',deadline:'2026-08-30',fpp:'2711',match_reasons:['çelik'],payload:{source:'KRPP',notice_phase:'opportunity'}}
];
window.supaFetch=async(path,method,body)=>{
 if(!method||method==='GET')return rows.map(r=>JSON.parse(JSON.stringify(r)));
 writes.push({path,method,body});
 const id=decodeURIComponent((path.match(/id=eq\.([^&]+)/)||[])[1]||'');const r=rows.find(x=>x.id===id);if(r&&body)Object.assign(r,body);return[];
};
window.pstKekLoad=async()=>{};
window.pstKekRender=()=>{};
window.pstKekSetStatus=async(id,status)=>{const r=rows.find(x=>x.id===id);if(r)r.status=status;};
window.pstKekPromote=async()=>{};
window.pstKekOpenSource=()=>{};window.pstKekOpenProject=()=>{};
const code=fs.readFileSync('pristeel-tender-business-flow-v1.js','utf8');
vm.runInContext(code,dom.getInternalVMContext());

(async()=>{
 assert.ok(window.pstTenderBusinessFlow,'business flow API should be exposed');
 assert.equal(window.pstTenderBusinessFlow.phaseMatch(rows[1],'all'),false,'TED opportunities must be hidden even under all');
 assert.equal(window.pstTenderBusinessFlow.isOperationalFocus(rows[0]),true,'TED award is operational');
 assert.equal(window.pstTenderBusinessFlow.isOperationalFocus(rows[2]),true,'KRPP opportunity is operational');
 await window.pstKekLoad();
 let text=window.document.getElementById('pst-kek-list').textContent;
 assert.ok(text.includes('Winner Stahl GmbH'),'TED winner must be visible');
 assert.ok(text.includes('Furnizim me profile çeliku'),'KRPP opportunity must be visible');
 assert.ok(!text.includes('Open TED steel tender'),'TED open tender must not be operationally visible');
 const tedRow=[...window.document.querySelectorAll('#pst-kek-list tr')].find(tr=>tr.textContent.includes('Winner Stahl GmbH'));
 assert.ok(tedRow,'TED award row missing');
 assert.ok(!tedRow.textContent.includes('Krijo projekt'),'TED award must never offer project creation');
 assert.ok(tedRow.textContent.includes('Për kontakt'),'new TED winner must offer outreach queue action');
 assert.ok(window.document.querySelector('.pst-kek-sub').textContent.includes('TED: vetëm kontrata të dhëna'));

 await window.pstTenderBizSetStatus('ted-award','review');
 text=window.document.getElementById('pst-kek-list').textContent;
 assert.ok(text.includes('Për kontakt'),'TED review state must be labelled Për kontakt, not Në shqyrtim');
 await window.pstTenderBizMarkContacted('ted-award');
 assert.ok(writes.some(w=>w.body&&w.body.payload&&w.body.payload.ted_contact_status==='contacted'),'contacted action must persist in TED payload');
 window.document.getElementById('pst-kek-status').value='contacted';window.pstKekRender();
 text=window.document.getElementById('pst-kek-list').textContent;
 assert.ok(text.includes('Kontaktuar'),'contacted TED winners need a completed outreach state');
 console.log('Tender business flow smoke: OK');
})().catch(err=>{console.error(err);process.exitCode=1;});
