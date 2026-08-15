import fs from 'node:fs';

const path='package.json';
let s=fs.readFileSync(path,'utf8');
const before='node tests/hubspot-sync-smoke.mjs && node tests/email-relation-safety-smoke.js';
const after='node tests/hubspot-sync-smoke.mjs && node tests/edge-functions-security-smoke.js && node tests/email-relation-safety-smoke.js';
const first=s.indexOf(before);
if(first<0)throw new Error('Missing package test anchor for Edge Function security smoke');
if(s.indexOf(before,first+before.length)>=0)throw new Error('Ambiguous package test anchor for Edge Function security smoke');
s=s.slice(0,first)+after+s.slice(first+before.length);
fs.writeFileSync(path,s,'utf8');
console.log('Added Edge Functions security smoke to npm test.');
