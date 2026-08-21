const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-offer-project-status-sync-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'Offer status sync must not observe or poll');
 assert(source.includes("document.addEventListener('pst:offer-saved'"),'Saved offer stage sync must be event-driven');
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window,calls=[];let legacy=[];
 w._oaRows=[{id:'q1',project_id:'p1',followup_status:'open'}];
 w._allProjectsCache=[{id:'p1',status:'aktiv',pipeline_stage:'pricing'},{id:'p2',status:'aktiv',pipeline_stage:'pricing'},{id:'p3',status:'aktiv',pipeline_stage:'pricing'}];
 w.__pstIntegrityLastData={project:{id:'p1',status:'aktiv',pipeline_stage:'pricing'}};
 w.oaSetFollowupStatus=(id,val)=>{legacy.push([id,val]);};
 let projectRows={
  p1:{id:'p1',status:'aktiv',pipeline_stage:'pricing',operational_state:'active_work'},
  p2:{id:'p2',status:'aktiv',pipeline_stage:'pricing',operational_state:'active_work'},
  p3:{id:'p3',status:'pritje',pipeline_stage:'pricing',operational_state:'wait_for_client'}
 };
 w.supaFetch=async (path,method,body)=>{
   calls.push({path,method,body});
   let m=String(path).match(/^projects\?id=eq\.([^&]+)/),pid=m&&decodeURIComponent(m[1]);
   if(method==='PATCH'&&pid){projectRows[pid]=Object.assign({},projectRows[pid],body||{});return[];}
   if(pid&&String(path).includes('&select='))return[Object.assign({},projectRows[pid])];
   return[];
 };
 w.eval(source);

 w.oaSetFollowupStatus('q1','lost');await new Promise(r=>setTimeout(r,10));
 assert.strictEqual(calls.length,0,'Lost quotation must not automatically mark project lost');
 w.oaSetFollowupStatus('q1','won');await new Promise(r=>setTimeout(r,20));
 assert.deepStrictEqual(legacy,[['q1','lost'],['q1','won']],'Existing offer status action must still run');
 const wonPatch=calls.find(x=>x.path==='projects?id=eq.p1'&&x.method==='PATCH');
 assert(wonPatch&&wonPatch.body.status==='fituar','Won quotation must mark linked project as won');
 assert.strictEqual(w._allProjectsCache[0].status,'fituar','Project cache did not update');
 assert.strictEqual(w.__pstIntegrityLastData.project.status,'fituar','Open project workspace did not update');

 calls.length=0;
 w._curProjId='p2';w.__pstCurrentProjectId='p2';w.__pstIntegrityLastData.project={id:'p2',status:'aktiv',pipeline_stage:'pricing'};
 w.document.dispatchEvent(new w.CustomEvent('pst:offer-saved'));
 await new Promise(r=>setTimeout(r,25));
 const stagePatch=calls.find(x=>x.path==='projects?id=eq.p2'&&x.method==='PATCH');
 assert(stagePatch,'Saving a QUO while the project is in pricing must advance the project stage');
 assert.strictEqual(stagePatch.body.pipeline_stage,'client_offer','Saved offer must advance pricing -> client_offer');
 assert(!Object.prototype.hasOwnProperty.call(stagePatch.body,'operational_state'),'Saving an offer must not infer wait/execution state');
 assert.strictEqual(w._allProjectsCache[1].pipeline_stage,'client_offer','Project list cache did not receive client_offer stage');
 assert.strictEqual(w.__pstIntegrityLastData.project.pipeline_stage,'client_offer','Open project workspace did not receive client_offer stage');

 calls.length=0;
 w._curProjId='p3';w.__pstCurrentProjectId='p3';w.__pstIntegrityLastData.project={id:'p3',status:'pritje',pipeline_stage:'pricing',operational_state:'wait_for_client'};
 w.document.dispatchEvent(new w.CustomEvent('pst:offer-saved'));
 await new Promise(r=>setTimeout(r,25));
 assert(!calls.some(x=>x.path==='projects?id=eq.p3'&&x.method==='PATCH'),'A waiting project must not be pulled back into client_offer work merely because an offer record is re-saved');

 dom.window.close();console.log('Offer -> project status/stage sync smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
