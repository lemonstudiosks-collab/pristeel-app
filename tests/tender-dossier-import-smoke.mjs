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
assert(runtime.includes('uploadArchive(id,f,btn,name)'),'Dropping/selecting a ZIP on a document row must send that row as a strong hint');
assert(runtime.includes('clientFamily')&&runtime.includes("'word'")&&runtime.includes("'sheet'"),'Client diagnostics must treat DOC/DOCX and XLS/XLSX as compatible families');
assert(runtime.includes('REKOMANDIMI PËRFUNDIMTAR')&&runtime.includes('decision_reasons'),'Completed analysis must show VAZHDO/LËRE reasons');

assert(importer.includes("IMPORT_VERSION='protected-archive-upload-v4'"),'Unified server resolver version must be v4');
assert(importer.includes('repairMojibake')&&importer.includes("normalize('NFKD')"),'KRPP filename normalization must tolerate encoding and diacritic differences');
assert(importer.includes('documentClass')&&importer.includes("return'dossier'")&&importer.includes("return'prices'"),'Server resolver must classify dossier and price-list semantics across filename languages');
assert(importer.includes('familyCompatible')&&importer.includes('WORD_EXT')&&importer.includes('SHEET_EXT'),'DOC/DOCX and XLS/XLSX must be matched by document family, not exact extension');
assert(importer.includes('resolveMatches')&&importer.includes('languagePenalty'),'ZIP variants must be globally resolved with language-neutral preference');
assert(importer.includes('expected_name_hint'),'Per-row drag/drop hint must be honored by the server resolver');
assert(importer.includes('collectZipCandidates')&&importer.includes('MAX_ZIP_DEPTH=2'),'Nested ZIP inspection must remain bounded');
assert(importer.includes('candidate_documents')&&importer.includes('contained_documents'),'Failed matching must report what was actually found');
assert(importer.includes('path=`tender-protected/${tenderId}/${hash}.${actualExt}`'),'Storage keys must be ASCII-safe UUID/hash/ext only and must not contain the original filename');
assert(importer.includes('source_name:sourceName')&&importer.includes('expected_name:canonical'),'Archive metadata must preserve both the canonical expected name and actual KRPP filename');
assert(importer.includes('/functions/v1/pppp-tender-protected-archive-analysis'),'Completion must still use only the existing protected-archive analyzer');
assert(!/api\.openai\.com\/v1\/responses|analysisSchema\(/.test(importer),'Upload bridge must not contain a parallel analysis engine');

assert(analyzer.includes("ARCHIVE_VERSION='protected-archive-analysis-v5'"),'Canonical analyzer must understand source-format metadata');
assert(analyzer.includes('archiveSourceName')&&analyzer.includes('source_name:d.source_name'),'Analyzer must use and preserve the real KRPP source filename');
assert(analyzer.includes("kind=ext(sourceName)||ext(name)"),'Analyzer must parse by the actual source format rather than a canonical renamed extension');
assert(analyzer.includes('legacyDocText')&&analyzer.includes("kind==='doc'"),'Legacy DOC files must have deterministic server-side text extraction fallback');
assert(analyzer.includes('docxText')&&analyzer.includes('spreadsheetText'),'DOCX and XLS/XLSX extraction must remain canonical');
assert(analyzer.includes("enum:['VAZHDO','LËRE']")&&analyzer.includes('decision_reasons'),'Final decision remains binary and explained');
assert(analyzer.includes('“Krijo projekt” mbetet veprim manual'),'Project creation must remain a human action');

console.log('Tender unified KRPP ingest -> safe storage -> canonical protected archive analysis smoke passed.');
