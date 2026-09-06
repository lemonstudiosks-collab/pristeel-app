import assert from 'node:assert/strict';
import fs from 'node:fs';

const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
const runtime=fs.readFileSync('pristeel-tender-dossier-import-v1.js','utf8');
const importer=fs.readFileSync('supabase/functions/pppp-tender-dossier-import/index.ts','utf8');

assert(finalizer.includes('pristeel-tender-dossier-import-v1.js'),'Finalizer must load the purpose-limited tender import companion');
assert(finalizer.includes('data-pst-krpp-upload')&&finalizer.includes('Ngarko në PPPP'),'Missing protected-document upload action');
assert(finalizer.includes('X.pickAndUpload'),'Finalizer must delegate the selected-file action to the tender import companion');
assert(!/supaFetch|fetch\s*\(|localStorage\.setItem|sessionStorage\.setItem/.test(finalizer),'Finalizer must remain presentation-only and must not fetch or write data');
assert(!/MutationObserver|setInterval\s*\(/.test(finalizer),'Import presentation must remain bounded and polling-free');

assert(runtime.includes('/functions/v1/pppp-tender-dossier-import'),'Tender import runtime is not wired to the importer Edge Function');
assert(runtime.includes("mode:'upload'")&&runtime.includes("mode:'reconcile'"),'Upload and reconciliation modes must both be wired');
assert(runtime.includes('expected_name')&&runtime.includes('fileBase64'),'Runtime must bind each selected file to the exact missing KRPP document');
assert(runtime.includes('PSTTenderDossierAnalysisV1')&&runtime.includes('__pstProtectedImportWrapped'),'Import runtime must return to and reconcile through the canonical dossier analyzer');
assert(runtime.includes('canonicalAnalyze')&&runtime.includes('refreshCanonical'),'Imported dossiers must refresh through the original canonical analyzer instead of creating a parallel UI owner');
assert(!/MutationObserver|setInterval\s*\(/.test(runtime),'Tender import runtime must remain bounded and polling-free');

assert(importer.includes("const CACHE_VERSION='v10'"),'Importer cache version must stay compatible with the current canonical dossier analyzer');
assert(importer.includes("const IMPORT_VERSION='v1'"),'Importer version marker is missing');
assert(importer.includes("page_context:`tender_dossier:${tenderId}`"),'Uploaded dossier files must be scoped to one tender');
assert(importer.includes('/rest/v1/files')&&importer.includes('file_base64'),'Importer must persist the retrieved protected documents in PPPP');
assert(importer.includes('SUPABASE_SERVICE_ROLE_KEY'),'Purpose-limited server persistence path is missing');
assert(importer.includes('userHeaders')&&importer.includes('tender_not_found_or_not_visible'),'Tender visibility must be checked with the caller session before privileged file writes');
assert(importer.includes('MAX_FILE_BYTES=10*1024*1024')&&importer.includes('ALLOWED_EXT'),'Upload size and type boundaries are missing');
assert(importer.includes('document_not_expected')&&importer.includes('docKey(expectedName)'),'The importer must refuse files that are not tied to the current protected-document list');
assert(importer.includes("purpose','user_data'")&&importer.includes("type:'input_file',file_id:id"),'Imported official files must be supplied to OpenAI as file inputs');
assert(importer.includes("method:'DELETE'")&&importer.includes('/v1/files/'),'Temporary OpenAI file objects must be cleaned up after analysis');
assert(importer.includes('previous_partial_analysis')&&importer.includes('uploaded_documents'),'Final analysis must reconcile the previous partial analysis with imported official files');
assert(importer.includes('dossier_complete:complete')&&importer.includes('protected_documents:remaining'),'Importer must persist exact dossier completeness and remaining-document state');
assert(importer.includes('dossier_analysis_version:CACHE_VERSION')&&importer.includes('dossier_analysis:snapshot'),'Completed imports must feed the existing canonical dossier cache, not a parallel tender store');
assert(importer.includes("r.recommendation='REVIEW'")&&importer.includes("r.confidence='low'"),'A still-incomplete imported dossier must not retain an unsupported GO/high-confidence state');
assert(!/gmail\.googleapis\.com|sendgrid\.com|api\.mailgun|\/rest\/v1\/(?:purchase_orders|contracts|client_offers)/i.test(importer),'Tender import must not contain external/binding action endpoints');

console.log('Tender protected-document import + reconciliation smoke test passed.');
