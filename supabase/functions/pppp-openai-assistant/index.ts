const H={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json'
};
const T=(v:any,n=5000)=>String(v??'').trim().slice(0,n);
const N=(v:any)=>T(v,1000).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9@._+\-]+/g,' ').replace(/\s+/g,' ').trim();
const J=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:H});
const dbH=(auth:string,key:string)=>({apikey:key,Authorization:auth,'Content-Type':'application/json'});
async function db(url:string,headers:any,init:RequestInit={}){const r=await fetch(url,{...init,headers:{...headers,...(init.headers||{})}});const raw=await r.text();if(!r.ok)throw new Error('DB '+r.status+': '+raw.slice(0,500));try{return raw?JSON.parse(raw):null}catch{return null}}
async function rpc(base:string,name:string,headers:any,body:any){return db(base+'/rest/v1/rpc/'+name,headers,{method:'POST',body:JSON.stringify(body||{})})}
function firstRpc(v:any){return Array.isArray(v)?(v[0]??null):v}
function arr(v:any){return Array.isArray(v)?v:[]}
function unique(xs:any[]){return [...new Set(xs.filter(Boolean).map(String))]}
function selectedFromResolver(res:any){
  const projects=arr(res?.projects).sort((a:any,b:any)=>Number(b?.score||0)-Number(a?.score||0));
  if(projects.length===1||(projects[0]&&Number(projects[0]?.score||0)>=Number(projects[1]?.score||0)+8))return projects[0];
  const contacts=arr(res?.project_contacts);const ids=unique(contacts.map((x:any)=>x?.project_id));
  if(ids.length===1){const c=contacts.find((x:any)=>String(x?.project_id)===ids[0]);return {id:ids[0],project_id:ids[0],name:c?.project_name,project:c?.project_name,client:c?.project_client,status:c?.project_status,pipeline_stage:c?.pipeline_stage,operational_state:c?.operational_state,resolved_via:'project_contact'};}
  return null;
}
function hintFromBody(body:any){const id=T(body?.project_id||body?.context?.project?.id,80);if(id&&/^[0-9a-f-]{36}$/i.test(id))return {id,project_id:id,name:T(body?.project_name||body?.context?.project?.name,240)||null,resolved_via:'explicit_project_context'};return null}
function compactEmail(e:any){return {sent_at:e?.sent_at,direction:e?.direction,from_email:e?.from_email,from_name:e?.from_name,to_emails:e?.to_emails,subject:T(e?.subject,400),snippet:T(e?.snippet,3600),has_attachments:!!e?.has_attachments,link_status:e?.link_status,match_method:e?.match_method,match_confidence:e?.match_confidence,needs_review:e?.needs_review,gmail_url:e?.gmail_url}}
function compactProjectContext(ctx:any,secondary=false){
  if(!ctx||typeof ctx!=='object')return ctx;const b=ctx?.brief||{},snap=ctx?.snapshot||{};
  return {
    project:ctx?.project,freshness:ctx?.freshness,
    recent_email_evidence:arr(ctx?.recent_email_evidence).slice(0,secondary?7:14).map(compactEmail),
    situation:ctx?.situation,
    brief:{project:b?.project,open_tasks:arr(b?.open_tasks).slice(0,secondary?6:10),recent_emails:arr(b?.recent_emails).slice(0,secondary?5:8).map(compactEmail),contacts:arr(b?.contacts).slice(0,secondary?8:15),supplier_offers:arr(b?.supplier_offers).slice(0,secondary?6:10),registered_client_offers:arr(b?.registered_client_offers).slice(0,secondary?6:10),sent_client_offer_emails:arr(b?.sent_client_offer_emails).slice(0,secondary?5:8),document_status:b?.document_status,latest_analysis:b?.latest_analysis},
    operator_actions:arr(snap?.operator_actions).slice(0,secondary?4:8),
    documents:arr(snap?.documents).slice(0,secondary?4:8),
    snapshot_excerpt:T(JSON.stringify(snap),secondary?5000:8000),generated_at:ctx?.generated_at,read_only:true
  };
}
function compactMatch(p:any){return {id:p?.id,name:p?.name,client:p?.client,ref:p?.ref,business_ref:p?.business_ref,status:p?.status,pipeline_stage:p?.pipeline_stage,operational_state:p?.operational_state,relevance_score:p?.relevance_score,evidence_count:p?.evidence_count,latest_evidence_at:p?.latest_evidence_at,evidence:arr(p?.evidence).slice(0,6)}}
function isTerminal(p:any){return ['humbur','arkivuar','mbyllur','realizuar','lost','closed','cancelled','canceled'].includes(N(p?.status))||N(p?.operational_state)==='closed'}
function chooseEvidenceCandidates(res:any){const ps=arr(res?.projects);if(!ps.length)return[];const top=ps[0],topScore=Number(top?.relevance_score||0),out=[top];for(const p of ps.slice(1)){if(out.length>=3)break;if(Number(p?.relevance_score||0)>=topScore-18)out.push(p)}if(isTerminal(top)){const active=ps.find((p:any)=>!isTerminal(p)&&Number(p?.relevance_score||0)>=100);if(active&&!out.some((x:any)=>String(x?.id)===String(active?.id))){if(out.length>=3)out[out.length-1]=active;else out.push(active)}}return out}
function looksGlobal(q:string){return /(cfare po ndodh ne pristeel|ku duhet te fokusohem|prioritetet|daily pristeel|briefing|control tower|sot ne pristeel|gjendja e pristeel)/.test(N(q))}
function outText(data:any){if(data?.output_text)return data.output_text;for(const o of data?.output||[])for(const p of o?.content||[])if(p?.type==='output_text'&&p?.text)return p.text;return''}
function isAutoReply(e:any){const s=N(e?.subject),x=N((e?.subject||'')+' '+(e?.snippet||'')),f=N(e?.from_email);return /(automatische antwort|automatic reply|auto reply|autoreply|out of office|abwesenheitsnotiz|vacation reply)/.test(s)||/(ich bin bis|ich bin vom|nicht im haus|ausser haus|außer haus|will be out of the office|i am out of the office|your message will not be forwarded)/.test(x)||/(mailer-daemon|postmaster)/.test(f)}
function isSystemNoise(e:any){const s=N(e?.subject),f=N(e?.from_email);return isAutoReply(e)||/(delivery status notification|undeliverable|mail delivery subsystem)/.test(s)||/(drive-shares-dm-noreply|no-reply|noreply)/.test(f)}
function meaningfulEmails(ctx:any){return arr(ctx?.recent_email_evidence).filter((e:any)=>!isSystemNoise(e))}
function fmtDate(v:any){const d=new Date(v||0);if(!Number.isFinite(d.getTime()))return T(v,24);return new Intl.DateTimeFormat('sq-AL',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
function moneyFromText(text:string){const x=String(text||'');const total=x.match(/(?:Gesamt|Total)\s*:?\s*(?:EUR\s*)?([0-9][0-9. ]*,[0-9]{2})/i);const lots:any[]=[];for(const label of ['Gelb','Rot','Blau','Grün','Grun']){const m=x.match(new RegExp('Los\\s+'+label+'\\s*:?\\s*(?:EUR\\s*)?([0-9][0-9. ]*,[0-9]{2})','i'));if(m)lots.push({label,value:m[1]})}return{total:total?.[1]||'',lots}}
function containsAny(v:any,patterns:RegExp[]){const x=String(v||'');return patterns.some(r=>r.test(x))}
async function askOpenAI(question:string,live:any){
  const key=Deno.env.get('OPENAI_API_KEY');if(!key)throw new Error('provider_key_missing');
  const model=Deno.env.get('OPENAI_ASSISTANT_MODEL')||Deno.env.get('OPENAI_CONTEXT_MODEL')||'gpt-5.6-luna';
  const schema={type:'object',additionalProperties:false,properties:{answer:{type:'string'},confidence:{type:'string',enum:['high','medium','low']},uncertainty:{type:'string'},suggested_next_step:{type:'string'},navigation:{type:'object',additionalProperties:false,properties:{project_id:{type:['string','null']},project_name:{type:['string','null']},area:{type:['string','null']}},required:['project_id','project_name','area']},evidence:{type:'array',items:{type:'object',additionalProperties:false,properties:{source:{type:'string'},reason:{type:'string'}},required:['source','reason']}}},required:['answer','confidence','uncertainty','suggested_next_step','navigation','evidence']};
  const instructions=`You are PPPP, PriSteel's read-only operating copilot. Use only supplied live PPPP data. Answer in the user's language, default Albanian. A project-related query must return a coherent operating analysis, never a teaser or raw database dump. Reconstruct chronology and explain what the evidence MEANS. Prefer newer substantive evidence over stale summaries or old workflow tasks. Automatic out-of-office replies are availability context only and NEVER a commercial event, client request, or reason to mark action_required. Suggested-linked email evidence is contextual only and must be labelled as such. Old technical/document-review backlog must not be presented as the project's main open issue unless current evidence makes it relevant. For a project answer cover: where we are now; latest meaningful developments; offers/scope/amounts; what the client is actually waiting for; genuine open issues/discrepancies; and the concrete next PriSteel action. Preserve human gates. Never send email, create tasks, select suppliers, approve final price/margin, sign contracts, pay, or decide won/lost.`;
  const payload=JSON.stringify(live).slice(0,60000);
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,store:false,reasoning:{effort:'low'},instructions,input:[{role:'user',content:[{type:'input_text',text:'QUESTION:\n'+question+'\n\nLIVE PRISTEEL / PPPP CONTEXT:\n'+payload}]}],text:{format:{type:'json_schema',name:'pppp_answer',strict:true,schema}}})});
  const raw=await r.text();if(!r.ok)throw new Error('provider_http_'+r.status);let data:any={};try{data=JSON.parse(raw)}catch{}const txt=outText(data);if(!txt)throw new Error('provider_empty_output');return{...JSON.parse(txt),provider:{name:'openai',model:data?.model||model,response_id:data?.id||null},read_only:true};
}
function projectFallback(contexts:any[],matches:any[],fallbackReason='provider_unavailable'){
  const all:string[]=[];let firstNext='';
  for(let i=0;i<contexts.length;i++){
    const ctx=contexts[i]?.context||{},m=matches[i]||{},p=ctx?.project||ctx?.brief?.project||{},s=ctx?.situation||{},b=ctx?.brief||{};
    const emails=meaningfulEmails(ctx);const autos=arr(ctx?.recent_email_evidence).filter((e:any)=>isAutoReply(e));
    const latestMeaningful=emails[0]||null;
    const sentOffers=emails.filter((e:any)=>N(e?.direction)==='outgoing'&&containsAny((e?.subject||'')+' '+(e?.snippet||''),[/angebot/i,/offer/i,/ponud/i]));
    const offer=sentOffers.find((e:any)=>containsAny(e?.snippet,[/Los Gelb/i,/Gesamt/i,/DAP/i]))||sentOffers[0]||null;
    const offerMoney=moneyFromText(offer?.snippet||'');
    const clientAck=emails.find((e:any)=>N(e?.direction)==='incoming'&&containsAny(e?.snippet,[/intern pr[üu]fen/i,/abschlie[ßs]ende bewertung/i,/vollst[aä]ndige?n? DDP/i,/waiting.*DDP/i,/danke.*angebot/i]));
    const ddpUpdate=emails.find((e:any)=>N(e?.direction)==='outgoing'&&containsAny((e?.subject||'')+' '+(e?.snippet||''),[/Zollcon/i,/Zoll- und Import/i,/DDP-Kostenstruktur/i,/customs/i,/import/i]));
    const statePolluted=autos.some((e:any)=>String(e?.sent_at||'')===String(p?.last_email_at||p?.operational_state_at||''))||autos.some((e:any)=>String(e?.sent_at||'')===String(ctx?.freshness?.canonical_last_email_at||''));
    const opActions=arr(ctx?.operator_actions);const installAction=opActions.find((x:any)=>containsAny((x?.title||'')+' '+(x?.detail||''),[/montazh/i,/montage/i,/installation/i]));
    const name=T(p?.name||m?.name||'Projekti',240);
    const lines:string[]=[];
    lines.push(`${name} — ku jemi tani`);
    if(offer){
      let offerLine=`Më ${fmtDate(offer.sent_at)}, PRISTEEL i ka dërguar palës tjetër ofertën e projektit`;
      if(/DAP/i.test(String(offer.snippet||'')))offerLine+=' mbi bazë DAP';
      if(/Gelb/i.test(String(offer.snippet||''))&&/Rot/i.test(String(offer.snippet||''))&&/Blau/i.test(String(offer.snippet||''))&&/(Grün|Grun)/i.test(String(offer.snippet||'')))offerLine+=' për të katër lotet Gelb, Rot, Blau dhe Grün';
      if(offerMoney.total)offerLine+=`, me total EUR ${offerMoney.total}`;
      offerLine+='.';lines.push(offerLine);
      if(offerMoney.lots.length>=2)lines.push('Ndarja e çmimit në evidencën e ofertës: '+offerMoney.lots.map((x:any)=>`Los ${x.label}: EUR ${x.value}`).join('; ')+'.');
      if(containsAny(offer.snippet,[/Montage und Entladung.*nicht Bestandteil/i,/installation.*not.*included/i]))lines.push('Montazhi dhe shkarkimi nuk janë përfshirë në ofertën DAP të dërguar.');
    }
    if(clientAck){
      let x=`SPIE e ka konfirmuar pranimin e ofertës më ${fmtDate(clientAck.sent_at)} dhe ka thënë se do ta shqyrtojë internisht.`;
      if(containsAny(clientAck.snippet,[/vollst[aä]ndige?n? DDP/i,/abschlie[ßs]ende bewertung/i]))x+=' Për vlerësimin përfundimtar, klienti pret ofertën e plotë DDP.';
      lines.push(x);
    }
    if(ddpUpdate&&String(ddpUpdate.sent_at||'')!==String(offer?.sent_at||'')){
      let x=`Zhvillimi më i fundit real është emaili dalës i ${fmtDate(ddpUpdate.sent_at)} për organizimin doganor/importin`;
      if(/Zollcon/i.test(String(ddpUpdate.snippet||'')))x+=' me Zollcon GmbH';
      x+='.';
      if(containsAny(ddpUpdate.snippet,[/finalen abstimmung/i,/operativen zust[aä]ndigkeiten/i,/DDP-Kostenstruktur/i]))x+=' Po finalizohen përgjegjësitë operative dhe struktura e kostos DDP.';
      if(ddpUpdate?.link_status==='suggested')x+=' Ky email është vetëm suggested-linked në PPPP, prandaj po përdoret si evidencë kontekstuale dhe jo si assignment kanonik.';
      lines.push(x);
    } else if(latestMeaningful){lines.push(`Komunikimi më i fundit me përmbajtje operative është “${T(latestMeaningful.subject,220)}” i ${fmtDate(latestMeaningful.sent_at)}.`)}
    if(autos.length){
      const people=unique(autos.map((e:any)=>T(e?.from_name||e?.from_email,100))).slice(0,3);
      lines.push(`Auto-replies e fundit${people.length?' nga '+people.join(' dhe '):''} janë vetëm informacion disponueshmërie; nuk i trajtoj si zhvillim komercial ose kërkesë të re.`);
    }
    if(statePolluted){lines.push(`Mospërputhje në PPPP: gjendja kanonike “${T(p?.operational_state||s?.situation_state||'pa gjendje',80)}” është freskuar nga auto-reply, ndaj timestamp-i i fundit nuk duhet përdorur si provë se klienti ka bërë kërkesë të re.`)}
    if(installAction){lines.push(`PPPP ka ende një veprim të hapur për montazh (“${T(installAction.title,180)}”), por evidenca më e fortë aktuale nga SPIE është pritja për DDP. Ky task duhet verifikuar si i vlefshëm dhe jo të merret automatikisht si prioriteti kryesor.`)}
    const actualNext=clientAck&&containsAny(clientAck.snippet,[/DDP/i])?'Finalizo strukturën dhe kostot DDP, verifiko scope-in e montazhit vetëm nëse mbetet realisht i hapur, dhe përgatit përgjigjen e radhës për SPIE për miratim njerëzor.':T(s?.recommendation?.label||'Rishiko evidencën më të fundit dhe përcakto hapin operacional.',500);
    lines.push(`Fokusi tani: ${actualNext}`);if(!firstNext)firstNext=actualNext;
    const oldWorkflow=arr(b?.open_tasks).filter((x:any)=>['document_bom_review','document_image_review'].includes(String(x?.source||''))).length;
    if(oldWorkflow)lines.push(`${oldWorkflow} task-e të vjetra teknike/dokumentesh ekzistojnë në backlog, por nuk po i paraqes si çështjet kryesore të projektit pa evidencë të re që i bën operative.`);
    all.push(lines.join('\n\n'));
  }
  const p=contexts[0]?.context?.project||{};
  return {ok:true,answer:all.join('\n\n---\n\n'),confidence:'medium',uncertainty:'Sintezë deterministic nga evidenca live sepse provider-i AI nuk dha përgjigje. Faktet suggested-linked mbeten kontekstuale.',suggested_next_step:firstNext,navigation:{project_id:p?.id||matches[0]?.id||null,project_name:p?.name||matches[0]?.name||null,area:null},evidence:arr(matches[0]?.evidence).slice(0,5).map((e:any)=>({source:T(e?.source_type||'PPPP',80),reason:T(e?.label||e?.excerpt,500)})),provider:{name:'pppp-rich-context',model:'deterministic-v6',fallback_reason:fallbackReason},read_only:true};
}
function globalFallback(command:any[],reason='provider_unavailable'){const items=arr(command);const lines=['Prioritetet aktuale në PPPP:'];for(const [i,x] of items.slice(0,8).entries())lines.push(`${i+1}. ${T(x.project,180)} — ${T(x.work_lane,50)} — ${T(x.next_action,280)}`);return{ok:true,answer:items.length?lines.join('\n'):'Nuk u gjetën prioritete aktive.',confidence:'medium',uncertainty:'Përgjigje fallback pa sintezë AI.',suggested_next_step:T(items[0]?.next_action,500),navigation:{project_id:items[0]?.project_id||null,project_name:items[0]?.project||null,area:null},evidence:[],provider:{name:'pppp-control-tower',model:'deterministic-v6',fallback_reason:reason},read_only:true}}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:H});if(req.method!=='POST')return J({ok:false,error:'method_not_allowed'},405);
  try{
    const auth=req.headers.get('Authorization')||'';if(!auth.toLowerCase().startsWith('bearer '))return J({ok:false,error:'unauthorized'},401);
    const base=Deno.env.get('SUPABASE_URL')||'',anon=Deno.env.get('SUPABASE_ANON_KEY')||'';if(!base||!anon)return J({ok:false,error:'supabase_environment_missing'},500);
    const body=await req.json().catch(()=>({})),question=T(body?.question,5000);if(!question)return J({ok:false,error:'question_required'},400);const headers=dbH(auth,anon);
    const explicit=hintFromBody(body);let identity:any={},identitySelected:any=null,evidenceResolver:any=null,matches:any[]=[];
    if(explicit)matches=[explicit];else{identity=firstRpc(await rpc(base,'pppp_assistant_identity_resolver_v1',headers,{p_query:question,p_limit:12}))||{};identitySelected=selectedFromResolver(identity);if(identitySelected)matches=[identitySelected];else{evidenceResolver=firstRpc(await rpc(base,'pppp_assistant_project_resolver_v2',headers,{p_query:question,p_limit:8}))||{};matches=chooseEvidenceCandidates(evidenceResolver)}}
    if(body?.scope==='project'&&!matches.length)return J({ok:false,error:'project_identity_required',message:'Nuk e lidha dot pyetjen me një projekt ose evidencë projekti.'},400);
    if(matches.length){
      const clean=matches.filter((m:any)=>/^[0-9a-f-]{36}$/i.test(T(m?.project_id||m?.id,80))).slice(0,3);
      const contexts=await Promise.all(clean.map(async(m:any,i:number)=>({match:compactMatch(m),context:compactProjectContext(firstRpc(await rpc(base,'pppp_assistant_project_context_v1',headers,{p_project_id:T(m?.project_id||m?.id,80)})),i>0)})));
      const live={scope:contexts.length>1?'multi_project':'project',identity_resolution:identity,evidence_resolution:evidenceResolver?{query:evidenceResolver?.query,meaningful_tokens:evidenceResolver?.meaningful_tokens,projects:arr(evidenceResolver?.projects).slice(0,5).map(compactMatch)}:null,matched_projects:contexts,policy:{read_only:true,suggested_email_evidence_is_context_only:true,automatic_replies_are_availability_only:true,old_workflow_tasks_do_not_drive_current_priority:true,human_gates_preserved:true,do_not_guess_between_projects:true}};
      let ai:any=null,reason='provider_unavailable';try{ai=await askOpenAI(question,live)}catch(e){reason=T((e as any)?.message||e,120);console.warn('PPPP OpenAI rich provider failed',reason)}
      if(ai)return J({ok:true,...ai,analysis_mode:contexts.length>1?'multi_project_full':'project_full',matched_project_count:contexts.length});
      return J(projectFallback(contexts.map((x:any)=>({context:x.context})),contexts.map((x:any)=>x.match),reason));
    }
    const command=arr(await rpc(base,'pppp_command_center_v1',headers,{p_limit:40}));const entity=firstRpc(await rpc(base,'pppp_chatgpt_entity_intelligence_v3',headers,{p_query:question,p_limit:20}));const tower=looksGlobal(question)?firstRpc(await rpc(base,'pppp_chatgpt_control_tower_v2',headers,{p_hours:24,p_days:30,p_limit:10})):null;
    const live={scope:looksGlobal(question)?'global':'entity',identity_resolution:identity,evidence_resolution:evidenceResolver,entity_intelligence:entity,control_tower:tower,command_center:command.slice(0,15),policy:{read_only:true,human_gates_preserved:true}};
    let ai:any=null,reason='provider_unavailable';try{ai=await askOpenAI(question,live)}catch(e){reason=T((e as any)?.message||e,120);console.warn('PPPP OpenAI entity/global provider failed',reason)}
    if(ai)return J({ok:true,...ai,analysis_mode:looksGlobal(question)?'global':'entity'});return J(globalFallback(command,reason));
  }catch(e){console.error('pppp-openai-assistant',e);return J({ok:false,error:'assistant_failed',message:'PPPP nuk arriti të lexojë kontekstin live. Provo përsëri.',detail:T((e as any)?.message||e,700)},500)}
});