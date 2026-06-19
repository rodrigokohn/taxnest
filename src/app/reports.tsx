import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { IconSymbol } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { DEFAULT_TAX_YEAR } from '@/config/tax-year';
import { Spacing, useTheme } from '@/design';
import { generateAndShareReport } from '@/features/reports/generate-report';

/** Reports (PRD §8.7). */
export default function ReportsRoute() {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      await generateAndShareReport(DEFAULT_TAX_YEAR);
    } catch {
      Alert.alert('Reports', 'Could not generate the report. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={[]}>
      <View style={styles.body}>
        <IconSymbol name="doc.text.fill" color={theme.primary} size={40} />
        <ThemedText variant="sectionHeader" style={styles.center}>
          Your tax report
        </ThemedText>
        <ThemedText variant="body" color="textSecondary" style={styles.center}>
          A clean summary you can send straight to your accountant.
        </ThemedText>
        <Button
          title="Generate tax report (PDF)"
          loading={busy}
          style={styles.cta}
          onPress={generate}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  center: { textAlign: 'center' },
  cta: { alignSelf: 'stretch', marginTop: Spacing.lg },
});
