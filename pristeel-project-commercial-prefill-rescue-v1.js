/* PRISTEEL project commercial prefill rescue v3
 * Reliable Project -> client offer bridge.
 * Waits until the Commercial Document Builder has finished its fresh-form reset,
 * then carries project identity and supplier quotation rows into the PRISTEEL client-offer draft.
 * Supplier costs stay internal; selling prices remain human-approved. Never saves or sends automatically.
 */
(function(){
'use strict';
if(window.__pstProjectCommercialPrefillRescueV3)return;
window.__pstProjectCommercialPrefillRescueV3=true;
window.__pstProjectCommercialPrefillRescueV1=true;

var running=null,installed=false,basePiNew=null;
function A(v){return Array.isArray(v)?v:[];}
function L(v){return String(v==null?'':v).trim();}
function N(v){return L(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function num(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0;}
function data(){return window.__pstIntegrityLastData||null;}
function pid(){var d=data();return String(d&&d.project&&d.project.id||window.__pstCurrentProjectId||window._curProjId||'');}
function projectFirstVisible(){var p=document.getElementById('page-workspace-project');return !!(p&&p.classList.contains('pf2-on'));}
function offerPage(){return document.getElementById('page-oferta');}
function visible(p){if(!p)return false;if(p.classList.contains('active'))return true;var ds=L(p.style&&p.style.display).toLowerCase();if(ds==='block'||ds==='flex'||ds==='grid')return true;try{var cs=getComputedStyle(p);return cs.display!=='none'&&cs.visibility!=='hidden';}catch(e){return false;}}
function put(id,v){var e=document.getElementById(id);if(!e)return false;e.value=v==null?'':String(v);try{e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}catch(x){}return true;}
function blankSelect(id,label){var e=document.getElementById(id);if(!e)return false;var hit=Array.prototype.find.call(e.options||[],function(o){return o.value==='';});if(!hit){hit=document.createElement('option');hit.value='';hit.textContent=label||'— Zgjidh —';e.insertBefore(hit,e.firstChild);}e.value='';try{e.dispatchEvent(new Event('change',{bubbles:true}));}catch(x){}return true;}
function optionValue(id,v){var e=document.getElementById(id);if(!e||!v)return false;var want=N(v),hit=Array.prototype.find.call(e.options||[],function(o){return N(o.value)===want||N(o.textContent)===want;});if(!hit)return false;e.value=hit.value;try{e.dispatchEvent(new Event('change',{bubbles:true}));}catch(x){}return true;}
function supplierOffers(d){return A(d&&d.supplierOffers).filter(function(o){return num(o&&o.total_eur)>0||num(o&&o.price_kg)>0||A(o&&o.positions).length>0;});}
function existingClientOffers(d){return A(d&&d.ourOffers);}
function bestContact(d){
 var p=d&&d.project||{},ref=N(p.ref),client=N(p.client),sup=supplierOffers(d).map(function(o){return N(o.supplier||o.supplier_name);}).filter(Boolean);
 var ranked=A(d&&d.contacts).map(function(c){
   var nm=N(c.name||c.contact_name||c.person),co=N(c.company),em=L(c.email).toLowerCase(),s=0;
   if(ref&&nm&&(nm===ref||nm.indexOf(ref)>-1||ref.indexOf(nm)>-1))s+=260;
   if(client&&co&&(co.indexOf(client)>-1||client.indexOf(co)>-1))s+=100;
   if(c.is_primary===true)s+=30;
   if(sup.some(function(x){return x&&((co&&co.indexOf(x)>-1)||(nm&&nm.indexOf(x)>-1));}))s-=220;
   if(/@prissteel\.com$/.test(em))s-=500;
   return{row:c,score:s};
 }).sort(function(a,b){return b.score-a.score;});
 return ranked.length&&ranked[0].score>0?ranked[0].row:null;
}
function buyerText(d,c){var em=L(c&&c.email).toLowerCase(),nm=N(c&&(c.name||c.contact_name||c.person));return A(d&&d.emails).filter(function(m){return (em&&L(m.from_email).toLowerCase()===em)||(nm&&N(m.from_name).indexOf(nm)>-1);}).map(function(m){return String(m.body_text||m.body||m.text||m.snippet||'');}).join('\n');}
function language(d,c){var t=' '+buyerText(d,c).toLowerCase()+' ',s={sr:0,de:0,sq:0,en:0};[/poštovani/g,/ponud[au]/g,/zahtev/g,/zahtjev/g,/isporuk/g,/poštovanjem/g,/čelič/g].forEach(function(r){if(r.test(t))s.sr++;});[/sehr geehrte/g,/angebot/g,/lieferung/g,/anfrage/g,/mit freundlichen/g].forEach(function(r){if(r.test(t))s.de++;});[/përshënd/g,/pershendet/g,/ju lutem/g,/çmim/g,/cmim/g].forEach(function(r){if(r.test(t))s.sq++;});[/dear /g,/quotation/g,/request for/g,/kind regards/g,/please /g].forEach(function(r){if(r.test(t))s.en++;});var k=Object.keys(s).sort(function(a,b){return s[b]-s[a];})[0];return s[k]>=2?k:'';}
async function loadData(id){
 var current=data();
 if(current&&current.project&&String(current.project.id)===String(id)&&supplierOffers(current).length)return current;
 var I=window.PSTProjectDataIntegrity;
 if(I&&typeof I.load==='function'){
   try{var fresh=await I.load(id);if(fresh){window.__pstIntegrityLastData=fresh;return fresh;}}catch(e){console.warn('PPPP client-offer bridge data refresh:',e);}
 }
 return current&&current.project&&String(current.project.id)===String(id)?current:null;
}
function modeFor(d){return N(d&&d.project&&d.project.deal_type)==='trading'?'trading':'production';}
function clearFreshDefaults(){
 ['of-proj','of-ref','of-cli','of-con','of-em','of-adr','of-loc','of-pr','of-kg','of-zn','of-tr','pa-cost','of-not'].forEach(function(id){put(id,'');});
 ['pa-country','pa-exc','of-inc','of-pay-preset','of-cer','of-lang'].forEach(function(id){blankSelect(id,'— Zgjidh —');});
 if(Array.isArray(window.oferPos))window.oferPos.length=0;
 try{if(typeof window.renderOferPos==='function')window.renderOferPos();}catch(e){}
}
function editorUnit(unit){var u=N(unit);if(u==='kg'||u==='kilogram'||u==='kilograms')return'kg';if(/truck|kamion|piece|pieces|pcs|pc|kom|cope/.test(u))return'pc';if(u==='m'||/meter/.test(u))return'm';if(/hour|ore|cas/.test(u))return'h';return'ls';}
function seedPositions(o,mode){
 if(!Array.isArray(window.oferPos))return false;
 var rows=A(o&&o.positions);
 window.oferPos.length=0;
 rows.forEach(function(r){
   var q=num(r.qty!=null?r.qty:r.quantity),cost=num(r.unit_price!=null?r.unit_price:r.price),origUnit=L(r.unit||'');
   var unit=editorUnit(origUnit),desc=L(r.description||r.desc||'Pozicion');
   if(unit==='ls'&&q>1)desc+=' · '+q+' '+(origUnit||'nj.');
   window.oferPos.push({
     desc:desc,qty:unit==='ls'?1:(q||0),unit:unit,price:0,pcs:'',L:'',W:'',T:'',document_mode:mode,
     _pstSupplierUnitCost:cost||0,_pstSupplierLineTotal:num(r.total_eur||r.total),_pstSupplierQty:q||0,_pstSupplierUnit:origUnit||unit,
     _pstSupplierOfferId:String(o.id||''),_pstSupplierOfferRef:L(o.offer_ref),_pstSupplier:L(o.supplier||o.supplier_name),
     _pstSource:'project-supplier-offer',_pstNeedsPrice:true
   });
 });
 try{if(typeof window.renderOferPos==='function')window.renderOferPos();}catch(e){}
 return rows.length>0;
}
function warningRows(d,o){
 var w=[],projectName=N(d&&d.project&&d.project.name),text=N((o&&o.notes||'')+' '+(o&&o.raw_text||'')+' '+(o&&o.inclusions||'')+' '+(o&&o.exclusions||''));
 if(/budva/.test(text)&&!/budva/.test(projectName))w.push('Dokumenti i furnitorit përmend Budva/Monenegro për transportin. Verifiko destinacionin para ofertës klientit.');
 var fab=A(o&&o.positions).filter(function(r){return /fabric|prodh|izrad|konstruksion|structure/.test(N(r.description||r.desc));}).reduce(function(s,r){return s+num(r.qty||r.quantity);},0);
 var er=A(o&&o.positions).filter(function(r){return /erection|monta/.test(N(r.description||r.desc));}).reduce(function(s,r){return s+num(r.qty||r.quantity);},0);
 if(fab>0&&er>0&&Math.abs(fab-er)>1)w.push('Sasia e montimit '+er.toLocaleString('de-DE')+' kg nuk përputhet me sasinë e fabrikimit '+fab.toLocaleString('de-DE')+' kg. Verifiko scope-in.');
 return w;
}
function quotePanel(d,o){
 var old=document.getElementById('pst-project-supplier-quote-summary');if(old)old.remove();
 var anchor=document.getElementById('price-advisor');if(!anchor||!anchor.parentNode)return false;
 var rows=A(o&&o.positions),box=document.createElement('div');box.id='pst-project-supplier-quote-summary';box.style.cssText='border:1px solid #cfe1e7;background:#f7fbfc;border-radius:11px;padding:12px 14px;margin:10px 0 14px;font-size:11px;color:#526872';
 var html='<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><b style="display:block;color:#367d97;font-size:12px">Baza e kostos nga Prokurimi</b><span>'+E(o.supplier||o.supplier_name||'Furnitor')+(o.offer_ref?' · '+E(o.offer_ref):'')+'</span></div>'+(num(o.total_eur)>0?'<b style="white-space:nowrap;color:#334951">'+E(num(o.total_eur).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}))+' EUR</b>':'')+'</div>';
 html+='<div style="margin-top:8px;border-top:1px solid #e4eef1">'+rows.map(function(r){var q=num(r.qty!=null?r.qty:r.quantity),p=num(r.unit_price!=null?r.unit_price:r.price),t=num(r.total_eur||r.total);return '<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:6px 0;border-bottom:1px solid #e9f0f2"><span>'+E(r.description||r.desc||'Pozicion')+(q?' · '+E(q.toLocaleString('de-DE'))+' '+E(r.unit||''):'')+'</span><b style="white-space:nowrap">'+(p?E(p.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:3}))+' €/ '+E(r.unit||'nj.'):(t?E(t.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}))+' €':'—'))+'</b></div>';}).join('')+'</div>';
 html+='<div style="margin-top:9px;padding:8px 9px;border-radius:8px;background:#fff6e8;color:#825b1e"><b>Çmimet e shitjes janë bosh.</b> Pozicionet e furnitorit janë sjellë vetëm si bazë kostoje. PRISTEEL duhet të vendosë çmimin/marzhin dhe ta aprovojë ofertën.</div>';
 warningRows(d,o).forEach(function(x){html+='<div style="margin-top:7px;padding:7px 9px;border-radius:8px;background:#fff1ef;color:#8a433b"><b>Kontroll:</b> '+E(x)+'</div>';});
 box.innerHTML=html;anchor.insertAdjacentElement('afterend',box);return true;
}
function hydrate(d,mode){
 if(!d||!d.project||!visible(offerPage()))return false;
 clearFreshDefaults();
 var p=d.project,c=bestContact(d),os=supplierOffers(d),o=os.length===1?os[0]:null;
 put('of-proj',p.name||'');put('of-ref',p.ref||'');put('of-cli',p.client||'');
 if(c){put('of-con',c.name||c.contact_name||c.person||'');put('of-em',c.email||'');if(c.address||c.full_address)put('of-adr',c.address||c.full_address);}
 if(o&&num(o.qty_kg)>0)put('of-kg',String(num(o.qty_kg)));
 var lg=language(d,c);if(lg)optionValue('of-lang',lg);else blankSelect('of-lang','— Zgjidh gjuhën —');
 blankSelect('pa-country','— Zgjidh vendin —');blankSelect('pa-exc','— Zgjidh EXC —');blankSelect('of-inc','— Zgjidh Incoterm —');blankSelect('of-pay-preset','— Zgjidh kushtet e pagesës —');blankSelect('of-cer','— Zgjidh certifikatën —');
 put('of-pr','');put('of-zn','');put('of-tr','');put('pa-cost','');
 if(o){seedPositions(o,mode);quotePanel(d,o);}
 try{if(window.PSTCommercialDocumentBuilderV1&&typeof window.PSTCommercialDocumentBuilderV1.enhance==='function')window.PSTCommercialDocumentBuilderV1.enhance();}catch(e){}
 return true;
}
function waitForEditor(cb){var tries=0;(function tick(){var p=offerPage();if(p&&visible(p)&&document.getElementById('of-pos-list')){setTimeout(cb,100);return;}if(++tries>=30){cb();return;}setTimeout(tick,25);})();}
async function openProjectOffer(){
 var id=pid();if(!id)return basePiNew?basePiNew.apply(window,['offer']):false;
 if(running)return running;
 running=(async function(){
   var d=await loadData(id);if(!d)return basePiNew?basePiNew.apply(window,['offer']):false;
   if(existingClientOffers(d).length)return basePiNew?basePiNew.apply(window,['offer']):false;
   var B=window.PSTCommercialDocumentBuilderV1,mode=modeFor(d);
   if(!B||typeof B.fresh!=='function')return basePiNew?basePiNew.apply(window,['offer']):false;
   window.__pstCurrentProjectId=id;window._curProjId=id;
   B.fresh('offer',mode);
   return await new Promise(function(resolve){waitForEditor(function(){resolve(hydrate(d,mode));});});
 })().finally(function(){running=null;});
 return running;
}
function install(){
 var fn=window.pstPiNew;if(typeof fn!=='function')return false;
 if(fn.__pstProjectClientOfferBridgeV3){installed=true;return true;}
 basePiNew=fn;
 var w=function(type){if(type==='offer'&&projectFirstVisible())return openProjectOffer();return basePiNew.apply(this,arguments);};
 w.__pstProjectClientOfferBridgeV3=true;w.__base=basePiNew;window.pstPiNew=w;installed=true;return true;
}
function scheduleInstall(){[0,80,240,700].forEach(function(ms){setTimeout(function(){if(!installed)install();},ms);});}

document.addEventListener('pst:modules-ready',scheduleInstall,{once:true});
scheduleInstall();
window.PSTProjectCommercialPrefillRescueV1=window.PSTProjectCommercialPrefillRescueV3={install:install,openProjectOffer:openProjectOffer,hydrate:hydrate,seedPositions:seedPositions,quotePanel:quotePanel,_test:{bestContact:bestContact,supplierOffers:supplierOffers,warningRows:warningRows,modeFor:modeFor,editorUnit:editorUnit}};
})();
