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

const responses=[
  {ok:true,tender_id:tenderId,dossier_complete:false,uploaded_document:docA,remaining_protected_documents:[docB]},
  {ok:true,tender_id:tenderId,dossier_complete:true,uploaded_document:docB,remaining_protected_documents:[],analysis:{ok:true,recommendation:'VAZHDO'}}
];
window.fetch=globalThis.fetch=async(url,init)=>{
  assert(String(url).includes('/functions/v1/pppp-tender-dossier-import'),'UI called an unexpected backend path');
  const sent=JSON.parse(init.body);assert.equal(sent.mode,'upload');assert.equal(sent.tender_id,tenderId);
  const body=responses.shift();assert(body,'Unexpected extra upload request');
  return {ok:true,status:200,text:async()=>JSON.stringify(body)};
};

window.eval(fs.readFileSync('pristeel-tender-dossier-import-v1.js','utf8'));
window.PSTTenderDossierImportV1.apply();
window.eval(fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8'));
window.PSTRedesignFinalizerV3.installTenderProtectedDocumentGuide();
window.PSTRedesignFinalizerV3.renderTenderProtectedGuide({tender_id:tenderId,dossier_complete:false,protected_documents:[docA,docB]});

let uploadButtons=[...document.querySelectorAll('[data-pst-krpp-upload]')];
let krppLinks=[...document.querySelectorAll('.pst-final-krpp-doc a')];
assert.equal(uploadButtons.length,2,'Both missing documents must expose Ngarko në PPPP');
assert.equal(krppLinks.length,2,'Both missing documents must expose a KRPP link');
assert(krppLinks.every(a=>a.href.includes('DocumentForDispositionPrivateFrm.aspx')),'Protected-document actions must route to the KRPP protected document endpoint');
assert(krppLinks[0].href.includes(encodeURIComponent(docA).replace(/%20/g,'+'))||decodeURIComponent(krppLinks[0].href).includes(docA),'First KRPP link must identify the exact missing file');

const fileA=new window.File(['doc-a'],docA,{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
assert.equal(await window.PSTTenderDossierImportV1.uploadProtected(tenderId,docA,fileA,uploadButtons[0]),true);
uploadButtons=[...document.querySelectorAll('[data-pst-krpp-upload]')];
assert.equal(uploadButtons.length,1,'After the first upload only the remaining protected document should stay in the UI');
assert.equal(uploadButtons[0].getAttribute('data-expected-name'),docB);
assert.equal(document.getElementById('create-project').disabled,true,'Krijo projekt must stay blocked while the dossier is incomplete');
assert.equal(canonicalAnalyzeCalls,0,'Partial upload must not run a parallel/final analysis');

const fileB=new window.File(['doc-b'],docB,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
assert.equal(await window.PSTTenderDossierImportV1.uploadProtected(tenderId,docB,fileB,uploadButtons[0]),true);
assert.equal(canonicalAnalyzeCalls,1,'Completed archive must return exactly once to the canonical dossier analyzer');
assert.equal(document.getElementById('pst-tda-analysis').getAttribute('data-dossier-complete'),'1');
assert.equal(document.getElementById('create-project').disabled,false,'Krijo projekt may become available only after the complete dossier analysis');
assert.equal(projectClicks,0,'Completing the dossier must never create a project automatically');
const decision=document.querySelector('.pst-tender-final-decision');
assert(decision,'Completed dossier must show an explicit final recommendation block');
assert.equal(decision.querySelector('b').textContent,'VAZHDO');
assert.equal(decision.querySelectorAll('li').length,2,'Final recommendation must show concrete reasons');
assert.equal(responses.length,0);

console.log('Tender UI flow: KRPP links -> uploads -> canonical archive analysis -> human project gate passed.');