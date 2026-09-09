'use client';

import React, { createContext, useContext } from 'react';

export interface PublicSettings {
  restaurantName: string;
  tagline: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  deliveryFee: string;
  minOrderAmount: string;
  taxPercentage: string;
  currency: string;
  isAcceptingOrders: boolean;
  isOpenNow: boolean;
}

const SettingsContext = createContext<PublicSettings | null>(null);

export function SettingsProvider({
  settings,
  children,
}: {
  settings: PublicSettings;
  children: React.ReactNode;
}) {
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

export function useSettings(): PublicSettings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
