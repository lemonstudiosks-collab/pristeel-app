
create or replace function public.pppp_outbound_reconcile_live_drafts_v1(p_drafts jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_seen integer:=0;
  v_stale integer:=0;
  v_manual integer:=0;
  v_live integer:=0;
begin
  if p_drafts is null or jsonb_typeof(p_drafts)<>'array' then
    raise exception 'p_drafts must be a JSON array';
  end if;

  perform public.pppp_outbound_sync_v1();

  delete from public.pppp_outbound_live_drafts_v1
  where draft_id is not null;

  insert into public.pppp_outbound_live_drafts_v1(
    draft_id,gmail_message_id,gmail_thread_id,recipient_email,subject,captured_at
  )
  select distinct on (x.draft_id)
    x.draft_id,x.gmail_message_id,x.gmail_thread_id,lower(x.recipient_email),x.subject,now()
  from (
    select
      nullif(trim(v->>'draft_id'),'') draft_id,
      nullif(trim(v->>'message_id'),'') gmail_message_id,
      nullif(trim(v->>'thread_id'),'') gmail_thread_id,
      nullif(trim(v->>'recipient_email'),'') recipient_email,
      nullif(trim(v->>'subject'),'') subject
    from jsonb_array_elements(p_drafts) v
  ) x
  where x.draft_id is not null
    and x.recipient_email is not null
    and x.recipient_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  order by x.draft_id;
  get diagnostics v_seen=row_count;

  update public.pppp_outbound_queue_v1 q
     set gmail_draft_message_id=coalesce(d.gmail_message_id,q.gmail_draft_message_id),
         gmail_thread_id=coalesce(d.gmail_thread_id,q.gmail_thread_id),
         recipient_email=d.recipient_email,
         company_domain=public.pppp_outbound_domain_v1(d.recipient_email,q.company_domain),
         status=case
           when q.status='stale' and q.suppression_reason='gmail_draft_missing' then 'candidate'
           else q.status end,
         suppression_reason=case
           when q.status='stale' and q.suppression_reason='gmail_draft_missing' then null
           else q.suppression_reason end,
         planned_date=case
           when q.status='stale' and q.suppression_reason='gmail_draft_missing' then null
           else q.planned_date end,
         planned_at=case
           when q.status='stale' and q.suppression_reason='gmail_draft_missing' then null
           else q.planned_at end,
         planned_rank=case
           when q.status='stale' and q.suppression_reason='gmail_draft_missing' then null
           else q.planned_rank end,
         payload=coalesce(q.payload,'{}'::jsonb)||jsonb_build_object('gmail_live_verified_at',now()),
         updated_at=now()
    from public.pppp_outbound_live_drafts_v1 d
   where q.gmail_draft_id=d.draft_id
     and q.sent_at is null;

  update public.pppp_outbound_queue_v1 q
     set status='stale',
         suppression_reason='gmail_draft_missing',
         planned_date=null,planned_at=null,planned_rank=null,
         approved_for_send=false,
         payload=coalesce(q.payload,'{}'::jsonb)||jsonb_build_object('gmail_missing_checked_at',now()),
         updated_at=now()
   where q.sent_at is null
     and q.gmail_draft_id is not null
     and q.status in ('candidate','planned','suppressed')
     and not exists (
       select 1 from public.pppp_outbound_live_drafts_v1 d where d.draft_id=q.gmail_draft_id
     );
  get diagnostics v_stale=row_count;

  insert into public.pppp_outbound_queue_v1(
    source,source_record_id,source_key,touch_no,project_key,project_title,company_name,company_domain,
    recipient_email,recipient_name,contact_role,relevance_score,priority_score,gmail_draft_id,
    gmail_draft_message_id,gmail_thread_id,status,suppression_reason,approved_for_send,human_send_required,
    source_updated_at,payload,updated_at
  )
  select
    'TED',null,'GMAIL:'||d.draft_id,1,'GMAIL:'||d.draft_id,d.subject,
    coalesce((
      select q2.company_name
      from public.pppp_outbound_queue_v1 q2
      where q2.source='TED'
        and q2.company_domain=public.pppp_outbound_domain_v1(d.recipient_email,null)
        and nullif(q2.company_name,'') is not null
      order by q2.relevance_score desc,q2.updated_at desc
      limit 1
    ),public.pppp_outbound_domain_v1(d.recipient_email,null)),
    public.pppp_outbound_domain_v1(d.recipient_email,null),
    d.recipient_email,null,'live_gmail_outreach_draft',
    case when exists(
      select 1 from public.pppp_outbound_queue_v1 q2
      where q2.source='TED' and q2.company_domain=public.pppp_outbound_domain_v1(d.recipient_email,null)
    ) then 90 else 80 end,
    public.pppp_outbound_priority_v1(
      d.recipient_email,null,'live_gmail_outreach_draft',
      case when exists(
        select 1 from public.pppp_outbound_queue_v1 q2
        where q2.source='TED' and q2.company_domain=public.pppp_outbound_domain_v1(d.recipient_email,null)
      ) then 90 else 80 end
    ),
    d.draft_id,d.gmail_message_id,d.gmail_thread_id,'stale','gmail_live_unresolved_noncanonical',false,true,now(),
    jsonb_build_object('manual_live_draft',true,'gmail_live_verified_at',now(),'subject',d.subject),
    now()
  from public.pppp_outbound_live_drafts_v1 d
  where not exists (
      select 1 from public.pppp_outbound_queue_v1 q where q.gmail_draft_id=d.draft_id
    )
    and not exists (
      select 1 from public.pppp_gc_prospects_v1 p
      where p.first_draft_id=d.draft_id or p.second_draft_id=d.draft_id
    )
    and coalesce(d.subject,'') ilike '%PRISTEEL%'
    and lower(public.pppp_outbound_domain_v1(d.recipient_email,null)) <> 'prissteel.com'
  on conflict (source_key) do update set
    gmail_draft_message_id=excluded.gmail_draft_message_id,
    gmail_thread_id=excluded.gmail_thread_id,
    recipient_email=excluded.recipient_email,
    company_domain=excluded.company_domain,
    project_title=excluded.project_title,
    status=case
      when public.pppp_outbound_queue_v1.sent_at is not null then public.pppp_outbound_queue_v1.status
      else 'stale'
    end,
    suppression_reason=case
      when public.pppp_outbound_queue_v1.sent_at is not null then public.pppp_outbound_queue_v1.suppression_reason
      else 'gmail_live_unresolved_noncanonical'
    end,
    source_updated_at=now(),
    payload=excluded.payload,
    updated_at=now();
  get diagnostics v_manual=row_count;

  update public.pppp_outbound_queue_v1 q
     set status='suppressed',suppression_reason='internal_pristeel_recipient',planned_date=null,planned_at=null,
         planned_rank=null,approved_for_send=false,updated_at=now()
   where q.sent_at is null
     and lower(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain))='prissteel.com';

  select count(*) into v_live from public.pppp_outbound_queue_v1 q
  where q.sent_at is null
    and q.status in ('candidate','planned')
    and exists(select 1 from public.pppp_outbound_live_drafts_v1 d where d.draft_id=q.gmail_draft_id);

  return jsonb_build_object(
    'ok',true,
    'gmail_drafts_seen',v_seen,
    'queue_rows_marked_stale',v_stale,
    'manual_live_drafts_registered',v_manual,
    'live_send_ready_rows',v_live,
    'human_send_required',true,
    'auto_send',false
  );
end;
$$;

revoke all on function public.pppp_outbound_reconcile_live_drafts_v1(jsonb) from public, anon, authenticated;
grant execute on function public.pppp_outbound_reconcile_live_drafts_v1(jsonb) to service_role;

