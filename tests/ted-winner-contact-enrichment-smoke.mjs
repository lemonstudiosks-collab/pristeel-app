import assert from 'node:assert/strict';
import { enrichWinnerPayload, mergeWinnerWithEnrichment, classifyDeliveryFailure, winnerDeliveryFeedback, recoverDeliveryContacts } from '../scripts/ted-winner-contact-enrichment.mjs';

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
  ['https://birchmeier-bau.ch/kontakt','<html><body>Birchmeier Bau AG <a href="mailto:info@birchmeier-bau.ch">E-Mail</a><span>wrong.external@gmail.com</span><form><label>Nachricht</label><input type="email" name="email"><textarea name="message"></textarea></form></body></html>'],
  ['https://html.duckduckgo.com/html/?q=%22Kunst-%20und%20Stahlbauschlosserei%20Olaf%20Knape%22%20Lutherstadt%20Wittenberg%20DEU%20official%20contact','<a class="result__a" href="https://www.khs-landkreis-wittenberg.de/innungen/metall-innung.html">Metall-Innung Wittenberg</a>'],
  ['https://www.khs-landkreis-wittenberg.de/innungen/metall-innung.html','<html><body><h1>Metall-Innung</h1><div>Kunst- und Stahlbauschlosserei Olaf Knape <a href="mailto:schlosserei.knape@t-online.de">E-Mail</a></div><footer><a href="mailto:info@khs-landkreis-wittenberg.de">Info</a><a href="mailto:kontakt@khs-landkreis-wittenberg.de">Kontakt</a></footer></body></html>']
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

const unsafeLegacyWinner={name:'MEB Technical Sp. z o.o.',names:['MEB Technical Sp. z o.o.'],email:'energy@meb-group.eu',emails:['energy@meb-group.eu']};
const unsafeLegacyEnrichment={organizations:[{name:'MEB Technical Sp. z o.o.',contacts:[
 {type:'email',value:'energy@meb-group.eu',purpose:'general',confidence:'low',score:60,company_attribution:'external_domain',draft_eligible:false}
]}]};
const unsafeLegacyMerged=mergeWinnerWithEnrichment(unsafeLegacyWinner,unsafeLegacyEnrichment);
assert.equal(unsafeLegacyMerged.email,null,'enrichment must clear a legacy primary when evidence proves it is not attributable to the company');
assert.deepEqual(unsafeLegacyMerged.emails,[]);

const knapeWinner={
  name:'Kunst- und Stahlbauschlosserei Olaf Knape',names:['Kunst- und Stahlbauschlosserei Olaf Knape'],city:'Lutherstadt Wittenberg',country:'DEU',identifier:'UStID. DE232533337',identity_version:'ted-winner-canonical-v2',
  email:'info@khs-landkreis-wittenberg.de',emails:['info@khs-landkreis-wittenberg.de'],website:'https://www.khs-landkreis-wittenberg.de/innungen/metall-innung.html',websites:['https://www.khs-landkreis-wittenberg.de/innungen/metall-innung.html'],
  contact_enrichment:{version:'winner-contact-v4',researched_at:'2026-10-02T11:16:50.497Z',organizations:[{name:'Kunst- und Stahlbauschlosserei Olaf Knape',domain:'khs-landkreis-wittenberg.de',official_website:'https://www.khs-landkreis-wittenberg.de/innungen/metall-innung.html',contacts:[
    {type:'email',value:'info@khs-landkreis-wittenberg.de',source_type:'official_website',confidence:'high',company_attribution:'official_domain_match',draft_eligible:true},
    {type:'email',value:'schlosserei.knape@t-online.de',source_type:'official_website',confidence:'low',company_attribution:'external_domain',draft_eligible:false}
  ]}]}
};
const knape=await enrichWinnerPayload({payload:{winner:knapeWinner}},{fetchImpl,searchEnabled:true});
assert.equal(knape.organizations[0].official_website,null,'an Innung/member listing must never become the winner official website');
assert.equal(knape.organizations[0].domain,null,'a third-party association domain must never become the winner company domain');
const knapeEmail=knape.organizations[0].contacts.find(c=>c.value==='schlosserei.knape@t-online.de');
assert(knapeEmail&&knapeEmail.draft_eligible===true,'a company-specific email on the member listing may be attributed to the listed company');
assert.equal(knapeEmail.company_attribution,'third_party_listing_name_match');
assert(!knape.organizations[0].contacts.some(c=>c.value==='info@khs-landkreis-wittenberg.de'&&c.draft_eligible===true),'association mailbox must not be attributed to the member company');
const knapeMerged=mergeWinnerWithEnrichment(knapeWinner,knape);
assert.equal(knapeMerged.email,'schlosserei.knape@t-online.de','repair must replace the misattributed association mailbox');
assert.deepEqual(knapeMerged.emails,['schlosserei.knape@t-online.de']);
assert.equal(knapeMerged.website,null,'repair must clear the association listing from winner.website');

assert.equal(classifyDeliveryFailure({snippet:'550 5.1.1 unknown user'}),'invalid_address');
assert.equal(classifyDeliveryFailure({snippet:'550 5.7.193 external senders are not permitted'}),'blocked');
assert.equal(classifyDeliveryFailure({snippet:'550 5.4.1 Access denied'}),'blocked');
assert.equal(classifyDeliveryFailure({snippet:'451 4.2.1 temporary error'}),'temporary');
const failedRow={payload:{winner:{name:'Guarded GmbH',email:'old@guarded.de',website:'https://guarded.de'}}};
const failure=[{email:'old@guarded.de',kind:'invalid_address',gmail_message_id:'dsn1'}];
const evidence={organizations:[{name:'Guarded GmbH',research_completed:true,contacts:[
 {type:'email',value:'old@guarded.de',confidence:'high',source_type:'official_website',source_url:'https://guarded.de/contact',draft_eligible:true},
 {type:'email',value:'new@guarded.de',confidence:'high',source_type:'official_website',source_url:'https://guarded.de/contact',draft_eligible:true}
]}]};
const recovery=recoverDeliveryContacts(failedRow,evidence,failure);
assert.equal(recovery.delivery_recovery.status,'recovered');
assert.equal(recovery.organizations[0].contacts[0].do_not_contact,true);
assert.equal(mergeWinnerWithEnrichment(failedRow.payload.winner,recovery).email,'new@guarded.de');
const blocked=recoverDeliveryContacts(failedRow,evidence,[{...failure[0],kind:'blocked'}]);
assert.equal(blocked.delivery_recovery.status,'suppressed');
assert.equal(blocked.delivery_recovery.active,false,'recipient blocks must never be evaded using another mailbox on the same domain');
assert.equal(mergeWinnerWithEnrichment(failedRow.payload.winner,blocked).email,null);
const absent=recoverDeliveryContacts(failedRow,{organizations:[{research_completed:true,contacts:[]}]},failure);
assert.equal(absent.delivery_recovery.status,'unreachable');
const network=recoverDeliveryContacts(failedRow,{organizations:[{research_completed:false,contacts:[]}]},failure);
assert.equal(network.delivery_recovery.status,'research_pending','network failure is not proof that no email exists');
assert.equal(network.delivery_recovery.active,false);
assert(winnerDeliveryFeedback(failedRow,[{tender_watch_id:'wrong-linked',contact_email:'new@other-company.de',evidence:{snippet:'550 5.1.1'}}]).length===0,'tender identity alone cannot attribute a bounced email to its winner');
assert.equal(winnerDeliveryFeedback(failedRow,[{contact_email:'old@guarded.de',evidence:{snippet:'550 5.1.1'}}])[0].kind,'invalid_address');
const thirdParty=recoverDeliveryContacts(failedRow,{organizations:[{research_completed:true,contacts:[{type:'email',value:'new@guarded.de',confidence:'high',draft_eligible:true,source_type:'TED',source_url:'https://ted.europa.eu'}]}]},failure);
assert.equal(thirdParty.delivery_recovery.active,false,'recovery requires a replacement published by the company');
console.log('TED winner contact enrichment and delivery recovery smoke: OK');
