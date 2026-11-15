import { isUuid } from './orders.ts';

/**
 * Where images live in the `assets` storage bucket (see docs/storage.md and
 * supabase/migrations/20261115020000_storage_assets.sql). The database enforces the same layout,
 * so build paths with these helpers instead of by hand.
 */

export const ASSETS_BUCKET = 'assets';
export const ASSET_MAX_BYTES = 5 * 1024 * 1024;
export const ASSET_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export type AssetKind = 'shop-logo' | 'menu-item' | 'avatar';

export type AssetPathResult = { ok: true; path: string } | { ok: false; error: string };

export interface AssetFileInfo {
  mimeType: string;
  sizeBytes: number;
}

/** Checks the picked file before uploading. Returns a user-facing message, or null when fine. */
export function assetFileError(file: AssetFileInfo): string | null {
  if (!(ASSET_MIME_TYPES as readonly string[]).includes(file.mimeType)) {
    return 'La imagen debe ser JPG, PNG o WebP.';
  }
  if (!(file.sizeBytes > 0)) return 'La imagen está vacía.';
  if (file.sizeBytes > ASSET_MAX_BYTES) return 'La imagen es demasiado grande (máximo 5 MB).';
  return null;
}

/**
 * Builds the storage path for a new image. `ownerId` is the shop id for shop-logo and menu-item,
 * and the user id for avatar. `uniqueId` (e.g. a uuid) keeps each upload on its own URL so caches never show an old picture.
 */
export function assetPath(kind: AssetKind, ownerId: string, file: AssetFileInfo, uniqueId: string): AssetPathResult {
  if (!isUuid(ownerId)) return { ok: false, error: 'No se pudo identificar a quién pertenece la imagen.' };
  if (!/^[A-Za-z0-9-]{1,64}$/.test(uniqueId)) return { ok: false, error: 'Nombre de archivo no válido.' };
  const fileError = assetFileError(file);
  if (fileError) return { ok: false, error: fileError };
  const ext = EXTENSIONS[file.mimeType];
  const folder =
    kind === 'avatar' ? `users/${ownerId}/avatar` : kind === 'shop-logo' ? `shops/${ownerId}/logo` : `shops/${ownerId}/menu`;
  return { ok: true, path: `${folder}/${uniqueId}.${ext}` };
}
