// Sample data from the design handoff. Replace with the real café's data once the backend is wired up.

export interface MockProduct {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceCents: number;
  soldOut?: boolean;
  /** Drinks can be customised (size, milk, extras). */
  customizable: boolean;
}

export interface MockShop {
  id: string;
  name: string;
  initials: string;
  area: string;
  distanceKm: string;
  open: boolean;
  /** Why ordering is unavailable, when it is. */
  closedReason?: 'closed' | 'paused';
  waitLabel: string;
  hoursLabel: string;
  stamps: number;
  stampGoal: number;
}

export const CATEGORIES = [
  { id: 'cafe', label: 'Café' },
  { id: 'te', label: 'Té' },
  { id: 'comida', label: 'Comida' },
  { id: 'reposteria', label: 'Repostería' },
] as const;

export const SHOPS: readonly MockShop[] = [
  {
    id: 'lempa',
    name: 'Café Lempa',
    initials: 'CL',
    area: 'Col. Palmira',
    distanceKm: '0.4 km',
    open: true,
    waitLabel: 'Listo en ~10 min',
    hoursLabel: 'Abierto hasta 7:00 p. m.',
    stamps: 6,
    stampGoal: 8,
  },
  {
    id: 'molienda',
    name: 'La Molienda',
    initials: 'LM',
    area: 'Barrio Guanacaste',
    distanceKm: '1.2 km',
    open: true,
    waitLabel: 'Listo en ~15 min',
    hoursLabel: 'Abierto hasta 6:00 p. m.',
    stamps: 2,
    stampGoal: 10,
  },
  {
    id: 'valle',
    name: 'Tostadores del Valle',
    initials: 'TV',
    area: 'Lomas del Guijarro',
    distanceKm: '2.8 km',
    open: false,
    closedReason: 'closed',
    waitLabel: 'Abre mañana 6:30 a. m.',
    hoursLabel: 'Cerrado',
    stamps: 8,
    stampGoal: 8,
  },
];

export const PRODUCTS: readonly MockProduct[] = [
  { id: 'capuchino', categoryId: 'cafe', name: 'Capuchino', description: 'Espresso doble, leche vaporizada y espuma', priceCents: 7000, customizable: true },
  { id: 'latte', categoryId: 'cafe', name: 'Latte', description: 'Espresso con leche, suave y cremoso', priceCents: 7500, customizable: true },
  { id: 'americano', categoryId: 'cafe', name: 'Americano', description: 'Espresso alargado con agua caliente', priceCents: 5000, customizable: true },
  { id: 'moca', categoryId: 'cafe', name: 'Moca', description: 'Espresso, chocolate y leche', priceCents: 8000, soldOut: true, customizable: true },
  { id: 'cold-brew', categoryId: 'cafe', name: 'Cold brew', description: 'Infusión en frío por 18 horas', priceCents: 8500, customizable: true },
  { id: 'chai', categoryId: 'te', name: 'Chai latte', description: 'Té negro especiado con leche', priceCents: 7000, customizable: false },
  { id: 'manzanilla', categoryId: 'te', name: 'Té de manzanilla', description: 'Infusión caliente', priceCents: 4000, customizable: false },
  { id: 'baleada', categoryId: 'comida', name: 'Baleada sencilla', description: 'Frijoles, queso y mantequilla', priceCents: 3500, customizable: false },
  { id: 'sandwich', categoryId: 'comida', name: 'Sándwich de pavo', description: 'Pan artesanal, queso y vegetales', priceCents: 9500, customizable: false },
  { id: 'croissant', categoryId: 'reposteria', name: 'Croissant', description: 'Horneado esta mañana', priceCents: 4500, customizable: false },
  { id: 'pan-banano', categoryId: 'reposteria', name: 'Pan de banano', description: 'Rebanada con nueces', priceCents: 5000, soldOut: true, customizable: false },
];

/** Menu preview on the closed-shop screen. */
export const CLOSED_SHOP_MENU = [
  { name: 'Espresso', priceCents: 4500 },
  { name: 'Capuchino', priceCents: 7000 },
  { name: 'Flat white', priceCents: 7500 },
  { name: 'Croissant', priceCents: 4500 },
];

export interface PastOrder {
  id: string;
  shop: string;
  date: string;
  items: string;
  totalCents: number;
  status: 'completed' | 'cancelled';
}

export const PAST_ORDERS: readonly PastOrder[] = [
  { id: 'p1', shop: 'Café Lempa', date: 'Ayer · 8:42 a. m.', items: 'Latte mediano, Croissant', totalCents: 12000, status: 'completed' },
  { id: 'p2', shop: 'La Molienda', date: 'Lun 9 nov · 3:10 p. m.', items: 'Cold brew, Pan de banano', totalCents: 13500, status: 'completed' },
  { id: 'p3', shop: 'Café Lempa', date: 'Vie 6 nov · 7:55 a. m.', items: 'Americano grande', totalCents: 7000, status: 'cancelled' },
];

export const PICKUP_SLOTS = [
  { id: 'asap', label: 'Lo antes posible', sub: '~10 min' },
  { id: '0920', label: '9:20 a. m.', sub: '' },
  { id: '0930', label: '9:30 a. m.', sub: '' },
  { id: '0940', label: '9:40 a. m.', sub: 'Lleno', full: true },
  { id: '0950', label: '9:50 a. m.', sub: '' },
  { id: '1000', label: '10:00 a. m.', sub: '' },
] as const;

export const REWARD_CODE = 'TV-7F3K-29';
export const MOCK_CUSTOMER_NAME = 'Diego';
