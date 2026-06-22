import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Button } from '@/components/button';
import { IconSymbol, type IconSymbolName } from '@/components/icon-symbol';
import { StatePicker } from '@/components/state-picker';
import { StateCoverageNotice } from '@/components/state-coverage-notice';
import { ThemedText } from '@/components/themed-text';
import { incomeSourceRepo } from '@/data';
import {
  FILING_STATUS_LABELS,
  FILING_STATUSES,
  type FilingStatus,
  type UserProfile,
} from '@/domain';
import { Radius, ScreenPadding, Spacing, useTheme } from '@/design';
import { newId } from '@/lib/id';
import { formatUSD } from '@/lib/money';
import { useCountUp } from '@/lib/use-count-up';
import { haptics } from '@/services/haptics';
import { computeAnnualTax } from '@/tax-engine';
import { useProfileStore, useTaxConfigStore } from '@/store';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const TOTAL = 10;

type Choice = { id: string; label: string; icon: IconSymbolName };

const WORK_TYPES: Choice[] = [
  { id: 'design', label: 'Design', icon: 'paintbrush.fill' },
  { id: 'dev', label: 'Development', icon: 'chevron.left.forwardslash.chevron.right' },
  { id: 'writing', label: 'Writing', icon: 'pencil' },
  { id: 'consulting', label: 'Consulting', icon: 'briefcase.fill' },
  { id: 'marketing', label: 'Marketing', icon: 'megaphone.fill' },
  { id: 'other', label: 'Something else', icon: 'sparkles' },
];

const METHODS: Choice[] = [
  { id: 'wing', label: 'I just wing it', icon: 'wind' },
  { id: 'spreadsheet', label: 'A spreadsheet', icon: 'tablecells' },
  { id: 'accountant', label: 'An accountant handles it', icon: 'person.fill' },
  { id: 'panic', label: 'I panic every April', icon: 'exclamationmark.triangle.fill' },
];

const SURPRISED: Choice[] = [
  { id: 'yes', label: 'Yes — it hurt', icon: 'bolt.fill' },
  { id: 'notyet', label: 'Not yet…', icon: 'hourglass' },
  { id: 'no', label: 'No, I plan ahead', icon: 'checkmark.seal.fill' },
];

const FILING_ICON: IconSymbolName = 'person.text.rectangle.fill';

/** Keep only digits and a single decimal point with up to 2 places. */
function sanitizeAmount(t: string): string {
  const cleaned = t.replace(/[^0-9.]/g, '');
  const dot = cleaned.indexOf('.');
  if (dot === -1) return cleaned;
  return (
    cleaned.slice(0, dot + 1) +
    cleaned
      .slice(dot + 1)
      .replace(/\./g, '')
      .slice(0, 2)
  );
}

type Draft = {
  workType?: string;
  filing_status?: FilingStatus;
  state?: string;
  estimated_annual_income: number;
  filed_last_year?: boolean;
  prior_year_tax?: number;
  prior_year_agi?: number;
  method?: string;
  surprised?: string;
};

/** Gamified 10-page onboarding quiz: collects the profile, builds investment, and
 * reveals a personalized set-aside plan before the paywall (PRD §8.1). */
export function OnboardingWizard() {
  const theme = useTheme();
  const router = useRouter();
  const saveProfile = useProfileStore((s) => s.save);
  const config = useTaxConfigStore((s) => s.config);

  const [page, setPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>({ estimated_annual_income: 0 });

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const goNext = () => setPage((p) => Math.min(p + 1, TOTAL - 1));
  const goBack = () => setPage((p) => Math.max(p - 1, 0));

  function pick(patch: Partial<Draft>) {
    haptics.light();
    set(patch);
    setTimeout(goNext, 240);
  }

  const reveal = useMemo(() => {
    const income = draft.estimated_annual_income;
    if (!draft.filing_status || !draft.state || !config || income <= 0) return { rate: 30, tax: 0 };
    const b = computeAnnualTax(
      { filing_status: draft.filing_status, state: draft.state, net_profit: income },
      config,
    );
    const tax = b.se.seTax + b.federalIncomeTax + b.stateTax;
    return { rate: Math.round((tax / income) * 100), tax };
  }, [draft, config]);

  async function finish() {
    setSaving(true);
    const now = new Date().toISOString();
    // filing_status/state are collected on pages 2–3; fall back to sane defaults
    // so "See my plan" can never dead-end (the user can refine them in Settings).
    const profile: UserProfile = {
      id: newId(),
      filing_status: draft.filing_status ?? 'single',
      state: draft.state ?? 'CA',
      estimated_annual_income: draft.estimated_annual_income,
      prior_year_tax: draft.filed_last_year ? draft.prior_year_tax : undefined,
      prior_year_agi: draft.filed_last_year ? draft.prior_year_agi : undefined,
      created_at: now,
      updated_at: now,
    };
    try {
      await saveProfile(profile);
    } catch (e) {
      console.warn('[onboarding] could not save profile', e);
      setSaving(false);
      return;
    }
    // The default income source isn't needed until the first payment — best-effort,
    // so a failure here can never block the user from entering the app.
    void incomeSourceRepo.ensureDefault().catch(() => {});
    router.replace('/');
  }

  const showProgress = page >= 1 && page <= 7;
  const glow = page === 9 ? theme.accent : theme.primary;

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <GlowBg color={glow} />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {showProgress && (
            <View style={styles.progressRow}>
              <Pressable
                onPress={goBack}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Back">
                <IconSymbol name="chevron.left" color={theme.textSecondary} size={22} />
              </Pressable>
              <ProgressBar value={(page - 1) / 7} />
            </View>
          )}

          <Animated.View key={page} entering={FadeIn.duration(240)} style={styles.body}>
            {page === 0 && (
              <View style={styles.centered}>
                <BrandIcon />
                <ThemedText variant="screenTitle" style={[styles.center, styles.headline]}>
                  Let&apos;s build your tax plan
                </ThemedText>
                <ThemedText variant="body" color="textSecondary" style={styles.center}>
                  A few quick questions and we&apos;ll show you exactly how much to set aside from
                  every payment.
                </ThemedText>
                <Button title="Start" onPress={goNext} style={styles.cta} />
              </View>
            )}

            {page === 1 && (
              <Question title="What kind of work do you do?" subtitle="So we can tailor your plan.">
                {WORK_TYPES.map((c, i) => (
                  <QuizOption
                    key={c.id}
                    choice={c}
                    index={i}
                    selected={draft.workType === c.id}
                    onPress={() => pick({ workType: c.id })}
                  />
                ))}
              </Question>
            )}

            {page === 2 && (
              <Question title="How do you file your taxes?">
                {FILING_STATUSES.map((fs, i) => (
                  <QuizOption
                    key={fs}
                    choice={{ id: fs, label: FILING_STATUS_LABELS[fs], icon: FILING_ICON }}
                    index={i}
                    selected={draft.filing_status === fs}
                    onPress={() => pick({ filing_status: fs })}
                  />
                ))}
              </Question>
            )}

            {page === 3 && (
              <View style={styles.qRoot}>
                <ThemedText variant="screenTitle" style={styles.qTitle}>
                  Which state do you live in?
                </ThemedText>
                <View style={styles.pickerWrap}>
                  <StatePicker selected={draft.state} onSelect={(code) => pick({ state: code })} />
                </View>
              </View>
            )}

            {page === 4 && (
              <Pressable style={styles.qRoot} onPress={Keyboard.dismiss} accessible={false}>
                <ThemedText variant="screenTitle" style={styles.qTitle}>
                  How much will you make freelancing this year?
                </ThemedText>
                <ThemedText variant="body" color="textSecondary" style={styles.qSubtitle}>
                  A rough number is fine — you can change it anytime.
                </ThemedText>
                <View style={styles.moneyArea}>
                  <MoneyInput
                    value={draft.estimated_annual_income}
                    onChange={(v) => set({ estimated_annual_income: v })}
                  />
                </View>
                <Button
                  title="Continue"
                  disabled={draft.estimated_annual_income <= 0}
                  onPress={goNext}
                />
              </Pressable>
            )}

            {page === 5 && (
              <Question
                title="Did you file taxes as a freelancer last year?"
                subtitle="Optional — it lets us protect you from penalties (safe harbor).">
                <QuizOption
                  choice={{ id: 'yes', label: 'Yes', icon: 'checkmark.circle.fill' }}
                  index={0}
                  selected={draft.filed_last_year === true}
                  onPress={() => {
                    haptics.light();
                    set({ filed_last_year: true });
                  }}
                />
                <QuizOption
                  choice={{ id: 'no', label: 'No / not sure', icon: 'xmark.circle.fill' }}
                  index={1}
                  selected={draft.filed_last_year === false}
                  onPress={() => pick({ filed_last_year: false })}
                />
                {draft.filed_last_year === true && (
                  <Animated.View entering={FadeInDown.duration(220)} style={styles.priorFields}>
                    <LabeledMoney
                      label="Total tax you paid last year"
                      value={draft.prior_year_tax ?? 0}
                      onChange={(v) => set({ prior_year_tax: v })}
                    />
                    <LabeledMoney
                      label="Your AGI last year"
                      value={draft.prior_year_agi ?? 0}
                      onChange={(v) => set({ prior_year_agi: v })}
                    />
                    <Button title="Continue" onPress={goNext} />
                  </Animated.View>
                )}
              </Question>
            )}

            {page === 6 && (
              <Question title="How do you handle taxes right now?">
                {METHODS.map((c, i) => (
                  <QuizOption
                    key={c.id}
                    choice={c}
                    index={i}
                    selected={draft.method === c.id}
                    onPress={() => pick({ method: c.id })}
                  />
                ))}
              </Question>
            )}

            {page === 7 && (
              <Question title="Ever been surprised by a tax bill?">
                {SURPRISED.map((c, i) => (
                  <QuizOption
                    key={c.id}
                    choice={c}
                    index={i}
                    selected={draft.surprised === c.id}
                    onPress={() => pick({ surprised: c.id })}
                  />
                ))}
              </Question>
            )}

            {page === 8 && <BuildingPlan onDone={goNext} />}

            {page === 9 && (
              <Reveal
                rate={reveal.rate}
                tax={reveal.tax}
                state={draft.state}
                loading={saving}
                onContinue={finish}
              />
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Vibrant building blocks ────────────────────────────────────────────────

/** Soft radial glow washed from the top of the screen. */
function GlowBg({ color }: { color: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="glow" cx="50%" cy="2%" r="75%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
    </Svg>
  );
}

function GlowIcon({ icon }: { icon: IconSymbolName }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.glowIcon,
        {
          backgroundColor: theme.primaryTint,
          shadowColor: theme.primary,
          shadowOpacity: 0.5,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}>
      <IconSymbol name={icon} color={theme.primary} size={40} />
    </View>
  );
}

/** The Taxnest app icon as a glowing rounded tile. */
function BrandIcon() {
  const theme = useTheme();
  return (
    <View style={[styles.brandTileWrap, { shadowColor: theme.primary }]}>
      <Image source={require('../../../assets/images/icon-light.png')} style={styles.brandTile} />
    </View>
  );
}

function ProgressBar({ value }: { value: number }) {
  const theme = useTheme();
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withSpring(value, { damping: 18, stiffness: 140 });
  }, [value, w]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(3, w.value * 100)}%` }));
  return (
    <View style={[styles.track, { backgroundColor: theme.surface }]}>
      <Animated.View
        style={[styles.fill, { backgroundColor: theme.primary, shadowColor: theme.primary }, fill]}
      />
    </View>
  );
}

function Question({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.qRoot}>
      <ThemedText variant="screenTitle" style={styles.qTitle}>
        {title}
      </ThemedText>
      {subtitle && (
        <ThemedText variant="body" color="textSecondary" style={styles.qSubtitle}>
          {subtitle}
        </ThemedText>
      )}
      <View style={styles.qOptions}>{children}</View>
    </View>
  );
}

function QuizOption({
  choice,
  index,
  selected,
  onPress,
}: {
  choice: Choice;
  index: number;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 55)
        .springify()
        .damping(15)
        .mass(0.7)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={({ pressed }) => [
          styles.option,
          {
            backgroundColor: selected ? theme.primary : theme.surface,
            borderColor: selected ? theme.primary : theme.border,
          },
          selected && {
            shadowColor: theme.primary,
            shadowOpacity: 0.45,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          },
          pressed && styles.optionPressed,
        ]}>
        <View
          style={[
            styles.optionIcon,
            { backgroundColor: selected ? 'rgba(255,255,255,0.22)' : theme.primaryTint },
          ]}>
          <IconSymbol name={choice.icon} color={selected ? '#FFFFFF' : theme.primary} size={20} />
        </View>
        <ThemedText
          variant="body"
          style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
          {choice.label}
        </ThemedText>
        {selected && <IconSymbol name="checkmark.circle.fill" color="#FFFFFF" size={22} />}
      </Pressable>
    </Animated.View>
  );
}

function MoneyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const theme = useTheme();
  const [text, setText] = useState(value > 0 ? String(value) : '');
  return (
    <View style={styles.moneyRow}>
      <ThemedText style={[styles.moneyCurrency, { color: theme.textSecondary }]}>$</ThemedText>
      <TextInput
        keyboardType="decimal-pad"
        value={text}
        onChangeText={(t) => {
          const s = sanitizeAmount(t);
          setText(s);
          onChange(parseFloat(s) || 0);
        }}
        placeholder="0"
        placeholderTextColor={theme.textTertiary}
        style={[styles.moneyInput, { color: theme.textPrimary }]}
        autoFocus
      />
    </View>
  );
}

function LabeledMoney({
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

const BUILD_LINES = [
  'Analyzing your income…',
  'Checking your state tax rates…',
  'Calculating your set-aside rate…',
  'Finalizing your plan…',
];
const RING_R = 56;
const RING_C = 2 * Math.PI * RING_R;

function BuildingPlan({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [line, setLine] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) });
    const interval = setInterval(
      () => setLine((l) => Math.min(l + 1, BUILD_LINES.length - 1)),
      640,
    );
    const done = setTimeout(onDone, 2800);
    return () => {
      clearInterval(interval);
      clearTimeout(done);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_C * (1 - progress.value) }));

  return (
    <View style={styles.centered}>
      <View style={styles.ringWrap}>
        <Svg width={148} height={148}>
          <Circle cx={74} cy={74} r={RING_R} stroke={theme.surface} strokeWidth={10} fill="none" />
          <AnimatedCircle
            cx={74}
            cy={74}
            r={RING_R}
            stroke={theme.primary}
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={RING_C}
            animatedProps={ringProps}
            transform="rotate(-90 74 74)"
          />
        </Svg>
        <View style={styles.ringCenter}>
          <IconSymbol name="sparkles" color={theme.primary} size={30} />
        </View>
      </View>
      <ThemedText variant="screenTitle" style={styles.center}>
        Building your plan
      </ThemedText>
      <Animated.View key={line} entering={FadeIn.duration(220)}>
        <ThemedText variant="body" color="textSecondary">
          {BUILD_LINES[line]}
        </ThemedText>
      </Animated.View>
    </View>
  );
}

function Reveal({
  rate,
  tax,
  state,
  loading,
  onContinue,
}: {
  rate: number;
  tax: number;
  state?: string;
  loading: boolean;
  onContinue: () => void;
}) {
  const theme = useTheme();
  const animatedRate = useCountUp(rate, 1200);

  useEffect(() => {
    haptics.success();
  }, []);

  return (
    <View style={styles.revealRoot}>
      <View style={styles.revealCenter}>
        <ThemedText variant="secondary" color="textSecondary" style={styles.kicker}>
          YOUR PERSONALIZED PLAN
        </ThemedText>
        <Animated.View entering={ZoomIn.springify().damping(12).mass(0.6)}>
          <ThemedText style={[styles.revealPct, { color: theme.accent }]}>
            {Math.round(animatedRate)}%
          </ThemedText>
        </Animated.View>
        <ThemedText variant="sectionHeader" style={styles.center}>
          Set this aside from every payment to stay covered
        </ThemedText>

        {tax > 0 && (
          <Animated.View
            entering={FadeInDown.delay(450).springify().damping(18)}
            style={[
              styles.impactCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}>
            <IconSymbol name="exclamationmark.triangle.fill" color={theme.warning} size={20} />
            <ThemedText variant="body" color="textSecondary" style={styles.impactText}>
              Without a plan, you could owe about{' '}
              <ThemedText
                variant="body"
                style={[styles.impactAmount, { color: theme.textPrimary }]}>
                {formatUSD(tax)}
              </ThemedText>{' '}
              when taxes come due.
            </ThemedText>
          </Animated.View>
        )}

        <StateCoverageNotice state={state} />
      </View>

      <View style={styles.footer}>
        <Button title="See my plan" loading={loading} onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: ScreenPadding },
  body: { flex: 1, paddingTop: Spacing.lg },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  track: { flex: 1, height: 8, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  center: { textAlign: 'center' },
  headline: { fontSize: 30, lineHeight: 38 },
  glowIcon: {
    width: 84,
    height: 84,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  brandTileWrap: {
    borderRadius: 26,
    marginBottom: Spacing.md,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  brandTile: { width: 104, height: 104, borderRadius: 26 },
  cta: { alignSelf: 'stretch', marginTop: Spacing.lg },
  qRoot: { flex: 1, gap: Spacing.sm },
  qTitle: { marginBottom: Spacing.xs, fontSize: 26, lineHeight: 32 },
  qSubtitle: { marginBottom: Spacing.md },
  qOptions: { gap: Spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  optionPressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { flex: 1 },
  optionLabelSelected: { color: '#FFFFFF', fontWeight: '600' },
  pickerWrap: { flex: 1, marginTop: Spacing.sm },
  moneyArea: { flex: 1, justifyContent: 'center' },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  moneyCurrency: { fontSize: 40, fontWeight: '600', lineHeight: 64 },
  moneyInput: {
    fontSize: 56,
    fontWeight: '700',
    lineHeight: 64,
    minWidth: 24,
    textAlign: 'center',
  },
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
  priorFields: { gap: Spacing.lg, marginTop: Spacing.md },
  footer: { gap: Spacing.sm, paddingVertical: Spacing.md },
  ringWrap: { width: 148, height: 148, alignItems: 'center', justifyContent: 'center' },
  ringCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealRoot: { flex: 1 },
  revealCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  kicker: { letterSpacing: 1.5 },
  revealPct: {
    fontSize: 84,
    fontWeight: '800',
    lineHeight: 96,
    fontVariant: ['tabular-nums'],
  },
  impactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  impactText: { flex: 1, lineHeight: 22 },
  impactAmount: { fontWeight: '700' },
});
