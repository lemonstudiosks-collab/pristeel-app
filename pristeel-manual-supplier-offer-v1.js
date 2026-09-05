/* PRISTEEL Manual Supplier Offer v1
 * Human-entered supplier cost basis for phone / WhatsApp / meeting / offline quotes.
 * Creates a canonical public.offers row through the guarded RPC.
 * Never selects a supplier automatically and never sends external communication.
 */
(function(){
'use strict';
if(window.__pstManualSupplierOfferV1)return;
window.__pstManualSupplierOfferV1=true;

var busy=false,lastProject='';
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){var n=parseFloat(S(v).replace(',','.'));return isFinite(n)?n:0;}
function money(v,c){return N(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(c||'EUR');}
function pid(){var d=window.__pstIntegrityLastData||{};return S(window.__pstCurrentProjectId||window._curProjId||(d.project&&d.project.id)||'');}
function api(path,method,body){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('PPPP API nuk është gati.'));return window.supaFetch(path,method,body);}
function canonical(){return window.PSTCanonicalProjectWorkflowV1||null;}
function activeOffers(){var p=document.getElementById('page-workspace-project');return !!(p&&p.classList.contains('active')&&p.getAttribute('data-pwf-area')==='procurement'&&p.getAttribute('data-pwf-stage')==='offers');}
function findSupplierCard(){var p=document.getElementById('pst-pi-body');if(!p)return null;var cards=[].slice.call(p.querySelectorAll('.pf2-card,section'));for(var i=0;i<cards.length;i++){var h=cards[i].querySelector('header b,header h3,.pst-pi-hd b');var t=S(h?h.textContent:'').trim().toLowerCase();if(t==='oferta furnitorësh'||t==='ofertat e furnitorëve')return cards[i];}return null;}
function totalFromForm(){return +(N(val('pst-mso-price'))*N(val('pst-mso-qty'))+N(val('pst-mso-mech'))+N(val('pst-mso-pack'))+N(val('pst-mso-trans'))).toFixed(2);}
function val(id){var e=document.getElementById(id);return e?e.value:'';}
function setStatus(msg,err){var e=document.getElementById('pst-mso-status');if(!e)return;e.textContent=msg||'';e.classList.toggle('err',!!err);}
function updateTotal(){var e=document.getElementById('pst-mso-total');if(e)e.textContent=money(totalFromForm(),val('pst-mso-cur')||'EUR');}
function escClose(e){if(e.key==='Escape')closeModal();}
function closeModal(){var m=document.getElementById('pst-mso-modal');if(m)m.remove();document.removeEventListener('keydown',escClose);busy=false;}
function field(label,id,type,extra){return'<label class="pst-mso-field"><span>'+E(label)+'</span><input id="'+id+'" type="'+(type||'text')+'" '+(extra||'')+'></label>';}
function openModal(){
  if(!pid()){alert('Zgjidh projektin fillimisht.');return;}
  var old=document.getElementById('pst-mso-modal');if(old){old.remove();}
  var m=document.createElement('div');m.id='pst-mso-modal';m.className='pst-mso-backdrop';
  m.innerHTML='<div class="pst-mso-modal" role="dialog" aria-modal="true" aria-labelledby="pst-mso-title">'+
    '<header><div><span>OFERTË FURNITORI · MANUALE</span><h2 id="pst-mso-title">Shto ofertë furnitori</h2><p>Për çmime të marra me telefon, WhatsApp, takim ose jashtë Gmail-it. Ruajtja nuk zgjedh automatikisht furnitorin.</p></div><button type="button" data-mso-close aria-label="Mbyll">×</button></header>'+
    '<div class="pst-mso-grid">'+
      field('Furnitori *','pst-mso-supplier','text','placeholder="p.sh. Eurosteel / Ermal Rula" autocomplete="off"')+
      '<label class="pst-mso-field"><span>Valuta *</span><select id="pst-mso-cur"><option value="EUR">EUR</option><option value="USD">USD</option><option value="CHF">CHF</option><option value="GBP">GBP</option><option value="ALL">ALL</option><option value="MKD">MKD</option></select></label>'+
      field('Çmimi i prodhimit / kg','pst-mso-price','number','min="0" step="0.0001" value="0" inputmode="decimal"')+
      field('Pesha / baza e kalkulimit (kg)','pst-mso-qty','number','min="0" step="0.001" value="0" inputmode="decimal"')+
      field('Punime mekanike','pst-mso-mech','number','min="0" step="0.01" value="0" inputmode="decimal"')+
      field('Paketim','pst-mso-pack','number','min="0" step="0.01" value="0" inputmode="decimal"')+
      field('Transport','pst-mso-trans','number','min="0" step="0.01" value="0" inputmode="decimal"')+
      field('Afati i prodhimit (javë)','pst-mso-delivery','number','min="0" step="1" placeholder="opsionale"')+
      field('Incoterms','pst-mso-inco','text','placeholder="p.sh. DAP Erlangen"')+
      field('Kushtet e pagesës','pst-mso-pay','text','placeholder="p.sh. 30 Tage netto"')+
      field('Vlefshmëria (ditë)','pst-mso-valid','number','min="0" step="1" placeholder="opsionale"')+
      field('Referenca e ofertës','pst-mso-ref','text','placeholder="opsionale"')+
      field('Personi kontaktues','pst-mso-contact','text','placeholder="opsionale"')+
      field('Cilësi / certifikim','pst-mso-cert','text','placeholder="opsionale"')+
      field('Burimi','pst-mso-source','text','placeholder="p.sh. Bisedë telefonike / WhatsApp"')+
      '<label class="pst-mso-field pst-mso-wide"><span>Shënime</span><textarea id="pst-mso-notes" rows="3" placeholder="Scope, përjashtime ose sqarime të ofertës"></textarea></label>'+
    '</div>'+
    '<div class="pst-mso-total"><span>Totali i llogaritur</span><b id="pst-mso-total">0,00 EUR</b><small>Prodhim/kg × peshë + mekanikë + paketim + transport</small></div>'+
    '<div id="pst-mso-fx-wrap" class="pst-mso-fx" hidden>'+field('Kursi → EUR (1 valutë = ? EUR)','pst-mso-fx','number','min="0" step="0.000001" placeholder="i detyrueshëm për jo-EUR"')+'</div>'+
    '<div id="pst-mso-status" class="pst-mso-status"></div>'+
    '<footer><button type="button" class="pst-mso-secondary" data-mso-close>Anulo</button><button type="button" class="pst-mso-primary" id="pst-mso-save">Ruaj ofertën</button></footer>'+
  '</div>';
  document.body.appendChild(m);
  m.addEventListener('click',function(e){if(e.target===m||e.target.closest('[data-mso-close]'))closeModal();});
  [].slice.call(m.querySelectorAll('input')).forEach(function(x){x.addEventListener('input',updateTotal);});
  var c=m.querySelector('#pst-mso-cur');c.addEventListener('change',function(){var w=m.querySelector('#pst-mso-fx-wrap');w.hidden=c.value==='EUR';updateTotal();});
  m.querySelector('#pst-mso-save').addEventListener('click',save);
  document.addEventListener('keydown',escClose);
  setTimeout(function(){var x=m.querySelector('#pst-mso-supplier');if(x)x.focus();},30);
}
function payload(){return{
  supplier:S(val('pst-mso-supplier')).trim(),currency:S(val('pst-mso-cur')||'EUR').trim().toUpperCase(),
  price_kg:N(val('pst-mso-price')),qty_kg:N(val('pst-mso-qty')),mechanical_eur:N(val('pst-mso-mech')),
  packaging_eur:N(val('pst-mso-pack')),transport_eur:N(val('pst-mso-trans')),
  delivery_weeks:S(val('pst-mso-delivery')).trim(),incoterms:S(val('pst-mso-inco')).trim(),
  payment_terms:S(val('pst-mso-pay')).trim(),validity_days:S(val('pst-mso-valid')).trim(),offer_ref:S(val('pst-mso-ref')).trim(),
  contact_person:S(val('pst-mso-contact')).trim(),cert:S(val('pst-mso-cert')).trim(),source:S(val('pst-mso-source')).trim(),
  notes:S(val('pst-mso-notes')).trim(),exchange_rate_to_eur:N(val('pst-mso-fx'))
};}
async function save(){
  if(busy)return;var p=payload();
  if(!p.supplier){setStatus('Shkruaj emrin e furnitorit.',true);return;}
  if(p.price_kg>0&&p.qty_kg<=0){setStatus('Për çmim/kg duhet edhe pesha/baza në kg.',true);return;}
  if(totalFromForm()<=0){setStatus('Oferta duhet të ketë të paktën një vlerë pozitive.',true);return;}
  if(p.currency!=='EUR'&&!(p.exchange_rate_to_eur>0)){setStatus('Për valutë jo-EUR duhet kursi i kontrolluar drejt EUR.',true);return;}
  busy=true;var b=document.getElementById('pst-mso-save');if(b){b.disabled=true;b.textContent='Duke ruajtur…';}setStatus('');
  try{
    var r=await api('rpc/pppp_create_manual_supplier_offer_v1','POST',{p_project_id:pid(),p_payload:p});
    if(Array.isArray(r))r=r[0];
    if(!r||r.ok===false)throw new Error(r&&r.message||'Oferta nuk u ruajt.');
    setStatus('Oferta u ruajt. Furnitori ende nuk është zgjedhur — kjo kërkon aprovimin tënd.',false);
    if(b){b.textContent='U ruajt';}
    await refresh();
    setTimeout(function(){closeModal();inject();},500);
  }catch(e){busy=false;if(b){b.disabled=false;b.textContent='Ruaj ofertën';}setStatus('Gabim: '+S(e&&e.message||e),true);}
}
async function refresh(){var C=canonical();if(C&&typeof C.refresh==='function'){try{await C.refresh('procurement','offers');return;}catch(e){}}var I=window.PSTProjectDataIntegrity;if(I&&typeof I.load==='function'&&pid()){try{var d=await I.load(pid());if(d)window.__pstIntegrityLastData=d;}catch(e){}}}
function manualRows(){return api('offers?project_id=eq.'+encodeURIComponent(pid())+'&origin=eq.manual&select=id,supplier,price_kg,qty_kg,total_amount,total_eur,currency,transport_eur,incoterms,payment_terms,offer_ref,created_at&order=created_at.desc').catch(function(){return[];});}
function decisions(){return api('project_supplier_decisions?project_id=eq.'+encodeURIComponent(pid())+'&status=eq.active&select=supplier_offer_id,decision_type,decided_at').catch(function(){return[];});}
async function renderManualPanel(host){
  if(!host||!pid())return;var panel=host.querySelector('#pst-manual-offers-panel');if(!panel){panel=document.createElement('div');panel.id='pst-manual-offers-panel';host.appendChild(panel);}panel.innerHTML='<div class="pst-mso-loading">Duke kontrolluar ofertat manuale…</div>';
  var rr=await Promise.all([manualRows(),decisions()]),rows=Array.isArray(rr[0])?rr[0]:[],ds=Array.isArray(rr[1])?rr[1]:[];
  if(!rows.length){panel.innerHTML='';return;}
  var selected={};ds.forEach(function(d){if(d&&d.supplier_offer_id)selected[S(d.supplier_offer_id)]=true;});
  panel.innerHTML='<div class="pst-mso-panel-head"><b>Oferta manuale të ruajtura</b><span>'+rows.length+'</span></div>'+rows.map(function(o){var sid=S(o.id),sel=!!selected[sid],tot=N(o.total_amount)||N(o.total_eur);return'<div class="pst-mso-row"><div><b>'+E(o.supplier||'Furnitor')+'</b><small>'+E(money(tot,o.currency||'EUR'))+(N(o.price_kg)>0?' · '+E(N(o.price_kg).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:4})+' EUR/kg'):'')+(N(o.qty_kg)>0?' · '+E(N(o.qty_kg).toLocaleString('de-DE',{maximumFractionDigits:3})+' kg'):'')+'</small></div>'+(sel?'<span class="pst-mso-selected">Baza e zgjedhur</span>':'<button type="button" class="pst-mso-select" data-mso-select="'+E(sid)+'">Zgjidh si prodhues</button>')+'</div>';}).join('');
}
async function selectOffer(id,btn){
  if(!id||!pid())return;if(btn){btn.disabled=true;btn.textContent='Duke aprovuar…';}
  try{
    await api('rpc/pppp_record_supplier_decision_v1','POST',{p_project_id:pid(),p_supplier_offer_id:id,p_decision_type:'selected_producer',p_notes:'Furnitori u zgjodh manualisht nga përdoruesi në PPPP.',p_evidence:{source:'manual_supplier_offer_ui',human_action:true}});
    await refresh();inject();
  }catch(e){if(btn){btn.disabled=false;btn.textContent='Zgjidh si prodhues';}alert('Nuk u aprovua furnitori: '+S(e&&e.message||e));}
}
function ensureButton(card){
  if(!card||card.querySelector('[data-mso-open]'))return;
  var btn=document.createElement('button');btn.type='button';btn.className='pf2-btn p pst-mso-open';btn.setAttribute('data-mso-open','1');btn.textContent='+ Shto ofertë manualisht';
  var header=card.querySelector('header');if(header){var wrap=header.querySelector('.pst-mso-head-actions');if(!wrap){wrap=document.createElement('div');wrap.className='pst-mso-head-actions';header.appendChild(wrap);}wrap.appendChild(btn);}else card.insertBefore(btn,card.firstChild);
}
function inject(){
  if(!activeOffers())return false;var card=findSupplierCard();if(!card)return false;ensureButton(card);renderManualPanel(card);lastProject=pid();return true;
}
function click(e){var open=e.target&&e.target.closest?e.target.closest('[data-mso-open]'):null;if(open){e.preventDefault();e.stopPropagation();openModal();return;}var s=e.target&&e.target.closest?e.target.closest('[data-mso-select]'):null;if(s){e.preventDefault();e.stopPropagation();selectOffer(s.getAttribute('data-mso-select'),s);}}
function css(){if(document.getElementById('pst-mso-css'))return;var x=document.createElement('style');x.id='pst-mso-css';x.textContent='\
#page-workspace-project .pst-mso-head-actions{margin-left:auto;display:flex;align-items:center;gap:8px}\
#page-workspace-project .pst-mso-open{white-space:nowrap}\
#pst-manual-offers-panel{margin:10px;border-top:1px solid #E7EEF0;padding-top:10px}\
.pst-mso-panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px}.pst-mso-panel-head b{font-size:11px;color:#526269}.pst-mso-panel-head span{font-size:10px;color:#839096}\
.pst-mso-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 10px;border:1px solid #E3EAEC;border-radius:9px;background:#fff;margin-top:6px}.pst-mso-row>div{min-width:0}.pst-mso-row b{display:block;font-size:11.5px;color:#34444B}.pst-mso-row small{display:block;font-size:9.5px;color:#7D898E;margin-top:2px}.pst-mso-select{border:1px solid #5B9BB3;background:#EDF7FA;color:#34758F;border-radius:8px;padding:7px 10px;font:750 10.5px Inter,sans-serif;cursor:pointer;white-space:nowrap}.pst-mso-selected{font:800 9.5px Inter,sans-serif;color:#2F7657;background:#E8F5EE;border-radius:999px;padding:5px 8px;white-space:nowrap}.pst-mso-loading{font-size:10px;color:#849197}\
.pst-mso-backdrop{position:fixed;inset:0;z-index:2147483100;background:rgba(24,38,43,.42);display:grid;place-items:center;padding:20px}.pst-mso-modal{width:min(860px,96vw);max-height:92vh;overflow:auto;background:#FCFCFA;border:1px solid #D9E2E5;border-radius:15px;box-shadow:0 24px 80px rgba(20,35,41,.25);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#2F3437}.pst-mso-modal>header{display:flex;justify-content:space-between;gap:20px;padding:18px 20px;border-bottom:1px solid #E6ECEE}.pst-mso-modal>header span{font-size:9px;font-weight:800;letter-spacing:.7px;color:#4F97AF}.pst-mso-modal>header h2{font-size:18px;margin:3px 0 0}.pst-mso-modal>header p{font-size:10.5px;color:#7C898E;margin:5px 0 0;line-height:1.45}.pst-mso-modal>header button{border:0;background:transparent;font-size:24px;color:#6E7B80;cursor:pointer}.pst-mso-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px;padding:16px 20px 8px}.pst-mso-field{display:grid;gap:5px}.pst-mso-field>span{font-size:10px;font-weight:750;color:#58686F}.pst-mso-field input,.pst-mso-field select,.pst-mso-field textarea{width:100%;box-sizing:border-box;border:1px solid #D7E1E4;border-radius:8px;background:#fff;padding:9px 10px;font:500 12px Inter,sans-serif;color:#2F3437;outline:none}.pst-mso-field input:focus,.pst-mso-field select:focus,.pst-mso-field textarea:focus{border-color:#7DB0C2;box-shadow:0 0 0 2px #DDEFF5}.pst-mso-wide{grid-column:1/-1}.pst-mso-total{margin:8px 20px 0;padding:12px 14px;border:1px solid #D8E7EC;border-radius:10px;background:#F5FAFB}.pst-mso-total span{font-size:9.5px;color:#75848A}.pst-mso-total b{display:block;font-size:18px;color:#2F687F;margin-top:2px}.pst-mso-total small{display:block;font-size:9.5px;color:#8A969A;margin-top:2px}.pst-mso-fx{padding:10px 20px 0}.pst-mso-status{min-height:18px;margin:10px 20px 0;font-size:10.5px;color:#2F7657}.pst-mso-status.err{color:#A64B42}.pst-mso-modal>footer{display:flex;justify-content:flex-end;gap:8px;padding:14px 20px 18px}.pst-mso-modal>footer button{min-height:38px;border-radius:9px;padding:0 14px;font:750 11px Inter,sans-serif;cursor:pointer}.pst-mso-secondary{border:1px solid #D5E0E3;background:#fff;color:#5F6D72}.pst-mso-primary{border:1px solid #4F97AF;background:#4F97AF;color:#fff}.pst-mso-primary:disabled{opacity:.55;cursor:wait}\
@media(max-width:700px){.pst-mso-grid{grid-template-columns:1fr}.pst-mso-wide{grid-column:auto}.pst-mso-row{align-items:flex-start;flex-direction:column}.pst-mso-select{width:100%}}\
';document.head.appendChild(x);}
function boot(){css();document.addEventListener('click',click,true);var mo=new MutationObserver(function(){if(activeOffers())setTimeout(inject,0);});mo.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-pwf-stage','data-pwf-area']});[0,120,420,900].forEach(function(ms){setTimeout(inject,ms);});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.PSTManualSupplierOfferV1={open:openModal,inject:inject,refresh:refresh,select:selectOffer};
})();