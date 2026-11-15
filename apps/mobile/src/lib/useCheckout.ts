import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { PICKUP_SLOTS, SHOPS } from '../data/mock';
import { useAppState } from '../state/AppState';
import { cartTotalCents } from './cart';
import {
  orderCode,
  orderErrorMessage,
  orderItemsFromCart,
  pickupLabelFor,
  validateCheckout,
  type PaymentMethod,
  type PickupSlot,
} from './checkout';
import { newCheckoutKey, submitOrder } from './orders';
import { useCartShop } from './useCartShop';
import type { FieldErrors } from './validation';

export interface CheckoutShop {
  id: string;
  name: string;
  /** Neighbourhood, for sample shops. */
  area?: string;
  live: boolean;
}

// All checkout state and submit logic, shared by the phone screen and the web layout
// so the two UIs only differ in presentation.
export function useCheckout() {
  const { cart, placeOrder, session } = useAppState();
  const [slotId, setSlotId] = useState<string>(PICKUP_SLOTS[0].id);
  const [payment, setPayment] = useState<PaymentMethod>('counter');
  const [number, setNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [name, setName] = useState(session?.name ?? '');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Guards against double taps so one checkout never creates two orders.
  const submitted = useRef(false);
  // One key per checkout, reused on every retry: place-order returns the same order instead of a second one.
  const checkoutKey = useRef<string | null>(null);

  const { shop: cartShop, loading: loadingShop } = useCartShop(cart.shopId);
  const sample = SHOPS.find((s) => s.id === cart.shopId);
  const shop: CheckoutShop | undefined = cartShop ? { ...cartShop, area: sample?.area } : undefined;
  const slot = (PICKUP_SLOTS as readonly PickupSlot[]).find((s) => s.id === slotId);
  const total = cartTotalCents(cart.lines);
  const pickupLabel = slot ? pickupLabelFor(slot) : '';

  const choosePayment = (next: PaymentMethod) => {
    setPayment(next);
    setErrors({});
  };

  const submit = async () => {
    if (submitted.current || !shop) return;
    const found = validateCheckout({ name, phone, slot, payment, card: { number, expiry, cvv } });
    setErrors(found);
    setSubmitError(null);
    if (Object.keys(found).length) return;
    submitted.current = true;

    let code = 'A-1042';
    let totalCents = total;
    if (shop.live) {
      // Orders for real shops need a MiBarra account (the guest session has no login).
      if (session?.guest) {
        submitted.current = false;
        setSubmitError('Para pedir en esta cafetería necesitas una cuenta. Crea una o inicia sesión desde tu perfil.');
        return;
      }
      checkoutKey.current ??= newCheckoutKey();
      setSubmitting(true);
      try {
        const order = await submitOrder(
          { shopId: shop.id, items: orderItemsFromCart(cart.lines), note: cart.note.trim() || undefined },
          checkoutKey.current,
        );
        code = orderCode(order.id);
        totalCents = order.total_cents;
      } catch (e) {
        submitted.current = false;
        setSubmitting(false);
        setSubmitError(orderErrorMessage(e instanceof Error ? e.message : undefined));
        return;
      }
      setSubmitting(false);
    }

    placeOrder({
      code,
      shopId: shop.id,
      shopName: shop.name,
      lines: cart.lines,
      totalCents,
      pickupLabel,
      payment,
      status: 'received',
    });
    router.replace('/tracking');
  };

  return {
    cart,
    shop,
    total,
    pickupLabel,
    loadingShop,
    isEmpty: !cart.lines.length || (!shop && !loadingShop),
    slotId,
    setSlotId,
    payment,
    choosePayment,
    card: { number, expiry, cvv, setNumber, setExpiry, setCvv },
    contact: { name, phone, setName, setPhone },
    errors,
    submit: () => void submit(),
    submitting,
    submitError,
  };
}

export type Checkout = ReturnType<typeof useCheckout>;
