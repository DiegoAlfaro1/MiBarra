import type { AccessRole } from './permissions.ts';

/** Roles that may open the shop dashboard. Customers never can. */
export const DASHBOARD_ROLES = ['barista', 'manager', 'owner', 'platform_admin'] as const satisfies readonly AccessRole[];
export type DashboardRole = (typeof DASHBOARD_ROLES)[number];

/** One row of the `dashboard_access()` database function. */
export interface DashboardAccessRow {
  shop_id: string | null;
  shop_name: string | null;
  role: string;
}

export interface DashboardAccess {
  /** Highest role the user holds (owner > manager > barista; platform_admin outranks all). */
  role: DashboardRole;
  /** Shop to show first; null for a platform admin with no shop of their own. */
  shopId: string | null;
  shopName: string | null;
}

const RANK: Record<DashboardRole, number> = { barista: 1, manager: 2, owner: 3, platform_admin: 4 };

function isDashboardRole(role: string): role is DashboardRole {
  return (DASHBOARD_ROLES as readonly string[]).includes(role);
}

/** Decides dashboard access from the rows the database returned; null means "not allowed". */
export function resolveDashboardAccess(rows: readonly DashboardAccessRow[] | null | undefined): DashboardAccess | null {
  const allowed = (rows ?? []).filter((r) => isDashboardRole(r.role));
  if (allowed.length === 0) return null;
  const best = allowed.reduce((a, b) => (RANK[b.role as DashboardRole] > RANK[a.role as DashboardRole] ? b : a));
  const shop = allowed.find((r) => r.shop_id) ?? best;
  return { role: best.role as DashboardRole, shopId: shop.shop_id, shopName: shop.shop_name };
}
