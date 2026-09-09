-- PPPP tender dossier integrity P0
-- 1) once an authenticated/manual archive has produced a complete canonical analysis,
--    public metadata refreshes may not replace it with a weaker snapshot;
-- 2) the authenticated-fetch queue may not be re-opened merely because KRPP still
--    protects the same files after the canonical archive is complete.

create or replace function public.pppp_tender_canonical_protected_ready_v1(p_payload jsonb)
returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select
    coalesce(p_payload #>> '{dossier_analysis,file_mode}', '') = 'authenticated_protected_archive'
    and coalesce(p_payload #>> '{dossier_analysis,dossier_complete}', 'false') = 'true'
    and case
      when jsonb_typeof(p_payload #> '{dossier_analysis,files_analyzed}') = 'array'
        then jsonb_array_length(p_payload #> '{dossier_analysis,files_analyzed}') > 0
      else false
    end
    and coalesce(p_payload #>> '{dossier_analysis,provider,name}', '') = 'openai';
$$;

create or replace function public.pppp_tender_archive_count_v1(p_payload jsonb)
returns integer
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case
    when jsonb_typeof(p_payload -> 'protected_archive') = 'array'
      then jsonb_array_length(p_payload -> 'protected_archive')
    when jsonb_typeof(p_payload #> '{protected_archive,documents}') = 'array'
      then jsonb_array_length(p_payload #> '{protected_archive,documents}')
    else 0
  end;
$$;

create or replace function public.pppp_tender_preserve_canonical_dossier_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_old_ready boolean := public.pppp_tender_canonical_protected_ready_v1(coalesce(old.payload, '{}'::jsonb));
  v_new_ready boolean := public.pppp_tender_canonical_protected_ready_v1(coalesce(new.payload, '{}'::jsonb));
begin
  new.payload := coalesce(new.payload, '{}'::jsonb);

  if v_old_ready and not v_new_ready then
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
  if public.pppp_tender_archive_count_v1(coalesce(old.payload, '{}'::jsonb)) > 0
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

drop trigger if exists trg_pppp_tender_preserve_canonical_dossier_v1 on public.kek_tender_watch;
create trigger trg_pppp_tender_preserve_canonical_dossier_v1
before update of payload on public.kek_tender_watch
for each row
execute function public.pppp_tender_preserve_canonical_dossier_v1();

create or replace function public.pppp_tender_fetch_queue_no_canonical_reopen_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_payload jsonb;
  v_ready boolean := false;
begin
  select coalesce(payload, '{}'::jsonb)
  into v_payload
  from public.kek_tender_watch
  where id = new.tender_watch_id;

  v_ready := public.pppp_tender_canonical_protected_ready_v1(coalesce(v_payload, '{}'::jsonb));

  if v_ready
     and (
       coalesce(new.auth_required, false)
       or new.status in ('queued', 'retry', 'processing')
     )
     and coalesce(new.payload ->> 'force_authenticated_refetch', 'false') <> 'true' then
    new.status := case
      when old.status in ('analyzed', 'ready') then old.status
      else 'analyzed'
    end;
    new.auth_required := false;
    new.last_error := null;
    new.payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object(
      'canonical_archive_guard', 'preserved',
      'canonical_archive_guard_at', now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pppp_tender_fetch_queue_no_canonical_reopen_v1 on public.pppp_tender_fetch_queue;
create trigger trg_pppp_tender_fetch_queue_no_canonical_reopen_v1
before update of status, auth_required, payload on public.pppp_tender_fetch_queue
for each row
execute function public.pppp_tender_fetch_queue_no_canonical_reopen_v1();

comment on function public.pppp_tender_canonical_protected_ready_v1(jsonb) is
'PPPP P0 guard: true only for complete OpenAI analysis from authenticated protected archive.';
comment on function public.pppp_tender_archive_count_v1(jsonb) is
'PPPP P0 helper: counts protected archive entries for both legacy array and object-with-documents shapes.';
comment on function public.pppp_tender_preserve_canonical_dossier_v1() is
'PPPP P0 guard: prevents weaker public/metadata refreshes from overwriting a complete authenticated tender dossier analysis.';
comment on function public.pppp_tender_fetch_queue_no_canonical_reopen_v1() is
'PPPP P0 guard: prevents KRPP auth queue from reopening after a complete canonical authenticated archive exists.';