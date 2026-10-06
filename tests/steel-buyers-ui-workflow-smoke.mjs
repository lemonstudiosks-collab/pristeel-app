import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ids=new Map();
class Element {
 constructor(){this.style={};this.children=[];this.parts=new Map();this.attrs={};const set=new Set();this.classList={add:x=>set.add(x),remove:x=>set.delete(x),contains:x=>set.has(x),toggle:(x,on)=>on?set.add(x):set.delete(x)};this._html='';}
 set innerHTML(html){this._html=html;for(const m of html.matchAll(/\b(data-dss-[\w-]+)(?:[=\s>])/g))if(!this.parts.has(m[1]))this.parts.set(m[1],new Element());}
 get innerHTML(){return this._html;}
 querySelector(selector){return this.parts.get(selector.replace(/^\[|\]$/g,''))||null;}
 appendChild(child){this.children.push(child);if(child.id)ids.set(child.id,child);}
 addEventListener(){} contains(){return false;}getAttribute(k){return this.attrs[k]??null;}setAttribute(k,v){this.attrs[k]=v;}hasAttribute(k){return k in this.attrs;}removeAttribute(k){delete this.attrs[k];}
}
const host=new Element(),body=new Element(),head=new Element();
const document={readyState:'loading',body,head,createElement:()=>new Element(),getElementById:id=>ids.get(id)||null,querySelector:selector=>selector==='.content'?host:null,querySelectorAll:()=>[],addEventListener(){},dispatchEvent(){}};
const targets=[{id:'ready',source_key:'mt:de:buyer.test',company_name:'Müller & Söhne',company_domain:'buyer.test',country:'DE',target_status:'watch',contact_status:'found',canonical_contact_email:'purchasing@buyer.test',outreach_status:'ready',workflow_state:'ready_for_outreach'},{id:'missing',source_key:'mt:no:nordic.test',company_name:'Nordic Steel',company_domain:'nordic.test',country:'NO',target_status:'watch',contact_status:'missing',outreach_status:'not_ready'}];
let queue=[],reads=[],draftCalls=0,home=false;
const window={location:{href:'https://fixture.test/'},addEventListener(){},scrollTo(){},_SB_URL:'https://fixture.test',_SB_KEY:'fixture',authGetSession:()=>({access_token:'fixture'}),PSTPrimaryNavResilienceV1:{openHome(){home=true;}},supaFetch:async path=>{reads.push(path);if(path.startsWith('pppp_dach_steel_targets'))return targets;if(path.startsWith('pppp_outbound_queue'))return queue;if(path.startsWith('pppp_steel_buyer_discovery'))return [{candidates:[{id:'c1',company_name:'Harbor Steel',official_domain:'harbor.test',country_code:'GB',industry:'Shipbuilding'}]}];return [];}};
const context=vm.createContext({window,document,console,URL,Date,CustomEvent:class{},setTimeout,fetch:async(_,options)=>{draftCalls++;const b=JSON.parse(options.body);assert.equal(b.mode,'buyer');assert.equal(b.target_id,'ready');queue=[{id:'q1',source_record_id:'ready',recipient_email:'purchasing@buyer.test',status:'candidate',touch_no:1,gmail_draft_id:'d1',gmail_thread_id:'t1'}];return Response.json({ok:true,queue:queue[0]});},navigator:{}});
vm.runInContext(fs.readFileSync('pristeel-dach-steel-sales-v1.js','utf8'),context);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
window.PSTDachSteelSalesV3.open();await flush();await flush();
const page=ids.get('page-dach-steel-sales'),list=page.querySelector('[data-dss-list]'),pane=page.querySelector('[data-dss-detail-pane]');
assert.match(list.innerHTML,/Müller &amp; Söhne/);assert.match(list.innerHTML,/Nordic Steel/);assert.match(list.innerHTML,/Harbor Steel/);assert.match(list.innerHTML,/role="button" tabindex="0"/);
const click=async(selector,attrs)=>{await page.onclick({target:{closest:s=>s===selector?{getAttribute:k=>attrs[k]||null}:null},preventDefault(){},stopPropagation(){}});};
await click('[data-dss-target-id]',{'data-dss-target-id':'missing'});assert.match(pane.innerHTML,/Nordic Steel/);assert.match(pane.innerHTML,/Kontakt ende i pagjetur/);assert.doesNotMatch(pane.innerHTML,/buyer-create-draft|contact-resolve/);assert.equal(draftCalls,0);
await click('[data-dss-target-id]',{'data-dss-target-id':'discovery:c1'});assert.match(pane.innerHTML,/Harbor Steel/);assert.match(pane.innerHTML,/verifikimi vazhdon në prapavijë/);
await click('[data-dss-filter]',{'data-dss-filter':'ready'});assert.match(list.innerHTML,/Müller/);assert.doesNotMatch(list.innerHTML,/Nordic|Harbor/);assert.match(pane.innerHTML,/Gjermanisht/);assert.match(pane.innerHTML,/Krijo Gmail draft/);
await click('[data-dss-action]',{'data-dss-action':'buyer-create-draft','data-dss-tid':'ready','data-email':'purchasing@buyer.test'});await flush();
await click('[data-dss-filter]',{'data-dss-filter':'draft'});assert.match(pane.innerHTML,/Draft gati/);assert.match(pane.innerHTML,/Hap Gmail draft/);assert.doesNotMatch(pane.innerHTML,/E kontaktuar/);assert.equal(draftCalls,1);
const before=reads.length;window.PSTDachSteelSalesV3.open();await flush();assert.equal(reads.length,before,'Navigation reuses loaded state');
await click('[data-dss-back]',{});assert.equal(home,true);
assert.equal(reads.filter(x=>x.startsWith('pppp_steel_buyer_discovery')).length,1);
assert.equal(reads.filter(x=>x.startsWith('pppp_dach_steel_targets')).length,2);
const css=fs.readFileSync('pristeel-spie-standard.css','utf8');assert.match(css,/#page-dach-steel-sales .pst-dss-sidebar[^}]+font|#page-dach-steel-sales .pst-dss-navbtn[^}]+var\(--pst-font\)/);assert.match(css,/#page-dach-steel-sales \[hidden\]/);assert.match(css,/#page-dach-steel-sales :is\(.pst-dss-primary-wide[^}]+var\(--pst-accent\)/);
console.log('Steel Buyers UI workflow: PASS (all companies clickable, no-contact detail, no invented recipient, DE routing, Draft ≠ Sent, back, cached navigation, shared static tokens).');
