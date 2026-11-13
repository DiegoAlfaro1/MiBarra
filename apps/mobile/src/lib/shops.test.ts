import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PRODUCTS, SHOPS } from '../data/mock.ts';
import { filterShops } from './shops.ts';

const ids = (list: { id: string }[]) => list.map((s) => s.id);

describe('filterShops', () => {
  it('returns every shop with no filter or query', () => {
    assert.deepEqual(ids(filterShops(SHOPS, PRODUCTS, 'all', '')), ['lempa', 'molienda', 'valle']);
  });
  it('keeps only open shops for "open"', () => {
    assert.deepEqual(ids(filterShops(SHOPS, PRODUCTS, 'open', '')), ['lempa', 'molienda']);
  });
  it('sorts by distance for "near" without mutating the input', () => {
    const reversed = [...SHOPS].reverse();
    assert.deepEqual(ids(filterShops(reversed, PRODUCTS, 'near', '')), ['lempa', 'molienda', 'valle']);
    assert.equal(reversed[0]!.id, 'valle');
  });
  it('matches by shop name or area, ignoring case and spaces', () => {
    assert.deepEqual(ids(filterShops(SHOPS, PRODUCTS, 'all', '  LEMPA ')), ['lempa']);
    assert.deepEqual(ids(filterShops(SHOPS, PRODUCTS, 'all', 'guijarro')), ['valle']);
  });
  it('lists open shops for a drink match', () => {
    assert.deepEqual(ids(filterShops(SHOPS, PRODUCTS, 'all', 'capuchino')), ['lempa', 'molienda']);
  });
  it('returns an empty list when nothing matches', () => {
    assert.deepEqual(filterShops(SHOPS, PRODUCTS, 'all', 'zzz'), []);
  });
});
