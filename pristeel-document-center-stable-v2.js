/* PRISTEEL Document Center Stable v2
 * Unified offer/invoice register without global observers or polling.
 * Read requests are bounded; create/open actions delegate to existing explicit editors.
 */
(function(){
'use strict';
if(window.__pstDocumentCenterStableV2)return;
window.__pstDocumentCenterStableV2=true;
var WAIT=3500;
var D=window.PST_DOC_CENTER_STABLE={selectedType:'offer',quotes:[],invoices:[],adjustments:[],all:[],loading:null};
var LABEL={offer:'Ofertë',invoice:'Faturë',credit_note:'Notë Kreditore',debit_note:'Notë Debitore'};
function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function num(v){var n=parseFloat(String(v==null?'':v).replace(/\s/g,'').replace(/,(?=\d{1,2}$)/,'.'));return isFinite(n)?n:0;}
function money(v,c){return num(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(c||'EUR');}
function dateText(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('de-DE'):'—';}
function bounded(p){return new Promise(function(resolve){var done=false,t=setTimeout(function(){if(done)return;done=true;resolve([]);},WAIT);Promise.resolve(p).then(function(v){if(done)return;done=true;clearTimeout(t);resolve(arr(v));}).catch(function(){if(done)return;done=true;clearTimeout(t);resolve([]);});});}
function q(path){return typeof window.supaFetch==='function'?bounded(window.supaFetch(path)):Promise.resolve([]);}
function addCss(){if(document.getElementById('pst-document-center-css'))return;var l=document.createElement('link');l.id='pst-document-center-css';l.rel='stylesheet';l.href='pristeel-document-center.css?v=20260807-stable';document.head.appendChild(l);}
function ensurePage(){var p=document.getElementById('page-document-center');if(p)return p;var content=document.querySelector('.content');if(!content)return null;p=document.createElement('div');p.id='page-document-center';p.className='page';p.style.display='none';p.innerHTML='<div class="pst-dc-head"><div><div class="pst-dc-title">Qendra e Dokumenteve</div><div class="pst-dc-sub">Oferta, fatura dhe korrigjime</div></div><button class="pst-dc-close" id="pst-dc-close">Mbyll</button></div><section class="pst-dc-create"><div class="pst-dc-label">LLOJI I DOKUMENTIT</div><div class="pst-dc-types" id="pst-dc-types"></div><button class="pst-dc-new" id="pst-dc-new"><span>Dokument i ri</span></button></section><section class="pst-dc-list-card"><div class="pst-dc-toolbar"><div class="pst-dc-toolbar-title">Regjistri</div><div class="pst-dc-search"><input id="pst-dc-search" placeholder="Kërko numër, klient ose projekt"></div><select class="pst-dc-filter" id="pst-dc-filter"><option value="all">Të gjitha llojet</option><option value="offer">Oferta</option><option value="invoice">Fatura</option><option value="credit_note">Nota kreditore</option><option value="debit_note">Nota debitore</option></select></div><div class="pst-dc-list" id="pst-dc-list"><div class="pst-dc-empty">Gati.</div></div></section>';content.appendChild(p);p.querySelector('#pst-dc-close').onclick=close;p.querySelector('#pst-dc-new').onclick=createSelected;p.querySelector('#pst-dc-search').oninput=render;p.querySelector('#pst-dc-filter').onchange=render;renderTypes();return p;}
function renderTypes(){var h=document.getElementById('pst-dc-types');if(!h)return;h.innerHTML=Object.keys(LABEL).map(function(k){return'<button type="button" class="pst-dc-type'+(D.selectedType===k?' active':'')+'" data-type="'+k+'">'+LABEL[k]+'</button>';}).join('');h.querySelectorAll('[data-type]').forEach(function(b){b.onclick=function(){D.selectedType=b.getAttribute('data-type');renderTypes();};});}
function createSelected(){var t=D.selectedType;if(t==='offer'){if(typeof window.pstNewOffer==='function')window.pstNewOffer();else if(typeof window.oaNew==='function')window.oaNew();return;}if(t==='invoice'){if(typeof window.pstNewInvoice==='function')window.pstNewInvoice();else if(typeof window.showPage==='function'){window.showPage('invoices');if(typeof window.invSwitchTab==='function')window.invSwitchTab('out');}return;}if(typeof window.pstOpenAdjustment==='function')window.pstOpenAdjustment(t,'');}
function quote(r){return{id:r.id,type:'offer',nr:r.doc_nr||r.reference||'',date:r.created_at||'',client:r.client||'',project:r.project||r.project_name||'',amount:num(r.total_eur||r.total),currency:'EUR',raw:r};}
function invoice(r){return{id:r.id,type:'invoice',nr:r.invoice_nr||'',date:r.date||r.created_at||'',client:r.client||'',project:r.project||'',amount:num(r.gross_amount||r.total_price||r.total_eur),currency:r.currency||'EUR',raw:r};}
function adjustment(r){return{id:r.id,type:r.document_type||'credit_note',nr:r.document_nr||'',date:r.document_date||r.created_at||'',client:r.client||'',project:r.project||'',amount:num(r.gross_amount),currency:r.currency||'EUR',raw:r};}
function load(){
  if(D.loading)return D.loading;
  var h=document.getElementById('pst-dc-list');
  if(h)h.innerHTML='<div class="pst-dc-empty">Duke ngarkuar…</div>';
  D.loading=Promise.all([
    q('documents_registry?series=eq.QUO&order=created_at.desc&limit=250'),
    q('invoices_out?order=created_at.desc&limit=250'),
    q('commercial_adjustments?order=created_at.desc&limit=250')
  ]).then(function(out){
    D.quotes=out[0];D.invoices=out[1];D.adjustments=out[2];
    D.all=D.quotes.map(quote).concat(D.invoices.map(invoice),D.adjustments.map(adjustment)).sort(function(a,b){return String(b.date||'').localeCompare(String(a.date||''));});
    render();
    return D.all;
  }).catch(function(){
    return D.all;
  }).finally(function(){
    D.loading=null;
  });
  return D.loading;
}
function actionHtml(r){return'<button type="button" class="pst-dc-action" data-open="'+esc(r.type)+'" data-id="'+esc(r.id)+'">Hap</button>'+(r.type==='invoice'?'<button type="button" class="pst-dc-action credit" data-adjust="credit_note" data-id="'+esc(r.id)+'">Kredito</button><button type="button" class="pst-dc-action debit" data-adjust="debit_note" data-id="'+esc(r.id)+'">Debito</button>':'');}
function row(r){return'<div class="pst-dc-row"><div><span class="pst-dc-kind">'+esc(LABEL[r.type]||r.type)+'</span></div><div class="pst-dc-main"><div class="pst-dc-nr">'+esc(r.nr||'Pa numër')+'</div><div class="pst-dc-meta">'+esc(r.project||'Pa projekt')+'</div></div><div class="pst-dc-client"><div class="pst-dc-nr">'+esc(r.client||'Pa klient')+'</div></div><div class="pst-dc-date">'+dateText(r.date)+'</div><div class="pst-dc-amount">'+money(r.amount,r.currency)+'</div><div class="pst-dc-actions">'+actionHtml(r)+'</div></div>';}
function render(){var h=document.getElementById('pst-dc-list');if(!h)return;var query=String((document.getElementById('pst-dc-search')||{}).value||'').toLowerCase().trim(),filter=String((document.getElementById('pst-dc-filter')||{}).value||'all'),rows=D.all.filter(function(r){return(filter==='all'||r.type===filter)&&(!query||[r.nr,r.client,r.project].join(' ').toLowerCase().indexOf(query)>-1);});h.innerHTML=rows.length?rows.map(row).join(''):'<div class="pst-dc-empty">Nuk u gjet asnjë dokument.</div>';h.querySelectorAll('[data-open]').forEach(function(b){b.onclick=function(){openDoc(b.getAttribute('data-open'),b.getAttribute('data-id'));};});h.querySelectorAll('[data-adjust]').forEach(function(b){b.onclick=function(){if(typeof window.pstOpenAdjustment==='function')window.pstOpenAdjustment(b.getAttribute('data-adjust'),b.getAttribute('data-id'));};});}
function openDoc(t,id){if(t==='offer'){if(typeof window.oaOpenQuoteModal==='function')window.oaOpenQuoteModal(id);else if(typeof window.pstOpenOffer==='function')window.pstOpenOffer(id);return;}if(t==='invoice'){if(typeof window.openInvoiceDetail==='function')window.openInvoiceDetail('out',id);return;}var r=D.adjustments.filter(function(x){return String(x.id)===String(id);})[0];if(r&&typeof window.pstOpenAdjustmentDetail==='function')window.pstOpenAdjustmentDetail(r);}
function open(type){if(type&&LABEL[type])D.selectedType=type;var p=ensurePage();if(!p)return false;document.querySelectorAll('.page').forEach(function(x){x.classList.remove('active');x.style.display='none';});p.style.display='block';p.classList.add('active');renderTypes();var f=document.getElementById('pst-dc-filter');if(f&&type)f.value=type;load();try{window.scrollTo({top:0,behavior:'auto'});}catch(e){}return true;}
function close(){if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('home');else if(typeof window.pstV2Go==='function')window.pstV2Go('home');else if(typeof window.showPage==='function')window.showPage('home');}
function decorateNav(){var nav=document.querySelector('.pst-ws-navbtn[data-key="commercial"]');if(nav)nav.title='Regjistri i ofertave';}
addCss();ensurePage();decorateNav();
document.addEventListener('pst:modules-ready',function(){ensurePage();decorateNav();},{once:true});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.getElementById('page-document-center')&&document.getElementById('page-document-center').classList.contains('active'))close();});
window.pstOpenDocumentCenter=open;window.pstCloseDocumentCenter=close;window.pstRenderDocumentList=render;window.pstCreateSelectedDocument=createSelected;window.pstSelectDocumentType=function(t){if(LABEL[t]){D.selectedType=t;renderTypes();}};window.pstOpenDoc=openDoc;window.PSTDocumentCenterStableV2={open:open,load:load,render:render,state:D};
})();
