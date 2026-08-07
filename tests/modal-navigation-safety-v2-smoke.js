const fs=require('fs');const assert=require('assert');
const s=fs.readFileSync('pristeel-modal-navigation-safety-v2.js','utf8');
assert(/Escape/.test(s),'Escape handler missing');
['pst-bcc','pgi2-close','pst-flow-stage-bg','oe-bg'].forEach(x=>assert(s.includes(x),`Known overlay missing: ${x}`));
assert(!/supaFetch\s*\(/.test(s),'modal safety must not touch data');
assert(!/MutationObserver\s*\(/.test(s),'modal safety must not observe globally');
assert(!/setInterval\s*\(/.test(s),'modal safety must not poll');
console.log('Modal/navigation safety v2 smoke test passed.');