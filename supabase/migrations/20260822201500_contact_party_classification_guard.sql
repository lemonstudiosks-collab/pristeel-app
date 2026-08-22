-- Make Contact Master party classification evidence-based and self-correcting.
-- `client` remains the CRM default/fallback bucket, while supplier classification requires
-- RFQ evidence, an explicit supplier partner relation, or a confirmed non-generic supplier domain.
-- Buyer/lead partner evidence takes precedence over inherited supplier-domain evidence.

create or replace function public.pppp_contact_party_guard_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text;
  v_domain text;
  v_supplier text;
  v_partner text;
  v_buyer text;
  v_domain_company text;
begin
  v_email := lower(trim(coalesce(new.email,'')));
  if v_email='' then return new; end if;
  v_domain := split_part(v_email,'@',2);

  -- Strongest evidence: this exact address has been used as an RFQ supplier.
  select r.supplier_name into v_supplier
  from public.rfq_log r
  where lower(trim(coalesce(r.supplier_email,'')))=v_email
    and nullif(trim(coalesce(r.supplier_name,'')),'') is not null
  order by coalesce(r.replied_at,r.sent_at,r.created_at) desc nulls last
  limit 1;
  if v_supplier is not null then
    new.kind := 'supplier';
    new.company := v_supplier;
    return new;
  end if;

  -- Explicit supplier partner company or alias.
  select p.name into v_partner
  from public.partners p
  cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) a(name)
  where p.relation @> array['supplier']::text[]
    and nullif(trim(a.name),'') is not null
    and lower(trim(a.name))=lower(trim(coalesce(new.company,'')))
  order by coalesce(p.importance,0) desc,p.created_at asc nulls last
  limit 1;
  if v_partner is not null then
    new.kind := 'supplier';
    new.company := v_partner;
    return new;
  end if;

  -- Explicit buyer/lead evidence blocks supplier-domain inheritance.
  select p.name into v_buyer
  from public.partners p
  cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) a(name)
  where p.relation && array['buyer','lead']::text[]
    and nullif(trim(a.name),'') is not null
    and lower(trim(a.name))=lower(trim(coalesce(new.company,'')))
  order by coalesce(p.importance,0) desc,p.created_at asc nulls last
  limit 1;
  if v_buyer is not null then
    new.kind := 'client';
    new.company := v_buyer;
    return new;
  end if;

  -- Public mailbox providers cannot establish a company relationship by domain.
  if v_domain in ('gmail.com','googlemail.com','outlook.com','hotmail.com','yahoo.com','icloud.com','me.com','live.com','protonmail.com') then
    return new;
  end if;

  -- Inherit supplier status only from a valid supplier seed on the same company domain.
  select coalesce(
           (select nullif(trim(r.supplier_name),'')
            from public.rfq_log r
            where lower(trim(coalesce(r.supplier_email,'')))=lower(trim(c.email))
              and nullif(trim(coalesce(r.supplier_name,'')),'') is not null
            order by coalesce(r.replied_at,r.sent_at,r.created_at) desc nulls last
            limit 1),
           (select p.name
            from public.partners p
            cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) a(name)
            where p.relation @> array['supplier']::text[]
              and nullif(trim(a.name),'') is not null
              and lower(trim(a.name))=lower(trim(coalesce(c.company,'')))
            order by coalesce(p.importance,0) desc,p.created_at asc nulls last
            limit 1),
           nullif(trim(c.company),'')
         )
    into v_domain_company
  from public.contacts c
  where c.id is distinct from new.id
    and split_part(lower(trim(coalesce(c.email,''))),'@',2)=v_domain
    and (
      exists (
        select 1 from public.rfq_log r
        where lower(trim(coalesce(r.supplier_email,'')))=lower(trim(c.email))
      )
      or exists (
        select 1
        from public.partners p
        cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) a(name)
        where p.relation @> array['supplier']::text[]
          and nullif(trim(a.name),'') is not null
          and lower(trim(a.name))=lower(trim(coalesce(c.company,'')))
      )
      or (
        lower(coalesce(c.kind,''))='supplier'
        and not exists (
          select 1
          from public.partners p
          cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) a(name)
          where p.relation && array['buyer','lead']::text[]
            and nullif(trim(a.name),'') is not null
            and lower(trim(a.name))=lower(trim(coalesce(c.company,'')))
        )
      )
    )
  order by
    case
      when exists (select 1 from public.rfq_log r where lower(trim(coalesce(r.supplier_email,'')))=lower(trim(c.email))) then 1
      when exists (
        select 1
        from public.partners p
        cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) a(name)
        where p.relation @> array['supplier']::text[]
          and nullif(trim(a.name),'') is not null
          and lower(trim(a.name))=lower(trim(coalesce(c.company,'')))
      ) then 2
      else 3
    end,
    c.created_at asc nulls last,c.id
  limit 1;

  if v_domain_company is not null then
    new.kind := 'supplier';
    if nullif(trim(coalesce(new.company,'')),'') is null
       or lower(trim(new.company))=v_domain
       or new.notes='Auto-linked from Gmail through PPPP project context'
    then
      new.company := v_domain_company;
    end if;
  end if;
  return new;
end;
$function$;

-- Keep auto-generated project relationships aligned with the canonical contact classification.
create or replace function public.pppp_project_contact_party_guard_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_kind text;
  v_company text;
begin
  if lower(coalesce(new.source,'')) not in ('gmail','email-auto') then return new; end if;
  if nullif(trim(coalesce(new.email,'')),'') is null then return new; end if;

  select c.kind,c.company into v_kind,v_company
  from public.contacts c
  where lower(trim(coalesce(c.email,'')))=lower(trim(new.email))
  order by (c.hubspot_id is not null) desc,c.created_at asc nulls last
  limit 1;

  if lower(coalesce(v_kind,''))='supplier' then
    new.role := 'supplier';
    if nullif(trim(coalesce(v_company,'')),'') is not null then new.company := v_company; end if;
  elsif lower(coalesce(v_kind,''))='client' and lower(coalesce(new.role,''))='supplier' then
    new.role := 'client';
    if nullif(trim(coalesce(v_company,'')),'') is not null then new.company := v_company; end if;
  end if;
  return new;
end;
$function$;

revoke all on function public.pppp_project_contact_party_guard_v1() from public, anon, authenticated;
grant execute on function public.pppp_project_contact_party_guard_v1() to service_role;

drop trigger if exists trg_pppp_project_contact_party_guard_v1 on public.project_contacts;
create trigger trg_pppp_project_contact_party_guard_v1
before insert or update on public.project_contacts
for each row execute function public.pppp_project_contact_party_guard_v1();

-- 1) Normalize exact RFQ supplier identities first.
with latest_rfq as (
  select distinct on (lower(trim(supplier_email)))
         lower(trim(supplier_email)) as email,
         supplier_name
  from public.rfq_log
  where nullif(trim(coalesce(supplier_email,'')),'') is not null
    and nullif(trim(coalesce(supplier_name,'')),'') is not null
  order by lower(trim(supplier_email)),coalesce(replied_at,sent_at,created_at) desc nulls last
)
update public.contacts c
set kind='supplier',company=r.supplier_name
from latest_rfq r
where lower(trim(coalesce(c.email,'')))=r.email
  and (lower(coalesce(c.kind,''))<>'supplier' or lower(trim(coalesce(c.company,'')))<>lower(trim(r.supplier_name)));

-- 2) Normalize contacts whose company/alias is an explicitly declared supplier partner.
with supplier_names as (
  select distinct lower(trim(a.name)) as name,p.name as canonical_name
  from public.partners p
  cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) a(name)
  where p.relation @> array['supplier']::text[]
    and nullif(trim(a.name),'') is not null
)
update public.contacts c
set kind='supplier',company=s.canonical_name
from supplier_names s
where lower(trim(coalesce(c.company,'')))=s.name
  and (lower(coalesce(c.kind,''))<>'supplier' or lower(trim(coalesce(c.company,'')))<>lower(trim(s.canonical_name)));

-- 3) Correct false suppliers that are explicitly buyer/lead-side and have no direct supplier evidence.
with buyer_names as (
  select distinct lower(trim(a.name)) as name,p.name as canonical_name
  from public.partners p
  cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) a(name)
  where p.relation && array['buyer','lead']::text[]
    and nullif(trim(a.name),'') is not null
), supplier_names as (
  select distinct lower(trim(a.name)) as name
  from public.partners p
  cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) a(name)
  where p.relation @> array['supplier']::text[]
    and nullif(trim(a.name),'') is not null
)
update public.contacts c
set kind='client',company=b.canonical_name
from buyer_names b
where lower(trim(coalesce(c.company,'')))=b.name
  and lower(coalesce(c.kind,''))='supplier'
  and not exists (
    select 1 from public.rfq_log r
    where lower(trim(coalesce(r.supplier_email,'')))=lower(trim(c.email))
  )
  and not exists (
    select 1 from supplier_names s where lower(trim(coalesce(c.company,'')))=s.name
  );

-- 4) Propagate only confirmed non-generic supplier domains and narrowly repair auto/blank/domain company fields.
with generic_domains(domain) as (
  values ('gmail.com'),('googlemail.com'),('outlook.com'),('hotmail.com'),('yahoo.com'),('icloud.com'),('me.com'),('live.com'),('protonmail.com')
), supplier_names as (
  select distinct lower(trim(a.name)) as name,p.name as canonical_name
  from public.partners p
  cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) a(name)
  where p.relation @> array['supplier']::text[]
    and nullif(trim(a.name),'') is not null
), buyer_names as (
  select distinct lower(trim(a.name)) as name
  from public.partners p
  cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) a(name)
  where p.relation && array['buyer','lead']::text[]
    and nullif(trim(a.name),'') is not null
), seeds as (
  select c.id,c.email,c.company,c.created_at,
         split_part(lower(trim(c.email)),'@',2) as domain,
         case
           when exists (select 1 from public.rfq_log r where lower(trim(coalesce(r.supplier_email,'')))=lower(trim(c.email))) then 1
           when exists (select 1 from supplier_names s where lower(trim(coalesce(c.company,'')))=s.name) then 2
           else 3
         end as priority,
         coalesce(
           (select nullif(trim(r.supplier_name),'') from public.rfq_log r
            where lower(trim(coalesce(r.supplier_email,'')))=lower(trim(c.email))
              and nullif(trim(coalesce(r.supplier_name,'')),'') is not null
            order by coalesce(r.replied_at,r.sent_at,r.created_at) desc nulls last limit 1),
           (select s.canonical_name from supplier_names s where lower(trim(coalesce(c.company,'')))=s.name limit 1),
           nullif(trim(c.company),'')
         ) as supplier_company
  from public.contacts c
  where nullif(trim(coalesce(c.email,'')),'') is not null
    and split_part(lower(trim(c.email)),'@',2) not in (select domain from generic_domains)
    and (
      exists (select 1 from public.rfq_log r where lower(trim(coalesce(r.supplier_email,'')))=lower(trim(c.email)))
      or exists (select 1 from supplier_names s where lower(trim(coalesce(c.company,'')))=s.name)
      or (
        lower(coalesce(c.kind,''))='supplier'
        and not exists (select 1 from buyer_names b where lower(trim(coalesce(c.company,'')))=b.name)
      )
    )
), ranked as (
  select *,row_number() over(partition by domain order by priority,created_at asc nulls last,id) as rn
  from seeds
  where supplier_company is not null
), supplier_domains as (
  select domain,supplier_company from ranked where rn=1
)
update public.contacts c
set kind='supplier',
    company=case
      when nullif(trim(coalesce(c.company,'')),'') is null
        or lower(trim(c.company))=sd.domain
        or c.notes='Auto-linked from Gmail through PPPP project context'
      then sd.supplier_company
      else c.company
    end
from supplier_domains sd
where split_part(lower(trim(coalesce(c.email,''))),'@',2)=sd.domain
  and not exists (
    select 1 from buyer_names b where lower(trim(coalesce(c.company,'')))=b.name
  )
  and (
    lower(coalesce(c.kind,''))<>'supplier'
    or (
      nullif(trim(coalesce(c.company,'')),'') is null
      or lower(trim(c.company))=sd.domain
      or c.notes='Auto-linked from Gmail through PPPP project context'
    ) and lower(trim(coalesce(c.company,'')))<>lower(trim(sd.supplier_company))
  );

-- 5) Align only auto-generated project relationship role/company with the canonical contact.
update public.project_contacts pc
set role=case when lower(coalesce(c.kind,''))='supplier' then 'supplier' else 'client' end,
    company=coalesce(nullif(trim(c.company),''),pc.company),
    updated_at=now()
from public.contacts c
where pc.source in ('gmail','email-auto')
  and lower(trim(pc.email))=lower(trim(c.email))
  and lower(coalesce(c.kind,'')) in ('supplier','client')
  and (
    lower(coalesce(pc.role,''))<>lower(coalesce(c.kind,''))
    or (nullif(trim(coalesce(c.company,'')),'') is not null and lower(trim(coalesce(pc.company,'')))<>lower(trim(c.company)))
  );
