import { useColorScheme as useSystemColorScheme } from 'react-native';

import { useThemeStore } from '@/store/theme-store';

/** Active color scheme, honoring the user's Appearance preference (else system). */
export function useColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme();
  const preference = useThemeStore((s) => s.preference);
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}
