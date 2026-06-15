import { create } from 'zustand';

/**
 * Free vs Pro gating (PRD §11).
 *
 * Phase 4 placeholder: the entitlement lives in a local store defaulting to
 * "free". In Phase 6 this is replaced by the RevenueCat `pro` entitlement as the
 * source of truth; screens keep using {@link useIsPro} unchanged.
 */
export type Entitlement = 'free' | 'pro';

/** Pro-only features (PRD §11), used for gating and paywall context. */
export type ProFeature =
  | 'multiple_income_sources'
  | 'state_tax'
  | 'deductions'
  | 'safe_harbor'
  | 'reports'
  | 'ask_ai'
  | 'cloud_sync';

type EntitlementState = {
  entitlement: Entitlement;
  setEntitlement: (entitlement: Entitlement) => void;
};

export const useEntitlementStore = create<EntitlementState>()((set) => ({
  entitlement: 'free',
  setEntitlement: (entitlement) => set({ entitlement }),
}));

/** Reactive: true when the user has Pro. */
export function useIsPro(): boolean {
  return useEntitlementStore((s) => s.entitlement === 'pro');
}

/** Non-reactive read (for event handlers / one-off checks). */
export function isProNow(): boolean {
  return useEntitlementStore.getState().entitlement === 'pro';
}
