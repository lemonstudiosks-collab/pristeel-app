import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync('supabase/functions/project-document-intake/index.ts', 'utf8');
const migration = fs.readFileSync('supabase/project-attachment-document-intelligence.sql', 'utf8');
const conversation = fs.readFileSync('pristeel-project-intelligence-conversation-v1.js', 'utf8');

assert(source.includes('gmail_tracker_cron_authorized'), 'edge function must reuse the existing private cron-secret authorization guard');
assert(source.includes('https://www.googleapis.com/auth/gmail.readonly'), 'document intake may read Gmail attachments');
assert(source.includes('project-source-files'), 'source binaries must be archived in the private project source bucket');
assert(source.includes('content_sha256'), 'archive must retain a content hash');
assert(source.includes('rows.length!==same.length'), 'duplicate filename fallback must fail closed when live and registered occurrences differ');
assert(source.includes('analysis_status:"retry"'), 'processing failures must remain retryable rather than silently completing');
assert(source.includes('Number(x.confidence)>=.96'), 'automatic BOM writes must use the high-confidence threshold');
assert(source.includes('source_attachment_link_id'), 'automatic BOM rows must preserve source provenance');
assert(source.includes('source_item_key'), 'automatic BOM rows must carry an idempotent source item key');
assert(source.includes('needs_conversion'), 'unsupported DWG must route to conversion/review rather than guess');
assert(source.includes('needs_ocr'), 'image-only PDF extraction must route to OCR/review rather than guess');
assert(!source.includes('drive/v3/files'), 'server intake must not claim an automatic Google Drive upload before that path is explicitly implemented');
assert(!source.includes('project_id:link.project_id,attachment_name'), 'server intake must not create a second project attachment relation');

assert(migration.includes('bom_items_auto_source_unique'), 'database must prevent duplicate auto-BOM rows from the same source item');
assert(migration.includes('revoke all on function public.project_document_intake_internal_request'), 'internal scheduler wrapper must not be callable by browser roles');
assert(conversation.includes('document_intelligence:documentIntel(d.attachmentLinks)'), 'Project Intelligence must receive analyzed source-file content');
assert(conversation.includes('permend filename-in'), 'AI grounding rules must require the source filename when using attachment content');
assert(conversation.includes('needs_conversion, needs_ocr, needs_vision ose review'), 'Project Intelligence must not invent contents for unparsed files');

console.log('project document intake source smoke: ok');
