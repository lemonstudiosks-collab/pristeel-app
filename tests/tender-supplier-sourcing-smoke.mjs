import fs from 'node:fs';
import assert from 'node:assert/strict';

const ui=fs.readFileSync('pristeel-tender-supplier-sourcing-v1.js','utf8');
const edge=fs.readFileSync('supabase/functions/pppp-tender-supplier-sourcing-v1/index.ts','utf8');
const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');

assert.match(ui,/FURNIZIMI \/ RFQ/);
assert.match(ui,/RFQ-ready/);
assert.match(ui,/Për verifikim/);
assert.match(ui,/Jo i përshtatshëm/);
assert.match(ui,/data-tss-discover/);
assert.match(ui,/external discovery/i);
assert.match(ui,/supplier selection mbetet vendim njerëzor/i);
assert.doesNotMatch(ui,/\.from\(['"]supplier_discovery_/);
assert.doesNotMatch(ui,/method:\s*['"]PATCH['"]/);

assert.match(edge,/sourcing_version:5/);
assert.match(edge,/requirementsFromProjectBom/);
assert.match(edge,/42CrMo4/);
assert.match(edge,/50Mn7/);
assert.match(edge,/EN\\s\*10060/);
assert.match(edge,/combinedStrictCount/);
assert.match(edge,/external_discovery_on_demand_only:true/);
assert.match(edge,/no_supplier_master_write:true/);
assert.match(edge,/no_rfq_write:true/);
assert.match(edge,/p_project_id:projectId/);
assert.doesNotMatch(edge,/\.insert\(/);
assert.doesNotMatch(edge,/\.update\(/);
assert.doesNotMatch(edge,/\.delete\(/);

assert.match(finalizer,/tenderSupplierSourcing/);
assert.match(finalizer,/pristeel-tender-supplier-sourcing-v1\.js/);

console.log('tender supplier sourcing smoke: ok');
