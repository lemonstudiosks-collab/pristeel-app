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
assert(source.includes("Pergjigju ne te njejten gjuhe si pyetja"), 'conversation should answer in the user language');
assert(source.includes('allowed[str(e.source_id)]'), 'returned evidence must be filtered against real allowed sources');
assert(loader.includes('pristeel-project-intelligence-conversation-v1.js?v=20260815-1'), 'current Project-first loader must load the conversation extension');

const dyn = (manifest.dynamicRuntime || []).find(x => x.module === 'pristeel-project-intelligence-conversation-v1.js');
assert(dyn, 'conversation extension must be registered as dynamic runtime');
assert.strictEqual(dyn.loader, 'pristeel-project-first-actions-v1.js');
assert((manifest.areas || []).some(a => a.area === 'project-workspace' && (a.finalOwners || []).includes('pristeel-project-intelligence-conversation-v1.js')), 'project workspace ownership must register the conversation extension');
assert(inventory.includes("{ file: 'pristeel-project-intelligence-conversation-v1.js', count: 1 }"), 'AI callsite inventory must explicitly audit the new runtime caller');

(async () => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <div id="pst-project-summary-bg"><div class="pst-ps-wrap"><section id="pai-42"></section></div></div>
  </body></html>`, { runScripts: 'outside-only', url: 'https://example.test/' });
  const { window } = dom;
  window.__pstCurrentProjectId = '42';
  window.__pstIntegrityLastData = {
    project: { id: '42', name: 'Demo Steel Project', client: 'Client AG', status: 'offer', pipeline_stage: 'commercial', deadline: '2026-08-30' },
    emails: [{ subject: 'Technical clarification', sent_at: '2026-08-15T08:00:00Z', direction: 'incoming', from_email: 'client@example.com', snippet: 'Please confirm galvanizing.' }],
    contacts: [{ name: 'Anna Buyer', email: 'client@example.com', company: 'Client AG' }],
    files: [{ name: 'specification.pdf', mimeType: 'application/pdf' }],
    bom: [{ description: 'S355 steel', quantity: 10, unit: 't' }],
    rfqs: [], supplierOffers: [], ourOffers: [], invoicesOut: [], invoicesIn: [], adjustments: [], guarantees: []
  };

  const reads = [];
  window.supaFetch = async function(path) {
    reads.push({ path, argc: arguments.length });
    if (String(path).startsWith('project_analyses?')) return [{
      created_at: '2026-08-15T09:00:00Z',
      engine: 'ai',
      analysis: {
        executive_summary: 'Clienti kerkon konfirmim per galvanizim.',
        risks: [{ text: 'Galvanizimi mbetet per konfirmim.', severity: 'high', source_ids: ['E1'] }],
        next_actions: [{ title: 'Konfirmo galvanizimin', why: 'Kerkese e klientit', source_ids: ['E1'] }]
      },
      source_manifest: [{ id: 'P1', type: 'project', label: 'Project' }, { id: 'E1', type: 'email', label: 'Technical clarification' }],
      source_counts: { emails: 1, files: 1 }
    }];
    if (String(path).startsWith('tasks?')) return [];
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
        answer: 'Rreziku kryesor eshte galvanizimi i pakonfirmuar.',
        confidence: 'high',
        evidence: [
          { source_id: 'E1', reason: 'Emaili i klientit kerkon konfirmim.' },
          { source_id: 'FAKE99', reason: 'Ky burim nuk ekziston.' }
        ],
        uncertainty: '',
        suggested_next_step: 'Konfirmo specifikimin e galvanizimit me klientin.',
        follow_up: 'Mund ta diskutojme edhe ndikimin ne cmim.'
      };
    }
  };

  window.eval(source);
  assert(window.PSTProjectIntelligenceConversationV1, 'conversation API must be exposed');
  assert.strictEqual(aiCalls, 0, 'loading the module must not call AI');

  const mounted = window.PSTProjectIntelligenceConversationV1.mount('42');
  assert.strictEqual(mounted, true, 'conversation should mount inside the existing Project Summary');
  assert(window.document.getElementById('pst-pic-42'), 'conversation UI should be present after mount');
  assert.strictEqual(aiCalls, 0, 'mounting the conversation UI must not call AI');

  const result = await window.PSTProjectIntelligenceConversationV1.ask('42', 'Ku e sheh rrezikun me te madh?');
  assert.strictEqual(aiCalls, 1, 'one explicit user question must trigger exactly one AI request');
  assert(lastOptions && Array.isArray(lastOptions.messages), 'AI request should use the audited requestJson message contract');
  assert(lastOptions.messages[0].content.includes('bashkepunetor i larte i PRISTEEL'), 'system prompt should frame PPPP as a project collaborator');
  assert.strictEqual(result.evidence.length, 1, 'fabricated evidence IDs must be removed in code');
  assert.strictEqual(result.evidence[0].source_id, 'E1');
  assert(reads.every(x => x.argc === 1), 'all Supabase calls in conversation runtime must be read-only one-argument GETs');

  const turns = window.PSTProjectIntelligenceConversationV1._test.session('42').turns;
  assert.strictEqual(turns.length, 2, 'the session should retain the user question and assistant reply for follow-up context');
  assert.strictEqual(turns[0].role, 'user');
  assert.strictEqual(turns[1].role, 'assistant');

  window.PSTProjectIntelligenceConversationV1.clear('42');
  assert.strictEqual(window.PSTProjectIntelligenceConversationV1._test.session('42').turns.length, 0, 'clear should only clear the in-memory conversation session');

  console.log('Project Intelligence conversation smoke OK');
})().catch(err => {
  console.error(err);
  process.exit(1);
});