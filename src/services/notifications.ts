/**
 * Push notifications (PRD §8.1 step 7, §3 quarterly reminders).
 *
 * Stub for now — wired to `expo-notifications` in the push sub-phase of Phase 4
 * (permission request + scheduling the four quarterly-deadline reminders).
 * Screens call these and don't change when the real implementation lands.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  // TODO(phase4-push): Notifications.requestPermissionsAsync()
  return false;
}

export async function scheduleQuarterlyReminders(_deadlines: string[]): Promise<void> {
  // TODO(phase4-push): schedule local notifications a few days before each deadline.
}
