import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const url = new URL('../pristeel-project-analysis-document-intelligence-v1.js', import.meta.url);
const src = fs.readFileSync(url, 'utf8');

assert.match(src, /project_attachment_links\?project_id=eq\./, 'bridge must read analyzed attachment intelligence');
assert.match(src, /analysis_status=eq\.analyzed/, 'bridge must only inject analyzed attachment content');
assert.match(src, /trust_tier/, 'trust tier must remain visible to Project Intelligence');
assert.match(src, /review_required/, 'OCR and review state must remain explicit');
assert.match(src, /health\.score dhe confidence\.score jane numra te plote nga 0 deri ne 100/, 'final AI prompt must define the 0-100 score scale');
assert.doesNotMatch(src, /bom_items[^\n]*['"]POST['"]/, 'bridge must not write BOM');
assert.doesNotMatch(src, /tasks[^\n]*['"]POST['"]/, 'bridge must not create tasks');
assert.doesNotMatch(src, /gmail[^\n]*(?:send|modify|trash)/i, 'bridge must not mutate Gmail');

const context = {
  window: {},
  document: {
    addEventListener() {},
    getElementById() { return null; },
  },
  console,
  setTimeout() { return 0; },
  clearTimeout() {},
};
vm.createContext(context);
vm.runInContext(src, context, { filename: 'pristeel-project-analysis-document-intelligence-v1.js' });

const T = context.window.PSTProjectAnalysisDocumentIntelligenceV1?._test;
assert(T, 'test hooks must be exposed');

const rows = [
  {
    id: 1,
    attachment_name: 'contract.pdf',
    attachment_mime_type: 'application/pdf',
    analysis_status: 'analyzed',
    analysis_method: 'pdf-parse-v1',
    analysis_confidence: 0.88,
    analyzed_at: '2026-08-16T10:00:00Z',
    extracted_text: 'Contract scope and delivery terms',
    extracted_data: { trust_tier: 'text', facts: { standards: ['EN 1090-2'] } },
    bom_status: 'none',
  },
  {
    id: 2,
    attachment_name: 'scan.pdf',
    attachment_mime_type: 'application/pdf',
    analysis_status: 'analyzed',
    analysis_method: 'local-tesseract-ocr-v1',
    analyzed_at: '2026-08-16T11:00:00Z',
    extracted_text: 'OCR transport document text',
    extracted_data: { trust_tier: 'ocr' },
    bom_status: 'review',
  },
  {
    id: 3,
    attachment_name: 'pending.png',
    analysis_status: 'needs_vision',
    extracted_text: '',
  },
];

const intel = T.intelSummary(rows);
assert.equal(intel.analyzed_count, 2);
assert.equal(intel.review_count, 1);
assert.equal(intel.rows.length, 2);
assert.equal(intel.rows[0].file_name, 'scan.pdf');
assert.equal(intel.rows[0].trust_tier, 'ocr');
assert.equal(intel.rows[0].review_required, true);
assert.equal(intel.rows[1].review_required, false);

const synthetic = T.syntheticRecord(intel);
assert.equal(synthetic.doc_type, 'PPPP_DOCUMENT_INTELLIGENCE');
assert.equal(synthetic.analyzed_document_count, 2);
assert.match(synthetic.interpretation_rule, /OCR/i);

const evidence = T.documentEvidence(intel);
assert.equal(evidence.length, 2);
assert.equal(evidence[0].id, 'DI1');
assert.equal(evidence[0].label, 'scan.pdf');
assert.equal(evidence[0].meta.trust_tier, 'ocr');
assert.equal(evidence[0].meta.review_required, true);
assert.equal(evidence[1].id, 'DI2');
assert.equal(evidence[1].label, 'contract.pdf');
assert.equal(evidence[1].meta.review_required, false);
assert.match(evidence[1].text, /EN 1090-2/);

const finalOpts = T.augmentAiOptions({ messages: [
  { role: 'user', content: 'Përgatit analizën përfundimtare operative të projektit në shqip.' },
]}, intel);
const finalPrompt = finalOpts.messages[0].content;
assert.match(finalPrompt, /0 deri ne 100/);
assert.match(finalPrompt, /DI1/);
assert.match(finalPrompt, /scan\.pdf/);
assert.match(finalPrompt, /source_ids ekzistuese dhe te vlefshme/);

const extractOpts = T.augmentAiOptions({ messages: [
  { role: 'user', content: 'Analizo këtë pjesë të një projekti. source_ids vetëm nga: P1, D1. PPPP_DOCUMENT_INTELLIGENCE project_attachment_intelligence' },
]}, intel);
const extractPrompt = extractOpts.messages[0].content;
assert.match(extractPrompt, /ID TE LEJUARA SHTESE/);
assert.match(extractPrompt, /\[DI1\]/);
assert.match(extractPrompt, /REVIEW_REQUIRED=true/);

const aiLegacy = { health: { score: 7 }, confidence: { score: 8 } };
T.normalizeAiScores(aiLegacy);
assert.equal(aiLegacy.health.score, 70);
assert.equal(aiLegacy.confidence.score, 80);
const aiHundred = { health: { score: 72 }, confidence: { score: 84 } };
T.normalizeAiScores(aiHundred);
assert.equal(aiHundred.health.score, 72);
assert.equal(aiHundred.confidence.score, 84);

const fallback = {
  executive_summary: 'Project summary',
  missing_information: [{ text: 'Dokumentacioni teknik dhe komercial', why_needed: 'Scope-i nuk mund të verifikohet.' }],
  next_actions: [{ title: 'Importo dokumentet kryesore', why: 'Dosja e Drive-it nuk ka skedarë.' }],
  requirements: [],
};
assert.equal(T.ruleDocumentationFix(fallback, intel), true);
assert.equal(fallback.missing_information.length, 0);
assert.equal(fallback.next_actions.length, 0);
assert.equal(fallback.requirements.length, 1);
assert.match(fallback.requirements[0].text, /2 dokumente\/attachment-e/);
assert.deepEqual(Array.from(fallback.requirements[0].source_ids), ['DI1', 'DI2']);

console.log('project analysis document intelligence bridge smoke: ok');
