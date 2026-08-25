const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
const source=fs.readFileSync('pristeel-finance-daily-v1.js','utf8');
new Function(source);
const codeOnly=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');
assert(!/MutationObserver|setInterval\s*\(/.test(codeOnly),'Finance Daily must stay bounded/event-driven');
assert(!/supaFetch\([^\n]*['\"](?:POST|PATCH|DELETE)['\"]/.test(codeOnly),'Finance Daily must not write business data');
assert(!/\.paid\s*=|status\s*=\s*['\"](?:done|closed)/i.test(codeOnly),'Finance Daily must not complete financial work itself');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-finance" class="page active" style="display:block">
 <div id="fin-hub" class="card"><div id="fin-hub-grid"><button id="legacy-tile">Legacy finance tool</button></div></div>
 <div id="fin-view-inv" style="display:none"></div><div id="fin-view-supp" style="display:none"></div>
</div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test'});
const w=dom.window;
const calls=[];
w.supaFetch=async(path)=>{
 calls.push(['read',path]);
 return [
  {id:'t1',project_id:'p1',title:'[AUTO] Pagesë klienti — INV-1',detail:'3 ditë vonë',due_date:'2026-08-22',priority:'urgjent',status:'hapur',source:'invoice_receivable',category:'klient',source_ref:'out:1'},
  {id:'t2',project_id:'p2',title:'Plotëso afatin e pagesës — 035/2026',detail:'Fatura pa due_date',due_date:'2026-08-25',priority:'e larte',status:'hapur',source:'invoice_due_date_missing',category:'furnitor',source_ref:'in:2'},
  {id:'t3',project_id:'p3',title:'Shqyrto faturën e furnitorit',detail:'Candidate review-first',due_date:'2026-08-25',priority:'larte',status:'hapur',source:'commercial_intake_review',category:'furnitor',source_ref:'commercial-intake:p3:invoice'},
  {id:'x',title:'RFQ supplier',status:'hapur',source:'rfq',category:'furnitor'}
 ];
};
w.finSwitchTab=(tab)=>calls.push(['finance',tab]);
w.finInvFilter=(f)=>calls.push(['filter',f]);
w.pstWorkspaceGo=(k)=>calls.push(['workspace',k]);
w.pstOpenProjectWorkspace=(id)=>calls.push(['project',id]);
w.eval(source);
await w.PSTFinanceDailyV1.apply(true);
await new Promise(r=>setImmediate(r));

assert.equal(w.document.querySelectorAll('.pst-fin-work').length,3,'only human-needed finance tasks should surface');
assert.equal(w.document.querySelectorAll('.pst-fin-work.urgent').length>=1,true,'overdue finance work should be visibly urgent');
assert.ok(w.document.getElementById('pst-finance-tools'),'legacy finance tools must remain reachable');
assert.ok(w.document.getElementById('pst-finance-tools').contains(w.document.getElementById('fin-hub-grid')),'existing finance engine grid must be preserved under tools');
assert.ok(w.document.getElementById('legacy-tile'),'existing finance tools must not be deleted');
assert.equal(calls.filter(x=>x[0]==='read').length>=1,true,'Finance Daily should read canonical tasks');

w.PSTFinanceDailyV1.openRow({source:'invoice_receivable',project_id:'p1'});
await new Promise(r=>setImmediate(r));
assert(calls.some(x=>x[0]==='finance'&&x[1]==='inv'),'receivable action must use existing invoices route');
assert(calls.some(x=>x[0]==='filter'&&x[1]==='overdue'),'receivable action must focus overdue invoices');
w.PSTFinanceDailyV1.openRow({source:'invoice_due_date_missing',project_id:'p2'});
assert(calls.some(x=>x[0]==='finance'&&x[1]==='supp'),'missing supplier due-date must use existing supplier invoice route');
w.PSTFinanceDailyV1.openRow({source:'commercial_intake_review',source_ref:'commercial-intake:p3:invoice',project_id:'p3'});
assert(calls.some(x=>x[0]==='workspace'&&x[1]==='commercial'),'invoice review candidate must route to existing Commercial intake');

const css=w.document.getElementById('pst-finance-daily-css').textContent;
assert(css.includes('#page-finance.active #pst-finance-focus'));
assert(!css.includes('body:has'),'Finance cleanup must stay page-scoped');
dom.window.close();
console.log('Finance action-first work surface smoke: OK');
})().catch(e=>{console.error(e);process.exit(1);});