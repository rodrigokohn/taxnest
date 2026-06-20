import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import { useThemeStore } from '@/store/theme-store';

/**
 * Active color scheme (web): honors the Appearance preference, else system.
 * Re-calculated on the client for static rendering support.
 */
export function useColorScheme(): 'light' | 'dark' {
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const system = useRNColorScheme();
  const preference = useThemeStore((s) => s.preference);

  if (!hasHydrated) return 'light';
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}
