'use strict';
const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('pristeel-procurement.html','utf8');
const auth=fs.readFileSync('pristeel-auth-persistence.js','utf8');
const preload=fs.readFileSync('pristeel-project-workspace-repair-loader-v1.js','utf8');

assert(!/var\s+loadCockpit\s*=\s*loadHub\s*;/.test(html),'An absent legacy loadHub owner must not abort the inline runtime');
assert(/typeof window\.loadHub==='function'\?window\.loadHub:function\(\)\{\}/.test(html),'Legacy cockpit calls need a safe compatibility no-op');
assert(/PSTProjectIntegrityUIV1&&typeof window\.PSTProjectIntegrityUIV1\.open==='function'/.test(preload),'Critical preload must verify the stable canonical module API');
assert(!/load\('pristeel-project-integrity-ui-v1\.js[^\n]+__pstCanonicalOwner/.test(preload),'Critical preload must not race a presentation wrapper on the public opener');
assert(auth.includes('pristeel-project-workspace-repair-loader-v1.js?v=20260904-activation2'),'Auth bootstrap must load the corrected critical preloader cache key');

console.log('Inline runtime continuity and canonical project preload regression smoke: OK');
