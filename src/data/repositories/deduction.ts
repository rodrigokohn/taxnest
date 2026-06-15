import { getDb } from '@/data/db';
import { type Deduction, type DeductionCategory } from '@/domain';
import { newId } from '@/lib/id';

type Row = Omit<Deduction, 'note' | 'category'> & { note: string | null; category: string };

function toDeduction(r: Row): Deduction {
  return { ...r, category: r.category as DeductionCategory, note: r.note ?? undefined };
}

export type NewDeduction = Omit<Deduction, 'id'>;

export const deductionRepo = {
  async listByYear(taxYear: number): Promise<Deduction[]> {
    const rows = await getDb().getAllAsync<Row>(
      'SELECT * FROM deduction WHERE tax_year = ? ORDER BY date DESC',
      taxYear,
    );
    return rows.map(toDeduction);
  },

  async create(input: NewDeduction): Promise<Deduction> {
    const deduction: Deduction = { ...input, id: newId() };
    await getDb().runAsync(
      `INSERT INTO deduction (id, category, amount, date, note, tax_year)
       VALUES (?, ?, ?, ?, ?, ?)`,
      deduction.id,
      deduction.category,
      deduction.amount,
      deduction.date,
      deduction.note ?? null,
      deduction.tax_year,
    );
    return deduction;
  },

  async remove(id: string): Promise<void> {
    await getDb().runAsync('DELETE FROM deduction WHERE id = ?', id);
  },

  async sumByYear(taxYear: number): Promise<number> {
    const row = await getDb().getFirstAsync<{ total: number | null }>(
      'SELECT SUM(amount) AS total FROM deduction WHERE tax_year = ?',
      taxYear,
    );
    return row?.total ?? 0;
  },
};
