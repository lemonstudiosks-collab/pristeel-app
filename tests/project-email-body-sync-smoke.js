const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const src=fs.readFileSync('pristeel-project-email-body-sync-v1.js','utf8');
  assert(!/MutationObserver|setInterval\s*\(/.test(src),'Email body sync must not globally observe or poll');
  assert(!/\.auth\s*\(/.test(src),'Email body sync must not launch OAuth authorization');
  assert(!/project_email_links/.test(src),'Email body sync must not change project email relations');
  assert(/format=full/.test(src),'Email body sync must request Gmail full messages');
  assert(/Shfaq emailin e plotë/.test(src),'Communication UI must expose full-email expansion');

  const dom=new JSDOM('<!doctype html><html><head></head><body><div id="page-workspace-project" class="pf2-on"><button data-pf2-tab="communication" class="on"></button><section class="pf2-card"><header><div><b>Emailat e projektit</b><span>1 email</span></div></header><article class="pf2-mail"><b>Offer</b><span>Supplier</span><p>preview</p></article></section></div></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const full='PRICE OFFER\n'+('Steel fabrication terms and conditions. '.repeat(80));
  w.__pstIntegrityLastData={project:{id:'p1'},emails:[{gmail_message_id:'m1',snippet:full}]};
  w.PSTGoogleWorkspaceAuth={gmailScope:'gmail',currentToken:()=>''};
  w.eval(src);
  w.PSTProjectEmailBodySyncV1.enhanceDisplay();
  const btn=w.document.querySelector('[data-pst-mail-expand]');
  assert(btn,'Long project email must receive an expand control');
  btn.click();
  const box=w.document.querySelector('.pst-mail-full');
  assert(box&&!box.hidden&&box.textContent.includes('PRICE OFFER'),'Expanded email must contain the full stored text');
  dom.window.close();
  console.log('Project email body sync smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});