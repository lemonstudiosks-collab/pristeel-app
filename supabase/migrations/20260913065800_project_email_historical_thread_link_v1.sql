-- Safe historical email linking for unique Gmail threads.
--
-- Historical backfills enrich project memory/search context only. They must not
-- replay old email events into current operational state, project recency, RFQs,
-- supplier offers, tasks, or project decisions.

-- Keep the existing operational trigger functions unchanged, but do not run
-- them when an email is linked explicitly through the historical-only path.
drop trigger if exists pppp_project_email_activity on public.project_emails;
create trigger pppp_project_email_activity
after insert or update of project_id, sent_at
on public.project_emails
for each row
when (coalesce(new.match_method, '') not like 'historical-link-only:%')
execute function public.pppp_touch_project_from_email();

drop trigger if exists trg_pppp_project_email_event_engine_v1 on public.project_emails;
create trigger trg_pppp_project_email_event_engine_v1
after insert or update of project_id, subject, snippet, direction, from_email, has_attachments
on public.project_emails
for each row
when (coalesce(new.match_method, '') not like 'historical-link-only:%')
execute function public.pppp_project_email_event_engine_v1();

drop trigger if exists trg_pppp_project_email_z_current_state_v1 on public.project_emails;
create trigger trg_pppp_project_email_z_current_state_v1
after insert or update of project_id, direction, sent_at, from_email, to_emails, subject, snippet
on public.project_emails
for each row
when (coalesce(new.match_method, '') not like 'historical-link-only:%')
execute function public.pppp_project_email_current_state_v1();

drop trigger if exists trg_pppp_supplier_email_rate_reactivity on public.project_emails;
create trigger trg_pppp_supplier_email_rate_reactivity
after insert or update of project_id, snippet
on public.project_emails
for each row
when (coalesce(new.match_method, '') not like 'historical-link-only:%')
execute function public.pppp_supplier_email_rate_reactivity();

create or replace function public.pppp_project_email_thread_history_reconcile_v1(
  p_limit integer default 200
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_attempted integer := 0;
  v_linked integer := 0;
begin
  with thread_projects as (
    select
      e.gmail_thread_id,
      min(e.project_id::text)::uuid as project_id
    from public.project_emails e
    where e.project_id is not null
      and coalesce(e.gmail_thread_id, '') <> ''
    group by e.gmail_thread_id
    having count(distinct e.project_id) = 1
  ), candidates as (
    select e.id, tp.project_id
    from public.project_emails e
    join thread_projects tp
      on tp.gmail_thread_id = e.gmail_thread_id
    join public.projects p
      on p.id = tp.project_id
    where e.project_id is null
      and coalesce(e.gmail_thread_id, '') <> ''
      and coalesce(e.sent_at, e.created_at) < now() - interval '14 days'
      and not public.pppp_project_status_is_terminal_v1(p.status)
      and coalesce(e.match_method, '') not like 'project-contact-unique-detached%'
      and lower(coalesce(e.from_email, '')) !~ '(mailer-daemon|postmaster|ted-no-reply|dmarc|noreply-dmarc|email\.openai|tm\.openai|supabase\.com|bitrix24\.com|apps-scripts-notifications)'
      and lower(trim(coalesce(e.from_email, ''))) <> 'eprokurimi@rks-gov.net'
    order by coalesce(e.sent_at, e.created_at) desc, e.id desc
    limit greatest(1, least(coalesce(p_limit, 200), 1000))
  ), updated as (
    update public.project_emails e
       set project_id = c.project_id,
           suggested_project_id = c.project_id,
           match_method = 'historical-link-only:unique-thread-v1',
           match_confidence = 99,
           needs_review = false,
           review_reason = null,
           updated_at = now()
      from candidates c
     where e.id = c.id
       and e.project_id is null
    returning e.project_id
  )
  select count(*)::integer,
         count(*) filter (where project_id is not null)::integer
    into v_attempted, v_linked
    from updated;

  return jsonb_build_object(
    'ok', true,
    'attempted', v_attempted,
    'linked', v_linked,
    'blocked_or_skipped', greatest(v_attempted - v_linked, 0),
    'method', 'historical-link-only:unique-thread-v1',
    'minimum_age_days', 14,
    'ran_at', now()
  );
end;
$$;

revoke all on function public.pppp_project_email_thread_history_reconcile_v1(integer)
  from public, anon, authenticated;
grant execute on function public.pppp_project_email_thread_history_reconcile_v1(integer)
  to service_role;
