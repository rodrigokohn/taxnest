import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MinTouchTarget, Radius, Spacing, useTheme } from '@/design';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

/** Full-width CTA. One dominant `primary` per screen (PRD §8.0 rule 2). */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const background =
    variant === 'primary' ? theme.primary : variant === 'secondary' ? theme.surface : 'transparent';
  const textColor = variant === 'primary' ? '#FFFFFF' : theme.primary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background },
        variant === 'secondary' && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
        },
        (pressed || isDisabled) && styles.dimmed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          <ThemedText variant="sectionHeader" style={{ color: textColor }}>
            {title}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    minWidth: MinTouchTarget,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dimmed: { opacity: 0.6 },
});
