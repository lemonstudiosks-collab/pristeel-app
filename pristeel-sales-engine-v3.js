/* PRISTEEL Sales Engine V3
 * Unified, low-egress commercial workbench over existing PPPP sources.
 * Initial load: aggregate funnel + pilot only. Broader queues/supplier health are on-demand.
 * No automatic email send, supplier commitment, pricing decision or project outcome mutation.
 */
(function(){
'use strict';
if(window.__pstSalesEngineV3)return;
window.__pstSalesEngineV3=true;

var state={mode:'pilot',funnel:[],rows:[],supplier:[],loading:false,error:'',loadedAt:0,homeAt:0,busy:{},result:{}};
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function N(v){var n=Number(v);return isFinite(n)?n:0;}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function enc(v){return encodeURIComponent(S(v));}
function db(q,m,b){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Supabase nuk është gati.'));return window.supaFetch(q,m,b);}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null}catch(e){return null}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow()}catch(e){return sessionNow()}}
async function edge(name,payload){
 var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
 var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();
 var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
 async function run(t){return fetch(base+'/functions/v1/'+name,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload||{})})}
 var r=await run(token);if(r.status===401){s=await refreshSession();if(s&&s.access_token)r=await run(s.access_token)}
 var raw=await r.text(),x=null;try{x=raw?JSON.parse(raw):null}catch(e){}
 if(!r.ok||!x||x.ok===false)throw new Error(S(x&&(x.message||x.error)||('HTTP '+r.status)).slice(0,900));
 return x;
}
function modelLabel(v){
 var m=S(v);
 if(m==='material_supply')return'Material Supply';
 if(m==='fabricated_steel_package')return'Fabricated Package';
 if(m==='external_production_capacity')return'External Capacity';
 if(m==='future_supplier_qualification')return'Future Qualification';
 return m||'—';
}
function channelLabel(v){return v==='material_trade'?'Material Trade':v==='ted_awarded'?'TED / GC Award':v==='gc_direct'?'GC Direct':v||'—';}
function stateLabel(v){
 var x=S(v);
 if(x==='ready_for_outreach')return'Gati për kontakt';
 if(x==='strong_company_contact_gap')return'Kërkon kontakt më të mirë';
 if(x==='draft_created')return'Draft';
 if(x==='thread_review')return'Kontrollo thread';
 if(x==='reply_received')return'Përgjigje';
 return x||'—';
}
function score(v){var n=N(v);return '<span class="pse-score '+(n>=80?'hi':n>=60?'mid':'lo')+'">'+E(n)+'</span>';}
function gmailUrl(id){return id?'https://mail.google.com/mail/u/0/#all/'+encodeURIComponent(id):'';}
function draftUrl(id){return id?'https://mail.google.com/mail/u/0/#drafts/'+encodeURIComponent(id):'';}
function toast(msg,bad){if(typeof window.toast==='function')window.toast(msg,!!bad);else if(bad)alert(msg);}

function css(){
 if(document.getElementById('pst-sales-engine-v3-css'))return;
 var s=document.createElement('style');s.id='pst-sales-engine-v3-css';
 s.textContent=[
 '#pst-dach-steel-sales-card-v1{display:none!important}',
 '#pst-sales-engine-card-v3{margin:14px 0 16px;border:1px solid #d7e3e6;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 8px 24px rgba(50,70,80,.05)}',
 '.pse-home{width:100%;border:0;background:linear-gradient(115deg,#f3f8f9,#fff 58%,#faf6eb);padding:17px 19px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;text-align:left;cursor:pointer;color:#273a42}.pse-eye{font-size:9px;font-weight:900;letter-spacing:.14em;color:#62818c}.pse-title{font-size:21px;font-weight:850;margin-top:3px}.pse-sub{font-size:10px;color:#708188;margin-top:4px;max-width:880px;line-height:1.45}.pse-home-kpis{display:flex;gap:14px}.pse-home-kpis span{text-align:center;min-width:62px}.pse-home-kpis b{display:block;font-size:19px}.pse-home-kpis small{font-size:8px;color:#74858c}',
 '#page-pristeel-sales-engine{background:#f7f7f5!important;min-height:100vh;color:#253b44}.pse-page{max-width:1580px;margin:0 auto;padding:12px 14px 42px}',
 '.pse-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:10px}.pse-head h1{font-size:28px;margin:0}.pse-head p{font-size:10.5px;color:#718188;max-width:930px;line-height:1.5;margin:4px 0 0}.pse-actions{display:flex;gap:7px;flex-wrap:wrap}.pse-actions button{height:34px;border:1px solid #cedde2;border-radius:9px;background:#fff;color:#356d82;padding:0 11px;font-size:9px;font-weight:800;cursor:pointer}',
 '.pse-models{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:9px 0}.pse-model{background:#fff;border:1px solid #dfe7e8;border-radius:12px;padding:10px}.pse-model b{display:block;font-size:10px}.pse-model span{display:block;font-size:8px;color:#77878d;line-height:1.4;margin-top:3px}',
 '.pse-kpis{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));border:1px solid #dde5e6;border-radius:11px;background:#fff;overflow:hidden;margin:9px 0}.pse-kpi{padding:9px 11px;border-right:1px solid #edf0ef}.pse-kpi:last-child{border-right:0}.pse-kpi b{display:block;font-size:18px}.pse-kpi span{font-size:8px;color:#7a898f}',
 '.pse-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.pse-tabs button{border:1px solid #d4e0e3;background:#fff;color:#54727d;border-radius:999px;padding:7px 10px;font-size:8.5px;font-weight:800;cursor:pointer}.pse-tabs button.on{background:#3e7588;color:#fff;border-color:#3e7588}',
 '.pse-note{border:1px solid #dae5e6;background:#f3f8f8;border-radius:10px;padding:8px 10px;font-size:8.5px;color:#647c84;margin-bottom:9px}.pse-note b{color:#365f6d}',
 '.pse-table{background:#fff;border:1px solid #e0e6e7;border-radius:12px;overflow:hidden}.pse-th,.pse-row{display:grid;grid-template-columns:minmax(150px,.9fr) minmax(120px,.65fr) minmax(230px,1.45fr) minmax(170px,.9fr) 116px minmax(140px,.8fr);gap:9px;align-items:center}.pse-th{padding:8px 11px;background:#f5f8f8;font-size:7.5px;font-weight:900;color:#789099;letter-spacing:.08em}.pse-row{padding:10px 11px;border-top:1px solid #edf1f1}.pse-row:first-of-type{border-top:0}.pse-company b{display:block;font-size:10.5px}.pse-company small,.pse-cell small{display:block;font-size:7.5px;color:#829198;margin-top:2px}.pse-signal{font-size:8.5px;line-height:1.4;color:#536a73}.pse-contact b{display:block;font-size:9px}.pse-contact span{font-size:7.5px;color:#7f8e94}.pse-scores{display:flex;gap:3px;flex-wrap:wrap}.pse-score{display:inline-grid;place-items:center;min-width:26px;height:22px;border-radius:999px;font-size:7.5px;font-weight:900;background:#edf1f2;color:#68787e}.pse-score.hi{background:#e7f2e9;color:#456d50}.pse-score.mid{background:#fff2d8;color:#7b6123}.pse-score.lo{background:#f5e9e7;color:#83574f}.pse-act{display:flex;gap:5px;flex-wrap:wrap}.pse-act button,.pse-act a{height:28px;display:inline-flex;align-items:center;border:1px solid #d2dfe2;border-radius:8px;background:#fff;color:#3b7488;padding:0 8px;font-size:7.5px;font-weight:800;text-decoration:none;cursor:pointer}.pse-act .primary{background:#39788f;border-color:#39788f;color:#fff}.pse-act button:disabled{opacity:.55;cursor:wait}',
 '.pse-empty{padding:28px;text-align:center;color:#7c8c91;font-size:10px}.pse-error{padding:10px;border:1px solid #ecd2cf;background:#fff7f6;color:#8a5850;border-radius:9px;margin:8px 0;font-size:9px}',
 '.pse-supplier .pse-th,.pse-supplier .pse-row{grid-template-columns:minmax(170px,1fr) 90px 90px 90px 90px minmax(240px,1.3fr)}.pse-health{font-size:8px;font-weight:900;border-radius:999px;padding:5px 7px;display:inline-block;background:#edf1f2}.pse-health.strategic,.pse-health.healthy{background:#e7f2e9;color:#456d50}.pse-health.watch{background:#fff2d8;color:#7b6123}.pse-health.fatigue_risk{background:#f5e9e7;color:#83574f}',
 '.pse-cohort{margin-top:10px;padding:9px 10px;border:1px solid #e1e7e8;background:#fff;border-radius:10px;font-size:8px;color:#74858b}.pse-cohort b{color:#415e69}',
 '@media(max-width:1100px){.pse-models{grid-template-columns:repeat(2,1fr)}.pse-kpis{grid-template-columns:repeat(3,1fr)}.pse-th{display:none}.pse-row{grid-template-columns:1fr 1fr}.pse-row>*:nth-child(n+3){grid-column:1/-1}.pse-home{grid-template-columns:1fr}.pse-home-kpis{justify-content:flex-start}}'
 ].join('');
 document.head.appendChild(s);
}

function v2Totals(){
 var rows=A(state.funnel).filter(function(r){return r.outreach_engine_version==='v2'}),x={discovered:0,qualified:0,contact_gap:0,ready:0,sent:0,replied:0,rfqs:0};
 rows.forEach(function(r){x.discovered+=N(r.discovered);x.qualified+=N(r.qualified);x.contact_gap+=N(r.contact_gap);x.ready+=N(r.ready_for_outreach);x.sent+=N(r.sent);x.replied+=N(r.replied);x.rfqs+=N(r.rfqs);});
 return x;
}
function legacyTotals(){var rows=A(state.funnel).filter(function(r){return r.outreach_engine_version==='legacy'}),x={sent:0,replied:0};rows.forEach(function(r){x.sent+=N(r.sent);x.replied+=N(r.replied);});return x;}

async function loadFunnel(force){
 if(!force&&state.funnel.length&&Date.now()-state.homeAt<300000)return state.funnel;
 state.funnel=A(await db('pppp_sales_engine_v3_funnel_v1?select=*&order=channel.asc,outreach_engine_version.asc'));
 state.homeAt=Date.now();return state.funnel;
}
async function loadRows(mode,force){
 state.mode=mode||state.mode;
 if(state.loading)return;
 if(!force&&state.rows.length&&Date.now()-state.loadedAt<180000&&state._rowsMode===state.mode){render();return;}
 state.loading=true;state.error='';render();
 try{
  if(state.mode==='suppliers'){
   state.supplier=A(await db('pppp_supplier_relationship_health_v1?select=*&order=sent_rfqs_90d.desc,last_rfq_sent_at.desc&limit=80'));
   state.rows=[];
  }else{
   var q='pppp_sales_engine_v3_pilot_queue_v1?select=*&limit=25';
   if(state.mode==='ready')q='pppp_sales_engine_v3_workbench_v1?outreach_engine_version=eq.v2&workflow_state=eq.ready_for_outreach&select=*&order=outreach_readiness_score.desc&limit=100';
   if(state.mode==='gaps')q='pppp_sales_engine_v3_workbench_v1?outreach_engine_version=eq.v2&workflow_state=eq.strong_company_contact_gap&select=*&order=company_fit_score.desc&limit=100';
   if(state.mode==='conversations')q='pppp_sales_engine_v3_workbench_v1?or=(replied_at.not.is.null,reply_classification.not.is.null)&select=*&order=replied_at.desc.nullslast&limit=100';
   state.rows=A(await db(q));state.supplier=[];
  }
  state._rowsMode=state.mode;state.loadedAt=Date.now();
 }catch(e){state.error=S(e&&e.message||e)}
 finally{state.loading=false;render();}
}
async function refresh(){state.loadedAt=0;state.homeAt=0;await loadFunnel(true);await loadRows(state.mode,true);renderHome();}

function ensureHome(){
 css();var home=document.getElementById('pst-home-launchpad-v1'),grid=home&&home.querySelector('.pst-launch-grid');if(!home||!grid)return false;
 var card=document.getElementById('pst-sales-engine-card-v3');
 if(!card){card=document.createElement('section');card.id='pst-sales-engine-card-v3';card.innerHTML='<button class="pse-home" type="button"><div><div class="pse-eye">PRISTEEL · COMMERCIAL OPERATING SYSTEM</div><div class="pse-title">PriSteel Sales Engine</div><div class="pse-sub">Material Supply · Fabricated Steel Packages · External Production Capacity. Targeti duhet të ketë sinjal real, kontakt të duhur dhe evidencë para draftit.</div></div><div class="pse-home-kpis" data-pse-home-kpis></div></button>';grid.parentNode.insertBefore(card,grid);card.querySelector('button').onclick=open;}
 renderHome();loadFunnel(false).then(renderHome).catch(function(e){});
 return true;
}
function renderHome(){var h=document.querySelector('#pst-sales-engine-card-v3 [data-pse-home-kpis]');if(!h)return;var x=v2Totals();h.innerHTML='<span><b>'+E(x.ready)+'</b><small>Gati</small></span><span><b>'+E(x.contact_gap)+'</b><small>Contact gap</small></span><span><b>'+E(x.replied)+'</b><small>Përgjigje V2</small></span><span><b>'+E(x.rfqs)+'</b><small>RFQ V2</small></span>';}

function ensurePage(){
 css();var p=document.getElementById('page-pristeel-sales-engine');if(p)return p;
 var host=document.querySelector('.content')||document.body;p=document.createElement('div');p.id='page-pristeel-sales-engine';p.className='page';p.style.display='none';
 p.innerHTML='<div class="pse-page"><header class="pse-head"><div><h1>PriSteel Sales Engine</h1><p>Një funnel i vetëm nga sinjali komercial te biseda, RFQ-ja dhe projekti. Discovery vazhdon në burimet ekzistuese; ky workbench vendos kur kemi arsye të mjaftueshme për kontakt.</p></div><div class="pse-actions"><button data-pse-material>Material Discovery</button><button data-pse-refresh>Rifresko</button><button data-pse-back>← Ballina</button></div></header><div class="pse-models"><div class="pse-model"><b>Material Supply</b><span>Material sipas BOM/listës, certifikata, përpunim sipas kërkesës dhe DAP.</span></div><div class="pse-model"><b>Fabricated Steel Package</b><span>Material + build-to-print fabrication + treatment + QA docs + DAP.</span></div><div class="pse-model"><b>External Production Capacity</b><span>Kapacitet i menaxhuar për Stahlbauer/OEM kur kanë overload ose outsourcing.</span></div><div class="pse-model"><b>Future Supplier Qualification</b><span>Kur paketa aktuale është mbyllur, kalojmë marrëdhënien te projektet e ardhshme.</span></div></div><div class="pse-kpis" data-pse-kpis></div><div class="pse-tabs" data-pse-tabs></div><div class="pse-note"><b>Rregulli:</b> discovery nuk krijon draft. Drafti kërkon V2 readiness, kontakt të pranueshëm dhe së paku dy fakte specifike. Supplier RFQ kalon veçmas Supplier Gate.</div><div data-pse-error></div><div data-pse-body></div><div class="pse-cohort" data-pse-cohort></div></div>';
 host.appendChild(p);wire(p);return p;
}
function wire(p){
 p.querySelector('[data-pse-back]').onclick=back;
 p.querySelector('[data-pse-refresh]').onclick=function(){refresh()};
 p.querySelector('[data-pse-material]').onclick=function(){if(window.PSTDachSteelSalesV3&&typeof window.PSTDachSteelSalesV3.open==='function')window.PSTDachSteelSalesV3.open();};
 p.querySelector('[data-pse-tabs]').addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-pse-mode]');if(!b)return;loadRows(b.getAttribute('data-pse-mode'),false);});
 p.querySelector('[data-pse-body]').addEventListener('click',function(e){
   var b=e.target.closest&&e.target.closest('[data-pse-draft]');if(b){createDraftByRow(b.getAttribute('data-pse-draft'),b);return;}
   var g=e.target.closest&&e.target.closest('[data-pse-gmail]');if(g){var u=g.getAttribute('data-pse-gmail');if(u)window.open(u,'_blank','noopener');return;}
   var pr=e.target.closest&&e.target.closest('[data-pse-project]');if(pr){var id=pr.getAttribute('data-pse-project');if(id&&typeof window.pstOpenProjectDirect==='function')window.pstOpenProjectDirect(id);return;}
   var src=e.target.closest&&e.target.closest('[data-pse-source]');if(src){var ch=src.getAttribute('data-pse-source');if(ch==='material_trade'&&window.PSTDachSteelSalesV3)window.PSTDachSteelSalesV3.open();return;}
 });
}
function back(){
 var p=document.getElementById('page-pristeel-sales-engine');if(p){p.classList.remove('active');p.style.display='none';}
 try{var n=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV1;if(n&&typeof n.openHome==='function'){n.openHome();return}}catch(e){}
 try{if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('home')}catch(e){}
}
async function open(){
 var p=ensurePage();document.querySelectorAll('.page').forEach(function(x){if(x!==p){x.classList.remove('active');x.style.display='none'}});p.style.display='block';p.classList.add('active');
 render();try{window.scrollTo(0,0)}catch(e){}
 try{await loadFunnel(false);await loadRows('pilot',false);render();}catch(e){state.error=S(e&&e.message||e);render();}
}
function kpisHtml(){var x=v2Totals();return[['Objektiva V2',x.discovered],['Të kualifikuara',x.qualified],['Contact gap',x.contact_gap],['Gati për kontakt',x.ready],['Përgjigje',x.replied],['RFQ',x.rfqs]].map(function(a){return'<div class="pse-kpi"><b>'+E(a[1])+'</b><span>'+E(a[0])+'</span></div>';}).join('');}
function tabsHtml(){var xs=[['pilot','Pilot 25'],['ready','Të gjitha gati'],['gaps','Contact gaps'],['conversations','Biseda / përgjigje'],['suppliers','Supplier Health']];return xs.map(function(x){return'<button data-pse-mode="'+x[0]+'" class="'+(state.mode===x[0]?'on':'')+'">'+x[1]+'</button>';}).join('');}
function facts(r){var a=A(r.personalization_facts).map(S).filter(Boolean);return a.slice(0,2).join(' · ');}
function rowKey(r){return S(r.source_type)+':'+S(r.source_id);}
function rowHtml(r){
 var key=rowKey(r),busy=!!state.busy[key],result=state.result[key]||{},draftable=r.workflow_state==='ready_for_outreach'&&!r.last_contact_at;
 var gmail=r.gmail_thread_id?gmailUrl(r.gmail_thread_id):'';
 var action='';
 if(draftable)action='<button class="primary" data-pse-draft="'+E(key)+'" '+(busy?'disabled':'')+'>'+(busy?'Duke krijuar…':'Krijo draft')+'</button>';
 else if(gmail)action='<button data-pse-gmail="'+E(gmail)+'">Hap Gmail</button>';
 else if(r.workflow_state==='strong_company_contact_gap')action='<button data-pse-source="'+E(r.channel)+'">Përmirëso kontaktin</button>';
 if(r.project_id)action+='<button data-pse-project="'+E(r.project_id)+'">Hap projektin</button>';
 if(result.error)action+='<small style="color:#8a5850">'+E(result.error)+'</small>';
 return'<div class="pse-row"><div class="pse-company"><b>'+E(r.company_name||'—')+'</b><small>'+E(channelLabel(r.channel))+' · '+E(stateLabel(r.workflow_state))+'</small></div><div class="pse-cell"><b>'+E(modelLabel(r.pristeel_offer_model))+'</b><small>'+E(r.timing_classification||'')+'</small></div><div class="pse-signal">'+E(r.commercial_signal||r.why_company||'—')+'<small>'+E(facts(r))+'</small></div><div class="pse-contact"><b>'+E(r.contact_name||r.contact_email||'—')+'</b><span>'+E(r.contact_role||'')+' · Tier '+E(r.contact_tier||'—')+'</span></div><div class="pse-scores" title="Fit · Timing · Contact · Evidence">'+score(r.company_fit_score)+score(r.commercial_timing_score)+score(r.contact_quality_score)+score(r.message_evidence_score)+'</div><div class="pse-act">'+action+'</div></div>';
}
function supplierHtml(r){return'<div class="pse-row"><div class="pse-company"><b>'+E(r.supplier_name)+'</b><small>'+E(r.partner_stage||'')+'</small></div><div><span class="pse-health '+E(r.relationship_state)+'">'+E(r.relationship_state)+'</span></div><div class="pse-cell"><b>'+E(r.sent_rfqs_90d)+'</b><small>RFQ sent / 90d</small></div><div class="pse-cell"><b>'+E(r.answered_rfqs)+'</b><small>përgjigje/oferta</small></div><div class="pse-cell"><b>'+E(r.realized_orders)+'</b><small>realizime</small></div><div class="pse-signal">'+E(r.relationship_guidance||'')+'</div></div>';}
function render(){
 var p=document.getElementById('page-pristeel-sales-engine');if(!p)return;
 var k=p.querySelector('[data-pse-kpis]'),tabs=p.querySelector('[data-pse-tabs]'),body=p.querySelector('[data-pse-body]'),err=p.querySelector('[data-pse-error]'),cohort=p.querySelector('[data-pse-cohort]');
 if(k)k.innerHTML=kpisHtml();if(tabs)tabs.innerHTML=tabsHtml();if(err)err.innerHTML=state.error?'<div class="pse-error">'+E(state.error)+'</div>':'';
 var legacy=legacyTotals(),v2=v2Totals();if(cohort)cohort.innerHTML='<b>Cohort:</b> Legacy sent '+E(legacy.sent)+' / replies '+E(legacy.replied)+' · V2 sent '+E(v2.sent)+' / replies '+E(v2.replied)+'. V2 mbahet i ndarë që të matim nëse qasja e re realisht funksionon.';
 if(!body)return;
 if(state.loading){body.innerHTML='<div class="pse-table"><div class="pse-empty">Duke lexuar vetëm të dhënat e nevojshme…</div></div>';return;}
 if(state.mode==='suppliers'){body.innerHTML='<div class="pse-table pse-supplier"><div class="pse-th"><span>Furnitori</span><span>Health</span><span>90 ditë</span><span>Ofertuar</span><span>Realizuar</span><span>Udhëzim</span></div>'+ (state.supplier.length?state.supplier.map(supplierHtml).join(''):'<div class="pse-empty">Nuk ka histori të mjaftueshme.</div>')+'</div>';return;}
 body.innerHTML='<div class="pse-table"><div class="pse-th"><span>Kompania</span><span>Oferta PriSteel</span><span>Sinjali / evidenca</span><span>Kontakti</span><span>Fit·Time·Contact·Evidence</span><span>Veprimi</span></div>'+(state.rows.length?state.rows.map(rowHtml).join(''):'<div class="pse-empty">Nuk ka targete në këtë kategori.</div>')+'</div>';
}
function findRow(key){return A(state.rows).filter(function(r){return rowKey(r)===key})[0]||null;}
async function createDraftByRow(key,btn){
 var r=findRow(key);if(!r||state.busy[key])return;state.busy[key]=true;state.result[key]={};render();
 try{
  var out=null,url='';
  if(r.source_type==='dach_target'){out=await edge('pppp-dach-steel-draft-generator',{mode:'buyer',target_id:r.source_id});url=S(out.gmail_url);}
  else if(r.source_type==='opportunity_action'){
   out=await edge('pppp-opportunity-draft-generator',{action_id:r.source_id,limit:1});
   var rr=A(await db('pppp_opportunity_outreach_registry_v1?action_id=eq.'+enc(r.source_id)+'&status=eq.draft_created&select=gmail_thread_id,gmail_draft_id&order=updated_at.desc&limit=1'))[0];
   url=draftUrl(rr&&rr.gmail_thread_id||rr&&rr.gmail_draft_id);
  }else if(r.source_type==='gc_prospect'){
   out=await edge('pppp-gc-outreach',{prospect_id:r.source_id});
   var gp=A(await db('pppp_gc_prospects_v1?id=eq.'+enc(r.source_id)+'&select=first_gmail_thread_id,first_draft_id&limit=1'))[0];
   url=draftUrl(gp&&gp.first_gmail_thread_id||gp&&gp.first_draft_id);
  }else throw new Error('Burimi nuk ka draft route V3.');
  state.result[key]={ok:true};toast('Drafti u krijua. Dërgimi mbetet manual.');
  state.loadedAt=0;await loadFunnel(true);await loadRows(state.mode,true);renderHome();
  if(url)window.open(url,'_blank','noopener');
 }catch(e){state.result[key]={error:S(e&&e.message||e)};toast('Drafti nuk u krijua: '+S(e&&e.message||e),true);}
 finally{state.busy[key]=false;render();}
}
function boot(){css();ensurePage();ensureHome();}
document.addEventListener('pst:native-home-ready',function(){setTimeout(ensureHome,0)});
document.addEventListener('pst:home-canonical-rendered',function(){setTimeout(ensureHome,0)});
document.addEventListener('pst:modules-ready',function(){setTimeout(boot,0)},{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0)},{once:true});else setTimeout(boot,0);
window.PSTSalesEngineV3={open:open,refresh:refresh,snapshot:function(){return{mode:state.mode,funnel:A(state.funnel),rows:A(state.rows),supplier:A(state.supplier),error:state.error}}};
})();
