// Domain types shared by the mobile app, the dashboard and the edge functions.
// Keep in sync with supabase/migrations.

export const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STAFF_ROLES = ['owner', 'barista'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface Shop {
  id: string;
  name: string;
  currency: string;
  created_at: string;
}

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  price_cents: number;
  is_available: boolean;
}

export interface Order {
  id: string;
  shop_id: string;
  customer_id: string;
  status: OrderStatus;
  total_cents: number;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price_cents: number;
}

export interface LoyaltyLedgerEntry {
  id: string;
  customer_id: string;
  shop_id: string;
  order_id: string | null;
  points: number;
  reason: string;
  created_at: string;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
}

export interface PlaceOrderInput {
  shopId: string;
  items: OrderItemInput[];
}
