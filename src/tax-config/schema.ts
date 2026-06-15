/**
 * Runtime validation for a TaxConfig (PRD §9.1 "deterministic validation gate").
 *
 * This is the safety net that makes the "AI never produces a tax number"
 * guarantee real: any config — whether fetched from the backend or produced by
 * the annual AI job — must pass these sanity checks before it is allowed to be
 * used. The same checks run on the backend before a config is ever saved.
 */
import { z } from 'zod';

import { type TaxConfig } from '@/tax-config/types';

const rate = z.number().min(0).max(1);
const money = z.number().min(0);

/** A fixed-key record over the four filing statuses. */
function filingStatusRecord<T extends z.ZodTypeAny>(value: T) {
  return z.object({
    single: value,
    married_joint: value,
    married_separate: value,
    head_of_household: value,
  });
}

const bracketSchema = z.object({
  lower: z.number().min(0),
  upper: z.union([z.number().min(0), z.null()]),
  rate,
});

/** Brackets must be ordered by ascending lower bound with non-decreasing rates;
 * only the final bracket may be unbounded (upper === null). */
const bracketsSchema = z
  .array(bracketSchema)
  .min(1)
  .refine(
    (bs) =>
      bs.every((b, i) => {
        const isLast = i === bs.length - 1;
        if (isLast) return b.upper === null || b.upper > b.lower;
        if (b.upper === null || b.upper <= b.lower) return false;
        const prev = bs[i - 1];
        return i === 0 || (prev.lower <= b.lower && prev.rate <= b.rate);
      }),
    { message: 'brackets must be ordered, progressive, and only the last unbounded' },
  );

const stateConfigSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({ type: z.literal('flat'), rate, standard_deduction: money }),
  z.object({
    type: z.literal('progressive'),
    brackets: bracketsSchema,
    standard_deduction: money,
  }),
]);

export const taxConfigSchema = z
  .object({
    tax_year: z.number().int().min(2020).max(2100),
    last_updated: z.string(),
    source_urls: z.array(z.string()),
    se: z.object({
      // Plausible range as a sanity bound (ref 2025: 176,100).
      social_security_wage_base: z.number().min(50_000).max(1_000_000),
      social_security_rate: rate,
      medicare_rate: rate,
      additional_medicare_rate: rate,
      additional_medicare_threshold: filingStatusRecord(money),
      nese_factor: z.number().min(0.5).max(1),
    }),
    federal: z.object({
      standard_deduction: filingStatusRecord(money),
      brackets: filingStatusRecord(bracketsSchema),
      qbi_threshold: filingStatusRecord(money),
      qbi_rate: rate,
    }),
    quarterly_deadlines: z.array(z.string()).length(4),
    states: z.record(z.string(), stateConfigSchema),
  })
  .superRefine((cfg, ctx) => {
    // Q1–Q3 fall in the tax year; Q4 falls in January of the next year.
    const expectedYears = [cfg.tax_year, cfg.tax_year, cfg.tax_year, cfg.tax_year + 1];
    cfg.quarterly_deadlines.forEach((d, i) => {
      const year = Number(d.slice(0, 4));
      const valid = /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
      if (!valid) {
        ctx.addIssue({
          code: 'custom',
          path: ['quarterly_deadlines', i],
          message: `invalid ISO date: ${d}`,
        });
      } else if (year !== expectedYears[i]) {
        ctx.addIssue({
          code: 'custom',
          path: ['quarterly_deadlines', i],
          message: `deadline ${i + 1} should be in ${expectedYears[i]}, got ${year}`,
        });
      }
    });
  });

export type ValidatedTaxConfig = z.infer<typeof taxConfigSchema>;

export type ValidationResult = { ok: true; config: TaxConfig } | { ok: false; errors: string[] };

/** Validate unknown data as a TaxConfig. Never throws. */
export function validateTaxConfig(data: unknown): ValidationResult {
  const result = taxConfigSchema.safeParse(data);
  if (result.success) {
    return { ok: true, config: result.data as TaxConfig };
  }
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
  };
}
