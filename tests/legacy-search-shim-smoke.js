const fs=require('fs');const assert=require('assert');
const s=fs.readFileSync('pristeel-search.js','utf8');
assert(/PSTSearchStableV2/.test(s),'Legacy search must delegate to stable search');
assert(!/supaFetch\s*\(/.test(s),'Legacy search must not query data');
assert(!/gs-bg|gs-hint|gs-input/.test(s),'Legacy search UI must be retired');
assert(!/addEventListener\s*\(\s*['"]keydown/.test(s),'Legacy search must not install shortcut listener');
assert(!/MutationObserver\s*\(/.test(s),'Legacy search must not observe DOM');
assert(!/setInterval\s*\(/.test(s),'Legacy search must not poll');
console.log('Legacy search shim smoke test passed.');