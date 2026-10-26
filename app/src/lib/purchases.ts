import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

import { ENTITLEMENT_ID, REVENUECAT_API_KEY } from './config';

/**
 * Thin wrapper around RevenueCat. Prices, trial and paywall design are configured in the
 * RevenueCat dashboard, so they can be A/B tested without shipping an app update.
 * Without an API key (local dev) it runs in a stub mode: never pro, paywall is a no-op.
 */
const enabled = REVENUECAT_API_KEY.length > 0;
let configured = false;
const listeners = new Set<(pro: boolean) => void>();
let lastPro = false;

const isPro = (info: CustomerInfo) => info.entitlements.active[ENTITLEMENT_ID] !== undefined;

function publish(pro: boolean) {
  lastPro = pro;
  listeners.forEach((l) => l(pro));
}

export function initPurchases() {
  if (!enabled || configured) return;
  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  configured = true;
  Purchases.addCustomerInfoUpdateListener((info) => publish(isPro(info)));
  Purchases.getCustomerInfo()
    .then((info) => publish(isPro(info)))
    .catch(() => {});
}

const DEV_ID_KEY = 'flipp:dev-user-id';

/** The id the server uses to look up the subscription. */
export async function getUserId(): Promise<string> {
  if (enabled) return Purchases.getAppUserID();
  let id = await AsyncStorage.getItem(DEV_ID_KEY);
  if (!id) {
    id = `dev:${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    await AsyncStorage.setItem(DEV_ID_KEY, id);
  }
  return id;
}

/** Shows the paywall. Resolves true if the user ends up subscribed. */
export async function showPaywall(): Promise<boolean> {
  if (!enabled) return false;
  const result = await RevenueCatUI.presentPaywall({ displayCloseButton: true });
  return result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
}

export async function restorePurchases(): Promise<boolean> {
  if (!enabled) return false;
  return isPro(await Purchases.restorePurchases());
}

export async function openCustomerCenter() {
  if (enabled) await RevenueCatUI.presentCustomerCenter();
}

export function usePro(): boolean {
  const [pro, setPro] = useState(lastPro);
  useEffect(() => {
    listeners.add(setPro);
    return () => void listeners.delete(setPro);
  }, []);
  return pro;
}
