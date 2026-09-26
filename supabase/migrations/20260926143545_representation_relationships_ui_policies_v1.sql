grant select, insert, update, delete on public.pppp_representation_relationships_v1 to authenticated;

drop policy if exists pppp_representation_relationships_authenticated_read on public.pppp_representation_relationships_v1;
create policy pppp_representation_relationships_authenticated_read
  on public.pppp_representation_relationships_v1 for select to authenticated using (true);

drop policy if exists pppp_representation_relationships_authenticated_insert on public.pppp_representation_relationships_v1;
create policy pppp_representation_relationships_authenticated_insert
  on public.pppp_representation_relationships_v1 for insert to authenticated
  with check ((select public.can_write()));

drop policy if exists pppp_representation_relationships_authenticated_update on public.pppp_representation_relationships_v1;
create policy pppp_representation_relationships_authenticated_update
  on public.pppp_representation_relationships_v1 for update to authenticated
  using ((select public.can_write())) with check ((select public.can_write()));

drop policy if exists pppp_representation_relationships_authenticated_delete on public.pppp_representation_relationships_v1;
create policy pppp_representation_relationships_authenticated_delete
  on public.pppp_representation_relationships_v1 for delete to authenticated
  using ((select public.can_write()));
