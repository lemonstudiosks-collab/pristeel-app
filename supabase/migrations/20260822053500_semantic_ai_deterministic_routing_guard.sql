-- Local AI may explain/rank, but supplier eligibility filters must come from deterministic PPPP truth.
create or replace function public.pppp_semantic_routing_truth_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_grades jsonb := '[]'::jsonb;
  v_caps jsonb := '[]'::jsonb;
begin
  if coalesce(new.state,'') <> 'completed' or new.result is null then return new; end if;
  v_grades := coalesce(new.payload->'deterministic'->'required_grades','[]'::jsonb);
  v_caps := coalesce(new.payload->'deterministic'->'required_capabilities','[]'::jsonb);
  new.result := jsonb_set(new.result,'{required_grades}',v_grades,true);
  new.result := jsonb_set(new.result,'{required_capabilities}',v_caps,true);
  return new;
end;
$$;

drop trigger if exists pppp_semantic_routing_truth_guard on public.semantic_ai_jobs;
create trigger pppp_semantic_routing_truth_guard
before insert or update of state,result,payload on public.semantic_ai_jobs
for each row execute function public.pppp_semantic_routing_truth_guard();
