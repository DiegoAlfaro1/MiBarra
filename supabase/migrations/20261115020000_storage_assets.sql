-- Storage bucket for images (#44): shop logos, menu item photos and profile pictures.
--
-- One public bucket, `assets`, laid out by owner so files stay organised and permissions are easy to check:
--
--   shops/<shop_id>/logo/<file>   shop logo        (owner or manager of that shop, or a platform admin)
--   shops/<shop_id>/menu/<file>   menu item photo  (owner or manager of that shop, or a platform admin)
--   users/<user_id>/avatar/<file> profile picture  (that user only, or a platform admin)
--
-- Anyone can read (the images are shown on the public menu); only the folders above can be written, and only
-- by the people named. Files are limited to 5 MB and to jpeg, png and webp. See docs/storage.md.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('assets', 'assets', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- True when the signed-in user may write the object at this path inside the `assets` bucket.
create function public.can_write_asset(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_name is null then false
    -- The file name must be a single plain name with an image extension.
    when p_name !~* '^(shops|users)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(logo|menu|avatar)/[A-Za-z0-9._-]{1,120}\.(jpe?g|png|webp)$'
      then false
    when public.is_platform_admin() then true
    when split_part(p_name, '/', 1) = 'shops' and split_part(p_name, '/', 3) in ('logo', 'menu')
      then public.has_shop_role(split_part(p_name, '/', 2)::uuid, array['owner', 'manager'])
    when split_part(p_name, '/', 1) = 'users' and split_part(p_name, '/', 3) = 'avatar'
      then split_part(p_name, '/', 2)::uuid = (select auth.uid())
    else false
  end;
$$;

revoke all on function public.can_write_asset(text) from public;
grant execute on function public.can_write_asset(text) to authenticated;

create policy "assets are public" on storage.objects
  for select using (bucket_id = 'assets');

create policy "assets upload by owner" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'assets' and public.can_write_asset(name));

create policy "assets replace by owner" on storage.objects
  for update to authenticated
  using (bucket_id = 'assets' and public.can_write_asset(name))
  with check (bucket_id = 'assets' and public.can_write_asset(name));

create policy "assets delete by owner" on storage.objects
  for delete to authenticated
  using (bucket_id = 'assets' and public.can_write_asset(name));
