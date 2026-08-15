const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const html='<!doctype html><html><body><div id="pst-ws-alertbar"><button class="pst-ws-alertitem">1 email pa projekt</button></div><div id="page-kek-tenders" style="display:block"><div class="pst-kek-eye"></div><div class="pst-kek-sub"></div><input id="pst-kek-search"><select id="pst-kek-source"><option value="all" selected>all</option><option value="TED">TED</option><option value="KRPP">KRPP</option><option value="APP_AL">APP</option></select><select id="pst-kek-phase"></select><select id="pst-kek-category"><option value="all" selected>all</option></select><select id="pst-kek-status"></select><div id="pst-kek-list"></div></div><b id="pst-kek-nav-badge"></b></body></html>';
const dom=new JSDOM(html,{url:'https://example.test/',runScripts:'outside-only'});
const {window}=dom;
window.setTimeout=(fn)=>{fn();return 1;};
window.clearTimeout=()=>{};
window.alert=()=>{};window.confirm=()=>true;window.open=()=>{};
let writes=[];
let monitorOpens=0;
let aiEnabled=true;
let aiCalls=[];
const rows=[
 {id:'ted-award',source_key:'TED:A',procurement_no:'TED-A',title:'Structural steel award',authority:'Buyer GmbH',category:'steel_structure',relevance_score:96,status:'new',published_date:'2026-08-14',fpp:'45223210',match_reasons:['steel'],payload:{source:'TED',notice_phase:'award',winner:{name:'Winner Stahl GmbH',email:'sales@winner.example',website:'https://winner.example',city:'Berlin',country:'DE'}}},
 {id:'ted-no-winner',source_key:'TED:N',procurement_no:'TED-N',title:'Steel award awaiting winner publication',authority:'Buyer SA',category:'steel_structure',relevance_score:94,status:'new',published_date:'2026-08-14',fpp:'45223210',match_reasons:['steel'],payload:{source:'TED',notice_phase:'award',winner:{name:'',email:'',website:'',city:'',country:''}}},
 {id:'ted-open',source_key:'TED:O',procurement_no:'TED-O',title:'Open TED steel tender',authority:'Other Buyer',category:'steel_structure',relevance_score:90,status:'review',published_date:'2026-08-14',deadline:'2026-09-01',fpp:'45223210',match_reasons:['steel'],payload:{source:'TED',notice_phase:'opportunity'}},
 {id:'krpp-open',source_key:'KRPP:K',procurement_no:'K-1',title:'Furnizim me profile çeliku',authority:'Kosovo authority',category:'raw_material',relevance_score:88,status:'new',published_date:'2026-08-14',deadline:'2026-08-30',fpp:'2711',match_reasons:['çelik'],payload:{source:'KRPP',notice_phase:'opportunity'}}
];
window.supaFetch=async(path,method,body)=>{
 if(!method||method==='GET')return rows.map(r=>JSON.parse(JSON.stringify(r)));
 writes.push({path,method,body});
 const id=decodeURIComponent((path.match(/id=eq\.([^&]+)/)||[])[1]||'');const r=rows.find(x=>x.id===id);if(r&&body)Object.assign(r,body);return[];
};
window.PSTAI={
 hasApiKey:()=>aiEnabled,
 requestJson:async options=>{
  aiCalls.push(options);
  return{priority:'high',fit:'strong',business_mode:'direct_bid',summary:'AI summary grounded in the supplied record.',why_relevant:['Awarded structural steel scope','Winner contact is available'],checks:['Verify exact awarded scope','Verify winner role'],next_action:'Prepare a controlled review before outreach.',outreach_angle:'Offer fabrication support.'};
 }
};
window.pstKekLoad=async()=>{};
window.pstKekRender=()=>{};
window.pstKekSetStatus=async(id,status)=>{const r=rows.find(x=>x.id===id);if(r)r.status=status;};
window.pstKekPromote=async()=>{};
window.pstKekOpenSource=()=>{};window.pstKekOpenProject=()=>{};
window.pstWsKekTenders=()=>{monitorOpens++;};
const code=fs.readFileSync('pristeel-tender-business-flow-v1.js','utf8');
vm.runInContext(code,dom.getInternalVMContext());

(async()=>{
 assert.ok(window.pstTenderBusinessFlow,'business flow API should be exposed');
 assert.equal(aiCalls.length,0,'Tender Intelligence must never call AI automatically on module startup');
 assert.equal(window.pstTenderBusinessFlow.phaseMatch(rows[2],'all'),false,'TED opportunities must be hidden even under all');
 assert.equal(window.pstTenderBusinessFlow.isOperationalFocus(rows[0]),true,'TED award with winner is operational');
 assert.equal(window.pstTenderBusinessFlow.isOperationalFocus(rows[1]),false,'TED award without winner is intelligence-only until winner data exists');
 assert.equal(window.pstTenderBusinessFlow.isOperationalFocus(rows[3]),true,'KRPP opportunity is operational');
 assert.equal(window.pstTenderBusinessFlow.intelligenceMode(rows[0]),'winner_outreach','TED structural award must be winner outreach');
 assert.equal(window.pstTenderBusinessFlow.intelligenceMode(rows[3]),'direct_bid','KRPP opportunity must be direct bid');

 const homeBoundaryRows=rows.concat([
  {id:'app-open',status:'review',payload:{source:'APP_AL',notice_phase:'opportunity'}},
  {id:'app-award',status:'new',payload:{source:'APP_AL',notice_phase:'award'}},
  {id:'krpp-ignored',status:'ignored',payload:{source:'KRPP',notice_phase:'opportunity'}},
  {id:'ted-contacted',status:'review',payload:{source:'TED',notice_phase:'award',ted_contact_status:'contacted',winner:{name:'Already Contacted GmbH'}}}
 ]);
 const signalSummary=window.pstTenderBusinessFlow.homeSignalSummary(homeBoundaryRows);
 assert.deepEqual(JSON.parse(JSON.stringify(signalSummary)),{total:3,opportunities:2,ted_winners:1},'Home signal must count only direct-bid opportunities and actionable TED winners');
 const writesBeforeHome=writes.length;
 await window.pstTenderBusinessFlow.refreshHomeSignal(true);
 assert.equal(writes.length,writesBeforeHome,'Home tender refresh must remain read-only');
 const homeSignal=window.document.getElementById('pst-tender-home-signal');
 assert.ok(homeSignal,'actionable tenders should surface one Home signal');
 assert.ok(window.document.getElementById('pst-ws-alertbar').textContent.includes('1 email pa projekt'),'Home tender signal must preserve existing Home alerts');
 assert.ok(homeSignal.textContent.includes('2'),'Home signal should aggregate the two operational rows in the current dataset');
 homeSignal.click();
 assert.equal(monitorOpens,1,'Home tender signal must open the existing Tender Monitor');

 await window.pstKekLoad();
 let text=window.document.getElementById('pst-kek-list').textContent;
 assert.ok(!text.includes('Steel award awaiting winner publication'),'TED award without winner must stay out of operational focus');
 assert.equal(window.document.getElementById('pst-kek-nav-badge').textContent,'2','badge must count only actionable TED winners plus direct-bid opportunities');
 assert.equal(aiCalls.length,0,'Loading and rendering Tender Monitor must remain AI-free until explicit click');
 assert.ok(text.includes('AI Brief'),'operational focus rows should expose explicit AI Brief actions');

 const writesBeforeBrief=writes.length;
 const tedBrief=await window.pstTenderIntelligence('ted-award');
 assert.equal(aiCalls.length,1,'AI Brief click should make exactly one AI request');
 assert.equal(writes.length,writesBeforeBrief,'AI Brief must not write to Supabase');
 assert.equal(tedBrief.engine,'ai','successful request should be identified as AI analysis');
 assert.equal(tedBrief.business_mode,'winner_outreach','AI cannot override the hard TED award business boundary');
 assert.ok(aiCalls[0].messages[0].content.includes('already awarded'),'system prompt must explicitly guard TED awards from bid recommendations');
 assert.ok(aiCalls[0].messages[1].content.includes('winner_outreach'),'request must lock the TED business mode');
 assert.ok(window.document.getElementById('pst-ti-backdrop'),'AI Brief should render inside a controlled modal');
 assert.ok(window.document.getElementById('pst-ti-body').textContent.includes('AI summary'),'modal should show returned intelligence');
 assert.ok(window.document.getElementById('pst-ti-backdrop').textContent.includes('nuk krijon projekt'),'modal must state the read-only boundary');
 window.pstTenderIntelligenceClose();

 aiEnabled=false;
 const aiCallsBeforeFallback=aiCalls.length;
 const fallbackBrief=await window.pstTenderIntelligence('krpp-open');
 assert.equal(aiCalls.length,aiCallsBeforeFallback,'missing AI key must not attempt a provider request');
 assert.equal(fallbackBrief.engine,'rules','missing AI key must fall back to deterministic rules');
 assert.equal(fallbackBrief.business_mode,'direct_bid','fallback must preserve KRPP direct-bid boundary');
 assert.ok(fallbackBrief.next_action.includes('verifiko'),'fallback must require human verification before project creation');
 assert.equal(writes.length,writesBeforeBrief,'fallback brief must remain read-only');
 aiEnabled=true;
 window.pstTenderIntelligenceClose();

 window.document.getElementById('pst-kek-phase').value='award';
 window.document.getElementById('pst-kek-status').value='all';
 window.pstKekRender();
 const noWinnerRow=[...window.document.querySelectorAll('#pst-kek-list tr')].find(tr=>tr.textContent.includes('Steel award awaiting winner publication'));
 assert.ok(noWinnerRow,'TED award without winner must remain visible under award intelligence');
 assert.ok(noWinnerRow.textContent.includes('ende nuk është publikuar'),'missing-winner intelligence message must remain visible');
 assert.ok(noWinnerRow.textContent.includes('Fituesi i papublikuar'),'missing-winner status must not claim a new winner exists');
 assert.ok(!noWinnerRow.textContent.includes('Për kontakt'),'missing-winner row must not offer outreach action');
 assert.ok(!noWinnerRow.textContent.includes('AI Brief'),'missing-winner row must not trigger actionable AI outreach analysis');
 assert.ok(noWinnerRow.textContent.includes('TED ↗'),'missing-winner row must keep the official TED source action');
 window.document.getElementById('pst-kek-phase').value='focus';
 window.document.getElementById('pst-kek-status').value='open';
 window.pstKekRender();
 text=window.document.getElementById('pst-kek-list').textContent;
 assert.ok(text.includes('Winner Stahl GmbH'),'TED winner must be visible');
 assert.ok(text.includes('Furnizim me profile çeliku'),'KRPP opportunity must be visible');
 assert.ok(!text.includes('Open TED steel tender'),'TED open tender must not be operationally visible');
 const tedRow=[...window.document.querySelectorAll('#pst-kek-list tr')].find(tr=>tr.textContent.includes('Winner Stahl GmbH'));
 assert.ok(tedRow,'TED award row missing');
 assert.ok(!tedRow.textContent.includes('Krijo projekt'),'TED award must never offer project creation');
 assert.ok(tedRow.textContent.includes('AI Brief'),'actionable TED winner should have explicit AI Brief');
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