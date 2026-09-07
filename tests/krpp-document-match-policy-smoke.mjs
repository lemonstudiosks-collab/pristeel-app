import assert from 'node:assert/strict';
import fs from 'node:fs';
import {documentClass,familyCompatible,nameMatchScore,resolveDocumentMatches} from '../supabase/functions/pppp-tender-dossier-import/document-match-policy.mjs';

assert.equal(familyCompatible('doc','docx'),true,'DOC and DOCX must be one document family');
assert.equal(familyCompatible('xls','xlsx'),true,'XLS and XLSX must be one spreadsheet family');
assert.equal(familyCompatible('doc','xls'),false,'word and spreadsheet families must not cross-match');
assert.equal(documentClass('Tenderska dokumentacija.doc'),'dossier');
assert.equal(documentClass('Tender Dossier English.Docx'),'dossier');
assert.equal(documentClass('Opis cijena.xls'),'prices');
assert.equal(documentClass('Price Schedule.xlsx'),'prices');
assert.equal(documentClass('PARAMASA.xlsx'),'prices');

assert(nameMatchScore('Tenderska dokumentacija.doc','Tender Dossier English.Docx')>=55,'cross-language DOC→DOCX dossier must match');
assert(nameMatchScore('Opis cijena.xls','Price Schedule.xlsx')>=55,'cross-language XLS→XLSX price schedule must match');
assert(nameMatchScore('PARAMASA.xls','PARAMASA.xlsx')>=55,'same-name XLS→XLSX must match');

const wrong='Furnizim me shufra rrethore dhe gypa të çelikut.xls';
const expected='Lista e pershkrimit te çmimeve - Furnizim me Material Metalik.xlsx';
assert(nameMatchScore(wrong,expected)<55,'unrelated descriptive spreadsheet must not match merely because a target hint exists');
const wrongOnly=resolveDocumentMatches([{name:wrong,path:wrong,bytes:new Uint8Array([1])}],[expected],expected);
assert.equal(wrongOnly.length,0,'expected-name hint must filter the target but must never boost an unrelated candidate');

const candidates=[
  {name:'Tenderska dokumentacija.doc',path:'krpp/Tenderska dokumentacija.doc',bytes:new Uint8Array([1])},
  {name:'Opis cijena.xls',path:'krpp/Opis cijena.xls',bytes:new Uint8Array([2])},
  {name:'Furnizim me shufra rrethore dhe gypa të çelikut.xls',path:'krpp/wrong.xls',bytes:new Uint8Array([3])}
];
const matches=resolveDocumentMatches(candidates,['Tender Dossier English.Docx','Price Schedule.xlsx']);
assert.equal(matches.length,2,'ZIP should resolve one unique file per expected document');
assert(matches.some(x=>x.expected==='Tender Dossier English.Docx'&&x.candidate.name==='Tenderska dokumentacija.doc'));
assert(matches.some(x=>x.expected==='Price Schedule.xlsx'&&x.candidate.name==='Opis cijena.xls'));
assert(!matches.some(x=>x.candidate.path==='krpp/wrong.xls'),'unrelated distractor must remain unmatched');

const importer=fs.readFileSync(new URL('../supabase/functions/pppp-tender-dossier-import/index.ts',import.meta.url),'utf8');
assert(importer.includes('resolveDocumentMatches(candidates,needed,hint)'),'production importer must use the hardened matcher');
assert(importer.includes("const innerMime=actualExt==='zip'?'':file?.type"),'inner ZIP files must derive MIME from their own extension, not the ZIP MIME');
assert(importer.includes("IMPORT_VERSION='protected-archive-upload-v4'"),'importer contract must remain v4');
assert(importer.includes("BUCKET='project-source-files'"),'protected files must remain in the private project-source-files bucket');
console.log('KRPP document match policy smoke passed.');
