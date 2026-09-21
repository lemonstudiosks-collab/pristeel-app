'use strict';
const fs=require('fs');
const path=require('path');
const {JSDOM}=require('jsdom');
function assert(ok,msg){if(!ok)throw new Error(msg);}
function wait(ms=80){return new Promise(r=>setTimeout(r,ms));}
(async function(){
  const dom=new JSDOM('<!doctype html><html><head></head><body><section id="page-workspace-project"></section></body></html>',{url:'https://example.test/pristeel-procurement.html',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom,doc=window.document;
  window.console=console;window.PSTCanonicalProjectWorkflowV1={render:function(){return true;}};
  const src=fs.readFileSync(path.join(__dirname,'..','pristeel-project-workbench-v2.js'),'utf8');
  window.eval(src);doc.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));doc.dispatchEvent(new window.Event('pst:modules-ready',{bubbles:true}));await wait(100);
  assert(window.PSTProjectWorkbenchV3,'Workbench v3 API missing');
  assert(!doc.getElementById('pst-project-workbench-v2'),'Workbench must not mount before project render');
  window.__pstCurrentProjectId='project-real-open';window._curProjId='project-real-open';
  window.__pstIntegrityLastData={project:{id:'project-real-open',name:'Lifecycle project',client:'Client',status:'Aktiv',pipeline_stage:'rfq_in',business_type:'fabrication'},rfqs:[],supplierOffers:[],ourOffers:[],emails:[],projectDocs:[],invoicesOut:[]};
  const page=doc.getElementById('page-workspace-project');page.classList.add('active');page.style.display='block';page.innerHTML='<div class="pst-ws-page"><div class="pst-pi-tabs"><button class="pst-pi-tab">Përmbledhja</button></div><div id="pst-pi-body"></div></div>';
  doc.dispatchEvent(new window.CustomEvent('pst:project-workspace-rendered',{detail:{projectId:'project-real-open'},bubbles:true}));await wait(120);
  assert(page.getAttribute('data-pst-project-surface-owner')==='workbench-v3','Workbench must claim real Project Detail');
  assert(doc.getElementById('pst-project-workbench-v2'),'Workbench root must mount');
  assert(doc.querySelectorAll('.pwb3-phase').length===4,'Real project open must render four compact phases');
  assert(doc.querySelectorAll('.pwb3-nav-btn').length===6,'Real project open must render navigation');
  assert(!doc.querySelector('.pst-pi-tab:not(.pwb3-nav-btn)'),'Legacy project tabs must be replaced');
  window.close();console.log('project-workbench open lifecycle smoke: ok');
})().catch(err=>{console.error(err);process.exit(1);});
