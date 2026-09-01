import assert from 'node:assert/strict';
import {evaluateTedOpportunityPrecision} from '../scripts/ted-opportunity-precision-v1.mjs';

function row({title,reasons=[],company_type='producer',company='Example GmbH',evidence=[],websites=[],emails=[],orgs=[]}){return{id:'t1',title,match_reasons:reasons,payload:{source:'TED',winner:{name:company,company_type,websites,emails,company_classification:{company_type,evidence},contact_enrichment:{organizations:orgs}}}};}
function action(type,email,company='Example GmbH'){return{action_type:type,target_email:email,target_company:company};}

const spie=evaluateTedOpportunityPrecision({row:row({title:'Germany – Telephone and data transmission services – Kommunalnetz.NRW_Los 2',reasons:['project term: transmission'],company:'SPIE Information & Communication Services GmbH',company_type:'producer',evidence:[{label:'manufacturing/fabrication',examples:['production']}],websites:['https://spie.com']}),action:action('producer_capacity_outreach_draft','vergabe@spie.com','SPIE Information & Communication Services GmbH')});
assert.equal(spie.ready,false);assert.equal(spie.disposition,'quarantined');assert.equal(spie.project.rating,'excluded');

const metallbau=evaluateTedOpportunityPrecision({row:row({title:'Germany – Structural steelworks – Stahlbauarbeiten',reasons:['GC/project CPV high steel fit: 45223210'],company:'Metallbau Weber GmbH',company_type:'producer',evidence:[{label:'explicit steel-fabrication company terms',examples:['metallbau']}],websites:['https://www.metallbau-weber.de/'],emails:['info@metallbau-weber.de']}),action:action('producer_capacity_outreach_draft','info@metallbau-weber.de','Metallbau Weber GmbH')});
assert.equal(metallbau.ready,true);assert.equal(metallbau.disposition,'draft_review');assert.equal(metallbau.role.role,'steel_fabricator_producer');

const elliott=evaluateTedOpportunityPrecision({row:row({title:'Ireland – Substation construction work – Belcamp Substation Building and Civil Works',reasons:['GC/project CPV high steel fit: 45232220','project term: substation'],company:'Elliott Building and Civil Engineering Limited',company_type:'gc_epc',evidence:[{label:'general construction',examples:['construction services']}],websites:['https://www.elliottgroup.com/'],emails:['info@elliottgroup.com']}),action:action('gc_project_outreach_draft','info@elliottgroup.com','Elliott Building and Civil Engineering Limited')});
assert.equal(elliott.ready,true);assert.equal(elliott.project.rating,'strong');assert.equal(elliott.role.role,'gc_epc');

const bridgeConcrete=evaluateTedOpportunityPrecision({row:row({title:'Bridge Repairs Masonry and Concrete Works',reasons:['project term: bridge'],company:'Global Rail Services Ltd',company_type:'gc_epc',evidence:[{label:'general construction',examples:['main contractor']}],emails:['tenders@globalrailservices.com']}),action:action('gc_project_outreach_draft','tenders@globalrailservices.com','Global Rail Services Ltd')});
assert.equal(bridgeConcrete.ready,false);assert.equal(bridgeConcrete.disposition,'quarantined');

const climbing=evaluateTedOpportunityPrecision({row:row({title:'Construction work for sports facilities – Boulderwand',reasons:['GC/project CPV: 45223800'],company:'Banana Climbing GmbH',company_type:'producer',evidence:[{label:'German production terms',examples:['werkstatt']}],emails:['info@banana-volumes.com']}),action:action('producer_capacity_outreach_draft','info@banana-volumes.com','Banana Climbing GmbH')});
assert.equal(climbing.ready,false);assert.equal(climbing.disposition,'quarantined');

const suspicious=evaluateTedOpportunityPrecision({row:row({title:'Latvia – Display units – information boards',reasons:['GC/project CPV: 45223800'],company:'SIA Aspired',company_type:'producer',evidence:[{label:'manufacturing/fabrication',examples:['manufacturing']}],websites:['https://fccid.io/2BDSL']}),action:action('producer_capacity_outreach_draft','info@fccid.net','SIA Aspired')});
assert.equal(suspicious.ready,false);assert.equal(suspicious.disposition,'quarantined');

console.log('TED opportunity precision v1 smoke: OK');
