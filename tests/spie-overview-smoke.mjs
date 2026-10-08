import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../spie/data.mjs';
import * as M from '../spie/document-models.mjs';
import {decodeBody,fileAccess,fileMime,file as previewFile} from '../spie/evidence.mjs';
import * as O from '../spie/operations.mjs';
test('same-name documents are one display group while distinct hashes and revisions remain intact',()=>{
 const files=[{identity:'sha:1',title:'Offer.pdf',category:'Oferta PriSteel',content_sha256:'one',created_at:'2026-10-07'},{identity:'sha:2',title:'Offer.pdf',category:'Oferta PriSteel',content_sha256:'two',created_at:'2026-10-08'},{identity:'sha:3',title:'Offer Rev2.pdf',category:'Oferta PriSteel'}];
 const groups=O.fileGroups(files);assert.equal(groups.length,2);assert.equal(groups[0].files.length,2);assert.deepEqual(groups[0].files.map(f=>f.content_sha256),['two','one']);assert.equal(files.length,3);
});
test('the overview retains only current thread heads; older, repeated and unresolved mail stay separate',()=>{
 const now=Date.parse('2026-10-08T18:00:00Z'),mail=(id,thread,at,more={})=>({gmail_message_id:id,gmail_thread_id:thread,sent_at:at,needs_review:false,...more});
 const rows=[mail('old','a','2026-10-03'),mail('latest','a','2026-10-08T12:00:00Z'),mail('previous','a','2026-10-08T11:00:00Z'),mail('review','b','2026-10-08T10:00:00Z',{needs_review:true}),mail('approved-context','c','2026-10-08T09:00:00Z',{needs_review:true,association_pending:true,context_thread_verified:true}),mail('future','d','2026-10-09')];
 const result=O.communicationWindow(rows,now);assert.deepEqual(result.recent.map(m=>m.gmail_message_id),['latest','approved-context']);assert.deepEqual(result.history.map(m=>m.gmail_message_id),['previous','old']);assert.equal(result.recent[1].needs_review,true);assert.equal(O.communicationWindow(rows,now+7*86400000).recent.length,0);
});
test('inactive Gmail is a connection issue while Drive preview and exact copy enrichment remain available',()=>{
 globalThis.localStorage={getItem:()=>null};assert.equal(fileAccess({gmail_message_id:'aa',gmail_attachment_id:'part'}),'connect_gmail');assert.equal(fileAccess({gmail_message_id:'aa',gmail_attachment_id:'part',drive_file_id:'exact'}),'drive_preview');assert.equal(fileAccess({link_conflict:'mismatch',drive_file_id:'exact'}),'conflict');assert.equal(fileMime({title:'Offer.pdf',attachment_mime_type:'application/octet-stream'}),'application/pdf');assert.match(fileMime({title:'Offer.xlsx'}),/spreadsheetml/);
 const bundle={files:{rows:[{id:'canonical',title:'A.pdf',content_sha256:'same'}]}};const files=O.fileModel({project:{}},bundle,[{id:'drive-id',name:'A.pdf',sha256Checksum:'same'}]);assert.equal(files.length,1);assert.equal(files[0].drive_file_id,'drive-id');
});
test('opening a small Gmail PDF renders it inside the module; offline reopening requests connection without fetching',async()=>{
 const store=new Map(),jwt='x.'+Buffer.from(JSON.stringify({ref:D.PROJECT_REF,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,sub:'fixture'})).toString('base64url')+'.x';
 store.set('pristeel_session',JSON.stringify({access_token:jwt,expires_at:Date.now()+3500000}));store.set('pst_google_workspace_token_v2','google-fixture');store.set('pst_google_workspace_token_exp_v2',String(Date.now()+3500000));store.set('pst_google_workspace_scopes_v2','https://www.googleapis.com/auth/gmail.readonly');globalThis.localStorage={getItem:k=>store.get(k)||null};
 const bodies=[],dialogs=[];globalThis.document={body:{append(){}},createElement(){const body={innerHTML:'',setAttribute(){}};bodies.push(body);const close={},handlers={};const dialog={open:false,querySelector:selector=>selector==='.evidence-body'?body:close,showModal(){this.open=true;},addEventListener(k,fn){handlers[k]=fn;},close(){this.open=false;handlers.close?.();},remove(){}};dialogs.push(dialog);return dialog;}};
 let calls=0;globalThis.fetch=async(url,opts)=>{calls++;assert.equal(opts.method,'GET');assert.match(url,/messages\/abc\/attachments\/exact$/);assert.equal(opts.headers.Authorization,'Bearer google-fixture');const bytes=Buffer.from(JSON.stringify({size:9,data:Buffer.from('%PDF-test').toString('base64url')}));return {ok:true,headers:{get:()=> 'application/json'},arrayBuffer:async()=>bytes};};
 const file={title:'Offer.pdf',gmail_message_id:'abc',gmail_attachment_id:'exact',attachment_mime_type:'application/octet-stream'};
 try{await previewFile(file);assert.match(bodies[0].innerHTML,/<iframe title="PDF"/);assert(!bodies[0].innerHTML.includes('mail.google.com'));dialogs[0].close();store.delete('pst_google_workspace_token_v2');await previewFile(file);assert.match(bodies[1].innerHTML,/Lidhja Google n� PPPP �sht� joaktive/);assert(!bodies[1].innerHTML.includes('shkarkim nga burimi'));assert.equal(calls,1);}finally{dialogs.at(-1)?.close();}
});
test('credit and debit corrections keep independent signs and title',()=>{
 const data={lang:'en',nr:'DN-1',originalNr:'INV-1',gross:100,net:100,vat:0,items:[],logo:'data:image/png;base64,example'};
 assert.match(M.creditNote(data),/CREDIT NOTE/);assert.match(M.creditNote(data),/-100,00/);
 const debit=M.creditNote({...data,documentType:'debit_note'});assert.match(debit,/DEBIT NOTE/);assert(!debit.includes('-100,00'));
});
test('new document branding escapes content; older source models retain the original offer header',()=>{
 const data={lang:'en',nr:'<script>x</script>',logo:'data:image/png;base64,example',items:[],body:'<img onerror=alert(1)>',subject:'<script>Letter</script>'};
 assert.match(M.offer(data),/alt="PriSteel"/);assert(!M.offer({...data,version:'pristeel-uploaded-models-20261007-v1'}).includes('<img alt="PriSteel"'));
 const letter=M.letter(data);assert(letter.includes('&lt;img onerror=alert(1)&gt;'));assert(!letter.includes('<script>'));
});
test('plain email text retains UTF-8 and never extracts attachment bodies',()=>{
 const encoded=Buffer.from('P�rsh�ndetje - Zollcon').toString('base64url');
 assert.equal(decodeBody({parts:[{mimeType:'text/plain',body:{data:encoded}},{mimeType:'text/plain',filename:'private.txt',body:{data:encoded}}]}),'P�rsh�ndetje - Zollcon');
});
test('file model retains byte-size for on-demand file limits',()=>{
 const data={project:{drive_folder_id:'folder'},context_facts:[]},bundle={emails:{rows:[{gmail_message_id:'aa',needs_review:false,project_id:D.PROJECT_ID}]},attachments:{rows:[{id:'one',project_id:D.PROJECT_ID,gmail_message_id:'aa',attachment_id:'part',attachment_name:'A.pdf',attachment_size_bytes:12000000,attachment_mime_type:'application/pdf'}]}};
 assert.equal(O.fileModel(data,bundle)[0].attachment_size_bytes,12000000);
});
test('new replies in an exact approved customs thread are display-only and need no guessed subject',async()=>{
 const store=new Map(),token='x.'+Buffer.from(JSON.stringify({ref:D.PROJECT_REF,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,sub:'fixture'})).toString('base64url')+'.x';
 globalThis.localStorage={getItem:k=>store.get(k)||null};globalThis.sessionStorage={getItem:()=>null};
 for(const [k,v]of Object.entries({pristeel_session:JSON.stringify({access_token:token,expires_at:Date.now()+3500000}),pst_google_workspace_token_v2:'test-token',pst_google_workspace_token_exp_v2:String(Date.now()+3500000),pst_google_workspace_scopes_v2:'https://www.googleapis.com/auth/gmail.readonly'}))store.set(k,v);
 D.invalidate();const calls=[];
 globalThis.fetch=async(url,opts)=>{calls.push({url,opts});if(url.includes('threads/abc'))return {ok:true,json:async()=>({messages:[{id:'def',threadId:'abc',internalDate:String(Date.now()),labelIds:['INBOX'],payload:{headers:[{name:'From',value:'Customs <office@customs.example>'},{name:'Subject',value:'Meeting follow-up'}],parts:[{mimeType:'text/plain',body:{data:Buffer.from('Meeting costs are zero').toString('base64url')}}]}}]})};return {ok:true,json:async()=>url.includes('gmail.googleapis')?{}:[]};};
 const facts=[{fact_status:'observed',fact_key:'spie.workspace.communication_threads.v1',value:{identity_verified:true,project_id:D.PROJECT_ID,threads:[{gmail_thread_id:'abc'}]}}];
 const result=await D.operational(facts);assert.equal(result.emails.rows[0].gmail_message_id,'def');assert.equal(result.emails.rows[0].external_source,true);assert.equal(result.emails.rows[0].project_id,undefined);assert(calls.every(c=>!c.opts?.method||c.opts.method==='GET'));assert(!calls.some(c=>c.url.includes('threadid:')));
 D.invalidate();calls.length=0;const unknown=await D.operational([{...facts[0],value:{...facts[0].value,identity_verified:false}}]);assert.equal(unknown.emails.rows.length,0);assert(!calls.some(c=>c.url.includes('threads/abc')));
});

test('an approved thread makes an unlinked incoming reply readable while retaining every review gate',async()=>{
 const store=new Map(),token='x.'+Buffer.from(JSON.stringify({ref:D.PROJECT_REF,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600,sub:'fixture'})).toString('base64url')+'.x';
 globalThis.localStorage={getItem:k=>store.get(k)||null};store.set('pristeel_session',JSON.stringify({access_token:token,expires_at:Date.now()+3500000}));D.invalidate();
 globalThis.fetch=async(url)=>({ok:true,json:async()=>String(url).includes('suggested_project_id')?[{gmail_message_id:'123',gmail_thread_id:'abc',project_id:null,suggested_project_id:D.PROJECT_ID,needs_review:true,subject:'AW: customs coordination',snippet:'Please confirm the logistics partner',sent_at:new Date().toISOString()}]:[]});
 const facts=[{fact_status:'observed',fact_key:'spie.workspace.communication_threads.v1',value:{identity_verified:true,project_id:D.PROJECT_ID,threads:[{gmail_thread_id:'abc'}]}},{fact_status:'observed',fact_key:'spie.workspace.communication_evidence.v1',value:{identity_verified:true,project_id:D.PROJECT_ID,emails:[{gmail_message_id:'123',gmail_thread_id:'abc',body_fragment:'Verified message',sent_at:new Date().toISOString()},{gmail_message_id:'456',gmail_thread_id:'foreign',body_fragment:'Foreign message',sent_at:new Date().toISOString()}]}}];
 const bundle=await D.operational(facts),mail=bundle.emails.rows[0];assert(mail.context_thread_verified);assert(mail.association_pending);assert(mail.needs_review);assert.equal(mail.project_id,null);assert.equal(mail.body_excerpt,'Verified message');assert.equal(bundle.emails.rows.length,1);
 assert.equal(D.operationalModel({project:{id:D.PROJECT_ID},context_facts:[]},bundle).currentRequest,undefined);
});
