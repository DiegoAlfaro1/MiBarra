import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PRODUCTS } from '../data/mock.ts';
import { defaultSelection } from './cart.ts';
import { buildCartLine } from './menu.ts';
import { isWideWidth } from './breakpoint.ts';

const product = (id: string) => PRODUCTS.find((p) => p.id === id)!;

describe('buildCartLine', () => {
  it('prices and describes a customised drink', () => {
    const line = buildCartLine(product('capuchino'), 'lempa', { ...defaultSelection(), extraIds: ['vanilla'] }, 1, 'x');
    assert.equal(line.unitCents, 9000);
    assert.equal(line.optionsLabel, 'Mediano 16 oz · Leche entera · Sirope de vainilla');
    assert.equal(line.shopId, 'lempa');
  });
  it('ignores the selection for items without options', () => {
    const line = buildCartLine(product('croissant'), 'lempa', defaultSelection(), 1, 'x');
    assert.equal(line.selection, null);
    assert.equal(line.unitCents, 4500);
    assert.equal(line.optionsLabel, 'Horneado esta mañana');
  });
  it('rejects sold-out products', () => {
    assert.throws(() => buildCartLine(product('moca'), 'lempa', defaultSelection()), RangeError);
  });
});

describe('isWideWidth', () => {
  it('switches to the web layout from 900px', () => {
    assert.equal(isWideWidth(899), false);
    assert.equal(isWideWidth(900), true);
  });
});
