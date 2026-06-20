import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Savings milestones — cumulative set-aside thresholds (this tax year) that earn
 * a calm, one-time celebration (PRD §8.0 habit layer). Real progress, not points.
 */
export const MILESTONES = [1000, 2500, 5000, 10000, 25000, 50000, 100000] as const;

/** The highest milestone the running total has reached, or null if below the first. */
export function highestMilestoneReached(total: number): number | null {
  let reached: number | null = null;
  for (const m of MILESTONES) {
    if (total >= m) reached = m;
    else break;
  }
  return reached;
}

/** The next milestone above `total` and progress toward it (0..1), or null at the top. */
export function nextMilestone(total: number): { threshold: number; pct: number } | null {
  const idx = MILESTONES.findIndex((m) => total < m);
  if (idx === -1) return null;
  const threshold = MILESTONES[idx];
  const floor = idx === 0 ? 0 : MILESTONES[idx - 1];
  const pct = Math.max(0, Math.min(1, (total - floor) / (threshold - floor)));
  return { threshold, pct };
}

const key = (year: number) => `taxnest.milestone.${year}`;

/** Highest milestone already celebrated this year (0 if none). */
export async function getCelebratedMilestone(year: number): Promise<number> {
  const raw = await AsyncStorage.getItem(key(year));
  return raw ? Number(raw) || 0 : 0;
}

export async function setCelebratedMilestone(year: number, threshold: number): Promise<void> {
  await AsyncStorage.setItem(key(year), String(threshold));
}
