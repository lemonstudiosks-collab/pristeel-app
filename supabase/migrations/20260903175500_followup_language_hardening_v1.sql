begin;

-- Follow-up language must be inferred from the user's direct wording, not from forwarded
-- tender/project terminology. Keep the signals high precision so e.g. Albanian 'projektin'
-- cannot be mistaken for German merely because it contains 'projekt'.
create or replace function public.pppp_followup_language_v1(p_subject text,p_snippet text)
returns text
language sql
immutable
set search_path=pg_catalog
as $$
  with x as (
    select lower(coalesce(p_subject,'')||' '||coalesce(p_snippet,'')) as s
  )
  select case
    when s ~ '(përsh|persh|mirëmëngjes|miremengjes|mirëdita|miredita|faleminder|të lutem|te lutem|gjithë të mirat|gjithe te mirat|çdo të mirë|cdo te mire|bashkëngjit|bashkengjit|kërkesë|kerkese)' then 'sq'
    when s ~ '(poštovan|postovan|hvala|molim|ponud|zahtjev|zahtev|srdačan|srdacan|revidovana|dostavljamo)' then 'sr'
    when s ~ '(guten tag|sehr geehrt|mit freundlichen|vielen dank|bitte|anfrage|angebot|lieferzeit|könnten|koennten|rückmeldung|rueckmeldung)' then 'de'
    else 'en'
  end
  from x;
$$;

-- Recompute unsent and draft-ready follow-up metadata using the corrected classifier.
update public.pppp_followup_drafts_v1
   set lang=public.pppp_followup_language_v1(last_outgoing_subject,last_outgoing_snippet),
       updated_at=now()
 where status in ('candidate','draft_ready');

commit;
