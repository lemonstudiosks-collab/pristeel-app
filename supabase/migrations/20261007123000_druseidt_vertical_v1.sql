-- Druseidt vertical over existing PPPP procurement; no tender crawler or target creation.
create table public.pppp_druseidt_leads_v1 (
 id uuid primary key default gen_random_uuid(),
 target_id uuid not null references public.pppp_representation_targets_v1(id),
 source_key text not null unique,
 tender_watch_id uuid references public.kek_tender_watch(id),
 company_profile_id uuid references public.pppp_opportunity_company_profiles_v1(id),
 kind text not null check(kind in ('active','award','direct')),
 country text not null check(country in ('XK','AL')),
 fingerprint text not null,
 context jsonb not null default '{}',
 analysis jsonb not null default '{}',
 pipeline text not null default 'DISCOVERED' check(pipeline in ('DISCOVERED','VERIFIED','CONTACT FOUND','DRAFT READY','CONTACTED','REPLIED','RFQ RECEIVED','REQUEST TO DRUSEIDT READY','DRUSEIDT QUOTING','OFFER RECEIVED','PRISTEEL OFFER READY','OFFERED','FOLLOW-UP','WON','LOST','ARCHIVED')),
 communications jsonb not null default '{}',
 rfq jsonb not null default '{}',
 history jsonb not null default '[]',
 analyzed_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.pppp_druseidt_leads_v1 enable row level security;
create policy druseidt_read on public.pppp_druseidt_leads_v1 for select to authenticated using (public.current_role() is not null);
revoke all on public.pppp_druseidt_leads_v1 from public,anon,authenticated;
grant select on public.pppp_druseidt_leads_v1 to authenticated;
grant all on public.pppp_druseidt_leads_v1 to service_role;
create index druseidt_tender_idx on public.pppp_druseidt_leads_v1(tender_watch_id);

create function public.pppp_druseidt_match_v1(p_text text,p_url text,p_direct boolean default false)
returns jsonb language plpgsql immutable security invoker set search_path=pg_catalog,public as $fn$
declare txt text:=lower(coalesce(p_text,'')); rule jsonb; hits jsonb:='[]'; cats jsonb:='[]'; label text; rx text; quote text; lev text:='LOW';
begin
 for rule in select value from jsonb_array_elements('[
  {"label":"Copper/aluminium busbars and fabricated components","rx":"copper busbar|cu busbar|aluminium busbar|aluminum busbar|cu-etp|stromschien|sammelschienen|fabricated copper|custom copper|tinned copper|zbarra bakri|zbar[aë] bakri|shina.{0,20}bakri|shina.{0,20}alumin","catalogue":4,"strong":true},
  {"label":"Flexible high-current connections","rx":"flexible.{0,30}(connection|connector|busbar)|laminated copper|transformer.{0,20}(connection|connector)|high.current.{0,20}(cable|connector)|stromb[aä]nd|dehnungsb[aä]nd|lidhje fleksib","catalogue":2,"strong":true},
  {"label":"Busbar systems, supports and accessories","rx":"busbar|bus.bar support|isoli(er)?st[uü]tzer|pe[ /-]+n bar|pe bar|n bar|high.current distribution|lv high.current|sammelschienenhalter","catalogue":4,"strong":false},
  {"label":"Cable terminals and electrical connection components","rx":"cable lug|cable terminal|kabelschuh|cable connection component|electrical connection component","catalogue":1,"strong":false},
  {"label":"Anodising/electroplating contact systems","rx":"anodis|electroplating|eloxal|galvanotechnik","catalogue":3,"strong":false}
 ]'::jsonb) loop
  rx:=rule->>'rx';label:=rule->>'label';
  if txt ~ rx then
   select substring(p_text from greatest(1,m.pos-70) for 240) into quote from (select strpos(txt,(regexp_match(txt,rx))[1]) pos)m;
   hits:=hits||jsonb_build_array(jsonb_build_object('product',label,'excerpt',quote,'source_url',p_url,'evidence_type',case when p_direct then 'published_company_activity' else 'official_scope' end));
   if not cats @> jsonb_build_array((rule->>'catalogue')::int) then cats:=cats||jsonb_build_array((rule->>'catalogue')::int);end if;
   if (rule->>'strong')::boolean then lev:='HIGH';elsif lev='LOW' then lev:='MEDIUM';end if;
  end if;
 end loop;
 -- A published panel manufacturing activity is a direct-customer hypothesis, never a tender specification.
 if p_direct and hits='[]' and txt ~ '(assembly of electrical panels|electrical panel production|manufactur.{0,30}(panel|switchboard)|prodhim.{0,20}panel)' then
  lev:='MEDIUM';cats:='[4]';hits:=jsonb_build_array(jsonb_build_object('product','Electrical panel manufacturing','excerpt',left(p_text,600),'source_url',p_url,'evidence_type','published_company_activity'));
 end if;
 if hits='[]' and txt ~ '(substation|transformer|nënstacion|nenstacion|switchgear)' then lev:='REVIEW';end if;
 return jsonb_build_object('relevance',lev,'confirmed',hits,'catalogues',cats,'why',case when lev in ('HIGH','MEDIUM') then case when p_direct then 'Published company activity matches Druseidt component families; an open component package and exact specifications remain to be confirmed.' else 'Official scope contains concrete Druseidt product signals. Verify application, material and rating before quotation.' end when lev='REVIEW' then 'General electrical scope only; concrete Druseidt components are not evidenced.' else 'No concrete Druseidt product evidence.' end,'missing',jsonb_build_array('drawings','dimensions','current rating','quantities','material grade','surface treatment','standards','delivery requirements'),'custom_made',jsonb_build_object('verified',true,'source_url','https://druseidt.de/pdf/K_04_DE.pdf','pages','7–10','capability','Copper/aluminium components and busbar systems manufactured according to drawings, dimensions and project requirements.'),'rule_version','druseidt-rules-v1');
end $fn$;

create function public.pppp_druseidt_refresh_v1()
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $fn$
declare target uuid; r record; ctx jsonb; txt text; fp text; a jsonb; changed int:=0; scanned int:=0; k text; c text; winner jsonb; closed boolean;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('pppp-druseidt-refresh',0)) then return '{"ok":true,"busy":true}';end if;
 select id into strict target from public.pppp_representation_targets_v1 where company_domain_normalized='druseidt.de' and archived_at is null;
 for r in select t.*,d.fingerprint dossier_fp from public.kek_tender_watch t left join lateral (select fingerprint from public.pppp_tender_dossier_versions where tender_watch_id=t.id order by analyzed_at desc limit 1)d on true
 where (t.payload->>'country' in ('XK','XKX','AL','ALB') or t.payload->>'source' in ('KRPP','APP_AL')) and (t.published_date>=current_date-45 or exists(select 1 from public.pppp_druseidt_leads_v1 l where l.tender_watch_id=t.id)) loop
  scanned:=scanned+1;c:=case when r.payload->>'country' in ('AL','ALB') or r.payload->>'source'='APP_AL' then 'AL' else 'XK' end;
  k:=case when r.payload->>'notice_phase'='award' or r.document_type ~* '(award|B08|B52)' then 'award' else 'active' end;
  closed:=r.status in ('cancelled','canceled','no_bid','rejected','archived') or r.document_type ~* '(cancel|B10)' or (k='active' and (r.deadline is null or r.deadline<current_date));
  -- Only official raw descriptions / already saved notice text. Never match AI summaries or market keywords in routing metadata.
  txt:=concat_ws(E'\n',r.title,r.payload->>'description',r.payload->>'full_description',r.payload->>'technical_description',r.payload->'dossier_saved'->>'detail_text');
  winner:=case jsonb_typeof(r.payload->'winner') when 'object' then r.payload->'winner' when 'string' then jsonb_build_object('name',r.payload->>'winner') else '{}'::jsonb end;
  ctx:=jsonb_build_object('title',r.title,'authority',r.authority,'reference',r.procurement_no,'deadline',r.deadline,'published_date',r.published_date,'award_date',coalesce(r.payload->>'award_date',r.payload->'ted_details'->>'award_date',winner->>'decision_date'),'winner',winner,'jv',coalesce(r.payload->'consortium',r.payload->'jv','null'),'contract_value',case when k='award' then r.payload->'ted_details'->'value_amount' else null end,'currency',r.currency,'source',r.payload->>'source','source_url',coalesce(r.detail_url,r.source_url),'project_id',r.project_id,'scope',left(txt,16000),'closed',closed,'procurement_stage','UNCONFIRMED — ask whether component procurement is still open','bidder_evidence',coalesce(r.payload->'verified_bidders','[]'),'documents',coalesce(r.payload->'dossier_saved'->'documents','[]'),'dossier_complete',coalesce((r.payload->'dossier_saved'->>'dossier_complete')::boolean,false));
  fp:=md5(jsonb_build_array(ctx,r.dossier_fp,'druseidt-rules-v1')::text);
  if exists(select 1 from public.pppp_druseidt_leads_v1 where source_key='tender:'||r.id and fingerprint=fp) then continue;end if;
  a:=public.pppp_druseidt_match_v1(txt,ctx->>'source_url');
  if closed then a:=a||'{"eligible":false}';else a:=a||jsonb_build_object('eligible',a->>'relevance' in ('HIGH','MEDIUM'));end if;
  insert into public.pppp_druseidt_leads_v1(target_id,source_key,tender_watch_id,kind,country,fingerprint,context,analysis) values(target,'tender:'||r.id,r.id,k,c,fp,ctx,a)
  on conflict(source_key) do update set kind=excluded.kind,country=excluded.country,fingerprint=excluded.fingerprint,context=excluded.context,analysis=excluded.analysis,analyzed_at=now(),updated_at=now();changed:=changed+1;
 end loop;
 return jsonb_build_object('ok',true,'scanned',scanned,'changed',changed,'backfill_days',45,'target_id',target,'external_email_sent',false,'tenders_created',0);
end $fn$;
revoke all on function public.pppp_druseidt_refresh_v1() from public,anon,authenticated;
grant execute on function public.pppp_druseidt_refresh_v1() to service_role;
revoke all on function public.pppp_druseidt_match_v1(text,text,boolean) from public,anon,authenticated;
grant execute on function public.pppp_druseidt_match_v1(text,text,boolean) to service_role;

create function public.pppp_chatgpt_druseidt_intelligence_v1(p_command_id text,p_payload jsonb)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $fn$
declare target uuid; item jsonb; ctx jsonb; a jsonb; key text; fp text; lead uuid; result jsonb; ids jsonb:='[]';
begin
 if length(coalesce(p_command_id,''))<10 or jsonb_typeof(p_payload)<>'object' then raise exception 'valid command and payload required';end if;
 select id into strict target from public.pppp_representation_targets_v1 where company_domain_normalized='druseidt.de' and archived_at is null;
 for item in select value from jsonb_array_elements(coalesce(p_payload->'direct_customers','[]')) loop
  if item->>'country' not in ('XK','AL') or coalesce(item->>'domain','') !~ '^[a-z0-9.-]+\.[a-z]+$' or item->>'source_url' !~ '^https://' or length(coalesce(item->>'published_activity',''))<25 then raise exception 'published company activity and official source required';end if;
  if item::text ~* 'spie' then raise exception 'SPIE outreach blocked';end if;
  key:='direct:'||lower(item->>'domain');ctx:=jsonb_build_object('title',item->>'company','company',item->>'company','company_domain',item->>'domain','source_url',item->>'source_url','scope',item->>'published_activity','contact',coalesce(item->'contact','{}'),'closed',false,'procurement_stage','UNCONFIRMED — no open project/package assumed','source','Published company website','intake_command_id',p_command_id);
  a:=public.pppp_druseidt_match_v1(item->>'published_activity',item->>'source_url',true);a:=a||jsonb_build_object('eligible',a->>'relevance' in ('HIGH','MEDIUM'));fp:=md5(jsonb_build_array(ctx,'druseidt-rules-v1')::text);
  insert into public.pppp_druseidt_leads_v1(target_id,source_key,kind,country,fingerprint,context,analysis) values(target,key,'direct',item->>'country',fp,ctx,a)
  on conflict(source_key) do update set context=excluded.context,analysis=excluded.analysis,fingerprint=excluded.fingerprint,analyzed_at=now(),updated_at=now() where pppp_druseidt_leads_v1.fingerprint<>excluded.fingerprint returning id into lead;
  if lead is null then select id into lead from public.pppp_druseidt_leads_v1 where source_key=key;end if;ids:=ids||jsonb_build_array(lead);
 end loop;
 result:=public.pppp_druseidt_refresh_v1();
 return result||jsonb_build_object('direct_lead_ids',ids,'outbound_created',false,'human_email_approval_required',true);
end $fn$;
revoke all on function public.pppp_chatgpt_druseidt_intelligence_v1(text,jsonb) from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_druseidt_intelligence_v1(text,jsonb) to service_role;

create function public.pppp_druseidt_snapshot_v1()
returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $fn$
 select jsonb_build_object('ok',true,'backfill_days',45,'target',(select to_jsonb(t) from public.pppp_representation_targets_v1 t where company_domain_normalized='druseidt.de' and archived_at is null),'leads',coalesce((select jsonb_agg(to_jsonb(l) order by case l.kind when 'award' then 0 else 1 end,l.updated_at desc) from public.pppp_druseidt_leads_v1 l where (analysis->>'eligible'='true' or analysis->>'relevance'='REVIEW' or pipeline<>'DISCOVERED') and pipeline<>'ARCHIVED'),'[]'),'coverage',(select jsonb_build_object('scanned',count(*),'relevant',count(*) filter(where analysis->>'eligible'='true'),'awards',count(*) filter(where kind='award'),'review',count(*) filter(where analysis->>'relevance'='REVIEW'),'analyzed_at',max(analyzed_at),'sources',coalesce(jsonb_agg(distinct context->>'source'),'[]')) from public.pppp_druseidt_leads_v1 where tender_watch_id is not null),'gates',jsonb_build_object('automatic_sends',false,'spie_outreach',false,'agreements_confirmed',false));
$fn$;
revoke all on function public.pppp_druseidt_snapshot_v1() from public,anon;
grant execute on function public.pppp_druseidt_snapshot_v1() to authenticated,service_role;

-- Application-owned mutations only. Operator decisions are audited and evidence-linked.
create function public.pppp_druseidt_transition_v1(p_id uuid,p_state text,p_expected timestamptz,p_evidence jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $fn$
declare l public.pppp_druseidt_leads_v1; mail public.project_emails; attachments jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'authorized operator required';end if;
 select * into strict l from public.pppp_druseidt_leads_v1 where id=p_id for update;
 if l.updated_at<>p_expected then raise exception 'lead_changed_refresh_required';end if;
 if l.context::text ~* 'spie' then raise exception 'SPIE outreach blocked';end if;
 if length(coalesce(p_evidence->>'note',''))<12 then raise exception 'explicit decision note required';end if;
 if p_state in ('DRAFT READY') then raise exception 'draft state requires actual Gmail draft';end if;
 if p_state in ('VERIFIED','CONTACT FOUND') and l.analysis->>'eligible'<>'true' then raise exception 'technical evidence missing';end if;
 if p_state in ('CONTACTED','REPLIED','RFQ RECEIVED') then
  select * into strict mail from public.project_emails where gmail_message_id=p_evidence->>'message_id' and needs_review=false;
  if coalesce(l.communications->>'thread_id','')='' or mail.gmail_thread_id<>l.communications->>'thread_id' then raise exception 'exact existing Gmail thread required';end if;
  if p_state='CONTACTED' and mail.direction not in ('outgoing','outbound','out') then raise exception 'sent email evidence required';end if;
  if p_state<>'CONTACTED' and (mail.direction not in ('incoming','inbound','in') or lower(mail.from_email)<>lower(l.communications->>'recipient')) then raise exception 'actual client reply required';end if;
  if p_state='RFQ RECEIVED' then
   select jsonb_agg(to_jsonb(a)) into attachments from public.project_attachment_links a where a.gmail_message_id=mail.gmail_message_id and (a.attachment_name ~* '\.(pdf|dwg|dxf|xlsx?|docx?|zip|x83)$') and a.project_id=mail.project_id;
   if attachments is null and coalesce(p_evidence->>'rfq_text','')='' then raise exception 'RFQ text or linked technical documents required';end if;
  end if;
 end if;
 if p_state='REQUEST TO DRUSEIDT READY' and l.pipeline<>'RFQ RECEIVED' then raise exception 'RFQ received required';end if;
 if p_state in ('DRUSEIDT QUOTING','OFFER RECEIVED','PRISTEEL OFFER READY','OFFERED','FOLLOW-UP','WON','LOST') and coalesce(p_evidence->>'source_url','') !~ '^https://' then raise exception 'commercial evidence source required';end if;
 update public.pppp_druseidt_leads_v1 set pipeline=p_state,rfq=case when p_state='RFQ RECEIVED' then jsonb_build_object('message_id',mail.gmail_message_id,'thread_id',mail.gmail_thread_id,'project_id',mail.project_id,'attachments',coalesce(attachments,'[]'),'text',p_evidence->>'rfq_text','missing',l.analysis->'missing','confirmed',l.analysis->'confirmed') else rfq end,history=history||jsonb_build_array(jsonb_build_object('from',l.pipeline,'to',p_state,'at',now(),'actor',auth.uid(),'evidence',p_evidence)),updated_at=now() where id=p_id;
 return jsonb_build_object('ok',true,'state',p_state,'external_email_sent',false);
end $fn$;
revoke all on function public.pppp_druseidt_transition_v1(uuid,text,timestamptz,jsonb) from public,anon;
grant execute on function public.pppp_druseidt_transition_v1(uuid,text,timestamptz,jsonb) to authenticated;

select cron.schedule('pppp-druseidt-weekday-intelligence-v1','15 7 * * 1-5','select public.pppp_druseidt_refresh_v1();');

create function public.pppp_druseidt_lead_detail_v1(p_id uuid)
returns jsonb language sql stable security invoker set search_path=pg_catalog,public as $fn$
 with l as (select * from public.pppp_druseidt_leads_v1 where id=p_id), profiles as (
 select p.id from public.pppp_opportunity_company_profiles_v1 p,l where p.id=l.company_profile_id or lower(p.legal_name)=lower(coalesce(l.context->>'company',l.context->'winner'->>'name')) or p.domain=l.context->>'company_domain'
 ), contacts as (
 select jsonb_build_object('id',c.id,'name',c.full_name,'role',coalesce(c.functional_role,c.job_title),'email',c.email,'source_url',c.source_url,'verification_status',c.verification_status,'do_not_contact',c.do_not_contact,'company_domain',split_part(c.email,'@',2)) c,
 case when coalesce(c.functional_role,c.job_title) ~* 'procurement' then 1 when coalesce(c.functional_role,c.job_title) ~* 'purchas' then 2 when coalesce(c.functional_role,c.job_title) ~* 'project' then 3 when coalesce(c.functional_role,c.job_title) ~* 'electrical' then 4 when coalesce(c.functional_role,c.job_title) ~* 'technical' then 5 else 6 end rank
 from public.pppp_opportunity_contacts_v1 c,l where c.company_profile_id in (select id from profiles) and (c.tender_watch_id=l.tender_watch_id or c.tender_watch_id is null)
 union all select context->'contact',7 from l where nullif(context->'contact'->>'email','') is not null
 ), recipient as (select communications->>'recipient' email,communications->>'thread_id' thread_id from l)
 select jsonb_build_object('lead',(select to_jsonb(l) from l),'contacts',coalesce((select jsonb_agg(c order by rank) from contacts),'[]'),'emails',coalesce((select jsonb_agg(to_jsonb(e)) from (select gmail_message_id,gmail_thread_id,from_email,subject,snippet,direction,sent_at,gmail_url,has_attachments from public.project_emails,recipient where gmail_thread_id=recipient.thread_id and needs_review=false order by sent_at desc limit 20)e),'[]'),'outbound_history',coalesce((select jsonb_agg(to_jsonb(o)) from (select q.id,q.status,q.gmail_draft_id,q.gmail_thread_id,q.sent_at,q.replied_at,q.source from public.pppp_outbound_queue_v1 q,recipient where lower(q.recipient_email)=lower(recipient.email) order by q.updated_at desc limit 10)o),'[]'));
$fn$;
revoke all on function public.pppp_druseidt_lead_detail_v1(uuid) from public,anon;
grant execute on function public.pppp_druseidt_lead_detail_v1(uuid) to authenticated,service_role;

create function public.pppp_druseidt_draft_claim_v1(p_id uuid,p_fingerprint text,p_request boolean default false)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $fn$
declare l public.pppp_druseidt_leads_v1; token uuid:=gen_random_uuid(); slot text:=case when p_request then 'supplier_draft' else 'client_draft' end;
begin
 select * into strict l from public.pppp_druseidt_leads_v1 where id=p_id for update;
 if l.fingerprint<>p_fingerprint then raise exception 'lead_changed_refresh_required';end if;
 if l.context::text ~* 'spie' then raise exception 'SPIE outreach blocked';end if;
 if l.analysis->>'eligible'<>'true' or l.pipeline in ('WON','LOST','ARCHIVED') then raise exception 'eligible active lead required';end if;
 if nullif(l.communications->slot->>'draft_id','') is not null then return jsonb_build_object('existing',true,'draft',l.communications->slot);end if;
 if coalesce((l.communications->slot->>'claim_until')::timestamptz,'epoch')>now() then raise exception 'draft_creation_in_progress';end if;
 update public.pppp_druseidt_leads_v1 set communications=jsonb_set(communications,array[slot],jsonb_build_object('claim',token,'claim_until',now()+interval '5 minutes')),updated_at=now() where id=p_id;
 return jsonb_build_object('existing',false,'claim',token,'slot',slot);
end $fn$;
revoke all on function public.pppp_druseidt_draft_claim_v1(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.pppp_druseidt_draft_claim_v1(uuid,text,boolean) to service_role;

create function public.pppp_chatgpt_bridge_manifest_v30()
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $fn$
 select public.pppp_chatgpt_bridge_manifest_v29() || jsonb_build_object('bridge_version','chatgpt-command-v30','druseidt_vertical',jsonb_build_object('canonical_target_domain','druseidt.de','read_rpc','pppp_druseidt_snapshot_v1','detail_rpc','pppp_druseidt_lead_detail_v1','command_action','druseidt_intelligence','fields',jsonb_build_array('direct_customers'),'human_email_approval_required',true,'external_email_sent',false)) || jsonb_build_object('allowed_action_types',(public.pppp_chatgpt_bridge_manifest_v29()->'allowed_action_types')||jsonb_build_array('druseidt_intelligence'));
$fn$;
revoke all on function public.pppp_chatgpt_bridge_manifest_v30() from public,anon;
grant execute on function public.pppp_chatgpt_bridge_manifest_v30() to authenticated,service_role;
create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb language sql security definer set search_path=pg_catalog,public as $fn$
 select public.pppp_chatgpt_bridge_manifest_v30();
$fn$;
