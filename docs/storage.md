# Storage (images and other assets)

One public Supabase Storage bucket, `assets`, holds shop logos, menu item photos and profile pictures.
It is created by `supabase/migrations/20261115020000_storage_assets.sql`; the layout helpers are in
`packages/shared/src/assetPaths.ts`.

## Layout

| Path | What | Who can upload, replace or delete |
|---|---|---|
| `shops/<shop_id>/logo/<file>` | Shop logo | Owner or manager of that shop, platform admin |
| `shops/<shop_id>/menu/<file>` | Menu item photo | Owner or manager of that shop, platform admin |
| `users/<user_id>/avatar/<file>` | Profile picture | That user, platform admin |

- Anyone (including visitors) can read: the images appear on the public menu.
- `<file>` is a plain name (letters, digits, `.`, `_`, `-`) ending in `.jpg`, `.jpeg`, `.png` or `.webp`.
  Use `assetPath()` so every upload gets a unique name (a new URL per image avoids stale caches).
- The bucket refuses anything over 5 MB or not JPEG, PNG or WebP. `assetFileError()` shows the message before uploading.
- Any other path is refused by the storage policies (`public.can_write_asset(name)`); roles are looked up on every request.

## Using it

```ts
const result = assetPath('menu-item', shopId, { mimeType, sizeBytes }, crypto.randomUUID());
if (!result.ok) return showError(result.error);
await supabase.storage.from(ASSETS_BUCKET).upload(result.path, file, { contentType: mimeType });
const { data } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(result.path);
// data.publicUrl goes into menu_items.photo / shops.logo_url
```

Tests: `supabase/tests/database/storage_assets.test.sql` (pgTAP, run by CI).
