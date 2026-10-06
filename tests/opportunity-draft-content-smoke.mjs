import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildTedDraftContent,PRISTEEL_SIGNATURE_HTML,COPY_POLICY_VERSION} from '../supabase/functions/pppp-opportunity-draft-generator/draft-content.mjs';

assert.equal(COPY_POLICY_VERSION,'pppp-commercial-copy-policy-v5');
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
assert.equal(ms.subject,'VOB 17-250 · VE 4-3060 – Haus IV – Stahlbau-/Schlosserarbeiten | PRISTEEL');
assert.equal(ms.offer_model,'fabricated_steel_package');
assert.equal(ms.company_role,'unknown');
assert.equal(ms.recipient_role,'functional_procurement');
assert.match(ms.selected_public_facts.join(' '),/VE 4-3060/);
assert.match(ms.plain_body,/VOB 17-250 · VE 4-3060 · Haus IV · Stahlbau-\/Schlosserarbeiten/);
assert.match(ms.plain_body,/Geländer, Handläufe, Unterkonstruktionen der Lernbalkone/);
assert.match(ms.plain_body,/freigegebenen Zeichnungen/);
assert.match(ms.plain_body,/Südosteuropa/);
assert.match(ms.plain_body,/ProCredit Bank/);
assert.doesNotMatch(ms.plain_body,/Zu Ihrem Unternehmensprofil|unknown|Baustelleneinrichtung|Werkplanung und Statik|Bitte leiten Sie|Prepare a draft|do not send/i);
assert(copyWords(ms)>=90&&copyWords(ms)<=160,`M+S copy should be 90–160 words, got ${copyWords(ms)}`);
noBodyBold(ms);

// Same umbrella project, different winner and package must produce materially different copy.
const schDescription='Im Zuge der Modernisierungsarbeiten am Haus II auf dem Berufsschulcampus Stralsund sind Innentüren Metall auszuführen: - BE, Werk- und Montageplanung, sonstiges - Abbrucharbeiten Stahlblechtüren Bestand - Innentüren - Sonstiges';
const schAction={route:'TED_GENERAL',target_company:'Stahl- und Metallbau Schröder GmbH',target_email:'info@stahl-metallbau-schroeder.de',tender_title:'Germany – Installation of doors and windows and related components – VOB 17-25O Errichtung eines Berufsschulcampus BA 1; VE 2-3080 Haus II Innentüren Metall',pristeel_offer_model:'fabricated_steel_package',personalization_facts:[schDescription,'221187 EUR'],payload:{company_type:'unknown',outreach_readiness_v1:{scope_evidence:schDescription}}};
const sch=buildTedDraftContent(schAction,{title:schAction.tender_title,payload:{description:schDescription},winner:{name:schAction.target_company,country:'DEU',company_type:'unknown'}},{email:schAction.target_email});
assert.equal(sch.subject,'VOB 17-250 · VE 2-3080 – Haus II – Metall-Innentüren | PRISTEEL');
assert.notEqual(sch.subject,ms.subject);
assert.notEqual(sch.plain_body,ms.plain_body);
assert.match(sch.plain_body,/VE 2-3080 · Haus II · Metall-Innentüren/);
assert.match(sch.plain_body,/Rückbau bestehender Stahlblechtüren/);
assert.doesNotMatch(sch.plain_body,/Geländer|Handläufe|Lernbalkone|VE 4-3060/);
assert.equal(sch.company_role,'unknown');
assert.match(sch.offer_reason,/not yet verified/i);
assert.ok(sch.missing_facts.length>=2);

// 2. CYTA project group: no database-style award narration.
const cyta=buildTedDraftContent({route:'TED_CONSORTIUM',target_company:'CYTA',target_email:'andreas.makris@cyta.com.cy',tender_title:'Cyprus – Electrical machinery – Athalassa, Anatoliko and FIZ battery storage projects',pristeel_offer_model:'fabricated_steel_package',personalization_facts:['CYTA is identified in the award information.']},{title:'Cyprus – Electrical machinery – Athalassa, Anatoliko and FIZ battery storage projects',winner:{name:'CYTA',country:'CYP',company_type:'trader_consortium'}},{email:'andreas.makris@cyta.com.cy',name:'Mr. Antreas Makris'});
assert.equal(cyta.offer_model,'consortium_scope_support');
assert.match(cyta.subject,/Athalassa \/ Anatoliko \/ FIZ – battery-storage steel scope/);
assert.match(cyta.plain_body,/Athalassa, Anatoliko, FIZ battery storage projects/);
assert.match(cyta.plain_body,/member responsible for that scope/);
assert.doesNotMatch(cyta.plain_body,/You remain in control of the project|take full responsibility/i);
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

for(const d of [ms,sch,cyta,fabricator,material,future,long]){
 assert.equal(d.body,d.plain_body);
 assert.equal(d.copy_policy_version,COPY_POLICY_VERSION);
 assert.ok(d.subject&&d.plain_body&&d.html_body&&d.offer_model&&d.company_role&&d.recipient_role);
 noBodyBold(d);
}

console.log('opportunity canonical copy policy acceptance: ok');

// The confirmed GC template must reproduce the existing approved commercial wording verbatim.
const gcSource=fs.readFileSync('supabase/functions/pppp-gc-outreach/index.ts','utf8');
const body1=gcSource.slice(gcSource.indexOf('function body1('),gcSource.indexOf('function body2('));
const approvedBodies=[...body1.matchAll(/return `([^`]+)`/g)].map(m=>m[1]);
for(const [i,country] of ['DE','RS','GB'].entries()){
 const gc=buildTedDraftContent({route:'TED_GC',tender_title:'Approved Project',target_company:'GC',pristeel_offer_model:'fabricated_steel_package'},{title:'Approved Project',winner:{name:'GC',country,company_type:'gc_epc'}},{email:'procurement@gc.example'});
 assert.equal(gc.approved_template,'gc_epc');
 assert.equal(gc.template_selected_manually,false);
 for(const paragraph of approvedBodies[i].split('\\n\\n').slice(2,6))assert(gc.body.includes(paragraph),'GC commercial paragraph must match approved body1 exactly');
 assert.doesNotMatch(gc.body,/externe Fertigungskapazität einsetzen|external fabrication capacity/);
}
