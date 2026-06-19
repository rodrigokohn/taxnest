import { type CustomerInfo } from 'react-native-purchases';
import { create } from 'zustand';

/**
 * App access gating. Subscription-only (overrides the freemium PRD §11): after a
 * 30-day free trial the whole app sits behind a subscription. RevenueCat's `pro`
 * entitlement is the source of truth — active during the trial too — and screens
 * keep consulting {@link useIsPro} unchanged.
 */
export const PRO_ENTITLEMENT = 'pro';

export type Entitlement = 'free' | 'pro';
export type SubStatus = 'none' | 'trial' | 'active' | 'expired';

type EntitlementState = {
  entitlement: Entitlement;
  status: SubStatus;
  /** ISO date the period ends/renews (trial end or next renewal), when known. */
  expiresAt: string | null;
  /** True once entitlement is resolved (RevenueCat checked, or unavailable). */
  loaded: boolean;
  applyCustomerInfo: (info: CustomerInfo) => void;
  markLoaded: () => void;
  reset: () => void;
  /** DEV-only override — IAP can't run on the plain simulator. */
  setEntitlement: (entitlement: Entitlement) => void;
};

export const useEntitlementStore = create<EntitlementState>()((set) => ({
  entitlement: 'free',
  status: 'none',
  expiresAt: null,
  loaded: false,

  applyCustomerInfo: (info) => {
    const pro = info.entitlements.active[PRO_ENTITLEMENT];
    if (pro) {
      set({
        entitlement: 'pro',
        status: pro.periodType === 'TRIAL' ? 'trial' : 'active',
        expiresAt: pro.expirationDate,
        loaded: true,
      });
    } else {
      const everSubscribed = Boolean(info.entitlements.all[PRO_ENTITLEMENT]);
      set({
        entitlement: 'free',
        status: everSubscribed ? 'expired' : 'none',
        expiresAt: null,
        loaded: true,
      });
    }
  },

  markLoaded: () => set({ loaded: true }),
  reset: () => set({ entitlement: 'free', status: 'none', expiresAt: null }),
  setEntitlement: (entitlement) =>
    set({ entitlement, status: entitlement === 'pro' ? 'active' : 'none', loaded: true }),
}));

/** Reactive: true when the user has app access (paid or in trial). */
export function useIsPro(): boolean {
  return useEntitlementStore((s) => s.entitlement === 'pro');
}

/** Non-reactive read for event handlers / one-off checks. */
export function isProNow(): boolean {
  return useEntitlementStore.getState().entitlement === 'pro';
}
