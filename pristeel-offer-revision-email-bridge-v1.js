/* PRISTEEL Offer Revision Email Bridge v1 */
(function(){
'use strict';
if(window.__pstOfferRevisionEmailBridgeV1)return;window.__pstOfferRevisionEmailBridgeV1=true;
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function N(v){var x=parseFloat(S(v).replace(',','.'));return isFinite(x)?x:0;}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');}
function money(v,c){return N(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(c||'EUR');}
function decimal(v,n){return N(v).toLocaleString('de-DE',{minimumFractionDigits:n,maximumFractionDigits:n});}
function install(){var H=window.PSTOfferRevisionEmailDraftV1;if(!H||typeof H.createDraftFromCurrentOffer!=='function')return false;var W=window.PSTOfferPdfEmailWorkflowV1||(window.PSTOfferPdfEmailWorkflowV1={});W.createDraftFromCurrentOffer=function(options){return H.createDraftFromCurrentOffer(options);};return true;}
function loadCommercialSimplified(){if(window.PSTProjectCommercialSimplifiedV1||document.querySelector('script[data-pst-project-commercial-simplified]'))return;var s=document.createElement('script');s.src='pristeel-project-commercial-simplified-v1.js?v=20260823-1';s.defer=true;s.setAttribute('data-pst-project-commercial-simplified','1');s.onload=function(){schedulePieceOfferCards();};document.head.appendChild(s);}
function piecePositions(o){return A(o&&o.positions).filter(function(p){return S(p&&p.unit).toLowerCase()==='pc'&&N(p&&(p.price_neg!=null?p.price_neg:p.price))>0;});}
function pieceLabel(p){var k=S(p&&p.key).toLowerCase(),m=k.match(/pole[_-]?(\d+)m/);if(m)return m[1]+' m';var d=S(p&&(p.desc||p.description));m=d.match(/\b(6|9|12)\s*m\b/i);return m?m[1]+' m':S(p&&(p.desc||p.description||p.key)||'Pozicion');}
function pieceGross(p,o){var g=N(p&&p.price_gross);if(g>0)return g;var net=N(p&&(p.price_neg!=null?p.price_neg:p.price)),vat=N(p&&p.vat_pct);if(!(vat>0))vat=N(o&&o.vat_pct);return net>0?net*(1+vat/100):0;}
function pieceScope(o){var t=(S(o&&o.inclusions)+' '+S(o&&o.notes)+' '+S(o&&o.raw_text)).toLowerCase(),parts=[];if(/galvan|zink|zinc/.test(t))parts.push('zinkim');if(/erection|installation|montim|monta/.test(t))parts.push('montim');return parts.length?parts.join(' + '):'Sipas ofertës';}
function tubeWeight(seg){var D=N(seg&&seg.od_mm),t=N(seg&&seg.t_mm),L=N(seg&&seg.length_mm);if(!(D>0&&t>0&&L>0&&D>2*t))return 0;return 0.0246615*t*(D-t)*(L/1000);}
function pieceWeight(p){var saved=N(p&&p.theoretical_steel_weight_kg);if(saved>0)return saved;var main=tubeWeight(p&&p.main_chs),top=tubeWeight(p&&p.top_spigot),sum=main+top;return sum>0?sum:0;}
function pieceNetKg(p){var saved=N(p&&p.all_in_net_eur_per_kg);if(saved>0)return saved;var w=pieceWeight(p),net=N(p&&(p.price_neg!=null?p.price_neg:p.price));return w>0&&net>0?net/w:0;}
function pieceGrossKg(p,o){var saved=N(p&&p.all_in_gross_eur_per_kg);if(saved>0)return saved;var w=pieceWeight(p),gross=pieceGross(p,o);return w>0&&gross>0?gross/w:0;}
function dim(seg){var D=N(seg&&seg.od_mm),t=N(seg&&seg.t_mm),L=N(seg&&seg.length_mm);return D>0&&t>0&&L>0?'Ø'+decimal(D,D%1?1:0)+'×'+decimal(t,t%1?1:0)+' · L'+decimal(L/1000,2)+'m':'';}
function pieceText(p,o,cur){var net=N(p.price_neg!=null?p.price_neg:p.price),gross=pieceGross(p,o),w=pieceWeight(p),nk=pieceNetKg(p),gk=pieceGrossKg(p,o),dims=[dim(p.main_chs),dim(p.top_spigot)].filter(Boolean).join(' + '),parts=[];if(dims)parts.push(dims);if(w>0)parts.push(decimal(w,2)+' kg');parts.push(money(net,cur)+'/pc net');if(gross>0)parts.push(money(gross,cur)+'/pc bruto');if(nk>0)parts.push(decimal(nk,3)+' '+cur+'/kg net');if(gk>0)parts.push(decimal(gk,3)+' '+cur+'/kg bruto');return parts.join(' · ');}
function kv(label,value){return'<div class="pst-csf-kv"><span>'+E(label)+'</span><b>'+E(value||'—')+'</b></div>';}
function decoratePieceOfferCards(){
 var d=window.__pstIntegrityLastData||{},offers=A(d.supplierOffers),root=document.querySelector('[data-pst-csf="1"]');if(!root)return false;
 var cards=[].slice.call(root.querySelectorAll('.pst-csf-supplier'));if(!cards.length)return false;
 cards.forEach(function(card,i){var o=offers[i],ps=piecePositions(o);if(!o||!ps.length)return;var cur=S(o.currency||'EUR').toUpperCase()||'EUR',vat=N(o.vat_pct),head=card.querySelector('header>b'),grid=card.querySelector('.pst-csf-kvs');if(head)head.textContent=ps.length+' çmime / copë';if(!grid)return;var html=ps.map(function(p){return kv(pieceLabel(p),pieceText(p,o,cur));}).join('');html+=kv('TVSH',vat>0?vat.toLocaleString('de-DE',{maximumFractionDigits:2})+'%':'—');html+=kv('Përfshin',pieceScope(o));html+=kv('Baza e kg','Peshë teorike: main CHS + tubi Ø88.9 i plotë; pllaka bazë, unaza, saldimi dhe zinku i shtuar nuk përfshihen pa dimensione.');grid.innerHTML=html;card.setAttribute('data-pst-piece-offer','1');});
 return true;
}
function wrapCommercialRender(){var C=window.PSTProjectCommercialSimplifiedV1;if(!C||typeof C.render!=='function'||C.render.__pstPieceOfferCards)return false;var base=C.render;var wrapped=function(){var out=base.apply(this,arguments);setTimeout(decoratePieceOfferCards,0);return out;};wrapped.__pstPieceOfferCards=true;wrapped.__base=base;C.render=wrapped;return true;}
function schedulePieceOfferCards(){[0,80,220,500,900].forEach(function(ms){setTimeout(function(){wrapCommercialRender();decoratePieceOfferCards();},ms);});}
[0,120,400,900,1800].forEach(function(ms){setTimeout(function(){install();loadCommercialSimplified();schedulePieceOfferCards();},ms);});
document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#pst-ora-save-draft'))install();if(e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="commercial"],[data-pf2-action="tab:commercial"],[data-pwf-stage="offers"],[data-pwf-stage="comparison"]'))schedulePieceOfferCards();},true);
document.addEventListener('pst:modules-ready',function(){install();loadCommercialSimplified();schedulePieceOfferCards();},{once:true});
document.addEventListener('pst:offer-saved',schedulePieceOfferCards);
loadCommercialSimplified();schedulePieceOfferCards();
window.PSTOfferRevisionEmailBridgeV1={install:install,loadCommercialSimplified:loadCommercialSimplified,decoratePieceOfferCards:decoratePieceOfferCards,wrapCommercialRender:wrapCommercialRender,_test:{piecePositions:piecePositions,pieceLabel:pieceLabel,pieceGross:pieceGross,pieceScope:pieceScope,tubeWeight:tubeWeight,pieceWeight:pieceWeight,pieceNetKg:pieceNetKg,pieceGrossKg:pieceGrossKg,pieceText:pieceText}};
})();
