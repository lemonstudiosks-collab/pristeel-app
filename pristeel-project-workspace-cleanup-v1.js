/* PRISTEEL project workspace cleanup v1
 * Final UI reconciler for the modern Project-First workspace.
 * Removes legacy/decorative controls, keeps one clear way back to Projects,
 * reconciles won/execution projects with their real operational state,
 * and makes Project Intelligence work visibly while a question is running.
 * UI-only: no business-data writes and no outbound communication.
 */
(function(){
'use strict';
if(window.__pstProjectWorkspaceCleanupV1)return;
window.__pstProjectWorkspaceCleanupV1=true;

var HIDE='pst-pwc-hide';
var busyTimers={};
var scheduled=false;

function str(v){return String(v==null?'':v);}
function norm(v){return str(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function data(){return window.__pstIntegrityLastData||null;}
function activePage(){var p=document.getElementById('page-workspace-project');return p&&p.classList.contains('active')&&p.classList.contains('pf2-on')?p:null;}
function currentProject(){var d=data();return d&&d.project||null;}
function executionProject(){
  var p=currentProject();if(!p)return false;
  var s=norm(p.status),stage=norm(p.pipeline_stage),op=norm(p.operational_state);
  return /(^| )(fituar|won)( |$)/.test(s)||/production|execution|ekzek|transport/.test(stage)||/production|execution|ekzek/.test(op);
}
function fileCount(d){d=d||{};return [].concat(d.projectDocs||[],d.attachmentLinks||[],d.inboxDocs||[],d.docs||[],d.mailAttachments||[],d.drive&&d.drive.rows||[]).length;}
function emailCount(d){return d&&Array.isArray(d.emails)?d.emails.length:0;}
function addCss(){
  if(document.getElementById('pst-pwc-css'))return;
  var s=document.createElement('style');s.id='pst-pwc-css';s.textContent=`
.${HIDE}{display:none!important}
#page-workspace-project .pst-pwc-back{display:inline-flex!important;align-items:center;gap:6px;border:1px solid #D5E2E6!important;background:#fff!important;color:#315F72!important;font-weight:780!important}
#page-workspace-project .pst-pwc-back:hover{background:#EEF6F8!important;border-color:#BFD8E1!important}
#page-workspace-project .pf2-shortcuts{gap:9px!important}
#page-workspace-project .pf2-shortcut{min-height:72px!important;padding:12px 13px!important;border-color:#DCE7EA!important;background:#fff!important}
#page-workspace-project .pf2-shortcut>span{font-size:7.5px!important;letter-spacing:.55px!important;color:#7E9097!important}
#page-workspace-project .pf2-shortcut>b{font-size:11px!important;line-height:1.28!important;color:#33474F!important;margin-top:5px!important}
#page-workspace-project .pf2-shortcut>small{font-size:8px!important;color:#91A0A6!important;margin-top:4px!important}
#page-workspace-project .pf2-hero{align-items:stretch!important}
#page-workspace-project .pf2-hero>div:first-child{padding-right:10px!important}
.pst-pic-working-banner{display:none;margin:10px 0 4px;padding:11px 12px;border:1px solid #BFD8E1;border-radius:10px;background:#EEF7FA;color:#315F72;align-items:flex-start;gap:10px}
.pst-pic-working .pst-pic-working-banner{display:flex}
.pst-pic-working-dot{width:9px;height:9px;border-radius:50%;background:#4D93AC;flex:0 0 auto;margin-top:3px;animation:pst-pwc-pulse 1s ease-in-out infinite}
.pst-pic-working-banner b{display:block;font-size:10px}.pst-pic-working-banner span{display:block;font-size:8.5px;color:#66818C;margin-top:2px;line-height:1.4}
.pst-pic-working .pst-pic-prompts{opacity:.48;pointer-events:none}.pst-pic-working .pst-pic-compose{opacity:.68}
.pst-pic-working .pst-pic-send{cursor:wait!important}
@keyframes pst-pwc-pulse{0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}
`;
  document.head.appendChild(s);
}
function unhideOutsideProject(){if(activePage())return;document.querySelectorAll('.'+HIDE).forEach(function(x){x.classList.remove(HIDE);});}
function exactText(el){return norm(el&&el.textContent);}
function hideTopClutter(){
  if(!activePage())return;
  var p=currentProject(),projectName=norm(p&&p.name);
  var kill={'administrator':1,'mbyll projektin':1,'ruaj':1,'projekt i ri':1,'eksporto':1};
  document.querySelectorAll('button,[role="button"],a,span,div').forEach(function(el){
    if(el.closest&&el.closest('#page-workspace-project .pst-pi-head'))return;
    if(el.closest&&el.closest('.sidebar'))return;
    var r=el.getBoundingClientRect?el.getBoundingClientRect():null;if(!r||r.top<0||r.top>145||r.height>62||r.width>520)return;
    var t=exactText(el);if(!t)return;
    if(kill[t]||/^\d+\s*°/.test(t)||t==='kthjellet'||t==='kthjellët'||(projectName&&t===projectName))el.classList.add(HIDE);
  });
}
function hideLegacyFlow(){
  if(!activePage())return;
  document.querySelectorAll('nav,section,div').forEach(function(el){
    if(el.classList&&(/(^|\s)(pst-pi-tabs|pwf-stage-nav|pwf-procurement-head)(\s|$)/).test(el.className||''))return;
    var r=el.getBoundingClientRect?el.getBoundingClientRect():null;if(!r||r.top<90||r.top>285||r.height<18||r.height>100)return;
    var t=' '+norm(el.textContent)+' ';
    var hits=[' bom ',' rfq ',' ofertat ',' krahasimi ',' cmimi ',' faturat ',' skedaret '].filter(function(x){return t.indexOf(x)>-1;}).length;
    if(hits>=6)el.classList.add(HIDE);
  });
}
function ensureBack(){
  var page=activePage(),actions=page&&page.querySelector('.pst-pi-actions');if(!actions)return;
  var b=actions.querySelector('.pst-pwc-back');
  if(!b){b=document.createElement('button');b.type='button';b.className='pst-pi-btn pst-pwc-back';b.textContent='← Projektet';b.onclick=function(){
    try{if(typeof window.pstProjectsModernOpen==='function')return window.pstProjectsModernOpen();}catch(e){}
    try{if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('projects');}catch(e){}
  };actions.insertBefore(b,actions.firstChild);}
  Array.prototype.slice.call(actions.querySelectorAll('button')).forEach(function(x){var t=norm(x.textContent);if(t==='projektet'&&x!==b)x.classList.add(HIDE);});
}
function setText(el,text){if(el&&el.textContent!==text)el.textContent=text;}
function setHtml(el,html){if(el&&el.innerHTML!==html)el.innerHTML=html;}
function setButtonAction(btn,action,text){if(!btn)return;setText(btn,text);if(btn.getAttribute('data-pf2-action')!==action)btn.setAttribute('data-pf2-action',action);}
function reconcileHero(){
  if(!executionProject())return;
  var page=activePage(),hero=page&&page.querySelector('.pf2-hero');if(!hero)return;
  var h=hero.querySelector('h2'),p=hero.querySelector('p'),main=hero.querySelector('.pf2-actions .pf2-btn');
  setText(h,'Ekzekutimi i projektit');
  setText(p,'Kontrollo prodhimin, dokumentacionin e cilësisë, afatin, detyrimet financiare dhe dorëzimin.');
  setButtonAction(main,'tab:execution','Hap ekzekutimin');
  var cards=hero.querySelectorAll('.pf2-shortcut');
  Array.prototype.slice.call(cards).forEach(function(c){
    var label=norm(c.querySelector('span')&&c.querySelector('span').textContent),b=c.querySelector('b'),sm=c.querySelector('small');
    if(label==='faza'){setText(b,'Ekzekutim');setText(sm,'Hap progresin dhe detyrat');if(c.getAttribute('data-pf2-action')!=='tab:execution')c.setAttribute('data-pf2-action','tab:execution');}
    if(label==='oferta'){setHtml(b,'<span class="pf2-badge ok">Fituar / në ekzekutim</span>');setText(sm,'Kontrata, pagesat dhe garancitë');if(c.getAttribute('data-pf2-action')!=='tab:commercial')c.setAttribute('data-pf2-action','tab:commercial');}
    if(label==='komunikimi')setText(sm,'Emailat e lidhur me projektin');
    if(label==='skedaret'||label==='skedarët')setText(sm,fileCount(data())+' skedarë të lidhur');
  });
}
function reconcileCanonical(){
  if(!executionProject())return;
  var page=activePage();if(!page)return;
  var ctx=page.querySelector('.pwf-project-context');if(!ctx)return;
  var d=data()||{},p=currentProject()||{},mainSmall=ctx.querySelector('.pwf-project-main small');
  setText(mainSmall,[p.client||'', 'Ekzekutim'].filter(Boolean).join(' · '));
  var k=ctx.querySelector('.pwf-project-kpis');if(k){
    var kh='<div><span>Statusi</span><b>'+escapeHtml(p.status||'Fituar')+'</b></div>'+
      '<div><span>Faza</span><b>Ekzekutim</b></div>'+
      '<div><span>Komunikimi</span><b>'+emailCount(d)+' emaila</b></div>'+
      '<div><span>Skedarë</span><b>'+fileCount(d)+'</b></div>';
    setHtml(k,kh);
  }
  var next=ctx.querySelector('.pwf-next');if(next){
    next.removeAttribute('data-pwf-stage');next.setAttribute('data-pwf-area','execution');
    var a=next.querySelector('span'),b=next.querySelector('b'),s=next.querySelector('small');
    setText(a,'HAPI I RADHËS');setText(b,'Kontrollo ekzekutimin');setText(s,'Prodhimi, dokumentet e cilësisë, afati, pagesat dhe dorëzimi.');
  }
}
function escapeHtml(v){return str(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function hideDeadProjectUpdate(){
  var page=activePage();if(!page)return;
  var buttons=page.querySelectorAll('button');
  Array.prototype.slice.call(buttons).forEach(function(b){
    if(norm(b.textContent)!=='perditeso projektin'&&norm(b.textContent)!=='përditëso projektin')return;
    var box=b,parent=b;for(var i=0;i<7&&parent;i++,parent=parent.parentElement){var text=norm(parent.textContent);if(text.indexOf('cfare po ndodh me kete projekt')>-1||text.indexOf('perditesim i projektit')>-1){box=parent;if(parent.tagName==='SECTION'||parent.tagName==='ARTICLE'||/card/i.test(parent.className||''))break;}}
    if(box&&box!==b)box.classList.add(HIDE);
  });
}
function ensureBusyBanner(root){
  var x=root.querySelector('.pst-pic-working-banner');if(x)return x;
  x=document.createElement('div');x.className='pst-pic-working-banner';x.innerHTML='<i class="pst-pic-working-dot"></i><div><b>PPPP po punon me projektin…</b><span>Po lexoj të dhënat, emailat dhe dokumentet. Mund të zgjasë disa sekonda.</span></div>';
  var log=root.querySelector('.pst-pic-log');if(log&&log.nextSibling)root.insertBefore(x,log.nextSibling);else root.appendChild(x);return x;
}
function busyStart(root){
  if(!root)return;ensureBusyBanner(root);root.classList.add('pst-pic-working');
  root.querySelectorAll('.pst-pic-prompt').forEach(function(b){b.disabled=true;});
  var pid=root.getAttribute('data-project-id')||root.id;clearInterval(busyTimers[pid]);var start=Date.now();
  busyTimers[pid]=setInterval(function(){var banner=root.querySelector('.pst-pic-working-banner span');if(banner){var sec=Math.max(1,Math.round((Date.now()-start)/1000));banner.textContent='Po lexoj të dhënat, emailat dhe dokumentet · '+sec+'s';}busyCheck(root);},500);
}
function busyCheck(root){
  if(!root||!root.classList.contains('pst-pic-working'))return;
  var send=root.querySelector('.pst-pic-send');if(!send)return;
  if(!send.disabled&&norm(send.textContent)==='pyet pppp')busyEnd(root);
}
function busyEnd(root){
  if(!root)return;root.classList.remove('pst-pic-working');root.querySelectorAll('.pst-pic-prompt').forEach(function(b){b.disabled=false;});
  var pid=root.getAttribute('data-project-id')||root.id;clearInterval(busyTimers[pid]);delete busyTimers[pid];
}
function decorateChat(){
  var page=activePage();if(!page)return;
  page.querySelectorAll('.pst-pic').forEach(function(root){ensureBusyBanner(root);busyCheck(root);});
}
function run(){
  scheduled=false;addCss();if(!activePage()){unhideOutsideProject();return;}
  hideTopClutter();hideLegacyFlow();ensureBack();reconcileHero();reconcileCanonical();hideDeadProjectUpdate();decorateChat();
}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(run,0);}

document.addEventListener('click',function(e){
  var root=e.target&&e.target.closest&&e.target.closest('.pst-pic');if(root&&(e.target.closest('.pst-pic-send')||e.target.closest('.pst-pic-prompt')))busyStart(root);
  schedule();
},true);
document.addEventListener('pst:modules-ready',schedule);
var mo=new MutationObserver(schedule);mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','disabled']});
[0,180,600,1400,2800].forEach(function(ms){setTimeout(schedule,ms);});
window.PSTProjectWorkspaceCleanupV1={run:run,schedule:schedule,_test:{executionProject:executionProject,fileCount:fileCount,emailCount:emailCount}};
})();
