const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const code=fs.readFileSync('pristeel-offer-client-output-finalizer-v1.js','utf8');
const dom=new JSDOM(`<!doctype html><html><body>
  <h2 id="view-title">Oferta jote — pamja përfundimtare</h2>
  <select id="of-lang"><option value="sr" selected>Srpski</option></select>
  <input id="pst-sale-install" value="">
  <button id="pdf-btn">PDF</button>
  <div id="of-pre">
    <div>PONUDA</div>
    <div>USLOVI</div>
    <div id="install-row">
      <span>Montaža / Installation — CIJENA ZA DOPUNU</span>
      <span>paušal</span>
      <span>0,00 €</span>
      <span>0,00 €</span>
    </div>
    <div id="total-box"><div><span id="total-label">Ukupna cena (neto)</span><strong>68.009,98 EUR</strong></div></div>
  </div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
const w=dom.window,d=w.document;
w.__pstIntegrityLastData={currentOurOffer:{doc_nr:'PST-OFF-2026-08-024',status:'draft_review'},ourOffers:[]};
w.printOfer=function(){w.__printed=true;};
w.genOfer=function(){};
w.PSTOfferNumberIntegrityV1={};
w.alert=function(){};

w.eval(code);
const api=w.PSTOfferClientOutputFinalizerV1;
assert(api,'client output finalizer should load');
api.patch();

assert(d.querySelector('[data-pst-offer-draft-banner="1"]'),'Draft banner must be visible');
assert(d.querySelector('[data-pst-offer-draft-banner="1"]').textContent.includes('NIJE SPREMNO ZA SLANJE'),'Pending installation must mark draft not ready to send');
assert.strictEqual(d.getElementById('view-title').textContent,'Ponuda — draft za pregled','Outer title must not call an incomplete draft final');
const installText=d.getElementById('install-row').textContent.replace(/\s+/g,' ');
assert(!installText.includes('0,00 €'),'Installation row must never show zero as a client price when pending');
assert(installText.includes('ZA DOPUNU'),'Pending installation price must be explicit');
assert(installText.includes('NIJE UKLJUČENO'),'Pending installation total must say it is not included');
assert.strictEqual(d.getElementById('total-label').textContent,'Međuzbir bez montaže','Total must become subtotal while installation is pending');
assert.strictEqual(d.getElementById('pdf-btn').disabled,true,'PDF export must be blocked while installation is pending');

// Simulate regeneration after installation is completed.
d.getElementById('pst-sale-install').value='5000';
d.getElementById('of-pre').innerHTML=`
  <div>PONUDA</div><div>USLOVI</div>
  <div id="install-row"><span>Montaža čelične konstrukcije</span><span>paušal</span><span>5.000,00 €</span><span>5.000,00 €</span></div>
  <div id="total-box"><div><span id="total-label">Ukupna cena (neto)</span><strong>73.009,98 EUR</strong></div></div>`;
api.patch();
assert.strictEqual(d.getElementById('pdf-btn').disabled,false,'PDF export must unlock after installation is completed');
assert(d.querySelector('[data-pst-offer-draft-banner="1"]').textContent.includes('SPREMNO ZA PREGLED'),'Completed but unsent offer remains a review draft');
assert.strictEqual(d.getElementById('total-label').textContent,'Ukupna cena (neto)','Completed offer may show total price again');

dom.window.close();
console.log('Client offer draft gate smoke test passed.');
