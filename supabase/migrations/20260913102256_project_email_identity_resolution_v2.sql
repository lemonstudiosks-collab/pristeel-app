-- State-safe email identity resolution.
--
-- Strong, explicit project identity may link a current email only when the email
-- is newer than the project's canonical operational state. Older evidence is
-- memory-only. Contact/history agreement is useful entity context, but is not
-- project identity and therefore remains a low-confidence review hint only.

create or replace function public.pppp_project_email_identity_autolink_v1(
  p_limit integer default 500
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_linked integer := 0;
  v_historical_linked integer := 0;
  v_review_suggested integer := 0;
  v_contact_suggested integer := 0;
begin
  with active_projects as (
    select p.id,p.name,p.ref,p.business_ref,p.identity_aliases,p.operational_state_at
    from public.projects p
    where not public.pppp_project_status_is_terminal_v1(p.status)
  ), raw_identity as (
    select p.id as project_id, trim(x) as raw
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
  ), unique_phrases as (
    select ident,min(project_id::text)::uuid project_id
    from phrase_identity
    where length(trim(ident))>=8
      and ident not in ('early warning and alarm system')
    group by ident
    having count(distinct project_id)=1
  ), acronym_raw as (
    select r.project_id,m[2] token
    from raw_identity r
    cross join lateral regexp_matches(
      r.raw,
      '(^|[^A-Z0-9])([A-Z][A-Z0-9-]{3,})([^A-Z0-9]|$)',
      'g'
    ) m
  ), acronym_identity as (
    select project_id,upper(regexp_replace(token,'[^A-Z0-9]','','g')) token
    from acronym_raw
    where length(regexp_replace(token,'[^A-Z0-9]','','g')) between 4 and 18
  ), unique_acronyms as (
    select token,min(project_id::text)::uuid project_id
    from acronym_identity
    where token not in (
      'GMBH','SHPK','SHQIP','KOSOVO','EURO','STEEL','PRISTEEL','PROJEKT','PROJECT',
      'OFFER','OFERTA','TENDER','SYSTEM','ALARM'
    )
    group by token
    having count(distinct project_id)=1
  ), contact_unique as (
    select lower(trim(pc.email)) email,min(pc.project_id)::uuid project_id
    from public.project_contacts pc
    join active_projects p on p.id::text=pc.project_id
    where coalesce(trim(pc.email),'')<>''
      and lower(coalesce(pc.status,'active'))='active'
    group by lower(trim(pc.email))
    having count(distinct pc.project_id)=1
  ), sender_history as (
    select lower(trim(e.from_email)) email,min(e.project_id::text)::uuid project_id
    from public.project_emails e
    join active_projects p on p.id=e.project_id
    where e.project_id is not null
      and coalesce(trim(e.from_email),'')<>''
    group by lower(trim(e.from_email))
    having count(distinct e.project_id)=1
  ), recipient_history as (
    select lower(trim(x.email)) email,min(e.project_id::text)::uuid project_id
    from public.project_emails e
    join active_projects p on p.id=e.project_id
    cross join lateral unnest(coalesce(e.to_emails,'{}'::text[])) x(email)
    where e.project_id is not null
      and coalesce(trim(x.email),'')<>''
    group by lower(trim(x.email))
    having count(distinct e.project_id)=1
  ), inbox as (
    select
      e.*,
      coalesce(e.sent_at,e.created_at) event_at,
      lower(regexp_replace(coalesce(e.subject,''),'[^a-zA-Z0-9]+',' ','g')) subj_norm,
      lower(regexp_replace(coalesce(e.snippet,''),'[^a-zA-Z0-9]+',' ','g')) body_norm,
      upper(regexp_replace(coalesce(e.subject,''),'[^A-Za-z0-9]+',' ','g')) subj_upper
    from public.project_emails e
    where e.project_id is null
      and e.id in (
        select id
        from public.project_emails
        where project_id is null
        order by sent_at desc nulls last
        limit greatest(1,least(coalesce(p_limit,500),2000))
      )
      and coalesce(e.sent_at,e.created_at)<=now()+interval '5 minutes'
      and split_part(lower(trim(coalesce(e.from_email,''))),'@',1) !~ '(^|[+._-])(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc)([+._-]|$)'
      and lower(coalesce(e.from_email,'')) !~ '(ted-no-reply|noreply-dmarc|email\.openai|tm\.openai|supabase\.com|bitrix24\.com|apps-scripts-notifications)'
      and lower(trim(coalesce(e.from_email,'')))<>'eprokurimi@rks-gov.net'
      and coalesce(e.match_method,'') not like 'project-contact-unique-detached%'
      and coalesce(e.match_method,'') not like 'system-mail-detached:%'
      and coalesce(e.match_method,'') not in (
        'manual-ignored','mixed-project-review','reference-safety-cleared',
        'historical-overmatch-cleared','historical-gmail-panel-cleared'
      )
  ), phrase_hits as (
    select i.id,u.project_id,98 score,'unique_identity_phrase' method
    from inbox i
    join unique_phrases u on (' '||i.subj_norm||' ') like '% '||u.ident||' %'
    union all
    select i.id,u.project_id,95 score,'unique_identity_phrase_body' method
    from inbox i
    join unique_phrases u on i.direction='incoming'
      and (' '||i.body_norm||' ') like '% '||u.ident||' %'
  ), acronym_hits as (
    select i.id,u.project_id,97 score,'unique_project_acronym_subject' method
    from inbox i
    join unique_acronyms u on (' '||i.subj_upper||' ') like '% '||u.token||' %'
  ), explicit_candidates as (
    select * from phrase_hits
    union all
    select * from acronym_hits
  ), explicit_grouped as (
    select id,project_id,max(score) score,(array_agg(method order by score desc,method))[1] method
    from explicit_candidates
    group by id,project_id
  ), explicit_winners as (
    select g.id,g.project_id,g.score,g.method,i.event_at,p.operational_state_at
    from explicit_grouped g
    join inbox i on i.id=g.id
    join active_projects p on p.id=g.project_id
    join (
      select id,count(*) project_count
      from explicit_grouped
      group by id
    ) c on c.id=g.id
    where c.project_count=1 and g.score>=95
  ), incoming_contact_hits as (
    select i.id,cu.project_id,70 score,'contact_sender_history' method
    from inbox i
    join contact_unique cu on cu.email=lower(trim(i.from_email))
    join sender_history sh on sh.email=lower(trim(i.from_email)) and sh.project_id=cu.project_id
    where i.direction='incoming'
      and i.event_at>=now()-interval '30 days'
  ), outgoing_contact_rows as (
    select i.id,cu.project_id
    from inbox i
    cross join lateral unnest(coalesce(i.to_emails,'{}'::text[])) x(email)
    join contact_unique cu on cu.email=lower(trim(x.email))
    join recipient_history rh on rh.email=lower(trim(x.email)) and rh.project_id=cu.project_id
    where i.direction='outgoing'
      and i.event_at>=now()-interval '30 days'
  ), outgoing_contact_hits as (
    select id,min(project_id::text)::uuid project_id,70 score,'contact_recipient_history' method
    from outgoing_contact_rows
    group by id
    having count(distinct project_id)=1
  ), contact_candidates as (
    select * from incoming_contact_hits
    union all
    select * from outgoing_contact_hits
  ), contact_grouped as (
    select id,project_id,max(score) score,(array_agg(method order by method))[1] method
    from contact_candidates
    group by id,project_id
  ), contact_winners as (
    select g.id,g.project_id,g.score,g.method
    from contact_grouped g
    join (
      select id,count(*) project_count
      from contact_grouped
      group by id
    ) c on c.id=g.id
    where c.project_count=1
      and not exists(select 1 from explicit_winners w where w.id=g.id)
  ), current_updates as (
    update public.project_emails e
       set project_id=w.project_id,
           suggested_project_id=w.project_id,
           match_method='identity-autolink-v2:'||w.method,
           match_confidence=w.score,
           needs_review=false,
           review_reason=null,
           updated_at=now()
      from explicit_winners w
     where e.id=w.id
       and e.project_id is null
       and w.event_at>=now()-interval '7 days'
       and w.event_at<=now()+interval '5 minutes'
       and (w.operational_state_at is null or w.event_at>=w.operational_state_at)
    returning e.id
  ), historical_updates as (
    update public.project_emails e
       set project_id=w.project_id,
           suggested_project_id=w.project_id,
           match_method='historical-link-only:identity-v2:'||w.method,
           match_confidence=w.score,
           needs_review=false,
           review_reason=null,
           updated_at=now()
      from explicit_winners w
     where e.id=w.id
       and e.project_id is null
       and (
         w.event_at<now()-interval '14 days'
         or (w.operational_state_at is not null and w.event_at<w.operational_state_at)
       )
    returning e.id
  ), review_updates as (
    update public.project_emails e
       set suggested_project_id=w.project_id,
           match_method='identity-suggest-v2:'||w.method,
           match_confidence=w.score,
           needs_review=true,
           review_reason='Strong project identity evidence is present, but the email is outside the safe current-action window. Review before project linking.',
           updated_at=now()
      from explicit_winners w
     where e.id=w.id
       and e.project_id is null
       and w.event_at>=now()-interval '14 days'
       and w.event_at<now()-interval '7 days'
       and (w.operational_state_at is null or w.event_at>=w.operational_state_at)
    returning e.id
  ), contact_updates as (
    update public.project_emails e
       set suggested_project_id=w.project_id,
           match_method='entity-history-suggest-v2:'||w.method,
           match_confidence=w.score,
           needs_review=true,
           review_reason='Entity/contact history agrees with one project, but this is not project identity. Confirm from subject, reference, thread, or content before linking.',
           updated_at=now()
      from contact_winners w
     where e.id=w.id
       and e.project_id is null
    returning e.id
  )
  select
    (select count(*) from current_updates),
    (select count(*) from historical_updates),
    (select count(*) from review_updates),
    (select count(*) from contact_updates)
  into v_current_linked,v_historical_linked,v_review_suggested,v_contact_suggested;

  return jsonb_build_object(
    'ok',true,
    'linked',v_current_linked+v_historical_linked,
    'current_linked',v_current_linked,
    'historical_linked',v_historical_linked,
    'review_suggested',v_review_suggested,
    'entity_history_suggested',v_contact_suggested,
    'current_window_days',7,
    'historical_window_days',14,
    'future_guard_minutes',5,
    'ran_at',now()
  );
end;
$$;

revoke all on function public.pppp_project_email_identity_autolink_v1(integer)
  from public,anon,authenticated;
grant execute on function public.pppp_project_email_identity_autolink_v1(integer)
  to service_role;
