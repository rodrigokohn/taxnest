import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { IconSymbol } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, useTheme } from '@/design';
import { formatUSD } from '@/lib/money';
import { haptics } from '@/services/haptics';

/** Subtle one-time celebration when a savings milestone is crossed (no confetti). */
export function MilestoneCelebration({
  threshold,
  onDismiss,
}: {
  threshold: number;
  onDismiss: () => void;
}) {
  const theme = useTheme();

  useEffect(() => {
    haptics.success();
  }, []);

  return (
    <Animated.View entering={ZoomIn.springify().damping(15).mass(0.7)}>
      <View
        style={[styles.card, { backgroundColor: theme.primaryTint, borderColor: theme.accent }]}>
        <IconSymbol name="checkmark.seal.fill" color={theme.accent} size={28} />
        <View style={styles.body}>
          <ThemedText variant="sectionHeader" color="accent">
            {formatUSD(threshold)} set aside
          </ThemedText>
          <ThemedText variant="secondary" color="textSecondary">
            That&apos;s real progress toward a stress-free tax season.
          </ThemedText>
        </View>
        <Pressable
          onPress={onDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss">
          <IconSymbol name="xmark.circle.fill" color={theme.textTertiary} size={22} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  body: { flex: 1, gap: 2 },
});
