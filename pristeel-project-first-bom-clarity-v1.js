/* PRISTEEL project-first BOM clarity v1
 * UI-only cleanup for saved BOM state in Project-first.
 * Keeps source provenance visible, removes duplicate BOM-open actions,
 * and turns the saved-BOM gate into a single clear CTA toward RFQ.
 */
(function(){
'use strict';
if(window.__pstProjectFirstBomClarityV1)return;
window.__pstProjectFirstBomClarityV1=true;

function A(v){return Array.isArray(v)?v:[];}
function data(){return window.__pstIntegrityLastData||null;}
function active(){
  var page=document.getElementById('page-workspace-project');
  return !!(page&&page.classList.contains('pf2-on')&&page.querySelector('.pst-pi-tab.on[data-pf2-tab="bom"]'));
}
function num(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0;}
function total(rows){return +A(rows).reduce(function(s,r){return s+num(r&&r.kg);},0).toFixed(2);}
function fmt(v){return num(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});}
function cleanSource(bom){
  var p=document.getElementById('pst-doc-bom-pf2');
  if(!p)return;
  var title=p.querySelector('.pst-db-title');
  var sub=p.querySelector('.pst-db-sub');
  var btn=p.querySelector('#pst-doc-bom-pf2-open');
  var scope=p.querySelector('.pst-db-scope');
  if(title)title.textContent=bom.length?'Burimi i BOM ✓':'Burimi i BOM';
  if(sub&&bom.length)sub.textContent=sub.textContent.replace(/^Burimi:\s*/i,'');
  if(btn&&bom.length)btn.remove();
  if(scope&&bom.length)scope.innerHTML='<b>Scope:</b> vetëm profilet dhe pllakat e specifikimit strukturor S235JR. <b>Jashtë scope-it:</b> armatura, sandwich panel, Alubond, OSB, izolime, veshje/finitura dhe +3% spojna sredstva.';
  var cells=p.querySelectorAll('.pst-db-cell span');
  if(cells[0])cells[0].textContent='Profile';
  if(cells[1])cells[1].textContent='Pllaka';
  if(cells[2])cells[2].textContent='Totali';
  if(cells[3])cells[3].textContent='Grupe';
}
function cleanGate(bom){
  if(!bom.length)return;
  var host=document.getElementById('pst-pi-body');if(!host)return;
  var gates=[].slice.call(host.querySelectorAll('.pf2-gate'));
  var gate=gates.filter(function(g){
    var b=g.querySelector('b');
    return b&&/Review BOM para RFQ|BOM i aprovuar/i.test(String(b.textContent||''));
  })[0];
  if(!gate)return;
  gate.classList.add('ok');
  var span=gate.querySelector('span');
  var b=gate.querySelector('b');
  var p=gate.querySelector('p');
  var btn=gate.querySelector('button');
  if(span)span.textContent='BOM I APROVUAR';
  if(b)b.textContent=bom.length+' pozicione · '+fmt(total(bom))+' kg';
  if(p)p.textContent='BOM-i është ruajtur dhe gati për kërkesën ndaj prodhuesve.';
  if(btn){
    btn.removeAttribute('data-pf2-action');
    btn.setAttribute('data-prfq-open','1');
    btn.textContent='Vazhdo te RFQ';
    btn.classList.add('p');
  }
}
function cleanCard(bom){
  var host=document.getElementById('pst-pi-body');if(!host||!bom.length)return;
  [].slice.call(host.querySelectorAll('.pf2-card')).forEach(function(c){
    var h=c.querySelector('header b');
    if(!h||String(h.textContent||'').trim()!=='Pozicionet BOM')return;
    h.textContent='BOM i projektit';
    var s=c.querySelector('header span');if(s)s.textContent=bom.length+' pozicione · '+fmt(total(bom))+' kg';
  });
}
function apply(){
  if(!active())return false;
  var d=data(),bom=A(d&&d.bom);
  cleanSource(bom);cleanGate(bom);cleanCard(bom);
  return true;
}
function schedule(){[0,60,180,420].forEach(function(ms){setTimeout(apply,ms);});}
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="bom"]');
  if(t)schedule();
},true);
document.addEventListener('pst:bom-saved',schedule,false);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.PSTProjectFirstBomClarityV1={apply:apply};
})();
