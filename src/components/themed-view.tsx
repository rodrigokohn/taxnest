import { View, type ViewProps } from 'react-native';

import { type ThemeColor, useTheme } from '@/design';

export type ThemedViewProps = ViewProps & {
  /** Semantic background color token. Defaults to background. */
  color?: ThemeColor;
};

export function ThemedView({ style, color, ...rest }: ThemedViewProps) {
  const theme = useTheme();
  return <View style={[{ backgroundColor: theme[color ?? 'background'] }, style]} {...rest} />;
}
