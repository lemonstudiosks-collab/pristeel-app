import fs from 'node:fs';

function replaceOnce(source,before,after,label){
  const i=source.indexOf(before);
  if(i<0)throw new Error(`Missing expected ${label}`);
  if(source.indexOf(before,i+before.length)>=0)throw new Error(`Ambiguous ${label}`);
  return source.slice(0,i)+after+source.slice(i+before.length);
}

const htmlPath='pristeel-procurement.html';
let html=fs.readFileSync(htmlPath,'utf8');

const oldSave=`function saveApiKey(){
  const k=document.getElementById('s-apikey').value;
  localStorage.setItem('pristeel_apikey',k);
  document.getElementById('key-status').textContent=k?'✓ API Key e ruajtur në browser':'API Key u fshi.';
}`;
const newSave=`function saveApiKey(){
  const k=document.getElementById('s-apikey').value;
  const ai=window.PSTAI;
  if(!ai||typeof ai.configureGemini!=='function'){
    document.getElementById('key-status').textContent='AI Settings nuk janë ngarkuar.';
    return;
  }
  ai.configureGemini(k);
  document.getElementById('key-status').textContent=k?'✓ API Key e ruajtur në browser':'API Key u fshi.';
}`;
html=replaceOnce(html,oldSave,newSave,'base saveApiKey legacy storage block');

const oldRender=`function renderSettings(){
  const k=localStorage.getItem('pristeel_apikey')||'';
  if(k)document.getElementById('s-apikey').value=k;
  var gc=localStorage.getItem('pristeel_gclient')||'', gk=localStorage.getItem('pristeel_gapikey')||'';`;
const newRender=`function renderSettings(){
  var gc=localStorage.getItem('pristeel_gclient')||'', gk=localStorage.getItem('pristeel_gapikey')||'';`;
html=replaceOnce(html,oldRender,newRender,'base renderSettings legacy marker read');
fs.writeFileSync(htmlPath,html,'utf8');

const manifestPath='runtime-manifest.json';
let manifest=fs.readFileSync(manifestPath,'utf8');
manifest=replaceOnce(
  manifest,
  '"auditedAtCommit": "74791c4f9c57746e2bae4df4796ef14f419776af"',
  '"auditedAtCommit": "bbb60f733734263da1582a18145eb0f271c9ed36"',
  'runtime manifest audited baseline'
);
fs.writeFileSync(manifestPath,manifest,'utf8');

console.log('AI Settings base ownership migrated from main bbb60f733734263da1582a18145eb0f271c9ed36.');
