const fs=require('fs');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('pristeel-project-duplicate-context-v1.js','utf8');
const dom=new JSDOM('<!doctype html><body><div id="page-workspace-project"><div class="pst-pi-tabs"></div><div id="pst-pi-body"></div></div></body>',{runScripts:'dangerously',url:'https://example.test/'});
const w=dom.window;
w.__pstCurrentProjectId='a';
w._curProjId='a';
w.supaFetch=async function(q){
 if(q.startsWith('projects?')) return [
  {id:'a',name:'Dukley',client:'ITALIAN STYLE',ref:'',status:'archived',created_at:'2026-08-01',drive_folder_id:'d1'},
  {id:'b',name:'Dukley',client:'ITALIAN STYLE',ref:'',status:'archived',created_at:'2026-08-02',drive_folder_id:''}
 ];
 if(q.includes('project_emails?project_id=eq.a')) return [];
 if(q.includes('project_email_links?project_id=eq.a')) return [];
 if(q.includes('project_emails?project_id=eq.b')) return [{id:1},{id:2}];
 if(q.includes('project_email_links?project_id=eq.b')) return [{id:1},{id:2}];
 return [];
};
w.pstOpenProjectWorkspace=async function(id){w.__pstCurrentProjectId=id;return true;};
w.eval(src);
(async()=>{
 await w.PSTProjectDuplicateContextV1.inspect('a');
 const box=w.document.getElementById('pst-pdc');
 if(!box) throw new Error('duplicate context banner missing');
 const text=box.textContent;
 if(!text.includes('2 rekorde')) throw new Error('duplicate count missing');
 if(!text.includes('2 emaila')) throw new Error('email count missing');
 if(!box.querySelector('[data-pdc-open="b"]')) throw new Error('open alternate record action missing');
 console.log('project duplicate context smoke ok');
})().catch(e=>{console.error(e);process.exit(1);});
