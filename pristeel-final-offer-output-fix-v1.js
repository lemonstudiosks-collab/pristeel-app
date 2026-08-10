/* PRISTEEL final commercial offer output fix v1
 * Output-only normalization for the generated customer quotation.
 * Does not change BOM, supplier offers, pricing inputs or saved project data.
 */
(function(){
'use strict';
if(window.__pstFinalOfferOutputFixV1)return;
window.__pstFinalOfferOutputFixV1=true;

function preview(){return document.getElementById('of-pre');}
function fmtKg(v){
  var n=Number(v)||0;
  return n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function exactText(root,text){
  var all=root?root.querySelectorAll('*'):[];
  for(var i=0;i<all.length;i++){
    if((all[i].textContent||'').trim()===text)return all[i];
  }
  return null;
}
function replaceText(root){
  if(!root)return;
  var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  var nodes=[],n;
  while((n=w.nextNode()))nodes.push(n);
  nodes.forEach(function(t){
    var s=t.nodeValue||'';
    s=s.replace(/Poštovani\s+(?:Gsp\.?|Gospodine)\s+/gi,'Poštovani ');
    s=s.replace(/Powder\s*coating\s+nakon\s+cinkovanja/gi,'Plastifikacija nakon toplog cinkovanja');
    t.nodeValue=s;
  });
}
function patchBomPrecision(root){
  var src=Array.isArray(window.bomRows)?window.bomRows:[];
  if(!root||!src.length)return;
  var tables=root.querySelectorAll('table'),table=null;
  for(var i=0;i<tables.length;i++){
    var h=(tables[i].querySelector('thead')||tables[i]).textContent||'';
    if(/PROFIL/i.test(h)&&/KOLIČINA\s*\(KG\)/i.test(h)){table=tables[i];break;}
  }
  if(!table)return;
  var rows=table.querySelectorAll('tbody tr');
  if(rows.length===src.length){
    for(var j=0;j<rows.length;j++){
      var cells=rows[j].querySelectorAll('td');
      if(cells.length)cells[cells.length-1].textContent=fmtKg(parseFloat(src[j].kg)||0);
    }
  }
  var total=src.reduce(function(a,r){return a+(parseFloat(r.kg)||0);},0);
  var label=exactText(root,'Ukupna količina');
  if(label){
    var p=label.parentElement;
    if(p){
      var kids=p.children;
      for(var k=0;k<kids.length;k++){
        if(kids[k]!==label && /kg/i.test(kids[k].textContent||'')){
          kids[k].textContent=fmtKg(total)+' kg';
          return;
        }
      }
    }
    if(label.nextElementSibling)label.nextElementSibling.textContent=fmtKg(total)+' kg';
  }
}
function patchVat(root){
  if(!root||root.querySelector('[data-pst-offer-vat-note]'))return;
  var lang=(document.getElementById('of-lang')||{}).value||'de';
  var txt={
    sr:'PDV nije uključen u navedene cene.',
    de:'Die MwSt. ist in den angegebenen Preisen nicht enthalten.',
    en:'VAT is not included in the stated prices.',
    sq:'TVSH-ja nuk është e përfshirë në çmimet e lartpërmendura.'
  }[lang]||'VAT is not included in the stated prices.';
  var heading={sr:'USLOVI',de:'KONDITIONEN',en:'CONDITIONS',sq:'KUSHTET'}[lang]||'USLOVI';
  var h=exactText(root,heading);
  if(!h)return;
  var d=document.createElement('div');
  d.setAttribute('data-pst-offer-vat-note','1');
  d.style.cssText='font-size:12px;font-weight:650;color:#1f2937;margin:7px 0 9px';
  d.textContent=txt;
  h.insertAdjacentElement('afterend',d);
}
function patch(){
  var root=preview();
  if(!root)return false;
  replaceText(root);
  patchBomPrecision(root);
  patchVat(root);
  return true;
}
function wrapGenerator(){
  if(typeof window.genOfer!=='function'||window.genOfer.__pstFinalOfferWrapped)return;
  var old=window.genOfer;
  var wrapped=function(){
    var r=old.apply(this,arguments);
    patch();
    setTimeout(patch,0);
    setTimeout(patch,80);
    return r;
  };
  wrapped.__pstFinalOfferWrapped=true;
  window.genOfer=wrapped;
}

document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('button,a'):null;
  if(!b)return;
  var t=(b.textContent||'').trim();
  if(/^PDF$/i.test(t)){patch();return;}
  if(/Gjenero\s+Ofert/i.test(t)){setTimeout(patch,0);setTimeout(patch,80);}
},true);
document.addEventListener('pst:modules-ready',function(){wrapGenerator();patch();},{once:true});
wrapGenerator();
patch();
window.PSTFinalOfferOutputFixV1={patch:patch,wrapGenerator:wrapGenerator};
})();