import { getDb } from '@/data/db';
import { syncDelete, syncUpsert } from '@/data/sync';
import { type Payment } from '@/domain';
import { newId } from '@/lib/id';

type Row = Omit<Payment, 'note'> & { note: string | null };

function toPayment(r: Row): Payment {
  return { ...r, note: r.note ?? undefined };
}

/** Fields supplied by the caller; id + created_at are generated here. */
export type NewPayment = Omit<Payment, 'id' | 'created_at'>;
export type PaymentPatch = Partial<
  Pick<Payment, 'amount' | 'date' | 'note' | 'income_source_id' | 'set_aside_amount'>
>;

export const paymentRepo = {
  async listByYear(taxYear: number): Promise<Payment[]> {
    const rows = await getDb().getAllAsync<Row>(
      'SELECT * FROM payment WHERE tax_year = ? ORDER BY date DESC, created_at DESC',
      taxYear,
    );
    return rows.map(toPayment);
  },

  async create(input: NewPayment): Promise<Payment> {
    const payment: Payment = { ...input, id: newId(), created_at: new Date().toISOString() };
    await getDb().runAsync(
      `INSERT INTO payment
        (id, income_source_id, amount, date, set_aside_amount, note, tax_year, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      payment.id,
      payment.income_source_id,
      payment.amount,
      payment.date,
      payment.set_aside_amount,
      payment.note ?? null,
      payment.tax_year,
      payment.created_at,
    );
    syncUpsert('payment', payment.id);
    return payment;
  },

  async update(id: string, patch: PaymentPatch): Promise<void> {
    const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return;
    const set = entries.map(([k]) => `${k} = ?`).join(', ');
    await getDb().runAsync(
      `UPDATE payment SET ${set} WHERE id = ?`,
      ...entries.map(([k, v]) => (k === 'note' ? (v ?? null) : v) as string | number | null),
      id,
    );
    syncUpsert('payment', id);
  },

  async remove(id: string): Promise<void> {
    await getDb().runAsync('DELETE FROM payment WHERE id = ?', id);
    syncDelete('payment', id);
  },

  async sumSetAsideByYear(taxYear: number): Promise<number> {
    const row = await getDb().getFirstAsync<{ total: number | null }>(
      'SELECT SUM(set_aside_amount) AS total FROM payment WHERE tax_year = ?',
      taxYear,
    );
    return row?.total ?? 0;
  },

  async sumAmountByYear(taxYear: number): Promise<number> {
    const row = await getDb().getFirstAsync<{ total: number | null }>(
      'SELECT SUM(amount) AS total FROM payment WHERE tax_year = ?',
      taxYear,
    );
    return row?.total ?? 0;
  },
};
