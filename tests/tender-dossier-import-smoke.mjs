import assert from 'node:assert/strict';
import fs from 'node:fs';

const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');
const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
const runtime=fs.readFileSync('pristeel-tender-dossier-import-v1.js','utf8');
const importer=fs.readFileSync('supabase/functions/pppp-tender-dossier-import/index.ts','utf8');
const archiveAnalyzer=fs.readFileSync('supabase/functions/pppp-tender-protected-archive-analysis/index.ts','utf8');

assert(bootstrap.includes('pristeel-tender-dossier-import-v1.js?v=20260906-zip2'),'Bootstrap must load the ZIP-capable canonical protected-archive import companion directly');
assert(bootstrap.includes('pristeel-redesign-finalizer-v1.js?v=20260906-krppzip1'),'Bootstrap must cache-bust the current tender protected-document guide');
assert(finalizer.includes('pristeel-tender-dossier-import-v1.js'),'Finalizer may keep its compatibility loader for the same import companion');
assert(finalizer.includes('data-pst-krpp-upload')&&finalizer.includes('Ngarko në PPPP'),'Individual protected-document upload must remain as fallback');
assert(finalizer.includes('Hap dokumentin në KRPP'),'Each protected document must keep a KRPP action');
assert(!/supaFetch|fetch\s*\(|localStorage\.setItem|sessionStorage\.setItem/.test(finalizer),'Finalizer must remain presentation-only and must not fetch or write data');
assert(!/MutationObserver|setInterval\s*\(/.test(finalizer),'Import presentation must remain bounded and polling-free');

assert(runtime.includes('/functions/v1/pppp-tender-dossier-import'),'Tender import runtime is not wired to the upload bridge');
assert(runtime.includes("mode:'upload_archive'")&&runtime.includes("mode:'upload'")&&runtime.includes("mode:'finalize'"),'ZIP, individual upload and explicit finalization paths must be wired');
assert(runtime.includes('pickArchiveAndUpload')&&runtime.includes('uploadArchive'),'ZIP chooser must be wired to the upload bridge');
assert(runtime.includes('renderZipGuide')&&runtime.includes('Ngarko Dosja e Tenderit.zip'),'Importer must render the visible ZIP upload action inside the canonical incomplete dossier panel');
assert(runtime.includes('Browser-i nuk lejon')&&runtime.includes('Downloads'),'UI must explicitly explain why a fresh local download cannot be read automatically');
assert(runtime.includes('data-pst-krpp-zip-drop')&&runtime.includes("addEventListener('drop'"),'ZIP drag-and-drop must be handled without polling');
assert(runtime.includes('PSTTenderDossierAnalysisV1')&&runtime.includes('refreshCanonical'),'Successful completion must return to the canonical dossier UI');
assert(runtime.includes('pst:tender-dossier-ready')&&runtime.includes('remaining_protected_documents'),'Partial imports must immediately refresh the missing-document UI without a second analysis engine');
assert(runtime.includes('REKOMANDIMI PËRFUNDIMTAR')&&runtime.includes('decision_reasons'),'Completed analysis must visibly explain the final recommendation');
assert(!/MutationObserver|setInterval\s*\(/.test(runtime),'Tender import runtime must remain bounded and polling-free');

assert(importer.includes("protected-archive-upload-v2"),'Importer must be explicitly scoped as the protected-archive upload bridge');
assert(importer.includes('npm:fflate@0.8.2')&&importer.includes('unzipSync'),'ZIP import must extract the user-selected KRPP archive server-side');
assert(importer.includes("mode==='upload_archive'")&&importer.includes('contained_documents')&&importer.includes('matched_documents'),'ZIP import must report contained, matched and still-missing documents');
assert(importer.includes("BUCKET='project-source-files'")&&importer.includes('protected_archive'),'Uploaded KRPP documents must enter the existing canonical protected archive');
assert(importer.includes('pppp_tender_fetch_queue')&&importer.includes('protected_documents'),'Upload completion must reconcile against the existing protected-document queue');
assert(importer.includes('/functions/v1/pppp-tender-protected-archive-analysis'),'Final analysis must call the existing protected archive analyzer');
assert(!/api\.openai\.com\/v1\/responses|analysisSchema\(|previous_partial_analysis/.test(importer),'Upload bridge must not contain a parallel AI analysis engine');
assert(importer.includes('tender_not_found_or_not_visible')&&importer.includes('visibleTender'),'Tender visibility must be checked with the caller session before privileged archive writes');
assert(importer.includes('MAX_ZIP_BYTES=30*1024*1024')&&importer.includes('MAX_ZIP_ENTRIES')&&importer.includes('MAX_ZIP_EXTRACTED_BYTES'),'ZIP upload size and zip-bomb boundaries are missing');
assert(importer.includes('zip_contains_no_expected_documents')&&importer.includes('expectedByName'),'ZIP importer must refuse archives that do not contain current missing KRPP documents');
assert(importer.includes('document_not_expected')&&importer.includes('normalizeName(expectedName)'),'Individual importer must still refuse files outside the current protected-document list');
assert(importer.includes('db.storage.from(BUCKET).upload'),'Protected documents must be stored in canonical Supabase Storage, not a parallel files/base64 store');
assert(!importer.includes('/rest/v1/files'),'Legacy parallel files-table persistence must be removed');
assert(!/file_base64\s*:/.test(importer),'Legacy base64 file-column persistence must be removed');
assert(!/gmail\.googleapis\.com|sendgrid\.com|api\.mailgun|\/rest\/v1\/(?:purchase_orders|contracts|client_offers)/i.test(importer),'Tender import must not contain external/binding action endpoints');

assert(archiveAnalyzer.includes("ARCHIVE_VERSION='protected-archive-analysis-v2'"),'Canonical protected archive analysis version was not advanced');
assert(archiveAnalyzer.includes("enum:['VAZHDO','LËRE']"),'Complete dossier analysis must return a binary VAZHDO/LËRE recommendation');
assert(archiveAnalyzer.includes('decision_reasons')&&archiveAnalyzer.includes('2-6 concrete evidence-based reasons'),'Final recommendation must include concrete reasons');
assert(archiveAnalyzer.includes("file_mode:'authenticated_protected_archive'"),'Completed dossier must stay on the existing authenticated protected archive path');
assert(archiveAnalyzer.includes('dossier_complete:true')&&archiveAnalyzer.includes('protected_documents:[]'),'Project readiness may be unlocked only by the completed canonical archive analysis');
assert(!/gmail\.googleapis\.com|sendgrid\.com|api\.mailgun|\/rest\/v1\/(?:purchase_orders|contracts|client_offers)/i.test(archiveAnalyzer),'Final analysis must preserve all human approval gates');

console.log('Tender KRPP ZIP/individual import -> canonical archive analysis smoke test passed.');
