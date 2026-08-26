import fs from 'node:fs';
import assert from 'node:assert/strict';

const home = fs.readFileSync('pristeel-project-control-home-v1.js','utf8');
const finalizer = fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');

assert.match(finalizer,/pristeel-project-control-home-v1\.js\?v=20260826-1/,'finalizer must load Project Control Home');
assert.match(finalizer,/projectControlHome\(\)/,'finalizer must apply Project Control Home');
assert.match(home,/PSTProjectControlHomeV1/,'module export is required');
assert.match(home,/project_emails\?select=/,'Home must read project email activity');
assert.match(home,/direction===['"]outgoing['"]/,'Home must distinguish sent email');
assert.match(home,/pppp_project_context_current_v/,'Home must read confirmed project context');
assert.match(home,/documents_registry/,'Home must read commercial documents');
assert.match(home,/offers\?select=/,'Home must read offers');
assert.match(home,/files\?select=/,'Home must read project files');
assert.match(home,/PSTOpenAIAssistantV1/,'Home input must reuse authenticated PPPP AI');
assert.match(home,/pppp-project-operator-update/,'operator statements must use the safe project update boundary');
assert.match(home,/data-pch-project/,'project rows must be whole-row navigation targets');
assert.match(home,/#page-workspace-home>\*:not\(#pst-project-control-home-v1\)\{display:none!important\}/,'old Home wall must be removed from daily presentation');
assert.doesNotMatch(home,/MutationObserver/,'Home must not use MutationObserver');
assert.doesNotMatch(home,/setInterval\s*\(/,'Home must not poll');
assert.doesNotMatch(home,/gmail.*send|send.*gmail/i,'Home must not implement outbound mail sending');
assert.doesNotMatch(home,/\bBLLOKUES\b|\bVONUAR\b|\[AUTO\]/,'new Home must not reproduce heuristic alarm labels');

const requiredCopy = ['Çfarë po ndodh tani','Pyet PPPP ose trego çfarë ka ndodhur','PROJEKTET AKTIVE','AKTIVITETI I FUNDIT'];
for (const text of requiredCopy) assert.ok(home.includes(text),`missing Home surface copy: ${text}`);

console.log('Project Control Home smoke: OK');
