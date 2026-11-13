import type { MockProduct } from '../data/mock.ts';
import { describeSelection, unitPriceCents, type CartLine, type Selection } from './cart.ts';

let lineCounter = 0;
export const newLineId = () => `line-${Date.now()}-${(lineCounter += 1)}`;

/** Builds the cart line for a product. Non-customizable products ignore `selection`. */
export function buildCartLine(
  product: MockProduct,
  shopId: string,
  selection: Selection | null,
  quantity = 1,
  id: string = newLineId(),
): CartLine {
  if (product.soldOut) throw new RangeError(`"${product.name}" is sold out.`);
  const sel = product.customizable ? selection : null;
  return {
    id,
    shopId,
    productId: product.id,
    name: product.name,
    optionsLabel: sel ? describeSelection(sel) : product.description,
    selection: sel,
    unitCents: unitPriceCents(product.priceCents, sel),
    quantity,
  };
}
