import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useEntitlementStore, useIsPro } from '@/config/gating';
import { calendarYear } from '@/config/tax-year';
import { clearLocalUserData, pullAllForUser } from '@/data';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  configurePurchases,
  identifyPurchaser,
  onCustomerInfoUpdate,
  purchasesReady,
} from '@/services/purchases';
import { useAuthStore, useProfileStore, useTaxConfigStore } from '@/store';
import { useThemeStore } from '@/store/theme-store';

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
  // then kick off auth and config loads. Profile + data load is driven by the
  // signed-in user below (it depends on the account's cloud data).
  useEffect(() => {
    configurePurchases();
    onCustomerInfoUpdate((info) => useEntitlementStore.getState().applyCustomerInfo(info));
    useThemeStore.getState().init();
    initAuth();
    loadConfig(calendarYear());
  }, [initAuth, loadConfig]);

  // Resolve the signed-in account's entitlement + financial data. Both follow the
  // account: RevenueCat via identifyPurchaser, the data via Supabase ↔ local
  // SQLite. We drop `profile.loaded` to false up front so the gate holds the
  // splash until the cloud pull finishes — a returning user never flashes the
  // onboarding quiz before their data arrives. Keyed on the resolved user id, so
  // a plain token refresh (same id) doesn't trigger a re-pull.
  useEffect(() => {
    if (!authReady) return; // wait until we know whether a session exists
    let cancelled = false;
    const entitlement = useEntitlementStore.getState();
    useProfileStore.setState({ loaded: false });

    async function resolve() {
      if (!userId) {
        // Signed out: clear the entitlement and the previous account's local data.
        if (purchasesReady()) entitlement.reset();
        entitlement.markLoaded();
        clearLocalUserData();
        if (!cancelled) useProfileStore.setState({ profile: null, loaded: true });
        return;
      }
      if (!purchasesReady()) {
        entitlement.markLoaded();
      } else {
        try {
          const info = await identifyPurchaser(userId);
          if (info) entitlement.applyCustomerInfo(info);
          else entitlement.markLoaded();
        } catch {
          entitlement.markLoaded();
        }
      }
      if (cancelled) return; // a newer auth change is already resolving
      try {
        await pullAllForUser(userId);
      } catch (e) {
        console.warn('[sync] pull on login failed', e);
      }
      if (!cancelled) await loadProfile();
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [authReady, userId, loadProfile]);

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
        <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal' }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sign-in" options={{ gestureEnabled: false }} />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="paywall" options={{ gestureEnabled: false }} />
          <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
          <Stack.Screen name="deductions" options={{ headerShown: true, title: 'Deductions' }} />
          <Stack.Screen name="reports" options={{ headerShown: true, title: 'Reports' }} />
          <Stack.Screen name="ask" options={{ headerShown: true, title: 'Assistant' }} />
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
