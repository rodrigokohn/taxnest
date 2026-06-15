import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { IconSymbol } from '@/components/icon-symbol';
import { ProGate } from '@/components/pro-gate';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing, useTheme } from '@/design';

/** Reports (PRD §8.7). Pro-gated. PDF generation is wired up in a later step. */
export default function ReportsRoute() {
  const theme = useTheme();
  return (
    <Screen edges={[]}>
      <ProGate
        title="Reports"
        benefit="Generate an accountant-ready PDF of your year: income by source, deductions, estimated taxes, and quarterly payments.">
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
            style={styles.cta}
            onPress={() => Alert.alert('Reports', 'PDF export arrives in a later step.')}
          />
        </View>
      </ProGate>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  center: { textAlign: 'center' },
  cta: { alignSelf: 'stretch', marginTop: Spacing.lg },
});
