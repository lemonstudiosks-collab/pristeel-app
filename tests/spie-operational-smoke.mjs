import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../spie/data.mjs';
const pid=D.PROJECT_ID;
const mail=(id,from,subject,date='2026-10-05',more={})=>({project_id:pid,gmail_message_id:id,gmail_thread_id:'abcdef',from_email:from,to_emails:['laura@spie.com'],direction:from.endsWith('@prissteel.com')?'outgoing':'incoming',needs_review:false,subject,sent_at:date,...more});
const attachment=(id,name,mid,more={})=>({id,project_id:pid,attachment_name:name,gmail_message_id:mid,...more});
const bundle=(emails=[],attachments=[])=>Object.fromEntries(Object.entries({emails,attachments,files:[],suppliers:[],clients:[]}).map(([k,rows])=>[k,{rows,error:null}]));
const data={project:{id:pid},context_facts:[]};
test('offer versions preserve sent proof, returned copies and supplier identity',()=>{
 const mails=[mail('aaa','arianit@prissteel.com','TenneT BUNT Angebot DAP','2026-09-14'),mail('bbb','laura@spie.com','AW TenneT BUNT Angebot DAP','2026-09-15'),mail('ccc','zoran@aktiva.com.mk','TenneT BUNT offer','2026-09-14'),mail('ddd','arianit@prissteel.com','TenneT BUNT Angebot DDP','2026-09-25',{has_attachments:true})];
 const a=[attachment(1,'PRISTEEL_Angebot_DAP.xlsx','aaa'),attachment(2,'PRISTEEL_Angebot_DAP.xlsx','bbb'),attachment(3,'AKTIVA Offer Rev 1 DAP DDP.pdf','ccc'),attachment(4,'PRISTEEL_Vorlage_Angebot.xlsx','ccc')];
 const model=D.operationalModel(data,bundle(mails,a));
 assert.equal(model.offers.length,3);assert.equal(model.offers.find(o=>o.title.endsWith('.xlsx')).mail.gmail_message_id,'aaa');
 assert.equal(model.offers[0].terms,'DDP');assert.equal(model.offers[0].metadata_missing,true);assert.equal(model.offers[0].amount,null);
 assert.equal(model.offers.find(o=>o.side==='supplier').state,'Pranuar nga Aktiva');assert.equal(model.files.filter(f=>f.title==='PRISTEEL_Angebot_DAP.xlsx').length,1);
});
test('foreign, ambiguous and automated messages cannot become business evidence',()=>{
 const emails=[mail('aaa','zoran@aktiva.com.mk','Offer','2026-09-14',{needs_review:true}),mail('bbb','zoran@aktiva.com.mk','Offer','2026-09-14',{project_id:'other'}),mail('ccc','laura@spie.com','Automatische Antwort: Muster')];
 const model=D.operationalModel(data,bundle(emails,[attachment(1,'AKTIVA Offer.pdf','aaa'),attachment(2,'AKTIVA Offer.pdf','bbb'),attachment(3,'AKTIVA Offer.pdf','ccc',{project_id:'other'})]));
 assert.equal(model.offers.length,0);assert.equal(model.timeline.length,0);
});
test('current sample request and approval are distinct from production or delivery confirmation',()=>{
 const m=[mail('aaa','laura@spie.com','TenneT BUNT Anfertigung 2 x','2026-10-02',{snippet:'Wir bitten Sie, zwei Muster bis ca. 12.10.2026 anzufertigen.'}),mail('bbb','laura@spie.com','AW: TenneT BUNT Anfertigung 2 x','2026-10-05',{snippet:'Das beschriebene Vorgehen ist für uns in Ordnung. So machen wir das!'})];
 const model=D.operationalModel(data,bundle(m));assert.equal(model.approval.gmail_message_id,'bbb');assert.equal(model.currentRequest.gmail_message_id,'aaa');assert(!('production_confirmed' in model));
 assert.equal(D.messageText({snippet:'Danke.\\n-----Ursprüngliche Nachricht-----\\nAlte Anfrage'}),'Danke.');
});
test('all new reads are bounded, scoped, cached GET requests',async()=>{
 const token='x.'+Buffer.from(JSON.stringify({ref:D.PROJECT_REF,role:'authenticated',exp:Date.now()/1000+3600})).toString('base64url')+'.x';
 globalThis.localStorage={getItem:k=>k==='pristeel_session'?JSON.stringify({access_token:token,expires_at:Date.now()+3600000}):null};
 D.invalidate();const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>[]};};
 await D.operational();await D.operational();assert.equal(calls.length,5);
 for(const c of calls){const u=new URL(c.url);assert.equal(c.options.method,'GET');assert.equal(u.searchParams.get('project_id'),'eq.'+pid);assert(Number(u.searchParams.get('limit'))<=160);assert(!u.searchParams.get('select').includes('extracted_text'));}
});
test('optional Gmail reads require an existing Google session and never request consent',()=>{globalThis.localStorage={getItem:()=>null};assert.equal(D.googleSession(),null);});
test('DDP workbook without Angebot in its filename remains an offer, distinct from terms',()=>{
 assert.equal(D.offerKind('PRISTEEL_TenneT_BUNT_DDP_FINAL_CORRECTED_25-09-2026.xlsx'),'offer');
 const b=bundle([mail('aaa','arianit@prissteel.com','TenneT BUNT Angebot DDP','2026-09-25',{has_attachments:true})],[attachment(1,'PRISTEEL_Angebotsbedingungen_DDP_FINAL.pdf','aaa')]);
 const m=D.operationalModel(data,b);assert.equal(m.offers.length,2);assert(m.offers.some(o=>o.kind==='offer'&&o.metadata_missing));
});
