import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../spie/data.mjs';
import * as M from '../spie/document-models.mjs';
import {decodeBody} from '../spie/evidence.mjs';
import * as O from '../spie/operations.mjs';
test('credit and debit corrections keep independent signs and title',()=>{
 const data={lang:'en',nr:'DN-1',originalNr:'INV-1',gross:100,net:100,vat:0,items:[],logo:'data:image/png;base64,example'};
 assert.match(M.creditNote(data),/CREDIT NOTE/);assert.match(M.creditNote(data),/−100,00/);
 const debit=M.creditNote({...data,documentType:'debit_note'});assert.match(debit,/DEBIT NOTE/);assert(!debit.includes('−100,00'));
});
test('new document branding escapes content; older source models retain the original offer header',()=>{
 const data={lang:'en',nr:'<script>x</script>',logo:'data:image/png;base64,example',items:[],body:'<img onerror=alert(1)>',subject:'<script>Letter</script>'};
 assert.match(M.offer(data),/alt="PriSteel"/);assert(!M.offer({...data,version:'pristeel-uploaded-models-20261007-v1'}).includes('<img alt="PriSteel"'));
 const letter=M.letter(data);assert(letter.includes('&lt;img onerror=alert(1)&gt;'));assert(!letter.includes('<script>'));
});
test('plain email text retains UTF-8 and never extracts attachment bodies',()=>{
 const encoded=Buffer.from('Përshëndetje — Zollcon').toString('base64url');
 assert.equal(decodeBody({parts:[{mimeType:'text/plain',body:{data:encoded}},{mimeType:'text/plain',filename:'private.txt',body:{data:encoded}}]}),'Përshëndetje — Zollcon');
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
