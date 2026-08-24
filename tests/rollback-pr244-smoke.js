const fs=require('fs');
const assert=require('assert');
const bridge=fs.readFileSync('pristeel-offer-revision-email-bridge-v1.js','utf8');
assert.ok(/Offer Revision Email Bridge v1/.test(bridge),'bridge should be restored to stable v1');
assert.ok(!/pst-project-clean-chrome/.test(bridge),'unstable workspace chrome mutation must be absent');
assert.ok(!/makeSupplierDisclosure/.test(bridge),'unstable supplier DOM rewrite must be absent');
console.log('PR244 rollback smoke passed.');
