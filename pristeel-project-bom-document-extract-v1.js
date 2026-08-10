/* PRISTEEL project BOM document extraction v1
 * First controlled source: Dukley SFR structural steel specification.
 * Scope is deliberately narrow: structural steel profiles + plates only.
 * No DB write happens here. User reviews/imports into the existing BOM and saves through the existing project save flow.
 */
(function(){
'use strict';
if(window.__pstProjectBomDocumentExtractV1)return;
window.__pstProjectBomDocumentExtractV1=true;

var SOURCE={
  key:'dukley-sfr-structural-steel-2026-07',
  file:'Tehničko rješenje konstrukcije - Dukley SFR.pdf',
  pages:'4–9',
  totalKg:25828.74,
  profilesKg:24256.08,
  platesKg:1572.66,
  connectionAllowanceKg:26603.60,
  grade:'S235JR'
};

// Commercial BOM uses the PDF recap groups so the saved total matches the engineer's official recap exactly.
// IPB300/IPB400 are represented as HEB300/HEB400; the 71.82 kg/m "400" profile is UPN400.
var GROUPS=[
  ['HEB','400',6877.51,'IPB400'],
  ['HEB','300',521.27,'IPB300'],
  ['UPN','400',2749.90,'UNP/UPN 400'],
  ['ANGLE','2L150x150x12',210.56,'2L 150x150x12'],
  ['ANGLE','130x90x10',230.16,'L 130x90x10'],
  ['ANGLE','50x50x5',1353.99,'L 50x50x5'],
  ['RHS','200x100x6',4527.95,'HOP 200x100x6'],
  ['RHS','120x100x4',2234.71,'HOP 120x100x4'],
  ['RHS','120x80x4',2541.97,'HOP 120x80x4'],
  ['RHS','100x80x4',26.82,'HOP 100x80x4'],
  ['RHS','80x60x4',228.15,'HOP 80x60x4'],
  ['RHS','100x50x3',2753.10,'HOP 100x50x3'],
  ['PLATE','t=5 mm',308.52,'Lim 5 mm'],
  ['PLATE','t=10 mm',128.30,'Lim 10 mm'],
  ['PLATE','t=12 mm',15.55,'Lim 12 mm'],
  ['PLATE','t=14 mm',115.89,'Lim 14 mm'],
  ['PLATE','t=22 mm',167.27,'Lim 22 mm'],
  ['PLATE','t=24 mm',837.12,'Lim 24 mm']
];

function E(id){return document.getElementById(id);}
function N(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();}
function n(v){var x=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(x)?x:0;}
function currentName(){
  var direct=E('i-projname');
  if(direct&&String(direct.value||'').trim())return String(direct.value||'');
  var x=window.__pstIntegrityLastData;
  return String(x&&x.project&&x.project.name||'');
}
function isDukley(){var x=N(currentName());return x.indexOf('dukley')>-1&&(x.indexOf('restoran')>-1||x.indexOf('restaurant')>-1||x.indexOf('seafront')>-1);}
function expectedTotal(){return +GROUPS.reduce(function(s,r){return s+n(r[2]);},0).toFixed(2);}
function bomTotal(){
  try{if(typeof bomRows!=='undefined'&&Array.isArray(bomRows))return +bomRows.reduce(function(s,r){return s+n(r&&r.kg);},0).toFixed(2);}catch(e){}
  return 0;
}
function hasSourceBom(){return Math.abs(bomTotal()-SOURCE.totalKg)<0.01;}
function rows(){
  return GROUPS.map(function(g,i){
    return{
      id:Date.now()+i,
      pos:i+1,
      raw:SOURCE.file+' · '+g[3],
      profile:g[0],
      dim:g[1],
      grade:SOURCE.grade,
      std:g[0]==='PLATE'?'EN 10029':'EN 10025-2',
      lenMm:0,
      pcs:1,
      kgUnit:g[2],
      kg:g[2],
      surface:'none',
      cert:'EN 10204 3.1',
      notes:'Burim: '+SOURCE.file+'; rekapitulim komercial i çelikut strukturor.',
      conf:'high',
      _pstSourceBom:SOURCE.key
    };
  });
}
function safeImport(){
  if(!isDukley())return alert('Ky import i kontrolluar eshte vetem per projektin Dukley SFR.');
  if(expectedTotal()!==SOURCE.totalKg)return alert('Kontrolli i totalit deshtoi. Importi u ndal.');
  var existing=[];
  try{existing=(typeof bomRows!=='undefined'&&Array.isArray(bomRows))?bomRows:[];}catch(e){}
  if(existing.length&&!hasSourceBom()){
    if(!confirm('BOM-i aktual ka '+existing.length+' rreshta dhe '+bomTotal().toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kg.\n\nTa zevendesojme ne preview me BOM-in e verifikuar te celikut nga PDF-ja Dukley?\n\nAsgje nuk shkruhet ne databaze derisa te ruash projektin.'))return;
  }
  try{
    bomRows=rows();
    if(typeof renderBom==='function')renderBom();
    window.__pstActiveDocumentBomSource={key:SOURCE.key,totalKg:SOURCE.totalKg,file:SOURCE.file,scope:'structural_steel'};
    syncOfferKg(true);
    renderPanel();
  }catch(e){console.error('Dukley BOM import:',e);alert('BOM-i nuk u ngarkua: '+(e.message||e));}
}
function syncOfferKg(force){
  if(!isDukley())return false;
  var total=hasSourceBom()?SOURCE.totalKg:0;
  if(!total)return false;
  var f=E('of-kg');if(!f)return false;
  var cur=n(f.value);
  if(force||cur<=0){
    f.value=String(total);
    try{f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}
    return true;
  }
  return false;
}
function css(){
  if(E('pst-doc-bom-css'))return;
  var s=document.createElement('style');s.id='pst-doc-bom-css';s.textContent='\
#pst-doc-bom-panel{border:1px solid #c9dfe7;background:#f5fafb;border-radius:11px;padding:13px 15px;margin:0 0 12px}#pst-doc-bom-panel .pst-db-top{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}#pst-doc-bom-panel .pst-db-title{font-size:12px;font-weight:800;color:#347b95}#pst-doc-bom-panel .pst-db-sub{font-size:9.5px;color:#718087;margin-top:2px}#pst-doc-bom-panel .pst-db-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:10px}#pst-doc-bom-panel .pst-db-cell{background:#fff;border:1px solid #dfeaec;border-radius:7px;padding:7px 8px}#pst-doc-bom-panel .pst-db-cell span{display:block;font-size:7px;color:#879399;text-transform:uppercase;letter-spacing:.4px}#pst-doc-bom-panel .pst-db-cell b{display:block;font-size:10px;margin-top:2px}#pst-doc-bom-panel .pst-db-scope{font-size:8.5px;color:#65757c;margin-top:9px;line-height:1.5}#pst-doc-bom-panel button{height:32px;padding:0 12px;border:1px solid #4f91aa;border-radius:7px;background:#4f91aa;color:#fff;font-size:9.5px;font-weight:750;cursor:pointer}#pst-doc-bom-panel button.done{background:#2f7657;border-color:#2f7657}@media(max-width:800px){#pst-doc-bom-panel .pst-db-grid{grid-template-columns:1fr 1fr}}';document.head.appendChild(s);
}
function renderPanel(){
  var old=E('pst-doc-bom-panel');
  if(!isDukley()){if(old)old.remove();return false;}
  var tbody=E('bom-tbody'),card=tbody&&tbody.closest?tbody.closest('.card'):null;
  if(!card||!card.parentNode)return false;
  css();
  if(!old){old=document.createElement('div');old.id='pst-doc-bom-panel';card.parentNode.insertBefore(old,card);}
  var done=hasSourceBom();
  old.innerHTML='<div class="pst-db-top"><div><div class="pst-db-title">BOM nga dokumentet · ÇELIKU STRUKTUROR</div><div class="pst-db-sub">Burimi: '+SOURCE.file+' · faqet '+SOURCE.pages+'</div></div><button type="button" id="pst-doc-bom-import" class="'+(done?'done':'')+'">'+(done?'✓ BOM i ngarkuar':'Ngarko ne BOM')+'</button></div>'
    +'<div class="pst-db-grid"><div class="pst-db-cell"><span>Profile S235JR</span><b>'+SOURCE.profilesKg.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kg</b></div><div class="pst-db-cell"><span>Pllaka S235JR</span><b>'+SOURCE.platesKg.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kg</b></div><div class="pst-db-cell"><span>Total baze oferte</span><b>'+SOURCE.totalKg.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kg</b></div><div class="pst-db-cell"><span>Grupe BOM</span><b>'+GROUPS.length+'</b></div></div>'
    +'<div class="pst-db-scope"><b>Perfshihet:</b> vetem profilet dhe pllakat e specifikimit strukturor S235JR. <b>Nuk perfshihet:</b> armatura, sandwich panel, Alubond, OSB, izolime, veshje/finitura dhe +3% spojna sredstva. Importi mbetet preview derisa te ruhet projekti.</div>';
  var b=E('pst-doc-bom-import');if(b)b.onclick=safeImport;
  return true;
}
function schedule(){[60,180,450,900].forEach(function(ms){setTimeout(function(){renderPanel();syncOfferKg(false);},ms);});}

document.addEventListener('click',function(e){
  var step=e.target&&e.target.closest?e.target.closest('.flow-step'):null;
  if(!step)return;
  setTimeout(function(){renderPanel();var t=N(step.textContent);if(t.indexOf('oferta jone')>-1||t.indexOf('oferta jon')>-1)syncOfferKg(false);},100);
},true);
document.addEventListener('pst:modules-ready',schedule,{once:true});
schedule();
window.PSTProjectBomDocumentExtractV1={source:SOURCE,groups:GROUPS,renderPanel:renderPanel,importBom:safeImport,syncOfferKg:syncOfferKg,total:expectedTotal};
})();
