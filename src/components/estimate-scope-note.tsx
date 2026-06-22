import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ESTIMATE_SCOPE_SHORT, showEstimateScope } from '@/config/estimate-scope';
import { Spacing, useTheme } from '@/design';

/**
 * Discreet, tappable note that states what the estimate covers and excludes,
 * opening the full breakdown. Keeps the app honest about its scope (#30) without
 * cluttering the calm UI.
 */
export function EstimateScopeNote() {
  const theme = useTheme();
  return (
    <Pressable
      onPress={showEstimateScope}
      accessibilityRole="button"
      accessibilityLabel="What this estimate covers"
      style={styles.row}>
      <IconSymbol name="info.circle" color={theme.textTertiary} size={13} />
      <ThemedText variant="caption" color="textTertiary" style={styles.text}>
        {ESTIMATE_SCOPE_SHORT}{' '}
        <ThemedText variant="caption" color="primary">
          What’s counted?
        </ThemedText>
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  text: { flex: 1, lineHeight: 18 },
});
