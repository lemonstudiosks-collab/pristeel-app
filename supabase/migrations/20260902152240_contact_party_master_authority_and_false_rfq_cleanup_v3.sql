-- Keep contact role classification anchored to verified master data, not legacy RFQ history.
-- RFQ history is transactional evidence and must never become the authority for supplier/client identity.

create or replace function public.pppp_contact_party_guard_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_email text;
  v_supplier text;
  v_partner text;
  v_buyer text;
begin
  v_email := lower(trim(coalesce(new.email,'')));
  if v_email='' then return new; end if;

  select p.name into v_supplier
  from public.partner_contacts pc
  join public.partners p on p.id=pc.partner_id
  where lower(trim(coalesce(pc.email,'')))=v_email
    and p.stage='active'
    and coalesce(p.relation,'{}'::text[]) @> array['supplier']::text[]
  order by coalesce(pc.is_primary,false) desc,coalesce(p.importance,0) desc,pc.created_at asc nulls last
  limit 1;
  if v_supplier is not null then
    new.kind := 'supplier';
    new.company := v_supplier;
    return new;
  end if;

  select p.name into v_partner
  from public.partners p
  cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) a(name)
  where p.stage='active'
    and coalesce(p.relation,'{}'::text[]) @> array['supplier']::text[]
    and nullif(trim(a.name),'') is not null
    and lower(trim(a.name))=lower(trim(coalesce(new.company,'')))
  order by coalesce(p.importance,0) desc,p.created_at asc nulls last
  limit 1;
  if v_partner is not null then
    new.kind := 'supplier';
    new.company := v_partner;
    return new;
  end if;

  select p.name into v_buyer
  from public.partners p
  cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) a(name)
  where p.stage='active'
    and coalesce(p.relation,'{}'::text[]) && array['buyer','lead']::text[]
    and nullif(trim(a.name),'') is not null
    and lower(trim(a.name))=lower(trim(coalesce(new.company,'')))
  order by coalesce(p.importance,0) desc,p.created_at asc nulls last
  limit 1;
  if v_buyer is not null then
    new.kind := 'client';
    new.company := v_buyer;
    return new;
  end if;

  return new;
end;
$function$;

revoke all on function public.pppp_contact_party_guard_v1() from public, anon, authenticated;

-- Correct only the known legacy client-side rows created by the RFQ email reconciler.
update public.rfq_log r
set status='superseded',
    notes=case
      when coalesce(r.notes,'') like '%PPPP client-side correction:%' then r.notes
      else concat_ws(E'\n', nullif(r.notes,''),
        'PPPP client-side correction: this legacy row was auto-created from an outgoing client/project email and must not be treated as supplier RFQ evidence.')
    end
where lower(trim(coalesce(r.supplier_email,'')))='aleksandarcinge@gmail.com'
  and coalesce(r.notes,'') like 'Auto-created from linked outgoing Gmail message%'
  and r.project_id in (
    select p.id from public.projects p
    where p.name in (
      'ITALIAN STYLE - SPORTSKA HALA ANDRIJEVICA',
      'ITALIAN STYLE — BS Mrke 2 — Mega Totem 16m (Pumpa GM2)',
      'ITALIAN STYLE  - Hala - CARINVEST'
    )
  );

update public.contacts
set kind='client',
    company='ITALIAN STYLE',
    notes='PPPP supplier-role correction: repeated project/email evidence identifies this contact as an ITALIAN STYLE client contact, not a supplier.'
where lower(trim(coalesce(email,'')))='aleksandarcinge@gmail.com';
