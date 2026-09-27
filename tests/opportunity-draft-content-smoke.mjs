import assert from 'node:assert/strict';
import {buildTedDraftContent,PRISTEEL_SIGNATURE_HTML,COPY_POLICY_VERSION} from '../supabase/functions/pppp-opportunity-draft-generator/draft-content.mjs';

assert.equal(COPY_POLICY_VERSION,'pppp-commercial-copy-policy-v4');
assert.equal(/linkedin|data:image|base64,|pixel|tracking|utm_/i.test(PRISTEEL_SIGNATURE_HTML),false);
assert.equal((PRISTEEL_SIGNATURE_HTML.match(/<img\b/gi)||[]).length,1);
assert.match(PRISTEEL_SIGNATURE_HTML,/ci3\.googleusercontent\.com\/mail-sig\//);
assert.match(PRISTEEL_SIGNATURE_HTML,/href="tel:\+38344244699"/);
assert.match(PRISTEEL_SIGNATURE_HTML,/href="mailto:arianit\.vllahiu@prissteel\.com"/);
assert.match(PRISTEEL_SIGNATURE_HTML,/href="https:\/\/www\.prissteel\.com"/);

const signatureStart='Arianit Vllahiu';
const copyWords=d=>d.plain_body.split(signatureStart)[0].trim().split(/\s+/).length;
const noBodyBold=d=>{const bodyHtml=d.html_body.split('<table role="presentation"')[0];assert.doesNotMatch(bodyHtml,/<(?:b|strong)\b/i);};

// 1. Mandatory M+S / VOB 17-250 regression.
const msDescription='Im Zug der Errichtung des Neubaus für den Fachbereich Sozialwesen auf dem Berufsschulcampus Stralsund sind Stahlbau/Schlosserarbeiten auszuführen: - Baustelleneinrichtung - Werkplanung und Statik - Geländer und Handläufe - Unterkonstruktion Lernbalkone - Sonstiges';
const msAction={route:'TED_GENERAL',target_company:'M+S Gruppe GmbH',target_email:'stahl@msgruppe24.de',tender_title:'Germany – Welding – VOB 17-25O Errichtung eines Berufsschulcampus BA 1; VE 4-3060 Haus IV Stahlbau/Schlosserarbeiten',pristeel_offer_model:'fabricated_steel_package',personalization_facts:[msDescription,'M+S Gruppe GmbH · unknown','Prepare a draft only; do not send'],payload:{company_type:'unknown',outreach_readiness_v1:{scope_evidence:msDescription,company_fact:'M+S Gruppe GmbH · unknown'}}};
const msTender={title:msAction.tender_title,payload:{description:msDescription},winner:{name:'M+S Gruppe GmbH',country:'DEU',company_type:'unknown'}};
const ms=buildTedDraftContent(msAction,msTender,{email:'stahl@msgruppe24.de'});
assert.equal(ms.subject,'VOB 17-250 – Stahlpaket | PRISTEEL');
assert.equal(ms.offer_model,'fabricated_steel_package');
assert.equal(ms.company_role,'unknown');
assert.equal(ms.recipient_role,'functional_procurement');
assert.deepEqual(ms.selected_public_facts,['Projekt VOB 17-250 in Stralsund · Stahlbau-/Schlosserumfang']);
assert.match(ms.plain_body,/VOB 17-250 in Stralsund/);
assert.match(ms.plain_body,/technische und kaufmännische Abwicklung aus einer Hand/);
assert.match(ms.plain_body,/Südosteuropa/);
assert.match(ms.plain_body,/ProCredit Bank/);
assert.doesNotMatch(ms.plain_body,/Zu Ihrem Unternehmensprofil|unknown|Baustelleneinrichtung|Werkplanung und Statik|Unterkonstruktion Lernbalkone|Bitte leiten Sie|Prepare a draft|do not send/i);
assert(copyWords(ms)>=90&&copyWords(ms)<=160,`M+S copy should be 90–160 words, got ${copyWords(ms)}`);
noBodyBold(ms);

// 2. CYTA project group: no database-style award narration.
const cyta=buildTedDraftContent({route:'TED_CONSORTIUM',target_company:'CYTA',target_email:'andreas.makris@cyta.com.cy',tender_title:'Cyprus – Electrical machinery – Athalassa, Anatoliko and FIZ battery storage projects',pristeel_offer_model:'fabricated_steel_package',personalization_facts:['CYTA is identified in the award information.']},{title:'Cyprus – Electrical machinery – Athalassa, Anatoliko and FIZ battery storage projects',winner:{name:'CYTA',country:'CYP',company_type:'trader_consortium'}},{email:'andreas.makris@cyta.com.cy',name:'Mr. Antreas Makris'});
assert.equal(cyta.offer_model,'fabricated_steel_package');
assert.match(cyta.subject,/Athalassa \/ Anatoliko \/ FIZ – steel package/);
assert.match(cyta.plain_body,/Athalassa, Anatoliko, FIZ battery storage projects/);
assert.match(cyta.plain_body,/take full responsibility for a clearly defined steel package/);
assert.match(cyta.plain_body,/You remain in control of the project/);
assert.doesNotMatch(cyta.plain_body,/published award information|identified in the award information/i);

// 3. Fabricator gets capacity copy, never GC ownership copy.
const fabricator=buildTedDraftContent({route:'TED_PRODUCER',target_company:'Fabricator GmbH',tender_title:'Germany – Structural steelworks – Producer Project',pristeel_offer_model:'fabricated_steel_package'},{title:'Germany – Structural steelworks – Producer Project',winner:{name:'Fabricator GmbH',country:'DEU',company_type:'producer'}},{email:'einkauf@fabricator.de',purpose:'procurement'});
assert.equal(fabricator.offer_model,'external_production_capacity');
assert.match(fabricator.plain_body,/externe Fertigungskapazität einsetzen/);
assert.doesNotMatch(fabricator.plain_body,/vollständige Verantwortung für ein klar definiertes Stahlpaket/);

// 4. Material buyer gets material-first copy.
const material=buildTedDraftContent({route:'DIRECT_RAW_MATERIAL',target_company:'Material Buyer',tender_title:'United Kingdom – Steel material – CL V_1578/1579',pristeel_offer_model:'fabricated_steel_package'},{title:'United Kingdom – Steel material – CL V_1578/1579',winner:{name:'Material Buyer',country:'GBR'}},{email:'purchasing@material.example',purpose:'procurement'});
assert.equal(material.offer_model,'material_supply');
assert.match(material.plain_body,/EN 10204 3\.1/);
assert.match(material.plain_body,/RFQ or material list/);
assert.doesNotMatch(material.plain_body,/take full responsibility for a clearly defined steel package/);

// 5. Future qualification must not imply a live RFQ.
const future=buildTedDraftContent({route:'TED_PRODUCER',target_company:'Future Fabricator',tender_title:'United Kingdom – Structural steelworks – Future Project',outreach_motion:'future_supplier_qualification',pristeel_offer_model:'external_production_capacity'},{title:'United Kingdom – Structural steelworks – Future Project',winner:{name:'Future Fabricator',country:'GBR',company_type:'producer'}},{email:'procurement@future.example',purpose:'procurement'});
assert.equal(future.offer_model,'future_supplier_qualification');
assert.match(future.plain_body,/future steel packages/i);
assert.match(future.plain_body,/Who handles qualification/);
assert.doesNotMatch(future.plain_body,/send us the drawings|send us one current RFQ|currently open/i);

// 6. Internal contamination never reaches either MIME alternative.
for(const leak of ['unknown','company profile','outreach readiness','draft only','human approval','internal workflow','personalization score']){assert.doesNotMatch(ms.plain_body,new RegExp(leak,'i'));assert.doesNotMatch(ms.html_body,new RegExp(leak,'i'));}

// 7. A >2,000-character tender dump must not expand the email.
const longDescription=('Legal procurement boilerplate. - Item A - Item B - Item C '+msDescription+' ').repeat(45);
const long=buildTedDraftContent({...msAction,personalization_facts:[longDescription]},{...msTender,payload:{description:longDescription}},{email:'stahl@msgruppe24.de'});
assert(copyWords(long)<=160,`long-input copy should remain short, got ${copyWords(long)} words`);
assert.doesNotMatch(long.plain_body,/Legal procurement boilerplate|Item A|Baustelleneinrichtung/);

for(const d of [ms,cyta,fabricator,material,future,long]){
 assert.equal(d.body,d.plain_body);
 assert.equal(d.copy_policy_version,COPY_POLICY_VERSION);
 assert.ok(d.subject&&d.plain_body&&d.html_body&&d.offer_model&&d.company_role&&d.recipient_role);
 noBodyBold(d);
}

console.log('opportunity canonical copy policy acceptance: ok');
