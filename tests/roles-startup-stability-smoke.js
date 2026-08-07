const fs=require('fs');const assert=require('assert');
const s=fs.readFileSync('pristeel-roles.js','utf8');
assert(!/setInterval\s*\(/.test(s),'Roles startup must not poll with setInterval');
assert(/waits=\[0,400,1200,2500,5000,9000\]/.test(s),'Bounded role readiness schedule missing');
assert(/pristeel-project-emails\.js\?v='\+String\(Date\.now\(\)\)/.test(s),'Bootstrap must remain cache-busted');
assert(/authGetSession/.test(s),'Role loading must remain session-aware');
console.log('Roles startup stability smoke test passed.');