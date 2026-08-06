const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-home-command-center-v2.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'Home command center must not observe or poll');
 assert(!/supaFetch\([^)]*,\s*['\"](?:POST|PATCH|DELETE)/i.test(source),'Home command center must remain read-only');
 const tasks=Array.from({length:7},(_,i)=>`<div class="pst-ws-action">Task ${i}</div>`).join('');
 const projects=Array.from({length:6},(_,i)=>`<div class="pst-ws-projectcard">Project ${i}</div>`).join('');
 const dom=new JSDOM(`<!doctype html><html><body><div id="page-workspace-home" style="display:block"><div class="pst-ws-page"><div class="pst-ws-head"></div><button id="pst-bcc-home-search">Search</button><div class="pst-ws-quick"><button>A</button><button>B</button><button>C</button><button>D</button><button>E</button></div><div class="pst-ws-card-title">Old 1</div><div class="pst-ws-card-sub">Old sub 1</div><div id="pst-ws-home-actions">${tasks}</div><div class="pst-ws-card-title">Old 2</div><div class="pst-ws-card-sub">Old sub 2</div><div id="pst-ws-home-projects">${projects}</div></div></div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 w.supaFetch=async path=>{
   if(path.startsWith('projects?'))return[{id:'1',status:'aktiv',deadline:'2026-08-10'},{id:'2',status:'mbyllur'}];
   if(path.startsWith('project_emails?'))return[{id:'e1'}];
   if(path.startsWith('rfq_log?'))return[{id:'r1',status:'pending'}];
   if(path.startsWith('offers?'))return[{id:'o1',status:'draft'}];
   return[];
 };
 w.eval(source);
 assert(w.PSTHomeCommandCenterV2,'Home command center API missing');
 w.PSTHomeCommandCenterV2.decorate(true);
 await new Promise(r=>setTimeout(r,20));
 const pulse=w.document.getElementById('pst-home-pulse');
 assert(pulse,'Business pulse was not inserted');
 assert(pulse.textContent.includes('Emaila pa projekt'),'Unassigned-email signal missing');
 assert.strictEqual(w.document.querySelectorAll('#pst-ws-home-actions .pst-hcc-hidden').length,2,'Task list was not progressively collapsed');
 assert.strictEqual(w.document.querySelectorAll('#pst-ws-home-projects .pst-hcc-hidden').length,2,'Project list was not progressively collapsed');
 assert(w.document.querySelector('#pst-ws-home-actions .pst-hcc-more'),'Task expansion control missing');
 dom.window.close();
 console.log('Home command center v2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
