alter function public.pppp_druseidt_transition_v1(uuid,text,timestamptz,jsonb) set schema private;
create or replace function private.pppp_druseidt_transition_v1(p_id uuid,p_state text,p_expected timestamptz,p_evidence jsonb default '{}')
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $fn$
declare l public.pppp_druseidt_leads_v1; mail public.project_emails; attachments jsonb;
begin
 if auth.uid() is null or not public.is_admin() then raise exception 'authorized operator required';end if;
 select * into strict l from public.pppp_druseidt_leads_v1 where id=p_id for update;
 if coalesce((l.communications->'client_draft'->>'claim_until')::timestamptz,'epoch')>now() or coalesce((l.communications->'supplier_draft'->>'claim_until')::timestamptz,'epoch')>now() then raise exception 'draft_creation_in_progress';end if;
 if l.updated_at<>p_expected then raise exception 'lead_changed_refresh_required';end if;
 if l.context::text ~* 'spie' then raise exception 'SPIE outreach blocked';end if;
 if length(coalesce(p_evidence->>'note',''))<12 then raise exception 'explicit decision note required';end if;
 if p_state='CONTACT FOUND' and not exists(select 1 from jsonb_array_elements(public.pppp_druseidt_lead_detail_v1(p_id)->'contacts') c where lower(c->>'verification_status') in ('verified','published') and nullif(c->>'email','') is not null and c->>'source_url' ~ '^https://') then raise exception 'published contact required';end if;
 if p_state in ('DRAFT READY') then raise exception 'draft state requires actual Gmail draft';end if;
 if p_state in ('VERIFIED','CONTACT FOUND') and l.analysis->>'eligible'<>'true' then raise exception 'technical evidence missing';end if;
 if p_state in ('CONTACTED','REPLIED','RFQ RECEIVED') then
  select * into strict mail from public.project_emails where gmail_message_id=p_evidence->>'message_id' and needs_review=false;
  if coalesce(l.communications->>'thread_id','')='' or mail.gmail_thread_id<>l.communications->>'thread_id' then raise exception 'exact existing Gmail thread required';end if;
  if p_state='CONTACTED' and mail.direction not in ('outgoing','outbound','out') then raise exception 'sent email evidence required';end if;
  if p_state<>'CONTACTED' and (mail.direction not in ('incoming','inbound','in') or lower(mail.from_email)<>lower(l.communications->>'recipient')) then raise exception 'actual client reply required';end if;
  if p_state='RFQ RECEIVED' then
   select jsonb_agg(to_jsonb(a)) into attachments from public.project_attachment_links a where a.gmail_message_id=mail.gmail_message_id and (a.attachment_name ~* '\.(pdf|dwg|dxf|xlsx?|docx?|zip|x83)$') and a.project_id=mail.project_id;
   if attachments is null and (coalesce(p_evidence->>'rfq_text','')='' or strpos(lower(coalesce(mail.snippet,'')),lower(p_evidence->>'rfq_text'))=0) then raise exception 'RFQ text or linked technical documents required';end if;
  end if;
 end if;
 if p_state='REQUEST TO DRUSEIDT READY' and l.pipeline<>'RFQ RECEIVED' then raise exception 'RFQ received required';end if;
 if p_state in ('DRUSEIDT QUOTING','OFFER RECEIVED','PRISTEEL OFFER READY','OFFERED','FOLLOW-UP','WON','LOST') and coalesce(p_evidence->>'source_url','') !~ '^https://' then raise exception 'commercial evidence source required';end if;
 update public.pppp_druseidt_leads_v1 set pipeline=p_state,rfq=case when p_state='RFQ RECEIVED' then jsonb_build_object('message_id',mail.gmail_message_id,'thread_id',mail.gmail_thread_id,'project_id',mail.project_id,'attachments',coalesce(attachments,'[]'),'text',p_evidence->>'rfq_text','missing',l.analysis->'missing','confirmed',l.analysis->'confirmed') else rfq end,history=history||jsonb_build_array(jsonb_build_object('from',l.pipeline,'to',p_state,'at',now(),'actor',auth.uid(),'evidence',p_evidence)),updated_at=now() where id=p_id;
 return jsonb_build_object('ok',true,'state',p_state,'external_email_sent',false);
end $fn$;

revoke all on function private.pppp_druseidt_transition_v1(uuid,text,timestamptz,jsonb) from public,anon;
grant execute on function private.pppp_druseidt_transition_v1(uuid,text,timestamptz,jsonb) to authenticated;
create function public.pppp_druseidt_transition_v1(p_id uuid,p_state text,p_expected timestamptz,p_evidence jsonb default '{}')
returns jsonb language sql security invoker set search_path=pg_catalog,public as $fn$
 select private.pppp_druseidt_transition_v1(p_id,p_state,p_expected,p_evidence);
$fn$;
revoke all on function public.pppp_druseidt_transition_v1(uuid,text,timestamptz,jsonb) from public,anon;
grant execute on function public.pppp_druseidt_transition_v1(uuid,text,timestamptz,jsonb) to authenticated;

