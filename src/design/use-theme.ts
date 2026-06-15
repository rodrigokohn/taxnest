import { Colors } from '@/design/colors';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Returns the active color set for the current (system) color scheme. */
export function useTheme() {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
