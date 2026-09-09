-- PPPP tender dossier integrity P0 follow-up
-- Preserve canonical/manual archives during ordinary refreshes, while allowing an
-- explicit operator cleanup of a proven contaminated archive.

create or replace function public.pppp_tender_preserve_canonical_dossier_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_old_ready boolean := public.pppp_tender_canonical_protected_ready_v1(coalesce(old.payload, '{}'::jsonb));
  v_new_ready boolean := public.pppp_tender_canonical_protected_ready_v1(coalesce(new.payload, '{}'::jsonb));
  v_force_cleanup boolean := coalesce(new.payload #>> '{dossier_integrity,force_archive_cleanup}', 'false') = 'true';
  v_integrity jsonb;
begin
  new.payload := coalesce(new.payload, '{}'::jsonb);

  -- This escape hatch is intentionally explicit and self-clearing. It exists only
  -- for verified contamination cleanup; ordinary public refreshes never set it.
  if v_force_cleanup then
    v_integrity := case
      when jsonb_typeof(new.payload -> 'dossier_integrity') = 'object' then new.payload -> 'dossier_integrity'
      else '{}'::jsonb
    end;
    v_integrity := v_integrity - 'force_archive_cleanup';
    new.payload := jsonb_set(new.payload, '{dossier_integrity}', v_integrity, true);
  end if;

  if v_old_ready and not v_new_ready and not v_force_cleanup then
    new.payload := new.payload || jsonb_build_object(
      'dossier_analysis', old.payload -> 'dossier_analysis',
      'dossier_analysis_version', old.payload -> 'dossier_analysis_version',
      'dossier_analyzed_at', old.payload -> 'dossier_analyzed_at',
      'dossier_documents', old.payload -> 'dossier_documents',
      'dossier_analysis_status', 'ready',
      'protected_archive_analyzed_at', old.payload -> 'protected_archive_analyzed_at',
      'protected_archive_analysis_version', old.payload -> 'protected_archive_analysis_version'
    );

    if jsonb_typeof(old.payload -> 'dossier_integrity') = 'object' then
      new.payload := jsonb_set(
        new.payload,
        '{dossier_integrity}',
        case when jsonb_typeof(new.payload -> 'dossier_integrity') = 'object' then new.payload -> 'dossier_integrity' else '{}'::jsonb end
        || old.payload -> 'dossier_integrity'
        || jsonb_build_object(
          'canonical_rank', 100,
          'canonical_archive_present', true,
          'downgrade_prevented_at', now()
        ),
        true
      );
    else
      new.payload := jsonb_set(
        new.payload,
        '{dossier_integrity}',
        case when jsonb_typeof(new.payload -> 'dossier_integrity') = 'object' then new.payload -> 'dossier_integrity' else '{}'::jsonb end
        || jsonb_build_object(
          'version', 'v2',
          'canonical_rank', 100,
          'canonical_archive_present', true,
          'downgrade_prevented_at', now()
        ),
        true
      );
    end if;
  end if;

  -- Never silently drop an authenticated archive during an unrelated public refresh.
  -- A proven-contamination cleanup must opt in through the self-clearing flag above.
  if not v_force_cleanup
     and public.pppp_tender_archive_count_v1(coalesce(old.payload, '{}'::jsonb)) > 0
     and public.pppp_tender_archive_count_v1(coalesce(new.payload, '{}'::jsonb)) = 0 then
    new.payload := jsonb_set(new.payload, '{protected_archive}', old.payload -> 'protected_archive', true);
    if old.payload ? 'protected_archive_updated_at' then
      new.payload := new.payload || jsonb_build_object('protected_archive_updated_at', old.payload -> 'protected_archive_updated_at');
    end if;
    if old.payload ? 'protected_archive_import_version' then
      new.payload := new.payload || jsonb_build_object('protected_archive_import_version', old.payload -> 'protected_archive_import_version');
    end if;
    if old.payload ? 'protected_archive_imported_at' then
      new.payload := new.payload || jsonb_build_object('protected_archive_imported_at', old.payload -> 'protected_archive_imported_at');
    end if;
  end if;

  return new;
end;
$$;

comment on function public.pppp_tender_preserve_canonical_dossier_v1() is
'PPPP P0 guard: prevents weaker public refreshes from overwriting canonical/manual dossier state; an explicit self-clearing force_archive_cleanup flag permits verified contamination cleanup.';
