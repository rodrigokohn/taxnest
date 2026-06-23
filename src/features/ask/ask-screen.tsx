import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { IconSymbol } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { TypewriterText } from '@/components/typewriter-text';
import { Radius, Spacing, useTheme } from '@/design';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';
import { askTaxQuestion } from '@/services/ai';
import { useChatStore, type Conversation } from '@/store/chat-store';
import { usePaymentsStore, useProfileStore } from '@/store';

const SUGGESTED = [
  'Can I deduct my home internet?',
  'What if I miss a quarterly payment?',
  'How does the QBI deduction work?',
];

/** Assistant — freelance tax Q&A with persisted, revisitable chats (PRD §8.8). */
export function AskScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const kbHeight = useKeyboardHeight();
  const navigation = useNavigation();
  const profile = useProfileStore((s) => s.profile);
  const totalSetAside = usePaymentsStore((s) => s.totalSetAside);
  const totalIncome = usePaymentsStore((s) => s.totalIncome);

  const conversations = useChatStore((s) => s.conversations);
  const activeId = useChatStore((s) => s.activeId);
  const loadChats = useChatStore((s) => s.load);
  const startNew = useChatStore((s) => s.startNew);
  const setActive = useChatStore((s) => s.setActive);
  const addMessage = useChatStore((s) => s.addMessage);
  const removeChat = useChatStore((s) => s.remove);

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingId, setTypingId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const messages = active?.messages ?? [];

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  function newChat() {
    startNew();
    setQuestion('');
    setError(null);
    setTypingId(null);
  }

  // Header: new chat + history.
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerBtns}>
          <Pressable
            onPress={() => setHistoryOpen(true)}
            hitSlop={10}
            accessibilityLabel="Chat history">
            <IconSymbol name="clock.arrow.circlepath" color={theme.primary} size={22} />
          </Pressable>
          <Pressable onPress={newChat} hitSlop={10} accessibilityLabel="New chat">
            <IconSymbol name="square.and.pencil" color={theme.primary} size={22} />
          </Pressable>
        </View>
      ),
    });
    // newChat is stable enough (only stable setters/actions); set once per theme.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, theme.primary]);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || !profile || loading) return;
    addMessage('user', trimmed);
    setQuestion('');
    setLoading(true);
    setError(null);
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
      const id = addMessage('assistant', result);
      setTypingId(id);
    } catch {
      setError("Couldn't reach the assistant — try again.");
    } finally {
      setLoading(false);
    }
  }

  function openChat(id: string) {
    setActive(id);
    setHistoryOpen(false);
    setError(null);
    setTypingId(null);
  }

  const idle = messages.length === 0 && !loading;

  return (
    <View
      style={[
        styles.root,
        { paddingBottom: kbHeight > 0 ? kbHeight + Spacing.sm : insets.bottom + Spacing.md },
      ]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
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
            {messages.map((m) =>
              m.role === 'user' ? (
                <View
                  key={m.id}
                  style={[styles.questionBubble, { backgroundColor: theme.primary }]}>
                  <ThemedText variant="body" style={styles.questionText}>
                    {m.text}
                  </ThemedText>
                </View>
              ) : (
                <Animated.View key={m.id} entering={FadeInDown.springify().damping(18)}>
                  <Card style={styles.answerCard}>
                    <View style={styles.answerHeader}>
                      <IconSymbol name="sparkles" color={theme.primary} size={16} />
                      <ThemedText variant="caption" color="textTertiary">
                        Assistant
                      </ThemedText>
                    </View>
                    <TypewriterText
                      text={m.text}
                      animate={m.id === typingId}
                      variant="body"
                      style={styles.answerText}
                      onTick={() => scrollRef.current?.scrollToEnd({ animated: false })}
                    />
                  </Card>
                </Animated.View>
              ),
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
          placeholder="Ask anything about your taxes…"
          placeholderTextColor={theme.textTertiary}
          style={[styles.input, { color: theme.textPrimary }]}
          editable={!loading}
          onSubmitEditing={() => ask(question)}
          returnKeyType="send"
          multiline={false}
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

      <HistoryModal
        visible={historyOpen}
        conversations={conversations}
        activeId={activeId}
        onClose={() => setHistoryOpen(false)}
        onOpen={openChat}
        onNew={() => {
          newChat();
          setHistoryOpen(false);
        }}
        onDelete={removeChat}
      />
    </View>
  );
}

function HistoryModal({
  visible,
  conversations,
  activeId,
  onClose,
  onOpen,
  onNew,
  onDelete,
}: {
  visible: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const sorted = [...conversations]
    .filter((c) => c.messages.length > 0)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View
        style={[styles.modalRoot, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <View style={styles.modalHeader}>
          <ThemedText variant="sectionHeader">Your chats</ThemedText>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <IconSymbol name="xmark" color={theme.textSecondary} size={18} />
          </Pressable>
        </View>

        <Pressable
          onPress={onNew}
          accessibilityRole="button"
          style={[styles.newRow, { backgroundColor: theme.primaryTint }]}>
          <IconSymbol name="square.and.pencil" color={theme.primary} size={18} />
          <ThemedText variant="body" color="primary" style={styles.newRowText}>
            New chat
          </ThemedText>
        </Pressable>

        <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
          {sorted.length === 0 ? (
            <ThemedText variant="secondary" color="textTertiary" style={styles.modalEmpty}>
              No past chats yet.
            </ThemedText>
          ) : (
            sorted.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => onOpen(c.id)}
                accessibilityRole="button"
                style={[
                  styles.histRow,
                  { borderColor: c.id === activeId ? theme.primary : theme.border },
                ]}>
                <View style={styles.histMain}>
                  <ThemedText variant="body" numberOfLines={1}>
                    {c.title}
                  </ThemedText>
                  <ThemedText variant="caption" color="textTertiary">
                    {new Date(c.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {c.messages.filter((m) => m.role === 'user').length} question
                    {c.messages.filter((m) => m.role === 'user').length === 1 ? '' : 's'}
                  </ThemedText>
                </View>
                <Pressable
                  onPress={() => onDelete(c.id)}
                  hitSlop={8}
                  accessibilityLabel="Delete chat"
                  style={styles.histDelete}>
                  <IconSymbol name="trash" color={theme.textTertiary} size={16} />
                </Pressable>
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: Spacing.lg },
  headerBtns: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
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
    paddingVertical: Spacing.xs,
    minHeight: 52,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: Spacing.sm, lineHeight: 20 },

  modalRoot: { flex: 1, paddingHorizontal: Spacing.lg },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  newRowText: { fontWeight: '600' },
  modalList: { paddingVertical: Spacing.lg, gap: Spacing.sm },
  modalEmpty: { textAlign: 'center', marginTop: Spacing.xl },
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  histMain: { flex: 1, gap: 2 },
  histDelete: { padding: Spacing.xs },
});
