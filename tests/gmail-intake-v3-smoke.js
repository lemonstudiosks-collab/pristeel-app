const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-gmail-intake-v3.js','utf8');
 const guardSource=fs.readFileSync('pristeel-gmail-project-identity-guard-v1.js','utf8');
 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Gmail intake v3 must not observe or poll');
 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(guardSource),'Gmail project identity guard must not observe or poll');
 assert(source.includes('allowCreate=state.linkedIds.length===0'),'Create-project option must depend on real links, not suggestions');
 assert(source.includes("window.PSTGmailIntakeV3=api;window.PSTGmailIntakeV2=api"),'Compatibility alias is missing');
 assert(source.includes("if(el.id!=='pgi2-close')el.disabled=!!on"),'Busy state must keep close available');
 assert(!/db\([^\n]*['\"](?:POST|PATCH|DELETE)[^\n]*setTimeout/i.test(source),'Writes must not be automatically retried');

 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 w.File=class File{constructor(parts,name,opt){this.parts=parts;this.name=name;this.type=opt&&opt.type;}};
 w.PSTDriveImport={importFiles:async()=>({uploaded:0,skipped:0})};
 w.PSTEmail={
   auth:async()=> 'token',
   message:async id=>({gmail_message_id:id,gmail_thread_id:'t1',subject:'New Steel Project',from_email:'buyer@example.com'}),
   gmail:async path=>({messages:[{id:'m1',threadId:'t1',internalDate:String(Date.now()),snippet:'new RFQ',payload:{headers:[{name:'Subject',value:'New Steel Project'},{name:'From',value:'Buyer <buyer@example.com>'}],parts:[]}}]})
 };
 let posts=[];
 w.supaFetch=async (path,method,body)=>{
   if(path.startsWith('projects?select='))return[];
   if(path.startsWith('project_emails?'))return[];
   if(path.startsWith('project_email_links?'))return[];
   if(path.startsWith('project_contacts?'))return[];
   if(path==='projects'&&method==='POST'){posts.push(body);return[{id:'p-new',...body}];}
   if(path==='project_emails'&&method==='POST')return body;
   if(path==='project_email_links'&&method==='POST')return[body];
   return[];
 };
 w.eval(source);
 w.eval(guardSource);

 const T=w.PSTGmailProjectIdentityGuardV1._test;
 const projects=[
   {id:'e8910',name:'EVOSYS Laser — ANF-8910 Anfrage Schweißbaugruppen/-gestell für 05510',client:'Evosys Laser GmbH'},
   {id:'e8915',name:'EVOSYS Laser — ANF-8915 (POROSI E KONFIRMUAR)',client:'Evosys Laser GmbH'},
   {id:'s784',name:'260784_Airbus H24X_Anfrage Fertigung',client:'Stacon',business_ref:'260784'},
   {id:'s656',name:'STACON 260656 - Massivbau_Stahlstützen',client:'STACON GmbH',business_ref:'260656'},
   {id:'s346',name:'Stacon - Stahlträger Anfrage_260346',client:'STACON GmbH',ref:'260346',business_ref:'260346'},
   {id:'sw001',name:'STACON - LAGERHALLE - HAMBURG',client:'STACON GmbH',business_ref:'ES-W001'},
   {id:'ibudva',name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA',client:'ITALIAN STYLE',business_ref:'Budva'},
   {id:'icar',name:'ITALIAN STYLE - Hala - CARINVEST',client:'ITALIAN STYLE'},
   {id:'irobmc',name:'ITALIAN STYLE - ROBMC Project - 260972',client:'ITALIAN STYLE',ref:'ROBMC-260972-2026',business_ref:'260972'},
   {id:'ikot',name:'ITALIAN STYLE – Kotlarnica TE Pljevlja (Montenegro)',client:'ITALIAN STYLE',ref:'Kotlarnica-TE-Pljevlja',business_ref:'Kotlarnica-TE-Pljevlja'}
 ];
 const idx=T.buildIndex(projects);
 // Convert jsdom-realm arrays to native Node arrays before deep comparisons.
 const ids=text=>Array.from(T.classifyCorpus(text,idx).hits,x=>x.project.id).sort();
 assert.deepStrictEqual(ids('ANF-8910 Anfrage Schweißbaugruppen für 05510'),['e8910'],'ANF-8910 must not map to ANF-8915');
 assert.deepStrictEqual(ids('ANF-8915 Anfrage Schweissgestell 03829'),['e8915'],'ANF-8915 must remain separate');
 assert.deepStrictEqual(ids('ANF-8910 / ANF-8915 gemeinsame Rückmeldung'),['e8910','e8915'],'Mixed EVOSYS RFQs must be detected as multi-project');
 assert.deepStrictEqual(ids('ANF-8910 / ANF-08915 gemeinsame Rückmeldung'),['e8910','e8915'],'Zero-padded ANF-08915 must normalize to ANF-8915 and remain mixed');
 assert(T.classifyCorpus('ANF-8910 / ANF-08915 gemeinsame Rückmeldung',idx).mixed,'Mixed EVOSYS message must be blocked from one-project normalization');
 assert.deepStrictEqual(ids('260784 Airbus H24X Anfrage Fertigung'),['s784'],'STACON 260784 must map only to its own RFQ');
 assert.deepStrictEqual(ids('Nahtvorbereitung ES-W001 kurze Nachfrage'),['sw001'],'STACON ES-W001 must map only to Lagerhalle project');
 assert.deepStrictEqual(ids('Dukley Seafront Restoran BUDVA'),['ibudva'],'Italian Style Budva must map only to Dukley/Budva');
 assert.deepStrictEqual(ids('Dokumentacija za hale CARINVEST'),['icar'],'Italian Style CARINVEST must remain separate from Budva');
 assert.deepStrictEqual(ids('ITALIAN STYLE nova dokumentacija'),[],'Company name alone must never pick one sibling project');
 const idxOnly8915=T.buildIndex(projects.filter(p=>p.id!=='e8910'));
 const unknown=T.classifyCorpus('Evosys Laser GmbH - ANF-8910 Anfrage',idxOnly8915);
 assert(Array.from(unknown.unknownRefs).includes('anf8910'),'Unknown ANF-8910 must be blocked instead of falling into ANF-8915');

 await w.PSTGmailIntakeV3.open('https://example.test/?gmail_intake=1&gmail_message_id=m1&gmail_thread_id=t1&subject=New%20Steel%20Project&from=buyer%40example.com');
 assert(w.document.getElementById('pgi2-toggle-create'),'Unmatched Gmail thread did not expose Create Project');
 w.document.getElementById('pgi2-toggle-create').click();
 const name=w.document.getElementById('pgi2-name');
 assert(name&&!name.hidden,'Create form did not open');
 w.document.getElementById('pgi2-create').click();
 await new Promise(r=>setTimeout(r,80));
 assert(posts.length===1,'Project creation did not execute exactly once');
 assert(w.document.body.textContent.includes('U ruajt te:')||w.document.body.textContent.includes('ruajtja përfundoi'),'Intake did not reach successful result');
 assert.strictEqual(w.PSTGmailIntakeV2,w.PSTGmailIntakeV3,'Compatibility alias does not point to v3');
 dom.window.close();
 console.log('Gmail intake v3 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});