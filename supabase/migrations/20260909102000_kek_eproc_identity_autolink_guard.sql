-- Keep shared e-Prokurimi notifications out of generic project identity matching.
-- Explicitly detached rows must remain detached until a stronger procurement-specific reconciler or human review resolves them.

create or replace function public.pppp_project_email_identity_autolink_v1(p_limit integer default 500)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_linked integer := 0;
begin
  with active_projects as (
    select p.id,p.name,p.ref,p.business_ref,p.identity_aliases
    from public.projects p
    where lower(coalesce(p.status,'')) not in ('humbur','arkivuar','mbyllur','realizuar','closed','lost','cancelled','canceled')
  ), raw_identity as (
    select p.id as project_id, trim(x) as raw
    from active_projects p
    cross join lateral unnest(array_remove(array_cat(array[p.name,p.ref,p.business_ref],coalesce(p.identity_aliases,array[]::text[])),null)) x
  ), phrase_identity as (
    select project_id,lower(regexp_replace(raw,'[^a-zA-Z0-9]+',' ','g')) ident
    from raw_identity where length(trim(raw))>=8
  ), unique_phrases as (
    select ident,min(project_id::text)::uuid project_id
    from phrase_identity
    where length(trim(ident))>=8 and ident not in ('early warning and alarm system')
    group by ident having count(distinct project_id)=1
  ), acronym_raw as (
    select r.project_id,m[2] token
    from raw_identity r
    cross join lateral regexp_matches(r.raw,'(^|[^A-Z0-9])([A-Z][A-Z0-9-]{3,})([^A-Z0-9]|$)','g') m
  ), acronym_identity as (
    select project_id,upper(regexp_replace(token,'[^A-Z0-9]','','g')) token
    from acronym_raw
    where length(regexp_replace(token,'[^A-Z0-9]','','g')) between 4 and 18
  ), unique_acronyms as (
    select token,min(project_id::text)::uuid project_id
    from acronym_identity
    where token not in ('GMBH','SHPK','SHQIP','KOSOVO','EURO','STEEL','PRISTEEL','PROJEKT','PROJECT','OFFER','OFERTA','TENDER','SYSTEM','ALARM')
    group by token having count(distinct project_id)=1
  ), inbox as (
    select e.*,
           lower(regexp_replace(coalesce(e.subject,''),'[^a-zA-Z0-9]+',' ','g')) subj_norm,
           lower(regexp_replace(coalesce(e.snippet,''),'[^a-zA-Z0-9]+',' ','g')) body_norm,
           upper(regexp_replace(coalesce(e.subject,''),'[^A-Za-z0-9]+',' ','g')) subj_upper
    from public.project_emails e
    where e.project_id is null
      and e.id in (select id from public.project_emails where project_id is null order by sent_at desc nulls last limit greatest(1,least(p_limit,2000)))
      and lower(coalesce(e.from_email,'')) !~ '(ted-no-reply|dmarc|noreply-dmarc|email\\.openai|tm\\.openai|supabase\\.com|bitrix24\\.com|apps-scripts-notifications)'
      and lower(trim(coalesce(e.from_email,''))) <> 'eprokurimi@rks-gov.net'
      and coalesce(e.match_method,'') not like 'project-contact-unique-detached%'
  ), phrase_hits as (
    select i.id,u.project_id,98 score,'unique_identity_phrase' method
    from inbox i join unique_phrases u on (' '||i.subj_norm||' ') like '% '||u.ident||' %'
    union all
    select i.id,u.project_id,95 score,'unique_identity_phrase_body' method
    from inbox i join unique_phrases u on i.direction='incoming' and (' '||i.body_norm||' ') like '% '||u.ident||' %'
  ), acronym_hits as (
    select i.id,u.project_id,97 score,'unique_project_acronym_subject' method
    from inbox i join unique_acronyms u on (' '||i.subj_upper||' ') like '% '||u.token||' %'
  ), candidates as (
    select * from phrase_hits union all select * from acronym_hits
  ), grouped as (
    select id,project_id,max(score) score,(array_agg(method order by score desc))[1] method
    from candidates group by id,project_id
  ), winners as (
    select distinct on (g.id) g.id,g.project_id,g.score,g.method
    from grouped g
    join (select id,count(*) project_count from grouped group by id) c using(id)
    where c.project_count=1 and g.score>=95
    order by g.id,g.score desc
  ), updated as (
    update public.project_emails e
       set project_id=w.project_id,suggested_project_id=w.project_id,
           match_method='identity-autolink-v1:'||w.method,match_confidence=w.score,
           needs_review=false,review_reason=null,updated_at=now()
      from winners w where e.id=w.id and e.project_id is null
    returning e.id,e.project_id,e.gmail_message_id,e.gmail_thread_id,e.match_confidence
  ), linked as (
    insert into public.project_email_links(project_id,gmail_message_id,gmail_thread_id,link_method,confidence,created_at)
    select u.project_id::text,u.gmail_message_id,u.gmail_thread_id,'identity-autolink-v1',u.match_confidence,now()
    from updated u
    where coalesce(u.gmail_message_id,'')<>'' and not exists (
      select 1 from public.project_email_links l where l.project_id=u.project_id::text and l.gmail_message_id=u.gmail_message_id)
    returning 1
  )
  select count(*) into v_linked from updated;
  return jsonb_build_object('ok',true,'linked',v_linked,'ran_at',now());
end;
$function$;

-- Re-clean only the three proven KEK-26-6443-5-2-1 notifications from the KEK-26-6946-5-1-1 reservoir project.
do $cleanup$
declare
  v_project uuid;
  v_last_real_email timestamptz;
  v_wrong text[] := array['1a080d5fbb8d333f','1a080d584ef2fdc0','1a080d543aa66a33'];
begin
  select id into v_project
  from public.projects
  where ref='KEK-26-6946-5-1-1' or business_ref='KEK-26-6946-5-1-1'
  order by created_at desc
  limit 1;

  if v_project is null then raise exception 'KEK-26-6946-5-1-1 project not found'; end if;

  delete from public.project_email_links
   where project_id::text=v_project::text and gmail_message_id=any(v_wrong);
  delete from public.project_attachment_links
   where project_id::text=v_project::text and gmail_message_id=any(v_wrong);
  delete from public.pppp_project_context_facts
   where project_id=v_project and source_ref=any(v_wrong);
  delete from public.tasks
   where project_id=v_project and source='semantic_brain_auto'
     and source_ref=any(array['email:event:'||v_wrong[1],'email:event:'||v_wrong[2],'email:event:'||v_wrong[3]]);

  update public.project_emails
     set project_id=null,
         suggested_project_id=null,
         match_method='project-contact-unique-detached:kek-6443-cleanup-v2',
         match_confidence=0,
         needs_review=true,
         review_reason='Belongs to KEK-26-6443-5-2-1 (Kosova A reactors), not KEK-26-6946-5-1-1. No canonical PPPP project exists yet.',
         updated_at=now()
   where gmail_message_id=any(v_wrong);

  select max(sent_at) into v_last_real_email
  from public.project_emails
  where project_id=v_project and sent_at <= now() + interval '5 minutes';

  update public.projects
     set operational_state='wait_for_supplier',
         operational_state_at=coalesce(v_last_real_email,now()),
         operational_state_source='kek_supplier_wait_reconcile_v2',
         last_email_at=v_last_real_email,
         last_activity_at=coalesce(v_last_real_email,created_at),
         updated_at=now()
   where id=v_project;
end;
$cleanup$;
