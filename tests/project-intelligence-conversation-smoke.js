const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('pristeel-project-intelligence-conversation-v1.js', 'utf8');
const identitySource = fs.readFileSync('pristeel-gmail-project-identity-guard-v1.js', 'utf8');
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
assert(source.includes('DATA_COVERAGE tregon sa e plote'), 'AI prompt must reason about incomplete source coverage');
assert(source.includes('kurre mos thuaj se nuk ka oferte PRISTEEL'), 'AI prompt must not deny a recorded PRISTEEL quote');
assert(source.includes('identity_email_candidates'), 'conversation must expose read-only identity-matched historical email candidates');
assert(source.includes('PSTProjectDataIntegrity'), 'conversation must refresh through the existing project data integrity adapter');
assert(source.includes('PSTGmailProjectIdentityGuardV1'), 'conversation must reuse the existing Gmail project identity guard');
assert(source.includes('mos e quaj projektin te perfunduar'), 'AI prompt must reject stale terminal status when commercial evidence conflicts');
assert(source.includes('Mos e quaj diferencen fitim/marzh'), 'AI prompt must guard incomplete margin calculations');
assert(source.includes("Pergjigju ne te njejten gjuhe si pyetja"), 'conversation should answer in the user language');
assert(source.includes('allowed[str(e.source_id)]'), 'returned evidence must be filtered against real allowed sources');
assert(loader.includes('pristeel-project-intelligence-conversation-v1.js?v=20260816-coverage1'), 'current Project-first loader must load the coverage-aware conversation extension');

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
    id: 'supplier-1', project_id: '42', supplier: 'SECTOR CONSTRUCTION - FADIL REXHAJ', currency: 'EUR',
    price_kg: 1.75, zinc_kg: 0, transport_eur: null, total_eur: 128973.25, created_at: '2026-06-22T10:00:00Z', notes: ''
  };
  const revisedOffer = {
    id: 'our-2', project_id: '42', series: 'QUO', doc_nr: 'PST-OFF-2026-07-012', currency: 'EUR', total_eur: 136343.15,
    followup_status: 'open', followup_count: 0, created_at: '2026-07-12T10:00:00Z',
    offer_state: { kg: '73732.78', oferPos: [
      { _pstKey: 'base', qty: 73732.78, unit: 'kg', price: 1.75 },
      { _pstKey: 'zinc', qty: 73732.78, unit: 'kg', price: 0.10 }
    ] }
  };
  const initialOfferEmail = {
    gmail_message_id: 'initial-offer-email', gmail_thread_id: 'and-thread', project_id: '42', sent_at: '2026-06-23T08:32:39Z',
    direction: 'outgoing', subject: 'Re: Zahtev za ponudu za izradu čelične konstrukcije', from_email: 'sales@prissteel.com',
    to_emails: ['aleksandarcinge@gmail.com'], cc_emails: ['italianstyle.bd@gmail.com'], snippet: 'U prilogu dostavljamo naše komercijalne ponude.', has_attachments: true
  };
  const freshData = {
    project: { id: '42', name: 'ITALIAN STYLE - SPORTSKA HALA ANDRIJEVICA', client: 'ITALIAN STYLE D.O.O.', status: 'pritje', pipeline_stage: 'client_offer', business_ref: 'Sportska Hala Andrijevica', deadline: '2026-09-07' },
    emails: [initialOfferEmail], contacts: [], files: [], bom: [], rfqs: [],
    offers: [supplierOffer], supplierOffers: [supplierOffer], ourOffers: [revisedOffer],
    inboxDocs: [{ gmail_msg_id: 'initial-offer-email', sender: 'Arianit Vllahiu <sales@prissteel.com>', subject: initialOfferEmail.subject, received_at: initialOfferEmail.sent_at, snippet: initialOfferEmail.snippet, file_name: 'IS-CG-02_2026_sa_montažom.pdf', processed: false }],
    invoicesOut: [], invoicesIn: [], adjustments: [], guarantees: []
  };

  // Deliberately stale workspace cache: the bug was that chat trusted this and denied the PRISTEEL quote.
  window.__pstIntegrityLastData = {
    project: freshData.project, emails: [], contacts: [], files: [], bom: [], rfqs: [], offers: [supplierOffer], supplierOffers: [supplierOffer], ourOffers: [], inboxDocs: [], invoicesOut: [], invoicesIn: [], adjustments: [], guarantees: []
  };

  let integrityLoads = 0;
  window.PSTProjectDataIntegrity = {
    load: async id => { integrityLoads++; assert.strictEqual(id, '42'); return freshData; }
  };
  window.PSTGoogleWorkspaceAuth = { gmailScope: 'gmail', cachedToken: () => '' };

  const reads = [];
  window.supaFetch = async function(path) {
    reads.push({ path, argc: arguments.length });
    const p = String(path);
    if (p.startsWith('project_analyses?')) return [{
      created_at: '2026-08-16T04:39:26Z', engine: 'groq',
      analysis: {
        executive_summary: 'Projekti është në pritje.',
        requirements: [{ text: 'Oferta e PRISTEEL-it', status: 'confirmed', category: 'commercial', source_ids: ['D1'] }]
      },
      source_manifest: [{ id: 'P1', type: 'projekt', label: 'Të dhënat bazë' }, { id: 'D1', type: 'dokumente', label: 'Dokumentet komerciale' }],
      source_counts: { emails: 11, offers: 1, docs: 1 }
    }];
    if (p.startsWith('tasks?')) return [];
    if (p.startsWith('project_emails?suggested_project_id=eq.42')) return [];
    if (p.startsWith('projects?select=id,name,client,ref,business_ref,status')) return [
      freshData.project,
      { id: 'roleff', name: 'Roleff - 411320-KR Maschinenhaus Schlammbehandlung', client: 'Roleff GmbH', ref: '411320-KR', business_ref: '411320-KR' },
      { id: 'mega', name: 'Mega Totem — PNR High Rise Single Column MID 16m', client: 'ITALIAN STYLE D.O.O.', business_ref: 'PNR High Rise Single Column MID 16m' }
    ];
    if (p.startsWith('project_emails?select=gmail_message_id')) return [
      { gmail_message_id: 'competitor-jul6', gmail_thread_id: 'comp-thread', project_id: null, suggested_project_id: null, sent_at: '2026-07-06T08:00:00Z', direction: 'incoming', subject: 'Sportska sala u Andrijevici', from_name: 'Aleksandar Cingelic', from_email: 'aleksandarcinge@gmail.com', to_emails: ['sales@prissteel.com'], cc_emails: [], snippet: 'U prilogu šaljem ponudu drugog proizvođača.', match_method: 'unmatched', match_confidence: 0, needs_review: false, has_attachments: false },
      { gmail_message_id: 'wrong-roleff', gmail_thread_id: 'wrong-thread', project_id: 'roleff', suggested_project_id: 'roleff', sent_at: '2026-06-19T15:21:24Z', direction: 'outgoing', subject: 'Projekti Andrijevica - Mal i Zi', from_email: 'sales@prissteel.com', to_emails: ['sectorconstruction20@gmail.com'], snippet: 'Projekti Andrijevica - Mal i Zi', match_method: 'subject+snippet', match_confidence: 65, needs_review: false, has_attachments: false },
      { gmail_message_id: 'mega-mail', gmail_thread_id: 'mega-thread', project_id: 'mega', suggested_project_id: 'mega', sent_at: '2026-07-10T10:00:00Z', direction: 'outgoing', subject: 'Mega Totem — PNR High Rise Single Column MID 16m', from_email: 'sales@prissteel.com', to_emails: ['aleksandarcinge@gmail.com'], snippet: 'Mega Totem PNR High Rise Single Column MID 16m', match_method: 'subject+snippet', match_confidence: 90, needs_review: false }
    ];
    return [];
  };

  // Use the real existing identity guard. The conversation layer must not invent a second matcher.
  window.eval(identitySource);

  let aiCalls = 0;
  let lastOptions = null;
  window.PSTAI = {
    hasApiKey: () => true,
    requestJson: async options => {
      aiCalls += 1;
      lastOptions = options;
      return {
        answer: 'PPPP ka një ofertë të rishikuar të PRISTEEL-it, PST-OFF-2026-07-012, me vlerë 136,343.15 EUR. Emaili i 6 korrikut nga Aleksandar që përmend ofertën e një prodhuesi tjetër del si evidence e fortë e Andrijevicës, por relacioni i tij historik nuk është i konfirmuar. Nuk po e gjej emailin final të dërgimit të ofertës së rishikuar në relacionet aktualisht të lidhura.',
        confidence: 'high', evidence: [{ source_id: 'CURRENT', reason: 'QUO-ja e regjistruar dhe evidence e identitetit të projektit.' }],
        uncertainty: 'Google Workspace nuk është i autorizuar në këtë sesion, prandaj mungesa e emailit final nuk provon se ai nuk është dërguar.',
        suggested_next_step: 'Autorizo Google Workspace dhe verifiko thread-in final para follow-up-it.', follow_up: '', draft_email: { subject: '', body: '' }
      };
    }
  };

  window.eval(source);
  const api = window.PSTProjectIntelligenceConversationV1;
  assert(api, 'conversation API must be exposed');
  assert.strictEqual(aiCalls, 0, 'loading the module must not call AI');
  assert.strictEqual(integrityLoads, 0, 'loading the module must not refresh project data');
  assert.strictEqual(api.mount('42'), true, 'conversation should mount inside Project Summary');
  assert.strictEqual(aiCalls, 0, 'mounting must not call AI');
  assert.strictEqual(integrityLoads, 0, 'mounting must not refresh project data');

  const ctx = await api._test.context('42');
  assert.strictEqual(integrityLoads, 1, 'explicit context build must refresh through the existing integrity adapter');
  assert.strictEqual(ctx.current.our_offers.length, 1, 'fresh registered PRISTEEL quote must override stale empty cache');
  assert.strictEqual(ctx.current.our_offers[0].doc_nr, 'PST-OFF-2026-07-012');
  assert.strictEqual(ctx.current.our_offers[0].total_eur, 136343.15);
  assert.strictEqual(ctx.current.offer_inbox[0].file_name, 'IS-CG-02_2026_sa_montažom.pdf', 'initial sent offer attachment evidence must be included');
  assert.strictEqual(ctx.current.identity_email_candidates.length, 2, 'only strong Andrijevica identity candidates should be surfaced');
  assert(ctx.current.identity_email_candidates.some(x => x.gmail_message_id === 'competitor-jul6' && x.relation_state === 'unlinked'), 'unmatched competitor email should be surfaced read-only');
  assert(ctx.current.identity_email_candidates.some(x => x.gmail_message_id === 'wrong-roleff' && x.relation_state === 'conflicting-existing-link'), 'wrong-linked Andrijevica email should be surfaced as a relation conflict');
  assert(!ctx.current.identity_email_candidates.some(x => x.gmail_message_id === 'mega-mail'), 'Italian Style sibling-project email must not leak into Andrijevica');
  assert.strictEqual(ctx.data_coverage.google_workspace_authorized, false);
  assert(ctx.data_coverage.warnings.some(x => /historia live e Gmail/i.test(x)), 'coverage must warn when Google Workspace is not authorized');
  assert(ctx.data_coverage.warnings.some(x => /evidence read-only/i.test(x)), 'coverage must explain relation-conflict candidates');
  assert.strictEqual(ctx.commercial_snapshot.our_offer.offer_ref, 'PST-OFF-2026-07-012');
  assert.strictEqual(ctx.commercial_snapshot.our_offer.total, 136343.15);
  assert.strictEqual(ctx.commercial_snapshot.operational_state, 'client_offer_open', 'a registered quote without a confirmed/suggested send email must stay open, not pretend it was sent');

  // Keep the previous deterministic Dukley comparison regression.
  const dukleySupplier = { supplier: 'Sector Construction', currency: 'EUR', price_kg: 1.85, zinc_kg: 0.42, notes: 'Powder Coating pas zinkimit: 0.56 EUR/kg', created_at: '2026-08-09T10:00:00Z' };
  const dukleyOur = { series: 'QUO', doc_nr: 'PST-OFF-2026-08-023', currency: 'EUR', total_eur: 77994.78, followup_status: 'open', created_at: '2026-08-10T20:42:11Z', offer_state: { kg: '25828.74', oferPos: [{ _pstKey:'base', qty:25828.74, unit:'kg', price:1.95 },{ _pstKey:'zinc', qty:25828.74, unit:'kg', price:0.43 },{ _pstKey:'coat', qty:25828.74, unit:'kg', price:0.57 },{ _pstKey:'transport', qty:1, unit:'ls', price:1800 }] } };
  const commercial = api._test.buildCommercialSnapshot({ offers:[dukleySupplier], ourOffers:[dukleyOur], emails:[] }, { status:'arkivuar' }, [{ sent_at:'2026-08-14T06:18:00Z', direction:'outgoing', subject:'Ponuda za čeličnu konstrukciju – Dukley Seafront Restaurant, Budva' }]);
  assert.strictEqual(commercial.operational_state, 'waiting_client_response');
  assert.strictEqual(commercial.status_conflict, true);
  assert.strictEqual(commercial.comparison.supplier_known_unit_eur_per_kg, 2.83);
  assert.strictEqual(commercial.comparison.our_sale_unit_eur_per_kg, 2.95);
  assert.strictEqual(commercial.comparison.total_difference_vs_known_supplier_components_eur, 4899.45);
  assert.strictEqual(commercial.follow_up_window.earliest.slice(0, 10), '2026-08-18');
  assert.strictEqual(commercial.follow_up_window.latest.slice(0, 10), '2026-08-19');

  const result = await api.ask('42', 'Si ka shkuar rrjedha e ketij projekti? Cfare cmimi kemi dhene?');
  assert.strictEqual(aiCalls, 1, 'one explicit user question must trigger exactly one AI request');
  assert.strictEqual(integrityLoads, 2, 'explicit question must refresh current project evidence again');
  assert(lastOptions && Array.isArray(lastOptions.messages));
  const prompt = lastOptions.messages[lastOptions.messages.length - 1].content;
  assert(prompt.includes('PST-OFF-2026-07-012'), 'prompt must include the fresh revised PRISTEEL quote');
  assert(prompt.includes('136343.15'), 'prompt must include the fresh revised quote value');
  assert(prompt.includes('Sportska sala u Andrijevici'), 'prompt must include the unmatched competitor-offer email as read-only identity evidence');
  assert(prompt.includes('conflicting-existing-link'), 'prompt must expose wrong historical relation rather than silently reassign it');
  assert(prompt.includes('IS-CG-02_2026_sa_montažom.pdf'), 'prompt must include initial offer attachment evidence already stored in PPPP');
  assert(prompt.includes('"google_workspace_authorized":false'), 'prompt must expose Gmail coverage state');
  assert(prompt.includes('DATA_COVERAGE'), 'prompt must include explicit coverage semantics');
  assert.strictEqual(result.evidence.length, 1);
  assert.strictEqual(result.evidence[0].source_id, 'CURRENT');
  assert(reads.every(x => x.argc === 1), 'all Supabase calls in conversation runtime must be read-only one-argument GETs');

  const turns = api._test.session('42').turns;
  assert.strictEqual(turns.length, 2, 'session should retain question and reply');
  api.clear('42');
  assert.strictEqual(api._test.session('42').turns.length, 0, 'clear should only clear in-memory conversation');
  dom.window.close();
  console.log('Project Intelligence conversation smoke OK');
})().catch(err => { console.error(err); process.exit(1); });