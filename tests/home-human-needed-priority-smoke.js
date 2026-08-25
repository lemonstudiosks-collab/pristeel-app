const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync('pristeel-home-canonical-v1.js', 'utf8');

assert(src.includes("src==='project_discovery_auto'"), 'Home must explicitly score new Project Discovery handoffs');
assert(src.includes('return age<=2?970:880'), 'recent new projects must receive top-tier Home priority');
assert(src.includes("src==='execution_release_readiness'"), 'release blockers need an explicit Home score');
assert(src.includes("src==='email_request_auto'"), 'email-request actions need a source-aware Home score');
assert(src.includes("return 'PROJEKT I RI'"), 'new-project handoffs need a clear Home tag');
assert(src.includes("return 'BLLOKUES'"), 'execution blockers need a clear Home tag');
assert(src.includes("tag:taskTag(t)"), 'task cards must use the canonical source-aware tag helper');
assert(src.includes('Projekt i ri i regjistruar automatikisht; duhet përcaktuar hapi i parë'), 'Home must explain why a new project needs attention');

console.log('Home human-needed priority smoke: OK');
