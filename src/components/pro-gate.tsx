import { type ReactNode } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { IconSymbol } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { useIsPro } from '@/config/gating';
import { Spacing, useTheme } from '@/design';

/** Renders children for Pro users; otherwise shows an upsell (PRD §11, §8.10). */
export function ProGate({
  title,
  benefit,
  children,
}: {
  title: string;
  benefit: string;
  children: ReactNode;
}) {
  const isPro = useIsPro();
  if (isPro) return <>{children}</>;
  return <ProUpsell title={title} benefit={benefit} />;
}

export function ProUpsell({ title, benefit }: { title: string; benefit: string }) {
  const theme = useTheme();
  return (
    <View style={styles.root}>
      <IconSymbol name="lock.fill" color={theme.primary} size={40} />
      <ThemedText variant="sectionHeader" style={styles.center}>
        {title} is a Pro feature
      </ThemedText>
      <ThemedText variant="body" color="textSecondary" style={styles.center}>
        {benefit}
      </ThemedText>
      <Button
        title="Unlock with Pro"
        style={styles.cta}
        onPress={() =>
          // The RevenueCat paywall arrives in Phase 6.
          Alert.alert('Pro', 'The upgrade flow arrives in a later step.')
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  center: { textAlign: 'center' },
  cta: { alignSelf: 'stretch', marginTop: Spacing.md },
});
