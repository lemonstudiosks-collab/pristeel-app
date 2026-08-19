/* PRISTEEL task source actions v9
 * Safe, read-only source shortcut for Workspace action rows.
 * Does not own, reload or rebuild Home. The ordered runtime owns Home Command Center.
 * Happy Home is loaded once, only after the ordered runtime is complete.
 */
(function(){
'use strict';
if(window.__pstTaskSourceActionsV1)return;
window.__pstTaskSourceActionsV1=true;

var happyLoadStarted=false;

function sourceUrl(value){
  var text=String(value||'');
  var match=text.match(/https:\/\/[^\s<>"']+/i);
  if(!match)return'';
  var candidate=String(match[0]||'').replace(/[\]\)}>.,;]+$/g,'');
  try{
    var parsed=new URL(candidate,window.location&&window.location.href||undefined);
    return parsed.protocol==='https:'?parsed.href:'';
  }catch(e){return'';}
}
function metadataText(row){
  if(!row)return'';
  var original=String(row.dataset&&row.dataset.pstOriginalMeta||'').trim();
  if(original)return original;
  var meta=row.querySelector('.pst-ws-action-meta');
  if(!meta)return'';
  return String(meta.getAttribute('title')||meta.textContent||'').trim();
}
function sourceButton(url){
  var btn=document.createElement('button');
  btn.type='button';
  btn.className='pst-task-source-open';
  btn.textContent='Burimi';
  btn.title='Hap burimin zyrtar në tab të ri';
  btn.addEventListener('click',function(event){
    event.preventDefault();
    event.stopPropagation();
    window.open(url,'_blank','noopener,noreferrer');
  });
  return btn;
}
function enhanceRow(row){
  if(!row)return false;
  var controls=row.querySelector('.pst-ws-action-controls');
  if(!controls||controls.querySelector('.pst-task-source-open'))return false;
  var url=sourceUrl(metadataText(row));
  if(!url)return false;
  var btn=sourceButton(url);
  var menu=controls.querySelector('.pst-dash-task-menu');
  if(menu)controls.insertBefore(btn,menu);else controls.appendChild(btn);
  row.dataset.pstTaskSourceUrl=url;
  return true;
}
function decorate(){
  var page=document.getElementById('page-workspace-home');
  if(!page||page.style.display==='none')return 0;
  var count=0;
  page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(row){
    if(enhanceRow(row))count++;
  });
  try{
    if(window.PSTHomeHappyV1&&typeof window.PSTHomeHappyV1.schedule==='function')window.PSTHomeHappyV1.schedule();
  }catch(e){}
  return count;
}
function schedule(){[0,120,350,800,1600].forEach(function(ms){setTimeout(decorate,ms);});}
function installStyle(){
  if(document.getElementById('pst-task-source-actions-v9-css'))return;
  var style=document.createElement('style');
  style.id='pst-task-source-actions-v9-css';
  style.textContent=`
#page-workspace-home .pst-task-source-open{height:32px;border:1px solid #CFE0E7;border-radius:10px;padding:0 11px;background:#F8FBFC;color:#3F7F98;font-size:10px;font-weight:760;line-height:1;cursor:pointer;white-space:nowrap}
#page-workspace-home .pst-task-source-open:hover{background:#EDF6F9;border-color:#B8D4DF;color:#2F6E86}
`;
  document.head.appendChild(style);
}
function loadHappyHomeOnce(){
  if(window.PSTHomeHappyV1){
    try{if(typeof window.PSTHomeHappyV1.schedule==='function')window.PSTHomeHappyV1.schedule();}catch(e){}
    return true;
  }
  if(happyLoadStarted)return false;
  var existing=document.querySelector('script[data-pst-home-happy-v1],script[src*="pristeel-home-happy-v1.js"]');
  if(existing){
    happyLoadStarted=true;
    existing.addEventListener('load',schedule,{once:true});
    return false;
  }
  happyLoadStarted=true;
  var h=document.createElement('script');
  h.src='pristeel-home-happy-v1.js?v=20260819-stable1';
  h.defer=true;
  h.setAttribute('data-pst-home-happy-v1','1');
  h.onload=function(){schedule();};
  h.onerror=function(){happyLoadStarted=false;console.error('Nuk u ngarkua Home Happy v1.');};
  document.head.appendChild(h);
  return true;
}

installStyle();
window.addEventListener('pst-dashboard-rendered',schedule);
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:modules-ready',function(){
  schedule();
  loadHappyHomeOnce();
},{once:true});

/* If this helper arrives after the ordered runtime, attach the final cosmetic layer once. */
if(window.__pstModulesReady){
  schedule();
  loadHappyHomeOnce();
}

window.PSTTaskSourceActionsV1={
  sourceUrl:sourceUrl,
  metadataText:metadataText,
  enhanceRow:enhanceRow,
  decorate:decorate,
  loadHappyHomeOnce:loadHappyHomeOnce
};
})();
