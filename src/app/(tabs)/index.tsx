import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/design';

/** Home / Dashboard (PRD §8.2). Phase 0 placeholder — empty state shape only. */
export default function HomeScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText variant="screenTitle">Hi 👋</ThemedText>
      </View>
      <ThemedText variant="secondary" color="textSecondary">
        Set aside this year
      </ThemedText>
      <ThemedText variant="heroNumber">$0</ThemedText>
      <ThemedText variant="body" color="success" style={styles.reassure}>
        Add your first payment to see how much to set aside.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: Spacing.md },
  reassure: { marginTop: Spacing.sm },
});
