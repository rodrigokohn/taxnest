/** Light haptic feedback for key confirmations (PRD §8.0 motion). */
import * as Haptics from 'expo-haptics';

export const haptics = {
  success: () =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
};
