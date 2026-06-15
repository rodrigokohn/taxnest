import { Text, type TextProps } from 'react-native';

import { type ThemeColor, Typography, type TypographyRole, useTheme } from '@/design';

export type ThemedTextProps = TextProps & {
  /** Typography role from the PRD type scale. Defaults to body. */
  variant?: TypographyRole;
  /** Semantic color token. Defaults to textPrimary. */
  color?: ThemeColor;
};

// Note: named `variant` (not `role`) to avoid colliding with React Native's
// accessibility `role` prop on TextProps.
export function ThemedText({ style, variant = 'body', color, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  return (
    <Text
      style={[Typography[variant], { color: theme[color ?? 'textPrimary'] }, style]}
      {...rest}
    />
  );
}
