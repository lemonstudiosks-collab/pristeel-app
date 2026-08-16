const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-email-body-sync-v1.js','utf8');
  assert(source.includes("body_hydration_method:'browser-gmail-full-v1'"),'Browser hydration provenance marker missing');
  assert(source.includes('!m.body_hydrated_at'),'Browser sync must skip messages already explicitly hydrated');
  assert(!/project_id\s*:|suggested_project_id\s*:/.test(source),'Body hydration module must never assign project identity');

  const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{runScripts:'outside-only',url:'https://pppp.example/'});
  const w=dom.window;
  const calls=[];
  w.supaFetch=async(path,method,body)=>{calls.push({path,method,body});return[];};
  w.eval(source);
  const patch=w.PSTProjectEmailBodySyncV1._test.patchMessage;
  assert.strictEqual(typeof patch,'function','patchMessage test hook missing');

  const same={gmail_message_id:'gmail-1',snippet:'full body already here'};
  const sameChanged=await patch(same,'full body already here');
  assert.strictEqual(sameChanged,false,'Equal full body should not be reported as content change');
  assert.strictEqual(calls.length,1,'Equal content must still persist explicit hydration state');
  assert.strictEqual(calls[0].method,'PATCH');
  assert(calls[0].path.includes('gmail_message_id=eq.gmail-1'));
  assert.strictEqual(calls[0].body.snippet,'full body already here');
  assert.strictEqual(calls[0].body.body_hydration_method,'browser-gmail-full-v1');
  assert(calls[0].body.body_hydrated_at,'Hydration timestamp missing');
  assert(!('project_id' in calls[0].body),'Hydration PATCH must not change project_id');
  assert(!('suggested_project_id' in calls[0].body),'Hydration PATCH must not change suggested project');
  assert.strictEqual(same.body_hydration_method,'browser-gmail-full-v1','Local row state not updated');

  calls.length=0;
  const short={gmail_message_id:'gmail-2',snippet:'short'};
  const changed=await patch(short,'This is the complete Gmail message body.');
  assert.strictEqual(changed,true,'Longer fetched body should be reported as content change');
  assert.strictEqual(short.snippet,'This is the complete Gmail message body.');
  assert.strictEqual(calls.length,1);

  dom.window.close();
  console.log('Project email body hydration smoke: OK');
})().catch(err=>{console.error(err);process.exit(1);});