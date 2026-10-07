import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ids=new Map(),pages=[],windowEvents={},documentEvents={};
class El {
 constructor(){this.parts=new Map();this.children=[];this.listeners={};this.style={};this.value='';this.attrs={};this.writes=0;const set=new Set();this.classList={add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x),toggle:(x,on)=>on?set.add(x):set.delete(x)};}
 set innerHTML(v){this._html=v;this.writes++;for(const m of v.matchAll(/\b(data-eu-[\w-]+)(?=[=\s>])/g))if(!this.parts.has(m[1]))this.parts.set(m[1],new El());}
 get innerHTML(){return this._html||''}
 querySelector(s){return this.parts.get(s.replace(/^\[|\]$/g,''))||null}
 querySelectorAll(){return[]}
 appendChild(c){this.children.push(c);if(c.id)ids.set(c.id,c);if(c.id==='page-eu-companies')pages.push(c);c.parentNode=this;}
 addEventListener(n,fn){this.listeners[n]=fn}
 remove(){ids.delete(this.id)}
 setAttribute(k,v){this.attrs[k]=v}
 getAttribute(k){return this.attrs[k]||null}
}
const host=new El(),body=new El(),head=new El();
const document={readyState:'loading',visibilityState:'visible',body,head,getElementById:k=>ids.get(k)||null,createElement:()=>new El(),querySelector:s=>s==='.content'?host:null,querySelectorAll:s=>s==='.page'?pages:[],addEventListener:(n,fn)=>documentEvents[n]=fn};
let now=Date.parse('2026-10-07T14:00:00Z'),reads=0,fail=false,home=0;
class Clock extends Date {constructor(...a){super(...(a.length?a:[now]))}static now(){return now}}
const rows=[
 {id:'draft',company_name:'Müller & Söhne',country:'DE',company_domain_normalized:'buyer.test',stage:'draft_ready',outreach_guard:'existing_draft',contact_status:'verified',contact_email:'info@buyer.test',has_active_draft:true,gmail_draft_id:'d1',gmail_thread_id:'t1',business_scope:['fabricated_steel_package'],routing_state:'clear',priority_score:50,evidence:[{url:'javascript:alert(1)',type:'contact'}]},
 {id:'reply',company_name:'Reply Buyer',stage:'replied',outreach_status:'replied',gmail_thread_id:'t2',contact_status:'verified',routing_state:'clear',priority_score:10},
 {id:'sent',company_name:'Sent Buyer',stage:'contacted',outreach_status:'contacted',gmail_thread_id:'t3',last_outbound_at:'2026-10-01',next_action_due:'2026-10-20',routing_state:'clear',contact_status:'verified',priority_score:90},
 {id:'gap',company_name:'No Contact',stage:'found',contact_status:'missing',routing_state:'clear',priority_score:100},
 {id:'due',company_name:'Due Buyer',stage:'contacted',last_outbound_at:'2026-09-23',next_action_due:'2026-09-30',routing_state:'clear',priority_score:70},
 {id:'blocked',company_name:'Blocked Buyer',stage:'found',contact_status:'verified',do_not_contact:true,outreach_guard:'blocked',next_action_due:'2026-09-01',routing_state:'clear'},
 {id:'future',company_name:'Future Task',stage:'found',contact_status:'missing',next_action_due:'2026-10-10',routing_state:'clear'},
];
const location={hash:'',pathname:'/fixture',search:''},history={pushState:(_,__,v)=>{location.hash=v.includes('#')?v.slice(v.indexOf('#')):''},replaceState:()=>location.hash=''};
const window={location,addEventListener:(n,fn)=>windowEvents[n]=fn,scrollTo(){},PSTPrimaryNavResilienceV1:{openHome(){home++}},supaFetch:async()=>{reads++;if(fail)throw Error('fixture failure');return rows}};
const context=vm.createContext({window,document,location,history,URL,Date:Clock,setTimeout,console,navigator:{},MutationObserver:class{observe(){}},fetch(){throw Error('No execution endpoint allowed')}});
vm.runInContext(fs.readFileSync('pristeel-eu-companies-v1.js','utf8'),context);
const flush=()=>new Promise(r=>setImmediate(r));
window.PSTEUCompaniesV1.open();await flush();
const page=ids.get('page-eu-companies'),list=page.querySelector('[data-eu-body]');
assert.equal(reads,1);
assert.match(page.innerHTML,/Çfarë bën PPPP/);
assert.match(page.innerHTML,/Çfarë bën ti/);
assert.match(page.innerHTML,/nuk kanë ende automatizim/);
assert.doesNotMatch(list.innerHTML,/pst-eu-kpis|pst-eu-pipeline/);
assert.match(list.innerHTML,/Lexo përgjigjen/);
assert.ok(list.innerHTML.indexOf('Reply Buyer')<list.innerHTML.indexOf('Müller &amp; Söhne'));
assert.doesNotMatch(list.innerHTML,/Sent Buyer|No Contact|Blocked Buyer|Future Task/);
const click=async(sel,dataset)=>{page.listeners.click({target:{closest:s=>s===sel?{dataset}:null}});await flush()};
await click('[data-eu-filter]',{euFilter:'drafts'});
assert.match(list.innerHTML,/Hap draftin/);assert.match(list.innerHTML,/#drafts\/t1/);
assert.match(list.innerHTML,/Kontakt i verifikuar/);
assert.doesNotMatch(list.innerHTML,/javascript:|Readiness|Outreach|Stage|Guard|follow-up|thread|routing/);
await click('[data-eu-filter]',{euFilter:'all'});
await click('[data-eu-id]',{euId:'gap'});
assert.match(list.innerHTML,/Adresa e kontaktit mungon/);
assert.doesNotMatch(list.innerHTML,/Krijo draft|messages\/send/);
const search=page.querySelector('[data-eu-controls]').querySelector('[data-eu-search]');
search.value='No Contact';page.listeners.input({target:{value:search.value,matches:s=>s==='[data-eu-search]'}});
assert.equal(page.querySelector('[data-eu-controls]').querySelector('[data-eu-search]'),search,'typing preserves the input and focus');
assert.doesNotMatch(list.innerHTML,/Müller|Sent Buyer/);assert.equal(reads,1);
window.PSTEUCompaniesV1.open();await flush();assert.equal(reads,1,'fresh navigation is cached');
windowEvents.focus();await flush();assert.equal(reads,1,'fresh focus is cached');
now+=300001;windowEvents.focus();await flush();assert.equal(reads,2,'stale return automatically refreshes');
await click('[data-eu-gmail]',{});
windowEvents.focus();await flush();assert.equal(reads,3,'Gmail return refreshes once');
const p1=window.PSTEUCompaniesV1.refresh(),p2=window.PSTEUCompaniesV1.refresh();await Promise.all([p1,p2]);assert.equal(reads,4,'concurrent reads deduplicate');
fail=true;await window.PSTEUCompaniesV1.refresh();
assert.equal(window.PSTEUCompaniesV1.snapshot().rows.length,rows.length,'failure preserves last good data');
assert.match(page.querySelector('[data-eu-error]').innerHTML,/fixture failure/);
page.querySelector('[data-eu-back]').onclick();assert.equal(home,1);
const css=fs.readFileSync('pristeel-spie-standard.css','utf8');
assert.match(css,/#page-eu-companies \.pst-eu-page[^}]+var\(--pst-sidebar-width\)/);
assert.match(css,/#page-eu-companies \.pst-eu-work-sidebar[^}]+var\(--pst-font\)/);
assert.match(css,/@media\(max-width:900px\)/);
console.log('EU decision workflow: PASS (Albanian shell, ranked human actions, Gmail links, missing contacts, safe URLs, search focus, cache, automatic return sync, concurrent reads, failure retention, Back).');
