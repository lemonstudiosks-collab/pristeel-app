-- Reconcile the one remaining legacy duplicate canonical contact for info@toneatti.ch.
-- HubSpot feed currently contains only 759778400454. The stale 758778400454 identity
-- is retained as historical provenance on the surviving contact source before deletion.

do $$
declare
  v_keep uuid;
  v_stale uuid;
  v_stale_company text;
  v_stale_person text;
  v_stale_phone text;
  v_stale_country text;
  v_stale_role text;
  v_stale_notes text;
  v_stale_last_contact date;
begin
  select id into v_keep
  from public.contacts
  where lower(trim(coalesce(email,'')))='info@toneatti.ch'
    and hubspot_id='759778400454'
  limit 1;

  select id,company,person,phone,country,role,notes,last_contact
    into v_stale,v_stale_company,v_stale_person,v_stale_phone,v_stale_country,v_stale_role,v_stale_notes,v_stale_last_contact
  from public.contacts
  where lower(trim(coalesce(email,'')))='info@toneatti.ch'
    and hubspot_id='758778400454'
  limit 1;

  if v_keep is null then
    raise exception 'Toneatti reconciliation aborted: current HubSpot identity 759778400454 is missing';
  end if;

  -- Idempotent after the stale record has already been reconciled.
  if v_stale is null then
    return;
  end if;

  -- Do not discard an identity that has reappeared in the current CRM feed.
  if exists (
    select 1 from public.crm_contacts
    where lower(trim(coalesce(email,'')))='info@toneatti.ch'
      and hs_id='758778400454'
  ) then
    raise exception 'Toneatti reconciliation aborted: stale HubSpot identity 758778400454 is present in current crm_contacts';
  end if;

  -- Preserve any manual activity under the surviving canonical identity.
  update public.contact_activities
  set contact_id=v_keep
  where contact_id=v_stale;

  -- Merge useful canonical fields without overwriting newer non-empty values.
  update public.contacts
  set company=coalesce(nullif(trim(company),''),nullif(trim(v_stale_company),'')),
      person=coalesce(nullif(trim(person),''),nullif(trim(v_stale_person),'')),
      phone=coalesce(nullif(trim(phone),''),nullif(trim(v_stale_phone),'')),
      country=coalesce(nullif(trim(country),''),nullif(trim(v_stale_country),'')),
      role=coalesce(nullif(trim(role),''),nullif(trim(v_stale_role),'')),
      notes=coalesce(nullif(trim(notes),''),nullif(trim(v_stale_notes),'')),
      last_contact=coalesce(last_contact,v_stale_last_contact)
  where id=v_keep;

  -- Keep the retired HubSpot/contact identifiers as explicit historical provenance.
  update public.contact_sources
  set metadata=coalesce(metadata,'{}'::jsonb) || jsonb_build_object(
        'legacy_hubspot_id','758778400454',
        'legacy_contact_id',v_stale::text,
        'legacy_reconcile_reason','duplicate_email_legacy_reconcile',
        'legacy_reconciled_at',now()
      ),
      first_seen=least(first_seen,(
        select first_seen from public.contact_sources
        where contact_id=v_stale::text and source='hubspot'
        limit 1
      )),
      updated_at=now()
  where contact_id=v_keep::text and source='hubspot';

  delete from public.contact_sources where contact_id=v_stale::text;
  delete from public.contacts where id=v_stale;
end;
$$;
