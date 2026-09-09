'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export interface CartAddon {
  addonId: string;
  name: string;
  price: number;
}

export interface CartItem {
  key: string;
  productId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  addons: CartAddon[];
  specialInstructions?: string;
}

interface CartState {
  items: CartItem[];
  couponCode: string | null;
}

interface CartContextValue extends CartState {
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'key'>) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
  setCouponCode: (code: string | null) => void;
  isHydrated: boolean;
}

const STORAGE_KEY = 'zaiqa_cart_v1';

const CartContext = createContext<CartContextValue | null>(null);

function buildKey(productId: string, addons: CartAddon[], specialInstructions?: string): string {
  const addonPart = addons
    .map((a) => a.addonId)
    .sort()
    .join(',');
  return `${productId}::${addonPart}::${specialInstructions?.trim() ?? ''}`;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>({ items: [], couponCode: null });
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR/client mismatch)
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        setState(parsed);
      }
    } catch {
      // Corrupt storage — start fresh rather than crashing the app
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full/unavailable — cart still works in-memory for this session
    }
  }, [state, isHydrated]);

  const addItem: CartContextValue['addItem'] = (item) => {
    const key = buildKey(item.productId, item.addons, item.specialInstructions);
    setState((prev) => {
      const existingIndex = prev.items.findIndex((i) => i.key === key);
      if (existingIndex >= 0) {
        const next = [...prev.items];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + item.quantity,
        };
        return { ...prev, items: next };
      }
      return { ...prev, items: [...prev.items, { ...item, key }] };
    });
  };

  const updateQuantity: CartContextValue['updateQuantity'] = (key, quantity) => {
    setState((prev) => {
      if (quantity <= 0) {
        return { ...prev, items: prev.items.filter((i) => i.key !== key) };
      }
      return {
        ...prev,
        items: prev.items.map((i) => (i.key === key ? { ...i, quantity } : i)),
      };
    });
  };

  const removeItem: CartContextValue['removeItem'] = (key) => {
    setState((prev) => ({ ...prev, items: prev.items.filter((i) => i.key !== key) }));
  };

  const clearCart = () => setState({ items: [], couponCode: null });

  const setCouponCode: CartContextValue['setCouponCode'] = (code) => {
    setState((prev) => ({ ...prev, couponCode: code }));
  };

  const itemCount = useMemo(
    () => state.items.reduce((sum, i) => sum + i.quantity, 0),
    [state.items]
  );

  const subtotal = useMemo(
    () =>
      state.items.reduce((sum, i) => {
        const addonsTotal = i.addons.reduce((a, addon) => a + addon.price, 0);
        return sum + (i.unitPrice + addonsTotal) * i.quantity;
      }, 0),
    [state.items]
  );

  const value: CartContextValue = {
    ...state,
    itemCount,
    subtotal,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    setCouponCode,
    isHydrated,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
