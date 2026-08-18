/* PRISTEEL task source actions v5
 * Safe, read-only source shortcut for Workspace action rows.
 * Refreshes the current Home visual owner, then loads the final Happy Home cosmetic layer.
 */
(function(){
'use strict';
if(window.__pstTaskSourceActionsV1)return;
window.__pstTaskSourceActionsV1=true;

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
  page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(row){if(enhanceRow(row))count++;});
  try{if(window.PSTHomeHappyV1&&typeof window.PSTHomeHappyV1.schedule==='function')window.PSTHomeHappyV1.schedule();}catch(e){}
  return count;
}
function schedule(){[0,120,350,800,1600].forEach(function(ms){setTimeout(decorate,ms);});}
function installStyle(){
  if(document.getElementById('pst-task-source-actions-v5-css'))return;
  var style=document.createElement('style');
  style.id='pst-task-source-actions-v5-css';
  style.textContent=`
#page-workspace-home .pst-task-source-open{height:32px;border:1px solid #CFE0E7;border-radius:10px;padding:0 11px;background:#F8FBFC;color:#3F7F98;font-size:10px;font-weight:760;line-height:1;cursor:pointer;white-space:nowrap}
#page-workspace-home .pst-task-source-open:hover{background:#EDF6F9;border-color:#B8D4DF;color:#2F6E86}
`;
  document.head.appendChild(style);
}
function loadHappyHome(){
  if(window.PSTHomeHappyV1){try{window.PSTHomeHappyV1.schedule();}catch(e){}return;}
  if(document.querySelector('script[data-pst-home-happy-v1]'))return;
  var h=document.createElement('script');
  h.src='pristeel-home-happy-v1.js?happy_v1='+String(Date.now());
  h.defer=true;
  h.setAttribute('data-pst-home-happy-v1','1');
  h.onload=function(){try{if(window.PSTHomeHappyV1&&typeof window.PSTHomeHappyV1.schedule==='function')window.PSTHomeHappyV1.schedule();}catch(e){}};
  h.onerror=function(){console.error('Nuk u ngarkua Home Happy v1.');};
  document.head.appendChild(h);
}
function loadCurrentHomeVisual(){
  if(document.querySelector('script[data-pst-home-command-live-v5]')){loadHappyHome();return;}
  /* The ordered bootstrap may have loaded an older cached copy. Allow the current source file to initialize again. */
  window.__pstHomeCommandCenterV2=false;
  var s=document.createElement('script');
  s.src='pristeel-home-command-center-v2.js?home_v5='+String(Date.now());
  s.defer=true;
  s.setAttribute('data-pst-home-command-live-v5','1');
  s.onload=function(){
    try{if(window.PSTHomeCommandCenterV2&&typeof window.PSTHomeCommandCenterV2.refresh==='function')window.PSTHomeCommandCenterV2.refresh();}catch(e){}
    setTimeout(loadHappyHome,80);
  };
  s.onerror=function(){console.error('Nuk u ngarkua Home Command Center v5.');loadHappyHome();};
  document.head.appendChild(s);
}
installStyle();
window.addEventListener('pst-dashboard-rendered',schedule);
document.addEventListener('pst:home-canonical-rendered',function(){schedule();loadHappyHome();});
document.addEventListener('pst:modules-ready',function(){schedule();loadCurrentHomeVisual();},{once:true});
window.addEventListener('pageshow',function(){schedule();setTimeout(loadCurrentHomeVisual,100);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){schedule();setTimeout(loadCurrentHomeVisual,1400);},{once:true});else{schedule();setTimeout(loadCurrentHomeVisual,900);}
window.PSTTaskSourceActionsV1={sourceUrl:sourceUrl,metadataText:metadataText,enhanceRow:enhanceRow,decorate:decorate,loadCurrentHomeVisual:loadCurrentHomeVisual,loadHappyHome:loadHappyHome};
})();
