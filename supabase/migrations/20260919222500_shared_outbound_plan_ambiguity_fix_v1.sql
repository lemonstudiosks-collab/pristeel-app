-- Fix PL/pgSQL output-column ambiguity in the shared outbound day planner.

begin;

create or replace function public.pppp_outbound_plan_day_v1(
  p_day date default current_date,
  p_limit integer default null
)
returns table(
  queue_id uuid,
  planned_rank integer,
  planned_at timestamptz,
  source text,
  touch_no smallint,
  company_name text,
  company_domain text,
  recipient_email text,
  recipient_name text,
  project_title text,
  relevance_score integer,
  priority_score integer,
  gmail_draft_id text,
  approved_for_send boolean,
  send_enabled boolean
)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_policy public.pppp_outbound_policy_v1%rowtype;
  v_limit integer;
  v_sent integer;
  v_reserved integer;
  v_remaining integer;
begin
  select * into v_policy from public.pppp_outbound_policy_v1 where id='global';
  if p_day < v_policy.starts_on then
    raise exception 'Outbound planning starts on %',v_policy.starts_on;
  end if;

  perform public.pppp_outbound_sync_v1();

  v_limit:=least(v_policy.daily_limit,greatest(1,coalesce(p_limit,v_policy.daily_limit)));
  select count(*) into v_sent
  from public.pppp_outbound_queue_v1 q
  where q.sent_at is not null
    and (q.sent_at at time zone v_policy.timezone)::date=p_day;
  select count(*) into v_reserved
  from public.pppp_outbound_queue_v1 q
  where q.planned_date=p_day and q.status='planned' and q.approved_for_send=true and q.sent_at is null;
  v_remaining:=greatest(0,v_limit-v_sent-v_reserved);

  -- Re-plan unapproved, unsent rows idempotently.
  update public.pppp_outbound_queue_v1 q
     set status='candidate',planned_date=null,planned_at=null,planned_rank=null,updated_at=now()
   where q.planned_date=p_day and q.status='planned' and q.approved_for_send=false and q.sent_at is null;

  with ranked_recipient as (
    select q.id,
           row_number() over(
             partition by lower(q.recipient_email)
             order by q.priority_score desc,q.relevance_score desc,
                      case q.source when 'TED' then 1 else 2 end,
                      q.source_updated_at desc nulls last,q.id
           ) as rn_email
    from public.pppp_outbound_queue_v1 q
    where q.status='candidate'
      and q.suppression_reason is null
      and q.gmail_draft_id is not null
      and q.sent_at is null
      and q.replied_at is null
      and q.bounced_at is null
  ),
  ranked_domain as (
    select q.id,
           row_number() over(
             partition by lower(coalesce(q.company_domain,public.pppp_outbound_domain_v1(q.recipient_email,null)))
             order by q.priority_score desc,q.relevance_score desc,
                      case q.source when 'TED' then 1 else 2 end,
                      q.source_updated_at desc nulls last,q.id
           ) as rn_domain
    from public.pppp_outbound_queue_v1 q
    join ranked_recipient e on e.id=q.id and e.rn_email=1
  ),
  chosen as (
    select q.id,
           row_number() over(
             order by q.priority_score desc,q.relevance_score desc,
                      case q.source when 'TED' then 1 else 2 end,
                      q.source_updated_at desc nulls last,q.id
           )::integer as rn
    from public.pppp_outbound_queue_v1 q
    join ranked_domain d on d.id=q.id and d.rn_domain<=v_policy.max_per_domain_per_day
    where not exists (
      select 1 from public.pppp_outbound_queue_v1 x
      where x.planned_date=p_day
        and x.id<>q.id
        and lower(coalesce(x.company_domain,''))=lower(coalesce(q.company_domain,''))
        and x.status in ('planned','sent')
    )
    limit v_remaining
  )
  update public.pppp_outbound_queue_v1 q
     set status='planned',
         planned_date=p_day,
         planned_rank=c.rn+v_sent+v_reserved,
         planned_at=((p_day::timestamp+v_policy.day_start)
                     + make_interval(mins=>v_policy.planned_gap_minutes*(c.rn+v_sent+v_reserved-1)))
                    at time zone v_policy.timezone,
         approved_for_send=false,
         updated_at=now()
    from chosen c
   where q.id=c.id;

  return query
  select q.id,q.planned_rank,q.planned_at,q.source,q.touch_no,q.company_name,q.company_domain,
         q.recipient_email,q.recipient_name,q.project_title,q.relevance_score,q.priority_score,
         q.gmail_draft_id,q.approved_for_send,v_policy.send_enabled
  from public.pppp_outbound_queue_v1 q
  where q.planned_date=p_day and q.status='planned'
  order by q.planned_rank,q.id;
end;
$$;

commit;
