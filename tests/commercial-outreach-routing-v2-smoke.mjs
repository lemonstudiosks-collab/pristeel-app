import assert from 'node:assert/strict';
import fs from 'node:fs';

const opportunity=fs.readFileSync('supabase/functions/pppp-opportunity-draft-generator/draft-content.mjs','utf8');
const material=fs.readFileSync('supabase/functions/pppp-dach-steel-draft-generator/index.ts','utf8');
const gc=fs.readFileSync('supabase/functions/pppp-gc-outreach/index.ts','utf8');

assert.match(opportunity,/function routedOfferCopy\(/,'Opportunity copy must use an explicit offer-model router');
assert.match(opportunity,/offerModel==='external_production_capacity'/,'Opportunity router must support external production capacity');
assert.match(opportunity,/offerModel==='material_supply'/,'Opportunity router must support material supply');
assert.match(opportunity,/offerModel==='future_supplier_qualification'/,'Opportunity router must support future qualification');
assert.match(opportunity,/We take ownership of the steel package from drawings or BOM through to delivery\./,'fabricated-package copy must express ownership without questioning client competence');
assert.match(opportunity,/Southeast Europe/,'Opportunity credibility must identify the Southeast European network');
assert.match(opportunity,/bank guarantees through ProCredit Bank/,'Opportunity credibility must include bounded bank-guarantee support');

const materialStart=material.indexOf('function buyerTextV2');
const materialEnd=material.indexOf('function supplierText',materialStart);
assert(materialStart>=0&&materialEnd>materialStart,'Material Trade V2 buyer copy block must exist');
const materialBuyer=material.slice(materialStart,materialEnd);
assert.match(materialBuyer,/motion==="external_production_capacity"/,'Material Trade must be able to route an explicit capacity motion separately');
assert.match(materialBuyer,/steel-material package/,'Material buyer copy must remain material-specific');
assert.match(materialBuyer,/You remain in control of purchasing\. We manage the package from RFQ or material list through to delivery\./,'Material buyer copy must use the ownership model without implying client incapability');
assert.match(materialBuyer,/Southeast Europe/,'Material Trade credibility must identify the Southeast European network');
assert.match(materialBuyer,/ProCredit Bank/,'Material Trade credibility must include bank-guarantee support');
assert.doesNotMatch(materialBuyer,/<strong>/i,'Material Trade body copy must not bold CTAs or sales claims');
assert.match(material,/function externalFact\(/,'Material Trade must sanitize internal instructions before any evidence reaches outward copy');

const gcStart=gc.indexOf('function body1');
const gcEnd=gc.indexOf('function body1Html',gcStart);
assert(gcStart>=0&&gcEnd>gcStart,'GC first-touch copy block must exist');
const gcBody=gc.slice(gcStart,gcEnd);
assert.match(gc,/one partner for the steel package \| PRISTEEL/,'GC subject must use the ownership positioning');
assert.match(gcBody,/take full responsibility for a clearly defined steel package/,'GC copy must use the steel-package ownership model');
assert.match(gcBody,/Southeast Europe/,'GC copy must identify the Southeast European fabrication network');
assert.match(gcBody,/ProCredit Bank/,'GC copy must include bounded financial-security evidence');
assert.doesNotMatch(gcBody,/coordination burden|problem managing|cannot manage/i,'copy must never imply the client is unable to manage its own project');
assert.match(gc,/function outboundFact\(/,'GC first-touch copy must sanitize internal instructions before emitting evidence');


const opportunityIndex=fs.readFileSync('supabase/functions/pppp-opportunity-draft-generator/index.ts','utf8');
assert.match(opportunityIndex,/\(refreshExisting\|\|explicitUser\).*row\.generator.*GENERATOR/s,'stale Opportunity copy must refresh on explicit human action without mass background rewrites');

assert.match(gc,/stale_copy_requires_manual_refresh/,'GC background sync must preserve stale drafts until the user explicitly requests refresh');
assert.match(gc,/if\(!createRequested\)return \{id:p\.id,company:p\.company_name,event:'stale_copy_requires_manual_refresh'/,'GC stale draft refresh must stay human-triggered');

console.log('Commercial outreach routed-copy smoke passed.');
