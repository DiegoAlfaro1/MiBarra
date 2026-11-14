// The permission matrix from issue #22, for deciding which buttons the apps show.
// This is only for the UI: the database (RLS and the functions in
// supabase/migrations/20261114100000_access_control.sql) is what actually enforces it.

import { STAFF_ROLES, type StaffRole } from './types.ts';

export const ACCESS_ROLES = ['customer', ...STAFF_ROLES, 'platform_admin'] as const;
export type AccessRole = (typeof ACCESS_ROLES)[number];

/**
 * - `yes`: everywhere
 * - `own`: only rows that belong to the person
 * - `own_shop`: only the shops where the person has that role
 * - `limited`: partly (see the comment on the action)
 * - `no`: never
 */
export type Access = 'yes' | 'own' | 'own_shop' | 'limited' | 'no';

type Row = Record<AccessRole, Access>;
const row = (customer: Access, barista: Access, manager: Access, owner: Access, platform_admin: Access): Row => ({
  customer,
  barista,
  manager,
  owner,
  platform_admin,
});

export const PERMISSIONS = {
  browseMenus: row('yes', 'yes', 'yes', 'yes', 'yes'),
  manageOwnOrders: row('own', 'no', 'no', 'no', 'no'),
  viewShopOrders: row('no', 'own_shop', 'own_shop', 'own_shop', 'yes'),
  changeOrderStatus: row('no', 'own_shop', 'own_shop', 'own_shop', 'no'),
  /** Cancel after preparation starts, or refund. */
  cancelLateOrRefund: row('no', 'no', 'own_shop', 'own_shop', 'no'),
  markSoldOut: row('no', 'own_shop', 'own_shop', 'own_shop', 'no'),
  openCloseShop: row('no', 'no', 'own_shop', 'own_shop', 'no'),
  scanLoyaltyQr: row('no', 'own_shop', 'own_shop', 'own_shop', 'no'),
  editMenu: row('no', 'no', 'own_shop', 'own_shop', 'yes'),
  createOffers: row('no', 'no', 'own_shop', 'own_shop', 'no'),
  changeLoyaltyRules: row('no', 'no', 'no', 'own_shop', 'no'),
  /** Baristas only see the daily order count. */
  viewSalesReports: row('no', 'limited', 'own_shop', 'own_shop', 'yes'),
  /** Baristas only see the name. Platform admin access is logged. */
  seeCustomerContact: row('own', 'limited', 'own_shop', 'own_shop', 'yes'),
  /** Managers invite and remove baristas only. */
  manageStaff: row('no', 'no', 'limited', 'own_shop', 'yes'),
  /** Shop profile, payment provider and billing. */
  editShopSettings: row('no', 'no', 'no', 'own_shop', 'yes'),
  createOrSuspendShops: row('no', 'no', 'no', 'no', 'yes'),
} as const satisfies Record<string, Row>;

export type Permission = keyof typeof PERMISSIONS;

export function accessFor(role: AccessRole | null | undefined, permission: Permission): Access {
  if (!role) return permission === 'browseMenus' ? 'yes' : 'no';
  return PERMISSIONS[permission][role];
}

/** Whether to show the control at all. Use `accessFor` when the scope matters. */
export function can(role: AccessRole | null | undefined, permission: Permission): boolean {
  return accessFor(role, permission) !== 'no';
}

/** Mirrors `can_manage_role()` in the database: who may invite or remove whom. */
export function canManageRole(actor: StaffRole | 'platform_admin' | null | undefined, target: StaffRole): boolean {
  if (actor === 'platform_admin' || actor === 'owner') return true;
  return actor === 'manager' && target === 'barista';
}

/** Roles the actor may pick when inviting someone, in display order. */
export function invitableRoles(actor: StaffRole | 'platform_admin' | null | undefined): StaffRole[] {
  return STAFF_ROLES.filter((role) => canManageRole(actor, role));
}

/**
 * Staff logins are created by the staff-invite function with `app_metadata.account_type = 'staff'`.
 * Only the server can set app metadata, so this can't be faked by signing up.
 * Use it to send staff and customers to their own sign-in screens.
 */
export function isStaffAccount(user: { app_metadata?: Record<string, unknown> | null } | null | undefined): boolean {
  return user?.app_metadata?.account_type === 'staff';
}
