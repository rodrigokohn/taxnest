import { getDb } from '@/data/db';
import { type FilingStatus, type UserProfile } from '@/domain';

type Row = {
  id: string;
  filing_status: string;
  state: string;
  estimated_annual_income: number;
  prior_year_tax: number | null;
  prior_year_agi: number | null;
  retirement_contributions: number | null;
  self_employed_health_insurance: number | null;
  created_at: string;
  updated_at: string;
};

function toProfile(r: Row): UserProfile {
  return {
    id: r.id,
    filing_status: r.filing_status as FilingStatus,
    state: r.state,
    estimated_annual_income: r.estimated_annual_income,
    prior_year_tax: r.prior_year_tax ?? undefined,
    prior_year_agi: r.prior_year_agi ?? undefined,
    retirement_contributions: r.retirement_contributions ?? undefined,
    self_employed_health_insurance: r.self_employed_health_insurance ?? undefined,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/** Single-user MVP: there is at most one profile row. */
export const userProfileRepo = {
  async get(): Promise<UserProfile | null> {
    const row = await getDb().getFirstAsync<Row>('SELECT * FROM user_profile LIMIT 1');
    return row ? toProfile(row) : null;
  },

  /** Insert or replace the profile. */
  async save(profile: UserProfile): Promise<UserProfile> {
    await getDb().runAsync(
      `INSERT OR REPLACE INTO user_profile
        (id, filing_status, state, estimated_annual_income, prior_year_tax, prior_year_agi,
         retirement_contributions, self_employed_health_insurance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      profile.id,
      profile.filing_status,
      profile.state,
      profile.estimated_annual_income,
      profile.prior_year_tax ?? null,
      profile.prior_year_agi ?? null,
      profile.retirement_contributions ?? null,
      profile.self_employed_health_insurance ?? null,
      profile.created_at,
      profile.updated_at,
    );
    return profile;
  },
};
