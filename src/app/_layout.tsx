import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProfileStore, useTaxConfigStore } from '@/store';

SplashScreen.preventAutoHideAsync();

/**
 * Root navigation + app bootstrap. Loads the profile and TaxConfig, keeps the
 * splash screen up until ready, then routes to onboarding (no profile) or the
 * tabs (returning user).
 */
export default function RootLayout() {
  const scheme = useColorScheme();
  const router = useRouter();

  const loadProfile = useProfileStore((s) => s.load);
  const loadConfig = useTaxConfigStore((s) => s.load);
  const profileLoaded = useProfileStore((s) => s.loaded);
  const hasProfile = useProfileStore((s) => s.profile !== null);

  useEffect(() => {
    loadProfile();
    loadConfig(DEFAULT_TAX_YEAR);
  }, [loadProfile, loadConfig]);

  useEffect(() => {
    if (!profileLoaded) return;
    SplashScreen.hideAsync();
    if (!hasProfile) router.replace('/onboarding');
  }, [profileLoaded, hasProfile, router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen
            name="add-income"
            options={{ presentation: 'modal', title: 'Add income' }}
          />
          <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
          <Stack.Screen name="deductions" options={{ headerShown: true, title: 'Deductions' }} />
          <Stack.Screen name="reports" options={{ headerShown: true, title: 'Reports' }} />
          <Stack.Screen name="ask" options={{ headerShown: true, title: 'Ask' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
