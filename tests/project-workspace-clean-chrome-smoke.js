const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');
const cleanup=fs.readFileSync('pristeel-offer-revision-email-bridge-v1.js','utf8');
const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="modbar" style="display:flex">legacy module bar</div>
<div class="topbar" style="display:flex">legacy page toolbar</div>
<div class="legacy-flow"><button class="flow-step">BOM</button><button class="flow-step">RFQ</button><button class="flow-step">Ofertat</button></div>
<div id="page-workspace-project" class="page active pf2-on"><div class="pst-pi-tabs"><button class="on" data-pf2-tab="commercial">Komerciale</button></div><div id="pst-pi-body"><div class="pst-csf" data-pst-csf="1">
<article class="pst-csf-supplier"><footer><button type="button" data-csf-detail="0">Detaje</button></footer><div class="pst-csf-detail" data-csf-detail-panel="0" hidden>Breakdown</div></article>
<section class="pst-csf-client"><button data-csf-detail="client">Shiko pozicionet</button><button class="primary" data-csf-action="revision">Krijo revision</button></section>
<section class="pst-csf-next"><button data-csf-action="revision">Krijo revision</button></section>
</div></div></div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test'});
const w=dom.window;
w.PSTProjectCommercialSimplifiedV1={render:function(){return true;}};
w.PSTOfferRevisionEmailDraftV1={createDraftFromCurrentOffer:function(){}};
w.eval(cleanup);
w.PSTOfferRevisionEmailBridgeV1.decorate();
assert.ok(w.document.body.classList.contains('pst-project-clean-chrome'),'project workspace must activate clean chrome state');
assert.ok(w.document.querySelector('.legacy-flow').classList.contains('pst-project-legacy-flow-ribbon'),'legacy flow ribbon must be marked for hiding');
assert.ok(cleanup.includes('.pst-project-clean-chrome #modbar'),'legacy module bar must be hidden');
assert.ok(cleanup.includes('.pst-project-clean-chrome .topbar'),'legacy page toolbar must be hidden');
const root=w.document.querySelector('[data-pst-csf="1"]');
assert.strictEqual(root.querySelectorAll('[data-csf-action="revision"]').length,1,'only the main next-action revision button may remain');
const detail=root.querySelector('.pst-csf-inline-detail');
assert.ok(detail,'supplier detail must become a native inline details disclosure');
assert.strictEqual(detail.open,false,'supplier detail begins closed');
detail.open=true;assert.strictEqual(detail.open,true,'supplier detail opens inline');
detail.open=false;assert.strictEqual(detail.open,false,'supplier detail closes inline without navigation');
assert.ok(!root.querySelector('.pst-csf-supplier [data-csf-detail]'),'old supplier detail button must be removed');
w.document.getElementById('page-workspace-project').classList.remove('active');
w.PSTOfferRevisionEmailBridgeV1.syncProjectChrome();
assert.ok(!w.document.body.classList.contains('pst-project-clean-chrome'),'clean chrome state must clear outside Project Workspace');
console.log('Project workspace clean chrome smoke test passed.');
dom.window.close();
