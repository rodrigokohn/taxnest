// POST /ai/refresh-config — annual TaxConfig refresh job (PRD §9.1).
// Uses OpenAI + the web search tool (restricted to irs.gov) to EXTRACT the
// year's federal/SE parameters as strict JSON, then runs the result through the
// deterministic validation gate. The AI proposes; a HUMAN disposes: the result
// is written to `tax_config_drafts` (NOT the live table) and the developer is
// emailed a one-tap approval link. State rules are curated separately, so we
// carry over the latest live `states` block unchanged.
import OpenAI from 'npm:openai@^4';
import { createClient } from 'npm:@supabase/supabase-js@^2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { validateTaxConfig } from '../_shared/tax-config-schema.ts';

const MODEL = 'gpt-5.5';

const SYSTEM_PROMPT = `You are a tax data extraction tool. Search ONLY official IRS sources
(domain irs.gov) for United States federal tax parameters. Return ONLY a single valid JSON
object — no prose, no markdown fences. For every value, the source must be an irs.gov URL,
listed in source_urls. If you cannot confirm a value from irs.gov, set it to null — never guess.`;

function userPrompt(year: number): string {
  return `Find these values for tax year ${year} and return them as JSON in EXACTLY this shape
(top tax bracket uses "upper": null):

{
  "se": {
    "social_security_wage_base": number,
    "social_security_rate": 0.124,
    "medicare_rate": 0.029,
    "additional_medicare_rate": 0.009,
    "additional_medicare_threshold": { "single": number, "married_joint": number, "married_separate": number, "head_of_household": number },
    "nese_factor": 0.9235
  },
  "federal": {
    "standard_deduction": { "single": number, "married_joint": number, "married_separate": number, "head_of_household": number },
    "brackets": {
      "single": [{ "lower": number, "upper": number|null, "rate": number }],
      "married_joint": [...], "married_separate": [...], "head_of_household": [...]
    },
    "qbi_threshold": { "single": number, "married_joint": number, "married_separate": number, "head_of_household": number },
    "qbi_rate": 0.20
  },
  "quarterly_deadlines": ["YYYY-MM-DD", "YYYY-MM-DD", "YYYY-MM-DD", "YYYY-MM-DD"],
  "source_urls": ["https://www.irs.gov/..."]
}`;
}

function extractJson(text: string): Record<string, unknown> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON object in model output');
  return JSON.parse(raw.slice(start, end + 1));
}

type DiffEntry = { field: string; from: unknown; to: unknown };

// Field-level diff of the parts the AI actually proposes (se / federal /
// deadlines). States are carried over unchanged, so we skip them.
function deepDiff(a: unknown, b: unknown, path: string, out: DiffEntry[]): void {
  const isObj = (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v);
  if (isObj(a) && isObj(b)) {
    const keys = new Set([...Object.keys(a as object), ...Object.keys(b as object)]);
    for (const k of keys) {
      deepDiff(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
        path ? `${path}.${k}` : k,
        out,
      );
    }
    return;
  }
  if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ field: path, from: a, to: b });
}

function summarizeDiff(live: Record<string, unknown> | null, candidate: Record<string, unknown>) {
  if (!live) return [{ field: '(all)', from: null, to: 'first config for this year' }];
  const out: DiffEntry[] = [];
  for (const key of ['se', 'federal', 'quarterly_deadlines']) {
    deepDiff(live[key], candidate[key], key, out);
  }
  return out;
}

function diffRows(diff: DiffEntry[]): string {
  if (diff.length === 0) return '<tr><td colspan="3"><em>No changes vs the live config.</em></td></tr>';
  return diff
    .map(
      (d) =>
        `<tr><td style="font-family:monospace">${d.field}</td>` +
        `<td>${JSON.stringify(d.from)}</td><td><b>${JSON.stringify(d.to)}</b></td></tr>`,
    )
    .join('');
}

async function sendApprovalEmail(args: {
  year: number;
  approveUrl: string;
  diff: DiffEntry[];
  sourceUrls: string[];
}): Promise<'sent' | 'skipped' | 'error'> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const to = Deno.env.get('REFRESH_NOTIFY_EMAIL');
  const from = Deno.env.get('RESEND_FROM') ?? 'Taxnest <onboarding@resend.dev>';
  if (!apiKey || !to) return 'skipped';

  const html = `
    <h2>Taxnest — review the ${args.year} tax config</h2>
    <p>The annual refresh fetched the ${args.year} federal/SE parameters from irs.gov.
    Nothing is live yet. Review the changes below, then approve.</p>
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">
      <tr><th>Field</th><th>Current</th><th>Proposed</th></tr>
      ${diffRows(args.diff)}
    </table>
    <p>Sources: ${args.sourceUrls.map((u) => `<a href="${u}">${u}</a>`).join(', ') || '—'}</p>
    <p style="margin:24px 0">
      <a href="${args.approveUrl}"
         style="background:#D85A30;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">
         ✓ Approve &amp; make ${args.year} live
      </a>
    </p>
    <p style="color:#888;font-size:12px">Reminder: state brackets are carried over from the prior
    year and reviewed separately. Confirm the federal numbers above match the IRS release.</p>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `Taxnest: approve the ${args.year} tax config`, html }),
    });
    return res.ok ? 'sent' : 'error';
  } catch (err) {
    console.error('resend send failed', err);
    return 'error';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const auth = req.headers.get('authorization') ?? '';
  if (!serviceKey || auth !== `Bearer ${serviceKey}`) {
    return jsonResponse({ error: 'admin only' }, 401);
  }

  const body = await req.json().catch(() => ({}));
  // Default to NEXT year: the job runs late in the year to stage the upcoming one.
  const year: number = body.year ?? new Date().getFullYear() + 1;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const admin = createClient(supabaseUrl, serviceKey);

  // Latest live config at or before the target year — its states are carried
  // over, and it's what we diff the proposal against.
  const { data: live } = await admin
    .from('tax_configs')
    .select('config')
    .lte('tax_year', year)
    .order('tax_year', { ascending: false })
    .limit(1)
    .maybeSingle();
  const liveConfig = (live?.config as Record<string, unknown> | null) ?? null;
  const carriedStates =
    (liveConfig as { states?: Record<string, unknown> } | null)?.states ?? {};

  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') ?? '' });

  try {
    const response = await openai.responses.create({
      model: MODEL,
      instructions: SYSTEM_PROMPT,
      input: userPrompt(year),
      tools: [{ type: 'web_search', filters: { allowed_domains: ['irs.gov', 'www.irs.gov'] } }],
      max_output_tokens: 4000,
    });

    const extracted = extractJson(response.output_text ?? '');

    const candidate = {
      tax_year: year,
      last_updated: new Date().toISOString(),
      source_urls: extracted.source_urls ?? [],
      se: extracted.se,
      federal: extracted.federal,
      quarterly_deadlines: extracted.quarterly_deadlines,
      states: carriedStates, // curated separately — carry over the latest live set
    };

    const result = validateTaxConfig(candidate);
    if (!result.ok) {
      // Validation failed — do NOT stage anything (PRD §9.1). The live config stays.
      console.error('refresh-config validation failed', result.errors);
      return jsonResponse({ ok: false, errors: result.errors }, 422);
    }

    const diff = summarizeDiff(liveConfig, result.config as unknown as Record<string, unknown>);
    const sourceUrls = (candidate.source_urls as string[]) ?? [];

    // Stage the proposal with a fresh single-use token; reset to pending if re-run.
    const token = crypto.randomUUID();
    const { error: draftErr } = await admin.from('tax_config_drafts').upsert(
      {
        tax_year: year,
        config: result.config,
        diff,
        source_urls: sourceUrls,
        approval_token: token,
        status: 'pending',
        created_at: new Date().toISOString(),
        reviewed_at: null,
      },
      { onConflict: 'tax_year' },
    );
    if (draftErr) throw draftErr;

    const approveUrl =
      `${supabaseUrl}/functions/v1/approve-tax-config?year=${year}&token=${token}`;
    const email = await sendApprovalEmail({ year, approveUrl, diff, sourceUrls });

    // approveUrl is returned so the link is recoverable from logs even if email is off.
    return jsonResponse({
      ok: true,
      staged: true,
      tax_year: year,
      changes: diff.length,
      email,
      approveUrl,
    });
  } catch (err) {
    console.error('ai-refresh-config error', err);
    return jsonResponse({ ok: false, error: String(err) }, 500);
  }
});
