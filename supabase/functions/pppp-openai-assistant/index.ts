const H={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json'
};
const T=(v:any,n=5000)=>String(v??'').trim().slice(0,n);
const N=(v:any)=>T(v,1000).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const J=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const dbH=(auth:string,key:string)=>({apikey:key,Authorization:auth,'Content-Type':'application/json'});
async function db(url:string,headers:any,init:RequestInit={}){const r=await fetch(url,{...init,headers:{...headers,...(init.headers||{})}});const raw=await r.text();if(!r.ok)throw new Error('DB '+r.status+': '+raw.slice(0,300));try{return raw?JSON.parse(raw):null}catch{return null}}
async function rpc(base:string,name:string,headers:any,body:any){return db(base+'/rest/v1/rpc/'+name,headers,{method:'POST',body:JSON.stringify(body||{})})}
function asList(v:any){if(Array.isArray(v))return v;if(v&&Array.isArray(v.data))return v.data;return[]}
function projectScore(question:string,p:any){const n=N(question),words=new Set(n.split(' ').filter(Boolean));let s=0;const stop=new Set(['projekt','projekti','project','tender','ofert','oferta','client','klient','gmbh','shpk','bau']);const vals=[p?.project,p?.name,p?.client,p?.ref,p?.business_ref].map(x=>N(x)).filter(Boolean);for(const x of vals){if(n.includes(x))s=Math.max(s,100+x.length);for(const w of x.split(' ')){if(w.length>=3&&!stop.has(w)&&words.has(w))s=Math.max(s,20+w.length)}}return s}
function inferProject(question:string,items:any[]){const hits=items.map(p=>({p,s:projectScore(question,p)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);if(!hits.length)return null;if(!hits[1]||hits[0].s>hits[1].s+4)return hits[0].p;return null}
function resolveHint(body:any,items:any[]){const id=T(body?.project_id||body?.context?.project?.id,80);if(id)return items.find(p=>T(p?.project_id||p?.id,80)===id)||{project_id:id};const name=N(body?.project_name||body?.context?.project?.name),ref=N(body?.project_ref||body?.context?.project?.ref||body?.context?.project?.business_ref);if(!name&&!ref)return null;const hits=items.filter(p=>(!name||N(p?.project||p?.name)===name)&&(!ref||N(p?.ref)===ref||N(p?.business_ref)===ref));return hits.length===1?hits[0]:null}
function deterministicGlobal(items:any[]){
  if(!items.length)return{ok:true,answer:'Nuk ka projekte aktive në Command Center.',confidence:'high',uncertainty:'',suggested_next_step:'',navigation:{project_id:null,project_name:null,area:null},evidence:[],provider:{name:'pppp-command-center',model:'deterministic-v3'},read_only:true};
  const lines=['Prioritetet aktuale në PPPP:'];
  for(const [i,x] of items.slice(0,8).entries())lines.push(`${i+1}. ${T(x.project,180)} — ${T(x.work_lane,40)} — ${T(x.next_action,300)}`);
  return{ok:true,answer:lines.join('\n'),confidence:'high',uncertainty:'',suggested_next_step:T(items[0]?.next_action,500),navigation:{project_id:items[0]?.project_id||null,project_name:items[0]?.project||null,area:null},evidence:items.slice(0,5).map(x=>({source:'PPPP Command Center',reason:`${T(x.work_lane,40)} · attention ${Number(x.attention_score||0)} · momentum ${Number(x.momentum_score||0)}`})),provider:{name:'pppp-command-center',model:'deterministic-v3'},read_only:true};
}
function deterministicProject(question:string,item:any,brief:any){
  const p=brief?.project||{},tasks=Array.isArray(brief?.open_tasks)?brief.open_tasks:[],emails=Array.isArray(brief?.recent_emails)?brief.recent_emails:[],analysis=brief?.latest_analysis||null;
  const lane=T(item?.work_lane||p?.operational_state||'ACTIVE',60),next=T(item?.next_action||tasks[0]?.title||analysis?.recommendation?.label,600);
  const q=N(question),nav={project_id:p?.id||item?.project_id||null,project_name:p?.name||item?.project||null,area:null};
  if(/\b(bleres|bleresi|buyer|kontakt|contact|ansprechpartner)\b/.test(q)){
    const contacts=Array.isArray(brief?.contacts)?brief.contacts:[];
    if(!contacts.length)return{ok:true,answer:`${T(p?.name||item?.project||'Projekti',240)} nuk ka ende blerës ose kontakt të verifikuar në regjistrin e projektit.`,confidence:'high',uncertainty:'Kontakti mund të ekzistojë vetëm brenda një dokumenti ende të paanalizuar.',suggested_next_step:'Kontrollo emailin ose dokumentin burim dhe regjistro kontaktin e verifikuar.',navigation:nav,evidence:[],provider:{name:'pppp-project-brief',model:'deterministic-v4'},read_only:true};
    const lines=contacts.slice(0,8).map((c:any,i:number)=>`${i+1}. ${T(c.name||c.email||'Kontakt',160)}${c.role?' — '+T(c.role,120):''}${c.company?' · '+T(c.company,160):''}${c.email?' · '+T(c.email,180):''}`);
    return{ok:true,answer:`Kontaktet e lidhura me ${T(p?.name||item?.project,240)}:\n${lines.join('\n')}`,confidence:'high',uncertainty:'Roli “blerës” jepet vetëm kur është regjistruar në PPPP.',suggested_next_step:'Hap projektin te Komunikimi për emailin dhe historikun e kontaktit.',navigation:{...nav,area:'communication'},evidence:contacts.slice(0,5).map((c:any)=>({source:'Regjistri i kontakteve',reason:T([c.name,c.role,c.company,c.email].filter(Boolean).join(' · '),500)})),provider:{name:'pppp-project-brief',model:'deterministic-v4'},read_only:true};
  }
  if(/\b(ofert[a-z]*|angebot[a-z]*|quotation[a-z]*|offer[a-z]*|ponud[a-z]*)\b/.test(q)){
    const ours=Array.isArray(brief?.registered_client_offers)?brief.registered_client_offers:[],sent=Array.isArray(brief?.sent_client_offer_emails)?brief.sent_client_offer_emails:[],supplier=Array.isArray(brief?.supplier_offers)?brief.supplier_offers:[];
    const lines=[] as string[];
    for(const o of ours.slice(0,6))lines.push(`Oferta jonë ${T(o.doc_nr||'pa numër',180)} — ${o.total_amount!=null?Number(o.total_amount).toLocaleString('de-DE')+' '+T(o.currency||'EUR',10):'vlera nuk është regjistruar'} — ${T(o.followup_status||'status i paregjistruar',80)}.`);
    for(const m of sent.slice(0,6)){const names=(Array.isArray(m.attachments)?m.attachments:[]).map((a:any)=>T(a.name,220)).filter(Boolean);lines.push(`Email i dërguar më ${T(m.sent_at,40)}: ${T(m.subject,280)}${names.length?' — '+names.join(', '):''}.`)}
    if(!lines.length)lines.push('Nuk ka ofertë tonën të regjistruar ose email oferte të lidhur me këtë projekt.');
    if(supplier.length)lines.push(`Oferta furnitori të regjistruara: ${supplier.length}.`);
    return{ok:true,answer:lines.join('\n'),confidence:'high',uncertainty:ours.length?'':'PDF-të e dërguara janë provë e dërgimit; vlerat financiare nuk po hamendësohen pa dokument të strukturuar.',suggested_next_step:sent.length?'Hap projektin te Komerciale për ofertat dhe emailin burim.':'Regjistro ose lidhe ofertën e klientit me projektin.',navigation:{...nav,area:'commercial'},evidence:[...ours.slice(0,3).map((o:any)=>({source:'Regjistri i ofertave tona',reason:T(o.doc_nr,300)})),...sent.slice(0,3).map((m:any)=>({source:'Email i dërguar',reason:T(m.subject,500)}))],provider:{name:'pppp-project-brief',model:'deterministic-v4'},read_only:true};
  }
  if(/\b(dokument|dosje|file|attachment|bashkengjit)\b/.test(q)){
    const ds=brief?.document_status||{};
    return{ok:true,answer:`Dokumentet e lidhura: ${Number(ds.linked_attachments||0)}. Të analizuara: ${Number(ds.analyzed_attachments||0)}. Në pritje të analizës: ${Number(ds.pending_attachments||0)}.`,confidence:'high',uncertainty:'',suggested_next_step:Number(ds.pending_attachments||0)>0?'Përfundo analizën e dokumenteve në pritje.':'Hap skedarët e projektit.',navigation:{...nav,area:'files'},evidence:[{source:'Regjistri i bashkëngjitjeve',reason:`${Number(ds.linked_attachments||0)} skedarë të lidhur me projektin`}],provider:{name:'pppp-project-brief',model:'deterministic-v4'},read_only:true};
  }
  const lines=[`${T(p?.name||item?.project||'Projekti',240)} — ${lane}.`];
  if(analysis?.executive_summary)lines.push(T(analysis.executive_summary,1200));
  else if(emails[0])lines.push(`Emaili i fundit: ${T(emails[0].subject,350)}.`);
  if(next)lines.push(`Hapi i ardhshëm: ${next}`);
  return{ok:true,answer:lines.join('\n'),confidence:'high',uncertainty:'',suggested_next_step:next,navigation:{...nav,area:lane==='EXECUTION'?'execution':null},evidence:[...(emails[0]?[{source:'Email i lidhur',reason:T(emails[0].subject,500)}]:[]),...(tasks[0]?[{source:'Task aktiv',reason:T(tasks[0].title,500)}]:[])],provider:{name:'pppp-project-brief',model:'deterministic-v4'},read_only:true};
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:H});
  if(req.method!=='POST')return J({ok:false,error:'method_not_allowed'},405);
  try{
    const auth=req.headers.get('Authorization')||'';if(!auth.toLowerCase().startsWith('bearer '))return J({ok:false,error:'unauthorized'},401);
    const base=Deno.env.get('SUPABASE_URL')||'',anon=Deno.env.get('SUPABASE_ANON_KEY')||'';if(!base||!anon)return J({ok:false,error:'supabase_environment_missing'},500);
    const body=await req.json().catch(()=>({})),question=T(body?.question,5000);if(!question)return J({ok:false,error:'question_required'},400);
    const headers=dbH(auth,anon);
    const [commandRaw,projectsRaw]=await Promise.all([
      rpc(base,'pppp_command_center_v1',headers,{p_limit:40}),
      db(base+'/rest/v1/projects?select=id,name,client,ref,business_ref,status,pipeline_stage,operational_state,last_activity_at,updated_at&order=last_activity_at.desc.nullslast&limit=50',headers)
    ]);
    const command=asList(commandRaw),projects=asList(projectsRaw);
    let selected=resolveHint(body,projects)||inferProject(question,projects);
    const wantsProject=T(body?.scope,30)==='project'||!!selected||!!T(body?.project_id,80);
    let brief:any=null;
    if(wantsProject){
      const pid=T(selected?.project_id||selected?.id||body?.project_id||body?.context?.project?.id,80);
      if(!pid||!/^[0-9a-f-]{36}$/i.test(pid)){
        if(T(body?.scope,30)==='project')return J({ok:false,error:'project_identity_required',message:'Nuk e lidha dot pyetjen me një projekt unik.'},400);
      }else{
        brief=await rpc(base,'pppp_project_brief_v1',headers,{p_project_id:pid});
        if(!selected&&brief?.project)selected={id:pid,name:brief.project.name,client:brief.project.client,ref:brief.project.business_ref||brief.project.ref,operational_state:brief.project.operational_state||'ACTIVE'};
      }
    }
    if(brief)return J(deterministicProject(question,selected,brief));
    return J(deterministicGlobal(command));
  }catch(e){console.error('pppp-openai-assistant',e);return J({ok:false,error:'assistant_failed',message:'PPPP nuk arriti të lexojë të dhënat live. Provo përsëri.'},500)}
});
