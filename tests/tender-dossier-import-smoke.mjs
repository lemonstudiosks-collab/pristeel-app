import assert from 'node:assert/strict';
import fs from 'node:fs';

const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
const runtime=fs.readFileSync('pristeel-tender-dossier-import-v1.js','utf8');
const importer=fs.readFileSync('supabase/functions/pppp-tender-dossier-import/index.ts','utf8');
const archiveAnalyzer=fs.readFileSync('supabase/functions/pppp-tender-protected-archive-analysis/index.ts','utf8');

assert(finalizer.includes('pristeel-tender-dossier-import-v1.js'),'Finalizer must load the purpose-limited tender import companion');
assert(finalizer.includes('data-pst-krpp-upload')&&finalizer.includes('Ngarko në PPPP'),'Missing protected-document upload action');
assert(finalizer.includes('X.pickAndUpload'),'Finalizer must delegate the selected-file action to the tender import companion');
assert(finalizer.includes('Hap dokumentin në KRPP'),'Each protected document must keep a KRPP action');
assert(!/supaFetch|fetch\s*\(|localStorage\.setItem|sessionStorage\.setItem/.test(finalizer),'Finalizer must remain presentation-only and must not fetch or write data');
assert(!/MutationObserver|setInterval\s*\(/.test(finalizer),'Import presentation must remain bounded and polling-free');

assert(runtime.includes('/functions/v1/pppp-tender-dossier-import'),'Tender import runtime is not wired to the upload bridge');
assert(runtime.includes("mode:'upload'")&&runtime.includes("mode:'finalize'"),'Upload and explicit finalization paths must be wired');
assert(runtime.includes('expected_name')&&runtime.includes('fileBase64'),'Runtime must bind each selected file to the exact missing KRPP document');
assert(runtime.includes('PSTTenderDossierAnalysisV1')&&runtime.includes('refreshCanonical'),'Successful completion must return to the canonical dossier UI');
assert(runtime.includes('pst:tender-dossier-ready')&&runtime.includes('remaining_protected_documents'),'Partial uploads must immediately refresh the missing-document UI without a second analysis engine');
assert(!/MutationObserver|setInterval\s*\(/.test(runtime),'Tender import runtime must remain bounded and polling-free');

assert(importer.includes("protected-archive-upload-v1"),'Importer must be explicitly scoped as a protected-archive upload bridge');
assert(importer.includes("BUCKET='project-source-files'")&&importer.includes('protected_archive'),'Uploaded KRPP documents must enter the existing canonical protected archive');
assert(importer.includes('pppp_tender_fetch_queue')&&importer.includes('protected_documents'),'Upload completion must reconcile against the existing protected-document queue');
assert(importer.includes('/functions/v1/pppp-tender-protected-archive-analysis'),'Final analysis must call the existing protected archive analyzer');
assert(!/api\.openai\.com\/v1\/responses|analysisSchema\(|previous_partial_analysis/.test(importer),'Upload bridge must not contain a parallel AI analysis engine');
assert(importer.includes('tender_not_found_or_not_visible')&&importer.includes('visibleTender'),'Tender visibility must be checked with the caller session before privileged archive writes');
assert(importer.includes('MAX_FILE_BYTES=30*1024*1024')&&importer.includes('ALLOWED_EXT'),'Upload size and type boundaries are missing');
assert(importer.includes('document_not_expected')&&importer.includes('normalizeName(expectedName)'),'The importer must refuse files outside the current protected-document list');
assert(importer.includes('db.storage.from(BUCKET).upload'),'Protected documents must be stored in canonical Supabase Storage, not a parallel files/base64 store');
assert(!/\/rest\/v1\/files|file_base64/.test(importer),'Legacy parallel files/base64 persistence must be removed');
assert(!/gmail\.googleapis\.com|sendgrid\.com|api\.mailgun|\/rest\/v1\/(?:purchase_orders|contracts|client_offers)/i.test(importer),'Tender import must not contain external/binding action endpoints');

assert(archiveAnalyzer.includes("ARCHIVE_VERSION='protected-archive-analysis-v2'"),'Canonical protected archive analysis version was not advanced');
assert(archiveAnalyzer.includes("enum:['VAZHDO','LËRE']"),'Complete dossier analysis must return a binary VAZHDO/LËRE recommendation');
assert(archiveAnalyzer.includes('decision_reasons')&&archiveAnalyzer.includes('2-6 concrete evidence-based reasons'),'Final recommendation must include concrete reasons');
assert(archiveAnalyzer.includes("file_mode:'authenticated_protected_archive'"),'Completed dossier must stay on the existing authenticated protected archive path');
assert(archiveAnalyzer.includes('dossier_complete:true')&&archiveAnalyzer.includes('protected_documents:[]'),'Project readiness may be unlocked only by the completed canonical archive analysis');
assert(!/gmail\.googleapis\.com|sendgrid\.com|api\.mailgun|\/rest\/v1\/(?:purchase_orders|contracts|client_offers)/i.test(archiveAnalyzer),'Final analysis must preserve all human approval gates');

console.log('Tender protected-document upload -> canonical archive analysis smoke test passed.');