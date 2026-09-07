import assert from 'node:assert/strict';
import fs from 'node:fs';

const importer=fs.readFileSync(new URL('../supabase/functions/pppp-tender-dossier-import/index.ts',import.meta.url),'utf8');
const acceptance=fs.readFileSync(new URL('../scripts/krpp-importer-v4-zip-production-acceptance.mjs',import.meta.url),'utf8');

assert(importer.includes("IMPORT_VERSION='protected-archive-upload-v4'"),'importer v4 must remain canonical');
assert(importer.includes("mode==='upload_archive'"),'ZIP archive upload mode must remain supported');
assert(importer.includes("const WORD_EXT=new Set(['doc','docx','rtf'])"),'DOC/DOCX family matching must remain enabled');
assert(importer.includes("const SHEET_EXT=new Set(['xls','xlsx','csv'])"),'XLS/XLSX family matching must remain enabled');
assert(importer.includes('familyCompatible'),'matching must use document families');
assert(importer.includes('normalizeName')&&importer.includes('repairMojibake'),'matching must tolerate language/diacritic/mojibake differences');
assert(importer.includes('collectZipCandidates'),'ZIP entries must be inspected, not treated as an opaque blob');
assert(importer.includes("const BUCKET='project-source-files'"),'matched documents must remain in the private project-source-files bucket');
assert(importer.includes('pppp-tender-protected-archive-analysis'),'complete archives must hand off to protected analyzer');

assert(acceptance.includes("mode:'upload_archive'"),'production acceptance must exercise the ZIP path');
assert(acceptance.includes("EXPECTED_DOC='Dosja e Tenderit Shqip.Doc'"),'acceptance must prove DOC expected against real DOCX source');
assert(acceptance.includes("EXPECTED_XLS='PERSHKRIMI I CMIMIT-SHQIP.xls'"),'acceptance must prove XLS expected against real XLSX source');
assert(acceptance.includes("source_ext,30)!=='docx'")&&acceptance.includes("source_ext,30)!=='xlsx'"),'acceptance must verify actual modern source extensions');
assert(acceptance.includes("protected-archive-analysis-v5"),'acceptance must require analyzer v5');
assert(acceptance.includes("q.status!=='analyzed'"),'acceptance must require final analyzed queue state');
assert(acceptance.includes('Invalid key'),'acceptance must guard against Invalid key regressions');
assert(acceptance.includes('sourceArchiveFingerprint'),'acceptance must prove source tender archive is unchanged');
assert(acceptance.includes('storageDelete')&&acceptance.includes('temp_queue_deleted')&&acceptance.includes('temp_tender_deleted'),'acceptance must clean temporary storage and rows');

console.log('KRPP importer v4 real ZIP production acceptance policy smoke passed.');
