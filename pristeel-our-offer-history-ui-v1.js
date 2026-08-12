/* PRISTEEL our-offer revision UI v1
 * Presentation-only layer for Project-First > Commercial.
 * Shows one current client quote and keeps older canonical quotes in revision history.
 */
(function(){
'use strict';
if(window.__pstOurOfferHistoryUiV1)return;window.__pstOurOfferHistoryUiV1=true;
function A(v){return Array.isArray(v)?v:[];}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){var n=parseFloat(v);return isFinite(n)?n:null;}
function D(v){var d=v?new Date(v):null;return d&&!isNaN(d)?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function M(v,c){var n=N(v);return n==null?'—':n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(c||'EUR');}
function docName(r){return String(r&&(r.doc_nr||r.document_nr||r.offer_ref||r.reference)||'Ofertë');}
function amount(r){var c=String(r&&r.currency||'EUR').toUpperCase(),a=N(r&&r.total_amount),e=N(r&&r.total_eur);if(a==null)a=e;var out=M(a,c);if(c!=='EUR'&&e!=null)out+=' · ≈ '+M(e,'EUR');return out;}
function row(r,current){return'<div class="pst-quo-row'+(current?' current':'')+'"><div><div class="pst-quo-title">'+E(docName(r))+(current?'<span>AKTUALE</span>':'')+'</div><small>'+E(D(r&&(r.updated_at||r.created_at)))+'</small></div><b>'+E(amount(r))+'</b></div>';}
function findCard(){var page=document.getElementById('page-workspace-project');if(!page)return null;var cards=A([].slice.call(page.querySelectorAll('.pf2-card')));return cards.find(function(c){var b=c.querySelector('header b');return b&&/ofertat\s+tona/i.test(b.textContent||'');})||null;}
function render(){
 var d=window.__pstIntegrityLastData||{},card=findCard();if(!card)return false;
 var all=A(d.ourOffers),cur=d.currentOurOffer||all[0]||null,hist=A(d.ourOfferHistory);if(!d.ourOfferHistory&&cur)hist=all.filter(function(x){return x!==cur;});
 var header=card.querySelector('header span');if(header)header.textContent=cur?('1 aktuale · '+hist.length+' revizione'):'0 dokumente';
 var body=card.children&&card.children[1];if(!body)return false;
 if(!cur){body.innerHTML='<div class="pf2-empty">Nuk ka ofertë të regjistruar.</div>';return true;}
 body.innerHTML='<div class="pst-quo-current">'+row(cur,true)+'</div>'+(hist.length?'<details class="pst-quo-history"><summary>Historiku i revizioneve ('+hist.length+')</summary>'+hist.map(function(r){return row(r,false);}).join('')+'</details>':'');
 return true;
}
function schedule(){setTimeout(render,0);setTimeout(render,80);setTimeout(render,220);}
document.addEventListener('click',function(e){var t=e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="commercial"],[data-pf2-action="tab:commercial"]');if(t)schedule();},true);
document.addEventListener('pst:modules-ready',function(){var on=document.querySelector('[data-pf2-tab="commercial"].on');if(on)schedule();},{once:true});
var s=document.createElement('style');s.textContent='.pst-quo-current{padding:2px 0}.pst-quo-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:9px 10px;border-bottom:1px solid #edf1f2;color:#526168}.pst-quo-row.current{background:#f4faf7;border:1px solid #dceee4;border-radius:9px;margin:8px 10px}.pst-quo-title{font-size:9px;font-weight:750;color:#3d4d54}.pst-quo-title span{display:inline-block;margin-left:6px;padding:2px 5px;border-radius:999px;background:#e3f3e9;color:#2f7657;font-size:6.5px}.pst-quo-row small{display:block;color:#8a969b;font-size:7px;margin-top:2px}.pst-quo-row>b{font-size:8.5px;white-space:nowrap}.pst-quo-history{margin:7px 10px 10px;border-top:1px solid #edf1f2}.pst-quo-history summary{cursor:pointer;padding:8px 0;font-size:8px;font-weight:700;color:#69777d}';document.head.appendChild(s);
window.PSTOurOfferHistoryUiV1={render:render,schedule:schedule,findCard:findCard};
})();