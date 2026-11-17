// Domain types shared by the mobile app, the dashboard and the edge functions.
// Keep in sync with supabase/migrations.

export const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'completed', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_PROVIDERS = ['cash', 'stripe', 'paypal', 'other'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const OPTION_KINDS = ['size', 'extra'] as const;
export type OptionKind = (typeof OPTION_KINDS)[number];

export const STAFF_ROLES = ['owner', 'manager', 'barista'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const LOYALTY_SCAN_ACTIONS = ['stamp', 'redeem'] as const;
export type LoyaltyScanAction = (typeof LOYALTY_SCAN_ACTIONS)[number];

/** Opening hours per weekday, e.g. `{ mon: { open: '07:00', close: '19:00' }, sun: null }`. */
export type ShopHours = Partial<Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', { open: string; close: string } | null>>;

export interface Shop {
  id: string;
  name: string;
  currency: string;
  logo_url: string | null;
  address: string | null;
  /** Contact phone in E.164, e.g. `+50422223333`. */
  phone: string | null;
  hours: ShopHours;
  /** IANA timezone the working hours are in, e.g. `America/Tegucigalpa`. */
  timezone: string;
  is_open: boolean;
  payment_provider: PaymentProvider;
  /** Loyalty rule: a reward every N completed orders. Null means no loyalty program. */
  loyalty_stamps_required: number | null;
  loyalty_reward: string | null;
  /** Set by a platform admin: hidden from customers, closed, and staff cannot reopen it. */
  suspended: boolean;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  shop_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface MenuItem {
  id: string;
  shop_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  photo_url: string | null;
  available: boolean;
  created_at: string;
}

export interface ItemOption {
  id: string;
  item_id: string;
  kind: OptionKind;
  name: string;
  price_change_cents: number;
  available: boolean;
  created_at: string;
}

export interface Customer {
  /** Same id as the login (auth.users). */
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  shop_id: string;
  customer_id: string;
  status: OrderStatus;
  pickup_time: string | null;
  total_cents: number;
  payment_status: PaymentStatus;
  note: string | null;
  idempotency_key: string;
  loyalty_awarded_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Snapshot of an option as it was when the order was placed. */
export interface ChosenOption {
  id: string;
  name: string;
  price_change_cents: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  chosen_options: ChosenOption[];
  /** Price of one unit at order time, including chosen options. */
  unit_price_cents: number;
}

export interface LoyaltyCard {
  id: string;
  customer_id: string;
  shop_id: string;
  stamps: number;
  rewards_available: number;
  qr_code_value: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
  optionIds?: string[];
}

export interface PlaceOrderInput {
  shopId: string;
  items: OrderItemInput[];
  /** Optional note for the shop (at most 280 characters). */
  note?: string;
  /** ISO timestamp of a pickup slot from `listPickupSlots`; leave out to prepare as soon as possible. */
  pickupTime?: string;
}

/** Links a staff login to a shop with a role. Removing someone sets `active` to false. */
export interface ShopMember {
  shop_id: string;
  user_id: string;
  role: StaffRole;
  active: boolean;
  invited_by: string | null;
  created_at: string;
}

export interface PlatformAdmin {
  user_id: string;
  created_at: string;
}

/** Append-only record of a sensitive action. */
export interface AuditLogEntry {
  id: number;
  user_id: string | null;
  shop_id: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown>;
  time: string;
}

export interface LoyaltyScan {
  id: string;
  card_id: string;
  shop_id: string;
  customer_id: string;
  staff_id: string | null;
  action: LoyaltyScanAction;
  idempotency_key: string;
  created_at: string;
}
