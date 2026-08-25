/* PRISTEEL repeated offer save fix v2
 * Keeps the same QUO record editable across multiple days/sessions.
 * Saving is not sending: a saved QUO is stored as open/saved unless it already has a sent marker.
 * Existing sent markers are preserved when a saved offer is edited again.
 * The legacy registerDocNr collision guard remains authoritative.
 *
 * Production hotfix: this module is loaded with pst_live=Date.now() before the project
 * Commercial modules. It therefore owns structured-draft edit clicks before any stale
 * cached Commercial capture handler can swallow them.
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
function openOfferEditorPage(){
  var L=window.__pstWorkspaceLegacy;
  if(L&&typeof L.showPage==='function'){L.showPage('oferta');return true;}
  if(typeof window.pstWsLegacy==='function'){window.pstWsLegacy('oferta');return true;}
  if(typeof window.showPage==='function'){window.showPage('oferta');return true;}
  var C=window.PSTCommercialNavigationFixV1;
  if(C&&typeof C.openLegacyPage==='function'){C.openLegacyPage('oferta');return true;}
  return false;
}
function openStructuredOffer(o){
  if(!o||!A(o.positions).length)return false;
  if(!openOfferEditorPage()){
    console.error('[offer-resave-fix] structured offer editor route unavailable');
    return false;
  }
  var rows=structuredRows(o),ref=structuredRef(o);
  window.__pstStructuredOfferBeingEdited=o;
  setTimeout(function(){
    try{
      if(!Array.isArray(window.oferPos))window.oferPos=[];
      window.oferPos.length=0;
      rows.forEach(function(row){window.oferPos.push(clone(row));});
      if(typeof window.renderOferPos==='function')window.renderOferPos();
    }catch(err){console.error('[offer-resave-fix] structured rows failed',err);}
    try{var nr=document.getElementById('of-nr');if(nr)nr.value=ref;}catch(e){}
    try{if(typeof window.genOfer==='function')window.genOfer();}catch(e){}
    try{window.scrollTo({top:0,behavior:'auto'});}catch(e){}
  },120);
  return true;
}
function structuredEditCapture(ev){
  var t=ev.target&&ev.target.closest?ev.target.closest('[data-csf-action="edit"],[data-pst-structured-edit="1"]'):null;
  if(!t)return;
  var o=bestStructuredOffer();
  if(!o)return;
  ev.preventDefault();
  ev.stopPropagation();
  if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
  openStructuredOffer(o);
}

/* Registered now, before the cached Commercial modules are bootstrapped. */
window.addEventListener('click',structuredEditCapture,true);

if(!install()){
  [0,150,500,1200,2500].forEach(function(ms){setTimeout(install,ms);});
}
window.PSTOfferResaveFixV1={
  install:install,
  bestStructuredOffer:bestStructuredOffer,
  openStructuredOffer:openStructuredOffer,
  _test:{structuredOffers:structuredOffers,structuredRows:structuredRows,structuredEditCapture:structuredEditCapture}
};
})();
