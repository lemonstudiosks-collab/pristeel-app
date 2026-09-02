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
function projectScore(question:string,p:any){const n=N(question);let s=0;const vals=[p?.project,p?.name,p?.client,p?.ref,p?.business_ref].map(N).filter(Boolean);for(const x of vals){if(n.includes(x))s=Math.max(s,100+x.length);for(const w of x.split(' ')){if(w.length>=4&&n.includes(w))s=Math.max(s,20+w.length)}}return s}
function inferProject(question:string,items:any[]){const hits=items.map(p=>({p,s:projectScore(question,p)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s);if(!hits.length)return null;if(!hits[1]||hits[0].s>hits[1].s+4)return hits[0].p;return null}
function resolveHint(body:any,items:any[]){const id=T(body?.project_id||body?.context?.project?.id,80);if(id)return items.find(p=>T(p?.project_id||p?.id,80)===id)||{project_id:id};const name=N(body?.project_name||body?.context?.project?.name),ref=N(body?.project_ref||body?.context?.project?.ref||body?.context?.project?.business_ref);if(!name&&!ref)return null;const hits=items.filter(p=>(!name||N(p?.project||p?.name)===name)&&(!ref||N(p?.ref)===ref||N(p?.business_ref)===ref));return hits.length===1?hits[0]:null}
function outText(data:any){if(data?.output_text)return data.output_text;for(const o of data?.output||[])for(const p of o?.content||[])if(p?.type==='output_text'&&p?.text)return p.text;return''}
async function askOpenAI(question:string,live:any){
  const key=Deno.env.get('OPENAI_API_KEY');if(!key)return null;
  const model=Deno.env.get('OPENAI_ASSISTANT_MODEL')||Deno.env.get('OPENAI_CONTEXT_MODEL')||'gpt-5.6-luna';
  const schema={type:'object',additionalProperties:false,properties:{answer:{type:'string'},confidence:{type:'string',enum:['high','medium','low']},uncertainty:{type:'string'},suggested_next_step:{type:'string'},navigation:{type:'object',additionalProperties:false,properties:{project_id:{type:['string','null']},project_name:{type:['string','null']},area:{type:['string','null']}},required:['project_id','project_name','area']},evidence:{type:'array',items:{type:'object',additionalProperties:false,properties:{source:{type:'string'},reason:{type:'string'}},required:['source','reason']}}},required:['answer','confidence','uncertainty','suggested_next_step','navigation','evidence']};
  const instructions='You are PPPP, PRISTEEL procurement and project copilot. Use only supplied live data. Answer in the user language, default Albanian. For global questions, prioritize what requires action now, what is waiting for supplier/client, and what has strongest commercial momentum. momentum_score is a workflow-progress indicator, never a win probability. For project questions, state what happened, current state, what we are waiting for, and the concrete next action. Distinguish facts from suggestions. Never invent or claim human-gated actions. Never send email, approve a final price, submit a tender, commit a supplier, sign a contract, pay, or mark won/lost.';
  const payload=JSON.stringify(live).slice(0,60000);
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,store:false,reasoning:{effort:'low'},instructions,input:[{role:'user',content:[{type:'input_text',text:'QUESTION:\n'+question+'\n\nPPPP LIVE DATA:\n'+payload}]}],text:{format:{type:'json_schema',name:'pppp_answer',strict:true,schema}}})});
  const raw=await r.text();if(!r.ok)throw new Error('OpenAI '+r.status+': '+raw.slice(0,400));let data:any={};try{data=JSON.parse(raw)}catch{}const txt=outText(data);if(!txt)throw new Error('OpenAI returned no structured answer');return{...JSON.parse(txt),provider:{name:'openai',model:data?.model||model,response_id:data?.id||null},read_only:true};
}
function deterministicGlobal(items:any[]){
  if(!items.length)return{ok:true,answer:'Nuk ka projekte aktive në Command Center.',confidence:'high',uncertainty:'',suggested_next_step:'',navigation:{project_id:null,project_name:null,area:null},evidence:[],provider:{name:'pppp-command-center',model:'deterministic-v3'},read_only:true};
  const lines=['Prioritetet aktuale në PPPP:'];
  for(const [i,x] of items.slice(0,8).entries())lines.push(`${i+1}. ${T(x.project,180)} — ${T(x.work_lane,40)} — ${T(x.next_action,300)}`);
  return{ok:true,answer:lines.join('\n'),confidence:'high',uncertainty:'',suggested_next_step:T(items[0]?.next_action,500),navigation:{project_id:items[0]?.project_id||null,project_name:items[0]?.project||null,area:null},evidence:items.slice(0,5).map(x=>({source:'PPPP Command Center',reason:`${T(x.work_lane,40)} · attention ${Number(x.attention_score||0)} · momentum ${Number(x.momentum_score||0)}`})),provider:{name:'pppp-command-center',model:'deterministic-v3'},read_only:true};
}
function deterministicProject(item:any,brief:any){
  const p=brief?.project||{},tasks=Array.isArray(brief?.open_tasks)?brief.open_tasks:[],emails=Array.isArray(brief?.recent_emails)?brief.recent_emails:[],analysis=brief?.latest_analysis||null;
  const lane=T(item?.work_lane||p?.operational_state||'ACTIVE',60),next=T(item?.next_action||tasks[0]?.title||analysis?.recommendation?.label,600);
  const lines=[`${T(p?.name||item?.project||'Projekti',240)} — ${lane}.`];
  if(analysis?.executive_summary)lines.push(T(analysis.executive_summary,1200));
  else if(emails[0])lines.push(`Emaili i fundit: ${T(emails[0].subject,350)}.`);
  if(next)lines.push(`Hapi i ardhshëm: ${next}`);
  return{ok:true,answer:lines.join('\n'),confidence:'high',uncertainty:'',suggested_next_step:next,navigation:{project_id:p?.id||item?.project_id||null,project_name:p?.name||item?.project||null,area:lane==='EXECUTION'?'execution':null},evidence:[...(emails[0]?[{source:'Email i lidhur',reason:T(emails[0].subject,500)}]:[]),...(tasks[0]?[{source:'Task aktiv',reason:T(tasks[0].title,500)}]:[])],provider:{name:'pppp-project-brief',model:'deterministic-v3'},read_only:true};
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:H});
  if(req.method!=='POST')return J({ok:false,error:'method_not_allowed'},405);
  try{
    const auth=req.headers.get('Authorization')||'';if(!auth.toLowerCase().startsWith('bearer '))return J({ok:false,error:'unauthorized'},401);
    const base=Deno.env.get('SUPABASE_URL')||'',anon=Deno.env.get('SUPABASE_ANON_KEY')||'';if(!base||!anon)return J({ok:false,error:'supabase_environment_missing'},500);
    const body=await req.json().catch(()=>({})),question=T(body?.question,5000);if(!question)return J({ok:false,error:'question_required'},400);
    const headers=dbH(auth,anon);
    const command=asList(await rpc(base,'pppp_command_center_v1',headers,{p_limit:40}));
    let selected=resolveHint(body,command)||inferProject(question,command);
    const wantsProject=T(body?.scope,30)==='project'||!!selected||!!T(body?.project_id,80);
    let brief:any=null;
    if(wantsProject){
      const pid=T(selected?.project_id||selected?.id||body?.project_id||body?.context?.project?.id,80);
      if(!pid||!/^[0-9a-f-]{36}$/i.test(pid)){
        if(T(body?.scope,30)==='project')return J({ok:false,error:'project_identity_required',message:'Nuk e lidha dot pyetjen me një projekt unik.'},400);
      }else{
        brief=await rpc(base,'pppp_project_brief_v1',headers,{p_project_id:pid});
        if(!selected&&brief?.project)selected={project_id:pid,project:brief.project.name,client:brief.project.client,ref:brief.project.business_ref||brief.project.ref,work_lane:brief.project.operational_state||'ACTIVE'};
      }
    }
    const live=brief?{scope:'project',selected_project:selected,project_brief:brief,command_center:selected?command.filter(x=>x.project_id===selected.project_id):[],client_context:body?.context&&typeof body.context==='object'?body.context:null}:{scope:'global',command_center:command,client_context:body?.context&&typeof body.context==='object'?body.context:null};
    let ai=null;try{ai=await askOpenAI(question,live)}catch(e){console.warn('PPPP OpenAI provider failed, using compact fallback',String((e as any)?.message||e).slice(0,300))}
    if(ai)return J({ok:true,...ai});
    if(brief)return J(deterministicProject(selected,brief));
    return J(deterministicGlobal(command));
  }catch(e){console.error('pppp-openai-assistant',e);return J({ok:false,error:'assistant_failed',message:'PPPP nuk arriti të lexojë të dhënat live. Provo përsëri.'},500)}
});
