/* PRISTEEL repeated offer save fix v5
 * Keeps the same QUO record editable across multiple days/sessions.
 * Saving is not sending: a saved QUO is stored as open/saved unless it already has a sent marker.
 * Existing sent markers are preserved when a saved offer is edited again.
 * The legacy registerDocNr collision guard remains authoritative.
 *
 * Structured draft edit ownership is loaded with pst_live=Date.now() before Project Commercial.
 * Modern Workspace leaves legacy pages with inline display:none, while the captured legacy
 * showPage router only changes active classes. This module therefore owns both the click and
 * the final visible page state before loading structured positions into the legacy offer editor.
 * For structured project offers it also removes the old non-printable preview toolbar/status
 * strip so the user sees only the offer document, not duplicated legacy page chrome.
 *
 * Project UX contract v1 is intentionally bounded to the project workspace and project legacy
 * editors: no passive KPI cards, no stale advanced-analysis disclosure, a real one-step Back,
 * direct editing of an existing client offer, and a deterministic read-only PPPP project-chat
 * fallback when no browser AI key is configured.
 */
(function(){
'use strict';
if(window.__pstOfferResaveFixV1)return;
window.__pstOfferResaveFixV1=true;

function A(v){return Array.isArray(v)?v:[];}
function N(v){var x=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(x)?x:0;}
function clean(v){return String(v==null?'':v).trim();}
function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
function obj(v){
  if(v&&typeof v==='object'&&!Array.isArray(v))return Object.assign({},v);
  if(typeof v==='string'&&v.trim())try{var x=JSON.parse(v);return x&&typeof x==='object'?x:{};}catch(e){}
  return{};
}
function norm(v){return clean(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function esc(v){return clean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function money(v){var n=N(v);return n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' EUR';}
function projectId(){var d=window.__pstIntegrityLastData||{};return clean(window.__pstCurrentProjectId||window._curProjId||(d.project&&d.project.id)||'');}
function projectName(){var d=window.__pstIntegrityLastData||{},p=d.project||{};return clean(p.name||p.project_name||p.ref||'Projekt');}

function syncMemory(nr,project,client,totalEur,payPlan,state,revenueBreakdown,followupStatus){
  var d=window.__pstIntegrityLastData;if(!d)return;
  var rows=Array.isArray(d.ourOffers)?d.ourOffers:[],row=null;
  for(var i=0;i<rows.length;i++){
    if(String(rows[i]&&(rows[i].doc_nr||rows[i].document_nr)||'')===String(nr)){row=rows[i];break;}
  }
  if(!row){
    row={doc_nr:nr,series:'QUO',created_at:new Date().toISOString()};
    rows.unshift(row);
    d.ourOffers=rows;
  }
  row.project=project||row.project||'';
  row.client=client||row.client||'';
  row.total_eur=totalEur||row.total_eur||null;
  row.payment_plan=payPlan||row.payment_plan||null;
  row.offer_state=state;
  if(revenueBreakdown!==undefined)row.revenue_breakdown=revenueBreakdown;
  row.followup_status=followupStatus||row.followup_status||'open';
  d.currentOurOffer=row;
  d.ourOfferHistory=rows.filter(function(x){return x!==row;});
}
function refreshUi(){
  try{if(window.PSTOurOfferHistoryUiV1&&typeof window.PSTOurOfferHistoryUiV1.schedule==='function')window.PSTOurOfferHistoryUiV1.schedule();}catch(e){}
  try{document.dispatchEvent(new CustomEvent('pst:offer-saved'));}catch(e){}
}
function install(){
  var original=window.registerDocNr;
  if(typeof original!=='function')return false;
  if(original.__pstOfferResaveWrapped)return true;

  function wrapped(series,nr,project,client,totalEur,payPlan,offerState,revenueBreakdown){
    var args=arguments;
    var result=original.apply(this,args);
    if(String(series||'').toUpperCase()!=='QUO')return result;

    return Promise.resolve(result).then(function(value){
      if(typeof window.supaFetch!=='function'||!nr)return value;
      var path='documents_registry?doc_nr=eq.'+encodeURIComponent(nr),patch={
        project:project||'',
        client:client||'',
        total_eur:totalEur||null,
        payment_plan:payPlan||null,
        project_id:window._curProjId||window.__pstCurrentProjectId||null
      };
      if(revenueBreakdown!==undefined)patch.revenue_breakdown=revenueBreakdown;

      return window.supaFetch(path+'&select=offer_state,followup_status&limit=1').catch(function(){return[];}).then(function(rows){
        var existing=obj(rows&&rows[0]&&rows[0].offer_state),incoming=obj(offerState),merged=Object.assign({},existing,incoming);
        var sent=!!(merged.pst_sent_at||merged.sent_at||merged.sent===true);
        merged.pst_document_status=sent?'sent':'saved';
        patch.offer_state=merged;
        if(!sent)patch.followup_status='open';
        return window.supaFetch(path,'PATCH',patch).then(function(){
          syncMemory(nr,project,client,totalEur,payPlan,merged,revenueBreakdown,patch.followup_status||(rows&&rows[0]&&rows[0].followup_status));
          refreshUi();
          return value;
        });
      });
    });
  }
  wrapped.__pstOfferResaveWrapped=true;
  wrapped.__pstOfferResaveOriginal=original;
  window.registerDocNr=wrapped;
  return true;
}

function structuredOffers(){
  var d=window.__pstIntegrityLastData||{},rows=A(d.ourOffers).slice(),seen={},out=[];
  function add(o){
    if(!o||!A(o.positions).length)return;
    var id=clean(o.id||o.offer_ref||o.doc_nr||o.document_nr||o.reference||'');
    var key=id||('offer_'+out.length);
    if(seen[key])return;
    seen[key]=true;out.push(o);
  }
  rows.forEach(add);
  add(d.currentOurOffer);
  out.sort(function(a,b){
    var ta=Date.parse(a&&a.updated_at||a&&a.created_at||a&&a.date||0)||0;
    var tb=Date.parse(b&&b.updated_at||b&&b.created_at||b&&b.date||0)||0;
    return tb-ta;
  });
  return out;
}
function bestStructuredOffer(){return structuredOffers()[0]||null;}
function structuredPrice(p){return N(p&&(p.unit_price_net_eur!=null?p.unit_price_net_eur:(p.price!=null?p.price:p.price_neg)));}
function structuredRows(o){
  return A(o&&o.positions).map(function(p){
    var row={
      desc:clean(p&&p.description||p&&p.desc||p&&p.key||'Pozicion'),
      qty:p&&p.qty==null?'':p.qty,
      unit:clean(p&&p.unit||''),
      price:structuredPrice(p),
      _pstStructured:true
    };
    var w=N(p&&p.theoretical_steel_weight_kg),kg=N(p&&p.our_net_eur_per_kg);
    if(w>0)row.theoretical_steel_weight_kg=w;
    if(kg>0)row.eur_per_kg=kg;
    return row;
  });
}
function structuredRef(o){return clean(o&&(o.offer_ref||o.doc_nr||o.document_nr||o.reference)||'');}
function forceVisiblePage(id){
  var target=document.getElementById(id);
  if(!target)return false;
  document.querySelectorAll('.page').forEach(function(page){
    if(page===target)return;
    page.classList.remove('active');
    page.style.display='none';
  });
  target.classList.add('active');
  target.style.display='block';
  return true;
}
function cleanStructuredOfferChrome(){
  if(!window.__pstStructuredOfferBeingEdited)return false;
  var preview=document.getElementById('of-preview-col');
  if(!preview)return false;
  var children=preview.children||[];
  for(var i=0;i<children.length;i++){
    var row=children[i];
    if(!row||!row.querySelector)continue;
    var isToolbar=row.querySelector('[onclick*="ofBackToEdit"],[onclick*="copyOferte"],[onclick*="downloadPDF"],[onclick*="saveCurrentOffer"]');
    if(!isToolbar)continue;
    if(row.getAttribute('data-pst-structured-preview-toolbar-hidden')==='1'&&row.style.display==='none')return true;
    row.style.setProperty('display','none','important');
    row.setAttribute('data-pst-structured-preview-toolbar-hidden','1');
    return true;
  }
  return false;
}
function scheduleStructuredOfferChromeCleanup(){
  [0,40,100,220,500,900].forEach(function(ms){setTimeout(cleanStructuredOfferChrome,ms);});
}
function watchStructuredOfferChrome(){
  var preview=document.getElementById('of-preview-col');
  if(!preview||typeof MutationObserver==='undefined')return false;
  if(preview.__pstStructuredChromeObserver)return true;
  var observer=new MutationObserver(function(){cleanStructuredOfferChrome();});
  observer.observe(preview,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
  preview.__pstStructuredChromeObserver=observer;
  return true;
}
function openOfferEditorPage(){
  var routed=false,L=window.__pstWorkspaceLegacy;
  try{
    if(L&&typeof L.showPage==='function'){L.showPage('oferta');routed=true;}
    else if(typeof window.pstWsLegacy==='function'){window.pstWsLegacy('oferta');routed=true;}
    else if(typeof window.showPage==='function'){window.showPage('oferta');routed=true;}
    else{
      var C=window.PSTCommercialNavigationFixV1;
      if(C&&typeof C.openLegacyPage==='function'){C.openLegacyPage('oferta');routed=true;}
    }
  }catch(e){console.error('[offer-resave-fix] legacy offer route failed',e);}
  var visible=forceVisiblePage('page-oferta');
  return routed||visible;
}
function openStructuredOffer(o){
  if(!o||!A(o.positions).length)return false;
  if(!openOfferEditorPage()){
    console.error('[offer-resave-fix] structured offer editor route unavailable');
    return false;
  }
  var rows=structuredRows(o),ref=structuredRef(o);
  window.__pstStructuredOfferBeingEdited=o;
  cleanStructuredOfferChrome();
  watchStructuredOfferChrome();
  scheduleStructuredOfferChromeCleanup();
  setTimeout(function(){
    forceVisiblePage('page-oferta');
    cleanStructuredOfferChrome();
    try{
      if(!Array.isArray(window.oferPos))window.oferPos=[];
      window.oferPos.length=0;
      rows.forEach(function(row){window.oferPos.push(clone(row));});
      if(typeof window.renderOferPos==='function')window.renderOferPos();
    }catch(err){console.error('[offer-resave-fix] structured rows failed',err);}
    try{var nr=document.getElementById('of-nr');if(nr)nr.value=ref;}catch(e){}
    try{if(typeof window.genOfer==='function')window.genOfer();}catch(e){}
    cleanStructuredOfferChrome();
    watchStructuredOfferChrome();
    scheduleStructuredOfferChromeCleanup();
    ensureLegacyBack();
    try{window.scrollTo({top:0,behavior:'auto'});}catch(e){}
  },120);
  return true;
}

/* ---------------- Project UX contract ---------------- */
var ux={history:[],projectObserver:null,reconciling:false};
function latestClientOfferAny(){
  var d=window.__pstIntegrityLastData||{},xs=A(d.ourOffers).slice();
  if(d.currentOurOffer&&xs.indexOf(d.currentOurOffer)<0)xs.push(d.currentOurOffer);
  xs=xs.filter(function(o){return o&&(A(o.positions).length||A(o.offer_state&&o.offer_state.oferPos).length);});
  xs.sort(function(a,b){return(Date.parse(b&&b.updated_at||b&&b.created_at||b&&b.date||0)||0)-(Date.parse(a&&a.updated_at||a&&a.created_at||a&&a.date||0)||0);});
  return xs[0]||null;
}
function normalizeClientOffer(o){
  if(!o)return null;
  if(A(o.positions).length)return o;
  var st=o.offer_state||{},ps=A(st.oferPos).map(function(p){return{
    key:p&&p._pstKey||p&&p.key||'',description:p&&p.desc||p&&p.description||p&&p._pstKey||'Pozicion',
    qty:p&&p.qty==null?'':p.qty,unit:p&&p.unit||'',unit_price_net_eur:p&&p.price!=null?p.price:p&&p.price_neg,
    theoretical_steel_weight_kg:p&&p.theoretical_steel_weight_kg,our_net_eur_per_kg:p&&p.eur_per_kg
  };});
  var x=Object.assign({},o);x.positions=ps;x.offer_ref=clean(o.offer_ref||o.doc_nr||o.document_nr||o.reference||'');return x;
}
function offerSentLike(o){
  if(!o)return false;var st=o.offer_state||{},s=norm([o.status,o.state,o.followup_status,st.pst_document_status,st.status,st.revision_status].join(' '));
  return !!(o.sent_at||o.email_sent_at||o.dispatched_at||st.sent_at||st.pst_sent_at||st.sent===true)||/(^| )(sent|derguar|submitted|issued|versendet|poslano)( |$)/.test(s);
}
function currentProjectRoute(){
  var p=document.getElementById('page-workspace-project');
  if(!p||!p.classList.contains('active'))return null;
  return{projectId:projectId(),area:clean(p.getAttribute('data-pwf-area')||'overview'),stage:clean(p.getAttribute('data-pwf-stage')||'')};
}
function sameRoute(a,b){return !!(a&&b&&a.projectId===b.projectId&&a.area===b.area&&a.stage===b.stage);}
function rememberProjectRoute(){
  var r=currentProjectRoute();if(!r||!r.projectId)return false;
  var last=ux.history[ux.history.length-1];if(!sameRoute(last,r))ux.history.push(r);
  if(ux.history.length>30)ux.history=ux.history.slice(-30);return true;
}
function restoreProjectRoute(r){
  if(!r||!r.projectId)return false;
  window.__pstCurrentProjectId=r.projectId;window._curProjId=r.projectId;
  function finish(){
    var C=window.PSTCanonicalProjectWorkflowV1;
    if(C&&typeof C.render==='function'){C.render(r.area||'overview',r.stage||undefined);scheduleProjectReconcile();return true;}
    var P=window.PSTProjectFirstV2;if(P&&typeof P.render==='function'){P.render(r.area==='procurement'?'commercial':r.area||'overview');scheduleProjectReconcile();return true;}
    return false;
  }
  var page=document.getElementById('page-workspace-project');
  if(page&&page.classList.contains('active')&&projectId()===r.projectId)return finish();
  if(typeof window.pstOpenProjectWorkspace==='function'){
    try{Promise.resolve(window.pstOpenProjectWorkspace(r.projectId)).then(finish).catch(function(){finish();});return true;}catch(e){}
  }
  return finish();
}
function goBackOneStep(){
  var active=document.querySelector('.page.active');
  if(active&&active.id!=='page-workspace-project'){
    var r=ux.history.pop();
    if(r)return restoreProjectRoute(r);
    var C=window.PSTCanonicalProjectWorkflowV1;if(C&&typeof C.returnProject==='function'&&window.__pstCanonicalProjectWorkflowOrigin)return C.returnProject();
    if(projectId()&&typeof window.pstOpenProjectWorkspace==='function'){try{window.pstOpenProjectWorkspace(projectId());return true;}catch(e){}}
  }
  var cur=currentProjectRoute(),prev=null;
  while(ux.history.length){prev=ux.history.pop();if(!sameRoute(prev,cur))break;prev=null;}
  if(prev)return restoreProjectRoute(prev);
  if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo('projects');return true;}
  return false;
}
function openRealClientOffer(){
  var raw=latestClientOfferAny();if(!raw)return false;
  var o=normalizeClientOffer(raw);if(!o||!A(o.positions).length)return false;
  var ok=openStructuredOffer(o);if(ok){[0,80,180].forEach(function(ms){setTimeout(ensureLegacyBack,ms);});}return ok;
}
function ensureUxCss(){
  if(document.getElementById('pst-project-ux-contract-css'))return;
  var s=document.createElement('style');s.id='pst-project-ux-contract-css';s.textContent=
    '#page-workspace-project .pwf-project-kpis>.pst-ux-kpi{appearance:none;border:0;border-right:1px solid #E8EEF0;background:#fff;padding:11px;text-align:left;font:inherit;color:inherit;cursor:pointer;min-width:0}'+
    '#page-workspace-project .pwf-project-kpis>.pst-ux-kpi:last-child{border-right:0}#page-workspace-project .pwf-project-kpis>.pst-ux-kpi:hover{background:#F4FAFC}#page-workspace-project .pwf-project-kpis>.pst-ux-kpi:focus-visible{outline:2px solid #5B9BB3;outline-offset:-2px}'+
    '#page-workspace-project .pwf-project-kpis>.pst-ux-kpi span{display:block;font-size:9px;color:#859197}#page-workspace-project .pwf-project-kpis>.pst-ux-kpi b{display:block;font-size:13px;color:#304047;margin-top:3px}'+
    '.pst-ux-back-row{display:flex;align-items:center;gap:8px;margin:0 0 10px}.pst-ux-back-btn{border:1px solid #D7E3E7;background:#fff;color:#46616C;border-radius:9px;padding:8px 11px;font-size:10px;font-weight:750;cursor:pointer}.pst-ux-back-btn:hover{border-color:#9DBAC5;background:#F4F9FA}'+
    '#pst-ux-legacy-backbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 18px;border-bottom:1px solid #DCE7EA;background:#F7FAFB;position:relative;z-index:8}#pst-ux-legacy-backbar b{font-size:11px;color:#53676F;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}';
  document.head.appendChild(s);
}
function kpiAction(label){var n=norm(label);if(n==='rfq'||n.indexOf('rfq')===0)return'rfq';if(n.indexOf('oferta furnitor')>-1)return'supplier-offers';if(n.indexOf('oferta klient')>-1)return'client-offer';if(n.indexOf('skedar')>-1)return'files';return'';}
function makeKpisActionable(root){
  if(!root)return 0;var count=0;
  A([].slice.call(root.querySelectorAll('.pwf-project-kpis>div'))).forEach(function(node){
    var label=node.querySelector('span'),action=kpiAction(label&&label.textContent);if(!action)return;
    var b=document.createElement('button');b.type='button';b.className='pst-ux-kpi';b.setAttribute('data-pst-ux-kpi',action);b.setAttribute('aria-label','Hap '+clean(label&&label.textContent));b.innerHTML=node.innerHTML;node.replaceWith(b);count++;
  });return count;
}
function removeAdvancedAnalysis(root){if(!root)return 0;var xs=[].slice.call(root.querySelectorAll('.pst-csf-advanced'));xs.forEach(function(x){x.remove();});return xs.length;}
function ensureProjectBack(root){
  if(!root||root.querySelector('[data-pst-ux-back="project"]'))return false;
  var buttons=[].slice.call(root.querySelectorAll('button')),anchor=buttons.filter(function(b){return /^projektet$/i.test(clean(b.textContent).replace(/^←\s*/,''));})[0];
  var b=document.createElement('button');b.type='button';b.setAttribute('data-pst-ux-back','project');b.textContent='← Mbrapa';
  if(anchor){b.className=anchor.className||'pst-ux-back-btn';anchor.parentNode.insertBefore(b,anchor);}
  else{b.className='pst-ux-back-btn';var row=document.createElement('div');row.className='pst-ux-back-row';row.appendChild(b);root.insertBefore(row,root.firstChild);}
  return true;
}
function reconcileProjectUi(){
  if(ux.reconciling)return false;var root=document.getElementById('page-workspace-project');if(!root)return false;
  ux.reconciling=true;try{ensureUxCss();makeKpisActionable(root);removeAdvancedAnalysis(root);ensureProjectBack(root);}finally{ux.reconciling=false;}return true;
}
function ensureProjectObserver(){
  var root=document.getElementById('page-workspace-project');if(!root||typeof MutationObserver==='undefined')return false;
  if(root.__pstProjectUxObserver)return true;
  var obs=new MutationObserver(function(){reconcileProjectUi();});obs.observe(root,{childList:true,subtree:true});root.__pstProjectUxObserver=obs;ux.projectObserver=obs;return true;
}
function scheduleProjectReconcile(){[0,60,160,360].forEach(function(ms){setTimeout(function(){ensureProjectObserver();reconcileProjectUi();},ms);});}
function projectLegacyPage(active){
  if(!active||active.id==='page-workspace-project')return false;
  if(window.__pstCanonicalProjectWorkflowOrigin)return true;
  if(window.__pstStructuredOfferBeingEdited&&active.id==='page-oferta')return true;
  return /^(page-(oferta|bom|rfq|kalkulator|ofertat|ranking))$/.test(active.id||'');
}
function ensureLegacyBack(){
  ensureUxCss();var active=document.querySelector('.page.active');if(!projectLegacyPage(active))return false;
  var canonical=active.querySelector('#pwf-legacy-context [data-pwf-action="return-project"]');
  if(canonical){canonical.removeAttribute('data-pwf-action');canonical.setAttribute('data-pst-ux-back','legacy');canonical.textContent='← Mbrapa';return true;}
  if(active.querySelector('#pst-ux-legacy-backbar'))return true;
  var bar=document.createElement('div');bar.id='pst-ux-legacy-backbar';bar.innerHTML='<button type="button" class="pst-ux-back-btn" data-pst-ux-back="legacy">← Mbrapa</button><b>'+esc(projectName())+'</b>';active.insertBefore(bar,active.firstChild);return true;
}
function handleKpi(action){
  var C=window.PSTCanonicalProjectWorkflowV1;
  if(action==='client-offer'){rememberProjectRoute();return openRealClientOffer();}
  if(C&&typeof C.render==='function'){
    if(action==='rfq')return C.render('procurement','rfq');
    if(action==='supplier-offers')return C.render('procurement','offers');
    if(action==='files')return C.render('files');
  }
  var P=window.PSTProjectFirstV2;if(P&&typeof P.render==='function'){
    if(action==='files')return P.render('files');
    return P.render(action==='rfq'?'procurement':'commercial');
  }
  return false;
}

function hasAiKey(){
  var ai=window.PSTAI;if(!ai||typeof ai.hasApiKey!=='function')return false;
  try{return !!ai.hasApiKey();}catch(e){return false;}
}
function positionKey(p){return norm(p&&(p.key||p._pstKey||p.description||p.desc));}
function positionMap(o){var out={};A(o&&o.positions).concat(A(o&&o.offer_state&&o.offer_state.oferPos)).forEach(function(p){var k=positionKey(p);if(!k)return;out[k]={desc:clean(p.description||p.desc||p.key||p._pstKey||k),price:N(p.unit_price_net_eur!=null?p.unit_price_net_eur:(p.price_neg!=null?p.price_neg:p.price)),qty:p.qty};});return out;}
function findComparable(map,key){var ks=Object.keys(map),want=norm(key);for(var i=0;i<ks.length;i++){if(ks[i]===want||ks[i].indexOf(want)>-1||want.indexOf(ks[i])>-1)return map[ks[i]];}return null;}
function pieceComparisons(){
  var d=window.__pstIntegrityLastData||{},ours=normalizeClientOffer(latestClientOfferAny()),om=positionMap(ours),sup=A(d.supplierOffers).length?A(d.supplierOffers):A(d.offers),rows=[];
  sup.forEach(function(s){var sm=positionMap(s),name=clean(s.supplier||s.supplier_name||s.company||'Furnitor');Object.keys(sm).forEach(function(k){var a=sm[k],b=findComparable(om,k);if(!b||!(a.price>0)||!(b.price>0))return;var diff=b.price-a.price,pct=a.price?diff/a.price*100:0;rows.push({supplier:name,desc:a.desc,supplierPrice:a.price,ourPrice:b.price,difference:diff,pct:pct});});});return rows;
}
function countProjectFiles(){var d=window.__pstIntegrityLastData||{};return A(d.projectDocs).length+A(d.attachmentLinks).length+A(d.inboxDocs).length+A(d.docs).length+A(d.mailAttachments).length+A(d.drive&&d.drive.rows).length;}
function projectFallbackAnswer(ctx,question){
  ctx=ctx||{};var q=norm(question),d=window.__pstIntegrityLastData||{},p=ctx.project||d.project||{},commercial=ctx.commercial_snapshot||{},current=ctx.current||{},our=latestClientOfferAny(),sent=offerSentLike(our),ps=A(our&&our.positions).concat(A(our&&our.offer_state&&our.offer_state.oferPos)),pendingQty=ps.some(function(x){return x&&x.qty==null||clean(x&&x.qty)==='';});
  var rfqs=A(current.rfqs).length||A(d.rfqs).length,suppliers=A(d.supplierOffers).length||A(current.supplier_offers).length||N(commercial.supplier_offer_count),files=countProjectFiles()||A(current.files).length,emails=A(current.emails).length||A(d.emails).length;
  var answer='',next='';
  if(/krahas|diferenc|cmim|çmim/.test(q)){
    var cmp=pieceComparisons();
    if(cmp.length){answer='Krahasimi i regjistruar tani është:\n'+cmp.map(function(x){return x.supplier+' · '+x.desc+': '+money(x.supplierPrice)+' → '+money(x.ourPrice)+' (+'+money(x.difference)+', +'+x.pct.toLocaleString('de-DE',{maximumFractionDigits:1})+'%).';}).join('\n')+'\nKëto janë diferenca të çmimit për njësi, jo fitim i pastër. Kostot që nuk janë të futura në të dyja anët nuk duhet të quhen marzh.';}
    else answer='PPPP sheh '+suppliers+' ofertë/a furnitori dhe '+(our?'një ofertë klienti':'asnjë ofertë klienti')+', por nuk ka pozicione me çmime të krahasueshme një-për-një në të dhënat aktuale.';
    next='Kontrollo scope-in dhe kostot që mungojnë para se diferenca të trajtohet si marzh.';
  }else if(/follow up|followup|ndjek/.test(q)){
    if(!our)answer='Nuk ka ofertë klienti të regjistruar, prandaj nuk ka ende bazë për follow-up.';
    else if(!sent)answer='Jo ende. Oferta është draft dhe PPPP nuk ka provë të regjistruar se është dërguar. Fillimisht finalizoje dhe dërgoje; follow-up fillon pas dërgimit.';
    else if(commercial.follow_up_window)answer='Oferta rezulton e dërguar. Dritarja e llogaritur për follow-up është '+clean(commercial.follow_up_window.earliest).slice(0,10)+' deri '+clean(commercial.follow_up_window.latest).slice(0,10)+', nëse klienti nuk ka dhënë afat tjetër.';
    else answer='Oferta rezulton e dërguar, por PPPP nuk ka një datë të mjaftueshme për të llogaritur follow-up-in. Rregulli operativ është 2–3 ditë pune pas dërgimit, nëse klienti nuk ka dhënë afat tjetër.';
    next=sent?'Kontrollo përgjigjet e klientit para çdo follow-up-i.':'Finalizo ofertën dhe regjistro dërgimin para follow-up-it.';
  }else if(/do te beje|do beje|bej tani|hapi.*ardh|tani/.test(q)){
    if(our&&!sent){answer='Unë do të finalizoja ofertën draft para çdo veprimi tjetër.'+(pendingQty?' Ka pozicione pa sasi finale, prandaj së pari duhen plotësuar sasitë.':'')+' Pastaj do të kontrolloja çmimin, kushtet komerciale dhe marrësin, dhe vetëm pas aprovimit tënd do ta dërgoja.';next='Hap editorin real të ofertës dhe përfundo draftin.';}
    else if(sent){answer='Oferta është e dërguar. Hapi i radhës është të kontrollosh përgjigjen e klientit dhe të bësh follow-up vetëm brenda dritares së duhur.';next='Mos krijo ofertë të re pa nevojë; ruaj historinë dhe bëj revision vetëm nëse ndryshon oferta.';}
    else{answer='Do të mbyllja fillimisht bazën komerciale: '+rfqs+' RFQ, '+suppliers+' ofertë/a furnitori dhe pastaj do të krijoja ofertën e klientit.';next='Hap Prokurimin dhe verifiko ofertën e furnitorit para çmimit të shitjes.';}
  }else if(/ndodh|gjend|status|realisht/.test(q)){
    answer='Projekti '+clean(p.name||projectName())+' është në '+clean(p.pipeline_stage||p.status||'fazë aktive')+'. PPPP ka '+rfqs+' RFQ, '+suppliers+' ofertë/a furnitori, '+(our?(sent?'ofertë klienti të dërguar':'ofertë klienti Draft'):'pa ofertë klienti')+', '+files+' skedarë dhe '+emails+' emaila të lidhur në pamjen aktuale.'+(our&&!sent?' Pika që kërkon vëmendje tani është finalizimi i draftit, jo follow-up-i.':'');
    next=our&&!sent?'Finalizo ofertën draft.':sent?'Kontrollo përgjigjen/follow-up-in.':'Vazhdo nga prokurimi te oferta e klientit.';
  }else{
    var docs=A(current.document_intelligence),tokens=q.split(' ').filter(function(t){return t.length>3&&['projekt','kete','per','dhe','eshte','duhet','mund','cilat','cila','cfare'].indexOf(t)<0;}),hits=[];
    docs.forEach(function(doc){var text=clean(doc&&doc.extracted_text),nt=norm(text),score=0;tokens.forEach(function(t){if(nt.indexOf(t)>-1)score++;});if(score)hits.push({score:score,name:clean(doc.file_name||'Dokument'),text:text});});hits.sort(function(a,b){return b.score-a.score;});
    if(hits.length){answer='Nga dokumentet e analizuara gjeta këto pjesë relevante:\n'+hits.slice(0,3).map(function(h){var sn=h.text.replace(/\s+/g,' ').slice(0,360);return h.name+': '+sn+(h.text.length>360?'…':'');}).join('\n\n');next='Nëse do, pyete më ngushtë me termin ose dokumentin konkret.';}
    else{answer='Për këtë pyetje PPPP nuk gjeti evidence të drejtpërdrejtë në të dhënat e strukturuara të projektit. Gjendja operative tani është: '+rfqs+' RFQ, '+suppliers+' ofertë/a furnitori, '+(our?(sent?'ofertë klienti të dërguar':'ofertë klienti Draft'):'pa ofertë klienti')+', '+files+' skedarë.';next='Formuloje pyetjen me dokumentin, çmimin, furnitorin ose kërkesën teknike që do të kontrollosh.';}
  }
  return{answer:answer,confidence:'medium',evidence:[{source_id:'CURRENT',reason:'Përgjigje nga të dhënat aktuale të projektit në PPPP.'}],uncertainty:'',suggested_next_step:next,follow_up:'',draft_email:{subject:'',body:''}};
}
function setPicState(root,text,err){var e=root&&root.querySelector('.pst-pic-state');if(!e)return;e.textContent=text||'';e.className='pst-pic-state'+(err?' err':'');}
async function askProjectFallback(button){
  var root=button&&button.closest&&button.closest('.pst-pic');if(!root)return false;
  var pid=clean(root.getAttribute('data-project-id')||projectId()),input=root.querySelector('.pst-pic-input'),q=clean(input&&input.value),api=window.PSTProjectIntelligenceConversationV2||window.PSTProjectIntelligenceConversationV1;
  if(!pid||!q||!api||!api._test||typeof api._test.session!=='function')return false;
  var s=api._test.session(pid);if(s.busy)return true;s.busy=true;s.turns.push({role:'user',content:q});if(input)input.value='';
  try{if(typeof api.mount==='function')api.mount(pid);}catch(e){}setPicState(root,'Po rifreskoj të dhënat e projektit…',false);
  try{
    var ctx=typeof api._test.context==='function'?await api._test.context(pid):{},r=projectFallbackAnswer(ctx,q),text=r.answer+(r.suggested_next_step?'\n\nUnë do të bëja: '+r.suggested_next_step:'');
    s.turns.push({role:'assistant',content:text,result:r});setPicState(root,'',false);
  }catch(e){s.turns.push({role:'assistant',content:'PPPP nuk arriti t’i rifreskojë të dhënat e projektit: '+clean(e&&e.message||e)});setPicState(root,clean(e&&e.message||e),true);}
  finally{s.busy=false;try{if(typeof api.mount==='function')api.mount(pid);}catch(e){}}
  return true;
}
function projectUxCapture(ev){
  var t=ev.target&&ev.target.closest?ev.target.closest('[data-pst-ux-back],[data-pst-ux-kpi],[data-csf-action],[data-pwf-action],[data-pwf-area],[data-pwf-stage],.pst-pic-send'):null;if(!t)return;
  if(t.hasAttribute('data-pst-ux-back')){ev.preventDefault();ev.stopPropagation();if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();return goBackOneStep();}
  if(t.hasAttribute('data-pst-ux-kpi')){ev.preventDefault();ev.stopPropagation();if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();rememberProjectRoute();var r=handleKpi(t.getAttribute('data-pst-ux-kpi'));scheduleProjectReconcile();return r;}
  if(t.classList&&t.classList.contains('pst-pic-send')&&!hasAiKey()){
    ev.preventDefault();ev.stopPropagation();if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();askProjectFallback(t);return;
  }
  var csf=t.getAttribute&&t.getAttribute('data-csf-action'),pwf=t.getAttribute&&t.getAttribute('data-pwf-action');
  if(csf==='edit'||pwf==='open-client-offer'){
    if(latestClientOfferAny()){
      ev.preventDefault();ev.stopPropagation();if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();rememberProjectRoute();openRealClientOffer();return;
    }
  }
  if(pwf==='return-project'&&document.querySelector('.page.active:not(#page-workspace-project)')){
    ev.preventDefault();ev.stopPropagation();if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();return goBackOneStep();
  }
  if(t.hasAttribute('data-pwf-area')||t.hasAttribute('data-pwf-stage'))rememberProjectRoute();
  scheduleProjectReconcile();[0,100,260].forEach(function(ms){setTimeout(ensureLegacyBack,ms);});
}
function structuredEditCapture(ev){
  var t=ev.target&&ev.target.closest?ev.target.closest('[data-csf-action="edit"],[data-pst-structured-edit="1"]'):null;
  if(!t)return;
  var o=latestClientOfferAny()||bestStructuredOffer();
  if(!o)return;
  ev.preventDefault();
  ev.stopPropagation();
  if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
  rememberProjectRoute();
  openStructuredOffer(normalizeClientOffer(o));
}

/* Registered before cached Commercial/Project modules are bootstrapped. */
window.addEventListener('click',projectUxCapture,true);
window.addEventListener('click',structuredEditCapture,true);

if(!install()){
  [0,150,500,1200,2500].forEach(function(ms){setTimeout(install,ms);});
}
function installProjectUx(){ensureUxCss();ensureProjectObserver();reconcileProjectUi();ensureLegacyBack();}
document.addEventListener('pst:modules-ready',function(){scheduleProjectReconcile();[0,120,400].forEach(function(ms){setTimeout(ensureLegacyBack,ms);});},{once:true});
[0,180,650,1500,3000].forEach(function(ms){setTimeout(installProjectUx,ms);});

window.PSTOfferResaveFixV1={
  install:install,
  bestStructuredOffer:bestStructuredOffer,
  openStructuredOffer:openStructuredOffer,
  openRealClientOffer:openRealClientOffer,
  goBackOneStep:goBackOneStep,
  _test:{structuredOffers:structuredOffers,structuredRows:structuredRows,structuredEditCapture:structuredEditCapture,forceVisiblePage:forceVisiblePage,openOfferEditorPage:openOfferEditorPage,cleanStructuredOfferChrome:cleanStructuredOfferChrome,scheduleStructuredOfferChromeCleanup:scheduleStructuredOfferChromeCleanup,watchStructuredOfferChrome:watchStructuredOfferChrome,latestClientOfferAny:latestClientOfferAny,normalizeClientOffer:normalizeClientOffer,reconcileProjectUi:reconcileProjectUi,makeKpisActionable:makeKpisActionable,removeAdvancedAnalysis:removeAdvancedAnalysis,ensureProjectBack:ensureProjectBack,ensureLegacyBack:ensureLegacyBack,rememberProjectRoute:rememberProjectRoute,restoreProjectRoute:restoreProjectRoute,projectFallbackAnswer:projectFallbackAnswer,askProjectFallback:askProjectFallback,projectUxCapture:projectUxCapture,pieceComparisons:pieceComparisons}
};
})();
