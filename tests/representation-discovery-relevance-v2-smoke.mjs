import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {extractCompanyName,normalizeArticles,parseNewsRss,newsRssUrl} from '../scripts/representation-market-entry-discovery.mjs';

const news=[
 {url:'https://news.test/politics',title:'Serbia, Albania and Kosovo facing the current US administration - Politiko.al'},
 {url:'https://news.test/troops',title:"Maliqi: US troops withdrawal from Kosovo could destabilise Balkans"},
 {url:'https://news.test/person',title:'Agon Maliqi announces investment in Kosovo'},
 {url:'https://news.test/name',title:'Kosovo market update'},
 {url:'https://news.test/real',title:'Acme Energy seeks local partner in Kosovo'},
 {url:'https://news.test/real',title:'Duplicate'},
 {url:'https://news.test/foreign',title:'Acme Energy expands into Canada'},
 {url:'https://news.test/old',title:'Acme Energy expands into Kosovo',published:'2020-01-01'},
 {url:'https://news.test/bad-date',title:'Acme Energy expands into Kosovo',published:'not a date'}
];
const signals=normalizeArticles({articles:news},12);
assert.equal(signals.length,1);
assert.equal(signals[0].company_name,'Acme Energy');
assert.equal(signals[0].company_domain,null);
assert.equal(signals[0].country_code,null,'Search geography cannot establish company nationality');
assert.equal(signals[0].evidence.automatic_outreach,false);
assert.equal(signals[0].evidence.market_entry_signal,true);
assert.equal(extractCompanyName('Maliqi: current US administration'),null);
assert.equal(extractCompanyName('Acme Energy expands into Western Balkans'),'Acme Energy');
assert.equal(parseNewsRss('<rss><item><title>Acme Energy expands into Kosovo</title><link>https://news.test/a</link><source>Example News</source></item></rss>')[0].source,'Example News');
assert.match(newsRssUrl(),/news\.google\.com\/rss\/search/);

const ui=fs.readFileSync('pristeel-representation-discovery-v1.js','utf8');
const host={hidden:false,innerHTML:'',onclick:null};
const sw={querySelector(){return {}},addEventListener(){}};
const root={querySelector(selector){if(selector==='[data-rep-switch]')return sw;if(selector==='[data-rep-discovery-view]')return host;return null}};
const page={querySelector(){return root}};
const calls=[];
let fail=false;
const window={
document:{readyState:'complete',getElementById(id){return id==='page-representations'?page:{}},querySelector(){return host},addEventListener(){}},
setTimeout(){},Date,console,
supaFetch:async(path,method,body)=>{
 calls.push({path,method,body});if(fail)throw new Error('network unavailable');
 return {rows:[{id:'t1',lane:'consortium_opportunity',candidate_kind:'opportunity',title:'Substation',reasons:['Partner OEM'],evidence:{deadline:'2026-11-01',authority:'KOSTT',reference:'REF-1',estimated_value:2000000,currency:'EUR'}}]};
}};
window.window=window;
vm.runInNewContext(ui.replace(/\}\)\(\);\s*$/,'window.__test={card,lane,render};})();'),window);
await window.PSTRepresentationDiscoveryV1.load(false);
assert.equal(calls.length,1);
assert.deepEqual(JSON.parse(JSON.stringify(calls[0])),{path:'rpc/pppp_representation_discovery_inbox_v2',method:'POST',body:{p_limit:50}});
assert.match(host.innerHTML,/2026-11-01/);
assert.match(host.innerHTML,/KOSTT/);
assert.match(host.innerHTML,/REF-1/);
assert.doesNotMatch(host.innerHTML,/Pa konflikt|pikë/);
await window.PSTRepresentationDiscoveryV1.load(false);
assert.equal(calls.length,1,'Reopening must reuse the five-minute cache');
await window.PSTRepresentationDiscoveryV1.load(true);
assert.equal(calls.length,2);
const unverified=window.__test.card({id:'c1',candidate_kind:'company',title:'Acme',company_name:'Acme',routing_conflicts:['missing_official_domain']});
assert.match(unverified,/data-rd-review/);
assert.doesNotMatch(unverified,/data-rd-accept/);
const verified=window.__test.card({id:'c2',candidate_kind:'company',title:'Acme',company_name:'Acme',company_domain:'acme.test',routing_conflicts:[]});
assert.match(verified,/data-rd-accept/);
const escaped=window.__test.card({id:'t2',candidate_kind:'opportunity',title:'<script>alert(1)</script>',evidence:{}});
assert.doesNotMatch(escaped,/<script>/);
fail=true;
await window.PSTRepresentationDiscoveryV1.load(true);
assert.match(host.innerHTML,/network unavailable/,'Errors must surface without fallback to the unfiltered feed');
assert.equal(calls.filter(x=>x.path.includes('accept')||x.path.includes('review')).length,0);
const migration=fs.readFileSync('supabase/migrations/20261007063000_representation_discovery_relevance_v2.sql','utf8');
assert.match(migration,/security invoker/);
assert.match(migration,/minimum_preparation_days',7/);
assert.doesNotMatch(migration,/delete\s+from|insert\s+into\s+public\.(projects|partners|contacts|suppliers)/i);
console.log('Representation relevance: news, identity, cache, detail, safety and error tests PASS');
