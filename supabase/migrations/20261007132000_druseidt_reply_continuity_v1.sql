create or replace function public.pppp_druseidt_refresh_v1()
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
  ctx:=jsonb_build_object('title',r.title,'authority',r.authority,'reference',r.procurement_no,'deadline',r.deadline,'published_date',r.published_date,'award_date',coalesce(r.payload->>'award_date',r.payload->'ted_details'->>'award_date',winner->>'decision_date'),'winner',winner,'jv',coalesce(r.payload->'consortium',r.payload->'jv','null'),'contract_value',case when k='award' then r.payload->'ted_details'->'value_amount' else null end,'currency',r.currency,'source',r.payload->>'source','source_url',coalesce(r.detail_url,r.source_url),'project_id',r.project_id,'scope',left(txt,16000),'closed',closed,'procurement_stage','UNCONFIRMED - ask whether component procurement is still open','bidder_evidence',coalesce(r.payload->'verified_bidders','[]'),'documents',coalesce(r.payload->'dossier_saved'->'documents','[]'),'dossier_complete',coalesce((r.payload->'dossier_saved'->>'dossier_complete')::boolean,false));
  fp:=md5(jsonb_build_array(ctx,r.dossier_fp,'druseidt-rules-v1')::text);
  if exists(select 1 from public.pppp_druseidt_leads_v1 where source_key='tender:'||r.id and fingerprint=fp) then continue;end if;
  a:=public.pppp_druseidt_match_v1(txt,ctx->>'source_url');
  if closed then a:=a||'{"eligible":false}';else a:=a||jsonb_build_object('eligible',a->>'relevance' in ('HIGH','MEDIUM'));end if;
  insert into public.pppp_druseidt_leads_v1(target_id,source_key,tender_watch_id,kind,country,fingerprint,context,analysis) values(target,'tender:'||r.id,r.id,k,c,fp,ctx,a)
  on conflict(source_key) do update set kind=excluded.kind,country=excluded.country,fingerprint=excluded.fingerprint,context=excluded.context,analysis=excluded.analysis,analyzed_at=now(),updated_at=now();changed:=changed+1;
 end loop;
 
 -- Canonical Gmail intake provides exact reply evidence. RFQ classification remains an operator decision.
 for r in select l.id,l.pipeline,l.history,l.communications,e.gmail_message_id,e.gmail_thread_id,e.sent_at,e.has_attachments from public.pppp_druseidt_leads_v1 l join lateral (
 select gmail_message_id,gmail_thread_id,sent_at,has_attachments from public.project_emails e where e.gmail_thread_id=l.communications->>'thread_id' and lower(e.from_email)=lower(l.communications->>'recipient') and e.direction in ('incoming','inbound','in') and e.needs_review=false and e.subject !~* '(automatic reply|automatische antwort|out of office)' order by e.sent_at desc limit 1)e on true where l.pipeline in ('DRAFT READY','CONTACTED','FOLLOW-UP') loop
  update public.pppp_druseidt_leads_v1 set pipeline='REPLIED',communications=communications||jsonb_build_object('reply_message_id',r.gmail_message_id,'replied_at',r.sent_at,'rfq_review_required',r.has_attachments),history=history||jsonb_build_array(jsonb_build_object('from',r.pipeline,'to','REPLIED','at',now(),'source','canonical_gmail_intake','message_id',r.gmail_message_id)),updated_at=now() where id=r.id;
 end loop;
 return jsonb_build_object('ok',true,'scanned',scanned,'changed',changed,'backfill_days',45,'target_id',target,'external_email_sent',false,'tenders_created',0);
end $fn$;

create or replace function public.pppp_druseidt_draft_claim_v1(p_id uuid,p_fingerprint text,p_request boolean default false)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $fn$
declare l public.pppp_druseidt_leads_v1; token uuid:=gen_random_uuid(); slot text:=case when p_request then 'supplier_draft' else 'client_draft' end;
begin
 select * into strict l from public.pppp_druseidt_leads_v1 where id=p_id for update;
 if l.fingerprint<>p_fingerprint then raise exception 'lead_changed_refresh_required';end if;
 if l.context::text ~* 'spie' then raise exception 'SPIE outreach blocked';end if;
 if (l.analysis->>'eligible'<>'true' and not (p_request and l.pipeline in ('RFQ RECEIVED','REQUEST TO DRUSEIDT READY') and l.analysis->>'relevance' in ('HIGH','MEDIUM'))) or l.pipeline in ('WON','LOST','ARCHIVED') then raise exception 'eligible active lead required';end if;
 if nullif(l.communications->slot->>'draft_id','') is not null then return jsonb_build_object('existing',true,'draft',l.communications->slot);end if;
 if coalesce((l.communications->slot->>'claim_until')::timestamptz,'epoch')>now() then raise exception 'draft_creation_in_progress';end if;
 update public.pppp_druseidt_leads_v1 set communications=jsonb_set(communications,array[slot],jsonb_build_object('claim',token,'claim_until',now()+interval '5 minutes')),updated_at=now() where id=p_id;
 return jsonb_build_object('existing',false,'claim',token,'slot',slot);
end $fn$;

