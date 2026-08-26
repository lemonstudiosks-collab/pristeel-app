/* PRISTEEL Home Live Sync v1
 * Keeps the operator Home fresh while it is visible without turning Home itself
 * into a polling/data engine. Confirmed operator updates remain authoritative;
 * only explicitly home-visible, high-confidence AI email events may advance them.
 */
(function(){
'use strict';
if(window.__pstHomeLiveSyncV1){
  try{if(window.PSTHomeLiveSyncV1&&typeof window.PSTHomeLiveSyncV1.refresh==='function')window.PSTHomeLiveSyncV1.refresh(false);}catch(e){}
  return;
}
window.__pstHomeLiveSyncV1=true;

var INTERVAL_MS=5*60*1000;
var MIN_GAP_MS=30*1000;
var busy=false,lastRun=0,timer=null;
function S(v){return String(v==null?'':v);}
function A(v){return Array.isArray(v)?v:[];}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_]+/g,' ').replace(/\s+/g,' ').trim();}
function ts(v){var n=Date.parse(v||'');return Number.isFinite(n)?n:0;}
function activeHome(){
  var p=document.getElementById('page-workspace-home');
  if(!p||document.hidden)return null;
  if(p.style&&p.style.display==='none')return null;
  try{var cs=window.getComputedStyle?window.getComputedStyle(p):null;if(cs&&cs.display==='none')return null;}catch(e){}
  return p;
}
function homeModule(){var H=window.PSTProjectControlHomeV1;return H&&H._state&&typeof H.render==='function'?H:null;}
function valueOf(row){
  var v=row&&row.value;
  if(v&&typeof v==='object')return v;
  if(typeof v==='string'){try{var x=JSON.parse(v);if(x&&typeof x==='object')return x;}catch(e){}}
  return {};
}
function factText(row){
  var v=valueOf(row);
  return S(v.summary||v.text||v.current_state||v.next_action||row&&row.subject||'').replace(/\s+/g,' ').trim();
}
function manualLabel(txt){
  var n=N(txt);
  if(/nuk ka.{0,80}(veprim|ndjek)|pa veprim|no action|nothing.{0,50}follow/.test(n))return'Pa veprim';
  if(/ne pritje|pret |presim|waiting|afatin|deri me/.test(n))return'Në pritje';
  if(/aprov|approved|green light|driten e gjelber/.test(n))return'Konfirmuar';
  return'Aktiv';
}
function aiLabel(v){
  var w=N(v&&v.workflow_state);
  if(w==='action_required')return'Veprim';
  if(w==='wait_for_client'||w==='wait_for_supplier'||w==='wait_internal')return'Në pritje';
  if(w==='execution')return'Aktiv';
  return'Aktiv';
}
function buildUpdates(rows,state){
  var projects={},operatorAt={},latest={};
  A(state.projects).forEach(function(p){projects[S(p.id)]=p;});
  A(rows).forEach(function(row){
    if(N(row.category)!=='operator_update'||N(row.source_type)!=='user'||N(row.evidence_status)!=='confirmed'||N(row.fact_status)!=='observed')return;
    var t=ts(row.updated_at||row.created_at),id=S(row.project_id);if(t&&id)operatorAt[id]=Math.max(operatorAt[id]||0,t);
  });
  A(rows).forEach(function(row){
    var id=S(row.project_id),p=projects[id],category=N(row.category),detail=factText(row),effective=0,label='Aktiv';
    if(!p||!detail)return;
    if(category==='operator_update'){
      if(N(row.source_type)!=='user'||N(row.evidence_status)!=='confirmed'||N(row.fact_status)!=='observed')return;
      effective=ts(row.updated_at||row.created_at);label=manualLabel(detail);
    }else if(category==='email_event_ai'){
      var v=valueOf(row),confidence=Number(v.confidence||0),eventAt=ts(v.source_sent_at||row.updated_at||row.created_at);
      if(v.home_visible!==true||v.suppressed_by_operator_update===true||confidence<90||!eventAt)return;
      if(operatorAt[id]&&eventAt<=operatorAt[id])return;
      effective=eventAt;label=aiLabel(v);
    }else return;
    if(!effective)return;
    var candidate={project_id:id,project:p.name,client:p.client||'',time:effective,detail:detail.slice(0,420),state:label};
    if(!latest[id]||effective>latest[id].time)latest[id]=candidate;
  });
  return Object.keys(latest).map(function(id){return latest[id];}).sort(function(a,b){return b.time-a.time;}).slice(0,10);
}
async function enrich(){
  var H=homeModule();if(!H||typeof window.supaFetch!=='function')return false;
  var since=new Date(Date.now()-30*86400000).toISOString();
  var path='pppp_project_context_current_v?select=id,project_id,category,subject,value,source_type,evidence_status,fact_status,created_at,updated_at'
    +'&category=in.(operator_update,email_event_ai)&fact_status=eq.observed&updated_at=gte.'+encodeURIComponent(since)+'&order=updated_at.desc&limit=500';
  var rows=await window.supaFetch(path);
  H._state.updates=buildUpdates(rows,H._state);
  H.render();return true;
}
async function refresh(force){
  if(busy||!activeHome())return false;
  if(!force&&lastRun&&Date.now()-lastRun<MIN_GAP_MS)return false;
  var H=homeModule();if(!H)return false;
  busy=true;
  try{
    if(typeof H.load==='function')await H.load(true);
    await enrich();
    lastRun=Date.now();
    return true;
  }catch(e){console.warn('PPPP Home Live Sync:',e);return false;}
  finally{busy=false;}
}
function soon(force,delay){setTimeout(function(){refresh(!!force);},delay==null?120:delay);}
function start(){if(timer)return;timer=setInterval(function(){refresh(false);},INTERVAL_MS);}

document.addEventListener('pst:modules-ready',function(){soon(true,350);},{once:true});
document.addEventListener('visibilitychange',function(){if(!document.hidden)soon(true,120);});
window.addEventListener('pageshow',function(){soon(true,180);});
document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],[onclick*="showPage"]');if(t)soon(false,220);},true);
start();[250,900,2200].forEach(function(ms){soon(ms===2200,ms);});
window.PSTHomeLiveSyncV1={refresh:refresh,enrich:enrich,buildUpdates:buildUpdates,intervalMs:INTERVAL_MS};
})();
