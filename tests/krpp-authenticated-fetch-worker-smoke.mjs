import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {webcrypto} from 'node:crypto';
import {workerBase,workerHeaders} from '../scripts/krpp-worker-transport.mjs';
import {runOnce} from '../scripts/krpp-authenticated-fetch-worker.mjs';

assert.equal(workerBase(),'https://awqfpnzqwfjrjefoktgd.supabase.co');
assert.throws(()=>workerBase('https://isymxqfqzkchbsrbhucf.supabase.co'),/canonical/);
assert.throws(()=>workerBase('https://awqfpnzqwfjrjefoktgd.supabase.co/?x=1'),/canonical/);
assert.throws(()=>workerHeaders('w',''),/required/);
const headers=workerHeaders('w','private-test-worker-token',{json:true});
assert.match(headers.Authorization,/^Bearer ey/);
assert.equal(headers.apikey,headers.Authorization.slice(7));
assert.equal(JSON.parse(Buffer.from(headers.apikey.split('.')[1],'base64url')).role,'anon');
assert.equal(headers['x-pppp-worker-token'],'private-test-worker-token');
process.env.SUPABASE_ANON_KEY='x.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')+'.x';
assert.throws(()=>workerHeaders('w','t'),/never a secret/);
delete process.env.SUPABASE_ANON_KEY;

const id='11111111-1111-1111-1111-111111111111';
const job={tender_watch_id:id,procurement_no:'TEST-26',expected_documents:['Dossier.docx']};
const originalFetch=globalThis.fetch;
process.env.PPPP_WORKER_TOKEN='private-test-worker-token';
process.env.KRPP_COOKIE_HEADER='test-session=local-only';
let calls=[];
function transport({claim=job}={}){
 globalThis.fetch=async(url,opts)=>{
  assert.equal(new URL(url).origin,workerBase());
  assert.match(opts.headers.Authorization,/^Bearer ey/);
  assert.equal(opts.headers['x-pppp-worker-token'],'private-test-worker-token');
  if(opts.body instanceof FormData){calls.push('upload');return Response.json({ok:true});}
  const body=JSON.parse(opts.body);calls.push(body.action);
  if(body.action==='peek')return Response.json({ok:true,job});
  if(body.action==='claim'){assert.equal(body.tender_watch_id,id);return Response.json({ok:true,job:claim});}
  return Response.json({ok:true,status:'ready'});
 };
}
try{
 transport();await assert.rejects(runOnce({fetchDocuments:async()=>{throw Error('KRPP session expired');}}),/session expired/);
 assert.deepEqual(calls,['peek'],'expired portal session must never consume a queue attempt');
 calls=[];transport({claim:null});
 await runOnce({fetchDocuments:async()=>[{name:'Dossier.docx',bytes:new Uint8Array([80,75]),content_type:'application/zip'}]});
 assert.deepEqual(calls,['peek','claim'],'concurrent claim loss must not upload a dossier');
 calls=[];transport();
 const out=await runOnce({tenderId:id,fetchDocuments:async()=>[{name:'Dossier.docx',bytes:new Uint8Array([80,75])}]});
 assert.equal(out.status,'ready');assert.equal(out.archived,1);
 assert.deepEqual(calls,['peek','claim','upload','complete']);
 calls=[];transport({claim:{...job,expected_documents:['Changed.xlsx']}});
 await assert.rejects(runOnce({fetchDocuments:async()=>[{name:'Dossier.docx',bytes:new Uint8Array([80,75])}]}),/changed/);
 assert.deepEqual(calls,['peek','claim','fail'],'changed document contract must block upload');
}finally{globalThis.fetch=originalFetch;delete process.env.PPPP_WORKER_TOKEN;delete process.env.KRPP_COOKIE_HEADER;}

const source=fs.readFileSync('supabase/functions/pppp-tender-fetch-worker/index.ts','utf8');
const stale='22222222-2222-2222-2222-222222222222';
let claimStatus='processing';
const queryLog=[];
const db={from(table){
 const state={table,filters:[],write:false};
 const b={select(){return b;},eq(k,v){state.filters.push([k,v]);return b;},in(){return b;},order(){return b;},limit(){return b;},
 update(){state.write=true;return b;},maybeSingle(){
  queryLog.push(state);
  return Promise.resolve({data:{...job,status:claimStatus,payload:{worker_id:'mac-mini-01'},protected_documents:['Dossier.docx']},error:null});
 },
 then(resolve){queryLog.push(state);const selected=state.filters.find(([k])=>k==='tender_watch_id')?.[1];
 const rows=table==='kek_tender_watch'?[{id, superseded_by:null},{id:stale,superseded_by:id}]:
 [{...job,tender_watch_id:stale,payload:{}},{...job,payload:{}}].filter(x=>!selected||x.tender_watch_id===selected);
 return Promise.resolve({data:rows,error:null}).then(resolve);
 }};return b;
}};
let code=source.replace(/^import .*;\s*$/gm,'');
code=stripTypeScriptTypes(code,{mode:'transform'})+'\nglobalThis.testFns={peek,claim};';
const ctx={db,createClient:()=>db,Deno:{env:{get:()=>''},serve(){}},crypto:webcrypto,TextEncoder,Response,Request,File,URL,console,Date,Set};
vm.runInNewContext(code,ctx);
const preview=await ctx.testFns.peek();
assert.equal(preview.job.tender_watch_id,id,'superseded and orphan tenders must not be selected');
queryLog.length=0;await ctx.testFns.peek(id);
assert(queryLog.some(x=>x.table==='pppp_tender_fetch_queue'&&x.filters.some(([k,v])=>k==='tender_watch_id'&&v===id)));
claimStatus='analyzed';
assert.equal((await ctx.testFns.claim('mac-mini-01',id)).job,null,'canonical trigger must not return an analyzed row as claimed');
claimStatus='processing';
assert.equal((await ctx.testFns.claim('mac-mini-01',id)).job.tender_watch_id,id);
assert.match(source,/safeEqual\(actual,stored\)/,'private worker-token verification must remain');
assert.match(source,/data.enabled!==true/,'disabled worker gate must remain');
console.log('KRPP transport, canonical origin, preflight, exact claim, concurrency and preserved worker gates passed.');
