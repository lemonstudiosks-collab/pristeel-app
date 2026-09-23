import assert from 'node:assert/strict';
import { enrichWinnerPayload, mergeWinnerWithEnrichment } from '../scripts/ted-winner-contact-enrichment.mjs';

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
  ['https://urbas.at/kontakt','<html><body><a href="mailto:urbas@urbas.at">E-Mail</a><a href="tel:+4342322521">Telefon</a></body></html>'],
  ['https://html.duckduckgo.com/html/?q=%22Birchmeier%20Bau%20AG%22%20D%C3%B6ttingen%20CHE%20official%20contact','<a class="result__a" href="https://birchmeier-bau.ch/">Birchmeier Bau AG official</a><a class="result__a" href="https://www.local.ch/birchmeier">directory</a>'],
  ['https://birchmeier-bau.ch/','<html><body>Birchmeier Bau AG <a href="/kontakt">Kontakt</a></body></html>'],
  ['https://birchmeier-bau.ch/kontakt','<html><body>Birchmeier Bau AG <a href="mailto:info@birchmeier-bau.ch">E-Mail</a><span>wrong.external@gmail.com</span><form><label>Nachricht</label><input type="email" name="email"><textarea name="message"></textarea></form></body></html>']
]);
async function fetchImpl(url){const key=String(url);if(pages.has(key))return response(key,pages.get(key));throw new Error(`unexpected ${key}`);}

const multiWinner={
  names:['Kovoreal - Holic s.r.o.','Rudolf Metallbau GmbH'],
  emails:['Angebot@rudolf-metallbau.at','kovoreal4@kovoreal.sk'],
  email:'Angebot@rudolf-metallbau.at',
  cities:['Holic','Wien'],countries:['SVK','AUT']
};
const multi={payload:{winner:multiWinner}};
const enriched=await enrichWinnerPayload(multi,{fetchImpl,searchEnabled:false});
assert.equal(enriched.organizations.length,2);
const kovoreal=enriched.organizations.find(x=>x.name.includes('Kovoreal'));
const rudolf=enriched.organizations.find(x=>x.name.includes('Rudolf'));
assert(kovoreal.contacts.some(c=>c.value==='kovoreal4@kovoreal.sk'));
assert(!kovoreal.contacts.some(c=>String(c.value).includes('rudolf-metallbau')),'multi-winner emails must not be cross-assigned');
assert(rudolf.contacts.some(c=>String(c.value).toLowerCase()==='angebot@rudolf-metallbau.at'));
assert(rudolf.contacts.some(c=>c.value==='einkauf@rudolf-metallbau.at'&&c.purpose==='procurement'));
assert.deepEqual(enriched.unassigned_ted_contacts.emails,[]);
const safeMulti=mergeWinnerWithEnrichment(multiWinner,enriched);
assert.equal(safeMulti.email,null,'ambiguous first email must not be exposed as the first winner contact');
assert.equal(safeMulti.website,null,'multi-winner direct website must remain unset unless selected by company');

const urbasWinner={name:'URBAS Maschinenfabrik Ges.m.b.H.',names:['URBAS Maschinenfabrik Ges.m.b.H.'],city:'Völkermarkt',country:'AUT'};
const urbas={payload:{winner:urbasWinner}};
const researched=await enrichWinnerPayload(urbas,{fetchImpl,searchEnabled:true});
assert.equal(researched.status,'found');
assert(researched.organizations[0].official_website.includes('urbas.at'));
assert(researched.organizations[0].contacts.some(c=>c.value==='urbas@urbas.at'));
assert(researched.organizations[0].contacts.some(c=>c.type==='phone'));
assert(researched.organizations[0].contacts.every(c=>c.confidence==='high'||c.confidence==='medium'));
const safeSingle=mergeWinnerWithEnrichment(urbasWinner,researched);
assert.equal(safeSingle.email,'urbas@urbas.at','single winner should expose the best verified email to the existing UI');
assert(safeSingle.website.includes('urbas.at'),'single winner should expose verified official website to the existing UI');
assert.equal(safeSingle.contact_enrichment.status,'found');

const birchmeierWinner={
  name:'DE_Birchmeier Bau AG',
  names:['DE_Birchmeier Bau AG','FR_Birchmeier Bau AG'],
  raw_names:['DE_Birchmeier Bau AG','FR_Birchmeier Bau AG'],
  city:'Döttingen',country:'CHE'
};
const birchmeier=await enrichWinnerPayload({payload:{winner:birchmeierWinner}},{fetchImpl,searchEnabled:true});
assert.equal(birchmeier.organizations.length,1,'multilingual labels of the same legal entity must be researched once');
assert.equal(birchmeier.organizations[0].name,'Birchmeier Bau AG');
assert.equal(birchmeier.organizations[0].domain,'birchmeier-bau.ch');
const birchEmail=birchmeier.organizations[0].contacts.find(c=>c.value==='info@birchmeier-bau.ch');
assert(birchEmail,'official-domain email must be retained');
assert.equal(birchEmail.company_attribution,'official_domain_match');
assert.equal(birchEmail.draft_eligible,true);
const externalEmail=birchmeier.organizations[0].contacts.find(c=>c.value==='wrong.external@gmail.com');
assert(externalEmail,'off-domain evidence may remain visible for review');
assert.equal(externalEmail.confidence,'low');
assert.equal(externalEmail.draft_eligible,false,'off-domain email must never be eligible for automatic draft creation');
const form=birchmeier.organizations[0].contacts.find(c=>c.type==='contact_form');
assert(form&&form.value.includes('/kontakt'),'official contact form must be recorded as a fallback contact channel');
assert.equal(form.draft_eligible,false,'contact forms are channels, not Gmail recipients');


const guardedWinner={name:'Guarded GmbH',names:['Guarded GmbH']};
const guardedEnrichment={organizations:[{name:'Guarded GmbH',official_website:'https://guarded.de',contacts:[
 {type:'email',value:'info@yourdomain.com',purpose:'procurement',confidence:'low',score:999,company_attribution:'external_domain',draft_eligible:false},
 {type:'email',value:'sales@guarded.de',purpose:'sales',confidence:'high',score:90,company_attribution:'official_domain_match',draft_eligible:true}
]}]};
const guardedMerged=mergeWinnerWithEnrichment(guardedWinner,guardedEnrichment);
assert.equal(guardedMerged.email,'sales@guarded.de','merge must skip unsafe email even when it appears first');


console.log('TED winner contact enrichment smoke: OK');
