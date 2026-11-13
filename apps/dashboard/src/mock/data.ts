// Sample data from the design handoff (Café Lempa). Replace with live data later.
import type { DashOrder } from '../logic/dashboard.ts';

export const SHOP_NAME = 'Café Lempa';

export const INITIAL_ORDERS: DashOrder[] = [
  { id: 'A-1043', name: 'María', pickup: '9:20 a. m.', status: 'pending', paid: false, lines: [{ main: '2 × Latte grande', opts: 'Leche de avena' }], note: '' },
  { id: 'A-1044', name: 'Carlos', pickup: '9:30 a. m.', status: 'pending', paid: true, lines: [{ main: '1 × Cold brew', opts: 'Sin hielo extra' }, { main: '1 × Baleada sencilla', opts: '' }], note: 'Pago con tarjeta (demo)' },
  { id: 'A-1042', name: 'Diego', pickup: '9:15 a. m.', status: 'preparing', paid: false, lines: [{ main: '1 × Capuchino mediano', opts: 'Leche entera · Sirope de vainilla' }, { main: '1 × Croissant', opts: '' }], note: 'Extra caliente' },
  { id: 'A-1040', name: 'Andrea', pickup: '9:05 a. m.', status: 'ready', paid: false, lines: [{ main: '1 × Americano', opts: 'Mediano' }], note: '' },
];

export interface MenuItem { id: string; name: string; price: number }
export interface MenuGroup { title: string; items: MenuItem[] }

export const MENU: MenuGroup[] = [
  { title: 'Café', items: [
    { id: 'capuchino', name: 'Capuchino', price: 70 }, { id: 'latte', name: 'Latte', price: 75 },
    { id: 'americano', name: 'Americano', price: 50 }, { id: 'moca', name: 'Moca', price: 80 },
    { id: 'cold-brew', name: 'Cold brew', price: 85 } ] },
  { title: 'Té', items: [{ id: 'chai', name: 'Chai latte', price: 70 }, { id: 'manzanilla', name: 'Té de manzanilla', price: 40 }] },
  { title: 'Comida y repostería', items: [
    { id: 'baleada', name: 'Baleada sencilla', price: 35 }, { id: 'sandwich', name: 'Sándwich de pavo', price: 95 },
    { id: 'croissant', name: 'Croissant', price: 45 }, { id: 'pan-banano', name: 'Pan de banano', price: 50 } ] },
];

export const INITIAL_SOLD_OUT: Record<string, boolean> = { moca: true, 'pan-banano': true };

export const SUMMARY = {
  dateLabel: 'Jueves 12 de noviembre · datos de ejemplo',
  sales: 2840, orders: 23, delivered: 21, cancelled: 2, avgTicket: 135, stamps: 21, redeemed: 2,
  cash: 1980, card: 860,
  recent: [
    { time: '9:05 a. m.', who: 'Andrea', items: 'Americano mediano', pay: 'En caja', total: 60 },
    { time: '8:58 a. m.', who: 'Luis', items: 'Latte grande, Croissant', pay: 'Tarjeta (demo)', total: 140 },
    { time: '8:42 a. m.', who: 'Sofía', items: '2 × Capuchino', pay: 'En caja', total: 140 },
    { time: '8:31 a. m.', who: 'José', items: 'Cold brew, Baleada sencilla', pay: 'En caja', total: 120 },
  ],
};

export const SCANNED_CUSTOMER = { initial: 'D', name: 'Diego A.', meta: 'Cliente desde oct. 2026 · 14 pedidos aquí', stamps: 6 };
