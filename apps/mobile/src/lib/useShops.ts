import type { MenuData, MenuItemDetail, Shop } from '@mibarra/shared';
import { findShop, getMenuItem, listShops, loadShopMenu } from '@mibarra/shared';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from './supabase';

export type Loadable<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

function useLoad<T>(load: () => Promise<T>, key: string): [Loadable<T>, () => void] {
  const [attempt, setAttempt] = useState(0);
  // Results are tagged with what they were loaded for, so anything else counts as loading.
  const [result, setResult] = useState<{ tag: string; state: Loadable<T> } | null>(null);
  const tag = `${key}#${attempt}`;

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => !cancelled && setResult({ tag, state: { status: 'ready', data } }),
      (e: unknown) =>
        !cancelled &&
        setResult({
          tag,
          state: { status: 'error', message: e instanceof Error ? e.message : 'No pudimos cargar los datos. Inténtalo de nuevo.' },
        }),
    );
    return () => {
      cancelled = true;
    };
    // `load` is rebuilt every render; `tag` identifies what is being loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag]);

  return [result?.tag === tag ? result.state : { status: 'loading' }, useCallback(() => setAttempt((n) => n + 1), [])];
}

/** Every shop customers can see, read from Supabase. */
export const useShops = () => useLoad<Shop[]>(() => listShops(supabase), 'all');

/** One shop by id; `data` is null when it does not exist. */
export const useShop = (id: string | undefined) => useLoad<Shop | null>(() => (id ? findShop(supabase, id) : Promise.resolve(null)), id ?? '');

/** A shop's menu (categories, items and options) as the owner saved it. */
export const useShopMenu = (shopId: string) => useLoad<MenuData>(() => loadShopMenu(supabase, shopId), shopId);

/** One menu item with its options; `data` is null when it does not exist or its shop is hidden. */
export const useMenuItem = (itemId: string) => useLoad<MenuItemDetail | null>(() => getMenuItem(supabase, itemId), itemId);
