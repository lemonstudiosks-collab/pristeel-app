/* PRISTEEL email-offer intake UI fix v1
 * Stable injection for NodeList-based Project-First cards.
 */
(function(){
'use strict';
if(window.__pstEmailOfferIntakeUIFixV1)return;window.__pstEmailOfferIntakeUIFixV1=true;
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function text(m){return String(m&&(m.body_text||m.body||m.text||m.snippet)||'').replace(/\s+/g,' ').trim();}
function supplier(m){var n=String(m&&m.from_name||'').trim();if(n)return n;var e=String(m&&m.from_email||''),d=(e.split('@')[1]||'').split('.')[0];return d?d.replace(/[-_]+/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase();}):'Furnitor';}
function date(v){var d=v?new Date(v):null;return d&&!isNaN(d)?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function inject(){var api=window.PSTEmailOfferIntakeV1,d=window.__pstIntegrityLastData,page=document.getElementById('page-workspace-project');if(!api||!api._test||!d||!page||!page.classList.contains('pf2-on'))return false;if(document.getElementById('pst-eoi-card'))return true;var cards=Array.prototype.slice.call(page.querySelectorAll('.pf2-card')),target=cards.find(function(c){return /oferta furnitor/i.test(c.textContent||'');});if(!target)return false;var list=api._test.candidates(d,false),html='<section class="pst-eoi-card" id="pst-eoi-card"><header><div><b>Oferta të gjetura në email</b><span>Emaili mund të jetë vetë oferta, edhe pa PDF/Excel.</span></div><button class="pst-eoi-btn" data-eoi-scan>Skano emailat</button></header><div id="pst-eoi-list">';if(list.length)html+=list.map(function(m){var t=text(m),sc=api._test.signalScore(t);return'<div class="pst-eoi-row"><div><b>'+E(m.subject||'(pa subjekt)')+'</b><span>'+E(supplier(m))+' · '+E(date(m.sent_at||m.created_at))+' · sinjal '+sc+'</span><p>'+E(t.slice(0,250))+'</p></div><button class="pst-eoi-btn p" data-eoi-analyze="'+E(m.gmail_message_id||m.id||'')+'">Analizo ofertën</button></div>';}).join('');else html+='<div class="pst-eoi-empty">Nuk u dallua ofertë nga teksti i ruajtur. Kliko “Skano emailat” për të lexuar body-n e plotë nga Gmail.</div>';html+='</div></section>';target.insertAdjacentHTML('beforebegin',html);return true;}
function schedule(){[40,180,450,900].forEach(function(ms){setTimeout(inject,ms);});}
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-pf2-tab],[data-pm-open]'))schedule();},true);document.addEventListener('pst:modules-ready',schedule,{once:true});window.addEventListener('pageshow',schedule,{once:true});window.PSTEmailOfferIntakeUIFixV1={inject:inject};schedule();
})();
