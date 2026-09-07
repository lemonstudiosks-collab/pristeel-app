import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('pristeel-procurement.html', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260907174500_evosys_offer_registry_backfill_v1.sql', 'utf8');

// PPPP remains the canonical offer generator: sequential QUO number comes from documents_registry.
assert.match(html, /async function nextOfferNr\(\)/);
assert.match(html, /documents_registry\?series=eq\.QUO&year=eq\.'\+y/);
assert.match(html, /maxSeq\+1/);
assert.match(html, /PST-OFF-'\+y\+'-'\+m\+'-'\+String\(maxSeq\+1\)\.padStart\(3,'0'\)/);

// Both explicit save and PDF output paths register the offer in the same canonical registry.
assert.match(html, /function registerDocNr\(series, nr, project, client, totalEur, payPlan, offerState, revenueBreakdown\)/);
const quoRegistrations = html.match(/registerDocNr\('QUO'/g) || [];
assert.ok(quoRegistrations.length >= 2, 'save/PDF offer paths must both register QUO documents');
assert.match(html, /documents_registry\?series=eq\.QUO&project_id=eq\./);

// Historical EVOSYS 028 backfill is narrow, idempotent and preserves human-send governance.
assert.match(migration, /PST-OFF-2026-09-028/);
assert.match(migration, /'QUO', 2026, 28/);
assert.match(migration, /2311\.69/);
assert.match(migration, /fc96208d-356c-410a-a356-96ce9e9b4d2f/);
assert.match(migration, /historical_registration', true/);
assert.match(migration, /human_send_required', true/);
assert.match(migration, /gmail_auto_send', false/);
assert.match(migration, /pst_document_status', 'sent'/);
assert.match(migration, /drive_file_id', '16lcHG80ozvUaK1drKjMDKwFeAi64Qjqb'/);
assert.match(migration, /raise exception 'PST-OFF-2026-09-028 already belongs to another project/);
assert.match(migration, /raise exception 'QUO 2026 seq 28 already belongs to document/);

// This change must not introduce any Gmail send capability.
assert.doesNotMatch(migration, /gmail\.send|messages\/send|drafts\/send/i);

console.log('client offer canonical registry smoke: ok');
