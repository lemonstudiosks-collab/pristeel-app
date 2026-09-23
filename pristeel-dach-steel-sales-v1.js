/* PRISTEEL DACH Steel Buyers v3
 * Buyer Target + Material Intelligence Desk for direct steel supply in DE/AT/CH.
 * Operational buyer-to-supply workflow over qualified targets in pppp_dach_steel_targets_v1.
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
 summary:null,targets:[],outboundByTarget:{},supplierByTarget:{},
 summaryLoaded:false,targetsLoaded:false,outboundLoaded:false,
 summaryLoading:false,targetsLoading:false,outboundLoading:false,
 error:'',filter:'all',expanded:null,actionView:null,lastLoadedAt:0
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
'.pst-dss-headrow,.pst-dss-row{display:grid;grid-template-columns:56px minmax(220px,1.15fr) minmax(250px,1.35fr) minmax(230px,1.1fr) 145px 150px;gap:12px;align-items:center;padding:10px 13px}.pst-dss-headrow{background:#fafbf9;border-bottom:1px solid #e9edeb;color:#8a9498;font-size:8px;font-weight:850;text-transform:uppercase;letter-spacing:.05em}.pst-dss-row{border-bottom:1px solid #eef0ee;cursor:pointer}.pst-dss-row:hover{background:#fbfcfb}.pst-dss-row b{display:block;font-size:12px;color:#344950}.pst-dss-row small{display:block;margin-top:3px;font-size:9px;line-height:1.35;color:#899498;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.pst-dss-score{width:38px;height:28px;display:grid;place-items:center;border-radius:8px;font-size:10px;font-weight:900}.pst-dss-score.a1{background:#e9f2e8;color:#3f6f43}.pst-dss-score.a2{background:#eef3e7;color:#65713c}.pst-dss-score.b1{background:#edf3f5;color:#4f7180}.pst-dss-score.b2{background:#f3f0e9;color:#75664a}.pst-dss-score.c{background:#f3f1f1;color:#777}',
'.pst-dss-qr{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:8.5px;font-weight:850}.pst-dss-qr.m3{background:#e4f2e7;color:#2f7043}.pst-dss-qr.m2{background:#e7f0f4;color:#3d7083}.pst-dss-qr.m1{background:#f4f0e6;color:#7a6740}.pst-dss-qr.m0{background:#f2f1f0;color:#777}.pst-dss-products{margin-top:4px;font-size:9px;color:#77858a}.pst-dss-ton{margin-top:3px;font-size:10px;font-weight:820;color:#415d67}.pst-dss-why{font-size:10.5px;line-height:1.42;color:#4e6067;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
'.pst-dss-nextbtn{border:1px solid #93c3d1;border-radius:8px;background:#f4fbfd;color:#2e748b;padding:7px 9px;font-size:9px;font-weight:850;cursor:pointer;white-space:nowrap}.pst-dss-nextbtn:hover{background:#e8f5f8}',
'.pst-dss-detail{border-bottom:1px solid #e4ebe8;background:#f8fbfa;padding:14px 15px}.pst-dss-summary{display:grid;grid-template-columns:1.15fr .85fr;gap:12px;margin-bottom:12px}.pst-dss-summary-card{border:1px solid #e1e8e6;border-radius:11px;background:#fff;padding:13px 14px}.pst-dss-summary-card h3{margin:0 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#728287}.pst-dss-summary-title{font-size:15px;font-weight:800;color:#30474f}.pst-dss-summary-sub{margin-top:4px;font-size:10.5px;line-height:1.45;color:#64777e}.pst-dss-keyfacts{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.pst-dss-keyfacts span{padding:5px 7px;border-radius:7px;background:#f1f5f4;font-size:9px;color:#61747b}',
'.pst-dss-action-center{border:1px solid #cfe0e4;border-radius:12px;background:#fff;padding:13px;margin-bottom:12px}.pst-dss-action-center>header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.pst-dss-action-center>header b{font-size:12px;color:#315d6c}.pst-dss-action-center>header span{font-size:9px;color:#819096}.pst-dss-action-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pst-dss-action-card{border:1px solid #e3e9e7;border-radius:10px;background:#fbfcfb;padding:12px}.pst-dss-action-card h4{margin:0 0 4px;font-size:11px;color:#344b53}.pst-dss-action-card p{margin:0 0 8px;font-size:9.5px;line-height:1.45;color:#728187}.pst-dss-action-status{font-size:9px;color:#596f78;margin:7px 0}.pst-dss-action-buttons{display:flex;gap:6px;flex-wrap:wrap}.pst-dss-btn{border:1px solid #c9dfe5;border-radius:8px;background:#fff;color:#35768c;padding:7px 9px;font-size:9px;font-weight:820;cursor:pointer}.pst-dss-btn.primary{background:#4b93aa;border-color:#4b93aa;color:#fff}.pst-dss-btn:disabled{opacity:.48;cursor:not-allowed}.pst-dss-guard{margin-top:7px;font-size:8.5px;color:#8a9599}',
'.pst-dss-previewbox{margin-top:9px;border:1px solid #dfe7e5;border-radius:9px;background:#fff;padding:10px}.pst-dss-previewbox b{display:block;font-size:9px;color:#4b636c;margin-bottom:5px}.pst-dss-previewbox pre{white-space:pre-wrap;margin:0;max-height:310px;overflow:auto;font:10px/1.5 Inter,Arial,sans-serif;color:#455a62}',
'.pst-dss-candidates{margin-top:9px;display:grid;gap:6px}.pst-dss-candidate{display:grid;grid-template-columns:minmax(160px,1fr) auto auto;gap:8px;align-items:center;border:1px solid #e5eae8;border-radius:8px;background:#fff;padding:8px 9px}.pst-dss-candidate b{font-size:10px}.pst-dss-candidate small{display:block;margin-top:2px;font-size:8.5px;color:#879298}.pst-dss-fit{padding:4px 6px;border-radius:999px;background:#eef5ef;color:#527454;font-size:8px;font-weight:800}.pst-dss-fit.review{background:#f5f1e7;color:#80683d}',
'.pst-dss-details{border:1px solid #e3e9e7;border-radius:10px;background:#fff;overflow:hidden}.pst-dss-details summary{cursor:pointer;padding:10px 12px;font-size:10px;font-weight:800;color:#566c74;background:#fafbf9}.pst-dss-detail-grid{display:grid;grid-template-columns:minmax(250px,.8fr) minmax(0,1.7fr);gap:12px;padding:12px}.pst-dss-detail-card{border:1px solid #e2e8e6;border-radius:10px;background:#fff;padding:12px}.pst-dss-detail-card h3{margin:0 0 9px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#728287}.pst-dss-meta{display:grid;grid-template-columns:120px 1fr;gap:6px 10px;font-size:10px}.pst-dss-meta span:nth-child(odd){color:#8a9599}.pst-dss-meta span:nth-child(even){color:#42575e;font-weight:650}.pst-dss-source{display:inline-flex;margin-top:10px;color:#39788d;font-size:9px;font-weight:800;text-decoration:none}',
'.pst-dss-material-table{display:grid;border:1px solid #e5e9e7;border-radius:9px;overflow:hidden}.pst-dss-material-line{display:grid;grid-template-columns:minmax(150px,1fr) minmax(105px,.7fr) minmax(110px,.75fr) 85px 85px;gap:8px;padding:9px 10px;border-bottom:1px solid #eef0ee;font-size:9.5px}.pst-dss-material-line:last-child{border-bottom:0}.pst-dss-material-line.head{background:#f7f9f8;font-size:8px;font-weight:850;text-transform:uppercase;color:#889398}.pst-dss-material-line b{font-size:10px;color:#43575e}.pst-dss-evidence{margin-top:9px;display:flex;gap:5px;flex-wrap:wrap}.pst-dss-evidence span{padding:4px 6px;border-radius:7px;background:#f0f3f2;color:#718085;font-size:8px}',
'.pst-dss-empty{padding:38px 22px;text-align:center;color:#7e888c}.pst-dss-empty b{display:block;font-size:14px;color:#3a4c52}.pst-dss-empty span{display:block;margin:6px auto 0;max-width:650px;font-size:10px;line-height:1.55}',
'@media(max-width:1180px){.pst-dss-home{grid-template-columns:1fr}.pst-dss-stats{max-width:820px}.pst-dss-headrow,.pst-dss-row{grid-template-columns:52px 1.1fr 1.2fr 1fr 135px}.pst-dss-col-action{display:none}.pst-dss-summary,.pst-dss-action-grid{grid-template-columns:1fr}}',
'@media(max-width:760px){.pst-dss-home{padding:17px}.pst-dss-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.pst-dss-page{padding:5px 0 32px}.pst-dss-head{flex-direction:column}.pst-dss-kpi-strip{display:grid;grid-template-columns:repeat(2,1fr)}.pst-dss-kpi{border-bottom:1px solid #edf0ee}.pst-dss-headrow{display:none}.pst-dss-row{grid-template-columns:46px 1fr 118px}.pst-dss-col-why,.pst-dss-col-timing,.pst-dss-col-action{display:none}.pst-dss-detail-grid{grid-template-columns:1fr}.pst-dss-material-line{grid-template-columns:1fr 70px 70px}.pst-dss-material-line>*:nth-child(2),.pst-dss-material-line>*:nth-child(3){display:none}.pst-dss-candidate{grid-template-columns:1fr auto}}'
 ].join('');
 document.head.appendChild(s);
}

function chrome(on){
 try{document.body.classList.toggle('pst-dss-active',!!on);}catch(e){}
 var page=document.getElementById('page-dach-steel-sales');
 if(on){
  document.querySelectorAll('button,a').forEach(function(el){
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
function buyerSubject(r,q){
 var p=queuePayload(q),s=S(p.subject).trim();if(s)return s;
 return S(r.project_title||r.company_name||'Steel supply')+' – Anfrage Materialliste / RFQ | PRISTEEL';
}
function buyerBody(r){
 var scope=S(r.steel_scope||materialText(r));
 var basis=r.quote_readiness==='M3'?'der verfügbaren Materialliste':'den veröffentlichten Projektunterlagen';
 return 'Sehr geehrte Damen und Herren,\n\nim Zusammenhang mit dem Projekt „'+S(r.project_title||'')+'“ möchten wir anfragen, ob die Materialbeschaffung für den relevanten Stahlbauumfang noch offen ist.\n\nPRISTEEL kann projektbezogene Stahlmaterialien aus unserem Beschaffungsnetzwerk liefern. Nach '+basis+' umfasst der für uns relevante Umfang derzeit voraussichtlich:\n\n'+scope+'\n\nFalls die Beschaffung noch nicht abgeschlossen ist, senden Sie uns bitte die aktuelle Materialliste / BOQ sowie – soweit verfügbar – Zeichnungen und Spezifikationen. Auf dieser Grundlage erstellen wir kurzfristig ein technisches und kommerzielles Angebot.\n\nSollte hierfür eine andere Person im Einkauf oder in der Projektleitung zuständig sein, wäre ich für eine Weiterleitung dankbar.\n\nMit freundlichen Grüßen\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com\n+383 44 244 699';
}
function gmailCompose(to,subject,body){
 return 'https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(S(to))+'&su='+encodeURIComponent(S(subject))+'&body='+encodeURIComponent(S(body));
}
function gmailThread(q){
 if(!q||!q.gmail_thread_id)return'';
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
  return 'Guten Tag,\n\nwir prüfen derzeit die Materialbeschaffung für folgendes Projekt:\n'+project+'\n\n'+(indicative?'Die nachstehenden Mengen basieren derzeit auf veröffentlichten Projektunterlagen und sind bis zum Erhalt der finalen BOQ / Materialliste als indikativ zu behandeln.':'Die nachstehenden Positionen basieren auf der verfügbaren Materialliste.')+'\n\n'+mat+'\n\nBitte teilen Sie uns – soweit mit den verfügbaren Angaben möglich – Preisniveau / Einheitspreise, Verfügbarkeit, Lieferzeit, Materialzeugnis EN 10204 3.1, Ursprungsland, Incoterm, Angebotsgültigkeit und Zahlungsbedingungen mit.\n\n'+(indicative?'Die finale Anfrage mit bestätigten Güten, Abmessungen und Mengen folgt nach Erhalt der aktuellen BOQ.':'Bitte kennzeichnen Sie technische Abweichungen eindeutig.')+'\n\nMit freundlichen Grüßen\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com\n+383 44 244 699';
 }
 return 'Dear Sir or Madam,\n\nwe are reviewing the steel material procurement for the following project:\n'+project+'\n\n'+(indicative?'The quantities below are currently based on published project information and must be treated as indicative until the final BOQ / material list is received.':'The positions below are based on the available material list.')+'\n\n'+mat+'\n\nPlease provide, where possible with the currently available information, your price level / unit prices, availability, lead time, EN 10204 3.1 certification, country of origin, Incoterm, quotation validity and payment terms.\n\n'+(indicative?'A final RFQ with confirmed grades, dimensions and quantities will follow after receipt of the current BOQ.':'Please identify any technical deviations clearly.')+'\n\nKind regards,\nArianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com\n+383 44 244 699';
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
async function loadSupplierCandidates(r){
 var id=S(r&&r.id);if(!id)return;
 var box=state.supplierByTarget[id];if(box&&box.loaded)return box.data;
 state.supplierByTarget[id]={loading:true,loaded:false,error:'',data:null};renderPage();
 try{
  var raw=await window.supaFetch('rpc/pppp_chatgpt_supplier_intelligence_v1','POST',{p_requirement:requirementFor(r),p_project_id:null,p_min_qualified:3,p_threshold:70,p_limit:8});
  state.supplierByTarget[id]={loading:false,loaded:true,error:'',data:raw||{}};
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
  var path='pppp_outbound_queue_v1?source=eq.'+encodeURIComponent(SOURCE)+'&source_record_id=in.('+ids.join(',')+')&select=source_record_id,recipient_email,recipient_name,contact_role,gmail_draft_id,gmail_draft_message_id,gmail_thread_id,status,suppression_reason,approved_for_send,human_send_required,sent_at,replied_at,bounced_at,payload,updated_at&order=updated_at.desc&limit=250';
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
  card.innerHTML='<button class="pst-dss-home" type="button"><div><div class="pst-dss-eye">STEEL BUYERS DACH</div><div class="pst-dss-title">Project → Material → Proactive Offer</div><div class="pst-dss-sub">Gjej buyer-in kur kërkesa për çelik bëhet reale. Nxirr material scope dhe kalo direkt te buyer outreach + supplier sourcing.</div><span class="pst-dss-chip">DE · AT · CH · DIRECT STEEL SUPPLY</span></div><div class="pst-dss-stats" data-dss-stats></div><span class="pst-dss-cta">Hap Steel Buyers →</span></button><div class="pst-dss-current" data-dss-current></div>';
  grid.parentNode.insertBefore(card,grid);card.querySelector('button').onclick=open;
 }
 renderHome();loadSummary(false);return true;
}

function renderHome(){
 var stats=document.querySelector('#pst-dach-steel-sales-card-v1 [data-dss-stats]'),cur=document.querySelector('#pst-dach-steel-sales-card-v1 [data-dss-current]');if(!stats||!cur)return;
 var x=summary()||{},p=[[x.targets||0,'Targets'],[x.a1_targets||0,'A1'],[x.quote_ready||0,'Quote ready'],[x.needs_contact||0,'Need contact'],[x.ready_for_outreach||0,'Ready outreach'],[x.replies||0,'Replies']];
 stats.innerHTML=p.map(function(v){return '<span class="pst-dss-stat"><b>'+E(v[0])+'</b><span>'+E(v[1])+'</span></span>'}).join('');
 if(state.error){cur.innerHTML='<span><b>Status:</b> kanali nuk u lexua · '+E(state.error)+'</span>';return}
 if(!(x.targets||0)){cur.innerHTML='<span><b>Status:</b> ende 0 qualified targets.</span><span><b>Next:</b> discovery → qualification → buyer + supply action.</span>';return}
 var hot=x.hot_company_name?'<span><b>Top target:</b> '+E(x.hot_company_name)+(x.hot_project_title?' · '+E(x.hot_project_title):'')+'</span>':'';
 cur.innerHTML='<span><b>Identified steel:</b> '+E(tonnes(x.identified_tonnes))+'</span>'+hot;
}

function ensurePage(){
 css();var page=document.getElementById('page-dach-steel-sales');if(page)return page;
 var host=document.querySelector('.content')||document.body;page=document.createElement('div');page.id='page-dach-steel-sales';page.className='page';page.style.display='none';
 page.innerHTML='<div class="pst-dss-page"><header class="pst-dss-head"><div><small>PRISTEEL · DACH STEEL BUYER ENGINE</small><h1>Steel Buyers DACH</h1><p>Nga sinjali i projektit te veprimi: kërko RFQ/BOQ nga blerësi dhe, paralelisht, përgatit sourcing/RFQ për furnitorët pa humbur human approval.</p></div><div class="pst-dss-actions"><button data-dss-refresh>Rifresko</button><button data-dss-back>← Ballina</button></div></header><div class="pst-dss-engine-note"><b>Rregulli:</b> A1 = company + current project + steel scope + relevant timing. M2 është kalkulim/ekstraktim indikativ; M3 ka bazë zyrtare BOQ/material list. Asnjë email nuk dërgohet automatikisht.</div><div class="pst-dss-kpi-strip" data-dss-kpis></div><div class="pst-dss-tabs"><button class="pst-dss-tab on" data-dss-filter="all">Të gjitha</button><button class="pst-dss-tab" data-dss-filter="a1">A1</button><button class="pst-dss-tab" data-dss-filter="m3">M3 · Quote Ready</button><button class="pst-dss-tab" data-dss-filter="material">Need Material</button><button class="pst-dss-tab" data-dss-filter="contact">Need Contact</button><button class="pst-dss-tab" data-dss-filter="outreach">Ready Outreach</button></div><section class="pst-dss-panel"><div class="pst-dss-panel-head"><b>Buyer + Material Intelligence Desk</b><span data-dss-updated></span></div><div class="pst-dss-headrow"><span>Priority</span><span>Buyer / project</span><span>Why now?</span><span>Material</span><span class="pst-dss-col-timing">Timing</span><span class="pst-dss-col-action">Next step</span></div><div data-dss-list></div></section></div>';
 host.appendChild(page);
 page.onclick=function(e){
  var f=e.target.closest('[data-dss-filter]');if(f){state.filter=f.getAttribute('data-dss-filter');state.expanded=null;state.actionView=null;renderPage();return}
  if(e.target.closest('[data-dss-refresh]')){state.summaryLoaded=false;state.targetsLoaded=false;state.outboundLoaded=false;loadSummary(true);loadTargets(true);return}
  if(e.target.closest('[data-dss-back]')){back();return}
  var btn=e.target.closest('[data-dss-action]');
  if(btn){
   e.preventDefault();e.stopPropagation();
   var id=btn.getAttribute('data-dss-tid'),r=findTarget(id),q=outboundFor(r),act=btn.getAttribute('data-dss-action');if(!r)return;
   if(act==='buyer-preview'){state.actionView={id:id,type:'buyer'};renderPage();return}
   if(act==='buyer-compose'){
    var to=q&&q.recipient_email||'',url=gmailCompose(to,buyerSubject(r,q),buyerBody(r));window.open(url,'_blank','noopener');return;
   }
   if(act==='buyer-thread'){
    var gu=gmailThread(q);if(gu)window.open(gu,'_blank','noopener');else alert('Nuk ka Gmail thread/draft të regjistruar për këtë target.');return;
   }
   if(act==='buyer-copy'){navigator.clipboard&&navigator.clipboard.writeText(buyerBody(r));return}
   if(act==='supplier-preview'){state.actionView={id:id,type:'supplier'};renderPage();return}
   if(act==='find-suppliers'){state.actionView={id:id,type:'supplier'};loadSupplierCandidates(r);return}
   if(act==='supplier-compose'){
    var email=btn.getAttribute('data-email')||'',cand=supplierCandidates(r).filter(function(x){return S(x.email)===S(email)})[0]||{email:email};
    window.open(gmailCompose(email,supplierSubject(r,r.quote_readiness!=='M3'),supplierBody(r,cand)),'_blank','noopener');return;
   }
   if(act==='supplier-copy'){navigator.clipboard&&navigator.clipboard.writeText(supplierBody(r,{}));return}
  }
  if(e.target.closest('a,button'))return;
  var row=e.target.closest('[data-dss-target-id]');if(row){var rid=row.getAttribute('data-dss-target-id');state.expanded=state.expanded===rid?null:rid;state.actionView=null;renderPage()}
 };
 return page;
}

function filteredRows(){
 var rows=A(state.targets);
 if(state.filter==='a1')return rows.filter(function(r){return r.score_band==='A1'});
 if(state.filter==='m3')return rows.filter(function(r){return r.quote_readiness==='M3'});
 if(state.filter==='material')return rows.filter(function(r){return r.quote_readiness==='M0'||r.quote_readiness==='M1'});
 if(state.filter==='contact')return rows.filter(function(r){return r.contact_status==='missing'||r.contact_status==='searching'});
 if(state.filter==='outreach')return rows.filter(function(r){return r.outreach_status==='ready'||!!outboundFor(r)});
 return rows;
}

function materialLines(r){
 var items=materialItems(r);
 if(!items.length)return '<div class="pst-dss-empty" style="padding:16px 10px"><b>No line-item BOM yet</b><span>'+E(qrHelp(r.quote_readiness))+'</span></div>';
 var head='<div class="pst-dss-material-line head"><span>Material</span><span>Grade / standard</span><span>Dimension</span><span>Qty</span><span>Tonnes</span></div>';
 return '<div class="pst-dss-material-table">'+head+items.slice(0,80).map(function(i){
  var mat=[i.family,i.designation].filter(Boolean).join(' · ')||'Material',grade=[i.grade,i.standard].filter(Boolean).join(' / ')||'—',dim=i.dimensions||i.dimension||((i.length_m!=null)?('L '+i.length_m+' m'):'—'),q=i.qty!=null?(S(i.qty)+(i.unit?' '+S(i.unit):'')):'—';
  return '<div class="pst-dss-material-line"><b>'+E(mat)+'</b><span>'+E(grade)+'</span><span>'+E(dim)+'</span><span>'+E(q)+'</span><span>'+E(tonnes(i.tonnes))+'</span></div>';
 }).join('')+'</div>';
}

function buyerAction(r){
 var q=outboundFor(r),to=q&&q.recipient_email||'',status=q?S(q.status||'registered'):'not registered',st=N(status),supp=q&&S(q.suppression_reason).trim(),blocked=!!supp||st==='suppressed',stale=st==='stale',human=!q||q.human_send_required!==false;
 var preview=state.actionView&&state.actionView.id===S(r.id)&&state.actionView.type==='buyer';
 var validThread=q&&q.gmail_thread_id&&!stale&&!blocked,primary='',compose='';
 if(blocked)primary='<button class="pst-dss-btn" disabled>Outbound i bllokuar</button>';
 else if(validThread)primary='<button class="pst-dss-btn primary" data-dss-action="buyer-thread" data-dss-tid="'+E(r.id)+'">Hap Gmail / verifiko</button>';
 else if(to)primary='<button class="pst-dss-btn primary" data-dss-action="buyer-compose" data-dss-tid="'+E(r.id)+'">'+(stale?'Përgatit draft zëvendësues':'Përgatit emailin')+'</button>';
 else primary='<button class="pst-dss-btn" disabled>Duhet kontakt</button>';
 if(!q&&to)compose='<button class="pst-dss-btn" data-dss-action="buyer-compose" data-dss-tid="'+E(r.id)+'">Hap Gmail</button>';
 var guard=blocked?('Preflight: '+S(supp||'suppressed')+'. Mos krijo/dërgo outreach derisa guard-i të pastrohet.'):(stale?'Drafti i regjistruar është stale; mos u mbështet te thread-i i vjetër. Dërgimi i draftit zëvendësues mbetet human-approved.':(human?'Dërgimi mbetet human-approved.':'Asnjë dërgim automatik nga kjo faqe.'));
 return '<div class="pst-dss-action-card"><h4>📩 Blerësi · kërko RFQ / BOQ</h4><p>Kërko material listën aktuale, drawings/specs dhe konfirmo nëse procurement-i është ende i hapur.</p><div class="pst-dss-action-status">'+(to?'<b>'+E(to)+'</b> · ':'')+E(q?'PPPP outbound: '+status:contactLabel(r.contact_status))+'</div><div class="pst-dss-action-buttons">'+primary+compose+'<button class="pst-dss-btn" data-dss-action="buyer-preview" data-dss-tid="'+E(r.id)+'">Shiko tekstin</button></div><div class="pst-dss-guard">'+E(guard)+'</div>'+(preview?'<div class="pst-dss-previewbox"><b>'+E(buyerSubject(r,q))+'</b><pre>'+E(buyerBody(r))+'</pre><div class="pst-dss-action-buttons" style="margin-top:8px"><button class="pst-dss-btn" data-dss-action="buyer-copy" data-dss-tid="'+E(r.id)+'">Kopjo tekstin</button></div></div>':'')+'</div>';
}

function supplierAction(r){
 var indicative=r.quote_readiness!=='M3',box=state.supplierByTarget[S(r.id)]||{},preview=state.actionView&&state.actionView.id===S(r.id)&&state.actionView.type==='supplier';
 var label=r.quote_readiness==='M3'?'RFQ finale':'RFQ indikative';
 var candidates=supplierCandidates(r),candHtml='';
 if(box.loading)candHtml='<div class="pst-dss-previewbox"><b>Duke kontrolluar Supplier Intelligence…</b></div>';
 else if(box.error)candHtml='<div class="pst-dss-previewbox"><b>Supplier Intelligence nuk u lexua</b><pre>'+E(box.error)+'</pre></div>';
 else if(box.loaded){
  candHtml='<div class="pst-dss-candidates">'+(candidates.length?candidates.map(function(c){
   var fit=c.strict_fit?'Strict fit':'Review fit',cl=c.strict_fit?'pst-dss-fit':'pst-dss-fit review';
   return '<div class="pst-dss-candidate"><div><b>'+E(c.name||'Supplier')+'</b><small>'+E([c.country,c.email,'score '+S(c.match_score||0)].filter(Boolean).join(' · '))+'</small></div><span class="'+cl+'">'+E(fit)+'</span>'+(c.email?'<button class="pst-dss-btn" data-dss-action="supplier-compose" data-dss-tid="'+E(r.id)+'" data-email="'+E(c.email)+'">Hap Gmail</button>':'<span></span>')+'</div>';
  }).join(''):'<div class="pst-dss-empty" style="padding:14px"><b>Nuk u gjet kandidat i gatshëm</b><span>Nevojitet supplier discovery ose më shumë specifika.</span></div>')+'</div>';
 }
 return '<div class="pst-dss-action-card"><h4>🏭 Furnizimi · '+E(label)+'</h4><p>'+(indicative?'M2/M1: përdore si sourcing request; quantities/specs duhet të konfirmohen para ofertës finale.':'M3: baza është BOQ/material list dhe mund të përgatitet RFQ e plotë.')+'</p><div class="pst-dss-action-status"><b>'+E(tonnes(r.estimated_tonnes))+'</b> · '+E(qrLabel(r.quote_readiness))+'</div><div class="pst-dss-action-buttons"><button class="pst-dss-btn primary" data-dss-action="supplier-preview" data-dss-tid="'+E(r.id)+'">Përgatit '+E(label)+'</button><button class="pst-dss-btn" data-dss-action="find-suppliers" data-dss-tid="'+E(r.id)+'">Gjej furnitorë</button></div><div class="pst-dss-guard">Supplier ranking është vetëm analizë; asnjë furnitor nuk zgjidhet ose kontaktohet automatikisht.</div>'+(preview?'<div class="pst-dss-previewbox"><b>'+E(supplierSubject(r,indicative))+'</b><pre>'+E(supplierBody(r,{}))+'</pre><div class="pst-dss-action-buttons" style="margin-top:8px"><button class="pst-dss-btn" data-dss-action="supplier-copy" data-dss-tid="'+E(r.id)+'">Kopjo RFQ</button></div></div>':'')+candHtml+'</div>';
}

function detail(r){
 var ev=A(J(r.evidence,[])),scope=J(r.material_scope,{}),conf=r.material_confidence!=null?Math.round(num(r.material_confidence)*100)+'%':'—',safeSource=U(r.source_url),source=safeSource?'<a class="pst-dss-source" href="'+E(safeSource)+'" target="_blank" rel="noopener">Hap burimin ↗</a>':'',evidence=ev.length?'<div class="pst-dss-evidence">'+ev.slice(0,10).map(function(x){var label=typeof x==='string'?x:(x.label||x.title||x.source||x.url||'Evidence');return '<span>'+E(label)+'</span>'}).join('')+'</div>':'';
 return '<div class="pst-dss-detail"><div class="pst-dss-summary"><section class="pst-dss-summary-card"><h3>Opportunity</h3><div class="pst-dss-summary-title">'+E(r.company_name||'Buyer')+'</div><div class="pst-dss-summary-sub">'+E(r.project_title||'')+'</div><div class="pst-dss-keyfacts"><span>'+E(r.score_band||'—')+'</span><span>'+E(r.country||'—')+'</span><span>'+E(r.procurement_timing||'Timing unknown')+'</span><span>Award '+E(D(r.award_date))+'</span></div></section><section class="pst-dss-summary-card"><h3>Material we can target</h3><div class="pst-dss-summary-title">'+E(tonnes(r.estimated_tonnes))+' · '+E(qrLabel(r.quote_readiness))+'</div><div class="pst-dss-summary-sub">'+E(r.steel_scope||qrHelp(r.quote_readiness))+'</div></section></div><section class="pst-dss-action-center"><header><b>Çfarë bëjmë tani?</b><span>Buyer side + supply side</span></header><div class="pst-dss-action-grid">'+buyerAction(r)+supplierAction(r)+'</div></section><details class="pst-dss-details"><summary>Evidence & technical details</summary><div class="pst-dss-detail-grid"><section class="pst-dss-detail-card"><h3>Project & qualification</h3><div class="pst-dss-meta"><span>Company</span><span>'+E(r.company_name)+'</span><span>Country</span><span>'+E(r.country||'—')+'</span><span>Buyer type</span><span>'+E(r.buyer_type||'—')+'</span><span>Reference</span><span>'+E(r.project_reference||'—')+'</span><span>Material revision</span><span>'+E(r.material_revision||scope.revision||'—')+'</span><span>Confidence</span><span>'+E(conf)+'</span><span>Last verified</span><span>'+E(D(r.last_verified_at))+'</span></div>'+source+evidence+'</section><section class="pst-dss-detail-card"><h3>Material Intelligence</h3>'+materialLines(r)+'</section></div></details></div>';
}

function renderPage(){
 var page=document.getElementById('page-dach-steel-sales');if(!page)return;
 var sx=summary()||{},lx=localSummary(),k=page.querySelector('[data-dss-kpis]'),list=page.querySelector('[data-dss-list]'),u=page.querySelector('[data-dss-updated]');
 if(k)k.innerHTML=[[sx.targets||lx.targets,'Targets'],[sx.a1_targets||lx.a1_targets,'A1'],[sx.needs_contact||lx.needs_contact,'Need Contact'],[sx.ready_for_outreach||lx.ready_for_outreach,'Ready Outreach'],[sx.sent||0,'Sent'],[sx.replies||0,'Replies']].map(function(v){return '<div class="pst-dss-kpi"><b>'+E(v[0])+'</b><span>'+E(v[1])+'</span></div>'}).join('');
 page.querySelectorAll('[data-dss-filter]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-dss-filter')===state.filter)});
 if(u)u.textContent=state.lastLoadedAt?'Përditësuar '+new Date(state.lastLoadedAt).toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'}):'';
 if(!list)return;
 if(state.targetsLoading){list.innerHTML='<div class="pst-dss-empty"><b>Duke lexuar qualified targets…</b><span>Një query e kufizuar; pa discovery noise.</span></div>';return}
 if(state.error&&state.targetsLoaded){list.innerHTML='<div class="pst-dss-empty"><b>Steel Buyer Desk nuk u lexua</b><span>'+E(state.error)+'</span></div>';return}
 var rows=filteredRows();
 if(!rows.length){list.innerHTML='<div class="pst-dss-empty"><b>'+E(state.filter==='all'?'Ende nuk ka qualified Steel Buyer targets.':'Nuk ka targete në këtë filtër.')+'</b><span>Pipeline: signal → qualification → buyer RFQ request + supplier sourcing → real RFQ.</span></div>';return}
 list.innerHTML=rows.map(function(r){
  var prods=arrText(r.products).slice(0,4).join(' · ')||r.steel_scope||'Material scope pending',q=outboundFor(r);
  var next=q&&q.recipient_email?'Kërko RFQ':'Gjej kontakt';
  var row='<div class="pst-dss-row" data-dss-target-id="'+E(r.id)+'"><span class="pst-dss-score '+scoreClass(r.score_band)+'">'+E(r.score_band||'—')+'</span><div><b>'+E(r.company_name||'Buyer')+'</b><small>'+E([r.country,r.project_title].filter(Boolean).join(' · ')||r.buyer_type||'Steel buyer')+'</small></div><div class="pst-dss-col-why"><div class="pst-dss-why">'+E(r.why_now||'Why-now evidence pending')+'</div></div><div><span class="pst-dss-qr '+qrClass(r.quote_readiness)+'">'+E(qrLabel(r.quote_readiness))+'</span><div class="pst-dss-products">'+E(prods)+'</div><div class="pst-dss-ton">'+E(tonnes(r.estimated_tonnes))+'</div></div><div class="pst-dss-col-timing"><b>'+E(r.procurement_timing||'Unknown')+'</b><small>'+E(r.award_date?'Award '+D(r.award_date):'Timing evidence needed')+'</small></div><div class="pst-dss-col-action"><button class="pst-dss-nextbtn" type="button" data-dss-tid="'+E(r.id)+'" data-dss-open-actions="1">'+E(next)+' →</button></div></div>';
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
 page.style.display='block';page.classList.add('active');renderPage();loadSummary(false);loadTargets(false);try{window.scrollTo(0,0)}catch(e){}
}
function boot(){css();ensurePage();ensureHome()}

document.addEventListener('pst:native-home-ready',function(){chrome(false);setTimeout(ensureHome,0)});
document.addEventListener('pst:home-canonical-rendered',function(){chrome(false);setTimeout(ensureHome,0)});
document.addEventListener('pst:modules-ready',function(){setTimeout(boot,0)},{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(boot,0)},{once:true});else setTimeout(boot,0);

window.PSTDachSteelSalesV1=window.PSTDachSteelSalesV2=window.PSTDachSteelSalesV3={
 source:SOURCE,open:open,
 refresh:function(){state.summaryLoaded=false;state.targetsLoaded=false;state.outboundLoaded=false;return Promise.all([loadSummary(true),loadTargets(true)])},
 snapshot:function(){return{source:SOURCE,summary:summary(),targets:A(state.targets).slice(),outboundByTarget:Object.assign({},state.outboundByTarget),filter:state.filter,error:state.error}}
};
})();