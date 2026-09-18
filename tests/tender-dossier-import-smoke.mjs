import assert from 'node:assert/strict';
import fs from 'node:fs';

const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');
const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
const runtime=fs.readFileSync('pristeel-tender-dossier-import-v1.js','utf8');
const importer=fs.readFileSync('supabase/functions/pppp-tender-dossier-import/index.ts','utf8');
const analyzer=fs.readFileSync('supabase/functions/pppp-tender-protected-archive-analysis/index.ts','utf8');

assert(bootstrap.includes('pristeel-tender-dossier-import-v1.js?v=20260918-direct1'),'Bootstrap must load the canonical KRPP importer directly');
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
assert(runtime.includes('extractZipClient')&&runtime.includes("new DecompressionStream('deflate-raw')"),'Browser must unpack real KRPP ZIP files locally instead of sending ZIP bytes through Edge compute.');
assert(runtime.includes("mode:'prepare_direct'")&&runtime.includes("mode:'finalize_direct'")&&runtime.includes('signed_url'),'Browser must use signed direct-to-Storage upload sessions and finalize metadata separately.');
assert(runtime.includes("fetch(up.signed_url,{method:'PUT',body:form})"),'Browser must upload document bytes directly to Supabase Storage via signed URL.');


assert(importer.includes("IMPORT_VERSION='protected-archive-upload-v5'"),'Unified server resolver version must be v5');
assert(importer.includes('repairMojibake')&&importer.includes("normalize('NFKD')"),'KRPP filename normalization must tolerate encoding and diacritic differences');
assert(importer.includes("mode==='prepare_direct'")&&importer.includes("mode==='finalize_direct'")&&importer.includes('createSignedUploadUrl(path,{upsert:true})'),'Importer must only broker short signed upload sessions; file bytes must bypass Edge Functions.');
assert(importer.includes("'historical_sha256'")&&importer.includes("'historical_source_name'")&&importer.includes('prepareDirectUploads(tender,needed,body?.files,body?.expected_name_hint||\'\',archive)'),'Migrated protected dossiers must rehydrate missing Storage blobs from same-tender historical hashes/names before generic filename matching.');
assert(importer.includes("'manual_zip_candidate'")&&importer.includes("archive_role:candidate?'candidate':'expected'"),'Manual KRPP ZIP upload must persist unmatched supported documents as candidates instead of rejecting them by filename.');
assert(importer.includes("manual_full_zip_uploaded:true")&&importer.includes("dossier_complete:true")&&importer.includes("forceReady"),'A user-selected full ZIP must become analyzable after direct Storage persistence even when expected filenames remain advisory.');


assert(importer.includes("source:'browser_direct_signed_upload'")&&importer.includes("identity_reason:'direct_signed_upload_pending_protected_analysis'"),'Direct uploads must retain provenance and defer content identity to the protected analyzer.');

assert(importer.includes('documentClass')&&importer.includes("return'dossier'")&&importer.includes("return'prices'"),'Server resolver must classify dossier and price-list semantics across filename languages');
assert(importer.includes('familyCompatible')&&importer.includes('WORD_EXT')&&importer.includes('SHEET_EXT'),'DOC/DOCX and XLS/XLSX remain compatible file families');
assert(importer.includes('identityVerdict')&&importer.includes('foreign_procurement_reference_detected'),'Importer must perform tender-identity checks and reject explicit foreign references');
assert(importer.includes('resolveFilenameOnlyMatches')&&importer.includes("reason:'filename_match_pending_protected_analysis'")&&importer.includes('fastFilenameMode'),'ZIP upload must use a filename-first fast path so DOCX/XLSX content verification does not consume upload Edge compute before Storage persistence.');
assert(importer.includes("actualExt==='zip'&&!fastFilenameMode&&hasTrustedArchiveAnchor"),'Supplemental ZIP content parsing/storage must stay off the fast path; full content identity remains the analyzer\'s responsibility after persistence.');
assert(importer.includes("error:mismatches.length?'document_tender_mismatch':'document_match_failed'"),'Cross-tender mismatch must have a dedicated blocking response');
assert(!importer.includes("normalizeName(hint)===normalizeName(expected))score+=45"),'A row hint must never make an unrelated compatible file pass by itself');
assert(importer.includes("archive_role:role")&&importer.includes("'supplemental'"),'ZIP ingest must preserve supplemental dossier documents after a trusted match');
assert(importer.includes('mime=mimeFor(sourceName)'),'Extracted ZIP entries must derive MIME type from the extracted file, never inherit ZIP MIME');
assert(importer.includes("storage_status:'available'")&&importer.includes("text(x?.storage_status,30)!=='missing_blob'"),'Fresh uploads must restore blob availability while orphaned metadata must not satisfy dossier completeness.');
assert(importer.includes('tender_watch_id:tender.id')&&importer.includes('identity_status:identity.status'),'Archive metadata must bind each newly imported document to the tender and identity verdict');
assert(importer.includes('isCanonicalProtectedAnalysis')&&importer.includes('!canonical&&prior'),'Partial import must not downgrade an existing canonical protected analysis');
assert(importer.includes('/functions/v1/pppp-tender-protected-archive-analysis'),'Completion must still use the canonical protected-archive analyzer');
assert(importer.includes('runProtectedArchiveAnalysisPreservingUpload')&&importer.includes('deferredAnalysis'),'Successful upload must remain successful when AI completion is temporarily deferred');
assert(importer.includes("body?.defer_analysis===true")&&importer.includes("deferred_analysis:true")&&importer.includes("dossier_saved:true"),'Frontend may persist the dossier first and analyze it in a separate bounded request.');
assert(runtime.includes('defer_analysis:true')&&runtime.includes('analyzeSavedDossier'),'Browser flow must split upload from saved-dossier AI analysis.');
assert(runtime.includes('recoverCompletedArchive')&&runtime.includes("var out=await analyzeSavedDossier(id)")&&!runtime.includes("mode:'finalize'"),'Saved-dossier recovery must call the analyzer directly rather than nesting it through the importer.');
assert(runtime.includes('async function restRows')&&!runtime.includes("await db('pppp_tender_price_dataset_v1"),'Price Intelligence must use an authenticated REST reader rather than an undefined db helper.');
assert(importer.includes('transient=status>=500||status===429')&&importer.includes('dossier_saved:true')&&importer.includes('analysis_ready:false'),'Any downstream 5xx/429 analysis infrastructure failure must preserve the saved dossier and report not-ready instead of converting upload into a generic 500');
assert(importer.includes('review=[409,422].includes(status)')&&importer.includes('requires_review:review'),'Integrity/readability analysis blockers must preserve the upload but require review rather than blind retry');
assert(!/api\.openai\.com\/v1\/responses|finalSchema\(/.test(importer),'Upload bridge must not contain a parallel analysis engine');

assert(analyzer.includes("ARCHIVE_VERSION='protected-archive-analysis-v10'"),'Canonical analyzer must be on protected archive analysis v10');
assert(analyzer.includes("const VERSION='v16'"),'Canonical analysis snapshot must be v16');
assert(analyzer.includes('docxStructuredText')&&analyzer.includes('[PARAGRAPH')&&analyzer.includes('[TABLE'),'DOCX extraction must preserve paragraph and table locators');
assert(analyzer.includes('spreadsheetStructuredText')&&analyzer.includes('CELLS A'),'Spreadsheet extraction must preserve sheet/row/cell-range locators');
assert(analyzer.includes('createSignedUrl(path,SIGNED_URL_SECONDS)')&&analyzer.includes('storage_read_failed:'),'Analyzer must have a signed Storage fallback when direct download fails.');
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
