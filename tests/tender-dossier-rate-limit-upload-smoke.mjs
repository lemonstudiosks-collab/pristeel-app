import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const tenderId='a0c8ff1f-bd41-484a-8b82-6c9b0ee6d37e';
const docA='Dosja e Tenderit 20.08.2026.Docx';
const docB='Lista e pershkrimit te çmimeve - Furnizim me Material Metalik.xlsx';
const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="pst-ti-body">
  <div id="pst-pcw-ti-actions"><a class="pst-pcw-source-link" href="https://e-prokurimi.rks-gov.net/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=4248232">KRPP</a></div>
  <div id="pst-pcw-server-analysis"></div>
  <button id="create-project" data-pcw-ti="go" data-id="${tenderId}" disabled>Krijo projekt</button>
</div>
</body></html>`,{url:'https://lemonstudiosks-collab.github.io/pristeel-app/',runScripts:'outside-only'});
const {window}=dom,{document}=window;
window.console=console;
window.CSS={escape:(value)=>String(value).replace(/(["\\])/g,'\\$1')};
window.alert=(msg)=>{throw new Error('Unexpected alert: '+msg);};
window._SB_URL='https://example.supabase.co';
window._SB_KEY='anon-key';
window.authGetSession=()=>({access_token:'user-token',expires_at:Math.floor(Date.now()/1000)+3600});
window.authRefreshIfNeeded=async()=>window.authGetSession();
window.pstToast=()=>{};
window.supaFetch=async(path)=>{
  assert(path.includes('kek_tender_watch?id=eq.'+encodeURIComponent(tenderId)));
  return [{id:tenderId,title:'Furnizim me material metalik',authority:'POLICIA E KOSOVËS',detail_url:'https://e-prokurimi.rks-gov.net/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=4248232',source_url:'https://e-prokurimi.rks-gov.net/SPIN_PROD/',payload:{source:'KRPP'}}];
};

let analysisCalls=0,statusCalls=0;
window.fetch=globalThis.fetch=async(url,init)=>{
  const body=JSON.parse(init.body);
  if(String(url).includes('/functions/v1/pppp-tender-dossier-analysis')){
    analysisCalls++;
    assert.equal(body.tender_id,tenderId);
    return {ok:false,status:429,text:async()=>JSON.stringify({ok:false,error:'ai_rate_limited',code:'AI_RATE_LIMITED',message:'Dosja është ruajtur; analiza AI nuk u përfundua për shkak të limitit të përkohshëm',tender_id:tenderId,source:'KRPP',documents:[],dossier_complete:false,protected_documents:[docA,docB],dossier_saved:true,analysis_ready:false,retryable:true,retry_uses_saved_dossier:true})};
  }
  if(String(url).includes('/functions/v1/pppp-tender-dossier-import')){
    statusCalls++;
    assert.equal(body.mode,'status');
    return {ok:true,status:200,text:async()=>JSON.stringify({ok:true,tender_id:tenderId,dossier_complete:false,remaining_protected_documents:[docA,docB],archived_documents:[]})};
  }
  throw new Error('Unexpected backend path: '+url);
};

window.eval(fs.readFileSync('pristeel-tender-dossier-analysis-v1.js','utf8'));
window.eval(fs.readFileSync('pristeel-tender-dossier-import-v1.js','utf8'));
window.PSTTenderDossierImportV1.apply();

const handled=await window.PSTTenderDossierAnalysisV1.analyze(tenderId,false);
await new Promise(resolve=>setTimeout(resolve,20));

const panel=document.getElementById('pst-tda-analysis');
assert.equal(handled,true,'A handled 429 must not trigger the outer generic failure popup');
assert.equal(analysisCalls,1,'429 handling must make exactly one AI analysis request');
assert(panel,'Rate-limit state must keep the dossier panel');
assert.equal(panel.getAttribute('data-analysis-ready'),'0');
assert.equal(panel.getAttribute('data-dossier-complete'),'0','Incomplete saved dossier state must survive the AI 429');
assert(panel.querySelector('.pst-tda-error.rate-limit'),'Rate-limit message must stay visible');
assert(panel.querySelector('.pst-tda-partial'),'Incomplete dossier placeholder must remain available for the importer');
const upload=panel.querySelector('[data-pst-krpp-zip-upload]');
assert(upload,'Manual Ngarko dokumentet / ZIP-in must remain available during AI rate limiting');
assert.equal(upload.textContent.trim(),'Ngarko dokumentet / ZIP-in');
assert.equal(document.getElementById('create-project').disabled,true,'Krijo projekt must remain blocked while analysis is incomplete');
assert(statusCalls>=0,'Background importer recovery checks are allowed');

console.log('Tender AI 429 keeps the saved incomplete dossier visible and restores manual ZIP/file upload without unlocking project creation.');
