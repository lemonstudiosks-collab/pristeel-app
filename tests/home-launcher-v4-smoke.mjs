import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync('pristeel-home-launcher-v4.js','utf8');

assert(source.includes('Mirësevini në PRISTEEL'),'Home title must use PRISTEEL');
assert(!source.includes('Mirësevini në PPPP'),'Home title must not welcome into PPPP');
['Gmail','Gazeta PPPP','Kalkulatori','Mundësitë','Përfaqësime','Klientë të drejtpërdrejtë','Blerësit e çelikut','Projektet','Partnerët','Financa','Kursi','Çmimet e çelikut'].forEach(label=>{
  assert(source.includes(label),'Missing launcher surface: '+label);
});
assert(source.includes('data-time')&&source.includes('data-date'),'Compact time/date must be present');
assert(source.includes('data-temp')&&source.includes('Prishtinë'),'Weather must be present');
assert(source.includes('pstOpenSearch')||source.includes('PSTSearchStableV2'),'Global search must delegate to the search owner');
assert(source.includes('PSTEUCompaniesV1'),'Direct clients must delegate to EU Direct owner');
assert(source.includes('PSTDachSteelSalesV3'),'Steel buyers must delegate to Material Trade owner');
assert(source.includes('PSTRepresentationsV1'),'Representations must delegate to Representation owner');
assert(source.includes('body:has(#page-workspace-home.active) #app-sidebar'),'Sidebar must hide only on Home');
assert(!/background-image\s*:|url\([^)]*\.(png|jpg|jpeg|webp)/i.test(source),'Home launcher must not use photos or illustration backgrounds');
assert(source.includes('api.open-meteo.com'),'Weather must use free public source');
assert(source.includes('api.frankfurter.app'),'Currency must use free public source');
assert(source.includes('price_history'),'Steel-price tool must use existing internal PPPP reference history');
assert(source.includes('jo kuotime bursiere live'),'Steel-price utility must not misrepresent internal references as live market quotes');
assert(source.includes('translateY(-3px)')&&source.includes('box-shadow'),'Main modules must retain modern hover feedback');

new Function(source);
console.log('Home launcher v4 static smoke: PASS');
