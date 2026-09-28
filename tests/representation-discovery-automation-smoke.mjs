import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {JSDOM} from 'jsdom';
import {extractCompanyName,normalizeArticles,parseNewsRss,newsRssUrl} from '../scripts/representation-market-entry-discovery.mjs';

const migration=fs.readFileSync('supabase/migrations/20260928141037_representation_discovery_automation_v1.sql','utf8');
const ui=fs.readFileSync('pristeel-representation-discovery-v1.js','utf8');

assert.match(migration,/pppp_representation_discovery_candidates_v1/);
assert.match(migration,/pppp_representation_discovery_conflicts_v1/);
assert.match(migration,/pppp_accept_representation_discovery_candidate_v1/);
assert.match(migration,/public\.can_write\(\)/);
assert.match(migration,/maximum_25_signals_per_batch/);
assert.match(migration,/WORLD_BANK/);
assert.match(migration,/MCA_KOSOVO/);
assert.match(migration,/operator_acceptance_required_for_partner_research/);
assert.doesNotMatch(migration,/insert\s+into\s+public\.(projects|partners|contacts|suppliers|outreach_contacts|email_drafts)/i);
assert.match(ui,/status=in\.\(new,review\)/);
assert.match(ui,/rpc\/pppp_accept_representation_discovery_candidate_v1/);
assert.match(ui,/rpc\/pppp_review_representation_discovery_candidate_v1/);
assert.doesNotMatch(ui,/\.send\(|gmail|email_drafts/i);

assert.equal(extractCompanyName('Acme Energy expands into Western Balkans'),'Acme Energy');
assert.equal(extractCompanyName('Kosovo market update'),null);
const signals=normalizeArticles({articles:[{url:'https://news.example/a',title:'Acme Energy seeks local partner in Kosovo',sourcecountry:'United States',domain:'news.example'},{url:'https://news.example/a',title:'Duplicate'}]},10);
assert.equal(signals.length,1);
assert.equal(signals[0].company_name,'Acme Energy');
assert.equal(signals[0].company_domain,null);
assert.equal(signals[0].evidence.automatic_outreach,false);
const rss=parseNewsRss('<rss><channel><item><title>Acme Energy expands into Kosovo</title><link>https://news.example/a</link><source>Example News</source></item></channel></rss>');
assert.equal(rss[0].source,'Example News');
assert.match(newsRssUrl(),/news\.google\.com\/rss\/search/);

const dom=new JSDOM('<!doctype html><html><head></head><body><main id="page-representations"><div class="pst-rep-page"><div data-rep-target-view></div><div data-rep-switch><button data-rep-mode="opportunities">Projektet</button></div><div data-rep-opportunity-view></div></div></main></body></html>',{url:'https://example.test/'});
const calls=[];dom.window.supaFetch=async(path,method,body)=>{calls.push({path,method,body});return path.startsWith('pppp_representation_discovery_candidates_v1?')?[{id:'c1',lane:'market_entry',candidate_kind:'company',title:'Acme',score:80,status:'new',routing_conflicts:[]}]:{ok:true}};
dom.window.PSTRepresentationsV1={open(){},refresh(){}};dom.window.confirm=()=>false;
vm.runInContext(ui,vm.createContext(dom.window));
await new Promise(r=>setTimeout(r,20));
dom.window.PSTRepresentationDiscoveryV1.open();await new Promise(r=>setTimeout(r,20));
assert.ok(dom.window.document.querySelector('[data-rep-mode="discovery"]'));
assert.match(dom.window.document.querySelector('[data-rep-discovery-view]').textContent,/Kompani për përfaqësim/);
assert.equal(calls.filter(x=>x.path.startsWith('pppp_representation_discovery_candidates_v1?')).length,1);

console.log('Representation discovery automation smoke: PASS');
