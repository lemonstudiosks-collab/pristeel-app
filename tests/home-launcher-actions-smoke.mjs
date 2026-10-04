import fs from 'node:fs';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('pristeel-home-launcher-v4.js','utf8');
const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="app-shell-root" class="app-shell">
  <aside id="app-sidebar" class="sidebar"><div id="pst-v2-sidebar"><div id="pst-ws-sidebar"><div id="pst-ws-canonical-nav"><button data-key="home" class="active">Home</button></div></div></div></aside>
  <main class="main"><div class="content"><section id="page-workspace-home" class="page active" style="display:block"></section></div></main>
</div>
</body></html>`,{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
const {document}=window;
window.scrollTo=()=>{};

const calls={sync:[],home:0,opportunities:0,representations:0,direct:0,buyers:0,projects:0,partners:0,finance:0,daily:0,search:0,gmail:0,fetch:0,supa:0};
window.PSTPrimaryNavResilienceV10={
  syncSidebar:k=>calls.sync.push(k),
  openHome:()=>{calls.home++;return true},
  openOpportunities:()=>{calls.opportunities++;return true},
  openRepresentations:()=>{calls.representations++;return true},
  openProjects:()=>{calls.projects++;return true},
  openPartners:()=>{calls.partners++;return true},
  openFinance:()=>{calls.finance++;return true}
};
window.PSTEUCompaniesV1={open:()=>{calls.direct++;return true}};
window.PSTDachSteelSalesV3={open:()=>{calls.buyers++;return true}};
window.PSTDailySafeV2={open:()=>{calls.daily++;return true}};
window.PSTSearchStableV2={open:q=>{calls.search++;calls.searchValue=q;return true}};
window.open=(url)=>{calls.gmail++;calls.gmailUrl=url;return {}};
window.fetch=async url=>{
  calls.fetch++;
  if(String(url).includes('frankfurter'))return{ok:true,json:async()=>({date:'2026-10-03',rates:{USD:1.1,GBP:.9,CHF:.95,TRY:50}})};
  return{ok:true,json:async()=>({current:{temperature_2m:7,weather_code:0}})};
};
window.supaFetch=async path=>{
  calls.supa++;
  if(String(path).startsWith('price_history'))return[{work_type:'Plate',our_price_kg:.61,project_name:'Test',country:'DE',quoted_at:'2026-10-03'}];
  if(String(path).startsWith('project_emails?'))return[
    {id:1,sent_at:'2026-10-02T12:38:00Z',subject:'Your opportunity is validated',direction:'incoming',snippet:'Managed Steel Production Network opportunity validated',gmail_url:'https://mail.google.com/a'},
    {id:2,sent_at:'2026-10-01T10:08:29Z',subject:'Jochen Schlag declined your meeting request.',direction:'incoming',snippet:'Meeting declined',gmail_url:'https://mail.google.com/b'}
  ];
  return[];
};

window.eval(source);
document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));
await new Promise(r=>setTimeout(r,30));

const root=document.getElementById('pst-home-launcher-v4');
assert(root,'Home launcher must mount');

root.querySelector('[data-open="daily"]').click();
assert.equal(calls.daily,1,'Gazeta PPPP must open Daily without leaving Home');
assert(document.getElementById('page-workspace-home').classList.contains('active'),'Daily must keep Home active');

const search=root.querySelector('[data-search]');
search.value='Jola';
root.querySelector('[data-search-form]').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}));
assert.equal(calls.search,1,'Search form must call global search');
assert.equal(calls.searchValue,'Jola');

root.querySelector('[data-gmail]').click();
assert.equal(calls.gmail,1,'Gmail button must open Gmail');
assert.match(calls.gmailUrl,/mail\.google\.com/);

root.querySelector('[data-tool="calc"]').click();
assert(document.getElementById('phl-modal'),'Calculator button must open calculator modal');
document.getElementById('phl-modal').remove();

const fetchBeforeWeather=calls.fetch;
root.querySelector('[data-weather-refresh]').click();
await new Promise(r=>setTimeout(r,0));
assert(calls.fetch>fetchBeforeWeather,'Weather button must refresh weather');

root.querySelector('[data-open="currency"]').click();
await new Promise(r=>setTimeout(r,0));
assert(document.getElementById('phl-modal'),'Currency button must open modal');
assert(document.getElementById('phl-modal').textContent.includes('USD'),'Currency modal must populate rates');
document.getElementById('phl-modal').remove();

root.querySelector('[data-open="steel"]').click();
await new Promise(r=>setTimeout(r,0));
assert(document.getElementById('phl-modal'),'Steel-price button must open modal');
assert(document.getElementById('phl-modal').textContent.includes('Plate'),'Steel-price modal must populate PPPP reference data');
document.getElementById('phl-modal').remove();

assert.equal(root.querySelector('[data-open="forum"]'),null,'Forum must not render as a dedicated Home card');
const eventsCard=root.querySelector('[data-open="events"]');
assert(eventsCard,'Evente dhe Forume must render in the compact utility row');
eventsCard.click();
await new Promise(r=>setTimeout(r,0));
const eventsPage=document.getElementById('page-workspace-events-forums');
assert(eventsPage&&eventsPage.classList.contains('active'),'Evente dhe Forume must open its own workspace');
assert(eventsPage.textContent.includes('German-Kosovar Economic Forum 2026'),'Current Forum must live inside the Events workspace');
assert(!eventsPage.textContent.includes('RFQ'),'Events list must not expose RFQ controls');
const forumCard=eventsPage.querySelector('[data-event-open="d7c23392-f7e2-4f87-8205-e7ff637ac3aa"]');
assert(forumCard,'Current Forum card must be clickable');
forumCard.click();
await new Promise(r=>setTimeout(r,0));
assert(eventsPage.textContent.includes('Përmbledhje'),'Forum click must open the dedicated event detail workspace');
assert(eventsPage.textContent.includes('Aktiviteti i fundit'),'Event detail must include the activity stream');
await new Promise(r=>setTimeout(r,0));
assert(eventsPage.textContent.includes('Jochen Schlag declined your meeting request.'),'Event detail must load linked Forum activity');
assert(!eventsPage.textContent.includes('Furnizimi / Prodhimi'),'Event detail must not expose Project commercial controls');
const detailBack=eventsPage.querySelector('[data-event-detail-back]');
assert(detailBack,'Event detail must expose Kthehu to the Events list');
detailBack.click();
assert(eventsPage.querySelector('[data-event-open]'),'Event detail Kthehu must return to the Events list');
const eventsBack=eventsPage.querySelector('[data-events-back]');
assert(eventsBack,'Events workspace must expose a functional Kthehu button');
eventsBack.click();
assert.equal(calls.home,1,'Events Kthehu must delegate to the canonical Home owner');


for(const [key,field] of [
  ['opportunities','opportunities'],
  ['representations','representations'],
  ['direct','direct'],
  ['buyers','buyers'],
  ['projects','projects'],
  ['partners','partners'],
  ['finance','finance']
]){
  const before=calls[field];
  const ok=window.PSTHomeLauncherV4.openModule(key);
  assert.equal(ok,true,key+' route must report success');
  assert.equal(calls[field],before+1,key+' must call its canonical owner');
}
assert.equal(document.body.classList.contains('pst-home-launcher-active'),false,'Work-module navigation must release Home shell lock');
assert.equal(document.getElementById('page-workspace-home').classList.contains('active'),false,'Work-module navigation must clear stale Home active state');

dom.window.close();
console.log('Home launcher actions smoke: PASS');
