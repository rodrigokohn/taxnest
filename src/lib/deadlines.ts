export type DeadlineInfo = {
  quarter: number;
  date: string; // ISO date
  daysRemaining: number;
  isOverdue: boolean;
};

/**
 * The next estimated-quarterly deadline relative to `now`. If every deadline has
 * passed, returns the last one flagged as overdue.
 */
export function nextQuarterlyDeadline(
  deadlines: string[],
  now: Date = new Date(),
): DeadlineInfo | null {
  const sorted = deadlines
    .map((date, i) => ({ date, quarter: i + 1 }))
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const d of sorted) {
    const due = new Date(`${d.date}T23:59:59`);
    const daysRemaining = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
    if (daysRemaining >= 0) {
      return { quarter: d.quarter, date: d.date, daysRemaining, isOverdue: false };
    }
  }

  const last = sorted[sorted.length - 1];
  return last
    ? { quarter: last.quarter, date: last.date, daysRemaining: 0, isOverdue: true }
    : null;
}

/** "Sep 15" style short label. */
export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
