const fs=require('fs');const assert=require('assert');
const s=fs.readFileSync('pristeel-finance-stability-v2.js','utf8');
assert(/finSwitchTab/.test(s),'Finance wrapper missing');
assert(/setTimeout/.test(s),'bounded watchdog missing');
assert(/Duke ngarkuar/i.test(s),'loading-state detection missing');
assert(!/supaFetch\s*\(/.test(s),'Finance guard must not issue reads/writes itself');
assert(!/setInterval\s*\(/.test(s),'Finance guard must not poll');
console.log('Finance stability v2 smoke test passed.');