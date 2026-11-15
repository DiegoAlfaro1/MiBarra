import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { uploadMenuPhoto } from './menuPhotos.ts';

const SHOP = '00000000-0000-4000-8000-000000000001';

function fakeStorage(error: { message: string } | null = null) {
  const uploads: { bucket: string; path: string; options: unknown }[] = [];
  const client = {
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, _file: unknown, options: unknown) => {
          uploads.push({ bucket, path, options });
          return { data: error ? null : { path }, error };
        },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://cdn.test/${bucket}/${path}` } }),
      }),
    },
  };
  return { client: client as unknown as Parameters<typeof uploadMenuPhoto>[0], uploads };
}

describe('menu photo upload', () => {
  it('uploads to the shop menu folder and returns the public link', async () => {
    const { client, uploads } = fakeStorage();
    const url = await uploadMenuPhoto(client, SHOP, { type: 'image/png', size: 2048 }, 'abc-123');
    assert.equal(url, `https://cdn.test/assets/shops/${SHOP}/menu/abc-123.png`);
    assert.equal(uploads[0]!.path, `shops/${SHOP}/menu/abc-123.png`);
  });

  it('rejects files that are not images or too big before uploading', async () => {
    const { client, uploads } = fakeStorage();
    await assert.rejects(uploadMenuPhoto(client, SHOP, { type: 'application/pdf', size: 10 }, 'a'), /JPG, PNG o WebP/);
    await assert.rejects(uploadMenuPhoto(client, SHOP, { type: 'image/jpeg', size: 6 * 1024 * 1024 }, 'a'), /máximo 5 MB/);
    assert.equal(uploads.length, 0);
  });

  it('explains a refused upload', async () => {
    const { client } = fakeStorage({ message: 'new row violates row-level security policy' });
    await assert.rejects(uploadMenuPhoto(client, SHOP, { type: 'image/jpeg', size: 10 }, 'a'), /No tienes permiso/);
  });
});
