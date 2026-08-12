const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const refCode=fs.readFileSync('pristeel-project-reference-v1.js','utf8');
  const guardCode=fs.readFileSync('pristeel-project-create-dedupe-guard-v1.js','utf8');
  const integrityCode=fs.readFileSync('pristeel-project-data-integrity-v1.js','utf8');
  const dupCode=fs.readFileSync('pristeel-project-duplicate-manager-v1.js','utf8');
  const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><body><div><label>Referenca</label><input id="i-ref"></div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const calls=[];
  w.supaFetch=async(path,method,body)=>{
    calls.push({path,method,body});
    if(String(path).startsWith('projects?select=id,business_ref'))return[{id:'p1',business_ref:'D-23/26'}];
    if(method==='POST'||method==='PATCH')return[Object.assign({id:'new1'},body)];
    if(String(path).startsWith('projects?select=id,name,client,ref,business_ref'))return[];
    return[];
  };
  w.confirm=()=>true;w.prompt=()=>'';

  w.eval(refCode);
  const R=w.PSTProjectReferenceV1;
  assert(R,'Project reference module must install');
  assert.strictEqual(R.clean('D-23/26 / 56,661 kg / EUR 133,155'),'D-23/26');
  assert.strictEqual(R.clean('PST-GEI-001/26 · Zeichnung KW46/2026-KW11/2027 + 3.2.20'),'PST-GEI-001/26');
  assert.strictEqual(R.clean(' Projekt-/Auftragsnummer: 25007HH'),'25007HH');
  assert.strictEqual(R.clean('Projekt 411320-KR | 81t | Preis 1.85 EUR/kg'),'411320-KR');
  assert.strictEqual(R.clean('PST-HH-001 / EUR 128,295'),'PST-HH-001');
  assert.strictEqual(R.clean('MARKO JOVANOVIC'),'','A contact name must not be invented as canonical reference');
  assert.strictEqual(R.clean('referenzen'),'','Generic reference text must stay unresolved');
  assert.strictEqual(R.clean('PROJEKT TENNET'),'','Generic project text without a stable code must stay unresolved');
  assert.strictEqual(R.clean('PNR High Rise Single Column MID 16m'),'','A descriptive model name with a dimension must not become a strong reference');
  assert.strictEqual(R.canonical({ref:'referenzen'}),'','Unsafe legacy ref must not fall back into canonical identity');
  assert.strictEqual(R.canonical({ref:'MARKO JOVANOVIC'}),'','Contact-name legacy ref must not become canonical identity');
  assert.strictEqual(R.canonical({business_ref:'D-23/26',ref:'D-23/26 / 56,661 kg / EUR 133,155'}),'D-23/26','business_ref must win over legacy ref');

  const raw=w.supaFetch;
  await w.supaFetch('projects','POST',{name:'STACON D-23',client:'STACON',ref:'D-23/26 / 56,661 kg / EUR 133,155'});
  const write=calls.find(x=>x.method==='POST');
  assert(write,'Project write must pass through canonical reference layer');
  assert.strictEqual(write.body.ref,'D-23/26 / 56,661 kg / EUR 133,155','Legacy ref must remain untouched');
  assert.strictEqual(write.body.business_ref,'D-23/26','Canonical business_ref must be added separately');
  assert(/Referenca \/ kodi/.test(w.document.querySelector('label').textContent),'Project form must clarify the reference field');
  assert(w.document.querySelector('[data-pst-ref-hint]'),'Project form must explain what belongs in the reference field');
  R.install();
  assert.strictEqual(w.supaFetch,raw,'Reinstall must not double-wrap project writes');

  w.PSTEmail={profiles:async()=>[
    {p:{id:'p1',name:'STACON D-23',client:'STACON',ref:'D-23/26 / 56,661 kg / EUR 133,155'},refs:['d-23/26 / 56,661 kg / eur 133,155'],names:[],tokens:[],emails:[]},
    {p:{id:'p2',name:'BILFINGER',client:'Bilfinger',ref:'referenzen'},refs:['referenzen'],names:[],tokens:[],emails:[]},
    {p:{id:'p3',name:'Mega Totem',client:'ITALIAN STYLE',ref:'PNR High Rise Single Column MID 16m'},refs:['pnr high rise single column mid 16m'],names:[],tokens:[],emails:[]}
  ]};
  assert(R.wrapEmailProfiles(),'Email profiles must become business_ref-aware');
  const profiles=await w.PSTEmail.profiles();
  assert.strictEqual(profiles[0].p.business_ref,'D-23/26');
  assert.strictEqual(profiles[0].refs[0],'d-23/26','Canonical reference must be the strongest Gmail reference token');
  assert.strictEqual(profiles[0].refs.includes('d-23/26 / 56,661 kg / eur 133,155'),false,'Dirty legacy ref must be removed when canonical ref exists');
  assert.deepStrictEqual(Array.from(profiles[1].refs),[],'Generic Bilfinger “referenzen” must not be a Gmail reference signal');
  assert.deepStrictEqual(Array.from(profiles[2].refs),[],'Descriptive PNR model text must not be a Gmail reference signal');
  const profileFn=w.PSTEmail.profiles;R.wrapEmailProfiles();assert.strictEqual(w.PSTEmail.profiles,profileFn,'Email profile wrapper must be idempotent');

  w.eval(guardCode);
  const G=w.PSTProjectCreateDedupeGuard;
  const a={name:'STACON D-23',client:'STACON',business_ref:'D-23/26',ref:'legacy A'};
  const b={name:'STACON D-23',client:'STACON',ref:'D-23/26 / 56,661 kg / EUR 133,155'};
  assert.strictEqual(G.keyProject(a),G.keyProject(b),'Create guard must dedupe on canonical identity even when legacy refs differ');

  w.eval(integrityCode);
  const score=w.PSTProjectDataIntegrity.relationScore({subject:'Re: D-23/26 Angebot'},{id:'p1',name:'STACON D-23/26',client:'STACON',business_ref:'D-23/26',ref:'D-23/26 / 56,661 kg / EUR 133,155'});
  assert(score>=260,'Integrity matching must strongly recognize canonical business_ref');
  const unsafeScore=w.PSTProjectDataIntegrity.relationScore({subject:'Bitte senden Sie Referenzen'},{id:'p2',name:'BILFINGER',client:'Bilfinger',ref:'referenzen'});
  assert(unsafeScore<260,'Unsafe free-text legacy ref must not receive canonical-reference weight');

  w.eval(dupCode);
  assert.strictEqual(w.PSTProjectDuplicateManager.keyProject(a),w.PSTProjectDuplicateManager.keyProject(b),'Duplicate Manager must use the same canonical project key');

  assert(bootstrap.includes("pristeel-project-reference-v1.js?v=20260812-3"),'Bootstrap must load the latest canonical reference layer early');
  assert(bootstrap.indexOf('pristeel-project-reference-v1.js')<bootstrap.indexOf('pristeel-project-create-dedupe-guard-v1.js'),'Reference layer must load before create dedupe guard');
  assert(bootstrap.includes("pristeel-project-data-integrity-v1.js?v=20260812-businessref1"),'Integrity module must be cache-busted');
  assert(bootstrap.includes("pristeel-project-duplicate-manager-v1.js?v=20260812-businessref1"),'Duplicate manager must be cache-busted');

  dom.window.close();
  console.log('Project canonical reference smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});