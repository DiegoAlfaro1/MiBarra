import type { HistoryOrder, OrderStatus, ReorderPlan } from '@mibarra/shared';

import { clampQty, type CartLine } from './cart.ts';

// View helpers for the customer's order history (#63). Data comes from `listMyOrderHistory`.

export type HistoryTone = 'success' | 'danger' | 'warning';

const STATUS: Record<OrderStatus, { label: string; tone: HistoryTone }> = {
  pending: { label: 'Recibido', tone: 'warning' },
  preparing: { label: 'Preparando', tone: 'warning' },
  ready: { label: 'Listo para recoger', tone: 'success' },
  completed: { label: 'Recogido', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'danger' },
};

export interface HistoryLineView {
  id: string;
  quantity: number;
  name: string;
  /** What was chosen for this line, e.g. `Grande · Vainilla`; empty when nothing was customised. */
  personalization: string;
  /** Price paid for the whole line (unit price at order time × quantity). */
  lineCents: number;
}

export interface HistoryOrderView {
  id: string;
  shopId: string;
  shop: string;
  date: string;
  status: string;
  tone: HistoryTone;
  lines: HistoryLineView[];
  totalCents: number;
  note: string | null;
  /** Cancelled orders can be ordered again too: it only fills the cart. */
  canReorder: boolean;
}

/** e.g. `19 nov · 8:42 a. m.` */
export function historyDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString('es-HN', { day: 'numeric', month: 'short' }).replace('.', '');
  const time = d.toLocaleTimeString('es-HN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day} · ${time}`;
}

export function historyView(order: HistoryOrder): HistoryOrderView {
  const status = STATUS[order.status] ?? { label: order.status, tone: 'warning' as const };
  return {
    id: order.id,
    shopId: order.shop_id,
    shop: order.shops?.name ?? 'Cafetería',
    date: historyDate(order.created_at),
    status: status.label,
    tone: status.tone,
    lines: order.order_items.map((l) => ({
      id: l.id,
      quantity: l.quantity,
      name: l.menu_items?.name ?? 'Producto',
      personalization: l.chosen_options.map((o) => o.name).join(' · '),
      lineCents: l.unit_price_cents * l.quantity,
    })),
    totalCents: order.total_cents,
    note: order.note?.trim() || null,
    canReorder: order.order_items.length > 0,
  };
}

/** Cart lines for a reorder. Ids are stable per order and product, so tapping twice cannot add duplicate lines. */
export function reorderCartLines(orderId: string, shopId: string, plan: ReorderPlan): CartLine[] {
  return plan.lines.map((l) => ({
    id: `reorder-${orderId}-${l.productId}-${l.optionIds.join('.')}`,
    shopId,
    productId: l.productId,
    name: l.name,
    optionsLabel: l.optionsLabel,
    selection: null,
    optionIds: l.optionIds,
    unitCents: l.unitCents,
    quantity: clampQty(l.quantity),
  }));
}

/** Message shown after a reorder when part of it could not be added; null when everything was. */
export function reorderNotice(plan: ReorderPlan): string | null {
  if (!plan.skipped.length) return null;
  const list = [...new Set(plan.skipped)].join(', ');
  if (!plan.lines.length) return `Ya no podemos repetir este pedido: ${list} no está disponible. Elige otros productos en el menú.`;
  return `Agregamos tu pedido al carrito, pero no pudimos incluir: ${list} (no está disponible). Revisa tu carrito.`;
}
