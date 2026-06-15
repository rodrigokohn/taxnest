import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/design';

/** Temporary placeholder used by the Phase 0 navigation shell. */
export function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Screen>
      <View style={styles.container}>
        <ThemedText variant="screenTitle">{title}</ThemedText>
        <ThemedText variant="secondary" color="textSecondary" style={styles.subtitle}>
          {subtitle}
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.sm },
  subtitle: { textAlign: 'center', maxWidth: 280 },
});
