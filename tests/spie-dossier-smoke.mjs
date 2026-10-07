import test from 'node:test';
import assert from 'node:assert/strict';
import * as O from '../spie/operations.mjs';
import * as D from '../spie/data.mjs';
import * as B from '../spie/bridge.mjs';
const pid=D.PROJECT_ID,data={project:{id:pid,drive_folder_id:'folder'},context_facts:[]};
const mail={project_id:pid,gmail_message_id:'abc',gmail_thread_id:'def',needs_review:false,from_email:'zoran@aktiva.com.mk',sent_at:'2026-10-07',snippet:'goods are ready for pickup'};
const bundle={files:{rows:[]},emails:{rows:[mail]},attachments:{rows:[]}};
const stage=(status,source_url='')=>({fact_key:'spie.operation.v1.unit.x',fact_status:'observed',evidence_status:'documented',updated_at:'2026-10-07',value:{project_id:pid,shipment_id:'unit',event_type:'stage',payload:{stage_id:'material',status},source_url}});
const shipment={...stage('unknown'),fact_key:'spie.operation.v1.unit.created',value:{project_id:pid,shipment_id:'unit',event_type:'shipment',payload:{title:'Test lot',reference:'PO-1',thread_id:'def'}}};
test('distinct documents never use the same unverified fallback Drive URL',()=>{
 const b=structuredClone(bundle);b.files.rows=[{id:1,title:'Drawing.pdf',drive_url:'https://drive.google.com/file/d/shared/view'},{id:2,title:'Invoice.pdf',drive_url:'https://drive.google.com/file/d/shared/view'}];
 const files=O.fileModel(data,b);assert.equal(files.length,2);assert(files.every(f=>f.link_conflict&&!f.drive_url));
});
test('provider metadata validates each individual Drive identity',()=>{
 const b=structuredClone(bundle);b.files.rows=[{id:1,title:'Wrong.pdf',drive_url:'https://drive.google.com/file/d/real/view'}];
 const files=O.fileModel(data,b,[{id:'real',name:'Correct.pdf'}]);assert.equal(files.length,2);assert.equal(files.find(f=>f.title==='Wrong.pdf').drive_url,'');assert(files.find(f=>f.title==='Correct.pdf').drive_url.includes('/real/'));
});
test('Gmail and Drive copies merge only with exact hash or file identity',()=>{
 const b=structuredClone(bundle);b.attachments.rows=[{id:1,project_id:pid,gmail_message_id:'abc',attachment_id:'attachment',attachment_name:'Cert.pdf',drive_file_id:'real',content_sha256:'hash'}];
 const f=O.fileModel(data,b,[{id:'real',name:'Cert.pdf',sha256Checksum:'hash'}]);assert.equal(f.length,1);assert.equal(f[0].gmail_attachment_id,'attachment');assert(f[0].drive_url.includes('real'));
 b.attachments.rows.push({...b.attachments.rows[0],id:2,drive_file_id:null,content_sha256:'different',attachment_id:'other'});assert.equal(O.fileModel(data,b,[{id:'real',name:'Cert.pdf',sha256Checksum:'hash'}]).length,2);
});
test('offer versions stay grouped; latest sent is not accepted/current',()=>{
 const groups=O.offerGroups([{side:'client',title:'DAP.xlsx',sent:true,sent_at:'2026-09-14',kind:'offer'},{side:'client',title:'DDP.xlsx',sent:true,sent_at:'2026-09-25',kind:'offer'}]);assert.equal(groups.length,1);assert.equal(groups[0].current,null);assert.equal(groups[0].latestSent.title,'DDP.xlsx');
});
test('workflow has eleven stages and future/negative statements cannot complete them',()=>{
 const model={trusted:[{...mail,snippet:'Once production is completed we will inform you. Goods are not ready for pickup.'}]};const u=O.shipments(data,model,[shipment])[0];assert.equal(Object.keys(u.stages).length,11);assert.equal(u.stages.production.status,'unknown');assert.equal(u.stages.ready.status,'unknown');
});
test('explicit shipment evidence updates only its own phase and preserves source/date uncertainty',()=>{
 const u=O.shipments(data,{trusted:[mail]},[shipment])[0];assert.equal(u.stages.ready.status,'done');assert(u.stages.ready.source_url.includes('def'));assert.equal(u.stages.ready.actual_date,'');assert.equal(u.stages.delivered.status,'unknown');
});
test('shipment checklist automatically finds exact evidence, independent of manual tick',()=>{
 const f={identity:'sha256:hash',notes:{shipment_id:'unit',shipping_document_type:'invoice'},created_at:'2026-10-07',drive_url:'https://drive.google.com/file/d/invoice/view'};
 const rows=O.dossier({id:'unit',documents:[]},[f]);const invoice=rows.find(r=>r.document_id==='invoice');assert.equal(invoice.status,'ready');assert.equal(invoice.checked,true);assert.equal(invoice.required,null);assert.equal(rows.find(r=>r.document_id==='eur1').required,null);assert.equal(rows.find(r=>r.document_id==='c_invoice').group,'C');
 assert.equal(O.dossier({id:'other',documents:[]},[f])[0].status,'missing');
});
test('ambiguous and approval-required documents stay for review',()=>{
 const f={identity:'one',notes:{shipment_id:'unit',shipping_document_type:'invoice',approval_required:true}};
 assert.equal(O.dossier({id:'unit',documents:[]},[f])[0].status,'missing');const rows=O.dossier({id:'unit',documents:[]},[f,{...f,identity:'two'}]);assert.equal(rows[0].checked,false);assert(rows[0].conflict);
});
test('finance separates directions, companies, shipment linkage and unknown payment',()=>{
 const d={sales:{rows:[{invoice_nr:'OUT',currency:'EUR',paid:false}]},suppliers:{rows:[{supplier:'Aktiva DOOEL',supplier_invoice_nr:'AK',paid:true},{supplier:'Zollcon GmbH',supplier_invoice_nr:'ZC',currency:'EUR',notes:{shipment_id:'unit'}},{supplier:'Other Ltd',currency:'USD',paid:false}]},guarantees:{rows:[]}};
 const f=O.financeModel(d,[],[{id:'unit',title:'Lot'}]);assert.equal(f.outgoing.length,1);assert.equal(f.incoming.get('Aktiva').length,1);assert.equal(f.incoming.get('Zollcon')[0].shipment.title,'Lot');assert.equal(f.incoming.get('Zollcon')[0].paymentStatus,'Pagesa e paverifikuar');assert.equal(f.incoming.get('Other Ltd')[0].currency,'USD');
});
test('session accepts Supabase seconds and rejects foreign identities',()=>{
 const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const jwt=ref=>'x.'+Buffer.from(JSON.stringify({ref,role:'authenticated',exp:Date.now()/1000+3600})).toString('base64url')+'.x';
 store.set('pristeel_session',JSON.stringify({access_token:jwt(D.PROJECT_REF),expires_at:Date.now()/1000+3600}));assert(D.session());store.set('pristeel_session',JSON.stringify({access_token:jwt('foreign'),expires_at:Date.now()+3600000}));assert.equal(D.session(),null);
});
test('expired session refresh coalesces and never restores after logout',async()=>{
 const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const jwt=exp=>'x.'+Buffer.from(JSON.stringify({ref:D.PROJECT_REF,role:'authenticated',exp})).toString('base64url')+'.x';const before={access_token:jwt(1),refresh_token:'fixture',expires_at:1};store.set('pristeel_session',JSON.stringify(before));let calls=0;globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({access_token:jwt(Date.now()/1000+3600),refresh_token:'fresh',expires_at:Date.now()/1000+3600})};};await Promise.all([D.ensureSession(),D.ensureSession()]);assert.equal(calls,1);assert(D.session());
 store.set('pristeel_session',JSON.stringify(before));let finish;globalThis.fetch=()=>new Promise(resolve=>{finish=resolve;});const request=D.ensureSession();store.delete('pristeel_session');finish({ok:true,json:async()=>({access_token:jwt(Date.now()/1000+3600),refresh_token:'fresh',expires_at:Date.now()/1000+3600})});assert.equal(await request,null);assert(!store.has('pristeel_session'));
});
test('manual changes append one approved command and require receipt plus canonical readback',async()=>{
 const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const jwt='x.'+Buffer.from(JSON.stringify({ref:D.PROJECT_REF,role:'authenticated',exp:Date.now()/1000+3600})).toString('base64url')+'.x';store.set('pristeel_session',JSON.stringify({access_token:jwt,expires_at:Date.now()+3600000}));store.set('pst_google_workspace_token_v2','fixture-google');store.set('pst_google_workspace_token_exp_v2',Date.now()+3600000);store.set('pst_google_workspace_scopes_v2','https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/drive');D.invalidate();let appended,canonical,posts=0;
 globalThis.fetch=async(url,options={})=>{
  const u=new URL(url);let body=[];if(u.pathname.endsWith('pppp_chatgpt_bridge_manifest_v1'))body={allowed_action_types:['context_fact'],approval_required:'approved',command_sheet_id:'sheet',command_tab:'Commands'};
  else if(u.hostname==='sheets.googleapis.com'&&options.method!=='POST')body={values:[['command_id','action_type','approval','project_id','fact_key','value_json']]};
  else if(options.method==='POST'){posts++;appended=JSON.parse(options.body).values[0];canonical=JSON.parse(appended[5]);body={updates:{updatedRows:1}};}
  else if(u.pathname.endsWith('pppp_chatgpt_command_status_v1'))body=[{command_id:appended[0],status:'succeeded'}];else body=[{fact_key:appended[4],value:canonical}];return {ok:true,json:async()=>body};
 };
 await assert.rejects(B.submitOperation({shipment_id:'unit',event_type:'document',payload:{}},false),/miratimi/);
 await B.submitOperation({shipment_id:'unit',event_type:'document',payload:{document_id:'invoice',status:'missing'},source_url:''},true);assert.equal(posts,1);assert.equal(appended[1],'context_fact');assert.equal(appended[2],'approved');assert.equal(appended[3],pid);await assert.rejects(B.submitOperation({shipment_id:'unit',event_type:'document',payload:{}},true),/pritje/);assert.equal((await B.verifyPending()).status,'verified');assert.equal(B.pendingCommand(),null);
});
