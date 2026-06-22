import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { MinTouchTarget, Radius, Spacing, useTheme } from '@/design';
import { haptics } from '@/services/haptics';

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
  const isPrimary = variant === 'primary';
  const lifted = isPrimary && !isDisabled;

  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const background = isPrimary
    ? theme.primary
    : variant === 'secondary'
      ? theme.surface
      : 'transparent';
  const textColor = isPrimary ? '#FFFFFF' : theme.primary;

  return (
    <Animated.View
      style={[
        styles.wrap,
        { backgroundColor: background },
        variant === 'secondary' && {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.border,
        },
        lifted && { shadowColor: theme.primary, ...styles.lift },
        isDisabled && styles.dimmed,
        animatedStyle,
        style,
      ]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        disabled={isDisabled}
        onPress={() => {
          if (isPrimary) haptics.light();
          onPress();
        }}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 20, stiffness: 360 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 280 });
        }}
        style={styles.button}>
        {lifted && (
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Defs>
              <LinearGradient id="btnSheen" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.22} />
                <Stop offset="60%" stopColor="#FFFFFF" stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#btnSheen)" />
          </Svg>
        )}
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.lg },
  lift: {
    shadowOpacity: 0.38,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  button: {
    minHeight: 54,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    minWidth: MinTouchTarget,
    overflow: 'hidden',
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dimmed: { opacity: 0.6 },
});
