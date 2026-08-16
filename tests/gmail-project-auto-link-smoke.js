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
  assert(source.includes('y.emails=[];y.tokens=[]'),'Contact/token-only evidence must be removed from legacy auto-link scoring');
  assert(loader.includes('pristeel-gmail-project-auto-link-v1.js?v=20260816-1'),'Current Project-first loader must load Gmail project auto-link');

  const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const projects=[
    {id:'p1',name:'ITALIAN STYLE - SPORTSKA HALA ANDRIJEVICA',client:'ITALIAN STYLE D.O.O.',ref:'',business_ref:'Sportska Hala Andrijevica',status:'pritje'},
    {id:'p2',name:'Mega Totem — PNR High Rise Single Column MID 16m',client:'ITALIAN STYLE D.O.O.',ref:'',business_ref:'PNR High Rise Single Column MID 16m',status:'pritje'},
    {id:'p3',name:'Jola AH36 Heavy Plate',client:'De Jong & Lavino',ref:'',business_ref:'Jola AH36 Heavy Plate',status:'pritje'}
  ];
  const emails=[
    {id:'e1',gmail_message_id:'m1',gmail_thread_id:'t1',project_id:'p1',suggested_project_id:'p1',subject:'Sportska Hala Andrijevica',snippet:'initial linked mail'},
    {id:'e2',gmail_message_id:'m2',gmail_thread_id:'t2',project_id:null,suggested_project_id:null,subject:'Sportska Hala Andrijevica - nova ponuda',snippet:'u prilogu ponuda'},
    {id:'e3',gmail_message_id:'m3',gmail_thread_id:'t2',project_id:null,suggested_project_id:null,subject:'Re: ponuda',snippet:'hvala, pogledacemo'},
    {id:'e4',gmail_message_id:'m4',gmail_thread_id:'t3',project_id:null,suggested_project_id:null,subject:'Mega Totem - PNR High Rise Single Column MID 16m',snippet:'technical clarification'},
    {id:'e5',gmail_message_id:'m5',gmail_thread_id:'t4',project_id:null,suggested_project_id:null,subject:'Makstil offer steel plates',snippet:'revised plate price AH36'},
    {id:'e6',gmail_message_id:'m6',gmail_thread_id:'t5',project_id:null,suggested_project_id:null,subject:'Sportska Hala Andrijevica / Mega Totem',snippet:'two projects in one message'},
    {id:'e7',gmail_message_id:'m7',gmail_thread_id:'t6',project_id:'p2',suggested_project_id:'p2',subject:'Sportska Hala Andrijevica',snippet:'historically wrong relation must not move'}
  ];
  const links=[{id:'l1',project_id:'p1',gmail_message_id:'m1',gmail_thread_id:'t1',link_method:'manual'}];
  let writes=[];
  w.supaFetch=async(path,method='GET',body)=>{
    if(method==='GET'){
      if(path.startsWith('projects?select=id,name,client,ref,business_ref,status'))return projects.map(x=>({...x}));
      if(path.startsWith('project_emails?select=id,gmail_message_id,gmail_thread_id,project_id,suggested_project_id,subject,snippet,match_method,match_confidence,needs_review&order='))return emails.map(x=>({...x}));
      if(path.startsWith('project_email_links?select=gmail_thread_id,gmail_message_id,project_id&limit='))return links.map(x=>({...x}));
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

  w.PSTEmail={save:async()=>({inserted:0,updated:0})};
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
  assert.strictEqual(emails.find(x=>x.id==='e4').project_id,'p2','Mega Totem identity must not leak into sibling Italian Style project');
  assert.strictEqual(emails.find(x=>x.id==='e5').project_id,null,'Makstil/steel-plate context alone must not auto-link to Jola');
  assert.strictEqual(emails.find(x=>x.id==='e6').project_id,null,'Mixed project identities must remain unlinked');
  assert.strictEqual(emails.find(x=>x.id==='e7').project_id,'p2','Existing relation must never be auto-reassigned even when content points elsewhere');
  assert(links.some(x=>x.gmail_message_id==='m2'&&x.project_id==='p1'),'Auto-linked strong email must receive project_email_link');
  assert(links.some(x=>x.gmail_message_id==='m3'&&x.project_id==='p1'),'Thread-continuity email must receive project_email_link');

  const safe=api._test.safeProfiles([{p:{id:'p3'},emails:['makstil@example.com'],tokens:['plates','makstil'],refs:[]}]);
  assert.deepStrictEqual(Array.from(safe[0].emails),[],'Legacy unique contact evidence must not auto-link by itself');
  assert.deepStrictEqual(Array.from(safe[0].tokens),[],'Legacy generic token evidence must not auto-link by itself');
  assert(!writes.some(x=>x.path==='projects'),'No project rows may be created or patched by auto-link');

  dom.window.close();
  console.log('Gmail project auto-link smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});