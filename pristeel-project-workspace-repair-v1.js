/* PRISTEEL project workspace repair
 * Restores a complete project view when layered runtime owners leave only the
 * temporary loading/update fragment visible. Loaded early by startup guard.
 */
(function(){
'use strict';
if(window.__pstProjectWorkspaceRepairV1)return;
window.__pstProjectWorkspaceRepairV1=true;

function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function projectId(){
 return String(window.__pstCurrentProjectId||window._curProjId||function(){try{return localStorage.getItem('pristeel_cur_proj')||'';}catch(e){return'';}}()).trim();
}
function page(){return document.getElementById('page-workspace-project');}
function contentHost(){return document.querySelector('.content')||document.getElementById('app-content')||document.querySelector('main')||document.getElementById('app-shell-root');}
function ensurePage(){
 var p=page();
 if(p)return p;
 var host=contentHost();if(!host)return null;
 p=document.createElement('section');p.id='page-workspace-project';p.className='page';host.appendChild(p);return p;
}
function looksBroken(p){
 if(!p)return true;
 var txt=String(p.textContent||'').replace(/\s+/g,' ').trim();
 if(!txt)return true;
 if(txt==='Duke hapur projektin...')return true;
 var hasUpdate=/Çfarë po ndodh me këtë projekt|PËRDITËSIM I PROJEKTIT/i.test(txt);
 var hasReal=/Përmbledhje|Dokument|Skedar|Kontakt|Ofert|RFQ|BOM|Komercial|Ekzekutim|Financ/i.test(txt);
 return hasUpdate&&!hasReal;
}
function activate(p){
 document.querySelectorAll('.page.active').forEach(function(x){if(x!==p)x.classList.remove('active');});
 p.classList.add('active');p.style.display='block';
}
function projectFromMemory(id){
 var pools=[window.projects,window._projects,window.__pstProjects,window.PST_PROJECTS];
 for(var i=0;i<pools.length;i++){
  var a=pools[i];if(!Array.isArray(a))continue;
  for(var j=0;j<a.length;j++)if(String(a[j]&&a[j].id||'')===String(id))return a[j];
 }
 return null;
}
async function fetchProject(id){
 var local=projectFromMemory(id);if(local)return local;
 if(typeof window.supaFetch==='function'){
  try{var rows=await window.supaFetch('projects?id=eq.'+encodeURIComponent(id)+'&limit=1');if(rows&&rows[0])return rows[0];}catch(e){}
 }
 return {id:id,name:'Projekt'};
}
function tabButton(label,fn){return '<button type="button" class="pst-pwr-tab" data-pst-pwr-tab="'+esc(fn)+'">'+esc(label)+'</button>';}
function render(p,pr){
 var id=projectId();var name=pr.name||pr.title||'Projekt';
 var client=pr.client||pr.customer||pr.company||'';
 var ref=pr.reference||pr.ref||pr.project_ref||'';
 var status=pr.pipeline_stage||pr.status||pr.state||'';
 p.innerHTML=''
 +'<div class="pst-pwr-shell">'
 +'<div class="pst-pwr-head"><div><div class="pst-pwr-eye">PROJEKTI</div><h1>'+esc(name)+'</h1>'
 +'<div class="pst-pwr-meta">'+[client,ref,status].filter(Boolean).map(esc).join(' · ')+'</div></div>'
 +'<button type="button" class="pst-pwr-back" data-pst-pwr-back>← Projektet</button></div>'
 +'<div class="pst-pwr-tabs">'
 +tabButton('Përmbledhje','overview')+tabButton('Skedarët','files')+tabButton('Kontaktet','contacts')+tabButton('RFQ / Furnitorët','rfq')+tabButton('Oferta','commercial')+tabButton('Ekzekutimi','execution')+tabButton('Financat','finance')
 +'</div>'
 +'<div class="pst-pwr-body" id="pst-pwr-body">'
 +'<div class="pst-pwr-grid">'
 +'<section class="pst-pwr-card"><div class="pst-pwr-label">Gjendja</div><div class="pst-pwr-value">'+esc(status||'Pa status të konfirmuar')+'</div></section>'
 +'<section class="pst-pwr-card"><div class="pst-pwr-label">Klienti</div><div class="pst-pwr-value">'+esc(client||'—')+'</div></section>'
 +'<section class="pst-pwr-card pst-pwr-wide"><div class="pst-pwr-label">Puna në projekt</div><div class="pst-pwr-value">Përdor seksionet sipër për dokumentet, furnitorët, ofertën, ekzekutimin dhe financat e këtij projekti.</div></section>'
 +'</div></div></div>';
 p.setAttribute('data-pst-workspace-repaired','1');
 bind(p,id);
}
function invoke(candidates,id){
 for(var i=0;i<candidates.length;i++){
  var fn=window[candidates[i]];if(typeof fn!=='function')continue;
  try{fn(id);return true;}catch(e){console.warn('PRISTEEL project section:',candidates[i],e);}
 }
 return false;
}
function bind(p,id){
 var back=p.querySelector('[data-pst-pwr-back]');if(back)back.onclick=function(){
  if(typeof window.showPage==='function'){try{window.showPage('workspace-projects');return;}catch(e){}}
  var list=document.getElementById('page-workspace-projects');if(list){p.classList.remove('active');p.style.display='none';list.classList.add('active');list.style.display='block';}
 };
 p.querySelectorAll('[data-pst-pwr-tab]').forEach(function(b){b.onclick=function(){
  var k=b.getAttribute('data-pst-pwr-tab');
  var map={
   overview:['pstOpenProjectOverview','openProjectOverview'],
   files:['pstOpenProjectFiles','openProjectFiles','pstOpenProjectDocuments'],
   contacts:['pstOpenProjectContacts','openProjectContacts'],
   rfq:['pstOpenProjectRFQ','openProjectRFQ','pstOpenRfqForProject'],
   commercial:['pstOpenProjectCommercial','openProjectCommercial','pstOpenCommercialForProject'],
   execution:['pstOpenProjectExecution','openProjectExecution'],
   finance:['pstOpenProjectFinance','openProjectFinance']
  };
  if(invoke(map[k]||[],id))return;
  var body=document.getElementById('pst-pwr-body');if(body)body.innerHTML='<div class="pst-pwr-card"><div class="pst-pwr-label">'+esc(b.textContent)+'</div><div class="pst-pwr-value">Ky modul po ngarkohet nga runtime-i ekzistues. Projekti mbetet i hapur dhe konteksti ruhet.</div></div>';
 };
 });
}
async function repair(){
 var id=projectId();if(!id)return false;
 var p=ensurePage();if(!p)return false;activate(p);
 if(!looksBroken(p))return true;
 var pr=await fetchProject(id);render(p,pr||{id:id,name:'Projekt'});return true;
}
function css(){if(document.getElementById('pst-project-workspace-repair-css'))return;var s=document.createElement('style');s.id='pst-project-workspace-repair-css';s.textContent='\
#page-workspace-project[data-pst-workspace-repaired="1"]{padding:34px 42px 70px;max-width:1500px;margin:0 auto;width:100%}.pst-pwr-shell{background:transparent}.pst-pwr-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;margin-bottom:22px}.pst-pwr-eye{font-size:10px;letter-spacing:1.5px;font-weight:800;color:#7d909a;margin-bottom:5px}.pst-pwr-head h1{font-size:28px;line-height:1.15;margin:0;color:#243943}.pst-pwr-meta{font-size:12px;color:#6d7f88;margin-top:7px}.pst-pwr-back,.pst-pwr-tab{border:1px solid #bfd8e3;background:#fff;color:#286f87;border-radius:10px;padding:9px 13px;font-weight:700;cursor:pointer}.pst-pwr-tabs{display:flex;gap:8px;flex-wrap:wrap;padding:14px 0 18px;border-top:1px solid #dbe7ec;border-bottom:1px solid #dbe7ec}.pst-pwr-body{padding-top:20px}.pst-pwr-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.pst-pwr-card{background:#fff;border:1px solid #d9e5ea;border-radius:14px;padding:18px;min-height:100px}.pst-pwr-wide{grid-column:1/-1}.pst-pwr-label{font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:#82939b;font-weight:800;margin-bottom:8px}.pst-pwr-value{font-size:14px;color:#334a55;line-height:1.55}@media(max-width:800px){#page-workspace-project[data-pst-workspace-repaired="1"]{padding:22px 16px}.pst-pwr-grid{grid-template-columns:1fr}.pst-pwr-wide{grid-column:auto}.pst-pwr-head{flex-direction:column}}';document.head.appendChild(s);}
css();
window.pstRepairProjectWorkspace=repair;
document.addEventListener('pst:project-opened',function(){setTimeout(repair,0);setTimeout(repair,400);setTimeout(repair,1200);});
var old=window.pstOpenProjectWorkspace;
if(typeof old==='function'&&!old.__pstRepairWrapped){
 var wrapped=async function(id){var result;try{result=await old.apply(this,arguments);}finally{setTimeout(repair,0);setTimeout(repair,500);}return result;};
 wrapped.__pstRepairWrapped=true;window.pstOpenProjectWorkspace=wrapped;
}
var mo=new MutationObserver(function(){var p=page();if(p&&p.classList.contains('active')&&looksBroken(p))setTimeout(repair,60);});
if(document.body)mo.observe(document.body,{subtree:true,childList:true});else document.addEventListener('DOMContentLoaded',function(){mo.observe(document.body,{subtree:true,childList:true});},{once:true});
})();