/**
 * Local notifications (PRD §8.1 step 7, §3 quarterly reminders).
 *
 * Schedules a reminder a few days before each estimated-quarterly deadline.
 * Local-only (no remote push), so no server or device token is needed.
 */
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Days before a deadline to remind the user. */
const REMINDER_LEAD_DAYS = 5;

export async function getNotificationsGranted(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (await getNotificationsGranted()) return true;
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return result.granted;
}

/** Replaces all scheduled reminders with ones for the upcoming deadlines. */
export async function scheduleQuarterlyReminders(
  deadlines: string[],
  now: Date = new Date(),
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!(await getNotificationsGranted())) return;

  for (let i = 0; i < deadlines.length; i++) {
    const due = new Date(`${deadlines[i]}T09:00:00`);
    const remindAt = new Date(due.getTime() - REMINDER_LEAD_DAYS * 86_400_000);
    if (remindAt.getTime() <= now.getTime()) continue; // skip past dates

    const label = due.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Q${i + 1} estimated tax is coming up`,
        body: `Your Q${i + 1} payment is due ${label}. Open FreelanceTax to see how much to pay.`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: remindAt },
    });
  }
}

export async function cancelQuarterlyReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
