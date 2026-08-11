/* PRISTEEL invoice project + offer traceability v1
 * Keeps the existing manual-first invoice builder intact while making its DB links explicit.
 * - scopes "Nga oferta" to the current project when project context exists
 * - injects project_id into outgoing/incoming invoice POSTs
 * - records the selected source offer and payment milestone on outgoing invoices
 * - blocks a save if selected offer and selected/current project disagree
 * No invoice amounts, VAT, items, numbering or PDF generation are changed here.
 */
(function(){
'use strict';
if(window.__pstInvoiceProjectLinkV1)return;
window.__pstInvoiceProjectLinkV1=true;

var installedFetch=false,installedRegistry=false;
function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function el(id){return document.getElementById(id);}
function val(id){var x=el(id);return String(x&&x.value||'').trim();}
function contextProjectId(){
  var d=window.__pstIntegrityLastData;
  return String(d&&d.project&&d.project.id||window.__pstCurrentProjectId||window._curProjId||'').trim();
}
function outProjectId(){return val('iv-proj-select')||contextProjectId();}
function inProjectId(){return val('ivin-proj-select')||contextProjectId();}
function selectedOffer(){
  var sel=el('iv-from-quo'),docs=arr(window._quoDocs);
  if(!sel||sel.value==='')return null;
  var i=parseInt(sel.value,10);
  return Number.isFinite(i)?(docs[i]||null):null;
}
function selectedMilestoneIndex(){
  var x=val('iv-milestone');
  if(x==='')return null;
  var n=parseInt(x,10);return Number.isFinite(n)?n:null;
}
function cloneRows(body,fn){
  var list=Array.isArray(body)?body:[body];
  var out=list.map(function(row){return fn(Object.assign({},row||{}));});
  return Array.isArray(body)?out:out[0];
}
function enrichOutgoing(row){
  var pid=outProjectId(),offer=selectedOffer();
  var offerPid=String(offer&&offer.project_id||'').trim();
  if(pid&&offerPid&&pid!==offerPid){
    var e=new Error('Fatura nuk u ruajt: oferta e zgjedhur i përket një projekti tjetër. Rihape Faturat nga projekti i saktë ose zgjidh ofertën e duhur.');
    e.code='PST_INVOICE_PROJECT_OFFER_MISMATCH';
    throw e;
  }
  if(!pid&&offerPid)pid=offerPid;
  if(pid)row.project_id=pid;
  if(offer){
    if(offer.id)row.source_offer_id=offer.id;
    if(offer.doc_nr)row.source_offer_doc_nr=offer.doc_nr;
    var mi=selectedMilestoneIndex();if(mi!==null)row.source_milestone_index=mi;
  }
  return row;
}
function enrichIncoming(row){var pid=inProjectId();if(pid)row.project_id=pid;return row;}
function isPost(path,method,table){return String(method||'GET').toUpperCase()==='POST'&&new RegExp('^'+table+'(?:\\?|$)').test(String(path||''));}
function installFetchGuard(){
  if(installedFetch)return true;
  var original=window.supaFetch;if(typeof original!=='function')return false;
  if(original.__pstInvoiceProjectLinkV1){installedFetch=true;return true;}
  async function wrapped(path,method,body){
    if(isPost(path,method,'invoices_out'))return original.call(this,path,method,cloneRows(body,enrichOutgoing));
    if(isPost(path,method,'invoices_in'))return original.call(this,path,method,cloneRows(body,enrichIncoming));
    return original.apply(this,arguments);
  }
  wrapped.__pstInvoiceProjectLinkV1=true;
  wrapped.__pstOriginalSupaFetch=original;
  window.supaFetch=wrapped;installedFetch=true;return true;
}
function renderOffers(rows,previousId){
  window._quoDocs=arr(rows);
  var sel=el('iv-from-quo');if(!sel)return;
  sel.innerHTML='<option value="">— zgjidh ofertën —</option>'+window._quoDocs.map(function(d,i){
    var total=d&&d.total_eur?(' — '+parseFloat(d.total_eur).toLocaleString('de-DE')+' €'):'';
    return '<option value="'+i+'">'+String(d&&d.doc_nr||'Ofertë')+' — '+String(d&&d.client||'')+total+'</option>';
  }).join('');
  if(previousId){
    var idx=window._quoDocs.findIndex(function(d){return String(d&&d.id||'')===String(previousId);});
    if(idx>=0)sel.value=String(idx);
  }
}
function loadScopedOffers(){
  var pid=outProjectId();
  if(!pid||typeof window.supaFetch!=='function')return null;
  var previous=selectedOffer(),previousId=previous&&previous.id;
  return window.supaFetch('documents_registry?series=eq.QUO&project_id=eq.'+enc(pid)+'&order=created_at.desc&limit=100','GET')
    .then(function(rows){renderOffers(rows,previousId);return rows;});
}
function installRegistryScope(){
  if(installedRegistry)return true;
  var base=window.loadQuoRegistry;if(typeof base!=='function')return false;
  if(base.__pstInvoiceProjectLinkV1){installedRegistry=true;return true;}
  var wrapped=function(){
    if(outProjectId()){
      var p=loadScopedOffers();
      if(p&&typeof p.catch==='function')p.catch(function(e){console.warn('Invoice project offer scope:',e&&e.message);base.apply(window,arguments);});
      return p;
    }
    return base.apply(this,arguments);
  };
  wrapped.__pstInvoiceProjectLinkV1=true;wrapped.__base=base;
  window.loadQuoRegistry=wrapped;installedRegistry=true;return true;
}
function syncSelectedProject(){
  var pid=contextProjectId();if(!pid)return false;
  var out=el('iv-proj-select');if(out&&Array.prototype.some.call(out.options||[],function(o){return String(o.value)===pid;}))out.value=pid;
  var incoming=el('ivin-proj-select');if(incoming&&Array.prototype.some.call(incoming.options||[],function(o){return String(o.value)===pid;}))incoming.value=pid;
  return true;
}
function refresh(){syncSelectedProject();if(outProjectId())loadScopedOffers();}
function install(){installFetchGuard();installRegistryScope();}

install();
[80,220,500,900].forEach(function(ms){setTimeout(function(){install();syncSelectedProject();},ms);});
document.addEventListener('pst:modules-ready',function(){install();syncSelectedProject();},{once:true});
document.addEventListener('change',function(e){if(e.target&&e.target.id==='iv-proj-select')loadScopedOffers();});
window.PSTInvoiceProjectLinkV1={
  install:install,
  currentOutgoingProjectId:outProjectId,
  currentIncomingProjectId:inProjectId,
  selectedOffer:selectedOffer,
  loadScopedOffers:loadScopedOffers,
  refresh:refresh,
  isFetchGuardInstalled:function(){return installedFetch;}
};
})();
