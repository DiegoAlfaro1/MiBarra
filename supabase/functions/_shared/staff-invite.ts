// Pure logic for the staff-invite function (no Deno APIs) so it can be unit-tested with `node --test`.

export const INVITABLE_ROLES = ['owner', 'manager', 'barista'] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export interface StaffInviteInput {
  shopId: string;
  role: InvitableRole;
  email: string;
}

export type StaffInviteValidation = { ok: true; value: StaffInviteInput } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_EMAIL_LENGTH = 254;

export function validateStaffInviteInput(body: unknown): StaffInviteValidation {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'Invalid request.' };
  const { shopId, role, email } = body as Record<string, unknown>;

  if (typeof shopId !== 'string' || !UUID_RE.test(shopId)) return { ok: false, error: 'Please choose a shop.' };
  if (typeof role !== 'string' || !(INVITABLE_ROLES as readonly string[]).includes(role)) {
    return { ok: false, error: 'Choose a role: owner, manager or barista.' };
  }
  if (typeof email !== 'string') return { ok: false, error: 'Enter the email address of the person to invite.' };
  const normalized = email.trim().toLowerCase();
  if (normalized.length === 0) return { ok: false, error: 'Enter the email address of the person to invite.' };
  if (normalized.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(normalized)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  return { ok: true, value: { shopId, role: role as InvitableRole, email: normalized } };
}

/** What `account_for_email()` returns for an email that already has a login. */
export interface ExistingAccount {
  user_id: string;
  account_type: 'staff' | 'customer';
  confirmed: boolean;
}

export type InvitePlan =
  /** No login yet: create a staff login and email them an invitation link. */
  | { kind: 'invite' }
  /** A staff login that never accepted its invitation: send the link again. */
  | { kind: 'reinvite'; userId: string }
  /** An active staff login (e.g. someone working at another shop): add them, they sign in as usual. */
  | { kind: 'add'; userId: string }
  /** A customer login can never be turned into a staff login. */
  | { kind: 'reject'; error: string };

export const CUSTOMER_EMAIL_ERROR =
  'This email belongs to a customer account. Use a different email for the staff login.';

export function planInvite(existing: ExistingAccount | null | undefined): InvitePlan {
  if (!existing) return { kind: 'invite' };
  if (existing.account_type !== 'staff') return { kind: 'reject', error: CUSTOMER_EMAIL_ERROR };
  return existing.confirmed ? { kind: 'add', userId: existing.user_id } : { kind: 'reinvite', userId: existing.user_id };
}
