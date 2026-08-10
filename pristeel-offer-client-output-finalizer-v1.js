/* PRISTEEL client offer output finalizer v1
 * Final, presentation-only cleanup for generated customer offers.
 * - Serbian salutation uses "Gsp."
 * - VAT/PDV exclusion is explicit in the commercial total box.
 * - Informative BOM is moved after the complete commercial offer as a separate appendix.
 * No pricing, BOM, supplier offer, project, or saved source data is changed.
 */
(function(){
'use strict';
if(window.__pstOfferClientOutputFinalizerV1)return;
window.__pstOfferClientOutputFinalizerV1=true;

function E(id){return document.getElementById(id);}
function preview(){return E('of-pre');}
function currentLang(){return String((E('of-lang')||{value:'sr'}).value||'sr').toLowerCase();}
function leafTextNodes(root){
  var out=[];
  if(!root||!document.createTreeWalker)return out;
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),n;
  while((n=w.nextNode()))out.push(n);
  return out;
}
function ensureSerbianGsp(root){
  if(!root||currentLang()!=='sr')return;
  leafTextNodes(root).forEach(function(n){
    var s=n.nodeValue||'';
    if(!/^\s*Poštovani\s+/i.test(s))return;
    if(/^\s*Poštovani\s+(?:Gsp\.|Gospodine)\s+/i.test(s))return;
    n.nodeValue=s.replace(/^(\s*Poštovani\s+)/i,'$1Gsp. ');
  });
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
function vatText(){
  var M={
    sr:'Cene su bez PDV-a.',
    sq:'Çmimet janë pa TVSH.',
    en:'Prices exclude VAT.',
    de:'Die Preise verstehen sich zzgl. MwSt.'
  };
  return M[currentLang()]||M.en;
}
function totalLabelRe(){
  var l=currentLang();
  if(l==='sr')return /^Ukupna cena\s*\(neto\)$/i;
  if(l==='sq')return /^Çmimi total\s*\(neto\)$/i;
  if(l==='de')return /^Gesamtpreis\s*\(netto\)$/i;
  return /^Total price\s*\(net\)$/i;
}
function ensureVatNote(root){
  if(!root)return;
  var old=root.querySelector('[data-pst-client-vat-note="1"]');
  if(old){old.textContent=vatText();return;}
  var label=exactLeaf(root,totalLabelRe());
  if(!label){
    // Safe fallback: attach to the conditions block, never invent a tax rate or legal basis.
    var h=exactLeaf(root,/^(USLOVI|KUSHTET|CONDITIONS|KONDITIONEN)$/i);
    if(!h)return;
    var d=document.createElement('div');
    d.setAttribute('data-pst-client-vat-note','1');
    d.style.cssText='margin:8px 0 12px;font-size:12.5px;font-weight:700;color:#8A4E24';
    d.textContent=vatText();
    h.insertAdjacentElement('afterend',d);
    return;
  }
  // Label sits inside the total row; the row's parent is the commercial total box.
  var row=label.parentElement;
  var box=row&&row.parentElement;
  if(!box||box===root)box=row;
  if(!box)return;
  var note=document.createElement('div');
  note.setAttribute('data-pst-client-vat-note','1');
  note.style.cssText='margin-top:8px;padding-top:8px;border-top:1px solid #E0D7CC;font-size:12px;font-weight:700;color:#8A4E24;text-align:right';
  note.textContent=vatText();
  box.appendChild(note);
}
function bomHeadingRe(){
  return /^(Pregled materijala \(informativno\)|Pasqyra e materialit \(informative\)|Material overview \(informative\)|Materialübersicht \(informativ\))$/i;
}
function moveBomAfterOffer(root){
  if(!root)return;
  var existing=root.querySelector('[data-pst-client-bom-appendix="1"]');
  if(existing)return;
  var heading=exactLeaf(root,bomHeadingRe());
  if(!heading)return;
  var title=heading;
  while(title.parentElement&&title.parentElement!==root&&title.parentElement.children.length===1){
    title=title.parentElement;
  }
  var table=title.nextElementSibling;
  if(!table||table.tagName!=='TABLE'){
    table=heading.nextElementSibling;
    if(!table||table.tagName!=='TABLE')return;
    title=heading;
  }
  var doc=root.firstElementChild&&root.children.length===1?root.firstElementChild:root;
  var appendix=document.createElement('div');
  appendix.setAttribute('data-pst-client-bom-appendix','1');
  appendix.style.cssText='margin-top:40px;padding-top:26px;border-top:2px solid #E8E4DE;page-break-before:auto';
  appendix.appendChild(title);
  appendix.appendChild(table);
  doc.appendChild(appendix);
}
function patch(){
  var root=preview();
  if(!root)return false;
  ensureSerbianGsp(root);
  ensureVatNote(root);
  moveBomAfterOffer(root);
  return true;
}
function wrap(name){
  var fn=window[name];
  if(typeof fn!=='function'||fn.__pstClientOutputFinalizer)return;
  var w=function(){
    var r=fn.apply(this,arguments);
    patch();
    setTimeout(patch,0);
    setTimeout(patch,80);
    return r;
  };
  w.__pstClientOutputFinalizer=true;
  w.__base=fn;
  window[name]=w;
}
function install(){wrap('genOfer');wrap('printOfer');patch();}

document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('button,a'):null;
  if(!b)return;
  var t=String(b.textContent||'').trim();
  if(/Gjenero\s+Ofert/i.test(t)||/^PDF$/i.test(t)){
    setTimeout(patch,0);
    setTimeout(patch,100);
  }
},true);
document.addEventListener('pst:modules-ready',function(){install();setTimeout(install,1000);});
install();
setTimeout(install,1200);
window.PSTOfferClientOutputFinalizerV1={patch:patch,install:install,ensureSerbianGsp:ensureSerbianGsp,ensureVatNote:ensureVatNote,moveBomAfterOffer:moveBomAfterOffer};
})();
