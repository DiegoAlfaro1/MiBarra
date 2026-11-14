import type { OrderStatus } from '../state/AppState.ts';

export const TRACKING_STEPS = ['Recibido', 'Preparando', 'Listo'] as const;
const FLOW: readonly OrderStatus[] = ['received', 'preparing', 'ready'];

export interface TrackingView {
  /** Index of the current step (0 received, 1 preparing, 2 ready). */
  index: number;
  title: string;
  body: string;
  /** One time label per step. */
  times: string[];
  ready: boolean;
  /** Customers can cancel only while the shop has not started the order. */
  canCancel: boolean;
}

/** Copy and step times for the tracking screens. Returns null for cancelled orders. */
export function trackingView(status: OrderStatus, ctx: { shopName: string; customerName: string; code: string }): TrackingView | null {
  const index = FLOW.indexOf(status);
  if (index < 0) return null;
  const copy = [
    [`Pedido recibido`, `${ctx.shopName} ya tiene tu pedido. Esta página se actualiza sola cuando cambie el estado.`],
    [`Preparando tu pedido`, `Tu barista está en ello. Sal con calma: estará listo a las 9:15 a. m.`],
    [`¡Listo para recoger!`, `Di tu nombre en la barra: ${ctx.customerName}, pedido ${ctx.code}.`],
  ][index]!;
  return {
    index,
    title: copy[0]!,
    body: copy[1]!,
    times: ['9:03 a. m.', index >= 1 ? '9:05 a. m.' : 'En espera', index >= 2 ? '9:13 a. m.' : 'Aprox. 9:15 a. m.'],
    ready: index === 2,
    canCancel: index === 0,
  };
}
