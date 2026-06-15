import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/design';

/**
 * Add income (core loop, PRD §8.3) — presented as a modal sheet.
 * Phase 0 placeholder; the two-stage input → "set aside" flow lands in Phase 4.
 */
export default function AddIncomeModal() {
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.body}>
        <ThemedText variant="screenTitle">Add income</ThemedText>
        <ThemedText variant="secondary" color="textSecondary">
          The set-aside calculator (the core loop) will live here.
        </ThemedText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: Spacing.xl, gap: Spacing.sm },
});
