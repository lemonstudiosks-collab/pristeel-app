/* PRISTEEL Home project recovery v3
 * Recovers active projects on Home without negative caching empty/time-out reads.
 * Read-only. Never writes project data.
 */
(function(){
'use strict';
if(window.__pstHomeProjectRecoveryV3)return;
window.__pstHomeProjectRecoveryV3=true;

var inFlight=null,lastSuccess=0,SUCCESS_CACHE_MS=15000,WAIT_MS=8000;
function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function active(p){var s=String(p&&p.status||'').toLowerCase().trim();return !/^(mbyllur|humbur|arkivuar|closedlost|cancelled|realizuar)$/.test(s);}
function stamp(p){var v=p&&(p.updated_at||p.last_activity_at||p.last_email_at||p.created_at),t=v?new Date(v).getTime():0;return isFinite(t)?t:0;}
function visible(){var p=document.getElementById('page-workspace-home');return !!p&&p.style.display!=='none';}
function card(p){var status=String(p.status||'Në pritje'),name=p.name||'Pa emër',meta=(p.client||'Pa klient')+(p.ref?' · '+p.ref:''),next=p.pipeline_stage?('Faza aktuale: '+String(p.pipeline_stage).replace(/_/g,' ')):'Hap workspace-in e projektit';return '<div class="pst-ws-projectcard pst-home-recovery-v3" data-project-id="'+esc(p.id)+'"><div class="pst-ws-projectcard-top"><div><div class="pst-ws-projectcard-name">'+esc(name)+'</div><div class="pst-ws-projectcard-client">'+esc(meta)+'</div></div><span class="pst-ws-status">'+esc(status)+'</span></div><div class="pst-ws-projectcard-next"><b>Hapi tjetër:</b> '+esc(next)+'</div></div>';}
function timedFetch(){
  if(typeof window.supaFetch!=='function')return Promise.resolve({ok:false,rows:[]});
  return new Promise(function(resolve){
    var done=false,t=setTimeout(function(){if(done)return;done=true;resolve({ok:false,rows:[],reason:'timeout'});},WAIT_MS);
    Promise.resolve(window.supaFetch('projects?select=*&limit=3000')).then(function(rows){if(done)return;done=true;clearTimeout(t);resolve({ok:true,rows:arr(rows)});}).catch(function(){if(done)return;done=true;clearTimeout(t);resolve({ok:false,rows:[],reason:'error'});});
  });
}
function render(rows){
  var host=document.getElementById('pst-ws-home-projects');if(!host)return false;
  var activeRows=arr(rows).filter(active).sort(function(a,b){return stamp(b)-stamp(a);});
  if(!activeRows.length)return false;
  host.innerHTML=activeRows.slice(0,12).map(card).join('');
  host.querySelectorAll('.pst-home-recovery-v3').forEach(function(el){el.onclick=function(){var id=el.getAttribute('data-project-id');if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);};});
  var badge=document.getElementById('pst-ws-b-projects');if(badge){badge.textContent=String(activeRows.length);badge.style.display='inline-flex';}
  try{if(window.PSTHomeCommandCenterV2&&window.PSTHomeCommandCenterV2.decorate)window.PSTHomeCommandCenterV2.decorate();}catch(e){}
  try{if(window.PSTHomeStabilityV2&&window.PSTHomeStabilityV2.enforce)window.PSTHomeStabilityV2.enforce();}catch(e){}
  lastSuccess=Date.now();
  return true;
}
function recover(force){
  if(!visible())return Promise.resolve(false);
  var host=document.getElementById('pst-ws-home-projects');if(!host)return Promise.resolve(false);
  if(!force&&host.querySelector('.pst-ws-projectcard')&&Date.now()-lastSuccess<SUCCESS_CACHE_MS)return Promise.resolve(true);
  if(inFlight)return inFlight;
  inFlight=timedFetch().then(function(result){inFlight=null;if(!result.ok)return false;return render(result.rows);}).catch(function(){inFlight=null;return false;});
  return inFlight;
}
function schedule(force){[0,250,900,2200,5000,9000].forEach(function(ms){setTimeout(function(){recover(!!force);},ms);});}
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.pst-ws-navbtn[data-key="home"],#pst-ws-home-refresh'))schedule(!!e.target.closest('#pst-ws-home-refresh'));},true);
document.addEventListener('pst:modules-ready',function(){schedule(true);},{once:true});
window.addEventListener('pageshow',function(){schedule(true);},{once:true});
window.PSTHomeProjectRecoveryV3={recover:recover,schedule:schedule};
schedule(true);
})();
