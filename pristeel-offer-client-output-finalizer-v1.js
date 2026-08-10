/* PRISTEEL client offer output finalizer v1
 * Final, presentation-only cleanup for generated customer offers.
 * - Detects the language from the generated document itself.
 * - Serbian salutation uses "Gsp."
 * - Removes mixed-language commercial labels from the client-facing output.
 * - VAT/PDV exclusion is explicit in the commercial total box.
 * - Informative BOM stays visible below the offer in the app, but outside the client PDF.
 * No pricing, BOM, supplier offer, project, or saved source data is changed.
 */
(function(){
'use strict';
if(window.__pstOfferClientOutputFinalizerV1)return;
window.__pstOfferClientOutputFinalizerV1=true;

function E(id){return document.getElementById(id);}
function preview(){return E('of-pre');}
function formLang(){return String((E('of-lang')||{value:'sr'}).value||'sr').toLowerCase().slice(0,2);}
function leafTextNodes(root){
  var out=[];
  if(!root||!document.createTreeWalker)return out;
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n;
  while((n=w.nextNode()))out.push(n);
  return out;
}
function documentLang(root){
  var t=String(root&&root.textContent||'');
  if(/\bANGEBOT\b|\bANBIETER\b|\bKONDITIONEN\b|Gesamtpreis\s*\(Netto\)|Mit freundlichen Grüßen/i.test(t))return'de';
  if(/\bPONUDA\b|\bPONUĐAČ\b|\bUSLOVI\b|Ukupna cena\s*\(neto\)|S poštovanjem/i.test(t))return'sr';
  if(/\bOFERT[ËE]\b|\bKUSHTET\b|Çmimi total\s*\(neto\)|Me respekt/i.test(t))return'sq';
  if(/\bQUOTATION\b|\bOFFER\b|\bCONDITIONS\b|Total price\s*\(net\)|Kind regards/i.test(t))return'en';
  return formLang();
}
function exactLeaf(root,re){
  var all=root?root.querySelectorAll('*'):[];
  for(var i=0;i<all.length;i++){
    var el=all[i];
    if(el.children.length)continue;
    var t=String(el.textContent||'').trim();
    if(re.test(t))return el;
  }
  return null;
}
function ensureSerbianGsp(root,lang){
  if(!root||lang!=='sr')return;
  leafTextNodes(root).forEach(function(n){
    var s=n.nodeValue||'';
    if(!/^\s*Poštovani\s+/i.test(s))return;
    if(/^\s*Poštovani\s+(?:Gsp\.|Gospodine)\s+/i.test(s))return;
    n.nodeValue=s.replace(/^(\s*Poštovani\s+)/i,'$1Gsp. ');
  });
}
function vatText(lang){
  var M={
    sr:'Sve navedene cijene su neto i ne uključuju PDV.',
    sq:'Të gjitha çmimet e paraqitura janë neto dhe nuk përfshijnë TVSH-në. Çdo TVSH eventualisht e aplikueshme sipas ligjit nuk është e përfshirë në çmimin e ofertës.',
    en:'All prices stated are net and exclude VAT. Any VAT that may be legally applicable is not included in the quoted price.',
    de:'Alle angegebenen Preise sind Nettopreise und verstehen sich ohne Mehrwertsteuer (MwSt.). Eine gegebenenfalls gesetzlich anfallende Mehrwertsteuer ist im Angebotspreis nicht enthalten.'
  };
  return M[lang]||M.en;
}
function totalLabelRe(lang){
  if(lang==='sr')return /^Ukupna cena\s*\(neto\)$/i;
  if(lang==='sq')return /^Çmimi total\s*\(neto\)$/i;
  if(lang==='de')return /^Gesamtpreis\s*\(netto\)$/i;
  return /^Total price\s*\(net\)$/i;
}
function ensureVatNote(root,lang){
  if(!root)return;
  Array.prototype.slice.call(root.querySelectorAll('[data-pst-client-vat-note="1"]')).forEach(function(x){x.remove();});
  var label=exactLeaf(root,totalLabelRe(lang));
  if(!label)return;
  var row=label.parentElement;
  var box=row&&row.parentElement;
  if(!box||box===root)box=row;
  if(!box)return;
  var note=document.createElement('div');
  note.setAttribute('data-pst-client-vat-note','1');
  note.style.cssText='margin-top:10px;padding-top:9px;border-top:1px solid #E0D7CC;font-size:12.5px;line-height:1.45;font-weight:600;color:#7A5B45;text-align:left';
  note.textContent=vatText(lang);
  box.appendChild(note);
}
function commercialMap(lang){
  var M={
    de:{
      base:'Stahlkonstruktion',zinc:'Feuerverzinkung',coat:'Pulverbeschichtung nach Feuerverzinkung',transport:'Transport',install:'Montage der Stahlkonstruktion',agreement:'Nach Vereinbarung',lump:'pauschal',delivery:'Lieferort'
    },
    en:{
      base:'Steel construction',zinc:'Hot-dip galvanizing',coat:'Powder coating after galvanizing',transport:'Transport',install:'Installation of the steel structure',agreement:'As agreed',lump:'lump sum',delivery:'Delivery place'
    },
    sq:{
      base:'Konstruksion çeliku',zinc:'Zinkim i nxehtë',coat:'Powder coating pas zinkimit',transport:'Transport',install:'Montimi i konstruksionit metalik',agreement:'Sipas marrëveshjes',lump:'paushall',delivery:'Vendi i dorëzimit'
    },
    sr:{
      base:'Čelična konstrukcija',zinc:'Toplo cinkovanje',coat:'Plastifikacija nakon toplog cinkovanja',transport:'Transport',install:'Montaža čelične konstrukcije',agreement:'Po dogovoru',lump:'paušal',delivery:'Mesto isporuke'
    }
  };
  return M[lang]||M.en;
}
function normalizeClientLanguage(root,lang){
  if(!root)return;
  var L=commercialMap(lang);
  var replacements=[
    [/^(Čelična konstrukcija|Celicna konstrukcija|Steel construction|Stahlkonstruktion|Konstruksion çeliku)$/i,L.base],
    [/^(Toplo cinkovanje|Feuerverzinkung|Hot-dip galvanizing|Zinkim i nxehtë)$/i,L.zinc],
    [/^(Plastifikacija nakon toplog cinkovanja|Powder coating nakon cinkovanja|Pulverbeschichtung nach Feuerverzinkung|Pulverbeschichtung nach Verzinkung|Powder coating after galvanizing|Powder coating pas zinkimit)$/i,L.coat],
    [/^(Montaža čelične konstrukcije|Montage der Stahlkonstruktion|Installation of the steel structure|Montimi i konstruksionit metalik)$/i,L.install],
    [/^(Po dogovoru|Nach Vereinbarung|As agreed|Sipas marrëveshjes)$/i,L.agreement],
    [/^(paušal|pauschal|lump sum|paushall)$/i,L.lump],
    [/^(Lieferbedingung|Lieferort|Delivery place|Mesto isporuke|Vendi i dorëzimit)$/i,L.delivery]
  ];
  leafTextNodes(root).forEach(function(n){
    var raw=n.nodeValue||'';
    var lead=(raw.match(/^\s*/)||[''])[0],trail=(raw.match(/\s*$/)||[''])[0],s=raw.trim();
    if(!s)return;
    for(var i=0;i<replacements.length;i++){
      if(replacements[i][0].test(s)){n.nodeValue=lead+replacements[i][1]+trail;break;}
    }
  });
}
function bomHeadingRe(){
  return /^(Pregled materijala \(informativno\)|Pasqyra e materialit \(informative\)|Material overview \(informative\)|Materialübersicht \(informativ\))$/i;
}
function moveBomOutsideOffer(root){
  if(!root)return;
  var oldOutside=document.querySelector('[data-pst-client-bom-external="1"]');
  if(oldOutside)oldOutside.remove();

  var oldAppendix=root.querySelector('[data-pst-client-bom-appendix="1"]');
  var scope=oldAppendix||root;
  var heading=exactLeaf(scope,bomHeadingRe());
  if(!heading)return;

  var title=heading;
  while(title.parentElement&&title.parentElement!==scope&&title.parentElement.children.length===1){title=title.parentElement;}
  var table=title.nextElementSibling;
  if(!table||table.tagName!=='TABLE'){
    table=scope.querySelector('table');
    if(!table)return;
    if(title===table)return;
  }

  var panel=document.createElement('div');
  panel.setAttribute('data-pst-client-bom-external','1');
  panel.style.cssText='margin:24px 0 8px;padding:22px 24px;border:1px solid #E5EAEC;border-radius:14px;background:#fff;overflow-x:auto';
  panel.appendChild(title);
  panel.appendChild(table);
  root.insertAdjacentElement('afterend',panel);

  if(oldAppendix&&oldAppendix.isConnected)oldAppendix.remove();
}
function patch(){
  var root=preview();
  if(!root)return false;
  var lang=documentLang(root);
  normalizeClientLanguage(root,lang);
  ensureSerbianGsp(root,lang);
  ensureVatNote(root,lang);
  moveBomOutsideOffer(root);
  return true;
}
function wrap(name){
  var fn=window[name];
  if(typeof fn!=='function'||fn.__pstClientOutputFinalizer)return;
  var w=function(){
    var r=fn.apply(this,arguments);
    patch();setTimeout(patch,0);setTimeout(patch,80);return r;
  };
  w.__pstClientOutputFinalizer=true;w.__base=fn;window[name]=w;
}
function install(){wrap('genOfer');wrap('printOfer');patch();}
function loadNumberIntegrity(){
  if(window.PSTOfferNumberIntegrityV1||document.querySelector('script[data-pst-offer-number-integrity]'))return;
  var s=document.createElement('script');
  s.src='pristeel-offer-number-integrity-v1.js?v=20260810-1';
  s.defer=true;
  s.setAttribute('data-pst-offer-number-integrity','1');
  document.head.appendChild(s);
}

document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('button,a'):null;if(!b)return;
  var t=String(b.textContent||'').trim();
  if(/Gjenero\s+Ofert/i.test(t)||/^PDF$/i.test(t)){setTimeout(patch,0);setTimeout(patch,100);}
},true);
document.addEventListener('pst:modules-ready',function(){install();loadNumberIntegrity();setTimeout(install,1000);});
loadNumberIntegrity();install();setTimeout(install,1200);
window.PSTOfferClientOutputFinalizerV1={patch:patch,install:install,documentLang:documentLang,normalizeClientLanguage:normalizeClientLanguage,ensureSerbianGsp:ensureSerbianGsp,ensureVatNote:ensureVatNote,moveBomOutsideOffer:moveBomOutsideOffer};
})();
