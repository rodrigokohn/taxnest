import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';

import { env } from '@/config/env';

let configured = false;

/** Configure RevenueCat once. No-op without a key or off iOS (e.g. simulator dev). */
export function configurePurchases(): void {
  if (configured || !env.revenueCatIosKey || Platform.OS !== 'ios') return;
  Purchases.configure({ apiKey: env.revenueCatIosKey });
  configured = true;
}

export function purchasesReady(): boolean {
  return configured;
}

/** Tie the RevenueCat identity to the signed-in Supabase user (entitlement follows the account). */
export async function identifyPurchaser(userId: string): Promise<CustomerInfo | null> {
  if (!configured) return null;
  const { customerInfo } = await Purchases.logIn(userId);
  return customerInfo;
}

/** Drop the RevenueCat identity on sign-out (reverts to an anonymous id). */
export async function resetPurchaser(): Promise<void> {
  if (!configured) return;
  try {
    await Purchases.logOut();
  } catch {
    // logOut rejects if already anonymous — safe to ignore.
  }
}

export async function getCustomerInfoSafe(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export function onCustomerInfoUpdate(listener: (info: CustomerInfo) => void): void {
  if (!configured) return;
  Purchases.addCustomerInfoUpdateListener(listener);
}

/** Annual + monthly packages from the current offering, if configured. */
export async function getSubscriptionPackages(): Promise<{
  annual: PurchasesPackage | null;
  monthly: PurchasesPackage | null;
}> {
  if (!configured) return { annual: null, monthly: null };
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  return { annual: current?.annual ?? null, monthly: current?.monthly ?? null };
}

/** Run a purchase; returns the resulting CustomerInfo for the caller to apply to the store. */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!configured) return null;
  return Purchases.restorePurchases();
}

/** True when a purchase error is just the user dismissing the App Store sheet. */
export function isUserCancelled(err: unknown): boolean {
  return Boolean((err as { userCancelled?: boolean })?.userCancelled);
}

/** Free intro period of a package, when it's actually free (price 0), else null.
 *  Apple has no "14 days" option — it models that as 2 weeks (P2W). We expand weeks
 *  into days so a 2-week trial reads as "14 days" rather than "2 weeks". */
function freeIntroPeriod(pkg: PurchasesPackage): { units: number; unit: string } | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price > 0) return null;
  let units = intro.periodNumberOfUnits;
  let unit = intro.periodUnit.toLowerCase(); // 'day' | 'week' | 'month' | 'year'
  if (unit === 'week') {
    units *= 7;
    unit = 'day';
  }
  return { units, unit };
}

/** "14-day free trial"-style label from a package's intro offer, when it's actually free. */
export function freeTrialLabel(pkg: PurchasesPackage): string | null {
  const p = freeIntroPeriod(pkg);
  return p ? `${p.units}-${p.unit} free trial` : null;
}

/** "14 days"-style duration phrase from a package's free intro offer, when present. */
export function freeTrialDuration(pkg: PurchasesPackage): string | null {
  const p = freeIntroPeriod(pkg);
  return p ? `${p.units} ${p.unit}${p.units === 1 ? '' : 's'}` : null;
}
