import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Card } from '@/components/card';
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

/** Assistant — freelance tax Q&A (PRD §8.8). Pointed questions, not a long chat. */
export function AskScreen() {
  const theme = useTheme();
  const profile = useProfileStore((s) => s.profile);
  const totalSetAside = usePaymentsStore((s) => s.totalSetAside);
  const totalIncome = usePaymentsStore((s) => s.totalIncome);

  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || !profile) return;
    setAsked(trimmed);
    setQuestion('');
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

  const idle = !asked && !loading;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {idle ? (
          <View style={styles.intro}>
            <View style={[styles.introIcon, { backgroundColor: theme.primaryTint }]}>
              <IconSymbol name="sparkles" color={theme.primary} size={26} />
            </View>
            <ThemedText variant="screenTitle" style={styles.center}>
              Ask anything about your taxes
            </ThemedText>
            <ThemedText variant="body" color="textSecondary" style={styles.center}>
              Answers tailored to your income, state, and filing status.
            </ThemedText>

            <View style={styles.suggested}>
              {SUGGESTED.map((q) => (
                <Pressable
                  key={q}
                  onPress={() => ask(q)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.chip,
                    { backgroundColor: theme.surface, borderColor: theme.border },
                    pressed && { opacity: 0.7 },
                  ]}>
                  <ThemedText variant="body" style={styles.chipText}>
                    {q}
                  </ThemedText>
                  <IconSymbol name="arrow.up.right" color={theme.textTertiary} size={14} />
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.conversation}>
            {asked && (
              <View style={[styles.questionBubble, { backgroundColor: theme.primary }]}>
                <ThemedText variant="body" style={styles.questionText}>
                  {asked}
                </ThemedText>
              </View>
            )}

            {loading && (
              <View style={styles.thinking}>
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

            {answer && (
              <Animated.View entering={FadeInDown.springify().damping(18)}>
                <Card style={styles.answerCard}>
                  <View style={styles.answerHeader}>
                    <IconSymbol name="sparkles" color={theme.primary} size={16} />
                    <ThemedText variant="caption" color="textTertiary">
                      Assistant
                    </ThemedText>
                  </View>
                  <ThemedText variant="body" style={styles.answerText}>
                    {answer}
                  </ThemedText>
                </Card>
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={styles.disclaimerRow}>
        <IconSymbol name="info.circle" color={theme.textTertiary} size={13} />
        <ThemedText variant="caption" color="textTertiary">
          General information, not tax advice.
        </ThemedText>
      </View>

      <View
        style={[styles.inputRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask a question…"
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
            size={32}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: Spacing.lg, gap: Spacing.md, flexGrow: 1 },
  center: { textAlign: 'center' },
  intro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  introIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  suggested: { alignSelf: 'stretch', gap: Spacing.sm, marginTop: Spacing.xl },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  chipText: { flex: 1 },
  conversation: { gap: Spacing.md },
  questionBubble: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  questionText: { color: '#FFFFFF' },
  thinking: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  answerCard: { gap: Spacing.sm },
  answerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  answerText: { lineHeight: 24 },
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
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: Spacing.sm },
});
