'use strict';
const fs=require('fs');
const path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','pristeel-project-mindmap-v1.js'),'utf8');
new Function(src);
function must(x,msg){if(!x)throw new Error(msg);}
must(src.includes('pst:modules-ready'),'mindmap must wait for current runtime readiness');
must(src.includes('data-pwf-stage="comparison"'),'supplier comparison must reuse canonical workflow');
must(src.includes('data-pwf-stage="pricing"'),'pricing must reuse canonical workflow');
must(src.includes('data-pwf-stage="client_offer"'),'client offer must reuse canonical workflow');
must(src.includes('data-pwf-area="files"')&&src.includes('data-pwf-area="communication"'),'project utilities must reuse canonical areas');
must(!/supaFetch\s*\(/.test(src),'presentation module must not read/write Supabase directly');
must(!/\b(PATCH|POST|DELETE)\b/.test(src),'presentation module must not perform REST writes');
must(!/\b(selectSupplier|commitSupplier|chooseSupplier)\s*\(/i.test(src),'presentation module must not select or commit suppliers');
must(src.includes('Human gate')||src.includes('human-gated'),'final commercial decisions must stay visibly human-gated');
console.log('projects-mindmap-v1 smoke: ok');
