import assert from 'node:assert/strict';
import { classifyCompanyText } from '../scripts/ted-winner-company-classification.mjs';

const producer=classifyCompanyText(`We are a structural steel fabrication company with our own factory and workshop. Our services include CNC cutting, welding, steel structures and galvanizing.`);
assert.equal(producer.company_type,'producer');
assert.ok(['medium','high'].includes(producer.confidence));

const legalNameProducer=classifyCompanyText(`Awarded company Beck GmbH Stahl- und Metallbau.`);
assert.equal(legalNameProducer.company_type,'producer');
assert.ok(['medium','high'].includes(legalNameProducer.confidence));

const metallbauName=classifyCompanyText(`Awarded company Metallbau Konrad GmbH`);
assert.equal(metallbauName.company_type,'producer');

const schlossereiName=classifyCompanyText(`Awarded company Schlosserei Waldner, Inh. Bernhard Walder e.K.`);
assert.equal(schlossereiName.company_type,'producer');

const nordicProducer=classifyCompanyText(`Rustfri stål, smedearbejde, produktion og værksted for industrielle stålkonstruktioner.`);
assert.equal(nordicProducer.company_type,'producer');

const gc=classifyCompanyText(`As a general contractor and EPC construction company, we deliver turnkey industrial facilities and provide construction management and civil engineering.`);
assert.equal(gc.company_type,'gc_epc');
assert.ok(['medium','high'].includes(gc.confidence));

const trader=classifyCompanyText(`Independent steel trader, stockholder and wholesale distributor with steel service center operations across Europe.`);
assert.equal(trader.company_type,'trader_consortium');
assert.ok(['medium','high'].includes(trader.confidence));

const consortium=classifyCompanyText('',{organizationCount:3});
assert.equal(consortium.company_type,'trader_consortium');
assert.equal(consortium.confidence,'high');

const legalNameGc=classifyCompanyText(`Awarded company Muster Bauunternehmen GmbH`);
assert.equal(legalNameGc.company_type,'gc_epc');

const birchmeierGc=classifyCompanyText('Awarded company Birchmeier Bau AG');
assert.equal(birchmeierGc.company_type,'gc_epc','standalone Bau legal-name signal must classify a construction company as GC/EPC');
assert.notEqual(birchmeierGc.company_type,'producer');
const stahlbauStillProducer=classifyCompanyText('Awarded company Beispiel Stahlbau AG');
assert.equal(stahlbauStillProducer.company_type,'producer','Stahlbau must remain a producer signal and must not be caught by standalone Bau');


const unknown=classifyCompanyText(`Engineering solutions for demanding customers across several sectors.`);
assert.equal(unknown.company_type,'unknown');

const source=await import('node:fs').then(fs=>fs.readFileSync(new URL('../scripts/ted-winner-company-classification.mjs',import.meta.url),'utf8'));
assert(!source.includes('winnerNames(w).length&&w.contact_enrichment'),'Company-role classification must not depend on contact enrichment.');
assert(source.includes("(!c||c.version!==VERSION)"),'Current-generation unresolved classifications must be skipped after one pass so later awards are not starved.');
assert(source.includes('canonicalNames'),'multilingual TED labels must be canonicalized before organization-count classification');
assert(source.includes('winner-company-v4'),'classification generation must advance after identity correction');

console.log('TED winner company classification smoke: OK');
