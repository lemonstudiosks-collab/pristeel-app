create or replace function public.pppp_ted_action_communication_guard_v1(
  p_action_id uuid,
  p_recipient_email text,
  p_company_domain text,
  p_exclude_registry_id uuid default null
)
returns jsonb
language plpgsql
stable
set search_path to 'public','pg_temp'
as $function$
declare
  v_guard jsonb;
  v_has_same_action_draft boolean := false;
  v_has_other_conflict boolean := false;
begin
  v_guard := public.pppp_global_communication_guard_v1(
    p_recipient_email,
    p_company_domain,
    'TED',
    p_exclude_registry_id,
    null
  );

  if coalesce((v_guard->>'ok')::boolean,false) then
    return v_guard;
  end if;

  if coalesce(v_guard->>'reason','') not in (
    'cross_source_active_recipient_outreach',
    'cross_source_active_domain_outreach'
  ) then
    return v_guard;
  end if;

  select
    coalesce(bool_or(
      c->>'source'='TED'
      and c->>'kind'='active_draft'
      and r.action_id=p_action_id
    ),false),
    coalesce(bool_or(not (
      c->>'source'='TED'
      and c->>'kind'='active_draft'
      and r.action_id=p_action_id
    )),false)
  into v_has_same_action_draft,v_has_other_conflict
  from jsonb_array_elements(coalesce(v_guard->'conflicts','[]'::jsonb)) c
  left join public.pppp_opportunity_outreach_registry_v1 r
    on r.id::text=c->>'event_id';

  if v_has_same_action_draft and not v_has_other_conflict then
    return v_guard || jsonb_build_object(
      'ok',true,
      'reason','same_ted_action_draft_batch',
      'same_action_id',p_action_id
    );
  end if;

  return v_guard;
end;
$function$;

revoke all on function public.pppp_ted_action_communication_guard_v1(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.pppp_ted_action_communication_guard_v1(uuid,text,text,uuid) to service_role,supabase_read_only_user;

