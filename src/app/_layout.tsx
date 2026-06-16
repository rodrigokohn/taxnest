import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore, useProfileStore, useTaxConfigStore } from '@/store';

SplashScreen.preventAutoHideAsync();

/**
 * Root navigation + app bootstrap. Resolves auth, profile, and TaxConfig, keeps
 * the splash up until ready, then gates: signed out → sign-in; signed in but no
 * profile → onboarding; otherwise the tabs (PRD §8, plus Google/Apple auth).
 */
export default function RootLayout() {
  const scheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();

  const initAuth = useAuthStore((s) => s.init);
  const authReady = useAuthStore((s) => s.initialized);
  const signedIn = useAuthStore((s) => s.session !== null);

  const loadProfile = useProfileStore((s) => s.load);
  const loadConfig = useTaxConfigStore((s) => s.load);
  const profileLoaded = useProfileStore((s) => s.loaded);
  const hasProfile = useProfileStore((s) => s.profile !== null);

  useEffect(() => {
    initAuth();
    loadProfile();
    loadConfig(DEFAULT_TAX_YEAR);
  }, [initAuth, loadProfile, loadConfig]);

  useEffect(() => {
    if (!authReady || !profileLoaded) return;
    SplashScreen.hideAsync();

    const top = segments[0];
    const inSignIn = top === 'sign-in';
    const inOnboarding = top === 'onboarding';

    if (!signedIn) {
      if (!inSignIn) router.replace('/sign-in');
    } else if (!hasProfile) {
      if (!inOnboarding) router.replace('/onboarding');
    } else if (inSignIn || inOnboarding) {
      router.replace('/');
    }
  }, [authReady, profileLoaded, signedIn, hasProfile, segments, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sign-in" options={{ gestureEnabled: false }} />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
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
