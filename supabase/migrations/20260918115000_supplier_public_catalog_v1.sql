create table if not exists public.pppp_supplier_public_catalog_v1 (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null unique,
  name text not null,
  country text,
  source_tier text not null default 'eu' check (source_tier in ('local','regional','turkey','greece','eu')),
  families text[] not null default '{}',
  product_focus text,
  grades text[] not null default '{}',
  standards text[] not null default '{}',
  certifications text[] not null default '{}',
  max_diameter_mm numeric,
  max_outer_diameter_mm numeric,
  email text,
  website text,
  evidence_url text not null,
  contact_url text,
  evidence_note text not null,
  verification_status text not null default 'official_source_verified',
  evidence_checked_at timestamptz not null default now(),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.pppp_supplier_public_catalog_v1 enable row level security;
revoke all on public.pppp_supplier_public_catalog_v1 from anon;
grant select on public.pppp_supplier_public_catalog_v1 to authenticated;

drop policy if exists pppp_supplier_public_catalog_v1_read_authenticated on public.pppp_supplier_public_catalog_v1;
create policy pppp_supplier_public_catalog_v1_read_authenticated
on public.pppp_supplier_public_catalog_v1
for select to authenticated
using (active = true);

create index if not exists pppp_supplier_public_catalog_v1_families_gin
  on public.pppp_supplier_public_catalog_v1 using gin (families);
create index if not exists pppp_supplier_public_catalog_v1_active_tier
  on public.pppp_supplier_public_catalog_v1(active,source_tier);

insert into public.pppp_supplier_public_catalog_v1
(canonical_key,name,country,source_tier,families,product_focus,grades,standards,certifications,max_diameter_mm,max_outer_diameter_mm,email,website,evidence_url,contact_url,evidence_note,verification_status,evidence_checked_at)
values
(
 'tennant-metall-round-bar','Tennant Metall & Technologie GmbH','Germany','eu',
 array['round_bar','profiles'],
 'Round bar; drawn, peeled or forged; cut-to-length through approx. Ø550 mm.',
 array['25CrMo4'],
 array['EN 10204 3.1'],
 array['AS/EN 9100','AS/EN 9120'],
 550,null,
 'info@tennant-metall.de','https://www.tennant-metall.de/',
 'https://www.neu.tennant-metall.de/en/products/round-bar',
 'https://www.tennant-metall.de/en/contact',
 'Official product page states round bar approx. 5–550 mm, cut-to-length, with 3.1 mill certificate to EN 10204. ISO 9001 is not asserted by this catalog row.',
 'official_source_verified','2026-09-18T00:00:00Z'
),
(
 'bepro-stahl-round-bar','BEPRO Blech und Profilstahl Handelsges. mbH & Co. KG','Germany','eu',
 array['round_bar','profiles'],
 'S355J2 round bar, rolled/forged/peeled; stock range stated through Ø600 mm; saw cutting available.',
 array['S355J2'],
 array['EN 10204'],
 array[]::text[],
 600,null,
 'info@bepro.de','https://bepro.de/',
 'https://bepro.de/en/steel/round-bars-s355-j2-merchant-bars/',
 'https://bepro.de/adressen/',
 'Official product page states S355J2 round bars from 8 mm through 600 mm and EN 10204 quality certificates. ISO 9001 is not asserted by this catalog row.',
 'official_source_verified','2026-09-18T00:00:00Z'
),
(
 'solsider-forged-rounds','Solsider Srl','Italy','eu',
 array['round_bar','profiles'],
 'Rolled rounds through Ø320 mm and forged rounds through Ø620 mm; cut-to-size service.',
 array['S355','C45','42CrMo4'],
 array['EN 10025-2','EN 10083-2','EN 10204 3.1'],
 array[]::text[],
 620,null,
 'solsider@solsider.com','https://solsider.com/',
 'https://solsider.com/en/products/rolled-and-forged-rounds/',
 'https://solsider.com/contatti/',
 'Official product page states forged rounds up to Ø620 mm and EN 10204 3.1 certification on request. ISO 9001 is not asserted by this catalog row.',
 'official_source_verified','2026-09-18T00:00:00Z'
),
(
 'pera-pipe-seamless','Pera Pipe Metal Dış Ticaret A.Ş.','Turkey','turkey',
 array['seamless_pipe','tubes'],
 'Seamless and welded carbon, alloy and low-temperature steel pipe; stock-based trader and exporter.',
 array[]::text[],
 array['EN 10204 3.1','EN 10204 3.2','EN 10216-2'],
 array['ISO 9001'],
 null,null,
 'hurkan@pera-pipe.com','https://www.pera-pipe.com/',
 'https://www.pera-pipe.com/',
 'https://www.pera-pipe.com/',
 'Official site states seamless steel pipe supply, EN 10204 3.1/3.2 mill certificates and ISO 9001 compliance; public sales email is listed.',
 'official_source_verified','2026-09-18T00:00:00Z'
),
(
 'metalfromturkey-seamless','MetalFromTurkey Trading Ltd.','Turkey','turkey',
 array['seamless_pipe','tubes'],
 'Carbon, alloy and stainless seamless pipe sourced from certified partner mills; OD 21.3–660 mm.',
 array['ST52','S355J2H'],
 array['EN 10204 3.1','EN 10216-2','ASTM A106','ASTM A335','API 5L'],
 array['ISO 9001'],
 null,660,
 'sales@metalfromturkey.com','https://www.metalfromturkey.com/',
 'https://www.metalfromturkey.com/en/products/steel-pipe/seamless-steel-pipe/',
 'https://www.metalfromturkey.com/en/contact/',
 'Official product page states seamless pipe OD 21.3–660 mm, EN 10204 3.1 MTCs and ISO 9001:2015 partner mills; public sales email is listed.',
 'official_source_verified','2026-09-18T00:00:00Z'
),
(
 'artrom-seamless','ARTROM STEEL TUBES S.A.','Romania','eu',
 array['seamless_pipe','tubes'],
 'Manufacturer of seamless steel pipes and precision/mechanical tubes.',
 array['E235','E355','ST52'],
 array['EN 10204 3.1'],
 array['ISO 9001'],
 null,null,
 'commercial@artrom.com','https://www.artrom.com/',
 'https://www.artrom.com/products/',
 'https://www.artrom.com/contact/',
 'Official product/certificate pages identify ARTROM as a seamless steel pipe manufacturer, list ISO 9001:2015, and product documents state EN 10204 type 3.1 mill test reports; commercial email is public.',
 'official_source_verified','2026-09-18T00:00:00Z'
)
on conflict (canonical_key) do update set
  name=excluded.name,
  country=excluded.country,
  source_tier=excluded.source_tier,
  families=excluded.families,
  product_focus=excluded.product_focus,
  grades=excluded.grades,
  standards=excluded.standards,
  certifications=excluded.certifications,
  max_diameter_mm=excluded.max_diameter_mm,
  max_outer_diameter_mm=excluded.max_outer_diameter_mm,
  email=excluded.email,
  website=excluded.website,
  evidence_url=excluded.evidence_url,
  contact_url=excluded.contact_url,
  evidence_note=excluded.evidence_note,
  verification_status=excluded.verification_status,
  evidence_checked_at=excluded.evidence_checked_at,
  active=true,
  updated_at=now();
