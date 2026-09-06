import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const tenderId='a0c8ff1f-bd41-484a-8b82-6c9b0ee6d37e';
const docA='Dosja e Tenderit 20.08.2026.Docx';
const docB='Lista e pershkrimit te çmimeve - Furnizim me Material Metalik.xlsx';
const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="pst-ti-body">
  <div id="pst-pcw-ti-actions"><a class="pst-pcw-source-link" href="https://e-prokurimi.rks-gov.net/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=4248232">KRPP</a></div>
  <section id="pst-tda-analysis" data-tender-id="${tenderId}" data-dossier-complete="0">
    <div class="pst-tda-partial"><ul><li>${docA}</li><li>${docB}</li></ul></div>
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

let requests=0;
window.fetch=globalThis.fetch=async(url,init)=>{
  requests++;
  assert(String(url).includes('/functions/v1/pppp-tender-dossier-import'),'UI called an unexpected backend path');
  const sent=JSON.parse(init.body);
  assert.equal(sent.mode,'upload_archive','ZIP flow must use the consolidated archive upload mode');
  assert.equal(sent.tender_id,tenderId);
  assert.equal(sent.file.name,'Dosja e Tenderit.zip');
  return {ok:true,status:200,text:async()=>JSON.stringify({ok:true,tender_id:tenderId,dossier_complete:true,archive_file_name:'Dosja e Tenderit.zip',contained_documents:[docA,docB,'PPPP-DOSJA-INDEX.txt'],matched_documents:[docA,docB],remaining_protected_documents:[],analysis:{ok:true,recommendation:'VAZHDO'}})};
};

window.eval(fs.readFileSync('pristeel-tender-dossier-import-v1.js','utf8'));
window.PSTTenderDossierImportV1.apply();
window.eval(fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8'));
window.PSTRedesignFinalizerV3.installTenderProtectedDocumentGuide();
window.PSTRedesignFinalizerV3.renderTenderProtectedGuide({tender_id:tenderId,dossier_complete:false,protected_documents:[docA,docB]});
window.PSTTenderDossierImportV1._test.renderZipGuide({tender_id:tenderId,dossier_complete:false,protected_documents:[docA,docB]});

const zipButton=document.querySelector('[data-pst-krpp-zip-upload]');
const dropZone=document.querySelector('[data-pst-krpp-zip-drop]');
const uploadButtons=[...document.querySelectorAll('[data-pst-krpp-upload]')];
const krppLinks=[...document.querySelectorAll('.pst-final-krpp-doc a')];
assert(zipButton,'Incomplete dossier must show a clear ZIP upload button');
assert.equal(zipButton.textContent.trim(),'Ngarko Dosja e Tenderit.zip');
assert(dropZone,'Incomplete dossier must expose a ZIP drag-and-drop target');
assert.equal(dropZone.getAttribute('data-tender-id'),tenderId,'ZIP drop target must be bound to the current tender');
assert.equal(uploadButtons.length,2,'Individual missing-document upload must remain as a safe fallback');
assert.equal(krppLinks.length,2,'Both missing documents must keep a KRPP link');
assert(krppLinks.every(a=>a.href.includes('DocumentForDispositionPrivateFrm.aspx')),'Protected-document actions must route to the KRPP protected document endpoint');
assert(document.querySelector('.pst-tender-zip-import').textContent.includes('Browser-i nuk lejon'),'UI must explain that automatic access to the local Downloads folder is not allowed');
assert.equal(document.getElementById('create-project').disabled,true,'Krijo projekt must stay blocked before the ZIP is processed');

const zipFile=new window.File(['fake-zip-bytes'],'Dosja e Tenderit.zip',{type:'application/zip'});
assert.equal(await window.PSTTenderDossierImportV1.uploadArchive(tenderId,zipFile,zipButton),true);
assert.equal(requests,1,'Complete ZIP import should need one archive import request');
assert.equal(canonicalAnalyzeCalls,1,'Completed ZIP archive must return exactly once to the canonical dossier analyzer');
assert.equal(document.getElementById('pst-tda-analysis').getAttribute('data-dossier-complete'),'1');
assert.equal(document.getElementById('create-project').disabled,false,'Krijo projekt may become available only after the complete dossier analysis');
assert.equal(projectClicks,0,'Completing the dossier must never create a project automatically');
const decision=document.querySelector('.pst-tender-final-decision');
assert(decision,'Completed dossier must show an explicit final recommendation block');
assert.equal(decision.querySelector('b').textContent,'VAZHDO');
assert.equal(decision.querySelectorAll('li').length,2,'Final recommendation must show concrete reasons');

console.log('Tender UI ZIP flow: KRPP -> choose/drop ZIP -> canonical archive analysis -> human project gate passed.');
