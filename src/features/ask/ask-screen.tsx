import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { IconSymbol } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, useTheme } from '@/design';
import { askTaxQuestion } from '@/services/ai';
import { usePaymentsStore, useProfileStore } from '@/store';

const SUGGESTED = [
  'Can I deduct my home internet?',
  'What if I miss a quarterly payment?',
  'How does the QBI deduction work?',
];

/** Ask — freelance tax Q&A (PRD §8.8, Pro). Pointed questions, not a long chat. */
export function AskScreen() {
  const theme = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const totalSetAside = usePaymentsStore((s) => s.totalSetAside);
  const totalIncome = usePaymentsStore((s) => s.totalIncome);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || !profile) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const result = await askTaxQuestion(
        trimmed,
        {
          projected_income: Math.max(profile.estimated_annual_income, totalIncome),
          state: profile.state,
          filing_status: profile.filing_status,
          total_set_aside: Math.round(totalSetAside),
        },
        profile.id,
      );
      setAnswer(result);
    } catch {
      setError("Couldn't reach the assistant — try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {!answer && !loading && (
          <View style={styles.suggested}>
            <ThemedText variant="secondary" color="textSecondary">
              Suggested
            </ThemedText>
            {SUGGESTED.map((q) => (
              <Pressable
                key={q}
                onPress={() => {
                  setQuestion(q);
                  ask(q);
                }}
                style={[styles.chip, { borderColor: theme.border }]}
                accessibilityRole="button">
                <ThemedText variant="body">{q}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText variant="secondary" color="textTertiary">
              Thinking…
            </ThemedText>
          </View>
        )}

        {error && (
          <ThemedText variant="body" color="danger">
            {error}
          </ThemedText>
        )}

        {answer && <ThemedText variant="body">{answer}</ThemedText>}
      </ScrollView>

      <View style={styles.disclaimerRow}>
        <IconSymbol name="info.circle" color={theme.textTertiary} size={14} />
        <ThemedText variant="caption" color="textTertiary">
          General information, not tax advice.
        </ThemedText>
      </View>

      <View style={[styles.inputRow, { borderColor: theme.border }]}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Type your question…"
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { color: theme.textPrimary }]}
          editable={!loading}
          onSubmitEditing={() => ask(question)}
          returnKeyType="send"
        />
        <Pressable
          onPress={() => ask(question)}
          disabled={loading || !question.trim()}
          accessibilityRole="button"
          accessibilityLabel="Send question"
          hitSlop={8}>
          <IconSymbol
            name="arrow.up.circle.fill"
            color={question.trim() && !loading ? theme.primary : theme.textTertiary}
            size={30}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: Spacing.lg, gap: Spacing.md },
  suggested: { gap: Spacing.sm },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Radius.md, padding: Spacing.lg },
  center: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: Spacing.sm },
});
