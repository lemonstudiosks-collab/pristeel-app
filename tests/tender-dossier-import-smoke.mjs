import assert from 'node:assert/strict';
import fs from 'node:fs';

const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');
const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
const runtime=fs.readFileSync('pristeel-tender-dossier-import-v1.js','utf8');
const importer=fs.readFileSync('supabase/functions/pppp-tender-dossier-import/index.ts','utf8');
const analyzer=fs.readFileSync('supabase/functions/pppp-tender-protected-archive-analysis/index.ts','utf8');

assert(bootstrap.includes('pristeel-tender-dossier-import-v1.js?v=20260906-zip2'),'Bootstrap must load the canonical KRPP importer directly');
assert(finalizer.includes('data-pst-krpp-upload')&&finalizer.includes('Ngarko në PPPP'),'Finalizer must keep only the presentation hook for individual uploads');
assert(!/supaFetch|fetch\s*\(|localStorage\.setItem|sessionStorage\.setItem/.test(finalizer),'Finalizer must remain presentation-only');
assert(!/MutationObserver|setInterval\s*\(/.test(runtime),'Tender importer UI must remain bounded and polling-free');
assert(runtime.includes('/functions/v1/pppp-tender-dossier-import'),'All KRPP uploads must use the single dossier-import bridge');
assert(runtime.includes("mode:zip?'upload_archive':'upload'")&&runtime.includes('expected_name_hint'),'ZIP and loose-file UI paths must converge on the same server resolver with an optional row hint');
assert(runtime.includes('data-pst-krpp-zip-drop')&&runtime.includes('data-pst-krpp-doc-drop'),'Main and per-document drag-and-drop targets must remain active');
assert(runtime.includes('input.multiple=true')&&runtime.includes('uploadFiles'),'Main picker must accept multiple ZIP/files');
assert(runtime.includes('uploadArchive(id,f,btn,name)'),'Dropping/selecting a ZIP on a document row must send that row as a UI hint');
assert(runtime.includes('clientFamily')&&runtime.includes("'word'")&&runtime.includes("'sheet'"),'Client diagnostics must treat DOC/DOCX and XLS/XLSX as compatible families');
assert(runtime.includes('REKOMANDIMI PËRFUNDIMTAR')&&runtime.includes('decision_reasons'),'Completed analysis must show VAZHDO/LËRE reasons');

assert(importer.includes("IMPORT_VERSION='protected-archive-upload-v5'"),'Unified server resolver version must be v5');
assert(importer.includes('repairMojibake')&&importer.includes("normalize('NFKD')"),'KRPP filename normalization must tolerate encoding and diacritic differences');
assert(importer.includes('documentClass')&&importer.includes("return'dossier'")&&importer.includes("return'prices'"),'Server resolver must classify dossier and price-list semantics across filename languages');
assert(importer.includes('familyCompatible')&&importer.includes('WORD_EXT')&&importer.includes('SHEET_EXT'),'DOC/DOCX and XLS/XLSX remain compatible file families');
assert(importer.includes('identityVerdict')&&importer.includes('foreign_procurement_reference_detected'),'Importer must perform tender-identity checks and reject explicit foreign references');
assert(importer.includes("error:mismatches.length?'document_tender_mismatch':'document_match_failed'"),'Cross-tender mismatch must have a dedicated blocking response');
assert(!importer.includes("normalizeName(hint)===normalizeName(expected))score+=45"),'A row hint must never make an unrelated compatible file pass by itself');
assert(importer.includes("archive_role:role")&&importer.includes("'supplemental'"),'ZIP ingest must preserve supplemental dossier documents after a trusted match');
assert(importer.includes('mime=mimeFor(sourceName)'),'Extracted ZIP entries must derive MIME type from the extracted file, never inherit ZIP MIME');
assert(importer.includes('tender_watch_id:tender.id')&&importer.includes('identity_status:identity.status'),'Archive metadata must bind each newly imported document to the tender and identity verdict');
assert(importer.includes('isCanonicalProtectedAnalysis')&&importer.includes('!canonical&&prior'),'Partial import must not downgrade an existing canonical protected analysis');
assert(importer.includes('/functions/v1/pppp-tender-protected-archive-analysis'),'Completion must still use the canonical protected-archive analyzer');
assert(importer.includes('runProtectedArchiveAnalysisPreservingUpload')&&importer.includes('deferredAnalysis'),'Successful upload must remain successful when AI completion is temporarily deferred');
assert(importer.includes('[429,502,503].includes(status)')&&importer.includes('dossier_saved:true')&&importer.includes('analysis_ready:false'),'AI rate/provider limits must preserve the saved dossier and report not-ready without converting upload into a generic 500');
assert(!/api\.openai\.com\/v1\/responses|finalSchema\(/.test(importer),'Upload bridge must not contain a parallel analysis engine');

assert(analyzer.includes("ARCHIVE_VERSION='protected-archive-analysis-v6'"),'Canonical analyzer must be on protected archive analysis v6');
assert(analyzer.includes("const VERSION='v12'"),'Canonical analysis snapshot must be v12');
assert(analyzer.includes('docxStructuredText')&&analyzer.includes('[PARAGRAPH')&&analyzer.includes('[TABLE'),'DOCX extraction must preserve paragraph and table locators');
assert(analyzer.includes('spreadsheetStructuredText')&&analyzer.includes('CELLS A'),'Spreadsheet extraction must preserve sheet/row/cell-range locators');
assert(analyzer.includes('splitChunks')&&analyzer.includes('batchTextUnits'),'All extracted tender text must be chunked/batched instead of silently clipped to one small prefix');
assert(analyzer.includes('identityGuard')&&analyzer.includes('tender_dossier_integrity_mismatch'),'Analyzer must independently block cross-tender archive contamination');
assert(analyzer.includes('administrative_conditions')&&analyzer.includes('qualification_criteria')&&analyzer.includes('financial_conditions'),'Final analysis must separate administrative, qualification and financial conditions');
assert(analyzer.includes('bid_guarantee')&&analyzer.includes('performance_guarantee')&&analyzer.includes('offer_validity'),'Guarantees and offer validity must have explicit result fields');
assert(analyzer.includes('clarification_questions')&&analyzer.includes('citations')&&analyzer.includes('coverage'),'Analysis must expose clarification questions, traceable citations, and coverage');
assert(analyzer.includes("locator_type:{type:'string',enum:['page','section','heading','paragraph','table_row','sheet_row','cell_range','line','file']"),'Citations must support document-specific locators');
assert(analyzer.includes("file_mode:'authenticated_protected_archive'")&&analyzer.includes('canonical_rank:100'),'Complete authenticated archive must become the strongest canonical source');
assert(analyzer.includes("analysis_ready:false")&&analyzer.includes('AI_RATE_LIMITED'),'AI/provider failure must preserve dossier and remain not-ready');
assert(!analyzer.includes('raw.slice(0,700)'),'Raw OpenAI provider error bodies must not leak from protected archive analysis');

console.log('Tender unified ingest -> integrity guard -> complete traceable protected archive analysis smoke passed.');
