import { listPickupSlots, loadShopMenu, slotClockLabel, soldOutLines, soldOutMessage, type PickupSlotOption } from '@mibarra/shared';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { PICKUP_SLOTS, SHOPS } from '../data/mock';
import { useAppState } from '../state/AppState';
import { cartTotalCents } from './cart';
import {
  orderCode,
  pickupTimeFor,
  slotChoices,
  orderErrorMessage,
  orderItemsFromCart,
  pickupLabelFor,
  validateCheckout,
  type PaymentMethod,
  type PickupSlot,
} from './checkout';
import { newCheckoutKey, submitOrder } from './orders';
import { supabase } from './supabase';
import { useCartShop } from './useCartShop';
import type { FieldErrors } from './validation';

export interface CheckoutShop {
  id: string;
  name: string;
  /** Neighbourhood, for sample shops. */
  area?: string;
  live: boolean;
  prepMinutes?: number;
}

// All checkout state and submit logic, shared by the phone screen and the web layout
// so the two UIs only differ in presentation.
export function useCheckout() {
  const { cart, dispatch, placeOrder, session } = useAppState();
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
  const live = shop?.live ?? false;
  const shopId = shop?.id;
  // Slots are loaded per shop; a result for another shop (or none yet) counts as still loading.
  const [loaded, setLoaded] = useState<{ shopId: string; slots: PickupSlotOption[]; failed: boolean } | null>(null);
  useEffect(() => {
    if (!live || !shopId) return;
    let cancelled = false;
    listPickupSlots(supabase, shopId)
      .then((found) => !cancelled && setLoaded({ shopId, slots: found, failed: false }))
      .catch(() => !cancelled && setLoaded({ shopId, slots: [], failed: true }));
    return () => {
      cancelled = true;
    };
  }, [live, shopId]);
  const ready = loaded?.shopId === shopId ? loaded : null;
  const shopSlots = ready?.slots ?? [];
  const slotsLoading = live && !!shopId && !ready;
  const slotsError = ready?.failed ?? false;
  const slots: readonly PickupSlot[] = live ? slotChoices(shopSlots, slotClockLabel) : PICKUP_SLOTS;
  // A slot that disappeared (it filled up or passed) falls back to "as soon as possible".
  const slot = slots.find((s) => s.id === slotId) ?? slots[0];
  const total = cartTotalCents(cart.lines);
  const pickupLabel = slot ? pickupLabelFor(slot) : '';

  const choosePayment = (next: PaymentMethod) => {
    setPayment(next);
    setErrors({});
  };

  // Items can sell out while the customer is shopping: drop them from the cart and say which ones.
  // Returns true when something was removed. If the menu can't be loaded, the server check in place_order still applies.
  const dropSoldOut = async (shopId: string): Promise<boolean> => {
    try {
      const menu = await loadShopMenu(supabase, shopId);
      const gone = soldOutLines(cart.lines, menu);
      if (!gone.length) return false;
      for (const line of gone) dispatch({ type: 'remove', id: line.id });
      setSubmitError(soldOutMessage(gone.map((l) => l.name)));
      return true;
    } catch {
      return false;
    }
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
    let orderId: string | undefined;
    let placedAt: string | undefined;
    if (shop.live) {
      // Orders for real shops need a MiBarra account (the guest session has no login).
      if (session?.guest) {
        submitted.current = false;
        setSubmitError('Para pedir en esta cafetería necesitas una cuenta. Crea una o inicia sesión desde tu perfil.');
        return;
      }
      setSubmitting(true);
      if (await dropSoldOut(shop.id)) {
        submitted.current = false;
        setSubmitting(false);
        return;
      }
      checkoutKey.current ??= newCheckoutKey();
      try {
        const order = await submitOrder(
          { shopId: shop.id, items: orderItemsFromCart(cart.lines), note: cart.note.trim() || undefined, pickupTime: pickupTimeFor(slot) },
          checkoutKey.current,
        );
        code = orderCode(order.id);
        totalCents = order.total_cents;
        orderId = order.id;
        placedAt = order.created_at;
      } catch (e) {
        submitted.current = false;
        setSubmitting(false);
        // It sold out between our check and the order: refresh the cart and name the item.
        if (e instanceof Error && /products are not available|products are sold out/i.test(e.message) && (await dropSoldOut(shop.id))) return;
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
      orderId,
      placedAt,
      prepMinutes: shop.prepMinutes,
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
    slotId: slot?.id ?? slotId,
    setSlotId,
    slots,
    slotsLoading,
    slotsError,
    scheduled: !!slot?.start,
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
