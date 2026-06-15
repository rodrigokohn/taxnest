import { Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { IconSymbol } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, useTheme } from '@/design';

/** A selectable row with a check (used for filing status, state, etc.). */
export function OptionRow({
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
        styles.row,
        {
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: selected ? theme.primaryTint : theme.surface,
        },
        style,
      ]}>
      <ThemedText variant="body" color={selected ? 'primary' : 'textPrimary'}>
        {label}
      </ThemedText>
      {selected && <IconSymbol name="checkmark.circle.fill" color={theme.primary} size={22} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
});
