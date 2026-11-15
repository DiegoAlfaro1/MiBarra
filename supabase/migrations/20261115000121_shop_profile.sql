-- Shop profile management (#37): adds the shop phone and stricter checks for opening hours and the logo link.
-- The owner edits name, logo, address, phone and hours through update_shop_profile(); direct writes to
-- public.shops stay revoked (see 20261114100000_access_control.sql).

-- ---------------------------------------------------------------------------
-- Opening hours: {"mon": {"open": "07:00", "close": "19:00"}, ..., "sun": null}
-- Only weekday keys mon..sun; each day is null (closed) or an open/close pair in 24h HH:MM, open before close.
-- ---------------------------------------------------------------------------

create function public.shop_hours_valid(p_hours jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_hours) = 'object'
    and not exists (
      select 1
      from jsonb_each(p_hours) as d(day, value)
      where d.day not in ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun')
         or (
           jsonb_typeof(d.value) <> 'null'
           -- CASE so the key checks only run on objects (jsonb_object_keys fails on other types).
           and not (
             case when jsonb_typeof(d.value) = 'object' then
               coalesce(d.value ->> 'open', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
               and coalesce(d.value ->> 'close', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
               and (d.value ->> 'open') < (d.value ->> 'close')
               and (select count(*) from jsonb_object_keys(d.value)) = 2
             else false end
           )
         )
    );
$$;

grant execute on function public.shop_hours_valid(jsonb) to anon, authenticated;

alter table public.shops
  add column phone text check (phone is null or phone ~ '^\+[0-9]{8,15}$'),
  add constraint shops_hours_valid check (public.shop_hours_valid(hours)),
  add constraint shops_logo_url_http check (logo_url is null or logo_url ~* '^https?://\S+$');

comment on column public.shops.phone is 'Shop contact phone in E.164 (e.g. +50422223333). Public, like the rest of the shop profile.';

-- ---------------------------------------------------------------------------
-- update_shop_profile gains the phone. The old 5-argument version is dropped so the app cannot
-- accidentally keep calling a shape that ignores the phone.
-- ---------------------------------------------------------------------------

drop function public.update_shop_profile(uuid, text, text, text, jsonb);

create function public.update_shop_profile(
  p_shop_id uuid,
  p_name text,
  p_address text,
  p_logo_url text,
  p_hours jsonb,
  p_phone text
)
returns public.shops
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop public.shops;
  v_admin boolean := public.is_platform_admin();
  v_logo text := nullif(btrim(p_logo_url), '');
  v_phone text := nullif(btrim(p_phone), '');
begin
  if not v_admin then
    perform public.require_shop_role(p_shop_id, array['owner']);
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 120 then
    raise exception 'El nombre de la tienda debe tener entre 1 y 120 caracteres.' using errcode = '22023';
  end if;
  if p_address is not null and char_length(btrim(p_address)) > 240 then
    raise exception 'La dirección es demasiado larga (máximo 240 caracteres).' using errcode = '22023';
  end if;
  if v_phone is not null and v_phone !~ '^\+[0-9]{8,15}$' then
    raise exception 'El teléfono no es válido.' using errcode = '22023';
  end if;
  if v_logo is not null and v_logo !~* '^https?://\S+$' then
    raise exception 'El enlace del logo debe empezar con https://.' using errcode = '22023';
  end if;
  if p_hours is null or not public.shop_hours_valid(p_hours) then
    raise exception 'El horario no es válido: cada día abierto necesita hora de apertura antes que la de cierre.'
      using errcode = '22023';
  end if;

  update public.shops
  set name = btrim(p_name), address = nullif(btrim(p_address), ''), logo_url = v_logo, phone = v_phone,
      hours = p_hours
  where id = p_shop_id
  returning * into v_shop;
  if not found then
    raise exception 'Shop not found.' using errcode = '22023';
  end if;
  if v_admin then
    perform public.write_audit((select auth.uid()), p_shop_id, 'admin.shop.update_profile', 'shop:' || p_shop_id);
  end if;
  return v_shop;
end;
$$;

revoke all on function public.update_shop_profile(uuid, text, text, text, jsonb, text) from public, anon;
grant execute on function public.update_shop_profile(uuid, text, text, text, jsonb, text) to authenticated;

-- Item photos are web links, like the logo (the app rejects anything else before saving).
alter table public.menu_items
  add constraint menu_items_photo_url_http check (photo_url is null or photo_url ~* '^https?://\S+$');
