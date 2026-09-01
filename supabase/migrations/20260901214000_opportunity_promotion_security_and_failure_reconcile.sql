-- Restrict canonical-project promotion to backend service ownership only.
revoke all on function public.pppp_tender_project_promotion_reconcile_v2(boolean, integer) from public;
revoke execute on function public.pppp_tender_project_promotion_reconcile_v2(boolean, integer) from anon, authenticated;
grant execute on function public.pppp_tender_project_promotion_reconcile_v2(boolean, integer) to service_role;

-- A successful dossier version proves the previous analysis failure has recovered.
create or replace function private.pppp_resolve_dossier_analysis_failure_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  update public.pppp_opportunity_actions
  set status = 'resolved',
      payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
        'resolved_at', now(),
        'resolved_by', 'dossier_version_insert',
        'resolved_dossier_fingerprint', new.fingerprint
      ),
      updated_at = now()
  where tender_watch_id = new.tender_watch_id
    and action_type = 'dossier_analysis_failure'
    and status is distinct from 'resolved';
  return new;
end;
$$;

drop trigger if exists pppp_resolve_dossier_analysis_failure_v1_trg on public.pppp_tender_dossier_versions;
create trigger pppp_resolve_dossier_analysis_failure_v1_trg
after insert on public.pppp_tender_dossier_versions
for each row
execute function private.pppp_resolve_dossier_analysis_failure_v1();
