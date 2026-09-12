-- PPPP project history digest v1
-- Deterministic backstage memory for active projects with linked Gmail history.
--
-- This does NOT create tasks, change project state, send email, select suppliers,
-- approve pricing, create contracts/POs, or decide won/lost status. It writes one
-- canonical context fact per project so existing intelligence can see older
-- communication history without replaying hundreds of historical emails through AI.

create or replace function public.pppp_refresh_project_history_digest_v1(
  p_project_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','cron'
as $function$
declare
  v_rows integer := 0;
  v_projects integer := 0;
begin
  with eligible as (
    select p.id,p.name,p.status,p.operational_state,p.updated_at
    from public.projects p
    where (p_project_id is null or p.id=p_project_id)
      and lower(coalesce(p.status,'')) not in (
        'humbur','lost','arkivuar','archived','mbyllur','closed','closedlost',
        'cancelled','canceled','realizuar'
      )
  ), digest as (
    select
      p.id as project_id,
      p.name as project_name,
      p.status as project_status,
      p.operational_state,
      s.email_count,
      s.incoming_count,
      s.outgoing_count,
      s.attachment_email_count,
      s.first_email_at,
      s.last_email_at,
      s.last_email_updated_at,
      coalesce(senders.top_senders,'[]'::jsonb) as top_senders,
      coalesce(topics.subject_threads,'[]'::jsonb) as subject_threads,
      coalesce(recent.recent_events,'[]'::jsonb) as recent_events,
      latest_in.latest_incoming,
      latest_out.latest_outgoing,
      md5(concat_ws('|',
        s.email_count::text,
        coalesce(s.last_email_updated_at::text,''),
        coalesce(p.status,''),
        coalesce(p.operational_state,''),
        coalesce(p.updated_at::text,'')
      )) as source_signature
    from eligible p
    join lateral (
      select
        count(*)::integer as email_count,
        count(*) filter(where e.direction='incoming')::integer as incoming_count,
        count(*) filter(where e.direction='outgoing')::integer as outgoing_count,
        count(*) filter(where coalesce(e.has_attachments,false))::integer as attachment_email_count,
        min(e.sent_at) as first_email_at,
        max(e.sent_at) as last_email_at,
        max(e.updated_at) as last_email_updated_at
      from public.project_emails e
      where e.project_id=p.id
        and e.sent_at<=now()+interval '5 minutes'
    ) s on s.email_count>0
    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'email',x.email,
          'name',x.latest_name,
          'messages',x.messages,
          'first_seen',x.first_seen,
          'last_seen',x.last_seen
        ) order by x.messages desc,x.last_seen desc
      ) as top_senders
      from (
        select
          lower(e.from_email) as email,
          (array_agg(nullif(btrim(e.from_name),'') order by e.sent_at desc)
            filter(where nullif(btrim(e.from_name),'') is not null))[1] as latest_name,
          count(*)::integer as messages,
          min(e.sent_at) as first_seen,
          max(e.sent_at) as last_seen
        from public.project_emails e
        where e.project_id=p.id
          and e.direction='incoming'
          and e.sent_at<=now()+interval '5 minutes'
          and nullif(btrim(e.from_email),'') is not null
          and lower(e.from_email) !~ '(^|@)(mailer-daemon|postmaster)'
          and lower(e.from_email) !~ '(no-?reply|do-?not-?reply)'
        group by lower(e.from_email)
        order by count(*) desc,max(e.sent_at) desc
        limit 6
      ) x
    ) senders on true
    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'subject',x.latest_subject,
          'messages',x.messages,
          'first_seen',x.first_seen,
          'last_seen',x.last_seen
        ) order by x.messages desc,x.last_seen desc
      ) as subject_threads
      from (
        select
          q.subject_key,
          (array_agg(nullif(btrim(q.subject),'') order by q.sent_at desc)
            filter(where nullif(btrim(q.subject),'') is not null))[1] as latest_subject,
          count(*)::integer as messages,
          min(q.sent_at) as first_seen,
          max(q.sent_at) as last_seen
        from (
          select e.subject,e.sent_at,
                 regexp_replace(
                   lower(btrim(coalesce(e.subject,''))),
                   '^(\s*(re|fw|fwd)\s*:\s*)+',
                   '',
                   'i'
                 ) as subject_key
          from public.project_emails e
          where e.project_id=p.id
            and e.sent_at<=now()+interval '5 minutes'
        ) q
        where nullif(q.subject_key,'') is not null
        group by q.subject_key
        order by count(*) desc,max(q.sent_at) desc
        limit 8
      ) x
    ) topics on true
    left join lateral (
      select jsonb_agg(
        jsonb_build_object(
          'gmail_message_id',x.gmail_message_id,
          'sent_at',x.sent_at,
          'direction',x.direction,
          'from_email',x.from_email,
          'from_name',x.from_name,
          'subject',x.subject,
          'snippet',left(coalesce(x.snippet,''),260),
          'has_attachments',coalesce(x.has_attachments,false),
          'system_like',(
            lower(coalesce(x.from_email,'')) ~ '(^|@)(mailer-daemon|postmaster)'
            or lower(coalesce(x.from_email,'')) ~ '(no-?reply|do-?not-?reply)'
            or lower(coalesce(x.subject,'')) ~ '(automatic reply|automatisch antwort|automatisch antwoord|out of office|auto.?reply)'
          )
        ) order by x.sent_at
      ) as recent_events
      from (
        select e.gmail_message_id,e.sent_at,e.direction,e.from_email,e.from_name,
               e.subject,e.snippet,e.has_attachments
        from public.project_emails e
        where e.project_id=p.id
          and e.sent_at<=now()+interval '5 minutes'
        order by e.sent_at desc
        limit 12
      ) x
    ) recent on true
    left join lateral (
      select jsonb_build_object(
        'gmail_message_id',e.gmail_message_id,
        'sent_at',e.sent_at,
        'from_email',e.from_email,
        'from_name',e.from_name,
        'subject',e.subject,
        'snippet',left(coalesce(e.snippet,''),320),
        'has_attachments',coalesce(e.has_attachments,false)
      ) as latest_incoming
      from public.project_emails e
      where e.project_id=p.id
        and e.direction='incoming'
        and e.sent_at<=now()+interval '5 minutes'
      order by e.sent_at desc
      limit 1
    ) latest_in on true
    left join lateral (
      select jsonb_build_object(
        'gmail_message_id',e.gmail_message_id,
        'sent_at',e.sent_at,
        'subject',e.subject,
        'snippet',left(coalesce(e.snippet,''),320),
        'has_attachments',coalesce(e.has_attachments,false)
      ) as latest_outgoing
      from public.project_emails e
      where e.project_id=p.id
        and e.direction='outgoing'
        and e.sent_at<=now()+interval '5 minutes'
      order by e.sent_at desc
      limit 1
    ) latest_out on true
  )
  insert into public.pppp_project_context_facts as f(
    project_id,category,subject,fact_key,value,source_type,source_ref,
    evidence_status,confidence,fact_status,idempotency_key,created_by,created_at,updated_at
  )
  select
    d.project_id,
    'project_history_digest',
    'Historiku i komunikimit · '||d.project_name,
    'project.history.digest.v1',
    jsonb_build_object(
      'summary',format(
        'Historiku canonical i komunikimit për %s përmban %s email-e të lidhura (%s hyrëse, %s dalëse), nga %s deri më %s. Ky digest është vetëm memorie backstage; nuk krijon task, nuk ndryshon state dhe nuk kryen veprim të jashtëm.',
        d.project_name,
        d.email_count,
        d.incoming_count,
        d.outgoing_count,
        coalesce(to_char(d.first_email_at at time zone 'Europe/Belgrade','YYYY-MM-DD'),'—'),
        coalesce(to_char(d.last_email_at at time zone 'Europe/Belgrade','YYYY-MM-DD'),'—')
      ),
      'memory_only',true,
      'home_visible',false,
      'action_required',false,
      'project_name',d.project_name,
      'project_status',d.project_status,
      'operational_state',d.operational_state,
      'email_count',d.email_count,
      'incoming_count',d.incoming_count,
      'outgoing_count',d.outgoing_count,
      'attachment_email_count',d.attachment_email_count,
      'first_email_at',d.first_email_at,
      'last_email_at',d.last_email_at,
      'top_incoming_senders',d.top_senders,
      'subject_threads',d.subject_threads,
      'latest_incoming',d.latest_incoming,
      'latest_outgoing',d.latest_outgoing,
      'recent_events',d.recent_events,
      'source_signature',d.source_signature,
      'generated_at',now()
    ),
    'system',
    'project:'||d.project_id::text||':history-digest-v1',
    'observed',
    1,
    'observed',
    'project-history-digest-v1:'||d.project_id::text,
    'pppp-project-history-digest-v1',
    now(),
    now()
  from digest d
  on conflict (idempotency_key) where idempotency_key is not null
  do update set
    category=excluded.category,
    subject=excluded.subject,
    fact_key=excluded.fact_key,
    value=excluded.value,
    source_type=excluded.source_type,
    source_ref=excluded.source_ref,
    evidence_status=excluded.evidence_status,
    confidence=excluded.confidence,
    fact_status='observed',
    supersedes_id=null,
    updated_at=now(),
    created_by=excluded.created_by
  where coalesce(f.value->>'source_signature','') is distinct from coalesce(excluded.value->>'source_signature','')
     or f.fact_status is distinct from 'observed';

  get diagnostics v_rows=row_count;

  select count(*)::integer into v_projects
  from public.projects p
  where (p_project_id is null or p.id=p_project_id)
    and lower(coalesce(p.status,'')) not in (
      'humbur','lost','arkivuar','archived','mbyllur','closed','closedlost',
      'cancelled','canceled','realizuar'
    )
    and exists(
      select 1 from public.project_emails e
      where e.project_id=p.id and e.sent_at<=now()+interval '5 minutes'
    );

  return jsonb_build_object(
    'ok',true,
    'projects_considered',v_projects,
    'digests_inserted_or_updated',v_rows,
    'generated_at',now()
  );
end;
$function$;

revoke all on function public.pppp_refresh_project_history_digest_v1(uuid)
  from public,anon,authenticated;
grant execute on function public.pppp_refresh_project_history_digest_v1(uuid)
  to service_role;

comment on function public.pppp_refresh_project_history_digest_v1(uuid) is
  'Maintains one deterministic backstage project-history context fact from canonical linked Gmail history. It never creates actions or changes project state.';

-- Keep the digest current without invoking an AI model. Existing live event
-- intelligence still owns new-event reasoning; this job only refreshes history memory.
do $block$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname='project-history-digest-30m'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'project-history-digest-30m',
    '22,52 * * * *',
    $cmd$select public.pppp_refresh_project_history_digest_v1(null);$cmd$
  );
end;
$block$;

-- Initial bounded backfill: one fact per active/non-terminal project with linked
-- Gmail history. No historical email is replayed as a current event.
select public.pppp_refresh_project_history_digest_v1(null);
