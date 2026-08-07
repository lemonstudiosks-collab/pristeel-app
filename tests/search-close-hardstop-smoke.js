const fs=require('fs');
const assert=require('assert');
const source=fs.readFileSync('pristeel-search.js','utf8');
assert(source.includes("closest('.pst-bcc-close')"),'Global search router must hard-close the search modal from the close button');
assert(source.includes("target===modal"),'Global search router must hard-close the search modal from backdrop click');
assert(source.includes("modal.remove()"),'Global search router must remove the modal synchronously');
assert(source.includes("document.body.classList.remove('pst-bcc-open')"),'Global search router must always release the page body');
console.log('Search hard-close smoke test passed.');
