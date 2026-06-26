import { getDb } from '@/data/db';
import { syncUpsert } from '@/data/sync';
import { type Quarter, type QuarterlyPayment } from '@/domain';
import { newId } from '@/lib/id';

type Row = Omit<QuarterlyPayment, 'is_paid'> & { is_paid: number };

function toQuarterly(r: Row): QuarterlyPayment {
  return { ...r, quarter: r.quarter as Quarter, is_paid: r.is_paid === 1 };
}

export const quarterlyPaymentRepo = {
  async listByYear(taxYear: number): Promise<QuarterlyPayment[]> {
    const rows = await getDb().getAllAsync<Row>(
      'SELECT * FROM quarterly_payment WHERE tax_year = ? ORDER BY quarter ASC',
      taxYear,
    );
    return rows.map(toQuarterly);
  },

  /** Mark a quarter as paid (upsert by tax_year + quarter). */
  async markPaid(
    taxYear: number,
    quarter: Quarter,
    amountPaid: number,
    datePaid: string,
  ): Promise<void> {
    await getDb().runAsync(
      `INSERT INTO quarterly_payment (id, quarter, tax_year, amount_paid, date_paid, is_paid)
       VALUES (?, ?, ?, ?, ?, 1)
       ON CONFLICT(tax_year, quarter) DO UPDATE SET
         amount_paid = excluded.amount_paid,
         date_paid = excluded.date_paid,
         is_paid = 1`,
      newId(),
      quarter,
      taxYear,
      amountPaid,
      datePaid,
    );
    await this.syncRow(taxYear, quarter);
  },

  /** Reverse a "mark as paid". */
  async markUnpaid(taxYear: number, quarter: Quarter): Promise<void> {
    await getDb().runAsync(
      'UPDATE quarterly_payment SET is_paid = 0 WHERE tax_year = ? AND quarter = ?',
      taxYear,
      quarter,
    );
    await this.syncRow(taxYear, quarter);
  },

  /** Push the row for a (year, quarter) to the cloud — the id is the on-conflict winner. */
  async syncRow(taxYear: number, quarter: Quarter): Promise<void> {
    const row = await getDb().getFirstAsync<{ id: string }>(
      'SELECT id FROM quarterly_payment WHERE tax_year = ? AND quarter = ?',
      taxYear,
      quarter,
    );
    if (row) syncUpsert('quarterly_payment', row.id);
  },
};
