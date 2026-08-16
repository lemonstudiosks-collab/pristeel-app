const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-gmail-project-auto-link-v1.js','utf8');
  const guardSource=fs.readFileSync('pristeel-gmail-project-identity-guard-v1.js','utf8');
  const loader=fs.readFileSync('pristeel-project-first-actions-v1.js','utf8');

  assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Gmail auto-link must not add polling or MutationObserver');
  assert(!/messages\/send|drafts\/send|\/send\b/.test(source),'Gmail auto-link must never send mail');
  assert(!/POST[^\n]*projects|db\(['"]projects['"],['"]POST/.test(source),'Gmail auto-link must never create projects');
  assert(source.includes('PSTGmailProjectIdentityGuardV1'),'Auto-link must reuse the existing identity guard');
  assert(source.includes('if(!row||row.project_id||!decision'),'Already-linked email rows must never be reassigned');
  assert(source.includes('y.emails=[];y.tokens=[];y.refs=[];y.names=[]'),'Legacy contact/token/ref/name evidence must be stripped before persistence');
  assert(source.includes("p.name='';p.client='';p.ref='';p.business_ref='';p.location='';"),'Legacy project metadata must be neutralized before persistence');
  assert(loader.includes('pristeel-gmail-project-auto-link-v1.js?v=20260816-autolink5'),'Current Project-first loader must cache-bust the authoritative Gmail auto-link module');

  const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const projects=[
    {id:'p1',name:'ITALIAN STYLE - SPORTSKA HALA ANDRIJEVICA',client:'ITALIAN STYLE D.O.O.',ref:'',business_ref:'Sportska Hala Andrijevica',identity_aliases:[],status:'pritje'},
    {id:'p2',name:'ITALIAN STYLE — BS Mrke 2 — Mega Totem 16m (Pumpa GM2)',client:'ITALIAN STYLE D.O.O.',ref:'PNR High Rise Single Column MID 16m',business_ref:'BS MRKE 2 - MEGA TOTEM 16m',identity_aliases:['Pumpa GM2','PNR High Rise Single Column MID 16m'],status:'pritje'},
    {id:'p3',name:'Jola AH36 Heavy Plate',client:'De Jong & Lavino',ref:'',business_ref:'Jola AH36 Heavy Plate',identity_aliases:[],status:'pritje'}
  ];
  const emails=[
    {id:'e1',gmail_message_id:'m1',gmail_thread_id:'t1',project_id:'p1',suggested_project_id:'p1',subject:'Sportska Hala Andrijevica',snippet:'initial linked mail',match_method:'manual',match_confidence:100},
    {id:'e2',gmail_message_id:'m2',gmail_thread_id:'t2',project_id:null,suggested_project_id:null,subject:'Sportska Hala Andrijevica - nova ponuda',snippet:'u prilogu ponuda'},
    {id:'e3',gmail_message_id:'m3',gmail_thread_id:'t2',project_id:null,suggested_project_id:null,subject:'Re: ponuda',snippet:'hvala, pogledacemo'},
    {id:'e4',gmail_message_id:'m4',gmail_thread_id:'t3',project_id:null,suggested_project_id:null,subject:'Pumpa GM2 - PNR High Rise Single Column MID 16m',snippet:'technical clarification'},
    {id:'e5',gmail_message_id:'m5',gmail_thread_id:'t4',project_id:null,suggested_project_id:null,subject:'Makstil offer steel plates',snippet:'revised plate price AH36'},
    {id:'e6',gmail_message_id:'m6',gmail_thread_id:'t5',project_id:null,suggested_project_id:null,subject:'Sportska Hala Andrijevica / Pumpa GM2',snippet:'two projects in one message'},
    {id:'e7',gmail_message_id:'m7',gmail_thread_id:'t6',project_id:'p2',suggested_project_id:'p2',subject:'Sportska Hala Andrijevica',snippet:'historically wrong relation must not move',match_method:'email',match_confidence:90}
  ];
  const links=[{id:'l1',project_id:'p1',gmail_message_id:'m1',gmail_thread_id:'t1',link_method:'manual',confidence:100}];
  let writes=[];
  w.supaFetch=async(path,method='GET',body)=>{
    if(method==='GET'){
      if(path.startsWith('projects?'))return projects.map(x=>({...x}));
      if(path.startsWith('project_emails?select=id,gmail_message_id,gmail_thread_id,project_id,suggested_project_id,subject,snippet,match_method,match_confidence,needs_review&order='))return emails.map(x=>({...x}));
      if(path.startsWith('project_email_links?select=gmail_thread_id,gmail_message_id,project_id,link_method,confidence&limit='))return links.map(x=>({...x}));
      if(path.startsWith('offers_inbox?select=gmail_msg_id,file_name'))return[];
      return[];
    }
    writes.push({path,method,body});
    const p=path.match(/^project_emails\?id=eq\.([^&]+)/);
    if(p&&method==='PATCH'){
      const id=decodeURIComponent(p[1]),row=emails.find(x=>String(x.id)===id);if(row)Object.assign(row,body);return row?[row]:[];
    }
    if(path==='project_email_links'&&method==='POST'){
      const row={id:'l'+(links.length+1),...body};links.push(row);return[row];
    }
    throw new Error('Unexpected DB write '+method+' '+path);
  };

  let legacyProfiles=null;
  w.PSTEmail={save:async(messages,profiles)=>{legacyProfiles=profiles;return{inserted:0,updated:0};}};
  w.eval(guardSource);
  w.eval(source);

  const api=w.PSTGmailProjectAutoLinkV1;
  assert(api,'Gmail project auto-link API missing');
  const result=await api.reconcileHistorical();
  assert.strictEqual(result.linked,3,'Two strong identity emails plus one confirmed-thread continuation should link');
  assert.strictEqual(result.strong,2,'Andrijevica and Mega Totem must link by strong unique identity');
  assert.strictEqual(result.thread,1,'Generic reply in newly confirmed Andrijevica thread must follow the single-project thread');
  assert.strictEqual(emails.find(x=>x.id==='e2').project_id,'p1','Andrijevica strong identity must link to Andrijevica');
  assert.strictEqual(emails.find(x=>x.id==='e3').project_id,'p1','Generic reply must inherit confirmed single-project thread identity');
  assert.strictEqual(emails.find(x=>x.id==='e4').project_id,'p2','Pumpa GM2 identity must not leak into sibling Italian Style project');
  assert.strictEqual(emails.find(x=>x.id==='e5').project_id,null,'Makstil/steel-plate context alone must not auto-link to Jola');
  assert.strictEqual(emails.find(x=>x.id==='e6').project_id,null,'Mixed project identities must remain unlinked');
  assert.strictEqual(emails.find(x=>x.id==='e7').project_id,'p2','Existing relation must never be auto-reassigned even when content points elsewhere');
  assert(links.some(x=>x.gmail_message_id==='m2'&&x.project_id==='p1'),'Auto-linked strong email must receive project_email_link');
  assert(links.some(x=>x.gmail_message_id==='m3'&&x.project_id==='p1'),'Thread-continuity email must receive project_email_link');

  const safe=api._test.safeProfiles([{p:{id:'p3',name:'Jola AH36 Heavy Plate',client:'De Jong & Lavino',ref:'JOLA-01',business_ref:'Jola AH36 Heavy Plate',location:'NL'},emails:['makstil@example.com'],tokens:['plates','makstil'],refs:['JOLA-01'],names:['jola']}]);
  assert.deepStrictEqual(Array.from(safe[0].emails),[],'Legacy unique contact evidence must not auto-link by itself');
  assert.deepStrictEqual(Array.from(safe[0].tokens),[],'Legacy generic token evidence must not auto-link by itself');
  assert.deepStrictEqual(Array.from(safe[0].refs),[],'Legacy reference evidence must be reserved for the authoritative identity matcher');
  assert.deepStrictEqual(Array.from(safe[0].names),[],'Legacy name aliases must be reserved for the authoritative identity matcher');
  assert.strictEqual(safe[0].p.id,'p3','Neutralization must preserve project ID for compatibility only');
  assert.strictEqual(safe[0].p.name,'');
  assert.strictEqual(safe[0].p.client,'');
  assert.strictEqual(safe[0].p.ref,'');
  assert.strictEqual(safe[0].p.business_ref,'');
  assert.strictEqual(safe[0].p.location,'');

  await w.PSTEmail.save([], [{p:{id:'p3',name:'Jola AH36 Heavy Plate',client:'De Jong & Lavino',ref:'JOLA-01',business_ref:'Jola AH36 Heavy Plate'},emails:['makstil@example.com'],tokens:['plates'],refs:['JOLA-01'],names:['jola']}]);
  assert(legacyProfiles,'Wrapped save must call legacy persistence layer');
  assert.strictEqual(legacyProfiles[0].p.name,'','Legacy persistence must receive no project-name scoring evidence');
  assert.strictEqual(legacyProfiles[0].p.client,'','Legacy persistence must receive no client scoring evidence');
  assert.deepStrictEqual(Array.from(legacyProfiles[0].refs),[],'Legacy persistence must receive no ref scoring evidence');
  assert(!writes.some(x=>x.path==='projects'),'No project rows may be created or patched by auto-link');

  dom.window.close();
  console.log('Gmail project auto-link smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});