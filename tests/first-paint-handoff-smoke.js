const fs=require('fs');
const assert=require('assert');

const html=fs.readFileSync('pristeel-procurement.html','utf8');
const search=fs.readFileSync('pristeel-search.js','utf8');

const rootAt=html.indexOf('<html lang="sq" class="pst-first-paint">');
const guardAt=html.indexOf('id="pst-first-paint-guard"');
const firstExternalAt=html.indexOf('<script src="https://');
assert(rootAt>=0,'The parser must engage the first-paint guard on the root element');
assert(guardAt>rootAt&&guardAt<firstExternalAt,'Critical first-paint CSS must load before every external script');
assert(/html\.pst-first-paint body\{visibility:hidden!important\}/.test(html),'Legacy/intermediate body content must be hidden during parsing');
assert(/host\.appendChild\(shell\);[\s\S]{0,180}root\.classList\.remove\('pst-first-paint'\)/.test(search),'The final curtain must atomically take ownership before releasing the parser guard');
assert(/function release\(reason\)[\s\S]*root\.classList\.remove\('pst-first-paint'\)/.test(search),'Every startup release path must clear the parser guard');

console.log('first-paint handoff smoke: ok');
