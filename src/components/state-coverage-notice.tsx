import { StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, useTheme } from '@/design';
import { stateName } from '@/lib/us-states';
import { useProfileStore, useTaxConfigStore } from '@/store';

/**
 * Shown when we don't yet have the user's state's income-tax rates. The estimate
 * then covers only federal + self-employment, so we say so instead of presenting
 * a silent $0 state tax. A no-income-tax state IS in the config (type 'none') and
 * renders nothing — only genuinely-missing states trigger the notice.
 *
 * Pass `state` for flows where the profile isn't saved yet (e.g. onboarding);
 * otherwise it reads the saved profile's state.
 */
export function StateCoverageNotice({ state: stateProp }: { state?: string } = {}) {
  const theme = useTheme();
  const profileState = useProfileStore((s) => s.profile?.state);
  const config = useTaxConfigStore((s) => s.config);
  const state = stateProp ?? profileState;

  if (!state || !config) return null;
  if (config.states[state]) return null; // supported (incl. no-tax states)

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.warning }]}>
      <IconSymbol name="exclamationmark.triangle.fill" color={theme.warning} size={18} />
      <ThemedText variant="secondary" color="textSecondary" style={styles.text}>
        We don’t have {stateName(state)} state income tax rates yet, so this estimate covers federal
        + self-employment only. Set aside a little extra and check your state’s rate.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderLeftWidth: 3,
  },
  text: { flex: 1, lineHeight: 20 },
});
