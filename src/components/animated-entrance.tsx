import { type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

/**
 * Subtle staggered entrance for content blocks (PRD §8.0: motion serves
 * clarity and calm). Pass an increasing `index` to stagger siblings.
 */
export function AnimatedEntrance({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.delay(index * 70)
        .springify()
        .damping(18)
        .mass(0.7)}>
      {children}
    </Animated.View>
  );
}
