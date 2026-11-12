import { placeOrder, type PlaceOrderInput } from '@mibarra/shared';
import { randomUUID } from 'expo-crypto';

import { supabase } from './supabase';

/** Create once when the customer starts checkout; reuse it for every retry of that checkout. */
export function newCheckoutKey(): string {
  return randomUUID();
}

export function submitOrder(input: PlaceOrderInput, checkoutKey: string) {
  return placeOrder(supabase, input, checkoutKey);
}
