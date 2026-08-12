const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const core=fs.readFileSync('pristeel-email-core.js','utf8');
  const safety=fs.readFileSync('pristeel-email-supplier-domain-safety-v1.js','utf8');
  const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const inserted=[];
  w.console=console;
  w.supaFetch=async(path,method,body)=>{
    if(path.startsWith('projects?select='))return[{id:'p1',name:'PROJEKT TENNET · SPIE',client:'SPIE',ref:'BUNT',status:'pritje',location:'Gjermani',pipeline_stage:'supplier_selection'}];
    if(path.startsWith('rfq_log?select='))return[];
    if(path.startsWith('contact_activities?select='))return[];
    if(path.startsWith('project_contacts?select='))return[
      {project_id:'p1',email:'zoran@aktiva.com.mk'},
      {project_id:'p1',email:'dimitar.zakov@vating.com.mk'},
      {project_id:'p1',email:'martin.nedelkovski@elektroterra.mk'}
    ];
    if(path.startsWith('documents_registry?select='))return[];
    if(path.startsWith('partners?relation=cs.{supplier}'))return[
      {name:'AKTIVA',aliases:null,relation:['supplier','subcontractor']},
      {name:'Vating',aliases:null,relation:['supplier']},
      {name:'Elektroterra',aliases:null,relation:['supplier']}
    ];
    if(path.startsWith('contacts?email=not.is.null'))return[
      {company:'AKTIVA',email:'zoran@aktiva.com.mk',kind:'client'},
      {company:'vating.com.mk',email:'dimitar.zakov@vating.com.mk',kind:'client'},
      {company:'elektroterra.mk',email:'martin.nedelkovski@elektroterra.mk',kind:'client'}
    ];
    if(path.startsWith('project_emails?select='))return[];
    if(path.startsWith('project_email_links?select='))return[];
    if(path==='project_emails'&&method==='POST'){inserted.push(...body);return body;}
    return[];
  };

  w.eval(core);
  w.eval(safety);
  assert(w.PSTEmailSupplierDomainSafetyV1,'Supplier-domain safety module must install');
  const profiles=await w.PSTEmail.profiles();
  assert.strictEqual(profiles.length,1);
  assert.deepStrictEqual(Array.from(profiles[0].emails),[],'Supplier partner domains must be removed from project-owner email scoring');
  assert.deepStrictEqual(Array.from(profiles[0].supplier_emails).sort(),[
    'dimitar.zakov@vating.com.mk','martin.nedelkovski@elektroterra.mk','zoran@aktiva.com.mk'
  ].sort(),'Suppressed supplier emails must remain visible for diagnostics');
  assert(w.PSTEmail.supplierDomains['aktiva.com.mk'],'AKTIVA domain must be identified from supplier partner + contacts');
  assert(w.PSTEmail.supplierDomains['vating.com.mk'],'Vating domain must be identified from supplier partner + contacts');
  assert(w.PSTEmail.supplierDomains['elektroterra.mk'],'Elektroterra domain must be identified from supplier partner + contacts');

  inserted.length=0;
  await w.PSTEmail.save([{
    gmail_message_id:'england-1',gmail_thread_id:'england-thread',from_email:'zoran@aktiva.com.mk',to_emails:['sales@prissteel.com'],cc_emails:[],
    subject:'Zahtev za ponudu – Projekat u Engleskoj',snippet:'Ponuda za čelične konstrukcije za projekat u Engleskoj.',sent_at:'2026-07-20T06:18:00Z',direction:'incoming',has_attachments:false,gmail_url:'x'
  }],profiles);
  assert.strictEqual(inserted.length,1);
  assert.strictEqual(inserted[0].project_id,null,'Supplier email alone must not auto-assign an unrelated project');
  assert.strictEqual(inserted[0].suggested_project_id,null,'Supplier email alone must not even suggest TenneT without project evidence');

  inserted.length=0;
  await w.PSTEmail.save([{
    gmail_message_id:'bunt-1',gmail_thread_id:'bunt-thread',from_email:'zoran@aktiva.com.mk',to_emails:['sales@prissteel.com'],cc_emails:[],
    subject:'Projekt TenneT BUNT – technische Unterlagen',snippet:'Unterlagen für BUNT.',sent_at:'2026-07-20T06:18:00Z',direction:'incoming',has_attachments:false,gmail_url:'x'
  }],profiles);
  assert.strictEqual(inserted.length,1);
  assert.strictEqual(inserted[0].project_id,'p1','Real BUNT reference must still auto-assign TenneT even for a supplier domain');
  assert(/reference/.test(inserted[0].match_method),'BUNT assignment must be evidence-driven, not email-unique');
  assert(!/email-unique|email-shared/.test(inserted[0].match_method),'Suppressed supplier domain must not contribute ownership score');

  assert(bootstrap.includes("pristeel-email-supplier-domain-safety-v1.js?v=20260812-1"),'Bootstrap must load supplier-domain safety');
  assert(bootstrap.indexOf('pristeel-email-core.js')<bootstrap.indexOf('pristeel-email-supplier-domain-safety-v1.js'),'Supplier-domain safety must load after Gmail core');

  dom.window.close();
  console.log('Email supplier-domain safety smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});