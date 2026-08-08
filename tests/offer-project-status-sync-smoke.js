const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-offer-project-status-sync-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'Offer status sync must not observe or poll');
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window,calls=[];let legacy=[];
 w._oaRows=[{id:'q1',project_id:'p1',followup_status:'open'}];
 w._allProjectsCache=[{id:'p1',status:'aktiv'}];
 w.__pstIntegrityLastData={project:{id:'p1',status:'aktiv'}};
 w.oaSetFollowupStatus=(id,val)=>{legacy.push([id,val]);};
 w.supaFetch=async (path,method,body)=>{calls.push({path,method,body});if(path==='projects?id=eq.p1&select=id,status&limit=1')return[{id:'p1',status:'aktiv'}];return[];};
 w.eval(source);
 w.oaSetFollowupStatus('q1','lost');await new Promise(r=>setTimeout(r,10));
 assert.strictEqual(calls.length,0,'Lost quotation must not automatically mark project lost');
 w.oaSetFollowupStatus('q1','won');await new Promise(r=>setTimeout(r,20));
 assert.deepStrictEqual(legacy,[['q1','lost'],['q1','won']],'Existing offer status action must still run');
 const patch=calls.find(x=>x.path==='projects?id=eq.p1'&&x.method==='PATCH');
 assert(patch&&patch.body.status==='fituar','Won quotation must mark linked project as won');
 assert.strictEqual(w._allProjectsCache[0].status,'fituar','Project cache did not update');
 assert.strictEqual(w.__pstIntegrityLastData.project.status,'fituar','Open project workspace did not update');
 dom.window.close();console.log('Offer -> project status sync smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
