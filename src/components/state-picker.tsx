import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { IconSymbol } from '@/components/icon-symbol';
import { OptionRow } from '@/components/option-row';
import { Radius, Spacing, useTheme } from '@/design';
import { US_STATES, type USState } from '@/lib/us-states';

/** Searchable list of US states + DC. */
export function StatePicker({
  selected,
  onSelect,
}: {
  selected?: string;
  onSelect: (code: string) => void;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return US_STATES;
    return US_STATES.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase() === q);
  }, [query]);

  return (
    <View style={styles.container}>
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
      <FlatList
        data={results}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        renderItem={({ item }: { item: USState }) => (
          <OptionRow
            label={item.name}
            selected={selected === item.code}
            onPress={() => onSelect(item.code)}
            style={styles.rowSpacing}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: Spacing.md },
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
  list: { flex: 1 },
  rowSpacing: { marginBottom: Spacing.sm },
});
