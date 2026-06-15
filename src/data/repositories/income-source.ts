import { getDb } from '@/data/db';
import { type IncomeSource } from '@/domain';
import { newId } from '@/lib/id';

const DEFAULT_SOURCE_NAME = 'Income';
const DEFAULT_SOURCE_COLOR = '#0F6E56';

export const incomeSourceRepo = {
  async list(): Promise<IncomeSource[]> {
    return getDb().getAllAsync<IncomeSource>('SELECT * FROM income_source ORDER BY created_at ASC');
  },

  async create(name: string, color: string): Promise<IncomeSource> {
    const source: IncomeSource = {
      id: newId(),
      name,
      color,
      created_at: new Date().toISOString(),
    };
    await getDb().runAsync(
      'INSERT INTO income_source (id, name, color, created_at) VALUES (?, ?, ?, ?)',
      source.id,
      source.name,
      source.color,
      source.created_at,
    );
    return source;
  },

  async update(id: string, patch: { name?: string; color?: string }): Promise<void> {
    const fields = Object.entries(patch).filter(([, v]) => v !== undefined);
    if (fields.length === 0) return;
    const set = fields.map(([k]) => `${k} = ?`).join(', ');
    await getDb().runAsync(
      `UPDATE income_source SET ${set} WHERE id = ?`,
      ...fields.map(([, v]) => v as string),
      id,
    );
  },

  async remove(id: string): Promise<void> {
    await getDb().runAsync('DELETE FROM income_source WHERE id = ?', id);
  },

  /** Returns the first source, creating a default one if none exists (Free: single implicit source). */
  async ensureDefault(): Promise<IncomeSource> {
    const existing = await getDb().getFirstAsync<IncomeSource>(
      'SELECT * FROM income_source ORDER BY created_at ASC LIMIT 1',
    );
    return existing ?? this.create(DEFAULT_SOURCE_NAME, DEFAULT_SOURCE_COLOR);
  },
};
