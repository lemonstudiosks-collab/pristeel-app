const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async () => {
  const source = fs.readFileSync('pristeel-redesign-finalizer-v1.js', 'utf8');
  assert(!/MutationObserver|setInterval\s*\(/.test(source), 'Finalizer must stay bounded and observer-free');
  assert(!/supaFetch|fetch\s*\(|localStorage\.setItem|sessionStorage\.setItem/.test(source), 'Finalizer must not write or fetch data');
  assert(!/(?:pstOpenProjectWorkspace|authGetSession|doLogin|PSTEmail)\s*=/.test(source), 'Finalizer must not replace core project/auth/Gmail functions');

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
  dom.window.close();
  console.log('Redesign finalizer smoke test passed.');
})().catch(error => { console.error(error); process.exit(1); });
