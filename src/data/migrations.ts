import { type SQLiteDatabase } from 'expo-sqlite';

/**
 * Schema migrations, applied via `PRAGMA user_version`. Each entry advances the
 * schema by one version. Append new migrations; never edit shipped ones.
 */

const V1_SCHEMA = `
CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY NOT NULL,
  filing_status TEXT NOT NULL,
  state TEXT NOT NULL,
  estimated_annual_income REAL NOT NULL,
  prior_year_tax REAL,
  prior_year_agi REAL,
  retirement_contributions REAL,
  self_employed_health_insurance REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS income_source (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payment (
  id TEXT PRIMARY KEY NOT NULL,
  income_source_id TEXT NOT NULL REFERENCES income_source(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  set_aside_amount REAL NOT NULL,
  note TEXT,
  tax_year INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_year ON payment(tax_year);
CREATE INDEX IF NOT EXISTS idx_payment_source ON payment(income_source_id);

CREATE TABLE IF NOT EXISTS deduction (
  id TEXT PRIMARY KEY NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  tax_year INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deduction_year ON deduction(tax_year);

CREATE TABLE IF NOT EXISTS quarterly_payment (
  id TEXT PRIMARY KEY NOT NULL,
  quarter INTEGER NOT NULL,
  tax_year INTEGER NOT NULL,
  amount_paid REAL NOT NULL,
  date_paid TEXT NOT NULL,
  is_paid INTEGER NOT NULL DEFAULT 0,
  UNIQUE(tax_year, quarter)
);

CREATE TABLE IF NOT EXISTS tax_config_cache (
  tax_year INTEGER PRIMARY KEY NOT NULL,
  json TEXT NOT NULL,
  last_updated TEXT NOT NULL,
  cached_at TEXT NOT NULL
);
`;

/** Ordered migrations. Index + 1 == the schema version it produces. */
const MIGRATIONS: ((db: SQLiteDatabase) => void)[] = [(db) => db.execSync(V1_SCHEMA)];

export const SCHEMA_VERSION = MIGRATIONS.length;

/** Bring the database up to the latest schema version. Runs synchronously. */
export function migrate(db: SQLiteDatabase): void {
  const row = db.getFirstSync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    MIGRATIONS[v](db);
    // PRAGMA cannot be parameterized; the literal is from our own array length.
    db.execSync(`PRAGMA user_version = ${v + 1}`);
  }
}
