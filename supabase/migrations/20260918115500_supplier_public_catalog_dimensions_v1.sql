alter table public.pppp_supplier_public_catalog_v1
  add column if not exists max_wall_mm numeric,
  add column if not exists verified_dimensions jsonb not null default '[]'::jsonb;

update public.pppp_supplier_public_catalog_v1
set max_outer_diameter_mm=610,
    evidence_note='Official site states seamless steel pipe supply from 17.2 mm to 610 mm OD, EN 10204 3.1/3.2 mill certificates and ISO 9001 compliance; public sales email is listed.',
    updated_at=now()
where canonical_key='pera-pipe-seamless';

update public.pppp_supplier_public_catalog_v1
set max_wall_mm=60,
    updated_at=now()
where canonical_key='metalfromturkey-seamless';

update public.pppp_supplier_public_catalog_v1
set verified_dimensions='[
      {"outer_diameter_mm":82.5,"wall_mm":12.5,"evidence":"official dimensional table"},
      {"outer_diameter_mm":88.9,"wall_mm":10.0,"evidence":"official dimensional table"}
    ]'::jsonb,
    evidence_note='Official ARTROM pages identify a seamless steel tube manufacturer with ISO 9001 and EN 10204 3.1 documentation. Official dimensional tables include OD 82.5 mm with 12.5 mm wall and OD 88.9 mm with 10 mm wall.',
    updated_at=now()
where canonical_key='artrom-seamless';
