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
function integrityData(){return window.__pstIntegrityLastData||null;}
function currentProjectId(){var d=integrityData();return String(window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||'');}
function currentName(){
  var d=integrityData(),id=currentProjectId();
  if(d&&d.project&&(!id||String(d.project.id)===id)&&String(d.project.name||'').trim())return String(d.project.name||'');
  var direct=E('i-projname');
  return direct&&String(direct.value||'').trim()?String(direct.value||''):'';
}
function isDukley(){var x=N(currentName());return x.indexOf('dukley')>-1&&(x.indexOf('restoran')>-1||x.indexOf('restaurant')>-1||x.indexOf('seafront')>-1);}
function expectedTotal(){return +GROUPS.reduce(function(s,r){return s+n(r[2]);},0).toFixed(2);}
function legacyBomTotal(){
  try{if(typeof bomRows!=='undefined'&&Array.isArray(bomRows))return +bomRows.reduce(function(s,r){return s+n(r&&r.kg);},0).toFixed(2);}catch(e){}
  return 0;
}
function integrityBomTotal(){
  var d=integrityData(),r=d&&Array.isArray(d.bom)?d.bom:[];
  return +r.reduce(function(s,x){return s+n(x&&x.kg);},0).toFixed(2);
}
function hasSourceBom(){return Math.abs(legacyBomTotal()-SOURCE.totalKg)<0.01||Math.abs(integrityBomTotal()-SOURCE.totalKg)<0.01;}
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
  if(existing.length&&Math.abs(legacyBomTotal()-SOURCE.totalKg)>=0.01){
    if(!confirm('BOM-i aktual ka '+existing.length+' rreshta dhe '+legacyBomTotal().toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kg.\n\nTa zevendesojme ne preview me BOM-in e verifikuar te celikut nga PDF-ja Dukley?\n\nAsgje nuk shkruhet ne databaze derisa te ruash projektin.'))return;
  }
  try{
    bomRows=rows();
    if(typeof renderBom==='function')renderBom();
    window.__pstActiveDocumentBomSource={key:SOURCE.key,totalKg:SOURCE.totalKg,file:SOURCE.file,scope:'structural_steel'};
    syncOfferKg(true);
    renderLegacyPanel();
  }catch(e){console.error('Dukley BOM import:',e);alert('BOM-i nuk u ngarkua: '+(e.message||e));}
}
function syncOfferKg(force){
  if(!isDukley()||!hasSourceBom())return false;
  var f=E('of-kg');if(!f)return false;
  var cur=n(f.value);
  if(force||cur<=0){
    f.value=String(SOURCE.totalKg);
    try{f.dispatchEvent(new Event('input',{bubbles:true}));f.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}
    return true;
  }
  return false;
}
function css(){
  if(E('pst-doc-bom-css'))return;
  var s=document.createElement('style');s.id='pst-doc-bom-css';s.textContent='\
#pst-doc-bom-panel,#pst-doc-bom-pf2{border:1px solid #c9dfe7;background:#f5fafb;border-radius:11px;padding:13px 15px;margin:0 0 12px}#pst-doc-bom-panel .pst-db-top,#pst-doc-bom-pf2 .pst-db-top{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap}#pst-doc-bom-panel .pst-db-title,#pst-doc-bom-pf2 .pst-db-title{font-size:12px;font-weight:800;color:#347b95}#pst-doc-bom-panel .pst-db-sub,#pst-doc-bom-pf2 .pst-db-sub{font-size:9.5px;color:#718087;margin-top:2px}#pst-doc-bom-panel .pst-db-grid,#pst-doc-bom-pf2 .pst-db-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-top:10px}#pst-doc-bom-panel .pst-db-cell,#pst-doc-bom-pf2 .pst-db-cell{background:#fff;border:1px solid #dfeaec;border-radius:7px;padding:7px 8px}#pst-doc-bom-panel .pst-db-cell span,#pst-doc-bom-pf2 .pst-db-cell span{display:block;font-size:7px;color:#879399;text-transform:uppercase;letter-spacing:.4px}#pst-doc-bom-panel .pst-db-cell b,#pst-doc-bom-pf2 .pst-db-cell b{display:block;font-size:10px;margin-top:2px}#pst-doc-bom-panel .pst-db-scope,#pst-doc-bom-pf2 .pst-db-scope{font-size:8.5px;color:#65757c;margin-top:9px;line-height:1.5}#pst-doc-bom-panel button,#pst-doc-bom-pf2 button{height:32px;padding:0 12px;border:1px solid #4f91aa;border-radius:7px;background:#4f91aa;color:#fff;font-size:9.5px;font-weight:750;cursor:pointer}#pst-doc-bom-panel button.done,#pst-doc-bom-pf2 button.done{background:#2f7657;border-color:#2f7657}@media(max-width:800px){#pst-doc-bom-panel .pst-db-grid,#pst-doc-bom-pf2 .pst-db-grid{grid-template-columns:1fr 1fr}}';document.head.appendChild(s);
}
function panelHtml(done,pf2){
  return '<div class="pst-db-top"><div><div class="pst-db-title">BOM nga dokumentet · ÇELIKU STRUKTUROR</div><div class="pst-db-sub">Burimi: '+SOURCE.file+' · faqet '+SOURCE.pages+'</div></div><button type="button" '+(pf2?'id="pst-doc-bom-pf2-open"':'id="pst-doc-bom-import"')+' class="'+(done?'done':'')+'">'+(done?'✓ BOM i ruajtur · Hap':'Ngarko ne BOM')+'</button></div>'
    +'<div class="pst-db-grid"><div class="pst-db-cell"><span>Profile S235JR</span><b>'+SOURCE.profilesKg.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kg</b></div><div class="pst-db-cell"><span>Pllaka S235JR</span><b>'+SOURCE.platesKg.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kg</b></div><div class="pst-db-cell"><span>Total baze oferte</span><b>'+SOURCE.totalKg.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' kg</b></div><div class="pst-db-cell"><span>Grupe BOM</span><b>'+GROUPS.length+'</b></div></div>'
    +'<div class="pst-db-scope"><b>Perfshihet:</b> vetem profilet dhe pllakat e specifikimit strukturor S235JR. <b>Nuk perfshihet:</b> armatura, sandwich panel, Alubond, OSB, izolime, veshje/finitura dhe +3% spojna sredstva.'+(pf2?(done?' BOM-i i ruajtur ne projekt perputhet me totalin e dokumentit.':' Kliko “Ngarko ne BOM” per ta hapur si preview ne editorin ekzistues; databaza nuk shkruhet pa Ruaj.'):' Importi mbetet preview derisa te ruhet projekti.')+'</div>';
}
function renderLegacyPanel(){
  var old=E('pst-doc-bom-panel');
  if(!isDukley()){if(old)old.remove();return false;}
  var tbody=E('bom-tbody'),card=tbody&&tbody.closest?tbody.closest('.card'):null;
  if(!card||!card.parentNode)return false;
  css();
  if(!old){old=document.createElement('div');old.id='pst-doc-bom-panel';card.parentNode.insertBefore(old,card);}
  var done=Math.abs(legacyBomTotal()-SOURCE.totalKg)<0.01;
  old.innerHTML=panelHtml(done,false);
  var b=E('pst-doc-bom-import');if(b)b.onclick=safeImport;
  return true;
}
function pf2BomActive(){
  var page=E('page-workspace-project');
  return !!(page&&page.classList.contains('pf2-on')&&page.querySelector('.pst-pi-tab.on[data-pf2-tab="bom"]'));
}
function renderProjectFirstPanel(){
  var old=E('pst-doc-bom-pf2');
  if(!isDukley()||!pf2BomActive()){if(old)old.remove();return false;}
  var host=E('pst-pi-body');if(!host)return false;
  css();
  if(!old){old=document.createElement('div');old.id='pst-doc-bom-pf2';host.insertBefore(old,host.firstChild);}
  var done=Math.abs(integrityBomTotal()-SOURCE.totalKg)<0.01;
  old.innerHTML=panelHtml(done,true);
  var b=E('pst-doc-bom-pf2-open');if(b)b.onclick=function(){openLegacyPreview(!done);};
  return true;
}
function openLegacyPreview(importAfterLoad){
  var id=currentProjectId();if(!id)return alert('Projekti aktiv nuk u gjet.');
  var tries=0,started=false;
  try{
    if(typeof window.loadProject==='function'){window.loadProject(id);started=true;}
    else if(typeof window.pstPiWork==='function'){window.pstPiWork();started=true;}
    else if(typeof window.pstPiLegacy==='function'){window.pstPiLegacy('bom');started=true;}
  }catch(e){console.error('Dukley BOM open:',e);}
  if(!started)return alert('Editori ekzistues i BOM nuk u gjet.');
  function waitReady(){
    var name=E('i-projname'),table=E('bom-tbody');
    var same=!!(name&&N(name.value).indexOf('dukley')>-1);
    if(table&&same&&tries>=5){
      try{if(typeof window.showPage==='function')window.showPage('bom');else if(typeof window.pstPiLegacy==='function')window.pstPiLegacy('bom');}catch(e){}
      setTimeout(function(){renderLegacyPanel();if(importAfterLoad)safeImport();},80);
      return;
    }
    tries++;
    if(tries<30)return setTimeout(waitReady,100);
    alert('Projekti Dukley nuk u ngarkua ne editorin e BOM. Asgje nuk u ndryshua.');
  }
  setTimeout(waitReady,100);
}
function scheduleLegacy(){[60,180,450,900].forEach(function(ms){setTimeout(function(){renderLegacyPanel();syncOfferKg(false);},ms);});}
function schedulePf2(){[0,80,180].forEach(function(ms){setTimeout(renderProjectFirstPanel,ms);});}

document.addEventListener('click',function(e){
  if(!e.target||!e.target.closest)return;
  var pf=e.target.closest('[data-pf2-tab="bom"],[data-pf2-action="tab:bom"]');
  if(pf){schedulePf2();return;}
  var step=e.target.closest('.flow-step');
  if(!step)return;
  setTimeout(function(){renderLegacyPanel();var t=N(step.textContent);if(t.indexOf('oferta jone')>-1||t.indexOf('oferta jon')>-1)syncOfferKg(false);},100);
},true);
document.addEventListener('pst:modules-ready',function(){scheduleLegacy();if(pf2BomActive())schedulePf2();},{once:true});
scheduleLegacy();if(pf2BomActive())schedulePf2();
window.PSTProjectBomDocumentExtractV1={source:SOURCE,groups:GROUPS,renderPanel:renderLegacyPanel,renderProjectFirstPanel:renderProjectFirstPanel,importBom:safeImport,openLegacyPreview:openLegacyPreview,syncOfferKg:syncOfferKg,total:expectedTotal,integrityBomTotal:integrityBomTotal};
})();
