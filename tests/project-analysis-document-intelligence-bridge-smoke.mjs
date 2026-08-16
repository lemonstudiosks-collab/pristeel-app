import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const url = new URL('../pristeel-project-analysis-document-intelligence-v1.js', import.meta.url);
const src = fs.readFileSync(url, 'utf8');

assert.match(src, /project_attachment_links\?project_id=eq\./, 'bridge must read analyzed attachment intelligence');
assert.match(src, /analysis_status=eq\.analyzed/, 'bridge must only inject analyzed attachment content');
assert.match(src, /trust_tier/, 'trust tier must remain visible to Project Intelligence');
assert.match(src, /review_required/, 'OCR and review state must remain explicit');
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

console.log('project analysis document intelligence bridge smoke: ok');
