import * as SQLite from 'expo-sqlite';

import { migrate } from '@/data/migrations';

const DATABASE_NAME = 'freelancetax.db';

let database: SQLite.SQLiteDatabase | null = null;

/**
 * The app's single SQLite connection. Opened lazily and migrated on first use.
 * Repositories call this; the engine never touches it (it stays pure).
 */
export function getDb(): SQLite.SQLiteDatabase {
  if (!database) {
    const db = SQLite.openDatabaseSync(DATABASE_NAME);
    db.execSync('PRAGMA journal_mode = WAL;');
    db.execSync('PRAGMA foreign_keys = ON;');
    migrate(db);
    database = db;
  }
  return database;
}

/** Test/teardown helper: close and forget the connection. */
export function closeDb(): void {
  database?.closeSync();
  database = null;
}
