import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useEntitlementStore, useIsPro } from '@/config/gating';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  configurePurchases,
  identifyPurchaser,
  onCustomerInfoUpdate,
  purchasesReady,
} from '@/services/purchases';
import { useAuthStore, useProfileStore, useTaxConfigStore } from '@/store';

SplashScreen.preventAutoHideAsync();

/**
 * Root navigation + app bootstrap. Resolves auth, profile, TaxConfig, and the
 * RevenueCat entitlement, keeps the splash up until ready, then gates:
 * signed out → sign-in; no profile → onboarding; no entitlement (trial expired
 * / never subscribed) → paywall; otherwise the tabs. Subscription-only.
 */
export default function RootLayout() {
  const scheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const initAuth = useAuthStore((s) => s.init);
  const authReady = useAuthStore((s) => s.initialized);
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const signedIn = userId !== null;

  const loadProfile = useProfileStore((s) => s.load);
  const loadConfig = useTaxConfigStore((s) => s.load);
  const profileLoaded = useProfileStore((s) => s.loaded);
  const hasProfile = useProfileStore((s) => s.profile !== null);

  const isPro = useIsPro();
  const entitlementLoaded = useEntitlementStore((s) => s.loaded);

  // One-time bootstrap: configure RevenueCat, listen for entitlement changes,
  // then kick off auth / profile / config loads.
  useEffect(() => {
    configurePurchases();
    onCustomerInfoUpdate((info) => useEntitlementStore.getState().applyCustomerInfo(info));
    initAuth();
    loadProfile();
    loadConfig(DEFAULT_TAX_YEAR);
  }, [initAuth, loadProfile, loadConfig]);

  // Keep the entitlement tied to the signed-in user.
  useEffect(() => {
    const store = useEntitlementStore.getState();
    if (!purchasesReady()) {
      store.markLoaded();
      return;
    }
    if (!userId) {
      store.reset();
      store.markLoaded();
      return;
    }
    let cancelled = false;
    identifyPurchaser(userId)
      .then((info) => {
        if (cancelled) return;
        if (info) store.applyCustomerInfo(info);
        else store.markLoaded();
      })
      .catch(() => {
        if (!cancelled) store.markLoaded();
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!authReady || !profileLoaded) return;
    // Only block on the entitlement once we know it's needed.
    if (signedIn && hasProfile && !entitlementLoaded) return;
    SplashScreen.hideAsync();

    const top = segments[0];
    const inSignIn = top === 'sign-in';
    const inOnboarding = top === 'onboarding';
    const inPaywall = top === 'paywall';

    if (!signedIn) {
      if (!inSignIn) router.replace('/sign-in');
    } else if (!hasProfile) {
      if (!inOnboarding) router.replace('/onboarding');
    } else if (!isPro) {
      if (!inPaywall) router.replace('/paywall');
    } else if (inSignIn || inOnboarding || inPaywall) {
      router.replace('/');
    }
  }, [authReady, profileLoaded, entitlementLoaded, signedIn, hasProfile, isPro, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sign-in" options={{ gestureEnabled: false }} />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="paywall" options={{ gestureEnabled: false }} />
          <Stack.Screen
            name="add-income"
            options={{ presentation: 'modal', title: 'Add income' }}
          />
          <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
          <Stack.Screen name="deductions" options={{ headerShown: true, title: 'Deductions' }} />
          <Stack.Screen name="reports" options={{ headerShown: true, title: 'Reports' }} />
          <Stack.Screen name="ask" options={{ headerShown: true, title: 'Ask' }} />
          <Stack.Screen
            name="edit-profile"
            options={{ headerShown: true, title: 'Edit profile' }}
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
