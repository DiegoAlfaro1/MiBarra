// Invites someone to work at a shop. Staff logins are only ever created here, never by signing up.
//
// 1. First check: with the inviter's own login, can_invite_staff() confirms their role allows it
//    (owners and platform admins invite anyone, managers only baristas).
// 2. A customer login can never become staff. A new email gets a staff login (app_metadata
//    account_type = staff, so no customer profile is created).
// 3. Second check: add_shop_member() re-checks the inviter's role in the database, adds the
//    membership and writes to audit_log in one transaction.
// 4. The person gets an invitation link by email. Existing staff logins just sign in as usual.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/cors.ts';
import { type ExistingAccount, planInvite, validateStaffInviteInput } from '../_shared/staff-invite.ts';

// Messages raised by add_shop_member() that are safe to show to the inviter.
const USER_ERROR_CODES = new Set(['22023', '42501']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'You need to sign in to invite staff.' }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  const input = validateStaffInviteInput(body);
  if (!input.ok) return json({ error: input.error }, 400);
  const { shopId, role, email } = input.value;

  const url = Deno.env.get('SUPABASE_URL')!;
  const asInviter = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await asInviter.auth.getUser();
  if (userError || !userData.user) return json({ error: 'You need to sign in to invite staff.' }, 401);
  const actorId = userData.user.id;

  const { data: allowed, error: allowedError } = await asInviter.rpc('can_invite_staff', {
    p_shop_id: shopId,
    p_role: role,
  });
  if (allowedError) {
    console.error('can_invite_staff failed', allowedError.code);
    return json({ error: 'We could not send the invitation. Please try again.' }, 500);
  }
  if (allowed !== true) return json({ error: 'You don\'t have permission to invite this role at this shop.' }, 403);

  const server = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: accounts, error: accountError } = await server.rpc('account_for_email', { p_email: email });
  if (accountError) {
    console.error('account_for_email failed', accountError.code);
    return json({ error: 'We could not send the invitation. Please try again.' }, 500);
  }
  const plan = planInvite((accounts as ExistingAccount[] | null)?.[0]);
  if (plan.kind === 'reject') return json({ error: plan.error }, 409);

  let userId: string;
  if (plan.kind === 'invite') {
    const { data: created, error: createError } = await server.auth.admin.createUser({
      email,
      app_metadata: { account_type: 'staff' },
      user_metadata: { account_type: 'staff' },
    });
    if (createError || !created.user) {
      console.error('createUser failed', createError?.status);
      return json({ error: 'We could not send the invitation. Please try again.' }, 500);
    }
    userId = created.user.id;
  } else {
    userId = plan.userId;
  }

  const { data: member, error: memberError } = await server.rpc('add_shop_member', {
    p_actor: actorId,
    p_shop_id: shopId,
    p_user_id: userId,
    p_role: role,
  });
  if (memberError) {
    if (USER_ERROR_CODES.has(memberError.code)) {
      return json({ error: memberError.message }, memberError.code === '42501' ? 403 : 400);
    }
    console.error('add_shop_member failed', memberError.code);
    return json({ error: 'We could not send the invitation. Please try again.' }, 500);
  }

  if (plan.kind !== 'add') {
    const redirectTo = Deno.env.get('STAFF_INVITE_REDIRECT_URL') ?? undefined;
    const { error: inviteError } = await server.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { account_type: 'staff' },
    });
    if (inviteError) {
      // The membership exists; retrying sends the email again without adding anyone twice.
      console.error('inviteUserByEmail failed', inviteError.status);
      return json({ error: 'They were added, but the invitation email failed. Please try again.' }, 502);
    }
  }

  return json({ member, invited: plan.kind !== 'add' });
});
