import { StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/icon-symbol';
import { ProGate } from '@/components/pro-gate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, useTheme } from '@/design';

const SUGGESTED = [
  'Can I deduct my home internet?',
  'What if I miss a payment?',
  'How does QBI work?',
];

/** Ask (PRD §8.8). Pro-gated. Connects to the AI backend in Phase 5. */
export default function AskRoute() {
  const theme = useTheme();
  return (
    <Screen edges={[]}>
      <ProGate
        title="Ask"
        benefit="Get clear answers to your freelance tax questions, personalized to your situation.">
        <View style={styles.body}>
          <ThemedText variant="secondary" color="textSecondary">
            Suggested questions
          </ThemedText>
          {SUGGESTED.map((q) => (
            <View key={q} style={[styles.chip, { borderColor: theme.border }]}>
              <ThemedText variant="body">{q}</ThemedText>
            </View>
          ))}
          <View style={styles.disclaimerRow}>
            <IconSymbol name="info.circle" color={theme.textTertiary} size={14} />
            <ThemedText variant="caption" color="textTertiary">
              General information, not tax advice. The assistant connects in a later step.
            </ThemedText>
          </View>
        </View>
      </ProGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, gap: Spacing.sm, paddingTop: Spacing.lg },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    padding: Spacing.lg,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
});
