// Full app surface for tax config. NOTE: the TaxEngine must import
// `@/tax-config/types` directly (not this barrel) to stay pure — `client` pulls
// in the SQLite-backed cache repository.
export * from '@/tax-config/types';
export * from '@/tax-config/schema';
export { SEED_TAX_CONFIG_2025 } from '@/tax-config/seed-2025';
export * from '@/tax-config/client';
