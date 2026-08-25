const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
const source=fs.readFileSync('pristeel-opportunities-daily-v1.js','utf8');
new Function(source);
const codeOnly=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
assert(!/MutationObserver|setInterval\s*\(/.test(codeOnly),'Opportunities Daily must remain bounded/event-driven');
assert(!/supaFetch\s*\(/.test(codeOnly),'Opportunities Daily must reuse Tender Priority Actions rather than create another data engine');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-kek-tenders" class="page active" style="display:block">
 <div class="pst-kek-head"><div><div class="pst-kek-eye">OLD</div><div class="pst-kek-title">Tenderat</div><div class="pst-kek-sub">old</div></div><div class="pst-kek-actions"><button>Rifresko listën</button><button>TED</button></div></div>
 <div class="pst-kek-filter"><input><select></select></div>
 <div class="pst-kek-card"><div id="pst-kek-list">full feed</div></div>
</div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test'});
const w=dom.window;
const calls=[];
const direct={id:'d1',title:'Steel structure tender',authority:'Buyer A',deadline:'2026-09-10',relevance_score:97,status:'new',payload:{source:'TED',notice_phase:'opportunity',capability_fit:'strong'},match_reasons:['Strong steel fit']};
const award={id:'a1',title:'Awarded steel package',authority:'Buyer B',deadline:null,relevance_score:94,status:'review',payload:{source:'TED',notice_phase:'award',capability_fit:'strong',workflow:'winner_outreach',winner:{name:'Winner GmbH'}},match_reasons:['Relevant fabrication package']};
w.PSTTenderPriorityActionsV1={
 refresh:async()=>[direct,award],priorityRows:(xs)=>xs,phase:r=>r.payload.notice_phase==='award'?'award':'opportunity',sourceLabel:r=>r.payload.source==='TED'?'TED':'KRPP Kosovë',fit:r=>r.payload.capability_fit,reason:r=>r.match_reasons[0],dateText:()=> '10 Sht 2026',go:async id=>calls.push(['go',id]),review:async id=>calls.push(['review',id]),noGo:async id=>calls.push(['nogo',id]),prepareDraft:async id=>calls.push(['draft',id])
};
w.eval(source);
await w.PSTOpportunitiesDailyV1.apply(true);await new Promise(r=>setImmediate(r));
assert.equal(w.document.querySelectorAll('.pst-opp-decision').length,2,'priority engine output should become the only visible decision cards');
assert.ok(w.document.getElementById('pst-opportunities-all'),'full tender feed must remain reachable');
assert.ok(w.document.getElementById('pst-opportunities-all').contains(w.document.querySelector('.pst-kek-filter')),'existing tender filters must be preserved inside collapsed full list');
assert.ok(w.document.getElementById('pst-opportunities-all').contains(w.document.querySelector('.pst-kek-card')),'existing tender table must be preserved');
assert.equal(w.document.querySelector('[data-id="d1"][data-pst-opp-action="go"]').textContent,'GO');
assert.equal(w.document.querySelector('[data-id="a1"][data-pst-opp-action="draft"]').textContent,'DRAFT');
assert.equal(w.document.querySelectorAll('[data-pst-opp-action="review"]').length,2);
assert.equal(w.document.querySelectorAll('[data-pst-opp-action="nogo"]').length,2);
await w.PSTOpportunitiesDailyV1.act('go','d1',{disabled:false,textContent:'GO'});
await w.PSTOpportunitiesDailyV1.act('review','d1',{disabled:false,textContent:'REVIEW'});
await w.PSTOpportunitiesDailyV1.act('nogo','d1',{disabled:false,textContent:'NO-GO'});
await w.PSTOpportunitiesDailyV1.act('draft','a1',{disabled:false,textContent:'DRAFT'});
assert(calls.some(x=>x[0]==='go'&&x[1]==='d1'));
assert(calls.some(x=>x[0]==='review'&&x[1]==='d1'));
assert(calls.some(x=>x[0]==='nogo'&&x[1]==='d1'));
assert(calls.some(x=>x[0]==='draft'&&x[1]==='a1'));
const css=w.document.getElementById('pst-opportunities-daily-css').textContent;
assert(!css.includes('body:has'),'Opportunity cleanup must stay page-scoped');
dom.window.close();
console.log('Opportunities decision-first surface smoke: OK');
})().catch(e=>{console.error(e);process.exit(1);});