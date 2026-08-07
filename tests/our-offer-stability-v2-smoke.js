const fs=require('fs');const assert=require('assert');
const s=fs.readFileSync('pristeel-our-offer-stability-v2.js','utf8');
assert(/saveOfferState/.test(s),'saveOfferState button guard missing');
assert(/dataset\.pstSaving/.test(s),'duplicate-click lock missing');
assert(/stopImmediatePropagation/.test(s),'duplicate click is not stopped');
assert(!/supaFetch\s*\(/.test(s),'stability guard must not write data');
assert(!/setInterval\s*\(/.test(s),'stability guard must not poll');
console.log('Our-offer stability v2 smoke test passed.');