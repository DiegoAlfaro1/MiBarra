// Drink customisation options (sample data from the Item design).

export interface SizeOption {
  id: string;
  label: string;
  oz: string;
  extraCents: number;
}
export interface MilkOption {
  id: string;
  label: string;
  extraCents: number;
}
export interface ExtraOption {
  id: string;
  label: string;
  priceCents: number;
}

export const SIZES: readonly SizeOption[] = [
  { id: 'small', label: 'Pequeño', oz: '12 oz', extraCents: 0 },
  { id: 'medium', label: 'Mediano', oz: '16 oz', extraCents: 1000 },
  { id: 'large', label: 'Grande', oz: '20 oz', extraCents: 2000 },
];

export const MILKS: readonly MilkOption[] = [
  { id: 'whole', label: 'Entera', extraCents: 0 },
  { id: 'lactose-free', label: 'Deslactosada', extraCents: 0 },
  { id: 'almond', label: 'Almendra', extraCents: 1500 },
  { id: 'oat', label: 'Avena', extraCents: 1500 },
];

export const EXTRAS: readonly ExtraOption[] = [
  { id: 'shot', label: 'Shot extra de espresso', priceCents: 1500 },
  { id: 'vanilla', label: 'Sirope de vainilla', priceCents: 1000 },
  { id: 'caramel', label: 'Sirope de caramelo', priceCents: 1000 },
];
