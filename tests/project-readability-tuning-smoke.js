const fs=require('fs');
const assert=require('assert');

const source=fs.readFileSync('pristeel-project-readability-tuning-v1.js','utf8');
const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');

assert(!/supaFetch|fetch\s*\(|localStorage|sessionStorage|setInterval\s*\(|MutationObserver/.test(source),'Project readability tuning must remain UI-only');
assert(source.includes('.pst-pm-name{font-size:15px!important'),'Project names are still below the approved readable size');
assert(source.includes('.pst-pm-client{font-size:12.5px!important'),'Project client/reference text is still too small');
assert(source.includes('.pst-pm-meta-label{font-size:10px!important'),'Project metadata labels are still too small');
assert(source.includes('.pst-pm-meta-value{font-size:12px!important'),'Project metadata values are still too small');
assert(source.includes('.pst-pm-search{height:40px!important;font-size:12.5px!important'),'Project search control readability is missing');
assert(source.includes('#page-workspace-project.pf2-on .pst-pi-tab{font-size:13px!important'),'Individual project tabs did not receive the gentle readability lift');
assert(/pristeel-project-readability-tuning-v1\.js\?v=[^'\"]+/.test(bootstrap),'Project readability tuning is not loaded by the real bootstrap');
console.log('Project readability tuning smoke test passed.');
