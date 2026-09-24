/* PRISTEEL DACH Steel Buyers v5
 * EU Buyer Target + Material Intelligence Desk for direct steel supply across the EU, with Switzerland retained for backward compatibility.
 * Operational buyer-to-supply workflow over qualified Material Trade targets in the backward-compatible pppp_dach_steel_targets_v1 table.
 * Home reads only the 1-row pppp_dach_steel_home_summary_v1 view.
 * Supplier matching is read-only; buyer/supplier email actions only prepare/open drafts. Nothing sends automatically.
 */
(function(){
'use strict';
if(window.__pstDachSteelSalesV3)return;
window.__pstDachSteelSalesV3=true;
window.__pstDachSteelSalesV2=true;
window.__pstDachSteelSalesV1=true;

var SOURCE='DACH_STEEL_BUYER';
var state={
 summary:null,targets:[],outboundByTarget:{},supplierByTarget:{},contactByTarget:{},
 draftBusy:{},draftResult:{},supplierDrafts:{},contactBusy:{},
 summaryLoaded:false,targetsLoaded:false,outboundLoaded:false,
 summaryLoading:false,targetsLoading:false,outboundLoading:false,
 error:'',filter:'action',expanded:null,actionView:null,lastLoadedAt:0,lifecycleSyncing:false,lifecycleSyncedAt:0,lifecycleResult:null
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
function truth(v){return v===true||v==='true'||v===1||v==='1'}
function U(v){try{var u=new URL(S(v),window.location.href);return (u.protocol==='http:'||u.protocol==='https:')?u.href:''}catch(e){return''}}

function qrLabel(v){
 return v==='M3'?'M3 · GATI PËR OFERTË':
        v==='M2'?'M2 · E LLOGARITUR':
        v==='M1'?'M1 · FUSHA E NJOHUR':'M0 · E PANJOHUR';
}
function qrHelp(v){
 return v==='M3'?'Bazë zyrtare BOQ / listë materiali':
        v==='M2'?'Llogaritur nga vizatimet / specifikimet':
        v==='M1'?'Produkti / fusha e materialit është e njohur':'Përkufizimi i materialit ende mungon';
}
function scoreClass(v){return v==='A1'?'a1':v==='A2'?'a2':v==='B1'?'b1':v==='B2'?'b2':'c'}
function qrClass(v){return v==='M3'?'m3':v==='M2'?'m2':v==='M1'?'m1':'m0'}
function contactLabel(v){return v==='verified'?'Kontakt i verifikuar':v==='found'?'Kontakt i gjetur':v==='searching'?'Duke kërkuar kontaktin':'Kontakti mungon'}
function outreachLabel(v){return v==='ready'?'Gati për kontaktim':v==='queued'?'Draft gati':v==='sent'?'Në pritje':v==='replied'?'Përgjigje / Aktiv':v==='suppressed'?'Bllokuar':'Jo gati'}
function buyerTier(r){
 var s=N([r&&r.buyer_type,r&&r.steel_scope].filter(Boolean).join(' '));
 if(/stahlbau|metallbau|hallenbau|anlagenbau|maschinenbau|fahrzeugbau|trailer|behalter|behaelter|fordertechnik|foerdertechnik|fabricat|manufacturer|producer|metal processing|steel processing|steel service|industrial fabrication|heavy fabrication/.test(s))return'T1';
 if(/general contractor|\bgc\b|\bgu\b|bauunternehmen|construction|hochbau|tiefbau|industriebau|infrastructure|contractor/.test(s))return'T2';
 return'T3';
}
function buyerTierLabel(r){var x=buyerTier(r);return x==='T1'?'T1 · konsumator direkt':x==='T2'?'T2 · ndërtim / GC-GU':'T3 · për rishikim'}

function localSummary(){
 var rows=A(state.targets).filter(function(r){return r.target_status!=='closed'&&r.target_status!=='rejected'});
 return {
  targets:rows.length,
  a1_targets:rows.filter(function(r){return r.score_band==='A1'}).length,
  quote_ready:rows.filter(function(r){return r.quote_readiness==='M3'}).length,
  calculated:rows.filter(function(r){return r.quote_readiness==='M2'}).length,
  needs_contact:rows.filter(function(r){return !hasContact(r)}).length,
  ready_for_outreach:rows.filter(function(r){return lifecycle(r)==='action'&&hasContact(r)}).length,
  identified_tonnes:rows.reduce(function(a,r){return a+num(r.estimated_tonnes)},0)
 };
}
function summary(){return state.summary||localSummary()}

function css(){
 if(document.getElementById('pst-dach-steel-sales-v3-css'))return;
 var s=document.createElement('style');s.id='pst-dach-steel-sales-v3-css';
 s.textContent=[
'#pst-dach-steel-sales-card-v1{margin:14px 0 16px;border:1px solid #d6e4e7;border-radius:18px;background:linear-gradient(118deg,#f3f9fa 0%,#fff 57%,#f9f4e8 100%);box-shadow:0 10px 28px rgba(45,72,80,.06);overflow:hidden}',
'.pst-dss-home{width:100%;border:0;background:transparent;padding:20px 22px;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(520px,1fr) auto;gap:20px;align-items:center;text-align:left;color:#26383f;cursor:pointer}.pst-dss-home:hover{background:rgba(255,255,255,.5)}',
'.pst-dss-eye{font-size:9px;font-weight:900;letter-spacing:.15em;color:#4b879a}.pst-dss-title{font-size:21px;font-weight:780;letter-spacing:-.4px;margin-top:4px}.pst-dss-sub{font-size:11px;line-height:1.5;color:#708087;margin-top:5px;max-width:660px}.pst-dss-chip{display:inline-flex;margin-top:9px;padding:4px 8px;border-radius:999px;background:#edf4f4;color:#4e707a;font-size:9px;font-weight:800}',
'.pst-dss-stats{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px}.pst-dss-stat{min-width:0;padding:9px 9px;border-left:1px solid #e2e9e9}.pst-dss-stat:first-child{border-left:0}.pst-dss-stat b{display:block;font-size:17px;color:#2e4a54;line-height:1}.pst-dss-stat span{display:block;margin-top:4px;font-size:7.6px;font-weight:800;text-transform:uppercase;letter-spacing:.035em;color:#8a9599;white-space:nowrap}.pst-dss-cta{white-space:nowrap;color:#39788d;font-size:11px;font-weight:850}.pst-dss-current{padding:9px 22px 11px;border-top:1px solid #e7eceb;background:rgba(255,255,255,.55);font-size:9.5px;color:#748187;display:flex;gap:16px;flex-wrap:wrap}.pst-dss-current b{color:#405d67}',
'body.pst-dss-active .topbar,body:has(#page-dach-steel-sales.active) .topbar{display:none!important}body.pst-dss-active .content{padding-top:8px!important}',
'#page-dach-steel-sales{background:#f7f6f3!important;min-height:calc(100vh - 20px);color:#293a40}.pst-dss-page{max-width:1540px;margin:0 auto;padding:8px 10px 42px}',
'.pst-dss-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin:0 0 10px}.pst-dss-head small{font-size:9px;font-weight:900;letter-spacing:.13em;color:#738b93}.pst-dss-head h1{margin:3px 0 0;font-size:27px;letter-spacing:-.5px}.pst-dss-head p{margin:4px 0 0;max-width:900px;color:#748086;font-size:11px;line-height:1.45}.pst-dss-actions{display:flex;gap:7px}.pst-dss-actions button{height:34px;padding:0 11px;border:1px solid #cfe0e4;border-radius:9px;background:#fff;color:#3d7184;font-size:10px;font-weight:800;cursor:pointer}',
'.pst-dss-engine-note{margin-bottom:9px;padding:8px 11px;border:1px solid #dbe7e8;border-radius:10px;background:#f1f7f7;color:#687b82;font-size:9.5px;line-height:1.45}.pst-dss-engine-note b{color:#356f82}',
'.pst-dss-kpi-strip{display:flex;align-items:stretch;gap:0;margin-bottom:9px;border:1px solid #e0e6e4;border-radius:11px;background:#fff;overflow:hidden}.pst-dss-kpi{min-width:0;flex:1;padding:8px 12px;border-right:1px solid #edf0ee}.pst-dss-kpi:last-child{border-right:0}.pst-dss-kpi b{font-size:16px;color:#304a53}.pst-dss-kpi span{margin-left:6px;font-size:8px;font-weight:820;text-transform:uppercase;color:#8a9498}',
'.pst-dss-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:9px}.pst-dss-tab{border:1px solid #dce5e6;border-radius:999px;background:#fff;padding:6px 10px;font-size:9.5px;font-weight:780;color:#687a81;cursor:pointer}.pst-dss-tab.on{background:#3f8298;border-color:#3f8298;color:#fff}',
'.pst-dss-panel{border:1px solid #e1e5e3;border-radius:13px;background:#fff;overflow:hidden}.pst-dss-panel-head{display:flex;justify-content:space-between;align-items:center;padding:10px 13px;border-bottom:1px solid #eaeeec}.pst-dss-panel-head b{font-size:11px}.pst-dss-panel-head span{font-size:9px;color:#879297}',
'.pst-dss-headrow,.pst-dss-row{display:grid;grid-template-columns:56px minmax(200px,1.05fr) minmax(220px,1.18fr) minmax(195px,.95fr) minmax(185px,.88fr) 140px 130px;gap:11px;align-items:center;padding:10px 13px}.pst-dss-headrow{background:#fafbf9;border-bottom:1px solid #e9edeb;color:#8a9498;font-size:8px;font-weight:850;text-transform:uppercase;letter-spacing:.05em}.pst-dss-row{border-bottom:1px solid #eef0ee;cursor:pointer}.pst-dss-row:hover{background:#fbfcfb}.pst-dss-row b{display:block;font-size:12px;color:#344950}.pst-dss-row small{display:block;margin-top:3px;font-size:9px;line-height:1.35;color:#899498;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.pst-dss-contact b{font-size:10.5px;color:#315f70;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-dss-contact small{font-size:8.8px;color:#7f8e93}.pst-dss-contact a{color:#315f70;text-decoration:none}.pst-dss-contact a:hover{text-decoration:underline}.pst-dss-contact-missing{font-size:9.5px;color:#9a7c55;font-weight:750}',
'.pst-dss-score{width:38px;height:28px;display:grid;place-items:center;border-radius:8px;font-size:10px;font-weight:900}.pst-dss-score.a1{background:#e9f2e8;color:#3f6f43}.pst-dss-score.a2{background:#eef3e7;color:#65713c}.pst-dss-score.b1{background:#edf3f5;color:#4f7180}.pst-dss-score.b2{background:#f3f0e9;color:#75664a}.pst-dss-score.c{background:#f3f1f1;color:#777}',
'.pst-dss-qr{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:8.5px;font-weight:850}.pst-dss-qr.m3{background:#e4f2e7;color:#2f7043}.pst-dss-qr.m2{background:#e7f0f4;color:#3d7083}.pst-dss-qr.m1{background:#f4f0e6;color:#7a6740}.pst-dss-qr.m0{background:#f2f1f0;color:#777}.pst-dss-products{margin-top:4px;font-size:9px;color:#77858a}.pst-dss-ton{margin-top:3px;font-size:10px;font-weight:820;color:#415d67}.pst-dss-why{font-size:10.5px;line-height:1.42;color:#4e6067;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
'.pst-dss-nextbtn{border:1px solid #93c3d1;border-radius:8px;background:#f4fbfd;color:#2e748b;padding:7px 9px;font-size:9px;font-weight:850;cursor:pointer;white-space:nowrap}.pst-dss-nextbtn:hover{background:#e8f5f8}',
'.pst-dss-detail{border-bottom:1px solid #e4ebe8;background:#f8fbfa;padding:16px 16px;font-size:12px}.pst-dss-summary{display:grid;grid-template-columns:1.15fr .85fr;gap:12px;margin-bottom:13px}.pst-dss-summary-card{border:1px solid #e1e8e6;border-radius:11px;background:#fff;padding:15px 16px}.pst-dss-summary-card h3{margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#728287}.pst-dss-summary-title{font-size:17px;font-weight:800;color:#30474f}.pst-dss-summary-sub{margin-top:5px;font-size:12.5px;line-height:1.5;color:#64777e}.pst-dss-keyfacts{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.pst-dss-keyfacts span{padding:6px 8px;border-radius:7px;background:#f1f5f4;font-size:10.5px;color:#61747b}',
'.pst-dss-action-center{border:1px solid #cfe0e4;border-radius:12px;background:#fff;padding:15px;margin-bottom:13px}.pst-dss-action-center>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px}.pst-dss-action-center>header b{font-size:14px;color:#315d6c}.pst-dss-action-center>header span{font-size:10.5px;color:#819096}.pst-dss-action-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px}.pst-dss-action-card{border:1px solid #e3e9e7;border-radius:10px;background:#fbfcfb;padding:14px}.pst-dss-action-card h4{margin:0 0 6px;font-size:13px;color:#344b53}.pst-dss-action-card p{margin:0 0 9px;font-size:12px;line-height:1.5;color:#65777e}.pst-dss-action-status{font-size:11.5px;color:#526a74;margin:8px 0}.pst-dss-action-buttons{display:flex;gap:7px;flex-wrap:wrap}.pst-dss-btn{border:1px solid #c9dfe5;border-radius:8px;background:#fff;color:#35768c;padding:8px 11px;font-size:10.5px;font-weight:820;cursor:pointer}.pst-dss-btn.primary{background:#4b93aa;border-color:#4b93aa;color:#fff}.pst-dss-btn.success{background:#eef7ef;border-color:#b9d8bd;color:#3b7143}.pst-dss-btn:disabled{opacity:.48;cursor:not-allowed}.pst-dss-guard{margin-top:8px;font-size:10.5px;line-height:1.45;color:#829095}.pst-dss-inline-status{margin-top:8px;padding:7px 9px;border-radius:8px;background:#eef6f2;color:#426b52;font-size:10.5px;font-weight:700}',
'.pst-dss-previewbox{margin-top:10px;border:1px solid #dfe7e5;border-radius:9px;background:#fff;padding:12px}.pst-dss-previewbox b{display:block;font-size:11px;color:#4b636c;margin-bottom:7px}.pst-dss-previewbox pre{white-space:pre-wrap;margin:0;max-height:340px;overflow:auto;font:12px/1.55 Inter,Arial,sans-serif;color:#455a62}',
'.pst-dss-candidates{margin-top:10px;display:grid;gap:7px}.pst-dss-candidate{display:grid;grid-template-columns:minmax(180px,1fr) auto auto;gap:9px;align-items:center;border:1px solid #e5eae8;border-radius:8px;background:#fff;padding:10px 11px}.pst-dss-candidate b{font-size:12px}.pst-dss-candidate small{display:block;margin-top:3px;font-size:10.5px;line-height:1.35;color:#879298}.pst-dss-fit{padding:5px 7px;border-radius:999px;background:#eef5ef;color:#527454;font-size:9.5px;font-weight:800}.pst-dss-fit.review{background:#f5f1e7;color:#80683d}',
'.pst-dss-details{border:1px solid #e3e9e7;border-radius:10px;background:#fff;overflow:hidden}.pst-dss-details summary{cursor:pointer;padding:11px 13px;font-size:11.5px;font-weight:800;color:#566c74;background:#fafbf9}.pst-dss-detail-grid{display:grid;grid-template-columns:minmax(250px,.8fr) minmax(0,1.7fr);gap:12px;padding:13px}.pst-dss-detail-card{border:1px solid #e2e8e6;border-radius:10px;background:#fff;padding:13px}.pst-dss-detail-card h3{margin:0 0 9px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#728287}.pst-dss-meta{display:grid;grid-template-columns:125px 1fr;gap:7px 10px;font-size:11.5px}.pst-dss-meta span:nth-child(odd){color:#8a9599}.pst-dss-meta span:nth-child(even){color:#42575e;font-weight:650}.pst-dss-source{display:inline-flex;margin-top:10px;color:#39788d;font-size:10.5px;font-weight:800;text-decoration:none}',
'.pst-dss-material-table{display:grid;border:1px solid #e5e9e7;border-radius:9px;overflow:hidden}.pst-dss-material-line{display:grid;grid-template-columns:minmax(150px,1fr) minmax(105px,.7fr) minmax(110px,.75fr) 85px 85px;gap:8px;padding:10px 11px;border-bottom:1px solid #eef0ee;font-size:10.5px}.pst-dss-material-line:last-child{border-bottom:0}.pst-dss-material-line.head{background:#f7f9f8;font-size:9px;font-weight:850;text-transform:uppercase;color:#889398}.pst-dss-material-line b{font-size:11px;color:#43575e}.pst-dss-evidence{margin-top:9px;display:flex;gap:5px;flex-wrap:wrap}.pst-dss-evidence span{padding:5px 7px;border-radius:7px;background:#f0f3f2;color:#718085;font-size:9.5px}',
'.pst-dss-empty{padding:38px 22px;text-align:center;color:#7e888c}.pst-dss-empty b{display:block;font-size:14px;color:#3a4c52}.pst-dss-empty span{display:block;margin:6px auto 0;max-width:650px;font-size:11px;line-height:1.55}',
'@media(max-width:1180px){.pst-dss-home{grid-template-columns:1fr}.pst-dss-stats{max-width:820px}.pst-dss-headrow,.pst-dss-row{grid-template-columns:52px 1.1fr 1fr minmax(170px,.9fr) 150px 125px}.pst-dss-col-why{display:none}.pst-dss-col-action{display:none}.pst-dss-summary,.pst-dss-action-grid{grid-template-columns:1fr}}',
'@media(max-width:760px){.pst-dss-home{padding:17px}.pst-dss-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.pst-dss-page{padding:5px 0 32px}.pst-dss-head{flex-direction:column}.pst-dss-kpi-strip{display:grid;grid-template-columns:repeat(2,1fr)}.pst-dss-kpi{border-bottom:1px solid #edf0ee}.pst-dss-headrow{display:none}.pst-dss-row{grid-template-columns:46px 1fr 118px}.pst-dss-col-why,.pst-dss-col-timing,.pst-dss-col-action{display:none}.pst-dss-detail-grid{grid-template-columns:1fr}.pst-dss-material-line{grid-template-columns:1fr 70px 70px}.pst-dss-material-line>*:nth-child(2),.pst-dss-material-line>*:nth-child(3){display:none}.pst-dss-candidate{grid-template-columns:1fr auto}}'
 ].join('');
 document.head.appendChild(s);
}

function chrome(on){
 try{document.body.classList.toggle('pst-dss-active',!!on);}catch(e){}
 var page=document.getElementById('page-dach-steel-sales');
 if(on){
  document.querySelectorAll('button,a,[role="button"],[onclick]').forEach(function(el){
   if(page&&page.contains(el))return;
   var txt=S(el.textContent).replace(/\s+/g,' ').trim();
   if(/^(?:←\s*)?Kthehu$/i.test(txt)){
    if(!el.hasAttribute('data-pst-dss-hidden')){el.setAttribute('data-pst-dss-hidden','1');el.setAttribute('data-pst-dss-display',el.style.display||'');}
    el.style.display='none';
   }
  });
 }else{
  document.querySelectorAll('[data-pst-dss-hidden="1"]').forEach(function(el){el.style.display=el.getAttribute('data-pst-dss-display')||'';el.removeAttribute('data-pst-dss-hidden');el.removeAttribute('data-pst-dss-display');});
 }
}

function outboundFor(r){return state.outboundByTarget[S(r&&r.id)]||null}
function emailFrom(v){var m=S(v).match(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/i);return m?S(m[0]).toLowerCase():''}
function evidenceContact(r){
 var ev=A(J(r&&r.evidence,[])),domain=N(r&&r.company_domain),best=null;
 ev.forEach(function(x){
  var obj=(x&&typeof x==='object')?x:{label:S(x)},raw=[obj.email,obj.label,obj.title,obj.source].filter(Boolean).join(' '),email=emailFrom(raw);if(!email)return;
  var d=N(email.split('@')[1]||''),label=N(raw),general=/^(info|kontakt|office|mail|zentrale)@/i.test(email);
  var cand={email:email,person:S(obj.person||''),role:label.indexOf('winner contact')>-1?'Public winner contact':label.indexOf('official company contact')>-1?'Official company contact':label.indexOf('company contact')>-1?'Public company contact':'Public contact',source:'target_evidence',quality:general?'general':'direct_public',source_url:S(obj.url||r.source_url||'')};
  if(!best||(domain&&d===domain&&N(best.email.split('@')[1]||'')!==domain)||(!general&&best.quality==='general'))best=cand;
 });
 return best||{};
}
function contactFor(r){
 var q=outboundFor(r);if(q&&q.recipient_email)return{email:S(q.recipient_email).toLowerCase(),person:S(q.recipient_name||''),role:S(q.contact_role||''),source:'shared_outbound',quality:'canonical'};
 var live=state.contactByTarget[S(r&&r.id)];if(live&&live.email)return live;
 return evidenceContact(r);
}
function hasContact(r){return !!S(contactFor(r).email)}
async function resolveContact(r){
 var id=S(r&&r.id);if(!id||state.contactBusy[id])return contactFor(r);
 state.contactBusy[id]=true;renderPage();
 try{
  var raw=await edgeDraft({mode:'contact',target_id:id}),ct=raw&&raw.contact&&typeof raw.contact==='object'?raw.contact:{};
  state.contactByTarget[id]=ct;
 }catch(e){state.contactByTarget[id]={error:S(e&&e.message||e)}}
 state.contactBusy[id]=false;renderPage();return state.contactByTarget[id];
}
function queuePayload(q){return J(q&&q.payload,{})||{}}
function findTarget(id){return A(state.targets).filter(function(r){return S(r.id)===S(id)})[0]||null}
function materialItems(r){var x=J(r&&r.material_scope,{});return A(x&&x.line_items)}
function materialText(r){
 var items=materialItems(r);
 if(!items.length)return S(r&&r.steel_scope||'Material scope to be confirmed');
 return items.map(function(i){
  var name=[i.family,i.designation].filter(Boolean).join(' · ')||'Material';
  var grade=[i.grade,i.standard].filter(Boolean).join(' / ');
  var qty=i.qty!=null?(S(i.qty)+(i.unit?' '+S(i.unit):'')):(i.tonnes!=null?tonnes(i.tonnes):'');
  return '- '+name+(grade?' | '+grade:'')+(qty?' | '+qty:'');
 }).join('\n');
}
function buyerLanguage(r){return ['DE','AT','CH'].indexOf(S(r&&r.country).toUpperCase())>-1?'de':'en'}
function buyerSubject(r,q){
 var p=queuePayload(q),s=S(p.subject).trim();if(s)return s;
 var project=S(r.project_title||'').trim();
 if(project)return project+(buyerLanguage(r)==='de'?' – Anfrage Materialliste / RFQ | PRISTEEL':' – Steel material RFQ | PRISTEEL');
 return buyerLanguage(r)==='de'?'Zusätzliche Beschaffungsquelle für Stahlmaterial | PRISTEEL':'Additional steel material supply source | PRISTEEL';
}
function buyerBody(r){
 var project=S(r.project_title||'').trim(),de=buyerLanguage(r)==='de';
 if(project&&r.quote_readiness==='M3'){
  var mat=materialText(r);
  if(de)return 'Guten Tag,\n\nim Zusammenhang mit dem Projekt „'+project+'“ möchten wir Ihnen auf Basis der verfügbaren Projektunterlagen ein konkretes Stahl-Lieferangebot unterbreiten.\n\n'+mat+'\n\nGerne stimmen wir die finale Materialliste, Liefertermine und Lieferadresse mit Ihnen ab.\n\nMit freundlichen Grüßen\n\n[Canonical Gmail signature]';
  return 'Dear Sir or Madam,\n\nregarding the project “'+project+'”, we would like to offer the steel material scope based on the available project information.\n\n'+mat+'\n\nWe can coordinate the final material list, delivery dates and DAP delivery address with you.\n\nKind regards,\n\n[Canonical Gmail signature]';
 }
 if(project){
  if(de)return 'Guten Tag,\n\nim Zusammenhang mit dem Projekt „'+project+'“ möchten wir gerne anfragen, ob die Materialbeschaffung für den Stahlbauumfang noch offen ist.\n\nPRISTEEL liefert Baustahl, Profile, Bleche und weitere Stahlprodukte projektbezogen aus unserem Lieferantennetzwerk. Den Transport organisieren wir ebenfalls bis zu Ihrer gewünschten Lieferadresse auf Basis DAP (Incoterms® 2020).\n\nSofern die Materialbeschaffung noch ganz oder teilweise offen ist, senden Sie uns bitte Ihre aktuelle RFQ bzw. Materialliste mit Güten, Abmessungen, Mengen und gewünschten Lieferterminen.\n\nMit freundlichen Grüßen\n\n[Canonical Gmail signature]';
  return 'Dear Sir or Madam,\n\nregarding the project “'+project+'”, we would like to ask whether the steel material procurement is still open.\n\nPRISTEEL supplies structural steel material, sections, plates, tubes and related steel products through our qualified supply network, including transport to your requested delivery address on a DAP basis.\n\nIf procurement is still open in full or in part, please send us your current RFQ or material list including grades, dimensions, quantities and requested delivery dates.\n\nKind regards,\n\n[Canonical Gmail signature]';
 }
 if(de)return 'Guten Tag,\n\nwir möchten uns als zusätzliche Beschaffungsquelle für Stahlmaterial vorstellen. PRISTEEL liefert projektbezogen Baustahl, Profile, Bleche, Rohre/Hohlprofile und weitere Stahlprodukte aus einem qualifizierten Lieferantennetzwerk. Den Transport organisieren wir bis zu Ihrer gewünschten Lieferadresse auf Basis DAP (Incoterms® 2020).\n\nWenn Sie aktuell oder regelmäßig Stahlmaterial zukaufen, senden Sie uns gerne Ihre RFQ bzw. Materialliste mit Güten, Abmessungen, Mengen und gewünschten Lieferterminen. Wir prüfen die Anfrage kurzfristig und unterbreiten Ihnen ein konkretes Lieferangebot.\n\nFalls der Einkauf von einer anderen Person betreut wird, wäre ich Ihnen für eine Weiterleitung dankbar.\n\nMit freundlichen Grüßen\n\n[Canonical Gmail signature]';
 return 'Dear Sir or Madam,\n\nwe would like to introduce PRISTEEL as an additional procurement source for steel material. We supply structural steel, sections, plates, tubes/hollow sections and related steel products through a qualified supply network, including transport to your requested delivery address on a DAP basis.\n\nIf your company currently or regularly purchases steel material, please send us your RFQ or material list with grades, dimensions, quantities and requested delivery dates. We will review it promptly and provide a concrete supply quotation.\n\nIf purchasing is handled by another colleague, I would appreciate it if you could forward this message.\n\nKind regards,\n\n[Canonical Gmail signature]';
}
function gmailCompose(to,subject,body){
 return 'https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(S(to))+'&su='+encodeURIComponent(S(subject))+'&body='+encodeURIComponent(S(body));
}
function gmailThread(q){
 if(!q||!q.gmail_thread_id)return'';
 var st=N(q.status),done=!!q.sent_at||!!q.replied_at||st==='sent'||st==='replied';
 if(!done&&q.gmail_draft_id)return'https://mail.google.com/mail/u/0/#drafts/'+encodeURIComponent(q.gmail_thread_id);
 if(window.PSTEmail&&typeof window.PSTEmail.gmailUrl==='function')return window.PSTEmail.gmailUrl(q.gmail_thread_id);
 return'https://mail.google.com/mail/u/0/#all/'+encodeURIComponent(q.gmail_thread_id);
}
function supplierSubject(r,indicative){
 return (indicative?'Indicative RFQ':'RFQ')+' | '+S(r.project_title||r.company_name||'Steel material');
}
function supplierBody(r,candidate){
 var indicative=r.quote_readiness!=='M3';
 var lang=N(candidate&&candidate.contact_language);
 var mat=materialText(r),project=S(r.project_title||'project');
 if(lang==='de'){
  return 'Guten Tag,\n\nwir prüfen derzeit die Materialbeschaffung für folgendes Projekt:\n'+project+'\n\n'+(indicative?'Die nachstehenden Mengen basieren derzeit auf veröffentlichten Projektunterlagen und sind bis zum Erhalt der finalen BOQ / Materialliste als indikativ zu behandeln.':'Die nachstehenden Positionen basieren auf der verfügbaren Materialliste.')+'\n\n'+mat+'\n\nBitte teilen Sie uns – soweit mit den verfügbaren Angaben möglich – Preisniveau / Einheitspreise, Verfügbarkeit, Lieferzeit, Materialzeugnis EN 10204 3.1, Ursprungsland, Incoterm, Angebotsgültigkeit und Zahlungsbedingungen mit.\n\n'+(indicative?'Die finale Anfrage mit bestätigten Güten, Abmessungen und Mengen folgt nach Erhalt der aktuellen BOQ.':'Bitte kennzeichnen Sie technische Abweichungen eindeutig.')+'\n\nMit freundlichen Grüßen\nArianit Vllahiu\\nHead of Business Development\\n+383 (0) 44 244 699\\narianit.vllahiu@prissteel.com\\nwww.prissteel.com';
 }
 return 'Dear Sir or Madam,\n\nwe are reviewing the steel material procurement for the following project:\n'+project+'\n\n'+(indicative?'The quantities below are currently based on published project information and must be treated as indicative until the final BOQ / material list is received.':'The positions below are based on the available material list.')+'\n\n'+mat+'\n\nPlease provide, where possible with the currently available information, your price level / unit prices, availability, lead time, EN 10204 3.1 certification, country of origin, Incoterm, quotation validity and payment terms.\n\n'+(indicative?'A final RFQ with confirmed grades, dimensions and quantities will follow after receipt of the current BOQ.':'Please identify any technical deviations clearly.')+'\n\nKind regards,\nArianit Vllahiu\\nHead of Business Development\\n+383 (0) 44 244 699\\narianit.vllahiu@prissteel.com\\nwww.prissteel.com';
}
function requirementFor(r){
 var items=materialItems(r),families=[],grades=[],standards=[];
 items.forEach(function(i){if(i.family&&families.indexOf(S(i.family))<0)families.push(S(i.family));if(i.grade&&grades.indexOf(S(i.grade))<0)grades.push(S(i.grade));if(i.standard&&standards.indexOf(S(i.standard))<0)standards.push(S(i.standard));});
 return {family:families[0]||'structural steel',product_type:families[0]||'structural steel',description:S(r.steel_scope||materialText(r)),grades:grades,standards:standards};
}
function supplierCandidates(r){
 var box=state.supplierByTarget[S(r.id)]||{},d=box.data||{},req=A(d.requirements)[0]||{};
 return A(req.candidates);
}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null}catch(e){return null}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow()}catch(e){return sessionNow()}}
async function edgeDraft(payload){
 var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
 var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
 async function run(t){return fetch(base+'/functions/v1/pppp-dach-steel-draft-generator',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload||{})})}
 var r=await run(token);if(r.status===401){s=await refreshSession();if(s&&s.access_token)r=await run(s.access_token)}
 var raw=await r.text(),data=null;try{data=raw?JSON.parse(raw):null}catch(e){}
 if(!r.ok||!data||data.ok===false)throw new Error(S(data&&(data.message||data.error)||('HTTP '+r.status)).slice(0,900));
 return data;
}
function draftKey(kind,id,email){return kind+':'+S(id)+(email?':'+N(email):'')}
async function createBuyerDraft(r){
 var id=S(r&&r.id),k=draftKey('buyer',id);if(!id||state.draftBusy[k])return;
 state.draftBusy[k]=true;state.draftResult[k]=null;renderPage();
 try{
  var data=await edgeDraft({mode:'buyer',target_id:id});state.draftResult[k]=data||{};
  if(data&&data.queue)state.outboundByTarget[id]=data.queue;
  else{state.outboundLoaded=false;await loadOutbound(true)}
 }catch(e){state.draftResult[k]={error:S(e&&e.message||e)}}finally{state.draftBusy[k]=false;renderPage()}
}
async function createSupplierDraft(r,email){
 var id=S(r&&r.id),e=S(email).toLowerCase(),k=draftKey('supplier',id,e);if(!id||!e||state.draftBusy[k])return;
 state.draftBusy[k]=true;state.supplierDrafts[k]=null;renderPage();
 try{state.supplierDrafts[k]=await edgeDraft({mode:'supplier',target_id:id,supplier_email:e})}
 catch(err){state.supplierDrafts[k]={error:S(err&&err.message||err)}}finally{state.draftBusy[k]=false;renderPage()}
}

async function syncLifecycleUi(force){
 if(state.lifecycleSyncing)return state.lifecycleResult;
 if(!force&&state.lifecycleSyncedAt&&Date.now()-state.lifecycleSyncedAt<300000)return state.lifecycleResult;
 state.lifecycleSyncing=true;renderPage();
 try{
  state.lifecycleResult=await edgeDraft({mode:'sync'});
  state.lifecycleSyncedAt=Date.now();
  state.summaryLoaded=false;state.targetsLoaded=false;state.outboundLoaded=false;
  await loadSummary(true);await loadTargets(true);
 }catch(e){state.lifecycleResult={error:S(e&&e.message||e)}}
 finally{state.lifecycleSyncing=false;renderPage()}
 return state.lifecycleResult;
}
function lifecycle(r){
 var q=outboundFor(r),st=N(q&&q.status||r&&r.outreach_status||''),supp=N(q&&q.suppression_reason||'');
 if((q&&q.replied_at)||st==='replied'||N(r&&r.outreach_status)==='replied')return'replied';
 if((q&&q.sent_at)||st==='sent'||N(r&&r.outreach_status)==='sent')return'waiting';
 var stale=st==='stale'||['gmail_draft_missing','gmail_draft_stale','draft_missing','draft_stale'].indexOf(supp)>-1;
 if(q&&q.gmail_draft_id&&q.gmail_thread_id&&!stale&&st!=='suppressed')return'draft';
 return'action';
}

async function loadSupplierCandidates(r){
 var id=S(r&&r.id);if(!id)return;
 var box=state.supplierByTarget[id];if(box&&box.loaded)return box.data;
 state.supplierByTarget[id]={loading:true,loaded:false,error:'',data:null};renderPage();
 try{
  var raw=await edgeDraft({mode:'suppliers',target_id:id});
  var data=raw&&raw.supplier_intelligence?raw.supplier_intelligence:{};
  state.supplierByTarget[id]={loading:false,loaded:true,error:'',data:data};
 }catch(e){
  state.supplierByTarget[id]={loading:false,loaded:true,error:S(e&&e.message||e),data:null};
 }
 renderPage();return state.supplierByTarget[id].data;
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

async function loadOutbound(force){
 if(state.outboundLoading)return state.outboundByTarget;
 if(state.outboundLoaded&&!force)return state.outboundByTarget;
 if(typeof window.supaFetch!=='function')return{};
 var ids=A(state.targets).map(function(r){return S(r.id)}).filter(Boolean);
 if(!ids.length){state.outboundByTarget={};state.outboundLoaded=true;return{}}
 state.outboundLoading=true;
 try{
  var path='pppp_outbound_queue_v1?source=eq.'+encodeURIComponent(SOURCE)+'&source_record_id=in.('+ids.join(',')+')&select=id,source_record_id,recipient_email,recipient_name,contact_role,gmail_draft_id,gmail_draft_message_id,gmail_thread_id,status,suppression_reason,approved_for_send,human_send_required,sent_at,replied_at,bounced_at,payload,updated_at&order=updated_at.desc&limit=250';
  var rows=A(await window.supaFetch(path)),map={};
  rows.forEach(function(q){var k=S(q.source_record_id);if(k&&!map[k])map[k]=q;});
  state.outboundByTarget=map;state.outboundLoaded=true;
 }catch(e){state.outboundByTarget={};state.outboundLoaded=true;}
 state.outboundLoading=false;renderPage();return state.outboundByTarget;
}

async function loadTargets(force){
 if(state.targetsLoading)return state.targets;
 if(state.targetsLoaded&&!force)return state.targets;
 if(typeof window.supaFetch!=='function'){state.error='Databaza nuk është gati.';state.targetsLoaded=true;renderPage();return[]}
 state.targetsLoading=true;state.error='';
 try{
  var path='pppp_dach_steel_targets_v1?select=id,source_key,source_name,source_url,partner_id,project_id,company_name,company_domain,company_website,country,buyer_type,score_band,target_status,why_now,project_title,project_reference,award_date,procurement_timing,quote_readiness,steel_scope,products,estimated_tonnes,material_revision,material_confidence,material_scope,evidence,contact_status,outreach_status,outbound_source_key,next_action,next_action_due,last_verified_at,created_at,updated_at&target_status=not.in.(closed,rejected)&order=updated_at.desc&limit=250';
  state.targets=A(await window.supaFetch(path));state.targetsLoaded=true;state.lastLoadedAt=Date.now();state.outboundLoaded=false;
 }catch(e){state.targets=[];state.error=S(e&&e.message||e);state.targetsLoaded=true}
 state.targetsLoading=false;renderPage();
 if(state.targets.length)loadOutbound(force);
 return state.targets;
}

function ensureHome(){
 css();var home=document.getElementById('pst-home-launchpad-v1'),grid=home&&home.querySelector('.pst-launch-grid');if(!home||!grid)return false;
 var card=document.getElementById('pst-dach-steel-sales-card-v1');
 if(!card){
  card=document.createElement('section');card.id='pst-dach-steel-sales-card-v1';
  card.innerHTML='<button class="pst-dss-home" type="button"><div><div class="pst-dss-eye">BLERËSIT E MATERIALIT TË ÇELIKUT · EU</div><div class="pst-dss-title">Projekt → Material → Ofertë proaktive</div><div class="pst-dss-sub">Gjej konsumatorë direkt të çelikut në gjithë EU-në; kompanitë e ndërtimit / GC-GU hyjnë si zgjedhje e dytë kur ka evidencë për procurement të çelikut.</div><span class="pst-dss-chip">EU · MATERIAL ÇELIKU · DAP · PA TED</span></div><div class="pst-dss-stats" data-dss-stats></div><span class="pst-dss-cta">Hap Material Trade EU →</span></button><div class="pst-dss-current" data-dss-current></div>';
  grid.parentNode.insertBefore(card,grid);card.querySelector('button').onclick=open;
 }
 renderHome();loadSummary(false);return true;
}

function renderHome(){
 var stats=document.querySelector('#pst-dach-steel-sales-card-v1 [data-dss-stats]'),cur=document.querySelector('#pst-dach-steel-sales-card-v1 [data-dss-current]');if(!stats||!cur)return;
 var x=summary()||{},p=[[x.targets||0,'Objektiva'],[x.a1_targets||0,'A1'],[x.quote_ready||0,'Gati për ofertë'],[x.needs_contact||0,'Kërkon kontakt'],[x.ready_for_outreach||0,'Gati për kontaktim'],[x.replies||0,'Përgjigje']];
 stats.innerHTML=p.map(function(v){return '<span class="pst-dss-stat"><b>'+E(v[0])+'</b><span>'+E(v[1])+'</span></span>'}).join('');
 if(state.error){cur.innerHTML='<span><b>Status:</b> kanali nuk u lexua · '+E(state.error)+'</span>';return}
 if(!(x.targets||0)){cur.innerHTML='<span><b>Status:</b> ende 0 objektiva të kualifikuara.</span><span><b>Hapi tjetër:</b> zbulim → kualifikim → blerësi + furnizimi.</span>';return}
 var hot=x.hot_company_name?'<span><b>Objektivi kryesor:</b> '+E(x.hot_company_name)+(x.hot_project_title?' · '+E(x.hot_project_title):'')+'</span>':'';
 cur.innerHTML='<span><b>Çelik i identifikuar:</b> '+E(tonnes(x.identified_tonnes))+'</span>'+hot;
}

function ensurePage(){
 css();var page=document.getElementById('page-dach-steel-sales');if(page)return page;
 var host=document.querySelector('.content')||document.body;page=document.createElement('div');page.id='page-dach-steel-sales';page.className='page';page.style.display='none';
 page.innerHTML='<div class="pst-dss-page"><header class="pst-dss-head"><div><small>PRISTEEL · MATERIAL TRADE · EU</small><h1>Blerësit e materialit të çelikut · EU</h1><p>Shitje materiali çeliku në EU: Tier 1 janë konsumatorët direkt; Tier 2 kompanitë e ndërtimit / GC-GU me relevancë reale për procurement. Ky kanal nuk përdor TED/Mundësitë.</p></div><div class="pst-dss-actions"><button data-dss-refresh>Rifresko</button><button data-dss-back>← Ballina</button></div></header><div class="pst-dss-engine-note"><b>Rregulli:</b> targeti nis te “Për t’u kontaktuar”. Sapo krijohet Gmail draft kalon te “Draft gati”; vetëm Gmail Sent e kalon te “Në pritje të përgjigjes”, ndërsa reply te “Përgjigje / Aktiv”. Drafti nuk konsiderohet dërgim. TED/Mundësitë mbeten të ndara.</div><div class="pst-dss-kpi-strip" data-dss-kpis></div><div class="pst-dss-tabs"><button class="pst-dss-tab on" data-dss-filter="action">Për t’u kontaktuar</button><button class="pst-dss-tab" data-dss-filter="draft">Draft gati</button><button class="pst-dss-tab" data-dss-filter="waiting">Në pritje të përgjigjes</button><button class="pst-dss-tab" data-dss-filter="replied">Përgjigje / Aktiv</button><button class="pst-dss-tab" data-dss-filter="a1">A1</button><button class="pst-dss-tab" data-dss-filter="m3">M3 · Gati për ofertë</button><button class="pst-dss-tab" data-dss-filter="contact">Kërkon kontakt</button><button class="pst-dss-tab" data-dss-filter="all">Të gjitha</button></div><section class="pst-dss-panel"><div class="pst-dss-panel-head"><b>Qendra e blerësit dhe materialit</b><span data-dss-updated></span></div><div class="pst-dss-headrow"><span>Prioriteti</span><span>Blerësi / projekti</span><span>Pse tani?</span><span>Materiali</span><span>Kontakti</span><span class="pst-dss-col-timing">Koha</span><span class="pst-dss-col-action">Hapi i radhës</span></div><div data-dss-list></div></section></div>'
 host.appendChild(page);
 page.onclick=async function(e){
  var f=e.target.closest('[data-dss-filter]');if(f){state.filter=f.getAttribute('data-dss-filter');state.expanded=null;state.actionView=null;renderPage();return}
  if(e.target.closest('[data-dss-refresh]')){await syncLifecycleUi(true);return}
  if(e.target.closest('[data-dss-back]')){back();return}
  var btn=e.target.closest('[data-dss-action]');
  if(btn){
   e.preventDefault();e.stopPropagation();
   var id=btn.getAttribute('data-dss-tid'),r=findTarget(id),q=outboundFor(r),act=btn.getAttribute('data-dss-action');if(!r)return;
   if(act==='buyer-preview'){state.actionView={id:id,type:'buyer'};renderPage();return}
   if(act==='contact-resolve'){await resolveContact(r);return}
   if(act==='buyer-create-draft'){await createBuyerDraft(r);return}
   if(act==='buyer-thread'){
    var gu=gmailThread(q);if(gu)window.open(gu,'_blank','noopener');else alert('Nuk ka Gmail draft të regjistruar për këtë target.');return;
   }
   if(act==='buyer-copy'){navigator.clipboard&&navigator.clipboard.writeText(buyerBody(r));return}
   if(act==='supplier-preview'){state.actionView={id:id,type:'supplier'};if(!(state.supplierByTarget[id]||{}).loaded)loadSupplierCandidates(r);else renderPage();return}
   if(act==='find-suppliers'){state.actionView={id:id,type:'supplier'};loadSupplierCandidates(r);return}
   if(act==='supplier-create-draft'){await createSupplierDraft(r,btn.getAttribute('data-email')||'');return}
   if(act==='supplier-open-draft'){var sk=draftKey('supplier',id,btn.getAttribute('data-email')||''),sd=state.supplierDrafts[sk];if(sd&&sd.gmail_url)window.open(sd.gmail_url,'_blank','noopener');return}
   if(act==='supplier-copy'){navigator.clipboard&&navigator.clipboard.writeText(supplierBody(r,{}));return}
  }
  if(e.target.closest('a,button'))return;
  var row=e.target.closest('[data-dss-target-id]');if(row){var rid=row.getAttribute('data-dss-target-id');state.expanded=state.expanded===rid?null:rid;state.actionView=null;renderPage()}
 };
 return page;
}

function filteredRows(){
 var rows=A(state.targets),actionable=rows.filter(function(r){return lifecycle(r)==='action'});
 if(state.filter==='action')return actionable;
 if(state.filter==='draft')return rows.filter(function(r){return lifecycle(r)==='draft'});
 if(state.filter==='waiting')return rows.filter(function(r){return lifecycle(r)==='waiting'});
 if(state.filter==='replied')return rows.filter(function(r){return lifecycle(r)==='replied'});
 if(state.filter==='a1')return actionable.filter(function(r){return r.score_band==='A1'});
 if(state.filter==='m3')return actionable.filter(function(r){return r.quote_readiness==='M3'});
 if(state.filter==='material')return actionable.filter(function(r){return r.quote_readiness==='M0'||r.quote_readiness==='M1'});
 if(state.filter==='contact')return actionable.filter(function(r){return !hasContact(r)});
 if(state.filter==='outreach')return actionable.filter(function(r){return r.outreach_status==='ready'||!!outboundFor(r)});
 return rows;
}
function materialLines(r){
 var items=materialItems(r);
 if(!items.length)return '<div class="pst-dss-empty" style="padding:16px 10px"><b>Ende nuk ka BOM me pozicione</b><span>'+E(qrHelp(r.quote_readiness))+'</span></div>';
 var head='<div class="pst-dss-material-line head"><span>Materiali</span><span>Klasa / standardi</span><span>Dimensioni</span><span>Sasia</span><span>Ton</span></div>';
 return '<div class="pst-dss-material-table">'+head+items.slice(0,80).map(function(i){
  var mat=[i.family,i.designation].filter(Boolean).join(' · ')||'Material',grade=[i.grade,i.standard].filter(Boolean).join(' / ')||'—',dim=i.dimensions||i.dimension||((i.length_m!=null)?('L '+i.length_m+' m'):'—'),q=i.qty!=null?(S(i.qty)+(i.unit?' '+S(i.unit):'')):'—';
  return '<div class="pst-dss-material-line"><b>'+E(mat)+'</b><span>'+E(grade)+'</span><span>'+E(dim)+'</span><span>'+E(q)+'</span><span>'+E(tonnes(i.tonnes))+'</span></div>';
 }).join('')+'</div>';
}

function buyerAction(r){
 var q=outboundFor(r),ct=contactFor(r),to=q&&q.recipient_email||ct.email||'',status=q?S(q.status||'registered'):'not registered',st=N(status),life=lifecycle(r),sentAt=q&&q.sent_at||'',replyAt=q&&q.replied_at||'',supp=q&&S(q.suppression_reason).trim(),recoverable=['gmail_draft_missing','gmail_draft_stale','draft_missing','draft_stale'].indexOf(supp)>-1,blocked=(!!supp&&!recoverable)||st==='suppressed',stale=st==='stale'||recoverable,human=!q||q.human_send_required!==false;
 var preview=state.actionView&&state.actionView.id===S(r.id)&&state.actionView.type==='buyer',k=draftKey('buyer',r.id),busy=!!state.draftBusy[k],result=state.draftResult[k]||null,primary='',secondary='';
 if(life==='replied')primary=q&&q.gmail_thread_id?'<button class="pst-dss-btn primary" data-dss-action="buyer-thread" data-dss-tid="'+E(r.id)+'">Hap përgjigjen në Gmail</button>':'';
 else if(life==='waiting')primary=q&&q.gmail_thread_id?'<button class="pst-dss-btn primary" data-dss-action="buyer-thread" data-dss-tid="'+E(r.id)+'">Hap thread-in në Gmail</button>':'';\n else if(life==='draft')primary=q&&q.gmail_thread_id?'<button class="pst-dss-btn primary" data-dss-action="buyer-thread" data-dss-tid="'+E(r.id)+'">Hap Gmail draft</button>':'';
 else if(blocked)primary='<button class="pst-dss-btn" disabled>Outbound i bllokuar</button>';
 else if(q&&q.gmail_draft_id&&q.gmail_thread_id&&!stale)primary='<button class="pst-dss-btn primary" data-dss-action="buyer-thread" data-dss-tid="'+E(r.id)+'">Hap Gmail draft</button>';
 else if(to)primary='<button class="pst-dss-btn primary" '+(busy?'disabled':'')+' data-dss-action="buyer-create-draft" data-dss-tid="'+E(r.id)+'">'+(busy?'Duke kontrolluar Gmail…':(stale?'Rigjenero Gmail draft':'Krijo Gmail draft'))+'</button>';
 else primary='<button class="pst-dss-btn" disabled>Duhet kontakt</button>';
 if(life==='action')secondary='<button class="pst-dss-btn" data-dss-action="buyer-preview" data-dss-tid="'+E(r.id)+'">Shiko tekstin</button>'+(to?'<button class="pst-dss-btn" data-dss-action="contact-resolve" data-dss-tid="'+E(r.id)+'">Verifiko kontaktin</button>':'');
 var guard=life==='replied'?('Përgjigje e marrë'+(replyAt?' më '+D(replyAt):'')+'. Mos dërgo cold outreach tjetër; rishiko thread-in dhe klasifiko RFQ/BOQ.'):\n   life==='waiting'?('Emaili është dërguar'+(sentAt?' më '+D(sentAt):'')+'. Targeti është në pritje dhe një outreach i ri bllokohet nga cooldown-i.'):\n   life==='draft'?'Gmail draft ekziston, por emaili nuk konsiderohet i dërguar derisa Gmail Sent ta konfirmojë.':
   blocked?('Preflight: '+S(supp||'suppressed')+'. Ky guard duhet zgjidhur para outreach.'):
   stale?'Drafti i vjetër mungon/stale. Para rigjenerimit PPPP kontrollon Gmail Sent për të parandaluar dublikatat.':
   human?'Para krijimit të draftit PPPP kontrollon Gmail Sent + shared cooldown; dërgimi mbetet human-approved.':'Asnjë dërgim automatik nga kjo faqe.';
 var resultHtml=result&&result.error?'<div class="pst-dss-inline-status" style="background:#fff1ef;color:#8b4a41">Drafti nuk u krijua: '+E(result.error)+'</div>':(result&&result.created?'<div class="pst-dss-inline-status">✓ Gmail draft u krijua dhe u lidh me PPPP.</div>':'');
 return '<div class="pst-dss-action-card"><h4>📩 Blerësi · '+(life==='replied'?'përgjigje e marrë':life==='waiting'?'në pritje të RFQ / BOQ':life==='draft'?'draft gati':'kërko RFQ / BOQ')+'</h4><p>'+(life==='action'?'Kërko RFQ/material listën aktuale dhe konfirmo nevojën për furnizim materiali.':life==='draft'?'Drafti është gati në Gmail dhe pret rishikimin/dërgimin nga përdoruesi.':life==='waiting'?'Emaili u dërgua. Tani monitorojmë reply/RFQ pa e kontaktuar sërish gjatë cooldown-it.':'Ka ardhur përgjigje. Hape thread-in dhe verifiko nëse kemi RFQ, BOQ, drawings ose kërkesë tjetër.')+'</p><div class="pst-dss-action-status">'+(to?'<b>'+E(to)+'</b> · ':'')+E(q?'PPPP outbound: '+status:(ct.role||ct.person||ct.quality||contactLabel(r.contact_status)))+'</div><div class="pst-dss-action-buttons">'+primary+secondary+'</div><div class="pst-dss-guard">'+E(guard)+'</div>'+resultHtml+(preview?'<div class="pst-dss-previewbox"><b>'+E(buyerSubject(r,q))+'</b><pre>'+E(buyerBody(r))+'</pre><div class="pst-dss-action-buttons" style="margin-top:9px"><button class="pst-dss-btn" data-dss-action="buyer-copy" data-dss-tid="'+E(r.id)+'">Kopjo tekstin</button></div></div>':'')+'</div>';
}
function supplierAction(r){
 var indicative=r.quote_readiness!=='M3',box=state.supplierByTarget[S(r.id)]||{},preview=state.actionView&&state.actionView.id===S(r.id)&&state.actionView.type==='supplier';
 var label=r.quote_readiness==='M3'?'RFQ finale':'RFQ indikative',candidates=supplierCandidates(r),candHtml='';
 if(box.loading)candHtml='<div class="pst-dss-previewbox"><b>Duke kontrolluar inteligjencën e furnitorëve…</b></div>';
 else if(box.error)candHtml='<div class="pst-dss-previewbox"><b>Inteligjenca e furnitorëve nuk u lexua</b><pre>'+E(box.error)+'</pre></div>';
 else if(box.loaded){
  candHtml='<div class="pst-dss-candidates">'+(candidates.length?candidates.map(function(c){
   var fit=c.strict_fit?'Përputhje e plotë':'Për t’u verifikuar',cl=c.strict_fit?'pst-dss-fit':'pst-dss-fit review',email=S(c.email||''),dk=draftKey('supplier',r.id,email),busy=!!state.draftBusy[dk],dr=state.supplierDrafts[dk]||null,action='';
   if(dr&&dr.gmail_url)action='<button class="pst-dss-btn success" data-dss-action="supplier-open-draft" data-dss-tid="'+E(r.id)+'" data-email="'+E(email)+'">✓ Hap Gmail draft</button>';
   else if(email)action='<button class="pst-dss-btn" '+(busy?'disabled':'')+' data-dss-action="supplier-create-draft" data-dss-tid="'+E(r.id)+'" data-email="'+E(email)+'">'+(busy?'Duke krijuar…':'Krijo RFQ draft')+'</button>';
   else action='<span></span>';
   return '<div class="pst-dss-candidate"><div><b>'+E(c.name||'Furnitor')+'</b><small>'+E([c.country,email,'pikë '+S(c.match_score||0)].filter(Boolean).join(' · '))+(dr&&dr.error?'<br><span style="color:#9a4d43">Gabim në draft: '+E(dr.error)+'</span>':'')+'</small></div><span class="'+cl+'">'+E(fit)+'</span>'+action+'</div>';
  }).join(''):'<div class="pst-dss-empty" style="padding:14px"><b>Nuk u gjet kandidat i gatshëm</b><span>Nevojitet kërkim i furnitorëve ose më shumë specifika.</span></div>')+'</div>';
 }
 return '<div class="pst-dss-action-card"><h4>🏭 Furnizimi · '+E(label)+'</h4><p>'+(indicative?'M2/M1: kërkesë indikative për furnizim. Sasitë dhe specifikat duhet të konfirmohen para ofertës finale.':'M3: kemi bazë BOQ / listë materiali dhe mund të përgatitet RFQ e plotë.')+'</p><div class="pst-dss-action-status"><b>'+E(tonnes(r.estimated_tonnes))+'</b> · '+E(qrLabel(r.quote_readiness))+'</div><div class="pst-dss-action-buttons"><button class="pst-dss-btn primary" data-dss-action="find-suppliers" data-dss-tid="'+E(r.id)+'">'+(box.loaded?'Rifresko furnitorët':'Gjej furnitorë')+'</button><button class="pst-dss-btn" data-dss-action="supplier-preview" data-dss-tid="'+E(r.id)+'">Shiko RFQ</button></div><div class="pst-dss-guard">PPPP propozon kandidatë; ti zgjedh furnitorin. Vetëm pasi klikon “Krijo RFQ draft”, krijohet draft real në Gmail. Asgjë nuk dërgohet automatikisht.</div>'+(preview?'<div class="pst-dss-previewbox"><b>'+E(supplierSubject(r,indicative))+'</b><pre>'+E(supplierBody(r,{}))+'</pre></div>':'')+candHtml+'</div>';
}
function detail(r){
 var ev=A(J(r.evidence,[])),scope=J(r.material_scope,{}),conf=r.material_confidence!=null?Math.round(num(r.material_confidence)*100)+'%':'—',safeSource=U(r.source_url),source=safeSource?'<a class="pst-dss-source" href="'+E(safeSource)+'" target="_blank" rel="noopener">Hap burimin ↗</a>':'',evidence=ev.length?'<div class="pst-dss-evidence">'+ev.slice(0,10).map(function(x){var label=typeof x==='string'?x:(x.label||x.title||x.source||x.url||'Evidence');return '<span>'+E(label)+'</span>'}).join('')+'</div>':'';
 return '<div class="pst-dss-detail"><div class="pst-dss-summary"><section class="pst-dss-summary-card"><h3>Mundësia</h3><div class="pst-dss-summary-title">'+E(r.company_name||'Blerës')+'</div><div class="pst-dss-summary-sub">'+E(r.project_title||'')+'</div><div class="pst-dss-keyfacts"><span>'+E(r.score_band||'—')+'</span><span>'+E(r.country||'—')+'</span><span>'+E(r.procurement_timing||'Koha e panjohur')+'</span><span>Award '+E(D(r.award_date))+'</span></div></section><section class="pst-dss-summary-card"><h3>Materiali i synuar</h3><div class="pst-dss-summary-title">'+E(tonnes(r.estimated_tonnes))+' · '+E(qrLabel(r.quote_readiness))+'</div><div class="pst-dss-summary-sub">'+E(r.steel_scope||qrHelp(r.quote_readiness))+'</div></section></div><section class="pst-dss-action-center"><header><b>Çfarë bëjmë tani?</b><span>Blerësi + furnizimi</span></header><div class="pst-dss-action-grid">'+buyerAction(r)+supplierAction(r)+'</div></section><details class="pst-dss-details"><summary>Evidenca dhe detajet teknike</summary><div class="pst-dss-detail-grid"><section class="pst-dss-detail-card"><h3>Projekti dhe kualifikimi</h3><div class="pst-dss-meta"><span>Kompania</span><span>'+E(r.company_name)+'</span><span>Vendi</span><span>'+E(r.country||'—')+'</span><span>Lloji i blerësit</span><span>'+E(r.buyer_type||'—')+'</span><span>Referenca</span><span>'+E(r.project_reference||'—')+'</span><span>Revizioni i materialit</span><span>'+E(r.material_revision||scope.revision||'—')+'</span><span>Besueshmëria</span><span>'+E(conf)+'</span><span>Verifikimi i fundit</span><span>'+E(D(r.last_verified_at))+'</span></div>'+source+evidence+'</section><section class="pst-dss-detail-card"><h3>Inteligjenca e materialit</h3>'+materialLines(r)+'</section></div></details></div>';
}

function renderPage(){
 var page=document.getElementById('page-dach-steel-sales');if(!page)return;
 var sx=summary()||{},lx=localSummary(),all=A(state.targets),draft=all.filter(function(r){return lifecycle(r)==='draft'}).length,waiting=all.filter(function(r){return lifecycle(r)==='waiting'}).length,replied=all.filter(function(r){return lifecycle(r)==='replied'}).length,action=all.filter(function(r){return lifecycle(r)==='action'}).length,k=page.querySelector('[data-dss-kpis]'),list=page.querySelector('[data-dss-list]'),u=page.querySelector('[data-dss-updated]');
 if(k)k.innerHTML=[[action,'Për t’u kontaktuar'],[draft,'Draft gati'],[waiting,'Në pritje'],[replied,'Përgjigje / Aktiv'],[sx.needs_contact!=null?sx.needs_contact:lx.needs_contact,'Kërkon kontakt'],[lx.quote_ready,'M3 · Gati për ofertë']].map(function(v){return '<div class="pst-dss-kpi"><b>'+E(v[0])+'</b><span>'+E(v[1])+'</span></div>'}).join('');
 page.querySelectorAll('[data-dss-filter]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-dss-filter')===state.filter)});
 if(u)u.textContent=state.lifecycleSyncing?'Duke sinkronizuar Gmail…':(state.lastLoadedAt?'Përditësuar '+new Date(state.lastLoadedAt).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'}):'');
 if(!list)return;
 if(state.targetsLoading){list.innerHTML='<div class="pst-dss-empty"><b>Duke lexuar objektivat e kualifikuara…</b><span>Një lexim i kufizuar; pa zhurmë nga zbulimi.</span></div>';return}
 if(state.error&&state.targetsLoaded){list.innerHTML='<div class="pst-dss-empty"><b>Qendra e blerësve të çelikut nuk u lexua</b><span>'+E(state.error)+'</span></div>';return}
 var rows=filteredRows();
 if(!rows.length){
  var title=state.filter==='action'?'Nuk ka targete të reja për kontaktim.':state.filter==='draft'?'Nuk ka Gmail draft-e gati.':state.filter==='waiting'?'Nuk ka targete në pritje përgjigjeje.':state.filter==='replied'?'Nuk ka përgjigje aktive.':state.filter==='all'?'Ende nuk ka objektiva të kualifikuara për Material Trade.':'Nuk ka targete në këtë filtër.';
  list.innerHTML='<div class="pst-dss-empty"><b>'+E(title)+'</b><span>Rrjedha: zbulim → për t’u kontaktuar → draft gati → sent → në pritje → përgjigje/aktiv.</span></div>';return;
 }
 list.innerHTML=rows.map(function(r){
  var prods=arrText(r.products).slice(0,4).join(' · ')||r.steel_scope||'Fusha e materialit në pritje',q=outboundFor(r),life=lifecycle(r),ct=contactFor(r),email=S(ct.email||'');
  var next=life==='replied'?'Përgjigje / Aktiv':life==='waiting'?'Në pritje':life==='draft'?'Hap draftin':(email?'Kërko RFQ':'Gjej kontakt');
  var contactHtml=email?'<div class="pst-dss-contact"><b><a href="mailto:'+E(email)+'">'+E(email)+'</a></b><small>'+E([ct.person,ct.role].filter(Boolean).join(' · ')||ct.quality||'Kontakt i gjetur')+'</small></div>':'<span class="pst-dss-contact-missing">Kontakt i pagjetur</span>';
  var row='<div class="pst-dss-row" data-dss-target-id="'+E(r.id)+'"><span class="pst-dss-score '+scoreClass(r.score_band)+'">'+E(r.score_band||'—')+'</span><div><b>'+E(r.company_name||'Blerës')+'</b><small>'+E([r.country,buyerTierLabel(r),r.project_title||r.buyer_type].filter(Boolean).join(' · '))+'</small></div><div class="pst-dss-col-why"><div class="pst-dss-why">'+E(r.why_now||'Evidenca për arsyen e kontaktimit është në pritje')+'</div></div><div><span class="pst-dss-qr '+qrClass(r.quote_readiness)+'">'+E(qrLabel(r.quote_readiness))+'</span><div class="pst-dss-products">'+E(prods)+'</div><div class="pst-dss-ton">'+E(tonnes(r.estimated_tonnes))+'</div></div><div>'+contactHtml+'</div><div class="pst-dss-col-timing"><b>'+E(life==='draft'?'DRAFT GATI':life==='waiting'?'NË PRITJE TË BLERËSIT':life==='replied'?'BLERËSI U PËRGJIGJ':r.procurement_timing||'E panjohur')+'</b><small>'+E(life==='draft'&&q&&q.updated_at?'Draft '+D(q.updated_at):life==='waiting'&&q&&q.sent_at?'Sent '+D(q.sent_at):life==='replied'&&q&&q.replied_at?'Reply '+D(q.replied_at):r.award_date?'Award '+D(r.award_date):'Timing evidence needed')+'</small></div><div class="pst-dss-col-action"><button class="pst-dss-nextbtn" type="button" data-dss-tid="'+E(r.id)+'" data-dss-open-actions="1">'+E(next)+' →</button></div></div>';
  return row+(state.expanded===S(r.id)?detail(r):'');
 }).join('');
 list.querySelectorAll('[data-dss-open-actions]').forEach(function(b){b.onclick=function(e){e.preventDefault();e.stopPropagation();var id=b.getAttribute('data-dss-tid');state.expanded=id;state.actionView=null;renderPage();setTimeout(function(){var d=document.querySelector('.pst-dss-detail');if(d)try{d.scrollIntoView({behavior:'smooth',block:'nearest'})}catch(err){}},0);};});
}
function back(){
 chrome(false);
 try{var n=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV1;if(n&&typeof n.openHome==='function'){n.openHome();return}}catch(e){}
 try{if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo('home');return}}catch(e){}
}
function open(){
 var page=ensurePage();chrome(true);document.querySelectorAll('.page').forEach(function(p){if(p!==page){p.classList.remove('active');p.style.display='none'}});
 page.style.display='block';page.classList.add('active');renderPage();syncLifecycleUi(false);try{window.scrollTo(0,0)}catch(e){}
}
function boot(){css();ensurePage();ensureHome()}

document.addEventListener('pst:native-home-ready',function(){chrome(false);setTimeout(ensureHome,0)});
document.addEventListener('pst:home-canonical-rendered',function(){chrome(false);setTimeout(ensureHome,0)});
document.addEventListener('pst:modules-ready',function(){setTimeout(boot,0)},{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0)},{once:true});else setTimeout(boot,0);

window.PSTDachSteelSalesV1=window.PSTDachSteelSalesV2=window.PSTDachSteelSalesV3={
 source:SOURCE,open:open,
 refresh:function(){return syncLifecycleUi(true)},
 snapshot:function(){return{source:SOURCE,summary:summary(),targets:A(state.targets).slice(),outboundByTarget:Object.assign({},state.outboundByTarget),contactByTarget:Object.assign({},state.contactByTarget),filter:state.filter,error:state.error}}
};
})();