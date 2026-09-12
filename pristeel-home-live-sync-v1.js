/* PRISTEEL Home Live Sync v1
 * Keeps the operator Home fresh while it is visible without turning Home itself
 * into a polling/data engine. Confirmed operator updates remain authoritative;
 * only explicitly home-visible, high-confidence AI email events may advance them.
 * Procurement alerts are read from the strict bid-eligible Home projection:
 * TED stays backstage as award intelligence; bid sources may surface new tenders.
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
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
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
function procurementDate(v){
  if(!v)return'';
  var d=new Date(String(v).slice(0,10)+'T12:00:00');if(isNaN(d.getTime()))return'';
  return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'});
}
function safeUrl(v){var s=S(v).trim();return /^https?:\/\//i.test(s)?s:'';}
function ensureProcurementCss(){
  if(document.getElementById('pst-home-procurement-alerts-css'))return;
  var style=document.createElement('style');style.id='pst-home-procurement-alerts-css';style.textContent=`
.pst-home-procurement{margin-top:18px;background:rgba(255,255,255,.82);border:1px solid rgba(93,128,139,.14);border-radius:22px;box-shadow:0 10px 30px rgba(32,62,72,.05);overflow:hidden}
.pst-home-procurement[hidden]{display:none!important}.pst-home-procurement>header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding:20px 23px 15px;border-bottom:1px solid rgba(111,143,152,.12)}
.pst-home-procurement>header span{font-size:11px;letter-spacing:1.05px;color:#718b94}.pst-home-procurement>header h2{margin:5px 0 3px;font-size:21px;font-weight:600;letter-spacing:-.35px;color:#294049}.pst-home-procurement>header p{font-size:13px;color:#7b8f96;line-height:1.45}.pst-home-procurement-count{font-size:12px;color:#6b858e;white-space:nowrap;padding-top:5px}
.pst-home-procurement-list{padding:10px}.pst-home-procurement-card{display:grid;grid-template-columns:minmax(0,1fr) 28px;gap:14px;padding:17px 18px;margin:7px 0;border:1px solid rgba(101,139,149,.15);border-radius:16px;background:#fff;cursor:pointer;transition:border-color .14s,box-shadow .14s,transform .14s}.pst-home-procurement-card:hover{border-color:#bfd6de;box-shadow:0 9px 20px rgba(36,67,77,.07);transform:translateY(-1px)}
.pst-home-procurement-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:12px;color:#789099}.pst-home-procurement-meta b{font-weight:600;color:#527787}.pst-home-procurement-track{padding:4px 7px;border-radius:999px;background:#edf6f3;color:#5d7d70;font-size:11px}.pst-home-procurement-card h3{margin:7px 0 0;font-size:16px;font-weight:600;line-height:1.4;color:#263c45}.pst-home-procurement-card p{margin:8px 0 0;font-size:13.5px;line-height:1.5;color:#667b83}.pst-home-procurement-foot{display:flex;flex-wrap:wrap;gap:12px;margin-top:10px;padding-top:9px;border-top:1px dashed #e4ebed;font-size:12px;color:#80939a}.pst-home-procurement-arrow{font-size:19px;color:#75a0ad;padding-top:18px}
.pst-home-procurement-card:focus-visible{outline:3px solid rgba(74,145,166,.22);outline-offset:2px}@media(max-width:720px){.pst-home-procurement>header{display:block;padding:18px 17px 14px}.pst-home-procurement-count{display:block;margin-top:6px}.pst-home-procurement-card{padding:15px 14px}}
`;
  document.head.appendChild(style);
}
function ensureProcurementPanel(){
  var root=document.getElementById('pst-project-control-home-v2');if(!root)return null;
  var panel=root.querySelector('.pst-home-procurement');if(panel)return panel;
  ensureProcurementCss();
  panel=document.createElement('section');panel.className='pst-home-procurement';panel.hidden=true;
  panel.innerHTML='<header><div><span>TENDERË PËR PJESËMARRJE</span><h2>Tenderë të rinj për vëmendje</h2><p>Vetëm nga burimet ku mund të ofertojmë direkt ose përmes partnerit, JV/konsorciumit apo përfaqësimit. TED nuk shfaqet këtu.</p></div><small class="pst-home-procurement-count"></small></header><div class="pst-home-procurement-list"></div>';
  var status=root.querySelector('.pst-live-status');if(status)root.insertBefore(panel,status);else root.appendChild(panel);
  panel.addEventListener('click',function(e){var card=e.target&&e.target.closest&&e.target.closest('[data-procurement-url]');if(!card)return;var url=safeUrl(card.getAttribute('data-procurement-url'));if(url)window.open(url,'_blank','noopener');});
  panel.addEventListener('keydown',function(e){if(e.key!=='Enter'&&e.key!==' ')return;var card=e.target&&e.target.closest&&e.target.closest('[data-procurement-url]');if(!card)return;e.preventDefault();var url=safeUrl(card.getAttribute('data-procurement-url'));if(url)window.open(url,'_blank','noopener');});
  return panel;
}
function renderProcurement(rows){
  var panel=ensureProcurementPanel();if(!panel)return false;
  rows=A(rows).slice(0,8);panel.hidden=!rows.length;if(!rows.length)return true;
  var count=panel.querySelector('.pst-home-procurement-count');if(count)count.textContent=rows.length+' tender'+(rows.length===1?'':'ë')+' aktual'+(rows.length===1?'':'ë');
  panel.querySelector('.pst-home-procurement-list').innerHTML=rows.map(function(r){
    var url=safeUrl(r.open_url),tracked=N(r.alert_kind)==='tracked_program',deadline=procurementDate(r.deadline),published=procurementDate(r.published_date),reason=S(r.alert_reason),partner=N(r.partner_research_policy)==='dynamic';
    return '<article class="pst-home-procurement-card" '+(url?'role="button" tabindex="0" data-procurement-url="'+E(url)+'"':'')+'>'
      +'<div><div class="pst-home-procurement-meta"><b>'+E(r.source_label||r.source||'Tender')+'</b>'+(tracked?'<span class="pst-home-procurement-track">PROGRAM I NDJEKUR'+(r.program_code?' · '+E(r.program_code):'')+'</span>':'')+(published?'<span>Publikuar '+E(published)+'</span>':'')+'</div>'
      +'<h3>'+E(r.title||'Tender i ri')+'</h3>'+(reason?'<p>'+E(reason)+'</p>':'')
      +'<div class="pst-home-procurement-foot">'+(r.package_title?'<span>'+E(r.package_title)+'</span>':'')+(deadline?'<span>Afati: '+E(deadline)+'</span>':'')+(partner?'<span>Partnerët hulumtohen sipas këtij tenderi</span>':'')+'</div></div>'
      +(url?'<div class="pst-home-procurement-arrow">→</div>':'')+'</article>';
  }).join('');
  return true;
}
async function enrich(){
  var H=homeModule();if(!H||typeof window.supaFetch!=='function')return false;
  var since=new Date(Date.now()-30*86400000).toISOString();
  var path='pppp_project_context_current_v?select=id,project_id,category,subject,value,source_type,evidence_status,fact_status,created_at,updated_at'
    +'&category=in.(operator_update,email_event_ai)&fact_status=eq.observed&updated_at=gte.'+encodeURIComponent(since)+'&order=updated_at.desc&limit=500';
  var procurementPath='pppp_home_procurement_alerts_v1?select=alert_id,tender_watch_id,source,source_label,title,authority,document_type,published_date,deadline,relevance_score,alert_kind,alert_reason,program_code,program_title,package_title,partner_research_policy,partner_research_required,entry_routes,open_url,first_seen_at&order=first_seen_at.desc&limit=20';
  var out=await Promise.all([
    window.supaFetch(path),
    window.supaFetch(procurementPath).catch(function(e){console.warn('PPPP Home procurement alerts:',e);return[];})
  ]);
  H._state.updates=buildUpdates(out[0],H._state);
  H.render();renderProcurement(out[1]);return true;
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
window.PSTHomeLiveSyncV1={refresh:refresh,enrich:enrich,buildUpdates:buildUpdates,renderProcurement:renderProcurement,intervalMs:INTERVAL_MS};
})();
