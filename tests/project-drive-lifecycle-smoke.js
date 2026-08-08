const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-project-drive-lifecycle-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'Drive lifecycle must not observe or poll');
 assert(/pgi2-file:checked/.test(source),'Gmail lifecycle must distinguish selected attachments');
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;let ensures=0;
 w.supaFetch=async path=>path.startsWith('projects?id=eq.p1')?[{id:'p1',name:'P1',drive_folder_id:null}]:[];
 w.PSTDriveImport={ensureProjectFolderById:async id=>{assert.strictEqual(id,'p1');ensures++;return{id:'drive1'};}};
 w.eval(source);
 assert(w.PSTProjectDriveLifecycleV1,'Drive lifecycle API missing');
 const ok=await w.PSTProjectDriveLifecycleV1.ensureForCreatedProject('p1');
 assert.strictEqual(ok,true,'Explicit project-creation lifecycle should create missing Drive folder');
 assert.strictEqual(ensures,1,'Drive folder should be created exactly once per explicit lifecycle call');
 dom.window.close();
 console.log('Project Drive lifecycle smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
