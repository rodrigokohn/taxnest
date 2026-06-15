// Deterministic validation gate for a TaxConfig (PRD §9.1), Deno/Edge version.
// Mirrors src/tax-config/schema.ts on the app side — the AI proposes data; this
// code disposes. A config that fails here is never written to the database.
import { z } from 'npm:zod@^4';

const rate = z.number().min(0).max(1);
const money = z.number().min(0);

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
  z.object({ type: z.literal('progressive'), brackets: bracketsSchema, standard_deduction: money }),
]);

export const taxConfigSchema = z
  .object({
    tax_year: z.number().int().min(2020).max(2100),
    last_updated: z.string(),
    source_urls: z.array(z.string()),
    se: z.object({
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
    const expectedYears = [cfg.tax_year, cfg.tax_year, cfg.tax_year, cfg.tax_year + 1];
    cfg.quarterly_deadlines.forEach((d, i) => {
      const valid = /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
      if (!valid) {
        ctx.addIssue({ code: 'custom', path: ['quarterly_deadlines', i], message: `invalid date: ${d}` });
      } else if (Number(d.slice(0, 4)) !== expectedYears[i]) {
        ctx.addIssue({
          code: 'custom',
          path: ['quarterly_deadlines', i],
          message: `deadline ${i + 1} should be in ${expectedYears[i]}`,
        });
      }
    });
  });

export type ValidationResult =
  | { ok: true; config: unknown }
  | { ok: false; errors: string[] };

export function validateTaxConfig(data: unknown): ValidationResult {
  const result = taxConfigSchema.safeParse(data);
  if (result.success) return { ok: true, config: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
  };
}
