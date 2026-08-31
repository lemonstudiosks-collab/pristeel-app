/* PRISTEEL Opportunities Daily v1
 * Decision-first presentation over the existing KRPP/APP/TED tender engines.
 * Reuses Tender Priority Actions for ranking and all REVIEW/GO/NO-GO behavior.
 * No independent tender scoring, promotion logic or outbound sending.
 */
(function(){
'use strict';
if(window.__pstOpportunitiesDailyV1)return;window.__pstOpportunitiesDailyV1=true;
var busy=false,last=0,rows=[],tedEntryObserver=null;
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function page(){return document.getElementById('page-kek-tenders');}
function active(){var p=page();return !!(p&&p.classList.contains('active')&&p.style.display!=='none');}
function api(){return window.PSTTenderPriorityActionsV1||window.PSTTenderPriorityActionsV2||null;}
function ensureTedSalesEntry(){
 var p=page();if(!p)return false;var focus=p.querySelector('#pst-opportunities-focus');if(!focus)return false;var head=focus.querySelector('header');if(!head)return false;
 var existing=head.querySelector('#pst-ted-sales-entry');if(existing)return true;
 var a=document.createElement('a');a.id='pst-ted-sales-entry';a.className='pst-ted-sales-entry';a.href='ted-sales.html';a.setAttribute('aria-label','Hap TED Sales Outreach');
 a.innerHTML='<span><b>TED Sales</b><small>Outreach &amp; follow-up</small></span><i>→</i>';
 head.appendChild(a);return true;
}
function watchTedSalesEntry(){
 if(tedEntryObserver)return;var p=page();if(!p)return;
 tedEntryObserver=new MutationObserver(function(){if(active())ensureTedSalesEntry();});
 tedEntryObserver.observe(p,{childList:true,subtree:true});
 ensureTedSalesEntry();
}
function ensureStructure(){
 var p=page();if(!p)return null;var head=p.querySelector('.pst-kek-head');if(!head)return null;
 var focus=p.querySelector('#pst-opportunities-focus');
 if(!focus){focus=document.createElement('section');focus.id='pst-opportunities-focus';focus.innerHTML='<header><div><span>VENDIMET</span><h2>Çfarë duhet të vendosim?</h2><p>PPPP filtron zhurmën. Këtu dalin vetëm mundësitë që meritojnë shqyrtim dhe vendim.</p></div></header><div id="pst-opportunities-list"><div class="pst-opp-loading">Duke përzgjedhur mundësitë…</div></div>';head.insertAdjacentElement('afterend',focus);}
 var details=p.querySelector('#pst-opportunities-all');if(!details){var actions=head.querySelector('.pst-kek-actions'),filter=p.querySelector('.pst-kek-filter'),card=p.querySelector('.pst-kek-card');details=document.createElement('details');details.id='pst-opportunities-all';details.innerHTML='<summary><div><b>Burimet dhe lista e plotë</b><span>Kërkimi, filtrat, KRPP, APP, TED dhe historiku i plotë</span></div><i>Hap</i></summary><div class="pst-opp-all-body"></div>';focus.insertAdjacentElement('afterend',details);var body=details.querySelector('.pst-opp-all-body');if(actions)body.appendChild(actions);if(filter)body.appendChild(filter);if(card)body.appendChild(card);}
 ensureTedSalesEntry();watchTedSalesEntry();return focus;
}
function direct(r){var P=api();return P&&P.phase(r)==='opportunity';}
function sourceText(r){var P=api();return P?P.sourceLabel(r):'Tender';}
function reason(r){var P=api();return P?P.reason(r):'Kërkon shqyrtim.';}
function dateText(r){var P=api();return P&&r.deadline?P.dateText(r.deadline):'Pa afat';}
function scoreText(r){var n=Number(r&&r.relevance_score);return isFinite(n)&&n>0?Math.round(n)+'% relevance':'Për shqyrtim';}
function card(r){var P=api(),isDirect=direct(r),fit=P?P.fit(r):'possible',mode=isDirect?'TENDER AKTIV':'FITUES I PUBLIKUAR';return '<article class="pst-opp-decision '+E(fit)+'" role="button" tabindex="0" data-pst-opp-tender="'+E(r.id)+'"><div class="pst-opp-main"><div class="pst-opp-meta"><span>'+E(mode)+'</span><span>'+E(sourceText(r))+'</span><span>'+E(scoreText(r).replace('relevance','përshtatje'))+'</span></div><h3>'+E(r.title||'Mundësi pa titull')+'</h3><p>'+E(reason(r))+'</p><small>Afati: '+E(dateText(r))+(r.authority?' · '+E(r.authority):'')+'</small></div><div class="pst-opp-open"><b>Hap mundësinë</b><span>→</span></div></article>';}
function render(list){ensureStructure();var h=document.getElementById('pst-opportunities-list');if(!h)return false;rows=A(list);h.innerHTML=rows.length?rows.map(card).join(''):'<div class="pst-opp-clear"><b>Nuk ka mundësi që kërkon vendim tani.</b><span>Lista e plotë dhe burimet vazhdojnë të punojnë në prapaskenë.</span></div>';ensureTedSalesEntry();return true;}
async function load(force){if(!active())return false;ensureStructure();var P=api();if(!P||typeof P.refresh!=='function'||typeof P.priorityRows!=='function'){var h=document.getElementById('pst-opportunities-list');if(h)h.innerHTML='<div class="pst-opp-clear"><b>Prioritizimi po ngarkohet.</b><span>Lista e plotë mbetet e disponueshme poshtë.</span></div>';return false;}if(busy)return true;if(!force&&last&&Date.now()-last<30000){render(rows);return true;}busy=true;try{var all=await P.refresh(!!force);rows=P.priorityRows(all);last=Date.now();render(rows);return true;}catch(e){var x=document.getElementById('pst-opportunities-list');if(x)x.innerHTML='<div class="pst-opp-clear"><b>Mundësitë prioritare nuk u ngarkuan.</b><span>Përdor listën e plotë derisa të rifreskohet prioritizimi.</span></div>';try{console.warn('PPPP Opportunities Daily:',e);}catch(z){}return false;}finally{busy=false;}}
async function act(kind,id,btn){var P=api();if(!P)return false;btn.disabled=true;var old=btn.textContent;btn.textContent='…';try{if(kind==='go')await P.go(id);else if(kind==='review')await P.review(id);else if(kind==='nogo')await P.noGo(id);else if(kind==='draft')await P.prepareDraft(id);else return false;if(kind!=='draft'){last=0;await load(true);}return true;}catch(e){btn.disabled=false;btn.textContent=old;alert(e&&e.message||e);return false;}}
function click(e){var c=e.target&&e.target.closest?e.target.closest('[data-pst-opp-tender]'):null;if(!c||!active())return;e.preventDefault();var id=c.getAttribute('data-pst-opp-tender'),X=window.PSTProjectCentricWorkflowV1;if(X&&typeof X.openTender==='function')X.openTender(id);else if(typeof window.pstTenderIntelligence==='function')window.pstTenderIntelligence(id);}
function css(){if(document.getElementById('pst-opportunities-daily-css'))return;var s=document.createElement('style');s.id='pst-opportunities-daily-css';s.textContent=`
#page-kek-tenders.active .pst-kek-head{align-items:flex-start!important}#page-kek-tenders.active .pst-kek-head>.pst-kek-actions{display:none!important}
#pst-opportunities-focus{margin-bottom:12px;padding:17px 18px;border:1px solid #DFE7EA;border-top:4px solid #B18A4F;border-radius:14px;background:#fff;box-shadow:0 4px 16px rgba(45,62,70,.05)}#pst-opportunities-focus>header{display:flex;justify-content:space-between;align-items:flex-start;gap:18px}#pst-opportunities-focus>header>div{min-width:0;flex:1}#pst-opportunities-focus>header span{font-size:8px;font-weight:900;letter-spacing:.13em;color:#896C3E}#pst-opportunities-focus h2{margin:3px 0 0;font-size:18px;color:#30434B}#pst-opportunities-focus p{margin:4px 0 0;font-size:9px;color:#819096}
#pst-ted-sales-entry{flex:0 0 auto;display:flex;align-items:center;gap:11px;min-width:158px;padding:10px 12px;border:1px solid #D8C6A8;border-radius:11px;background:#FFFCF7;text-decoration:none;box-shadow:0 2px 8px rgba(80,58,25,.04)}#pst-ted-sales-entry:hover{border-color:#B18A4F;background:#FFF9EE}#pst-ted-sales-entry>span{display:flex;flex-direction:column;gap:2px;letter-spacing:normal!important}#pst-ted-sales-entry b{font-size:10px;color:#6F542D}#pst-ted-sales-entry small{font-size:7.5px;font-weight:650;color:#9A8666;letter-spacing:0}#pst-ted-sales-entry i{font-style:normal;font-size:17px;color:#A65F2E}
#pst-opportunities-list{display:grid;gap:8px;margin-top:13px}.pst-opp-decision{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center;padding:18px 19px;border:1px solid #E2E8EA;border-left:5px solid #B7C4C9;border-radius:15px;background:#fff;cursor:pointer;box-shadow:0 3px 14px rgba(40,65,77,.035)}.pst-opp-decision.strong{border-left-color:#5E9470;background:#FAFCFA}.pst-opp-decision.possible{border-left-color:#C39A54;background:#FFFCF7}.pst-opp-main{min-width:0}.pst-opp-meta{display:flex;gap:8px;flex-wrap:wrap}.pst-opp-meta span{font-size:7px;font-weight:850;letter-spacing:.07em;color:#85949A}.pst-opp-main h3{margin:4px 0 0;font-size:11.5px;color:#344850;line-height:1.35}.pst-opp-main p{margin:4px 0 0;font-size:9px;color:#71838A;line-height:1.45}.pst-opp-main small{display:block;margin-top:5px;font-size:8px;color:#8A989D}.pst-opp-open{display:flex;align-items:center;gap:9px;color:#397F98;padding:8px 11px;border-radius:9px;background:#F0F7F9}.pst-opp-open b{font-size:9px}.pst-opp-open span{font-size:18px}
#pst-opportunities-all{border:1px solid #E1E8EA;border-radius:12px;background:#fff;overflow:hidden}#pst-opportunities-all>summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 15px}#pst-opportunities-all>summary::-webkit-details-marker{display:none}#pst-opportunities-all>summary b{display:block;font-size:10px;color:#475C65}#pst-opportunities-all>summary span{display:block;margin-top:2px;font-size:8px;color:#89979D}#pst-opportunities-all>summary i{font-style:normal;font-size:8px;font-weight:850;color:#896C3E}#pst-opportunities-all[open]>summary{border-bottom:1px solid #E5EBED}.pst-opp-all-body{padding:13px}.pst-opp-all-body>.pst-kek-actions{display:flex!important;margin-bottom:10px}.pst-opp-clear,.pst-opp-loading{padding:13px 3px;color:#718188}.pst-opp-clear b{display:block;font-size:10px}.pst-opp-clear span{display:block;margin-top:3px;font-size:8px;color:#89979D}.pst-opp-loading{font-size:9px;color:#89979D}
@media(max-width:760px){#pst-opportunities-focus>header{flex-direction:column}.pst-opp-decision{grid-template-columns:1fr}.pst-opp-actions{justify-content:flex-start}}
`;document.head.appendChild(s);}
function apply(force){css();if(!active())return false;ensureStructure();load(!!force);return true;}
document.addEventListener('click',click,true);document.addEventListener('pst:modules-ready',function(){apply(false);},{once:true});window.addEventListener('pageshow',function(){apply(false);},{once:true});css();if(document.readyState!=='loading')apply(false);
window.PSTOpportunitiesDailyV1={apply:apply,load:load,render:render,act:act,ensureTedSalesEntry:ensureTedSalesEntry,_test:{direct:direct,scoreText:scoreText,actionLabel:function(r){return direct(r)?'GO':'DRAFT';}}};
})();