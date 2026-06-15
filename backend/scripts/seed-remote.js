/**
 * Upserts the 2025 seed TaxConfig into the remote `tax_configs` table via
 * PostgREST, then verifies it is readable with the anon key.
 *
 * Reads credentials from the environment (no secrets stored in this file):
 *   SUPABASE_URL, SERVICE_ROLE, ANON
 * Usage:
 *   SUPABASE_URL=... SERVICE_ROLE=... ANON=... node backend/scripts/seed-remote.js
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const root = path.resolve(__dirname, '..', '..');
const src = fs.readFileSync(path.join(root, 'src', 'tax-config', 'seed-2025.ts'), 'utf8');
const { code } = babel.transformSync(src, {
  filename: 'seed-2025.ts',
  presets: [['@babel/preset-env', { targets: { node: 'current' } }], '@babel/preset-typescript'],
});
const mod = { exports: {} };
new Function('module', 'exports', 'require', code)(mod, mod.exports, require);
const seed = mod.exports.SEED_TAX_CONFIG_2025;

const { SUPABASE_URL, SERVICE_ROLE, ANON } = process.env;
const row = {
  tax_year: seed.tax_year,
  config: seed,
  last_updated: seed.last_updated,
  source_urls: seed.source_urls,
};

(async () => {
  const post = await fetch(`${SUPABASE_URL}/rest/v1/tax_configs`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
  console.log('seed upsert →', post.status, (await post.text()) || '(ok)');

  const read = await fetch(`${SUPABASE_URL}/rest/v1/tax_configs?select=tax_year,last_updated`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  });
  console.log('anon read  →', read.status, await read.text());
})().catch((e) => console.log('error:', e.message));
