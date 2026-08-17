import assert from 'node:assert/strict';
import { enrichWinnerPayload } from '../scripts/ted-winner-contact-enrichment.mjs';

function response(url,html,status=200){
  return {ok:status>=200&&status<300,status,url,headers:{get:()=> 'text/html; charset=utf-8'},async text(){return html;}};
}
const pages=new Map([
  ['https://kovoreal.sk','<html><body>Kovoreal <a href="/kontakt">Kontakt</a></body></html>'],
  ['https://kovoreal.sk/kontakt','<html><body><a href="mailto:obchod@kovoreal.sk">Sales</a><a href="tel:+421123456">phone</a></body></html>'],
  ['https://rudolf-metallbau.at','<html><body>Rudolf Metallbau <a href="/kontakt">Kontakt</a></body></html>'],
  ['https://rudolf-metallbau.at/kontakt','<html><body><a href="mailto:einkauf@rudolf-metallbau.at">Einkauf</a></body></html>'],
  ['https://html.duckduckgo.com/html/?q=%22URBAS%20Maschinenfabrik%20Ges.m.b.H.%22%20V%C3%B6lkermarkt%20AUT%20official%20contact','<a class="result__a" href="https://urbas.at/">URBAS official</a>'],
  ['https://urbas.at/','<html><body>URBAS Maschinenfabrik Gesellschaft m.b.H. <a href="/kontakt">Kontakt</a></body></html>'],
  ['https://urbas.at/kontakt','<html><body><a href="mailto:urbas@urbas.at">E-Mail</a><a href="tel:+4342322521">Telefon</a></body></html>']
]);
async function fetchImpl(url){const key=String(url);if(pages.has(key))return response(key,pages.get(key));throw new Error(`unexpected ${key}`);}

const multi={payload:{winner:{
  names:['Kovoreal - Holic s.r.o.','Rudolf Metallbau GmbH'],
  emails:['Angebot@rudolf-metallbau.at','kovoreal4@kovoreal.sk'],
  cities:['Holic','Wien'],countries:['SVK','AUT']
}}};
const enriched=await enrichWinnerPayload(multi,{fetchImpl,searchEnabled:false});
assert.equal(enriched.organizations.length,2);
const kovoreal=enriched.organizations.find(x=>x.name.includes('Kovoreal'));
const rudolf=enriched.organizations.find(x=>x.name.includes('Rudolf'));
assert(kovoreal.contacts.some(c=>c.value==='kovoreal4@kovoreal.sk'));
assert(!kovoreal.contacts.some(c=>String(c.value).includes('rudolf-metallbau')),'multi-winner emails must not be cross-assigned');
assert(rudolf.contacts.some(c=>String(c.value).toLowerCase()==='angebot@rudolf-metallbau.at'));
assert(rudolf.contacts.some(c=>c.value==='einkauf@rudolf-metallbau.at'&&c.purpose==='procurement'));
assert.deepEqual(enriched.unassigned_ted_contacts.emails,[]);

const urbas={payload:{winner:{name:'URBAS Maschinenfabrik Ges.m.b.H.',names:['URBAS Maschinenfabrik Ges.m.b.H.'],city:'Völkermarkt',country:'AUT'}}};
const researched=await enrichWinnerPayload(urbas,{fetchImpl,searchEnabled:true});
assert.equal(researched.status,'found');
assert(researched.organizations[0].official_website.includes('urbas.at'));
assert(researched.organizations[0].contacts.some(c=>c.value==='urbas@urbas.at'));
assert(researched.organizations[0].contacts.some(c=>c.type==='phone'));
assert(researched.organizations[0].contacts.every(c=>c.confidence==='high'||c.confidence==='medium'));

console.log('TED winner contact enrichment smoke: OK');
