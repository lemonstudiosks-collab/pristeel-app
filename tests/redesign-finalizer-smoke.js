const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

function stripComments(s){
  return s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|\s)\/\/.*$/gm,'$1');
}

(async () => {
  const source = fs.readFileSync('pristeel-redesign-finalizer-v1.js', 'utf8');
  const readability = fs.readFileSync('pristeel-platform-readability-v1.js', 'utf8');
  const sourceCode = stripComments(source);
  const readabilityCode = stripComments(readability);
  assert(!/MutationObserver|setInterval\s*\(/.test(sourceCode), 'Finalizer must stay bounded and observer-free');
  assert(!/supaFetch|fetch\s*\(|localStorage\.setItem|sessionStorage\.setItem/.test(sourceCode), 'Finalizer must not write or fetch data');
  assert(!/(?:pstOpenProjectWorkspace|authGetSession|doLogin|PSTEmail)\s*=/.test(sourceCode), 'Finalizer must not replace core project/auth/Gmail functions');
  assert(!/MutationObserver|setInterval\s*\(/.test(readabilityCode), 'Readability layer must stay bounded and observer-free');
  assert(!/supaFetch|fetch\s*\(|localStorage\.(?:setItem|removeItem)|sessionStorage\.(?:setItem|removeItem)/.test(readabilityCode), 'Readability layer must stay UI-only');

  const dom = new JSDOM('<!doctype html><html><body><div id="page-workspace-home"></div></body></html>', { runScripts:'outside-only', url:'https://example.test/' });
  const w = dom.window;
  let searchDecorated = 0, cardsDecorated = 0, homeDecorated = 0;
  const newSearch = () => 'new-search';
  w.openCmdK = () => 'old-search';
  w.PSTBusinessCommandCenterV1 = { open:newSearch, decorateHome(){ searchDecorated++; } };
  w.PSTDashboardTaskCardsV1 = { decorate(){ cardsDecorated++; } };
  w.PSTHomeCommandCenterV2 = { decorate(){ homeDecorated++; } };
  w.eval(source);
  w.PSTRedesignFinalizerV1.apply();
  assert.strictEqual(w.openCmdK, newSearch, 'Finalizer did not restore the new universal search entry point');
  assert(searchDecorated > 0, 'Universal search home decoration was not re-applied');
  assert(cardsDecorated > 0, 'Dashboard cards were not re-applied');
  assert(homeDecorated > 0, 'Home command center was not re-applied');
  const loader = w.document.querySelector('script[data-pst-platform-readability]');
  assert(loader, 'Finalizer did not request the platform readability layer');
  assert(/pristeel-platform-readability-v1\.js/.test(loader.getAttribute('src') || ''), 'Finalizer loaded the wrong readability asset');
  dom.window.close();

  const rdDom = new JSDOM(`<!doctype html><html><head></head><body>
    <span id="tiny" style="font-size:7px">tiny meta</span>
    <b id="small" style="font-size:9px">small title</b>
    <button id="control" style="font-size:10px">Action</button>
    <p id="normal" style="font-size:14px">Normal body</p>
    <div id="of-pre"><span id="previewTiny" style="font-size:7px">PDF preview</span></div>
    <section class="pst-eoi-card"><header><div><b>Email offers</b><span>Meta</span></div><button class="pst-eoi-btn">Scan</button></header></section>
    <table class="pf2-compare"><thead><tr><th>Supplier</th></tr></thead><tbody><tr><td>2.70 EUR/kg</td></tr></tbody></table>
  </body></html>`, { runScripts:'outside-only', url:'https://example.test/' });
  const rw = rdDom.window;
  rw.eval(readability);
  rw.PSTPlatformReadabilityV1.apply(rw.document);
  assert(rw.document.getElementById('tiny').classList.contains('pst-rd-xxs'), '7px UI text was not normalized');
  assert(rw.document.getElementById('small').classList.contains('pst-rd-xs'), '9px UI text was not normalized');
  assert(rw.document.getElementById('control').classList.contains('pst-rd-control'), 'Small control text was not normalized');
  assert(!/pst-rd-/.test(rw.document.getElementById('normal').className), 'Normal 14px body text should remain untouched');
  assert(!/pst-rd-/.test(rw.document.getElementById('previewTiny').className), 'Generated document preview typography must remain untouched');
  const css = rw.document.getElementById('pst-platform-readability-v1-css').textContent;
  assert(css.includes('.pst-eoi-row b{font-size:13px!important'), 'Email offer rows do not have the expected readable subject size');
  assert(css.includes('.pf2-compare td{font-size:11.5px!important'), 'Commercial comparison cells do not have the expected readable size');
  rdDom.window.close();

  console.log('Redesign finalizer + platform readability smoke test passed.');
})().catch(error => { console.error(error); process.exit(1); });
