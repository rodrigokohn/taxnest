import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { ScreenPadding, useTheme } from '@/design';

/** Standard screen container: safe-area aware, themed background, side padding. */
export function Screen({
  children,
  edges = ['top'],
  padded = true,
  style,
}: {
  children: ReactNode;
  edges?: readonly Edge[];
  padded?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: theme.background }]}>
      <View style={[styles.flex, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { paddingHorizontal: ScreenPadding },
});
