-- PRISTEEL canonical project reference backfill
-- High-confidence mappings only. Legacy ref is never changed.

begin;

update public.projects set business_ref='PST-RFQ-2026-JOLA-01'
where business_ref is null and btrim(ref)='PST-RFQ-2026-JOLA-01';

update public.projects set business_ref='PST-GEI-001/26'
where business_ref is null and ref like 'PST-GEI-001/26%';

update public.projects set business_ref='ANF 8915'
where business_ref is null and btrim(ref)='ANF 8915';

update public.projects set business_ref='25007HH'
where business_ref is null and ref ilike '%Projekt-/Auftragsnummer:%25007HH%';

update public.projects set business_ref='411320-KR'
where business_ref is null and ref ilike 'Projekt 411320-KR%';

update public.projects set business_ref='PST-SSP-SC-001/2026'
where business_ref is null and ref like 'PST-SSP-SC-001/2026%';

update public.projects set business_ref='TED LOT-0001'
where business_ref is null and ref like 'TED LOT-0001%';

update public.projects set business_ref='PST-HH-001'
where business_ref is null and ref like 'PST-HH-001%';

update public.projects set business_ref='D-26/Sindelfingen-01'
where business_ref is null and ref like 'D-26/Sindelfingen-01%';

update public.projects set business_ref='D-23/26'
where business_ref is null and ref like 'D-23/26%';

update public.projects set business_ref='D-22/26'
where business_ref is null and regexp_replace(btrim(ref),'\s+','','g')='D-22/26';

commit;
