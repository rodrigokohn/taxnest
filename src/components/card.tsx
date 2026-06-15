import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing, useTheme } from '@/design';

/** Soft rounded surface — the primary visual unit of the dashboard (PRD §8.0). */
export function Card({ style, children, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
