// GET /approve-tax-config?year=YYYY&token=UUID — one-tap promotion of a staged
// TaxConfig draft to live (PRD §9.1). The link is emailed to the developer by
// ai-refresh-config; the token is a single-use secret (a magic link), so opening
// it is the human confirmation. We re-run the deterministic validation gate
// before promoting — defense in depth — then copy the draft into `tax_configs`
// (which clients read) and mark the draft approved.
import { createClient } from 'npm:@supabase/supabase-js@^2';

import { validateTaxConfig } from '../_shared/tax-config-schema.ts';

function page(title: string, body: string, status = 200): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title></head>
    <body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#F7F5F2;
      margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center">
      <div style="background:#fff;max-width:440px;padding:32px;border-radius:16px;
        box-shadow:0 8px 30px rgba(0,0,0,.08);text-align:center">
        <h1 style="font-size:20px;margin:0 0 8px">${title}</h1>
        <p style="color:#555;line-height:1.5;margin:0">${body}</p>
      </div></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const year = Number(url.searchParams.get('year'));
  const token = url.searchParams.get('token') ?? '';

  if (!Number.isInteger(year) || !token) {
    return page('Invalid link', 'This approval link is missing its year or token.', 400);
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);

  const { data: draft, error } = await admin
    .from('tax_config_drafts')
    .select('config, approval_token, status')
    .eq('tax_year', year)
    .maybeSingle();

  if (error || !draft) {
    return page('Not found', `No staged config for ${year}.`, 404);
  }
  if (draft.approval_token !== token) {
    // Wrong/old token — likely a re-run replaced it. Don't reveal which.
    return page('Link expired', 'This approval link is no longer valid. Run the refresh again to get a fresh one.', 410);
  }
  if (draft.status !== 'pending') {
    // Only a pending draft can be promoted. A reviewed (approved/rejected) draft
    // stays closed, so a stale email link can't resurrect a rejected proposal.
    return draft.status === 'approved'
      ? page('Already live', `The ${year} tax config was already approved and is live. ✓`)
      : page('Draft closed', `This ${year} draft was reviewed and is no longer open for approval.`, 409);
  }

  // Defense in depth: never promote a config that doesn't pass the gate.
  const result = validateTaxConfig(draft.config);
  if (!result.ok) {
    return page('Validation failed', `The staged ${year} config no longer passes validation — not promoted.`, 422);
  }

  const { error: upErr } = await admin.from('tax_configs').upsert(
    {
      tax_year: year,
      config: result.config,
      last_updated: new Date().toISOString(),
      source_urls: (result.config as { source_urls?: string[] }).source_urls ?? [],
    },
    { onConflict: 'tax_year' },
  );
  if (upErr) {
    return page('Error', `Could not write the live config: ${String(upErr.message ?? upErr)}`, 500);
  }

  await admin
    .from('tax_config_drafts')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('tax_year', year);

  return page(
    `${year} tax config is live ✓`,
    `Clients will pick up the ${year} rates automatically. You can close this tab.`,
  );
});
