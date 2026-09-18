import fs from 'node:fs';
import assert from 'node:assert/strict';

const edge=fs.readFileSync('supabase/functions/pppp-tender-supplier-sourcing-v1/index.ts','utf8');
const ui=fs.readFileSync('pristeel-tender-supplier-sourcing-v1.js','utf8');
const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
const catalogMigration=fs.readFileSync('supabase/migrations/20260918115000_supplier_public_catalog_v1.sql','utf8');
const dimensionMigration=fs.readFileSync('supabase/migrations/20260918115500_supplier_public_catalog_dimensions_v1.sql','utf8');

assert(edge.includes("db.rpc('pppp_chatgpt_supplier_intelligence_v1'"),'Tender sourcing must reuse canonical Supplier Intelligence before external discovery.');
assert(edge.includes("db.from('pppp_supplier_public_catalog_v1')"),'Tender sourcing must consult the verified public catalog before live web discovery.');
assert(edge.includes("const discover=body?.discover===true"),'Live web discovery must be explicit/on-demand.');
assert(edge.includes("if(discover&&!covered)external=await discoverRequirement(requirement)"),'Live discovery must not run when verified/internal coverage is already sufficient.');
assert(edge.includes("external_discovery_on_demand_only:true")&&edge.includes("no_supplier_master_write:true")&&edge.includes("no_rfq_write:true")&&edge.includes("email_send_allowed:false"),'Supplier sourcing must preserve the human gates and remain read-only.');
assert(edge.includes("id:'round_bar'")&&edge.includes("id:'tubes'"),'Current tender extraction must preserve distinct round-bar and tube requirements.');
assert(edge.includes("catalog_rfq_ready")&&edge.includes("catalog_review_ready"),'Verified catalog coverage must be surfaced separately from Supplier Master.');

assert(ui.includes('FURNIZIMI / RFQ')&&ui.includes('BOQ → furnitorë → RFQ draft'),'UI must expose the sourcing workflow inside dossier analysis.');
assert(ui.includes('Gjej furnitorë në web'),'External discovery must be a visible explicit action.');
assert(ui.includes('mail.google.com/mail/?view=cm'),'RFQ draft action may open Gmail compose but does not send.');
assert(ui.includes('PPPP nuk dërgon email pa veprimin tënd.'),'UI must state the email human gate.');
assert(!ui.includes('/gmail/v1/users/me/messages/send'),'UI must not send Gmail messages.');
assert(finalizer.includes("pristeel-tender-supplier-sourcing-v1.js?v=20260918-sourcing1"),'Finalizer must load the isolated sourcing module after dossier analysis.');

assert(catalogMigration.includes('enable row level security')&&catalogMigration.includes('revoke all on public.pppp_supplier_public_catalog_v1 from anon'),'Public supplier evidence cache must not be anonymously exposed.');
assert(catalogMigration.includes('official_source_verified')&&catalogMigration.includes('evidence_url'),'Catalog rows must retain official evidence provenance.');
assert(dimensionMigration.includes('verified_dimensions')&&dimensionMigration.includes('82.5')&&dimensionMigration.includes('88.9'),'Catalog capability evidence must include exact ARTROM tube dimensions used by the tender.');

console.log('Tender supplier sourcing smoke passed.');