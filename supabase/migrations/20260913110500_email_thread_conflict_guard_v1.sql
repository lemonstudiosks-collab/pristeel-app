-- Prevent correspondent/RFQ fallback from overriding explicit project identity
-- in an email subject, and repair already-observed historical thread conflicts
-- conservatively without replaying old emails into the action engine.

create or replace function public.pppp_email_subject_explicit_project_v1(
  p_subject text
)
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
with params as (
  select lower(regexp_replace(coalesce(p_subject,''),'[^a-zA-Z0-9]+',' ','g')) as subj_norm
), active_projects as (
  select p.id,p.name,p.ref,p.business_ref,p.identity_aliases
  from public.projects p
  where not public.pppp_project_status_is_terminal_v1(p.status)
), raw_identity as (
  select p.id as project_id,trim(x) as raw
  from active_projects p
  cross join lateral unnest(
    array_remove(
      array_cat(array[p.name,p.ref,p.business_ref],coalesce(p.identity_aliases,array[]::text[])),
      null
    )
  ) x
), phrase_identity as (
  select project_id,lower(regexp_replace(raw,'[^a-zA-Z0-9]+',' ','g')) ident
  from raw_identity
  where length(trim(raw))>=8
), hits as (
  select distinct i.project_id
  from phrase_identity i,params x
  where length(trim(i.ident))>=8
    and i.ident not in ('early warning and alarm system')
    and (' '||x.subj_norm||' ') like '% '||i.ident||' %'
)
select case when count(*)=1 then min(project_id::text)::uuid else null end
from hits;
$function$;

revoke all on function public.pppp_email_subject_explicit_project_v1(text)
  from public,anon,authenticated;
grant execute on function public.pppp_email_subject_explicit_project_v1(text)
  to service_role;

create or replace function public.pppp_reconcile_email_context_v1(p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_thread integer := 0;
  v_rfq integer := 0;
  v_review integer := 0;
  v_explicit_review integer := 0;
  v_days integer := greatest(1,least(coalesce(p_days,7),30));
begin
  -- Thread propagation may only start from a stable/non-inferred anchor.
  -- An RFQ-correspondent guess is deliberately not allowed to seed a thread.
  with thread_map as (
    select gmail_thread_id, min(project_id::text)::uuid as project_id
    from public.project_emails
    where project_id is not null
      and gmail_thread_id is not null
      and gmail_thread_id <> ''
      and coalesce(match_method,'') not in (
        'server-context-thread-v1',
        'server-context-rfq-v1',
        'server-context-rfq-review-v1',
        'server-context-rfq-explicit-conflict-v1',
        'server-context-cross-project-review-v2'
      )
    group by gmail_thread_id
    having count(distinct project_id)=1
  ), upd as (
    update public.project_emails e
       set project_id=t.project_id,
           suggested_project_id=t.project_id,
           match_method='server-context-thread-v1',
           match_confidence=100,
           needs_review=false,
           review_reason=null,
           updated_at=now()
      from thread_map t
     where e.project_id is null
       and e.sent_at >= now() - make_interval(days=>v_days)
       and e.gmail_thread_id=t.gmail_thread_id
    returning e.gmail_message_id,e.gmail_thread_id,e.project_id
  )
  select count(*) into v_thread from upd;

  insert into public.project_email_links(project_id,gmail_message_id,gmail_thread_id,link_method,confidence,created_at)
  select e.project_id,e.gmail_message_id,e.gmail_thread_id,e.match_method,e.match_confidence,now()
  from public.project_emails e
  where e.project_id is not null
    and e.sent_at >= now()-make_interval(days=>v_days)
    and e.match_method='server-context-thread-v1'
  on conflict (gmail_message_id,project_id) do nothing;

  -- A unique correspondent/RFQ fallback is only a weak routing signal. If the
  -- subject explicitly identifies a different active project, hold the email
  -- for review and prefer the explicit project as the suggestion.
  with recent_rfq as (
    select public.pppp_email_key_v1(r.supplier_email) email_key,
           r.project_id,
           max(coalesce(r.sent_at,r.created_at)) last_rfq
    from public.rfq_log r
    join public.projects p on p.id=r.project_id
    where coalesce(r.supplier_email,'')<>''
      and coalesce(r.sent_at,r.created_at) >= now()-interval '30 days'
      and lower(coalesce(r.status,'')) not in ('superseded','draft_review','lost','cancelled','canceled')
      and lower(coalesce(p.status,'')) not in ('humbur','arkivuar','mbyllur','realizuar','closedlost','cancelled','canceled','archived','lost')
    group by 1,2
  ), counts as (
    select email_key,count(distinct project_id) as project_count
    from recent_rfq
    where email_key<>''
    group by email_key
  ), winner as (
    select r.email_key,
           min(r.project_id::text)::uuid as project_id,
           max(r.last_rfq) as last_rfq
    from recent_rfq r
    join counts c using (email_key)
    where c.project_count=1
    group by r.email_key
  ), conflicts as (
    select e.id,
           public.pppp_email_subject_explicit_project_v1(e.subject) as explicit_project_id
    from public.project_emails e
    join winner w on public.pppp_email_key_v1(e.from_email)=w.email_key
    where e.project_id is null
      and e.direction='incoming'
      and e.sent_at >= now()-make_interval(days=>v_days)
      and public.pppp_email_subject_explicit_project_v1(e.subject) is not null
      and public.pppp_email_subject_explicit_project_v1(e.subject)<>w.project_id
  ), upd as (
    update public.project_emails e
       set suggested_project_id=c.explicit_project_id,
           match_method='server-context-rfq-explicit-conflict-v1',
           match_confidence=96,
           needs_review=true,
           review_reason='RFQ correspondent fallback conflicts with explicit project identity in the subject; automatic linking was withheld.',
           updated_at=now()
      from conflicts c
     where e.id=c.id
       and e.project_id is null
    returning e.id
  )
  select count(*) into v_explicit_review from upd;

  -- Supplier/correspondent fallback is safe only when that correspondent has
  -- exactly one active project RFQ in the lookback window AND the subject does
  -- not explicitly identify a different project.
  with recent_rfq as (
    select public.pppp_email_key_v1(r.supplier_email) email_key,
           r.project_id,
           max(coalesce(r.sent_at,r.created_at)) last_rfq
    from public.rfq_log r
    join public.projects p on p.id=r.project_id
    where coalesce(r.supplier_email,'')<>''
      and coalesce(r.sent_at,r.created_at) >= now()-interval '30 days'
      and lower(coalesce(r.status,'')) not in ('superseded','draft_review','lost','cancelled','canceled')
      and lower(coalesce(p.status,'')) not in ('humbur','arkivuar','mbyllur','realizuar','closedlost','cancelled','canceled','archived','lost')
    group by 1,2
  ), counts as (
    select email_key,count(distinct project_id) as project_count
    from recent_rfq
    where email_key<>''
    group by email_key
  ), winner as (
    select r.email_key,
           min(r.project_id::text)::uuid as project_id,
           max(r.last_rfq) as last_rfq
    from recent_rfq r
    join counts c using (email_key)
    where c.project_count=1
    group by r.email_key
  ), upd as (
    update public.project_emails e
       set project_id=w.project_id,
           suggested_project_id=w.project_id,
           match_method='server-context-rfq-v1',
           match_confidence=96,
           needs_review=false,
           review_reason=null,
           updated_at=now()
      from winner w
     where e.project_id is null
       and e.direction='incoming'
       and e.sent_at >= now()-make_interval(days=>v_days)
       and public.pppp_email_key_v1(e.from_email)=w.email_key
       and coalesce(public.pppp_email_subject_explicit_project_v1(e.subject),w.project_id)=w.project_id
       and coalesce(e.match_method,'')<>'server-context-rfq-explicit-conflict-v1'
    returning e.gmail_message_id,e.gmail_thread_id,e.project_id
  )
  select count(*) into v_rfq from upd;

  insert into public.project_email_links(project_id,gmail_message_id,gmail_thread_id,link_method,confidence,created_at)
  select e.project_id,e.gmail_message_id,e.gmail_thread_id,e.match_method,e.match_confidence,now()
  from public.project_emails e
  where e.project_id is not null
    and e.sent_at >= now()-make_interval(days=>v_days)
    and e.match_method='server-context-rfq-v1'
  on conflict (gmail_message_id,project_id) do nothing;

  with recent_rfq as (
    select public.pppp_email_key_v1(r.supplier_email) email_key,
           r.project_id,
           max(coalesce(r.sent_at,r.created_at)) last_rfq
    from public.rfq_log r
    join public.projects p on p.id=r.project_id
    where coalesce(r.supplier_email,'')<>''
      and coalesce(r.sent_at,r.created_at) >= now()-interval '30 days'
      and lower(coalesce(r.status,'')) not in ('superseded','draft_review','lost','cancelled','canceled')
      and lower(coalesce(p.status,'')) not in ('humbur','arkivuar','mbyllur','realizuar','closedlost','cancelled','canceled','archived','lost')
    group by 1,2
  ), counts as (
    select email_key,count(distinct project_id) as project_count
    from recent_rfq
    where email_key<>''
    group by email_key
  ), ranked as (
    select r.*,
           row_number() over(partition by r.email_key order by r.last_rfq desc,r.project_id) rn
    from recent_rfq r
    where r.email_key<>''
  ), ambiguous as (
    select r.email_key,r.project_id
    from ranked r
    join counts c using (email_key)
    where r.rn=1 and c.project_count>1
  ), upd as (
    update public.project_emails e
       set suggested_project_id=a.project_id,
           match_method='server-context-rfq-review-v1',
           match_confidence=74,
           needs_review=true,
           review_reason='Multiple active project RFQs exist for this correspondent; automatic linking was intentionally withheld.',
           updated_at=now()
      from ambiguous a
     where e.project_id is null
       and e.direction='incoming'
       and e.sent_at >= now()-make_interval(days=>v_days)
       and public.pppp_email_key_v1(e.from_email)=a.email_key
       and coalesce(e.match_confidence,0)<80
       and public.pppp_email_subject_explicit_project_v1(e.subject) is null
    returning e.id
  )
  select count(*) into v_review from upd;

  return jsonb_build_object(
    'ok',true,
    'thread_linked',v_thread,
    'rfq_linked',v_rfq,
    'held_for_review',v_review+v_explicit_review,
    'explicit_identity_conflicts',v_explicit_review,
    'days',v_days
  );
end
$function$;

-- Build a one-transaction repair set from strong thread-majority evidence plus
-- explicit project identity in the subject. The 24h floor prevents replay of a
-- current incoming email as part of this historical data-quality repair.
create temporary table pppp_email_thread_conflict_repair_candidates on commit drop as
with thread_project_counts as (
  select gmail_thread_id,project_id,count(*)::int n
  from public.project_emails
  where project_id is not null and nullif(gmail_thread_id,'') is not null
  group by gmail_thread_id,project_id
), ranked as (
  select tpc.*,
         row_number() over(partition by gmail_thread_id order by n desc,project_id) rn,
         lead(n) over(partition by gmail_thread_id order by n desc,project_id) second_n
  from thread_project_counts tpc
), majority as (
  select *
  from ranked
  where rn=1 and n>=2 and n>=coalesce(second_n,0)*3
)
select e.id,e.gmail_message_id,e.gmail_thread_id,e.sent_at,
       e.project_id as old_project_id,m.project_id as correct_project_id
from public.project_emails e
join majority m on m.gmail_thread_id=e.gmail_thread_id
where e.project_id is distinct from m.project_id
  and e.sent_at<now()-interval '24 hours'
  and public.pppp_email_subject_explicit_project_v1(e.subject)=m.project_id;

-- Safety fuse: this migration is intended to repair a tiny, deterministic set.
do $block$
declare v_count integer;
begin
  select count(*) into v_count from pppp_email_thread_conflict_repair_candidates;
  if v_count>10 then
    raise exception 'email thread conflict repair candidate count % exceeds safety limit 10',v_count;
  end if;
end
$block$;

-- Remove stale wrong canonical links first. The existing AFTER trigger on the
-- email update below will recreate the correct historical link.
delete from public.project_email_links l
using pppp_email_thread_conflict_repair_candidates c
where l.gmail_message_id=c.gmail_message_id
  and l.project_id is distinct from c.correct_project_id;

update public.project_emails e
   set project_id=c.correct_project_id,
       suggested_project_id=c.correct_project_id,
       match_method='historical-link-only:thread-conflict-reconciled-v1',
       match_confidence=100,
       needs_review=false,
       review_reason=null,
       updated_at=now()
  from pppp_email_thread_conflict_repair_candidates c
 where e.id=c.id;

-- Dismiss wrong-project event facts but preserve them in the audit trail.
update public.pppp_project_context_facts f
   set fact_status='dismissed',updated_at=now()
  from pppp_email_thread_conflict_repair_candidates c
 where f.project_id=c.old_project_id
   and f.fact_status<>'dismissed'
   and (
     f.source_ref=c.gmail_message_id
     or f.value->>'source_email'=c.gmail_message_id
   );

-- Invalidate deterministic analyses that consumed the mislinked email under a
-- project other than the repaired project. Rows remain intact for audit.
update public.project_analyses a
   set status='invalidated'
 where a.status='complete'
   and exists(
     select 1
     from pppp_email_thread_conflict_repair_candidates c
     where a.project_id<>c.correct_project_id::text
       and (
         a.analysis->>'event_source_ref'=c.gmail_message_id
         or a.source_manifest::text ilike '%'||c.gmail_message_id||'%'
       )
   );

-- If an existing human/data-quality correction explicitly names the mislinked
-- email, use that correction as the authority for clearing a false email-driven
-- action_required state. active_work is the neutral pre-execution state: it does
-- not create a new commercial/supplier decision or protected commitment.
with corrections as (
  select c.old_project_id,max(f.updated_at) correction_at
  from pppp_email_thread_conflict_repair_candidates c
  join public.pppp_project_context_facts f
    on f.project_id=c.old_project_id
   and f.category='data_quality'
   and f.fact_status='observed'
   and f.value#>>'{mislinked_email,gmail_message_id}'=c.gmail_message_id
  group by c.old_project_id
)
update public.projects p
   set operational_state='active_work',
       operational_state_source='data_quality_reconcile_v1',
       operational_state_at=x.correction_at,
       last_email_at=(select max(e.sent_at) from public.project_emails e where e.project_id=p.id),
       updated_at=now()
  from corrections x
 where p.id=x.old_project_id
   and p.operational_state='action_required'
   and p.operational_state_source='email_event_v2';

-- Close only stale workflow task classes already called out by the observed
-- data-quality correction for the affected project. This does not select a
-- supplier; it removes obsolete automation prompts.
with corrected_projects as (
  select distinct c.old_project_id
  from pppp_email_thread_conflict_repair_candidates c
  join public.pppp_project_context_facts f
    on f.project_id=c.old_project_id
   and f.category='data_quality'
   and f.fact_status='observed'
   and f.value#>>'{mislinked_email,gmail_message_id}'=c.gmail_message_id
   and jsonb_array_length(coalesce(f.value->'stale_tasks','[]'::jsonb))>0
)
update public.tasks t
   set status='mbyllur',
       done_at=coalesce(t.done_at,now()),
       detail=concat_ws(E'\n',nullif(t.detail,''),'[data-quality-reconcile-v1] Closed because the project correction fact explicitly identifies this automation prompt as stale.'),
       updated_at=now()
  from corrected_projects c
 where t.project_id=c.old_project_id
   and t.status='hapur'
   and (
     t.source='procurement_comparison_auto'
     or t.source='sla_auto'
     or (t.source='semantic_brain_auto' and t.source_ref='semantic:rfq-review:'||c.old_project_id::text)
   );

-- Any semantic memory built from the contaminated baseline must not remain the
-- current semantic interpretation. It can be regenerated from clean inputs.
update public.pppp_project_context_facts f
   set fact_status='dismissed',updated_at=now()
 where f.fact_key='project.memory.semantic.v1'
   and f.fact_status='observed'
   and f.project_id in (
     select old_project_id from pppp_email_thread_conflict_repair_candidates
   );

-- Record an audit fact on the affected old project without creating a task.
insert into public.pppp_project_context_facts(
  project_id,category,fact_key,fact_status,subject,value,source_type,source_ref,
  confidence,evidence_status,created_by,idempotency_key,created_at,updated_at
)
select
  c.old_project_id,
  'data_quality',
  'data_quality.email_thread_conflict_reconciled.'||c.gmail_message_id,
  'observed',
  'Email thread conflict reconciled',
  jsonb_build_object(
    'gmail_message_id',c.gmail_message_id,
    'gmail_thread_id',c.gmail_thread_id,
    'old_project_id',c.old_project_id,
    'correct_project_id',c.correct_project_id,
    'repair_method','thread_majority_plus_explicit_subject_identity_v1',
    'memory_only',true,
    'action_required',false,
    'protected_decision',false
  ),
  'system',
  c.gmail_message_id,
  1,
  'confirmed',
  'pppp-email-thread-conflict-reconcile-v1',
  'email-thread-conflict-reconcile-v1:'||c.gmail_message_id,
  now(),now()
from pppp_email_thread_conflict_repair_candidates c
on conflict (idempotency_key) where idempotency_key is not null do nothing;

-- Refresh canonical project memory after the state/email correction. The
-- reconciler is idempotent and writes only changed fingerprints.
select public.pppp_project_memory_baseline_reconcile_v1(true,20);
