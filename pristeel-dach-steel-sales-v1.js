/* PRISTEEL DACH Steel Buyers v2
 * Buyer Target + Material Intelligence Desk for direct steel supply in DE/AT/CH.
 * Read-only UI. Qualified targets live in pppp_dach_steel_targets_v1.
 * Home reads only the 1-row pppp_dach_steel_home_summary_v1 view.
 * No outbound execution. No polling. No discovery noise stored in PPPP.
 */
(function(){
'use strict';
if(window.__pstDachSteelSalesV2)return;
window.__pstDachSteelSalesV2=true;
window.__pstDachSteelSalesV1=true;

var SOURCE='DACH_STEEL_BUYER';
var state={
 summary:null,targets:[],summaryLoaded:false,targetsLoaded:false,
 summaryLoading:false,targetsLoading:false,error:'',filter:'all',
 expanded:null,lastLoadedAt:0
};

function A(v){return Array.isArray(v)?v:[]}
function S(v){return String(v==null?'':v)}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim()}
function T(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.getTime():0}
function D(v){var t=T(v);return t?new Date(t).toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—'}
function num(v){var n=Number(v);return isFinite(n)?n:0}
function tonnes(v){var n=num(v);if(!n)return'—';return n.toLocaleString('en-US',{maximumFractionDigits:n<10?2:0})+' t'}
function J(v,fallback){if(v&&typeof v==='object')return v;try{return JSON.parse(S(v))}catch(e){return fallback}}
function arrText(v){return A(v).filter(Boolean).map(S)}
function truth(v){return v===true||v==='true'||v===1||v==='1'}\nfunction U(v){try{var u=new URL(S(v),window.location.href);return (u.protocol==='http:'||u.protocol==='https:')?u.href:''}catch(e){return''}}

function qrLabel(v){
 return v==='M3'?'M3 · QUOTE READY':
        v==='M2'?'M2 · CALCULATED':
        v==='M1'?'M1 · SCOPE KNOWN':'M0 · UNKNOWN';
}
function qrHelp(v){
 return v==='M3'?'Official BOQ/material list basis':
        v==='M2'?'Calculated from drawings/specifications':
        v==='M1'?'Product/material scope known':'Material definition not yet available';
}
function scoreClass(v){return v==='A1'?'a1':v==='A2'?'a2':v==='B1'?'b1':v==='B2'?'b2':'c'}
function qrClass(v){return v==='M3'?'m3':v==='M2'?'m2':v==='M1'?'m1':'m0'}
function contactLabel(v){return v==='verified'?'Contact verified':v==='found'?'Contact found':v==='searching'?'Finding contact':'Contact missing'}
function outreachLabel(v){return v==='ready'?'Ready for outreach':v==='queued'?'Queued':v==='sent'?'Sent':v==='replied'?'Replied':v==='suppressed'?'Suppressed':'Not ready'}

function localSummary(){
 var rows=A(state.targets).filter(function(r){return r.target_status!=='closed'&&r.target_status!=='rejected'});
 return {
  targets:rows.length,
  a1_targets:rows.filter(function(r){return r.score_band==='A1'}).length,
  quote_ready:rows.filter(function(r){return r.quote_readiness==='M3'}).length,
  calculated:rows.filter(function(r){return r.quote_readiness==='M2'}).length,
  needs_contact:rows.filter(function(r){return r.contact_status==='missing'||r.contact_status==='searching'}).length,
  ready_for_outreach:rows.filter(function(r){return r.outreach_status==='ready'}).length,
  identified_tonnes:rows.reduce(function(a,r){return a+num(r.estimated_tonnes)},0)
 };
}
function summary(){return state.summary||localSummary()}

function css(){
 if(document.getElementById('pst-dach-steel-sales-v2-css'))return;
 var s=document.createElement('style');s.id='pst-dach-steel-sales-v2-css';s.textContent=`
#pst-dach-steel-sales-card-v1{margin:14px 0 16px;border:1px solid #d6e4e7;border-radius:18px;background:linear-gradient(118deg,#f3f9fa 0%,#fff 57%,#f9f4e8 100%);box-shadow:0 10px 28px rgba(45,72,80,.06);overflow:hidden}
.pst-dss-home{width:100%;border:0;background:transparent;padding:20px 22px;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(520px,1fr) auto;gap:20px;align-items:center;text-align:left;color:#26383f;cursor:pointer}
.pst-dss-home:hover{background:rgba(255,255,255,.5)}
.pst-dss-eye{font-size:9px;font-weight:900;letter-spacing:.15em;color:#4b879a}.pst-dss-title{font-size:21px;font-weight:780;letter-spacing:-.4px;margin-top:4px}.pst-dss-sub{font-size:11px;line-height:1.5;color:#708087;margin-top:5px;max-width:660px}.pst-dss-chip{display:inline-flex;margin-top:9px;padding:4px 8px;border-radius:999px;background:#edf4f4;color:#4e707a;font-size:9px;font-weight:800}
.pst-dss-stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px}.pst-dss-stat{min-width:0;padding:9px 9px;border-left:1px solid #e2e9e9}.pst-dss-stat:first-child{border-left:0}.pst-dss-stat b{display:block;font-size:17px;color:#2e4a54;line-height:1}.pst-dss-stat span{display:block;margin-top:4px;font-size:7.6px;font-weight:800;text-transform:uppercase;letter-spacing:.035em;color:#8a9599;white-space:nowrap}
.pst-dss-cta{white-space:nowrap;color:#39788d;font-size:11px;font-weight:850}.pst-dss-current{padding:9px 22px 11px;border-top:1px solid #e7eceb;background:rgba(255,255,255,.55);font-size:9.5px;color:#748187;display:flex;gap:16px;flex-wrap:wrap}.pst-dss-current b{color:#405d67}

#page-dach-steel-sales{background:#f7f6f3!important;min-height:100vh;color:#293a40}.pst-dss-page{max-width:1500px;margin:0 auto;padding:25px 28px 54px}
.pst-dss-head{display:flex;justify-content:space-between;gap:18px;margin-bottom:14px}.pst-dss-head small{font-size:9px;font-weight:900;letter-spacing:.13em;color:#738b93}.pst-dss-head h1{margin:4px 0 0;font-size:29px;letter-spacing:-.55px}.pst-dss-head p{margin:5px 0 0;max-width:850px;color:#748086;font-size:11px;line-height:1.55}.pst-dss-actions{display:flex;gap:7px}.pst-dss-actions button{height:37px;padding:0 12px;border:1px solid #d6e1e3;border-radius:10px;background:#fff;color:#52666e;font-size:10px;font-weight:780;cursor:pointer}
.pst-dss-rule{display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:start;margin-bottom:13px;padding:12px 14px;border:1px solid #dbe7e8;border-radius:13px;background:#f1f7f7}.pst-dss-rule strong{font-size:10px;color:#376f81}.pst-dss-rule span{font-size:9.5px;line-height:1.5;color:#708187}
.pst-dss-kpis{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:8px;margin-bottom:12px}.pst-dss-kpi{border:1px solid #e1e5e3;border-radius:13px;background:#fff;padding:12px 13px}.pst-dss-kpi b{display:block;font-size:20px;line-height:1;color:#304a53}.pst-dss-kpi span{display:block;margin-top:4px;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#8a9498}
.pst-dss-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.pst-dss-tab{border:1px solid #dce5e6;border-radius:999px;background:#fff;padding:7px 11px;font-size:9.5px;font-weight:780;color:#687a81;cursor:pointer}.pst-dss-tab.on{background:#3f8298;border-color:#3f8298;color:#fff}
.pst-dss-panel{border:1px solid #e1e5e3;border-radius:15px;background:#fff;overflow:hidden}.pst-dss-panel-head{display:flex;justify-content:space-between;align-items:center;padding:13px 15px;border-bottom:1px solid #eaeeec}.pst-dss-panel-head b{font-size:11px}.pst-dss-panel-head span{font-size:9px;color:#879297}
.pst-dss-headrow,.pst-dss-row{display:grid;grid-template-columns:62px minmax(190px,1.05fr) minmax(240px,1.35fr) minmax(210px,1.05fr) 130px 150px minmax(170px,.9fr);gap:11px;align-items:center;padding:11px 15px}
.pst-dss-headrow{background:#fafbf9;border-bottom:1px solid #e9edeb;color:#8a9498;font-size:8px;font-weight:850;text-transform:uppercase;letter-spacing:.05em}.pst-dss-row{border-bottom:1px solid #eef0ee;cursor:pointer}.pst-dss-row:hover{background:#fbfcfb}.pst-dss-row b{display:block;font-size:11px;color:#344950}.pst-dss-row small{display:block;margin-top:3px;font-size:8.5px;line-height:1.35;color:#899498;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pst-dss-score{width:38px;height:28px;display:grid;place-items:center;border-radius:8px;font-size:10px;font-weight:900}.pst-dss-score.a1{background:#e9f2e8;color:#3f6f43}.pst-dss-score.a2{background:#eef3e7;color:#65713c}.pst-dss-score.b1{background:#edf3f5;color:#4f7180}.pst-dss-score.b2{background:#f3f0e9;color:#75664a}.pst-dss-score.c{background:#f3f1f1;color:#777}
.pst-dss-qr{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:8.5px;font-weight:850}.pst-dss-qr.m3{background:#e4f2e7;color:#2f7043}.pst-dss-qr.m2{background:#e7f0f4;color:#3d7083}.pst-dss-qr.m1{background:#f4f0e6;color:#7a6740}.pst-dss-qr.m0{background:#f2f1f0;color:#777}
.pst-dss-products{margin-top:4px;font-size:8.5px;color:#77858a}.pst-dss-ton{margin-top:3px;font-size:10px;font-weight:820;color:#415d67}.pst-dss-why{font-size:10px;line-height:1.42;color:#4e6067;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pst-dss-action{font-size:9.5px;line-height:1.4;color:#4d6168}
.pst-dss-pill{display:inline-flex;padding:4px 7px;border-radius:999px;background:#eef4f4;color:#58727b;font-size:8px;font-weight:800}.pst-dss-pill.ready{background:#e8f2e8;color:#477049}.pst-dss-pill.warn{background:#f5eee4;color:#81633e}
.pst-dss-detail{border-bottom:1px solid #e8edeb;background:#fafcfb;padding:0 15px 15px 88px}.pst-dss-detail-grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.7fr);gap:14px}.pst-dss-detail-card{border:1px solid #e2e8e6;border-radius:12px;background:#fff;padding:13px}.pst-dss-detail-card h3{margin:0 0 9px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#728287}.pst-dss-meta{display:grid;grid-template-columns:110px 1fr;gap:6px 10px;font-size:9px}.pst-dss-meta span:nth-child(odd){color:#8a9599}.pst-dss-meta span:nth-child(even){color:#42575e;font-weight:650}.pst-dss-source{display:inline-flex;margin-top:10px;color:#39788d;font-size:9px;font-weight:800;text-decoration:none}
.pst-dss-material-table{display:grid;border:1px solid #e5e9e7;border-radius:9px;overflow:hidden}.pst-dss-material-line{display:grid;grid-template-columns:minmax(130px,1fr) minmax(90px,.7fr) minmax(100px,.75fr) 80px 80px;gap:8px;padding:8px 9px;border-bottom:1px solid #eef0ee;font-size:8.8px}.pst-dss-material-line:last-child{border-bottom:0}.pst-dss-material-line.head{background:#f7f9f8;font-size:7.8px;font-weight:850;text-transform:uppercase;color:#889398}.pst-dss-material-line b{font-size:9px;color:#43575e}.pst-dss-evidence{margin-top:9px;display:flex;gap:5px;flex-wrap:wrap}.pst-dss-evidence span{padding:4px 6px;border-radius:7px;background:#f0f3f2;color:#718085;font-size:8px}
.pst-dss-empty{padding:48px 22px;text-align:center;color:#7e888c}.pst-dss-empty b{display:block;font-size:15px;color:#3a4c52}.pst-dss-empty span{display:block;margin:6px auto 0;max-width:650px;font-size:10px;line-height:1.55}

@media(max-width:1180px){.pst-dss-home{grid-template-columns:1fr}.pst-dss-cta{justify-self:start}.pst-dss-stats{max-width:820px}.pst-dss-kpis{grid-template-columns:repeat(4,minmax(0,1fr))}.pst-dss-headrow,.pst-dss-row{grid-template-columns:56px 1fr 1.35fr 1fr 125px}.pst-dss-col-contact,.pst-dss-col-action{display:none}.pst-dss-detail{padding-left:15px}}
@media(max-width:760px){.pst-dss-home{padding:17px}.pst-dss-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.pst-dss-stat{border-left:0;border-top:1px solid #e2e9e9}.pst-dss-page{padding:18px 13px 38px}.pst-dss-head{flex-direction:column}.pst-dss-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pst-dss-rule{grid-template-columns:1fr}.pst-dss-headrow{display:none}.pst-dss-row{grid-template-columns:48px 1fr 120px}.pst-dss-col-why,.pst-dss-col-timing,.pst-dss-col-contact,.pst-dss-col-action{display:none}.pst-dss-detail-grid{grid-template-columns:1fr}.pst-dss-material-line{grid-template-columns:1fr 70px 70px}.pst-dss-material-line>*:nth-child(2),.pst-dss-material-line>*:nth-child(3){display:none}}
`;document.head.appendChild(s);
}

async function loadSummary(force){
 if(state.summaryLoading)return state.summary;
 if(state.summaryLoaded&&!force)return state.summary;
 if(typeof window.supaFetch!=='function'){state.error='Databaza nuk është gati.';state.summaryLoaded=true;renderHome();return null}
 state.summaryLoading=true;state.error='';
 try{
  var rows=A(await window.supaFetch('pppp_dach_steel_home_summary_v1?select=*&limit=1'));
  state.summary=rows[0]||null;state.summaryLoaded=true;state.lastLoadedAt=Date.now();
 }catch(e){state.summary=null;state.error=S(e&&e.message||e);state.summaryLoaded=true}
 state.summaryLoading=false;renderHome();renderPage();return state.summary;
}

async function loadTargets(force){
 if(state.targetsLoading)return state.targets;
 if(state.targetsLoaded&&!force)return state.targets;
 if(typeof window.supaFetch!=='function'){state.error='Databaza nuk është gati.';state.targetsLoaded=true;renderPage();return[]}
 state.targetsLoading=true;state.error='';
 try{
  var path='pppp_dach_steel_targets_v1?select=id,source_key,source_name,source_url,partner_id,project_id,company_name,company_domain,company_website,country,buyer_type,score_band,target_status,why_now,project_title,project_reference,award_date,procurement_timing,quote_readiness,steel_scope,products,estimated_tonnes,material_revision,material_confidence,material_scope,evidence,contact_status,outreach_status,outbound_source_key,next_action,next_action_due,last_verified_at,created_at,updated_at&target_status=not.in.(closed,rejected)&order=updated_at.desc&limit=250';
  state.targets=A(await window.supaFetch(path));state.targetsLoaded=true;state.lastLoadedAt=Date.now();
 }catch(e){state.targets=[];state.error=S(e&&e.message||e);state.targetsLoaded=true}
 state.targetsLoading=false;renderPage();return state.targets;
}

function ensureHome(){
 css();var home=document.getElementById('pst-home-launchpad-v1'),grid=home&&home.querySelector('.pst-launch-grid');if(!home||!grid)return false;
 var card=document.getElementById('pst-dach-steel-sales-card-v1');
 if(!card){
  card=document.createElement('section');card.id='pst-dach-steel-sales-card-v1';
  card.innerHTML='<button class="pst-dss-home" type="button"><div><div class="pst-dss-eye">STEEL BUYERS DACH</div><div class="pst-dss-title">Project → Material → Proactive Offer</div><div class="pst-dss-sub">Gjej buyer-in kur kërkesa për çelik bëhet reale. Nxirr BOM/material scope nga dokumentet publike dhe identifiko targetet ku PriSteel mund të ofrojë para se të vijë RFQ-ja.</div><span class="pst-dss-chip">DE · AT · CH · DIRECT STEEL SUPPLY</span></div><div class="pst-dss-stats" data-dss-stats></div><span class="pst-dss-cta">Hap Steel Buyers →</span></button><div class="pst-dss-current" data-dss-current></div>';
  grid.parentNode.insertBefore(card,grid);card.querySelector('button').onclick=open;
 }
 renderHome();loadSummary(false);return true;
}

function renderHome(){
 var stats=document.querySelector('#pst-dach-steel-sales-card-v1 [data-dss-stats]'),cur=document.querySelector('#pst-dach-steel-sales-card-v1 [data-dss-current]');if(!stats||!cur)return;
 var x=summary()||{},p=[
  [x.targets||0,'Targets'],[x.a1_targets||0,'A1'],[x.quote_ready||0,'Quote ready'],
  [x.needs_contact||0,'Need contact'],[x.ready_for_outreach||0,'Ready outreach'],[x.replies||0,'Replies']
 ];
 stats.innerHTML=p.map(function(v){return '<span class="pst-dss-stat"><b>'+E(v[0])+'</b><span>'+E(v[1])+'</span></span>'}).join('');
 if(state.error){cur.innerHTML='<span><b>Status:</b> kanali nuk u lexua · '+E(state.error)+'</span>';return}
 if(!(x.targets||0)){cur.innerHTML='<span><b>Status:</b> ende 0 qualified targets.</span><span><b>Next:</b> discovery → award dossier → material extraction → qualification.</span>';return}
 var hot=x.hot_company_name?'<span><b>Top target:</b> '+E(x.hot_company_name)+(x.hot_project_title?' · '+E(x.hot_project_title):'')+(x.hot_quote_readiness?' · '+E(qrLabel(x.hot_quote_readiness)):'')+'</span>':'';
 cur.innerHTML='<span><b>Identified steel:</b> '+E(tonnes(x.identified_tonnes))+'</span>'+hot;
}

function ensurePage(){
 css();var page=document.getElementById('page-dach-steel-sales');if(page)return page;
 var host=document.querySelector('.content')||document.body;page=document.createElement('div');page.id='page-dach-steel-sales';page.className='page';page.style.display='none';
 page.innerHTML='<div class="pst-dss-page"><header class="pst-dss-head"><div><small>PRISTEEL · DACH STEEL BUYER ENGINE</small><h1>Steel Buyers DACH</h1><p>Targetet këtu nuk janë thjesht kompani. Çdo target duhet të ketë një arsye reale për blerje, evidence të projektit dhe — kur është e mundur — Material Intelligence që na tregon çfarë mund t’i ofrojmë proaktivisht.</p></div><div class="pst-dss-actions"><button data-dss-refresh>Rifresko</button><button data-dss-back>← Ballina</button></div></header><div class="pst-dss-rule"><strong>RREGULLI I MOTORIT</strong><span>A1 kërkon company + current project + steel scope + relevant timing. M3 do të thotë se kemi bazë zyrtare BOQ/material list për një ofertë proaktive; M2 është kalkulim nga drawings/specs dhe duhet trajtuar si indicative deri në konfirmim.</span></div><div class="pst-dss-kpis" data-dss-kpis></div><div class="pst-dss-tabs"><button class="pst-dss-tab on" data-dss-filter="all">Të gjitha</button><button class="pst-dss-tab" data-dss-filter="a1">A1</button><button class="pst-dss-tab" data-dss-filter="m3">M3 · Quote Ready</button><button class="pst-dss-tab" data-dss-filter="material">Need Material</button><button class="pst-dss-tab" data-dss-filter="contact">Need Contact</button><button class="pst-dss-tab" data-dss-filter="outreach">Ready Outreach</button></div><section class="pst-dss-panel"><div class="pst-dss-panel-head"><b>Buyer + Material Intelligence Desk</b><span data-dss-updated></span></div><div class="pst-dss-headrow"><span>Priority</span><span>Buyer / project</span><span>Why now?</span><span>Material intelligence</span><span class="pst-dss-col-timing">Timing</span><span class="pst-dss-col-contact">Contact</span><span class="pst-dss-col-action">Next action</span></div><div data-dss-list></div></section></div>';
 host.appendChild(page);
 page.onclick=function(e){
  var f=e.target.closest('[data-dss-filter]');if(f){state.filter=f.getAttribute('data-dss-filter');state.expanded=null;renderPage();return}
  if(e.target.closest('[data-dss-refresh]')){state.summaryLoaded=false;state.targetsLoaded=false;loadSummary(true);loadTargets(true);return}
  if(e.target.closest('[data-dss-back]')){back();return}
  if(e.target.closest('a'))return;
  var row=e.target.closest('[data-dss-target-id]');if(row){var id=row.getAttribute('data-dss-target-id');state.expanded=state.expanded===id?null:id;renderPage()}
 };
 return page;
}

function filteredRows(){
 var rows=A(state.targets);
 if(state.filter==='a1')return rows.filter(function(r){return r.score_band==='A1'});
 if(state.filter==='m3')return rows.filter(function(r){return r.quote_readiness==='M3'});
 if(state.filter==='material')return rows.filter(function(r){return r.quote_readiness==='M0'||r.quote_readiness==='M1'});
 if(state.filter==='contact')return rows.filter(function(r){return r.contact_status==='missing'||r.contact_status==='searching'});
 if(state.filter==='outreach')return rows.filter(function(r){return r.outreach_status==='ready'});
 return rows;
}

function materialLines(r){
 var scope=J(r.material_scope,{}),items=A(scope&&scope.line_items);
 if(!items.length)return '<div class="pst-dss-empty" style="padding:18px 10px"><b>No line-item BOM yet</b><span>'+E(qrHelp(r.quote_readiness))+'</span></div>';
 var head='<div class="pst-dss-material-line head"><span>Material</span><span>Grade / standard</span><span>Dimension</span><span>Qty</span><span>Tonnes</span></div>';
 return '<div class="pst-dss-material-table">'+head+items.slice(0,80).map(function(i){
  var mat=[i.family,i.designation].filter(Boolean).join(' · ')||'Material';
  var grade=[i.grade,i.standard].filter(Boolean).join(' / ')||'—';
  var dim=i.dimensions||i.dimension||((i.length_m!=null)?('L '+i.length_m+' m'):'—');
  var q=i.qty!=null?(S(i.qty)+(i.unit?' '+S(i.unit):'')):'—';
  return '<div class="pst-dss-material-line"><b>'+E(mat)+'</b><span>'+E(grade)+'</span><span>'+E(dim)+'</span><span>'+E(q)+'</span><span>'+E(tonnes(i.tonnes))+'</span></div>';
 }).join('')+'</div>';
}

function detail(r){
 var ev=A(J(r.evidence,[])),scope=J(r.material_scope,{});
 var conf=r.material_confidence!=null?Math.round(num(r.material_confidence)*100)+'%':'—';
 var safeSource=U(r.source_url),source=safeSource?'<a class="pst-dss-source" href="'+E(safeSource)+'" target="_blank" rel="noopener">Hap burimin ↗</a>':'';
 var evidence=ev.length?'<div class="pst-dss-evidence">'+ev.slice(0,10).map(function(x){var label=typeof x==='string'?x:(x.label||x.title||x.source||x.url||'Evidence');return '<span>'+E(label)+'</span>'}).join('')+'</div>':'';
 return '<div class="pst-dss-detail"><div class="pst-dss-detail-grid"><section class="pst-dss-detail-card"><h3>Project & qualification</h3><div class="pst-dss-meta"><span>Company</span><span>'+E(r.company_name)+'</span><span>Country</span><span>'+E(r.country||'—')+'</span><span>Buyer type</span><span>'+E(r.buyer_type||'—')+'</span><span>Project</span><span>'+E(r.project_title||'—')+'</span><span>Reference</span><span>'+E(r.project_reference||'—')+'</span><span>Award date</span><span>'+E(D(r.award_date))+'</span><span>Procurement</span><span>'+E(r.procurement_timing||'—')+'</span><span>Material revision</span><span>'+E(r.material_revision||scope.revision||'—')+'</span><span>Confidence</span><span>'+E(conf)+'</span><span>Last verified</span><span>'+E(D(r.last_verified_at))+'</span></div>'+source+evidence+'</section><section class="pst-dss-detail-card"><h3>Material Intelligence · '+E(qrLabel(r.quote_readiness))+'</h3><div style="font-size:9px;color:#718187;margin:-3px 0 9px">'+E(r.steel_scope||qrHelp(r.quote_readiness))+'</div>'+materialLines(r)+'</section></div></div>';
}

function renderPage(){
 var page=document.getElementById('page-dach-steel-sales');if(!page)return;
 var sx=summary()||{},lx=localSummary(),k=page.querySelector('[data-dss-kpis]'),list=page.querySelector('[data-dss-list]'),u=page.querySelector('[data-dss-updated]');
 if(k)k.innerHTML=[
  [sx.targets||lx.targets,'Targets'],[sx.a1_targets||lx.a1_targets,'A1'],
  [sx.quote_ready||lx.quote_ready,'M3 Quote Ready'],[lx.calculated,'M2 Calculated'],
  [sx.needs_contact||lx.needs_contact,'Need Contact'],[sx.ready_for_outreach||lx.ready_for_outreach,'Ready Outreach'],
  [sx.sent||0,'Sent'],[sx.replies||0,'Replies']
 ].map(function(v){return '<div class="pst-dss-kpi"><b>'+E(v[0])+'</b><span>'+E(v[1])+'</span></div>'}).join('');
 page.querySelectorAll('[data-dss-filter]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-dss-filter')===state.filter)});
 if(u)u.textContent=state.lastLoadedAt?'Përditësuar '+new Date(state.lastLoadedAt).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'}):'';
 if(!list)return;
 if(state.targetsLoading){list.innerHTML='<div class="pst-dss-empty"><b>Duke lexuar qualified targets…</b><span>Një query e kufizuar; discovery noise nuk ruhet këtu.</span></div>';return}
 if(state.error&&state.targetsLoaded){list.innerHTML='<div class="pst-dss-empty"><b>Steel Buyer Desk nuk u lexua</b><span>'+E(state.error)+'</span></div>';return}
 var rows=filteredRows();
 if(!rows.length){
  var msg=state.filter==='all'?'Ende nuk ka qualified Steel Buyer targets.':'Nuk ka targete në këtë filtër.';
  list.innerHTML='<div class="pst-dss-empty"><b>'+E(msg)+'</b><span>Pipeline-i i ardhshëm është: award/project signal → winner → public dossier → material extraction → A1/A2 qualification → contact → shared outbound.</span></div>';return;
 }
 list.innerHTML=rows.map(function(r){
  var prods=arrText(r.products).slice(0,4).join(' · ')||r.steel_scope||'Material scope pending';
  var contact=r.contact_status==='verified'?'<span class="pst-dss-pill ready">Verified</span>':(r.contact_status==='missing'||r.contact_status==='searching'?'<span class="pst-dss-pill warn">'+E(contactLabel(r.contact_status))+'</span>':'<span class="pst-dss-pill">'+E(contactLabel(r.contact_status))+'</span>');
  var row='<div class="pst-dss-row" data-dss-target-id="'+E(r.id)+'"><span class="pst-dss-score '+scoreClass(r.score_band)+'">'+E(r.score_band||'—')+'</span><div><b>'+E(r.company_name||'Buyer')+'</b><small>'+E([r.country,r.project_title].filter(Boolean).join(' · ')||r.buyer_type||'Steel buyer')+'</small></div><div class="pst-dss-col-why"><div class="pst-dss-why">'+E(r.why_now||'Why-now evidence pending')+'</div></div><div><span class="pst-dss-qr '+qrClass(r.quote_readiness)+'">'+E(qrLabel(r.quote_readiness))+'</span><div class="pst-dss-products">'+E(prods)+'</div><div class="pst-dss-ton">'+E(tonnes(r.estimated_tonnes))+'</div></div><div class="pst-dss-col-timing"><b>'+E(r.procurement_timing||'Unknown')+'</b><small>'+E(r.award_date?'Award '+D(r.award_date):'Timing evidence needed')+'</small></div><div class="pst-dss-col-contact">'+contact+'<small>'+E(outreachLabel(r.outreach_status))+'</small></div><div class="pst-dss-col-action"><div class="pst-dss-action">'+E(r.next_action||'Review evidence')+'</div><small>'+E(r.next_action_due?D(r.next_action_due):'No due date')+'</small></div></div>';
  return row+(state.expanded===S(r.id)?detail(r):'');
 }).join('');
}

function back(){
 try{var n=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV1;if(n&&typeof n.openHome==='function'){n.openHome();return}}catch(e){}
 try{if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo('home');return}}catch(e){}
}
function open(){
 var page=ensurePage();document.querySelectorAll('.page').forEach(function(p){if(p!==page){p.classList.remove('active');p.style.display='none'}});
 page.style.display='block';page.classList.add('active');renderPage();loadSummary(false);loadTargets(false);try{window.scrollTo(0,0)}catch(e){}
}
function boot(){css();ensurePage();ensureHome()}

document.addEventListener('pst:native-home-ready',function(){setTimeout(ensureHome,0)});
document.addEventListener('pst:home-canonical-rendered',function(){setTimeout(ensureHome,0)});
document.addEventListener('pst:modules-ready',function(){setTimeout(boot,0)},{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0)},{once:true});else setTimeout(boot,0);

window.PSTDachSteelSalesV1=window.PSTDachSteelSalesV2={
 source:SOURCE,open:open,
 refresh:function(){state.summaryLoaded=false;state.targetsLoaded=false;return Promise.all([loadSummary(true),loadTargets(true)])},
 snapshot:function(){return{source:SOURCE,summary:summary(),targets:A(state.targets).slice(),filter:state.filter,error:state.error}}
};
})();