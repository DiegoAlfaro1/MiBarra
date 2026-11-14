import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { PICKUP_SLOTS, SHOPS } from '../data/mock';
import { useAppState } from '../state/AppState';
import { cartTotalCents } from './cart';
import { pickupLabelFor, validateCheckout, type PaymentMethod, type PickupSlot } from './checkout';
import type { FieldErrors } from './validation';

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
  // Guards against double taps so one checkout never creates two orders.
  const submitted = useRef(false);

  const shop = SHOPS.find((s) => s.id === cart.shopId);
  const slot = (PICKUP_SLOTS as readonly PickupSlot[]).find((s) => s.id === slotId);
  const total = cartTotalCents(cart.lines);
  const pickupLabel = slot ? pickupLabelFor(slot) : '';

  const choosePayment = (next: PaymentMethod) => {
    setPayment(next);
    setErrors({});
  };

  const submit = () => {
    if (submitted.current || !shop) return;
    const found = validateCheckout({ name, phone, slot, payment, card: { number, expiry, cvv } });
    setErrors(found);
    if (Object.keys(found).length) return;
    submitted.current = true;
    placeOrder({
      code: 'A-1042',
      shopId: shop.id,
      shopName: shop.name,
      lines: cart.lines,
      totalCents: total,
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
    isEmpty: !cart.lines.length || !shop,
    slotId,
    setSlotId,
    payment,
    choosePayment,
    card: { number, expiry, cvv, setNumber, setExpiry, setCvv },
    contact: { name, phone, setName, setPhone },
    errors,
    submit,
  };
}

export type Checkout = ReturnType<typeof useCheckout>;
