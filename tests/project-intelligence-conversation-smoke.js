const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('pristeel-project-intelligence-conversation-v1.js', 'utf8');
const loader = fs.readFileSync('pristeel-project-first-actions-v1.js', 'utf8');
const manifest = JSON.parse(fs.readFileSync('runtime-manifest.json', 'utf8'));
const inventory = fs.readFileSync('scripts/ai-runtime-callsite-inventory.mjs', 'utf8');

assert(!source.includes('MutationObserver'), 'conversation layer must not add a MutationObserver');
assert(!source.includes('setInterval('), 'conversation layer must not add polling');
assert(!/supaFetch\([^\n]*['"](?:POST|PATCH|PUT|DELETE)['"]/i.test(source), 'conversation layer must not write through Supabase');
assert.strictEqual((source.match(/\.requestJson\(/g) || []).length, 1, 'conversation layer should have one explicit AI request callsite');
assert(source.includes('[data-pst-project-summary]'), 'conversation must mount from the explicit Project Summary action');
assert(source.includes('kjo bisede eshte vetem read-only'), 'AI prompt must preserve the read-only boundary');
assert(source.includes('Mos shpik scope, sasi, cmime, afate, kontakte'), 'AI prompt must prohibit invented project facts');
assert(source.includes('COMMERCIAL_SNAPSHOT eshte llogaritur nga PPPP'), 'AI prompt must prioritize deterministic commercial context');
assert(source.includes('mos e quaj projektin te perfunduar'), 'AI prompt must reject stale terminal status when commercial evidence conflicts');
assert(source.includes('Mos e quaj diferencen fitim/marzh'), 'AI prompt must guard incomplete margin calculations');
assert(source.includes("Pergjigju ne te njejten gjuhe si pyetja"), 'conversation should answer in the user language');
assert(source.includes('allowed[str(e.source_id)]'), 'returned evidence must be filtered against real allowed sources');
assert(loader.includes('pristeel-project-intelligence-conversation-v1.js?v=20260815-commercial1'), 'current Project-first loader must load the commercial-grounded conversation extension');

const dyn = (manifest.dynamicRuntime || []).find(x => x.module === 'pristeel-project-intelligence-conversation-v1.js');
assert(dyn, 'conversation extension must be registered as dynamic runtime');
assert.strictEqual(dyn.loader, 'pristeel-project-first-actions-v1.js');
assert((manifest.areas || []).some(a => a.area === 'project-workspace' && (a.finalOwners || []).includes('pristeel-project-intelligence-conversation-v1.js')), 'project workspace ownership must register the conversation extension');
assert(inventory.includes("{ file: 'pristeel-project-intelligence-conversation-v1.js', count: 1 }"), 'AI callsite inventory must explicitly audit the runtime caller');

(async () => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <div id="pst-project-summary-bg"><div class="pst-ps-wrap"><section id="pai-42"></section></div></div>
  </body></html>`, { runScripts: 'outside-only', url: 'https://example.test/' });
  const { window } = dom;
  window.__pstCurrentProjectId = '42';
  const supplierOffer = {
    id: 'supplier-1', project_id: '42', supplier: 'Sector Construction', currency: 'EUR',
    price_kg: 1.85, zinc_kg: 0.42, transport_eur: null, total_eur: 0, created_at: '2026-08-09T10:29:44Z',
    notes: 'Powder Coating pas zinkimit: 0.56 EUR/kg · Pa TVSH'
  };
  const ourOffer = {
    id: 'our-1', project_id: '42', series: 'QUO', doc_nr: 'PST-OFF-2026-08-023', currency: 'EUR', total_eur: 77994.78,
    followup_status: 'open', followup_count: 0, created_at: '2026-08-10T20:42:11Z',
    offer_state: { kg: '25828.74', oferPos: [
      { _pstKey: 'base', qty: 25828.74, unit: 'kg', price: 1.95 },
      { _pstKey: 'zinc', qty: 25828.74, unit: 'kg', price: 0.43 },
      { _pstKey: 'coat', qty: 25828.74, unit: 'kg', price: 0.57 },
      { _pstKey: 'transport', qty: 1, unit: 'ls', price: 1800 }
    ] }
  };
  window.__pstIntegrityLastData = {
    project: { id: '42', name: 'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA', client: 'ITALIAN STYLE', status: 'arkivuar', pipeline_stage: null, business_ref: 'Dukley Seafront Restoran Budva' },
    emails: [], contacts: [{ name: 'Aleksandar Cingelic', email: 'aleksandar@example.com', company: 'ITALIAN STYLE' }], files: [], bom: [], rfqs: [],
    offers: [supplierOffer], supplierOffers: [supplierOffer], ourOffers: [ourOffer], invoicesOut: [], invoicesIn: [], adjustments: [], guarantees: []
  };

  const reads = [];
  window.supaFetch = async function(path) {
    reads.push({ path, argc: arguments.length });
    if (String(path).startsWith('project_analyses?')) return [{
      created_at: '2026-08-15T18:32:27Z', engine: 'rules_rate_limit',
      analysis: { executive_summary: 'Ky brief i vjeter e quan projektin te realizuar.', current_stage: 'arkivuar' },
      source_manifest: [{ id: 'P1', type: 'project', label: 'Project' }], source_counts: { offers: 1 }
    }];
    if (String(path).startsWith('tasks?')) return [];
    if (String(path).startsWith('project_emails?suggested_project_id=eq.42')) return [{
      gmail_message_id: 'sent-offer-1', gmail_thread_id: 'thread-1', project_id: null, suggested_project_id: '42',
      sent_at: '2026-08-14T06:18:00Z', direction: 'outgoing', subject: 'Ponuda za čeličnu konstrukciju – Dukley Seafront Restaurant, Budva',
      from_email: 'arianit.vllahiu@prissteel.com', to_emails: ['aleksandar@example.com'], cc_emails: ['italianstyle@example.com'],
      match_method: 'subject+snippet', match_confidence: 65, needs_review: false
    }];
    return [];
  };

  let aiCalls = 0;
  let lastOptions = null;
  window.PSTAI = {
    hasApiKey: () => true,
    requestJson: async options => {
      aiCalls += 1;
      lastOptions = options;
      return {
        answer: 'Oferta jone eshte derguar dhe jemi ne pritje te pergjigjes se bleresit.',
        confidence: 'high', evidence: [{ source_id: 'CURRENT', reason: 'Snapshot-i komercial tregon oferten dhe emailin e derguar.' }, { source_id: 'FAKE99', reason: 'Jo real.' }],
        uncertainty: 'Kostoja e transportit te prodhuesit nuk eshte e regjistruar.',
        suggested_next_step: 'Bej follow-up pas 2-3 diteve pune.', follow_up: 'Mos e trajto diferencen si fitim te paster.',
        draft_email: { subject: 'Follow-up – Dukley Seafront Restaurant', body: 'Po ju kontaktojme shkurt lidhur me oferten tone.' }
      };
    }
  };

  window.eval(source);
  const api = window.PSTProjectIntelligenceConversationV1;
  assert(api, 'conversation API must be exposed');
  assert.strictEqual(aiCalls, 0, 'loading the module must not call AI');
  assert.strictEqual(api.mount('42'), true, 'conversation should mount inside Project Summary');
  assert.strictEqual(aiCalls, 0, 'mounting must not call AI');

  const commercial = api._test.buildCommercialSnapshot(window.__pstIntegrityLastData, window.__pstIntegrityLastData.project, [{
    sent_at: '2026-08-14T06:18:00Z', direction: 'outgoing', subject: 'Ponuda za čeličnu konstrukciju – Dukley Seafront Restaurant, Budva', suggested_project_id: '42'
  }]);
  assert.strictEqual(commercial.operational_state, 'waiting_client_response');
  assert.strictEqual(commercial.status_conflict, true, 'open/sent client offer must conflict with a stale archived status');
  assert.strictEqual(commercial.supplier_offer_count, 1);
  assert.strictEqual(commercial.current_supplier_basis.supplier, 'Sector Construction');
  assert.strictEqual(commercial.our_offer.offer_ref, 'PST-OFF-2026-08-023');
  assert.strictEqual(commercial.our_offer.total, 77994.78);
  assert.strictEqual(commercial.comparison.supplier_known_unit_eur_per_kg, 2.83);
  assert.strictEqual(commercial.comparison.our_sale_unit_eur_per_kg, 2.95);
  assert.strictEqual(commercial.comparison.unit_difference_eur_per_kg, 0.12);
  assert.strictEqual(commercial.comparison.supplier_known_subtotal_eur, 73095.33);
  assert.strictEqual(commercial.comparison.total_difference_vs_known_supplier_components_eur, 4899.45);
  assert.strictEqual(commercial.comparison.known_component_difference_eur, 3099.45);
  assert.strictEqual(commercial.follow_up_window.earliest.slice(0, 10), '2026-08-18');
  assert.strictEqual(commercial.follow_up_window.latest.slice(0, 10), '2026-08-19');

  const result = await api.ask('42', 'Me trego situaten, ofertat dhe cka duhet te bejme.');
  assert.strictEqual(aiCalls, 1, 'one explicit question must trigger exactly one AI request');
  assert(lastOptions && Array.isArray(lastOptions.messages));
  const prompt = lastOptions.messages[lastOptions.messages.length - 1].content;
  assert(prompt.includes('"operational_state":"waiting_client_response"'), 'prompt must include derived waiting state');
  assert(prompt.includes('"status_conflict":true'), 'prompt must surface stale terminal status conflict');
  assert(prompt.includes('Sector Construction'), 'prompt must include supplier identity');
  assert(prompt.includes('77994.78'), 'prompt must include our offer value');
  assert(prompt.includes('4899.45'), 'prompt must include deterministic commercial difference');
  assert(prompt.includes('2026-08-18'), 'prompt must include business-day follow-up timing');
  assert.strictEqual(result.evidence.length, 1, 'fabricated evidence IDs must be removed');
  assert.strictEqual(result.evidence[0].source_id, 'CURRENT');
  assert(api._test.responseText(result).includes('Draft email'), 'structured follow-up draft should be rendered in the conversation');
  assert(reads.every(x => x.argc === 1), 'all Supabase calls in conversation runtime must be read-only one-argument GETs');

  const turns = api._test.session('42').turns;
  assert.strictEqual(turns.length, 2, 'session should retain question and reply');
  api.clear('42');
  assert.strictEqual(api._test.session('42').turns.length, 0, 'clear should only clear in-memory conversation');
  console.log('Project Intelligence conversation smoke OK');
})().catch(err => { console.error(err); process.exit(1); });