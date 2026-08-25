import assert from 'node:assert/strict';
import { classifyCompanyText } from '../scripts/ted-winner-company-classification.mjs';

const producer=classifyCompanyText(`We are a structural steel fabrication company with our own factory and workshop. Our services include CNC cutting, welding, steel structures and galvanizing.`);
assert.equal(producer.company_type,'producer');
assert.ok(['medium','high'].includes(producer.confidence));

const gc=classifyCompanyText(`As a general contractor and EPC construction company, we deliver turnkey industrial facilities and provide construction management and civil engineering.`);
assert.equal(gc.company_type,'gc_epc');
assert.ok(['medium','high'].includes(gc.confidence));

const trader=classifyCompanyText(`Independent steel trader, stockholder and wholesale distributor with steel service center operations across Europe.`);
assert.equal(trader.company_type,'trader_consortium');
assert.ok(['medium','high'].includes(trader.confidence));

const consortium=classifyCompanyText('',{organizationCount:3});
assert.equal(consortium.company_type,'trader_consortium');
assert.equal(consortium.confidence,'high');

const unknown=classifyCompanyText(`Engineering solutions for demanding customers across several sectors.`);
assert.equal(unknown.company_type,'unknown');

console.log('TED winner company classification smoke: OK');
