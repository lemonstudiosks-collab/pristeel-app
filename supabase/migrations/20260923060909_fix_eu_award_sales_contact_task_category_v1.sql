-- The canonical tasks category is Albanian (`klient`), not `client`.
-- Replace only the exact category tuple in the already-deployed promotion RPC.
do $do$
declare
  v_definition text;
  v_fixed text;
begin
  select pg_get_functiondef(
    'public.pppp_promote_ted_award_to_sales_project_v1(uuid)'::regprocedure
  ) into v_definition;

  v_fixed := replace(
    v_definition,
    $old$'pppp_v2_eu_award_sales', 'client',$old$,
    $new$'pppp_v2_eu_award_sales', 'klient',$new$
  );

  if v_fixed = v_definition then
    if position($ok$'pppp_v2_eu_award_sales', 'klient'$ok$ in v_definition) = 0 then
      raise exception 'eu_award_sales_category_patch_target_not_found';
    end if;
  else
    execute v_fixed;
  end if;
end;
$do$;
