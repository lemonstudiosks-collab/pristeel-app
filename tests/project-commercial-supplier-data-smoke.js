const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('pristeel-project-commercial-simplified-v1.js','utf8');
assert.ok(/supplierOffers/.test(src),'Commercial must continue to render canonical supplierOffers data');
assert.ok(/Ofertat e furnitorëve/.test(src),'supplier offers remain the central Commercial surface');
console.log('Project Commercial supplier data smoke passed.');
