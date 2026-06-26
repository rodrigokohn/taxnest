import { type SQLiteDatabase } from 'expo-sqlite';

import { env } from '@/config/env';
import { getDb } from '@/data/db';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/store/auth-store';

/**
 * Cloud sync for the user's financial data. Local SQLite is a 1:1 cache of the
 * signed-in account's Supabase rows (schema mirrors src/data/migrations.ts, see
 * backend migration 0007). On login we pull the account's data down; on every
 * local write we push the affected row up (best-effort); on logout we wipe local
 * so the next account never sees the previous one's data.
 *
 * Reads stay local (fast); only mutations and the login pull touch the network.
 */

export type SyncTable =
  | 'user_profile'
  | 'income_source'
  | 'payment'
  | 'deduction'
  | 'quarterly_payment';

/** Insert order: parents before children (payment FK → income_source). */
const TABLES: SyncTable[] = [
  'user_profile',
  'income_source',
  'payment',
  'deduction',
  'quarterly_payment',
];

type Row = Record<string, string | number | null>;

function currentUserId(): string | null {
  return useAuthStore.getState().session?.user.id ?? null;
}

/** True when we're signed in and a backend is configured — i.e. sync should run. */
function syncEnabled(userId: string | null): userId is string {
  return Boolean(userId) && env.hasSupabase;
}

/**
 * Push the just-written row (read back from SQLite, the canonical local truth)
 * to Supabase. Fire-and-forget: a failed push never blocks or breaks the local
 * write — the next login pull reconciles. No-op when signed out / offline-only.
 */
export function syncUpsert(table: SyncTable, id: string): void {
  const userId = currentUserId();
  if (!syncEnabled(userId)) return;
  void (async () => {
    try {
      const row = await getDb().getFirstAsync<Row>(`SELECT * FROM ${table} WHERE id = ?`, id);
      if (!row) return;
      // user_profile is one-per-account (unique user_id): conflict on user_id so a
      // re-run of onboarding (which mints a fresh id) overwrites the existing row
      // instead of violating the constraint.
      const onConflict = table === 'user_profile' ? { onConflict: 'user_id' } : undefined;
      const { error } = await supabase.from(table).upsert({ ...row, user_id: userId }, onConflict);
      if (error) throw error;
    } catch (e) {
      console.warn(`[sync] upsert ${table} failed`, e);
    }
  })();
}

/** Delete the signed-in user's profile from the cloud (used by "reset quiz"). */
export function syncDeleteProfile(): void {
  const userId = currentUserId();
  if (!syncEnabled(userId)) return;
  void (async () => {
    try {
      const { error } = await supabase.from('user_profile').delete().eq('user_id', userId);
      if (error) throw error;
    } catch (e) {
      console.warn('[sync] delete profile failed', e);
    }
  })();
}

/** Best-effort remote delete mirroring a local delete. */
export function syncDelete(table: SyncTable, id: string): void {
  const userId = currentUserId();
  if (!syncEnabled(userId)) return;
  void (async () => {
    try {
      const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
    } catch (e) {
      console.warn(`[sync] delete ${table} failed`, e);
    }
  })();
}

/**
 * Pull the account's data into local SQLite (cloud is the source of truth on
 * login). If the cloud is empty but this device already has local-only data
 * (a pre-sync user signing in for the first time), push that local data up once
 * instead of wiping it. On a transient fetch error we leave local untouched.
 */
export async function pullAllForUser(userId: string): Promise<void> {
  if (!env.hasSupabase) return;

  const results = await Promise.all(
    TABLES.map((t) => supabase.from(t).select('*').eq('user_id', userId)),
  );
  for (const r of results) {
    if (r.error) {
      console.warn('[sync] pull failed', r.error);
      return; // don't wipe local on a network hiccup
    }
  }

  const byTable = new Map<SyncTable, Row[]>();
  TABLES.forEach((t, i) => byTable.set(t, (results[i].data ?? []) as Row[]));

  const remoteEmpty = TABLES.every((t) => byTable.get(t)!.length === 0);
  if (remoteEmpty) {
    if (localHasData()) await pushAllLocal(userId);
    return;
  }

  const db = getDb();
  await db.withTransactionAsync(async () => {
    for (const t of [...TABLES].reverse()) await db.runAsync(`DELETE FROM ${t}`);
    for (const t of TABLES) {
      for (const remoteRow of byTable.get(t)!) await insertLocalRow(db, t, remoteRow);
    }
  });
}

/** Remove every local user row (keeps tax_config_cache). Called on sign-out. */
export function clearLocalUserData(): void {
  getDb().execSync(
    'DELETE FROM payment; DELETE FROM deduction; DELETE FROM quarterly_payment; ' +
      'DELETE FROM income_source; DELETE FROM user_profile;',
  );
}

// --- internals -------------------------------------------------------------

function localHasData(): boolean {
  const db = getDb();
  return TABLES.some((t) => (db.getFirstSync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`)?.n ?? 0) > 0);
}

async function insertLocalRow(db: SQLiteDatabase, table: SyncTable, remoteRow: Row): Promise<void> {
  const { user_id: _userId, ...local } = remoteRow;
  const cols = Object.keys(local);
  if (cols.length === 0) return;
  const placeholders = cols.map(() => '?').join(', ');
  await db.runAsync(
    `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
    ...cols.map((c) => local[c]),
  );
}

async function pushAllLocal(userId: string): Promise<void> {
  const db = getDb();
  for (const t of TABLES) {
    const rows = await db.getAllAsync<Row>(`SELECT * FROM ${t}`);
    if (rows.length === 0) continue;
    const { error } = await supabase.from(t).upsert(rows.map((r) => ({ ...r, user_id: userId })));
    if (error) {
      console.warn(`[sync] initial migration of ${t} failed`, error);
      return;
    }
  }
}
