const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('pristeel-home-live-fix-v1.js','utf8');
const bootstrap = fs.readFileSync('pristeel-project-emails.js','utf8');

assert(source.includes("return{actions:3,projects:3}"), 'Today must stay limited to 3 priorities and 3 projects');
assert(source.includes("projects?select=*&limit=3000"), 'Project recovery must use a broad projects query without updated_at ordering');
assert(source.includes('window.supaFetch'), 'Project recovery must use the existing read API');
assert(!/POST|PATCH|DELETE/.test(source), 'Home live fix must remain read-only');
assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source), 'Home live fix must not poll or observe globally');
assert(bootstrap.includes('pristeel-home-live-fix-v1.js?v=20260807-1'), 'Live Home fix must be in the real bootstrap');

console.log('Home live fix smoke test passed.');
