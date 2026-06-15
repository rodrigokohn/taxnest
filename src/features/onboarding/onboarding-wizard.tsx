import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button } from '@/components/button';
import { IconSymbol } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { incomeSourceRepo } from '@/data';
import {
  FILING_STATUS_LABELS,
  FILING_STATUSES,
  type FilingStatus,
  type UserProfile,
} from '@/domain';
import { Radius, Spacing, useTheme } from '@/design';
import { newId } from '@/lib/id';
import { US_STATES, type USState } from '@/lib/us-states';
import {
  requestNotificationPermission,
  scheduleQuarterlyReminders,
} from '@/services/notifications';
import { useProfileStore, useTaxConfigStore } from '@/store';

type Draft = {
  filing_status?: FilingStatus;
  state?: string;
  estimated_annual_income: number;
  filed_last_year: boolean;
  prior_year_tax?: number;
  prior_year_agi?: number;
};

const TOTAL_STEPS = 7;

export function OnboardingWizard() {
  const theme = useTheme();
  const router = useRouter();
  const saveProfile = useProfileStore((s) => s.save);
  const config = useTaxConfigStore((s) => s.config);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    estimated_annual_income: 0,
    filed_last_year: false,
  });

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return draft.filing_status != null;
      case 2:
        return draft.state != null;
      case 3:
        return draft.estimated_annual_income > 0;
      default:
        return true;
    }
  }, [step, draft]);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  async function finish() {
    if (!draft.filing_status || !draft.state) return;
    setSaving(true);
    const now = new Date().toISOString();
    const profile: UserProfile = {
      id: newId(),
      filing_status: draft.filing_status,
      state: draft.state,
      estimated_annual_income: draft.estimated_annual_income,
      prior_year_tax: draft.filed_last_year ? draft.prior_year_tax : undefined,
      prior_year_agi: draft.filed_last_year ? draft.prior_year_agi : undefined,
      created_at: now,
      updated_at: now,
    };
    await saveProfile(profile);
    await incomeSourceRepo.ensureDefault();
    router.replace('/');
  }

  const noStateTax = draft.state != null && config?.states[draft.state]?.type === 'none';

  return (
    <Screen edges={['top', 'bottom']}>
      <ProgressDots total={TOTAL_STEPS} current={step} color={theme.primary} track={theme.border} />

      <Animated.View key={step} style={styles.body} entering={FadeIn.duration(240)}>
        {step === 0 && (
          <Centered>
            <ThemedText variant="screenTitle" style={styles.headline}>
              Never get surprised by taxes again.
            </ThemedText>
            <ThemedText variant="body" color="textSecondary" style={styles.center}>
              Tell us a few things and we&apos;ll show you exactly how much to set aside from every
              payment.
            </ThemedText>
          </Centered>
        )}

        {step === 1 && (
          <Question title="How do you file your taxes?">
            {FILING_STATUSES.map((fs) => (
              <OptionRow
                key={fs}
                label={FILING_STATUS_LABELS[fs]}
                selected={draft.filing_status === fs}
                onPress={() => set({ filing_status: fs })}
              />
            ))}
          </Question>
        )}

        {step === 2 && (
          <StateStep
            selected={draft.state}
            onSelect={(code) => set({ state: code })}
            noStateTax={noStateTax}
          />
        )}

        {step === 3 && (
          <Question title="Roughly how much do you expect to make this year from freelancing?">
            <CurrencyInput
              value={draft.estimated_annual_income}
              onChange={(v) => set({ estimated_annual_income: v })}
            />
            <ThemedText variant="secondary" color="textSecondary" style={styles.center}>
              A rough number is fine — you can adjust it anytime.
            </ThemedText>
          </Question>
        )}

        {step === 4 && (
          <Question title="Did you file taxes as a freelancer last year?">
            <ThemedText variant="secondary" color="textSecondary">
              Optional — it lets us protect you from penalties more precisely (safe harbor).
            </ThemedText>
            <View style={styles.segment}>
              <OptionRow
                label="Yes"
                selected={draft.filed_last_year}
                onPress={() => set({ filed_last_year: true })}
              />
              <OptionRow
                label="No / not sure"
                selected={!draft.filed_last_year}
                onPress={() => set({ filed_last_year: false })}
              />
            </View>
            {draft.filed_last_year && (
              <View style={styles.priorYearFields}>
                <LabeledCurrency
                  label="Total tax you paid last year"
                  value={draft.prior_year_tax ?? 0}
                  onChange={(v) => set({ prior_year_tax: v })}
                />
                <LabeledCurrency
                  label="Your AGI last year"
                  value={draft.prior_year_agi ?? 0}
                  onChange={(v) => set({ prior_year_agi: v })}
                />
              </View>
            )}
          </Question>
        )}

        {step === 5 && (
          <Centered>
            <IconSymbol name="checkmark.shield" color={theme.primary} size={48} />
            <ThemedText variant="screenTitle" style={styles.center}>
              A quick note
            </ThemedText>
            <ThemedText variant="body" color="textSecondary" style={styles.center}>
              FreelanceTax provides estimates to help you plan. It is not tax advice and does not
              replace a tax professional.
            </ThemedText>
          </Centered>
        )}

        {step === 6 && (
          <Centered>
            <IconSymbol name="bell.badge" color={theme.primary} size={48} />
            <ThemedText variant="screenTitle" style={styles.center}>
              Want reminders before each quarterly deadline?
            </ThemedText>
            <ThemedText variant="body" color="textSecondary" style={styles.center}>
              We&apos;ll nudge you a few days before each due date so you&apos;re never late.
            </ThemedText>
          </Centered>
        )}
      </Animated.View>

      <View style={styles.footer}>
        {step === 6 ? (
          <>
            <Button
              title="Enable reminders"
              loading={saving}
              onPress={async () => {
                const granted = await requestNotificationPermission();
                if (granted) await scheduleQuarterlyReminders(config?.quarterly_deadlines ?? []);
                await finish();
              }}
            />
            <Button title="Maybe later" variant="ghost" onPress={finish} />
          </>
        ) : (
          <Button
            title={step === 0 ? 'Get started' : step === 5 ? 'I understand' : 'Continue'}
            disabled={!canContinue}
            onPress={next}
          />
        )}
        {step > 0 && step < 6 && (
          <Pressable accessibilityRole="button" onPress={back} style={styles.backBtn}>
            <ThemedText variant="secondary" color="textTertiary">
              Back
            </ThemedText>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

// ─── Step building blocks ───────────────────────────────────────────────────

function ProgressDots({
  total,
  current,
  color,
  track,
}: {
  total: number;
  current: number;
  color: string;
  track: string;
}) {
  return (
    <View style={styles.dots} accessibilityLabel={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i <= current ? color : track }]} />
      ))}
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={[styles.stepContent, styles.centeredStep]}>{children}</View>;
}

function Question({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.stepContent}>
      <ThemedText variant="screenTitle" style={styles.questionTitle}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function OptionRow({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.optionRow,
        { borderColor: selected ? theme.primary : theme.border, backgroundColor: theme.surface },
        selected && { backgroundColor: theme.primaryTint },
        style,
      ]}>
      <ThemedText variant="body" color={selected ? 'primary' : 'textPrimary'}>
        {label}
      </ThemedText>
      {selected && <IconSymbol name="checkmark.circle.fill" color={theme.primary} size={22} />}
    </Pressable>
  );
}

function CurrencyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.currencyRow}>
      <ThemedText variant="heroNumber" color="textSecondary">
        $
      </ThemedText>
      <TextInput
        keyboardType="number-pad"
        value={value > 0 ? String(value) : ''}
        onChangeText={(t) => onChange(Number(t.replace(/[^0-9]/g, '')) || 0)}
        placeholder="0"
        placeholderTextColor={theme.textTertiary}
        style={[styles.currencyInput, { color: theme.textPrimary }]}
        autoFocus
      />
    </View>
  );
}

function LabeledCurrency({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.labeledField}>
      <ThemedText variant="secondary" color="textSecondary">
        {label}
      </ThemedText>
      <View style={[styles.fieldBox, { borderColor: theme.border }]}>
        <ThemedText variant="body" color="textSecondary">
          $
        </ThemedText>
        <TextInput
          keyboardType="number-pad"
          value={value > 0 ? String(value) : ''}
          onChangeText={(t) => onChange(Number(t.replace(/[^0-9]/g, '')) || 0)}
          placeholder="0"
          placeholderTextColor={theme.textTertiary}
          style={[styles.fieldInput, { color: theme.textPrimary }]}
        />
      </View>
    </View>
  );
}

function StateStep({
  selected,
  onSelect,
  noStateTax,
}: {
  selected?: string;
  onSelect: (code: string) => void;
  noStateTax: boolean;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return US_STATES;
    return US_STATES.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase() === q);
  }, [query]);

  return (
    <View style={styles.stepContent}>
      <ThemedText variant="screenTitle" style={styles.questionTitle}>
        Which state do you live in?
      </ThemedText>
      <View style={[styles.fieldBox, { borderColor: theme.border }]}>
        <IconSymbol name="magnifyingglass" color={theme.textTertiary} size={18} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search states"
          placeholderTextColor={theme.textTertiary}
          style={[styles.fieldInput, { color: theme.textPrimary }]}
          autoCorrect={false}
        />
      </View>
      {noStateTax && (
        <ThemedText variant="secondary" color="success">
          Good news — this state has no state income tax.
        </ThemedText>
      )}
      <FlatList
        data={results}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        style={styles.stateList}
        renderItem={({ item }: { item: USState }) => (
          <OptionRow
            label={item.name}
            selected={selected === item.code}
            onPress={() => onSelect(item.code)}
            style={styles.stateRow}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingTop: Spacing.lg },
  footer: { gap: Spacing.sm, paddingVertical: Spacing.md },
  backBtn: { alignSelf: 'center', padding: Spacing.sm },
  dots: { flexDirection: 'row', gap: Spacing.xs, justifyContent: 'center', paddingTop: Spacing.sm },
  dot: { width: 18, height: 6, borderRadius: Radius.pill },
  stepContent: { flex: 1, gap: Spacing.lg },
  centeredStep: { justifyContent: 'center', alignItems: 'center', gap: Spacing.lg },
  headline: { textAlign: 'center', fontSize: 28, lineHeight: 34 },
  center: { textAlign: 'center' },
  questionTitle: { marginBottom: Spacing.sm },
  segment: { gap: Spacing.sm },
  priorYearFields: { gap: Spacing.lg, marginTop: Spacing.sm },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  currencyInput: { fontSize: 36, fontWeight: '600', minWidth: 140 },
  labeledField: { gap: Spacing.xs },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  fieldInput: { flex: 1, fontSize: 16 },
  stateList: { flex: 1 },
  stateRow: { marginBottom: Spacing.sm },
});
