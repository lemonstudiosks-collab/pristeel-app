const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://local.test/'});
  const w=dom.window;
  const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const projects={[A]:{id:A,name:'STACON',client:'STACON',status:'Fituar',operational_state:'execution',pipeline_stage:'production_control'},[B]:{id:B,name:'Other project',client:'Other',status:'Aktiv',pipeline_stage:'rfq_in'}};
  const mails={stacon:{id:'stacon',gmail_message_id:'stacon',project_id:A,subject:'STACON production approval',sent_at:'2026-08-30'},other:{id:'other',gmail_message_id:'other',project_id:B,subject:'Other project message',sent_at:'2026-08-29'}};
  w.supaFetch=async path=>{
    let m=path.match(/^projects\?id=eq\.([^&]+)/);if(m)return[projects[decodeURIComponent(m[1])]].filter(Boolean);
    m=path.match(/^project_email_links\?project_id=eq\.([^&]+)/);if(m)return decodeURIComponent(m[1])===A?[{project_id:A,gmail_message_id:'stacon'},{project_id:A,gmail_message_id:'other'}]:[{project_id:B,gmail_message_id:'other'}];
    m=path.match(/^project_emails\?project_id=eq\.([^&]+)/);if(m)return Object.values(mails).filter(x=>x.project_id===decodeURIComponent(m[1]));
    if(path.startsWith('project_emails?gmail_message_id=in.'))return Object.values(mails).filter(x=>path.includes('"'+x.gmail_message_id+'"'));
    return[];
  };
  w.eval(fs.readFileSync('pristeel-project-data-integrity-v1.js','utf8'));
  const firstA=await w.PSTProjectDataIntegrity.load(A),dataB=await w.PSTProjectDataIntegrity.load(B),secondA=await w.PSTProjectDataIntegrity.load(A);
  assert.deepStrictEqual(firstA.emails.map(x=>x.subject),['STACON production approval'],'STACON must exclude a relation-linked email whose authoritative project_id belongs elsewhere');
  assert.strictEqual(firstA.emailConflicts.length,1,'Conflicting relation must remain visible as data-quality evidence');
  assert.deepStrictEqual(dataB.emails.map(x=>x.subject),['Other project message'],'The other project must retain its own email');
  assert.deepStrictEqual(secondA.emails.map(x=>x.subject),['STACON production approval'],'A -> B -> A must not leak communication state');
  ['bom','rfqs','offers','docs','invoicesOut','invoicesIn','projectDocs','attachmentLinks'].forEach(k=>assert.notStrictEqual(firstA[k],dataB[k],k+' collections must be project-local instances'));
  dom.window.close();
  console.log('Project data isolation smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});