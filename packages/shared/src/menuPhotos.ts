import type { SupabaseClient } from '@supabase/supabase-js';

import { ASSETS_BUCKET, assetPath } from './assetPaths.ts';

/** A picked image: a browser `File` or any `Blob` with a type and size. */
export interface PhotoFile {
  type: string;
  size: number;
}

export class PhotoUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoUploadError';
  }
}

/**
 * Uploads a menu item photo to `shops/<shop_id>/menu/` in the `assets` bucket (docs/storage.md)
 * and returns its public URL, ready to save as `menu_items.photo_url`. Storage policies let only
 * the shop's owner and managers write there.
 */
export async function uploadMenuPhoto(
  client: Pick<SupabaseClient, 'storage'>,
  shopId: string,
  file: PhotoFile,
  uniqueId: string,
): Promise<string> {
  const path = assetPath('menu-item', shopId, { mimeType: file.type, sizeBytes: file.size }, uniqueId);
  if (!path.ok) throw new PhotoUploadError(path.error);
  const bucket = client.storage.from(ASSETS_BUCKET);
  const { error } = await bucket.upload(path.path, file as Blob, { contentType: file.type, upsert: false });
  if (error) {
    const denied = /row-level security|not authorized|unauthorized|403/i.test(error.message ?? '');
    throw new PhotoUploadError(
      denied
        ? 'No tienes permiso para subir fotos a esta tienda.'
        : 'No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.',
    );
  }
  return bucket.getPublicUrl(path.path).data.publicUrl;
}
