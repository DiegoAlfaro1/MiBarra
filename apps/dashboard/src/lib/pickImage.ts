import { ASSET_MIME_TYPES } from '@mibarra/shared';

/**
 * Opens the browser's file picker for one image (the dashboard runs on the web).
 * Resolves with the chosen file, or null when the owner closes the picker without choosing.
 */
export function pickImage(): Promise<File | null> {
  if (typeof document === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ASSET_MIME_TYPES.join(',');
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** A fresh id for each upload, so a new photo never shows a cached old one. */
export function newUploadId(): string {
  return globalThis.crypto.randomUUID();
}
