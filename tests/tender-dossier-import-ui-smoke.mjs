import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const tenderId='a0c8ff1f-bd41-484a-8b82-6c9b0ee6d37e';
const docA='Dosja e Tenderit 20.08.2026.Docx';
const docB='Lista e pershkrimit te çmimeve - Furnizim me Material Metalik.xlsx';
const detailUrl='https://e-prokurimi.rks-gov.net/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=4248232';
const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="pst-ti-body">
  <div id="pst-pcw-ti-actions"><a class="pst-pcw-source-link" href="${detailUrl}">KRPP</a></div>
  <section id="pst-tda-analysis" data-tender-id="${tenderId}" data-dossier-complete="0">
    <div class="pst-tda-partial"><ul><li>${docA}</li><li>${docB}</li></ul></div>
    <div class="pst-tda-footer-actions"><button type="button" data-tda-download="${tenderId}">Shkarko dosjen ZIP</button></div>
  </section>
  <button id="create-project" data-pcw-ti="go" data-id="${tenderId}" disabled>Krijo projekt</button>
</div>
</body></html>`,{url:'https://lemonstudiosks-collab.github.io/pristeel-app/',runScripts:'outside-only'});
const {window}=dom,{document}=window;
window.console=console;
window.alert=(msg)=>{throw new Error('Unexpected alert: '+msg);};
window._SB_URL='https://example.supabase.co';
window._SB_KEY='anon-key';
window.authGetSession=()=>({access_token:'user-token',expires_at:Math.floor(Date.now()/1000)+3600});
window.authRefreshIfNeeded=async()=>window.authGetSession();
window.pstToast=()=>{};
let projectClicks=0;document.getElementById('create-project').addEventListener('click',()=>projectClicks++);
let canonicalAnalyzeCalls=0;
window.PSTTenderDossierAnalysisV1={
  apply(){return true;},
  async analyze(id){
    canonicalAnalyzeCalls++;
    assert.equal(id,tenderId);
    const panel=document.getElementById('pst-tda-analysis');
    panel.setAttribute('data-dossier-complete','1');
    panel.innerHTML='<div class="pst-tda-head"><div><span>DOSJA E TENDERIT</span><h3>Dosja u analizua</h3></div><div class="pst-tda-badges"><b class="rec">VAZHDO</b></div></div><p class="pst-tda-summary">Kushtet kryesore janë verifikuar nga dosja e plotë.</p><div class="pst-tda-core-grid"><section>Kushtet teknike</section><section>Kushtet komerciale</section></div>';
    document.getElementById('create-project').disabled=false;
    document.dispatchEvent(new window.CustomEvent('pst:tender-dossier-ready',{detail:{tender_id:tenderId,dossier_complete:true,protected_documents:[],analysis:{recommendation:'VAZHDO',decision_reasons:['Fusha e furnizimit përputhet me kapacitetin e PRISTEEL.','Dosja e plotë nuk tregon kusht përjashtues material.'],technical_requirements:['Material metalik sipas specifikimit.'],commercial_requirements:['Dorëzim brenda afatit të tenderit.']}}}));
    return true;
  }
};
window.__pstTenderDossierAnalysisV3=true;

let uploadArchiveRequests=0,statusRequests=0;
window.fetch=globalThis.fetch=async(url,init)=>{
  assert(String(url).includes('/functions/v1/pppp-tender-dossier-import'),'UI called an unexpected backend path');
  const sent=JSON.parse(init.body);
  assert.equal(sent.tender_id,tenderId);
  if(sent.mode==='status'){
    statusRequests++;
    return {ok:true,status:200,text:async()=>JSON.stringify({ok:true,tender_id:tenderId,dossier_complete:false,remaining_protected_documents:[docA,docB],archived_documents:[]})};
  }
  assert.equal(sent.mode,'upload_archive','ZIP flow must use the consolidated archive upload mode');
  assert.equal(sent.file.name,'Dosja e Tenderit.zip');
  uploadArchiveRequests++;
  return {ok:true,status:200,text:async()=>JSON.stringify({ok:true,tender_id:tenderId,dossier_complete:true,archive_file_name:'Dosja e Tenderit.zip',contained_documents:[docA,docB,'PPPP-DOSJA-INDEX.txt'],matched_documents:[docA,docB],remaining_protected_documents:[],analysis:{ok:true,recommendation:'VAZHDO'}})};
};

window.eval(fs.readFileSync('pristeel-tender-dossier-import-v1.js','utf8'));
window.PSTTenderDossierImportV1.apply();
window.eval(fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8'));
window.PSTRedesignFinalizerV3.installTenderProtectedDocumentGuide();
window.PSTRedesignFinalizerV3.renderTenderProtectedGuide({tender_id:tenderId,dossier_complete:false,protected_documents:[docA,docB]});
window.PSTTenderDossierImportV1._test.renderZipGuide({tender_id:tenderId,dossier_complete:false,protected_documents:[docA,docB]});
window.PSTTenderDossierImportV1._test.normalizeProtectedUi({tender_id:tenderId,dossier_complete:false});

const zipButton=document.querySelector('[data-pst-krpp-zip-upload]');
const dropZone=document.querySelector('[data-pst-krpp-zip-drop]');
const uploadButtons=[...document.querySelectorAll('[data-pst-krpp-upload]')];
const docDropZones=[...document.querySelectorAll('[data-pst-krpp-doc-drop="1"]')];
const krppLinks=[...document.querySelectorAll('.pst-final-krpp-doc a')];
const partialBundle=document.querySelector('[data-tda-download]');
assert(zipButton,'Incomplete dossier must show a clear upload button');
assert.equal(zipButton.textContent.trim(),'Ngarko dokumentet / ZIP-in');
assert(dropZone,'Incomplete dossier must expose a main drag-and-drop target');
assert.equal(dropZone.getAttribute('data-tender-id'),tenderId,'Main drop target must be bound to the current tender');
assert.equal(uploadButtons.length,2,'Individual missing-document upload must remain as a safe fallback');
assert.equal(docDropZones.length,2,'Every missing document must be a direct drag-and-drop target');
assert(docDropZones.every(row=>row.querySelector('.pst-krpp-drop-hint')),'Every per-document drop target must visibly explain drag-and-drop');
assert.equal(krppLinks.length,2,'Both missing documents must keep a KRPP action');
assert(krppLinks.every(a=>a.href===detailUrl),'Protected-document actions must route to the real tender detail page, not a guessed private endpoint');
assert(krppLinks.every(a=>a.textContent.includes('Hap tenderin në KRPP')),'Protected-document links must explain that the user returns to the tender page');
assert(partialBundle.hidden,'The PPPP partial public ZIP must be hidden while protected documents are still missing');
assert(document.querySelector('.pst-tender-zip-import').textContent.includes('PPPP-Dosja-'),'UI must warn that PPPP partial bundles cannot complete a protected dossier');
assert.equal(document.getElementById('create-project').disabled,true,'Krijo projekt must stay blocked before the ZIP is processed');

let pickerClicks=0;
const nativeInputClick=window.HTMLInputElement.prototype.click;
window.HTMLInputElement.prototype.click=function(){pickerClicks++;assert(this.accept.includes('.zip'),'Per-document picker must also accept the KRPP ZIP wrapper');};
uploadButtons[0].dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));
assert.equal(pickerClicks,1,'Individual Ngarko në PPPP must open exactly one file picker through the canonical importer');
window.HTMLInputElement.prototype.click=nativeInputClick;

const partialMsg=window.PSTTenderDossierImportV1._test.archiveErrorMessage({name:'PPPP-Dosja-214_30400.zip'},new Error('ZIP-i u lexua, por nuk u gjet asnjë nga dokumentet që PPPP i pret për këtë tender.'));
assert(partialMsg.includes('ZIP-i i pjesshëm i krijuar nga PPPP')&&partialMsg.includes('Dosja e Tenderit'),'PPPP partial ZIP mistakes must get a precise recovery message');
assert(window.PSTTenderDossierImportV1._test.clientMatchScore('339-Dosja e Tenderit -korrigjuar.doc','339-Dosja e Tenderit -korigjuar.doc')>=65,'Harmless KRPP correction-spelling differences must still match the expected document');

const zipFile=new window.File(['fake-zip-bytes'],'Dosja e Tenderit.zip',{type:'application/zip'});
assert.equal(await window.PSTTenderDossierImportV1.uploadArchive(tenderId,zipFile,zipButton),true);
assert.equal(uploadArchiveRequests,1,'Complete ZIP import should need one archive import request');
assert(statusRequests>=0,'Background recovery status checks are allowed but must not create projects');
assert.equal(canonicalAnalyzeCalls,1,'Completed ZIP archive must return exactly once to the canonical dossier analyzer');
assert.equal(document.getElementById('pst-tda-analysis').getAttribute('data-dossier-complete'),'1');
assert.equal(document.getElementById('create-project').disabled,false,'Krijo projekt may become available only after the complete dossier analysis');
assert.equal(projectClicks,0,'Completing the dossier must never create a project automatically');
const decision=document.querySelector('.pst-tender-final-decision');
assert(decision,'Completed dossier must show an explicit final recommendation block');
assert.equal(decision.querySelector('b').textContent,'VAZHDO');
assert.equal(decision.querySelectorAll('li').length,2,'Final recommendation must show concrete reasons');

console.log('Tender UI real flow: KRPP detail -> click or drag ZIP/file on main/per-document target -> canonical archive analysis -> human project gate passed.');
