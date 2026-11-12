// Creates an order for the signed-in customer.
// Idempotency and pricing are enforced in the `place_order` SQL function; this
// function validates input and is the place to add payment provider calls later.
import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders, json } from '../_shared/cors.ts';
import { validateOrderInput } from '../_shared/order-input.ts';

// Messages raised by place_order() that are safe to show to the user.
const USER_ERROR_CODES = new Set(['22023', '28000']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization) return json({ error: 'You need to sign in to place an order.' }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }

  const input = validateOrderInput(body);
  if (!input.ok) return json({ error: input.error }, 400);

  // Act as the calling user so auth.uid() and RLS apply.
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
  });

  const { data, error } = await supabase.rpc('place_order', {
    p_shop_id: input.value.shopId,
    p_items: input.value.items,
    p_idempotency_key: input.value.idempotencyKey,
  });

  if (error) {
    if (USER_ERROR_CODES.has(error.code)) {
      return json({ error: error.message }, error.code === '28000' ? 401 : 400);
    }
    console.error('place_order failed', error.code);
    return json({ error: 'We could not place your order. Please try again.' }, 500);
  }

  return json({ order: data });
});
