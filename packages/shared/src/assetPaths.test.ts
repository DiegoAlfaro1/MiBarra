import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ASSET_MAX_BYTES, assetFileError, assetPath } from './assetPaths.ts';

const SHOP = '10000000-0000-4000-8000-00000000000a';
const png = { mimeType: 'image/png', sizeBytes: 1000 };

describe('assetPath', () => {
  it('puts shop and user images in their own folders', () => {
    assert.deepEqual(assetPath('menu-item', SHOP, png, 'abc-1'), { ok: true, path: `shops/${SHOP}/menu/abc-1.png` });
    assert.deepEqual(assetPath('shop-logo', SHOP, { ...png, mimeType: 'image/webp' }, 'x'), {
      ok: true,
      path: `shops/${SHOP}/logo/x.webp`,
    });
    assert.deepEqual(assetPath('avatar', SHOP, { ...png, mimeType: 'image/jpeg' }, 'x'), {
      ok: true,
      path: `users/${SHOP}/avatar/x.jpg`,
    });
  });

  it('rejects bad owners, names and files with a message', () => {
    assert.equal(assetPath('menu-item', 'nope', png, 'a').ok, false);
    assert.equal(assetPath('menu-item', SHOP, png, '../evil').ok, false);
    assert.equal(assetPath('menu-item', SHOP, { mimeType: 'image/gif', sizeBytes: 10 }, 'a').ok, false);
  });
});

describe('assetFileError', () => {
  it('accepts a normal image and refuses wrong type, empty and oversized files', () => {
    assert.equal(assetFileError(png), null);
    assert.match(assetFileError({ mimeType: 'application/pdf', sizeBytes: 10 }) ?? '', /JPG, PNG o WebP/);
    assert.match(assetFileError({ mimeType: 'image/png', sizeBytes: 0 }) ?? '', /vacía/);
    assert.match(assetFileError({ mimeType: 'image/png', sizeBytes: ASSET_MAX_BYTES + 1 }) ?? '', /5 MB/);
  });
});
