import { create } from 'zustand';

import { paymentRepo, type NewPayment, type PaymentPatch } from '@/data';
import { type Payment } from '@/domain';

type PaymentsState = {
  taxYear: number | null;
  payments: Payment[];
  /** Sum of the immutable set-aside snapshots (the Home "hero" total). */
  totalSetAside: number;
  totalIncome: number;
  load: (taxYear: number) => Promise<void>;
  add: (input: NewPayment) => Promise<Payment>;
  edit: (id: string, patch: PaymentPatch) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

function totals(payments: Payment[]) {
  return payments.reduce(
    (acc, p) => {
      acc.totalSetAside += p.set_aside_amount;
      acc.totalIncome += p.amount;
      return acc;
    },
    { totalSetAside: 0, totalIncome: 0 },
  );
}

export const usePaymentsStore = create<PaymentsState>()((set, get) => ({
  taxYear: null,
  payments: [],
  totalSetAside: 0,
  totalIncome: 0,

  async load(taxYear) {
    const payments = await paymentRepo.listByYear(taxYear);
    set({ taxYear, payments, ...totals(payments) });
  },

  async add(input) {
    const created = await paymentRepo.create(input);
    if (get().taxYear === input.tax_year) {
      const payments = [created, ...get().payments];
      set({ payments, ...totals(payments) });
    }
    return created;
  },

  async edit(id, patch) {
    await paymentRepo.update(id, patch);
    const year = get().taxYear;
    if (year != null) await get().load(year);
  },

  async remove(id) {
    await paymentRepo.remove(id);
    const payments = get().payments.filter((p) => p.id !== id);
    set({ payments, ...totals(payments) });
  },
}));
