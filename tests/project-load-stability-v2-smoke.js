const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-load-stability-v2.js','utf8');
  assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Project load stability must not observe or poll');
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.__pstProjectFullWait=25;w.__pstProjectReadWait=20;
  w.PSTProjectDataIntegrity={load:()=>new Promise(()=>{})};
  w.supaFetch=async path=>{
    if(path.startsWith('projects?id='))return[{id:'p1',name:'Test Project',client:'Client',status:'aktiv'}];
    if(path.startsWith('project_emails?'))return[{id:'e1',project_id:'p1',subject:'RFQ',has_attachments:true}];
    return[];
  };
  w.eval(source);
  const started=Date.now();
  const data=await w.PSTProjectDataIntegrity.load('p1');
  assert(Date.now()-started<500,'Project fallback did not resolve in bounded time');
  assert(data&&data.project&&data.project.id==='p1','Project fallback lost project data');
  assert.strictEqual(data.__stabilityFallback,true,'Timed-out full loader did not use fallback');
  assert(Array.isArray(data.emails)&&data.emails.length===1,'Project fallback lost direct email data');
  assert(data.drive&&data.drive.state==='deferred','Fallback must defer optional Drive loading');
  dom.window.close();
  console.log('Project load stability v2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
