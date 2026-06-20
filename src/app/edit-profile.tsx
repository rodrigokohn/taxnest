import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { OptionRow } from '@/components/option-row';
import { Screen } from '@/components/screen';
import { StatePicker } from '@/components/state-picker';
import { ThemedText } from '@/components/themed-text';
import { FILING_STATUS_LABELS, FILING_STATUSES, type FilingStatus } from '@/domain';
import { Radius, Spacing, useTheme } from '@/design';
import { stateName } from '@/lib/us-states';
import { useProfileStore } from '@/store';

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

/** Edit tax profile (PRD §8.9). Saving recomputes every projection. */
export default function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const update = useProfileStore((s) => s.update);

  const [filingStatus, setFilingStatus] = useState<FilingStatus>(
    profile?.filing_status ?? 'single',
  );
  const [state, setState] = useState(profile?.state ?? 'CA');
  const [income, setIncome] = useState(profile?.estimated_annual_income ?? 0);
  const [priorTax, setPriorTax] = useState(profile?.prior_year_tax ?? 0);
  const [priorAgi, setPriorAgi] = useState(profile?.prior_year_agi ?? 0);
  const [pickingState, setPickingState] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await update({
      filing_status: filingStatus,
      state,
      estimated_annual_income: income,
      prior_year_tax: priorTax > 0 ? priorTax : undefined,
      prior_year_agi: priorAgi > 0 ? priorAgi : undefined,
    });
    router.back();
  }

  if (pickingState) {
    return (
      <Screen edges={['bottom']}>
        <ThemedText variant="screenTitle" style={styles.pickerTitle}>
          Select state
        </ThemedText>
        <StatePicker
          selected={state}
          onSelect={(code) => {
            setState(code);
            setPickingState(false);
          }}
        />
      </Screen>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <Label text="Filing status" />
      {FILING_STATUSES.map((fs) => (
        <OptionRow
          key={fs}
          label={FILING_STATUS_LABELS[fs]}
          selected={filingStatus === fs}
          onPress={() => setFilingStatus(fs)}
        />
      ))}

      <Label text="State" top />
      <OptionRow label={stateName(state)} selected={false} onPress={() => setPickingState(true)} />

      <Label text="Estimated annual income" top />
      <MoneyField value={income} onChange={setIncome} />

      <Label text="Prior year (optional — for safe harbor)" top />
      <MoneyField label="Tax paid last year" value={priorTax} onChange={setPriorTax} />
      <MoneyField label="AGI last year" value={priorAgi} onChange={setPriorAgi} />

      <Button title="Save" onPress={save} loading={saving} style={styles.save} />
    </ScrollView>
  );
}

function Label({ text, top }: { text: string; top?: boolean }) {
  return (
    <ThemedText
      variant="caption"
      color="textTertiary"
      style={[styles.label, top && styles.labelTop]}>
      {text.toUpperCase()}
    </ThemedText>
  );
}

function MoneyField({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  const theme = useTheme();
  const [text, setText] = useState(value > 0 ? String(value) : '');
  return (
    <View style={styles.moneyField}>
      {label && (
        <ThemedText variant="secondary" color="textSecondary">
          {label}
        </ThemedText>
      )}
      <View
        style={[styles.fieldBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <ThemedText variant="body" color="textSecondary">
          $
        </ThemedText>
        <TextInput
          keyboardType="decimal-pad"
          value={text}
          onChangeText={(t) => {
            const clean = sanitizeAmount(t);
            setText(clean);
            onChange(parseFloat(clean) || 0);
          }}
          placeholder="0"
          placeholderTextColor={theme.textTertiary}
          style={[styles.fieldInput, { color: theme.textPrimary }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xxxl },
  label: { paddingHorizontal: Spacing.xs },
  labelTop: { marginTop: Spacing.lg },
  pickerTitle: { paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  moneyField: { gap: Spacing.xs },
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
  save: { marginTop: Spacing.xl },
});
