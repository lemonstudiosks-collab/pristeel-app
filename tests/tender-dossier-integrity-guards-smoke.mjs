import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20260909140000_tender_dossier_canonical_integrity_guards.sql','utf8');
const cleanupMigration=fs.readFileSync('supabase/migrations/20260909183500_tender_dossier_explicit_cleanup_guard.sql','utf8');
const importer=fs.readFileSync('supabase/functions/pppp-tender-dossier-import/index.ts','utf8');
const analyzer=fs.readFileSync('supabase/functions/pppp-tender-protected-archive-analysis/index.ts','utf8');

assert(migration.includes('pppp_tender_canonical_protected_ready_v1'),'Migration must define canonical protected-ready predicate');
assert(migration.includes("file_mode}', '') = 'authenticated_protected_archive'"),'Canonical predicate must require authenticated protected archive');
assert(migration.includes("provider,name}', '') = 'openai'"),'Canonical ready state must require real OpenAI analysis');
assert(migration.includes('trg_pppp_tender_preserve_canonical_dossier_v1'),'Tender payload downgrade guard trigger must be installed');
assert(migration.includes("'dossier_analysis', old.payload -> 'dossier_analysis'"),'Downgrade guard must restore the old canonical analysis');
assert(migration.includes("'dossier_analysis_status', 'ready'"),'Downgrade guard must preserve ready state');
assert(migration.includes('protected_archive')&&migration.includes('Never silently drop an authenticated archive'),'Manual archive bytes/metadata must survive unrelated public refreshes');
assert(migration.includes('trg_pppp_tender_fetch_queue_no_canonical_reopen_v1'),'Fetch queue canonical reopen guard must be installed');
assert(migration.includes("new.status in ('queued', 'retry', 'processing')"),'Queue guard must block automatic reopen states');
assert(migration.includes('new.auth_required := false'),'Canonical archive must not become auth-required again');
assert(cleanupMigration.includes("force_archive_cleanup"),'Verified contamination cleanup must have an explicit escape hatch');
assert(cleanupMigration.includes("v_integrity := v_integrity - 'force_archive_cleanup'"),'Cleanup escape hatch must self-clear');
assert(cleanupMigration.includes('not v_force_cleanup'),'Ordinary refreshes must still preserve canonical/manual dossier state');

assert(importer.includes('foreign_procurement_reference_detected'),'Importer must detect foreign tender references');
assert(importer.includes("identity.status==='mismatch'"),'Mismatched candidates must be excluded from expected matching');
assert(importer.includes("score>=60"),'Server match threshold must remain strict after removing the unsafe hint boost');
assert(importer.includes("identity_status:identity.status"),'Stored entries must carry identity verdicts');
assert(analyzer.includes('archive_entry_bound_to_other_tender'),'Analyzer must reject entries explicitly bound to another tender');
assert(analyzer.includes('foreign_procurement_reference_detected'),'Analyzer must reject legacy archive files with a foreign procurement reference');
assert(analyzer.includes("await setQueueState(queue,tenderId,'review','Tender dossier integrity mismatch'"),'Integrity mismatch must stop analysis and surface for review');

console.log('Tender dossier P0 cross-tender + no-downgrade guard smoke passed.');
