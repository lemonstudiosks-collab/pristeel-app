-- Keep material-only heavy-plate projects away from fabricator routing.
create or replace function public.pppp_semantic_material_routing_scope_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_text text := '';
  v_caps jsonb := '[]'::jsonb;
  v_profiles jsonb := '[]'::jsonb;
begin
  if new.payload is null then return new; end if;
  v_caps := coalesce(new.payload->'deterministic'->'required_capabilities','[]'::jsonb);
  v_profiles := coalesce(new.payload->'bom'->'profiles','[]'::jsonb);
  select lower(concat_ws(' ',coalesce(name,''),coalesce(notes,''),coalesce(deal_type,'')))
    into v_text from public.projects where id=new.project_id;
  if v_caps ? 'heavy_plate'
     and jsonb_array_length(v_profiles)=0
     and v_text ~ '(heavy[ -]?plate|steel trading|plate import|marine[- ]grade|shipbuilding|marine grade|pllak[aë]?[[:space:]-]*(çel|cel)|material supply)'
  then
    new.payload := jsonb_set(new.payload,'{deterministic,required_capabilities}','["heavy_plate"]'::jsonb,true);
  end if;
  return new;
end;
$$;

drop trigger if exists aaa_pppp_semantic_material_routing_scope_guard on public.semantic_ai_jobs;
create trigger aaa_pppp_semantic_material_routing_scope_guard
before insert or update of payload,project_id on public.semantic_ai_jobs
for each row execute function public.pppp_semantic_material_routing_scope_guard();
