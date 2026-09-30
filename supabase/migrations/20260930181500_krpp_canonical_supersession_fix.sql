-- Make KRPP amendment/retender supersession independent of upsert order.

create or replace function public.pppp_krpp_supersede_prior_notices_v2()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_latest_id uuid;
begin
  if pg_trigger_depth() > 1 then return new; end if;
  if upper(coalesce(new.payload->>'source', 'KRPP')) <> 'KRPP'
     or nullif(new.procurement_no, '') is null then
    return new;
  end if;

  select current_notice.id
    into v_latest_id
  from public.kek_tender_watch current_notice
  where upper(coalesce(current_notice.payload->>'source', 'KRPP')) = 'KRPP'
    and current_notice.procurement_no = new.procurement_no
  order by coalesce(current_notice.published_date, current_notice.first_seen_at::date, date '0001-01-01') desc,
           coalesce(current_notice.first_seen_at, current_notice.created_at) desc,
           current_notice.created_at desc,
           current_notice.id desc
  limit 1;

  update public.kek_tender_watch prior
     set status = 'ignored',
         payload = coalesce(prior.payload, '{}'::jsonb) || jsonb_build_object(
           'krpp_superseded_by', v_latest_id,
           'krpp_superseded_at', now()
         ),
         updated_at = greatest(prior.updated_at, now())
   where prior.id <> v_latest_id
     and upper(coalesce(prior.payload->>'source', 'KRPP')) = 'KRPP'
     and prior.procurement_no = new.procurement_no
     and prior.project_id is null
     and coalesce(prior.status, 'new') <> 'promoted'
     and (
       prior.status is distinct from 'ignored'
       or coalesce(prior.payload->>'krpp_superseded_by', '') <> v_latest_id::text
     );
  return new;
end
$function$;

revoke all on function public.pppp_krpp_supersede_prior_notices_v2() from public, anon, authenticated;
grant execute on function public.pppp_krpp_supersede_prior_notices_v2() to service_role;

with ranked as (
  select t.id,
         first_value(t.id) over (
           partition by t.procurement_no
           order by coalesce(t.published_date, t.first_seen_at::date, date '0001-01-01') desc,
                    coalesce(t.first_seen_at, t.created_at) desc,
                    t.created_at desc,
                    t.id desc
         ) latest_id,
         row_number() over (
           partition by t.procurement_no
           order by coalesce(t.published_date, t.first_seen_at::date, date '0001-01-01') desc,
                    coalesce(t.first_seen_at, t.created_at) desc,
                    t.created_at desc,
                    t.id desc
         ) identity_rank
  from public.kek_tender_watch t
  where upper(coalesce(t.payload->>'source', '')) = 'KRPP'
    and nullif(t.procurement_no, '') is not null
)
update public.kek_tender_watch prior
   set status = 'ignored',
       payload = coalesce(prior.payload, '{}'::jsonb) || jsonb_build_object(
         'krpp_superseded_by', ranked.latest_id,
         'krpp_superseded_at', now()
       ),
       updated_at = greatest(prior.updated_at, now())
from ranked
where prior.id = ranked.id
  and ranked.identity_rank > 1
  and prior.project_id is null
  and coalesce(prior.status, 'new') <> 'promoted'
  and (
    prior.status is distinct from 'ignored'
    or coalesce(prior.payload->>'krpp_superseded_by', '') <> ranked.latest_id::text
  );
