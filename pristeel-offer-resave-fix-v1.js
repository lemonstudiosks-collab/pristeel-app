/* PRISTEEL repeated offer save fix v5
 * Keeps the same QUO record editable across multiple days/sessions.
 * Saving is not sending: a saved QUO is stored as open/saved unless it already has a sent marker.
 * Existing sent markers are preserved when a saved offer is edited again.
 * The legacy registerDocNr collision guard remains authoritative for legacy numbers.
 * Modern PST-OFF-YYYY-MM-NNN numbers are persisted here when legacy registerDocNr cannot parse them.
 *
 * Structured project offers use their source offer only as pricing/scope evidence. The source DRAFT
 * reference is never used as the customer quotation number. A canonical PST-OFF number is allocated
 * (or the existing linked QUO is reused), project/client/contact fields are hydrated from canonical
 * project data, pending quantities stay visibly pending, and false EUR 0.00 totals are suppressed.
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
function canonicalOfferNr(v){
  var s=clean(v),m=s.match(/^PST-OFF-(\d{4})-(\d{2})-(\d{1,4})$/i);
  if(m)return{nr:s,year:+m[1],month:m[2],seq:+m[3]};
  m=s.match(/^PST-OFF-(\d{4})-(\d{1,4})$/i);
  return m?{nr:s,year:+m[1],month:'',seq:+m[2]}:null;
}
function currentProjectId(o){
  var d=window.__pstIntegrityLastData||{},p=d.project||d.currentProject||{};
  return clean(o&&o.project_id||window._curProjId||window.__pstCurrentProjectId||p.id||p.project_id||'');
}
function structuredSourceId(o){return clean(o&&(o.id||o.offer_id)||'');}
function structuredRef(o){return clean(o&&(o.offer_ref||o.reference)||'');}
function structuredHasPendingRows(){
  return !!(window.__pstStructuredOfferBeingEdited&&A(window.oferPos).some(function(p){return !!(p&&p._pstStructured&&p._pstQtyPending);}));
}
function markPreviewDocumentState(status){
  var root=document.getElementById('of-pre');if(!root)return false;
  var s=clean(status||'saved').toLowerCase(),m=root.querySelector('[data-pst-document-state-marker="1"]');
  if(!m){m=document.createElement('span');m.setAttribute('data-pst-document-state-marker','1');m.setAttribute('data-html2canvas-ignore','true');m.style.display='none';root.appendChild(m);}
  m.textContent=s==='sent'?'SENT':'SAVED';
  root.setAttribute('data-pst-document-status',s==='sent'?'sent':'saved');
  return true;
}
function syncMemory(nr,project,client,totalEur,payPlan,state,revenueBreakdown,followupStatus){
  var d=window.__pstIntegrityLastData;if(!d)return;
  var rows=Array.isArray(d.ourOffers)?d.ourOffers:[],row=null;
  for(var i=0;i<rows.length;i++){
    if(String(rows[i]&&(rows[i].doc_nr||rows[i].document_nr)||'')===String(nr)){row=rows[i];break;}
  }
  if(!row){row={doc_nr:nr,series:'QUO',created_at:new Date().toISOString()};rows.unshift(row);d.ourOffers=rows;}
  row.project=project||row.project||'';
  row.client=client||row.client||'';
  row.total_eur=(totalEur==null?null:totalEur);
  row.payment_plan=payPlan||row.payment_plan||null;
  row.offer_state=state;
  if(revenueBreakdown!==undefined)row.revenue_breakdown=revenueBreakdown;
  row.followup_status=followupStatus||row.followup_status||'open';
  var docStatus=clean(state&&state.pst_document_status||'saved').toLowerCase();
  row.status=docStatus==='sent'?'sent':'saved';
  row.state=row.status;
  d.currentOurOffer=row;
  d.ourOfferHistory=rows.filter(function(x){return x!==row;});
}
function refreshUi(status){
  markPreviewDocumentState(status||'saved');
  try{if(window.PSTOurOfferHistoryUiV1&&typeof window.PSTOurOfferHistoryUiV1.schedule==='function')window.PSTOurOfferHistoryUiV1.schedule();}catch(e){}
  try{document.dispatchEvent(new CustomEvent('pst:offer-saved'));}catch(e){}
  try{if(window.PSTOfferPdfEmailWorkflowV1&&typeof window.PSTOfferPdfEmailWorkflowV1.patch==='function')window.PSTOfferPdfEmailWorkflowV1.patch();}catch(e){}
}
function structuredTrace(incoming){
  var o=window.__pstStructuredOfferBeingEdited;if(!o)return incoming;
  incoming.structured_source_offer_id=structuredSourceId(o)||incoming.structured_source_offer_id||'';
  incoming.structured_source_ref=structuredRef(o)||incoming.structured_source_ref||'';
  incoming.structured_unit_price_mode=true;
  incoming.structured_pending_quantities=structuredHasPendingRows();
  return incoming;
}
function install(){
  var original=window.registerDocNr;
  if(typeof original!=='function')return false;
  if(original.__pstOfferResaveWrapped)return true;

  function wrapped(series,nr,project,client,totalEur,payPlan,offerState,revenueBreakdown){
    var isQuo=String(series||'').toUpperCase()==='QUO',parsed=isQuo?canonicalOfferNr(nr):null;
    var effectiveTotal=isQuo&&structuredHasPendingRows()?null:totalEur;
    var result=original.call(this,series,nr,project,client,effectiveTotal,payPlan,offerState,revenueBreakdown);
    if(!isQuo)return result;

    return Promise.resolve(result).then(function(value){
      if(typeof window.supaFetch!=='function'||!nr)return value;
      var path='documents_registry?doc_nr=eq.'+encodeURIComponent(nr);
      return window.supaFetch(path+'&select=id,offer_state,followup_status&limit=1').catch(function(){return[];}).then(function(rows){
        var existing=obj(rows&&rows[0]&&rows[0].offer_state),incoming=structuredTrace(obj(offerState)),merged=Object.assign({},existing,incoming);
        var sent=!!(merged.pst_sent_at||merged.sent_at||merged.sent===true||clean(merged.pst_document_status).toLowerCase()==='sent');
        merged.pst_document_status=sent?'sent':'saved';
        var payload={
          project:project||'',client:client||'',total_eur:(effectiveTotal==null?null:effectiveTotal),payment_plan:payPlan||null,
          project_id:currentProjectId(window.__pstStructuredOfferBeingEdited),offer_state:merged,followup_status:sent?(rows&&rows[0]&&rows[0].followup_status||'open'):'open'
        };
        if(revenueBreakdown!==undefined)payload.revenue_breakdown=revenueBreakdown;
        var save;
        if(rows&&rows.length){save=window.supaFetch(path,'PATCH',payload);}
        else if(parsed){
          payload.series='QUO';payload.year=parsed.year;payload.seq=parsed.seq;payload.doc_nr=parsed.nr;
          save=window.supaFetch('documents_registry','POST',payload);
        }else{
          console.error('[offer-resave-fix] invalid customer quotation number',nr);
          return Promise.reject(new Error('Numri i ofertës nuk është valid. Përdor numrin PST-OFF të gjeneruar nga platforma.'));
        }
        return Promise.resolve(save).then(function(){
          syncMemory(nr,project,client,effectiveTotal,payPlan,merged,revenueBreakdown,payload.followup_status);
          refreshUi(merged.pst_document_status);
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
  rows.forEach(add);add(d.currentOurOffer);
  out.sort(function(a,b){var ta=Date.parse(a&&a.updated_at||a&&a.created_at||a&&a.date||0)||0,tb=Date.parse(b&&b.updated_at||b&&b.created_at||b&&b.date||0)||0;return tb-ta;});
  return out;
}
function bestStructuredOffer(){return structuredOffers()[0]||null;}
function structuredPrice(p){return N(p&&(p.unit_price_net_eur!=null?p.unit_price_net_eur:(p.price!=null?p.price:p.price_neg)));}
function structuredRows(o){
  return A(o&&o.positions).map(function(p){
    var pending=p&&(!(N(p.qty)>0)),row={
      desc:clean(p&&p.description||p&&p.desc||p&&p.key||'Pozicion'),
      qty:pending?'':p.qty,unit:clean(p&&p.unit||''),price:structuredPrice(p),_pstStructured:true,_pstQtyPending:pending
    };
    var w=N(p&&p.theoretical_steel_weight_kg),kg=N(p&&p.our_net_eur_per_kg);
    if(w>0)row.theoretical_steel_weight_kg=w;if(kg>0)row.eur_per_kg=kg;
    return row;
  });
}
function sourceMatchesState(st,o){
  st=obj(st);var sid=structuredSourceId(o),ref=structuredRef(o);
  if(sid&&clean(st.structured_source_offer_id)===sid)return true;
  if(ref&&clean(st.structured_source_ref)===ref)return true;
  return !!(st.structured_unit_price_mode&&A(st.oferPos).some(function(p){return p&&p._pstStructured;}));
}
function nextCanonicalNumber(){
  var I=window.PSTOfferNumberIntegrityV1;
  if(I&&typeof I.safeNextOfferNr==='function')return Promise.resolve(I.safeNextOfferNr()).then(function(x){return clean(x&&x.nr);});
  if(typeof window.nextOfferNr==='function')return Promise.resolve(window.nextOfferNr()).then(function(x){return clean(x&&x.nr);});
  var d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0');
  return Promise.resolve('PST-OFF-'+y+'-'+m+'-001');
}
function resolveCanonicalStructuredNumber(o){
  var direct=[o&&o.doc_nr,o&&o.document_nr,o&&o.reference,o&&o.offer_ref].map(canonicalOfferNr).filter(Boolean)[0];
  if(direct)return Promise.resolve(direct.nr);
  var pid=currentProjectId(o);
  if(typeof window.supaFetch!=='function'||!pid)return nextCanonicalNumber();
  var q='documents_registry?series=eq.QUO&project_id=eq.'+encodeURIComponent(pid)+'&select=doc_nr,offer_state,created_at&order=created_at.desc&limit=20';
  return window.supaFetch(q).catch(function(){return[];}).then(function(rows){
    for(var i=0;i<A(rows).length;i++){
      var r=rows[i],p=canonicalOfferNr(r&&r.doc_nr),st=obj(r&&r.offer_state);
      if(p&&clean(st.pst_document_status).toLowerCase()!=='sent'&&sourceMatchesState(st,o))return p.nr;
    }
    return nextCanonicalNumber();
  });
}
function setField(id,value,force){var el=document.getElementById(id),v=clean(value);if(el&&v&&(force||!clean(el.value)))el.value=v;}
function hydrateStructuredProject(o){
  var pid=currentProjectId(o);if(typeof window.supaFetch!=='function'||!pid)return Promise.resolve(null);
  var pReq=window.supaFetch('projects?id=eq.'+encodeURIComponent(pid)+'&select=name,client,ref,location&limit=1').catch(function(){return[];});
  var cReq=window.supaFetch('project_contacts?project_id=eq.'+encodeURIComponent(pid)+'&status=eq.active&select=email,name,company,role,is_primary,direct_count,last_seen&order=direct_count.desc,last_seen.desc&limit=20').catch(function(){return[];});
  return Promise.all([pReq,cReq]).then(function(all){
    var p=A(all[0])[0]||{};setField('of-proj',p.name);setField('of-cli',p.client);setField('of-ref',p.ref);setField('of-loc',p.location);
    var contacts=A(all[1]).filter(function(c){var em=clean(c&&c.email);return em&&!/@(?:pri?s?steel|gmail)\.com$/i.test(em)&&clean(c&&c.role).toLowerCase()!=='supplier';});
    contacts.sort(function(a,b){var ac=clean(a&&a.role).toLowerCase()==='client'?1:0,bc=clean(b&&b.role).toLowerCase()==='client'?1:0;if(ac!==bc)return bc-ac;return N(b&&b.direct_count)-N(a&&a.direct_count);});
    var c=contacts[0];if(c){setField('of-em',c.email);setField('of-con',c.name);}
    return{project:p,contact:c||null};
  });
}
function forceVisiblePage(id){
  var target=document.getElementById(id);if(!target)return false;
  document.querySelectorAll('.page').forEach(function(page){if(page===target)return;page.classList.remove('active');page.style.display='none';});
  target.classList.add('active');target.style.display='block';return true;
}
function cleanStructuredOfferChrome(){
  if(!window.__pstStructuredOfferBeingEdited)return false;
  var preview=document.getElementById('of-preview-col');if(!preview)return false;
  var children=preview.children||[];
  for(var i=0;i<children.length;i++){
    var row=children[i];if(!row||!row.querySelector)continue;
    var isToolbar=row.querySelector('[onclick*="ofBackToEdit"],[onclick*="copyOferte"],[onclick*="downloadPDF"],[onclick*="saveCurrentOffer"]');
    if(!isToolbar)continue;
    if(row.getAttribute('data-pst-structured-preview-toolbar-hidden')==='1'&&row.style.display==='none')return true;
    row.style.setProperty('display','none','important');row.setAttribute('data-pst-structured-preview-toolbar-hidden','1');return true;
  }
  return false;
}
function scheduleStructuredOfferChromeCleanup(){[0,40,100,220,500,900].forEach(function(ms){setTimeout(cleanStructuredOfferChrome,ms);});}
function watchStructuredOfferChrome(){
  var preview=document.getElementById('of-preview-col');if(!preview||typeof MutationObserver==='undefined')return false;
  if(preview.__pstStructuredChromeObserver)return true;
  var observer=new MutationObserver(function(){cleanStructuredOfferChrome();});observer.observe(preview,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});preview.__pstStructuredChromeObserver=observer;return true;
}
function unitPriceWords(lang){
  var M={sr:{label:'Jedinične cijene (neto)',value:'vidi pozicije',note:'Navedene cijene su jedinične. Konačne količine biće obračunate prema potvrđenom rasporedu / narudžbi.'},sq:{label:'Çmimet për njësi (neto)',value:'shih pozicionet',note:'Çmimet e paraqitura janë çmime për njësi. Sasitë përfundimtare do të llogariten sipas planit / porosisë së konfirmuar.'},en:{label:'Unit prices (net)',value:'see positions',note:'The prices shown are unit prices. Final quantities will be calculated according to the confirmed schedule / order.'},de:{label:'Einheitspreise (Netto)',value:'siehe Positionen',note:'Die angegebenen Preise sind Einheitspreise. Die endgültigen Mengen werden gemäß bestätigtem Abruf / Auftrag abgerechnet.'}};return M[lang]||M.en;
}
function structuredPreviewLang(root){var t=clean(root&&root.textContent);if(/\bPONUDA\b|Ukupna cena/i.test(t))return'sr';if(/\bOFERT[ËE]\b|Çmimi total/i.test(t))return'sq';if(/\bANGEBOT\b|Gesamtpreis/i.test(t))return'de';return'en';}
function patchStructuredPendingPreview(){
  var root=document.getElementById('of-pre');if(!root||!window.__pstStructuredOfferBeingEdited)return false;
  var pending=A(window.oferPos).filter(function(p){return p&&p._pstStructured&&p._pstQtyPending;});if(!pending.length)return false;
  var trs=root.querySelectorAll('tbody tr'),remaining=pending.slice();
  Array.prototype.forEach.call(trs,function(tr){
    var cells=tr.querySelectorAll('td');if(cells.length<6)return;
    var desc=clean(cells[1].textContent),idx=-1;
    for(var i=0;i<remaining.length;i++){if(clean(remaining[i].desc)===desc){idx=i;break;}}
    if(idx<0)return;remaining.splice(idx,1);cells[2].textContent='—';cells[5].textContent='—';tr.setAttribute('data-pst-qty-pending','1');
  });
  var lang=structuredPreviewLang(root),L=unitPriceWords(lang),labels=root.querySelectorAll('span');
  for(var j=0;j<labels.length;j++){
    var s=clean(labels[j].textContent);
    if(!/^(Ukupna cena\s*\(neto\)|Çmimi total\s*\(neto\)|Gesamtpreis\s*\(Netto\)|Total price\s*\(net\))$/i.test(s))continue;
    var row=labels[j].parentElement,sp=row&&row.querySelectorAll('span');if(sp&&sp.length>=2){sp[0].textContent=L.label;sp[1].textContent=L.value;}
    var box=row&&row.parentElement;if(box&&!box.querySelector('[data-pst-unit-price-note="1"]')){var note=document.createElement('div');note.setAttribute('data-pst-unit-price-note','1');note.style.cssText='margin-top:8px;padding-top:8px;border-top:1px solid #E0D7CC;font-size:11.5px;line-height:1.45;color:#6E665D;text-align:left';note.textContent=L.note;box.appendChild(note);}break;
  }
  return true;
}
function schedulePendingPreviewPatch(){[0,30,100,250,600].forEach(function(ms){setTimeout(patchStructuredPendingPreview,ms);});}
function openOfferEditorPage(){
  var routed=false,L=window.__pstWorkspaceLegacy;
  try{
    if(L&&typeof L.showPage==='function'){L.showPage('oferta');routed=true;}
    else if(typeof window.pstWsLegacy==='function'){window.pstWsLegacy('oferta');routed=true;}
    else if(typeof window.showPage==='function'){window.showPage('oferta');routed=true;}
    else{var C=window.PSTCommercialNavigationFixV1;if(C&&typeof C.openLegacyPage==='function'){C.openLegacyPage('oferta');routed=true;}}
  }catch(e){console.error('[offer-resave-fix] legacy offer route failed',e);}
  var visible=forceVisiblePage('page-oferta');return routed||visible;
}
function renderStructuredEditor(o,rows,nr){
  forceVisiblePage('page-oferta');cleanStructuredOfferChrome();
  try{if(!Array.isArray(window.oferPos))window.oferPos=[];window.oferPos.length=0;rows.forEach(function(row){window.oferPos.push(clone(row));});if(typeof window.renderOferPos==='function')window.renderOferPos();}catch(err){console.error('[offer-resave-fix] structured rows failed',err);}
  try{var el=document.getElementById('of-nr');if(el)el.value=nr||'';}catch(e){}
  try{if(typeof window.genOfer==='function')window.genOfer();}catch(e){}
  patchStructuredPendingPreview();schedulePendingPreviewPatch();cleanStructuredOfferChrome();watchStructuredOfferChrome();scheduleStructuredOfferChromeCleanup();
  try{window.scrollTo({top:0,behavior:'auto'});}catch(e){}
}
function openStructuredOffer(o){
  if(!o||!A(o.positions).length)return false;
  if(!openOfferEditorPage()){console.error('[offer-resave-fix] structured offer editor route unavailable');return false;}
  var rows=structuredRows(o);window.__pstStructuredOfferBeingEdited=o;cleanStructuredOfferChrome();watchStructuredOfferChrome();scheduleStructuredOfferChromeCleanup();
  setTimeout(function(){
    forceVisiblePage('page-oferta');
    Promise.all([hydrateStructuredProject(o),resolveCanonicalStructuredNumber(o)]).then(function(all){renderStructuredEditor(o,rows,clean(all[1]));}).catch(function(err){
      console.error('[offer-resave-fix] structured offer hydration failed',err);
      nextCanonicalNumber().then(function(nr){renderStructuredEditor(o,rows,nr);});
    });
  },120);
  return true;
}
function structuredEditCapture(ev){
  var t=ev.target&&ev.target.closest?ev.target.closest('[data-csf-action="edit"],[data-pst-structured-edit="1"]'):null;if(!t)return;
  var o=bestStructuredOffer();if(!o)return;ev.preventDefault();ev.stopPropagation();if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();openStructuredOffer(o);
}
window.addEventListener('click',structuredEditCapture,true);
if(!install()) [0,150,500,1200,2500].forEach(function(ms){setTimeout(install,ms);});
window.PSTOfferResaveFixV1={
  install:install,bestStructuredOffer:bestStructuredOffer,openStructuredOffer:openStructuredOffer,
  _test:{canonicalOfferNr:canonicalOfferNr,structuredOffers:structuredOffers,structuredRows:structuredRows,structuredEditCapture:structuredEditCapture,forceVisiblePage:forceVisiblePage,openOfferEditorPage:openOfferEditorPage,cleanStructuredOfferChrome:cleanStructuredOfferChrome,scheduleStructuredOfferChromeCleanup:scheduleStructuredOfferChromeCleanup,watchStructuredOfferChrome:watchStructuredOfferChrome,resolveCanonicalStructuredNumber:resolveCanonicalStructuredNumber,patchStructuredPendingPreview:patchStructuredPendingPreview,sourceMatchesState:sourceMatchesState,markPreviewDocumentState:markPreviewDocumentState}
};
})();
