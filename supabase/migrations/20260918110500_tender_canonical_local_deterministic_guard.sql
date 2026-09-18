create or replace function public.pppp_tender_canonical_protected_ready_v1(p_payload jsonb)
returns boolean
language sql
immutable
set search_path to 'pg_catalog','public'
as $function$
  select
    coalesce(p_payload #>> '{dossier_analysis,file_mode}', '') = 'authenticated_protected_archive'
    and coalesce(p_payload #>> '{dossier_analysis,dossier_complete}', 'false') = 'true'
    and case
      when jsonb_typeof(p_payload #> '{dossier_analysis,files_analyzed}') = 'array'
        then jsonb_array_length(p_payload #> '{dossier_analysis,files_analyzed}') > 0
      else false
    end
    and coalesce(p_payload #>> '{dossier_analysis,provider,name}', '') in ('openai','local_deterministic');
$function$;

comment on function public.pppp_tender_canonical_protected_ready_v1(jsonb) is
'Canonical protected dossier readiness. Accepts OpenAI or the bounded local_deterministic analyzer; public metadata deterministic output is intentionally excluded.';
