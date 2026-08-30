import fs from 'node:fs';
const repair=fs.readFileSync('pristeel-project-workspace-repair-v1.js','utf8');
if(!repair.includes('data-pst-workspace-repaired')) throw new Error('repair marker missing');
if(!repair.includes('Përmbledhje')||!repair.includes('Skedarët')||!repair.includes('Kontaktet')) throw new Error('project workspace sections missing');
if(!repair.includes('looksBroken')) throw new Error('broken workspace detection missing');
console.log('project workspace repair smoke: ok');
