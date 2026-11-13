import { EXTRAS, MILKS, SIZES } from '../data/options.ts';

export const MAX_QTY = 9;

export interface Selection {
  sizeId: string;
  milkId: string;
  extraIds: string[];
}

export interface CartLine {
  id: string;
  shopId: string;
  productId: string;
  name: string;
  /** Description shown under the name (options, or the product blurb). */
  optionsLabel: string;
  selection: Selection | null;
  unitCents: number;
  quantity: number;
}

export interface CartState {
  shopId: string | null;
  lines: CartLine[];
  note: string;
}

export const emptyCart: CartState = { shopId: null, lines: [], note: '' };

export type CartAction =
  | { type: 'add'; line: CartLine }
  | { type: 'replace'; id: string; line: CartLine }
  | { type: 'setQty'; id: string; quantity: number }
  | { type: 'remove'; id: string }
  | { type: 'setNote'; note: string }
  | { type: 'clear' };

export function clampQty(quantity: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_QTY, Math.max(1, Math.trunc(quantity)));
}

function find<T extends { id: string }>(list: readonly T[], id: string, what: string): T {
  const found = list.find((item) => item.id === id);
  if (!found) throw new RangeError(`Unknown ${what} "${id}".`);
  return found;
}

export const defaultSelection = (): Selection => ({ sizeId: 'medium', milkId: 'whole', extraIds: [] });

/** Price of one unit: base + size + milk + extras. Throws on unknown option ids. */
export function unitPriceCents(baseCents: number, selection: Selection | null): number {
  if (!selection) return baseCents;
  let total = baseCents + find(SIZES, selection.sizeId, 'size').extraCents;
  total += find(MILKS, selection.milkId, 'milk').extraCents;
  for (const id of selection.extraIds) total += find(EXTRAS, id, 'extra').priceCents;
  return total;
}

/** e.g. `Mediano 16 oz · Leche entera · Sirope de vainilla`. */
export function describeSelection(selection: Selection): string {
  const size = find(SIZES, selection.sizeId, 'size');
  const milk = find(MILKS, selection.milkId, 'milk');
  const extras = selection.extraIds.map((id) => find(EXTRAS, id, 'extra').label);
  return [`${size.label} ${size.oz}`, `Leche ${milk.label.toLowerCase()}`, ...extras].join(' · ');
}

const selectionKey = (selection: Selection | null) =>
  selection
    ? `${selection.sizeId}|${selection.milkId}|${[...selection.extraIds].sort().join(',')}`
    : '';

export const lineTotalCents = (line: CartLine) => line.unitCents * line.quantity;
export const cartTotalCents = (lines: readonly CartLine[]) =>
  lines.reduce((sum, line) => sum + lineTotalCents(line), 0);
export const cartCount = (lines: readonly CartLine[]) => lines.reduce((sum, line) => sum + line.quantity, 0);

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      // A cart belongs to one shop: ordering from another shop starts a new cart.
      const base = state.shopId === action.line.shopId ? state : emptyCart;
      const same = base.lines.find(
        (l) =>
          l.productId === action.line.productId &&
          selectionKey(l.selection) === selectionKey(action.line.selection),
      );
      const lines = same
        ? base.lines.map((l) =>
            l.id === same.id ? { ...l, quantity: clampQty(l.quantity + action.line.quantity) } : l,
          )
        : [...base.lines, { ...action.line, quantity: clampQty(action.line.quantity) }];
      return { ...base, shopId: action.line.shopId, lines };
    }
    case 'replace':
      return {
        ...state,
        lines: state.lines.map((l) =>
          l.id === action.id ? { ...action.line, id: action.id, quantity: clampQty(action.line.quantity) } : l,
        ),
      };
    case 'setQty':
      return {
        ...state,
        lines: state.lines.map((l) => (l.id === action.id ? { ...l, quantity: clampQty(action.quantity) } : l)),
      };
    case 'remove': {
      const lines = state.lines.filter((l) => l.id !== action.id);
      return lines.length ? { ...state, lines } : emptyCart;
    }
    case 'setNote':
      return { ...state, note: action.note.slice(0, 200) };
    case 'clear':
      return emptyCart;
  }
}
