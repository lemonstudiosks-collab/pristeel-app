import fs from 'node:fs';

const path='pristeel-procurement.html';
const source=fs.readFileSync(path,'utf8');
const before="      throw aiErr;\n    }\n    document.getElementById('pdf-prog').style.width='100%';";
const after="      throw aiErr;\n    }\n    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)){\n      document.getElementById('pdf-status').textContent='⚠ Nuk u lexua saktë — provo të ngjitësh tekstin manualisht.';\n      return;\n    }\n    document.getElementById('pdf-prog').style.width='100%';";
const first=source.indexOf(before);
if(first<0)throw new Error('parseOffer post-request contract not found.');
if(source.indexOf(before,first+before.length)>=0)throw new Error('parseOffer post-request contract is ambiguous.');
const updated=source.slice(0,first)+after+source.slice(first+before.length);
fs.writeFileSync(path,updated,'utf8');
console.log('parseOffer structured-object guard applied.');
