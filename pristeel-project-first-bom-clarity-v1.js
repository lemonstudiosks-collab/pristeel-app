/* PRISTEEL project-first BOM clarity v1
 * UI-only cleanup for saved BOM state in Project-first.
 * Keeps source provenance visible, presents the approved BOM as a compact table,
 * removes duplicate routing/open actions from the BOM tab, and keeps RFQ as the clear next step.
 */
(function(){
'use strict';
if(window.__pstProjectFirstBomClarityV1)return;
window.__pstProjectFirstBomClarityV1=true;

function A(v){return Array.isArray(v)?v:[];}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function data(){return window.__pstIntegrityLastData||null;}
function active(){
  var page=document.getElementById('page-workspace-project');
  return !!(page&&page.classList.contains('pf2-on')&&page.querySelector('.pst-pi-tab.on[data-pf2-tab="bom"]'));
}
function num(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0;}
function total(rows){return +A(rows).reduce(function(s,r){return s+num(r&&r.kg);},0).toFixed(2);}
function fmt(v){return num(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});}
function val(){for(var i=0;i<arguments.length;i++){var v=arguments[i];if(v!==undefined&&v!==null&&String(v).trim()!=='')return String(v).trim();}return'';}
function css(){
  if(document.getElementById('pst-bom-clarity-css'))return;
  var s=document.createElement('style');s.id='pst-bom-clarity-css';s.textContent='\
#pst-pf2-bom-compact{width:100%;border-collapse:collapse;table-layout:fixed}#pst-pf2-bom-compact th{padding:9px 12px;border-bottom:1px solid #e3ecef;background:#f8fbfc;color:#839198;font-size:8px;text-transform:uppercase;letter-spacing:.45px;text-align:left}#pst-pf2-bom-compact td{padding:9px 12px;border-bottom:1px solid #edf2f3;color:#53656d;font-size:9px;vertical-align:middle}#pst-pf2-bom-compact tbody tr:last-child td{border-bottom:0}#pst-pf2-bom-compact td.pos{width:48px;color:#91a0a6}#pst-pf2-bom-compact td.profile{font-weight:760;color:#2e3d44}#pst-pf2-bom-compact td.kg,#pst-pf2-bom-compact th.kg{text-align:right}#pst-pf2-bom-compact td.kg{font-weight:760;color:#315f72}.pst-bom-compact-wrap{overflow:auto}.pst-bom-compact-foot{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:11px 12px;border-top:1px solid #e3ecef;background:#f8fbfc}.pst-bom-compact-foot span{font-size:8px;color:#7b898f}.pst-bom-compact-foot b{font-size:11px;color:#315f72}.pst-bom-routing-hidden{display:none!important}@media(max-width:760px){#pst-pf2-bom-compact{min-width:620px}}';
  document.head.appendChild(s);
}
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
    return b&&/Review BOM para RFQ|BOM i aprovuar|pozicione\s*·/i.test(String(b.textContent||''));
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
function compactRows(bom){
  return bom.map(function(r,i){
    var profile=val(r.profile,r.description,r.name,'Pozicion');
    var dim=val(r.dim,r.dimension,'—');
    var grade=val(r.grade,r.material,'—');
    return '<tr><td class="pos">'+(i+1)+'</td><td class="profile">'+E(profile)+'</td><td>'+E(dim)+'</td><td>'+E(grade)+'</td><td class="kg">'+fmt(r.kg)+' kg</td></tr>';
  }).join('');
}
function cleanCard(bom){
  var host=document.getElementById('pst-pi-body');if(!host||!bom.length)return;
  css();
  [].slice.call(host.querySelectorAll('.pf2-card')).forEach(function(c){
    var h=c.querySelector('header b');
    if(!h)return;
    var title=String(h.textContent||'').trim();
    if(title==='Routing paraprak'){
      c.classList.add('pst-bom-routing-hidden');
      return;
    }
    if(title!=='Pozicionet BOM'&&title!=='BOM i projektit')return;
    h.textContent='BOM i projektit';
    var s=c.querySelector('header span');if(s)s.textContent=bom.length+' pozicione · '+fmt(total(bom))+' kg';
    var body=c.children&&c.children.length>1?c.children[1]:null;if(!body)return;
    body.innerHTML='<div class="pst-bom-compact-wrap"><table id="pst-pf2-bom-compact"><thead><tr><th style="width:48px">#</th><th>Profili</th><th>Dimensioni</th><th>Grada</th><th class="kg" style="width:150px">Pesha</th></tr></thead><tbody>'+compactRows(bom)+'</tbody></table></div><div class="pst-bom-compact-foot"><span>Peshat sipas BOM-it të aprovuar të projektit.</span><b>Total: '+fmt(total(bom))+' kg</b></div>';
  });
}
function apply(){
  if(!active())return false;
  var d=data(),bom=A(d&&d.bom);
  cleanSource(bom);cleanGate(bom);cleanCard(bom);
  return true;
}
function schedule(){[0,60,180,420,900].forEach(function(ms){setTimeout(apply,ms);});}
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest&&e.target.closest('[data-pf2-tab="bom"]');
  if(t)schedule();
},true);
document.addEventListener('pst:bom-saved',schedule,false);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.PSTProjectFirstBomClarityV1={apply:apply};
})();
