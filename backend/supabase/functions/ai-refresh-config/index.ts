// POST /ai/refresh-config — annual TaxConfig refresh job (PRD §9.1).
// Uses Claude + the web search tool (restricted to irs.gov) to EXTRACT the
// year's federal/SE parameters as strict JSON, then runs the result through the
// deterministic validation gate before writing. The AI proposes; code disposes.
// State rules are curated separately, so we preserve the existing `states` block.
import Anthropic from 'npm:@anthropic-ai/sdk@^0.70';
import { createClient } from 'npm:@supabase/supabase-js@^2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { validateTaxConfig } from '../_shared/tax-config-schema.ts';

const MODEL = 'claude-sonnet-4-6';

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

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON object in model output');
  return JSON.parse(raw.slice(start, end + 1));
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
  const year: number = body.year ?? new Date().getFullYear();

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceKey);
  const { data: existing } = await admin
    .from('tax_configs')
    .select('config')
    .eq('tax_year', year)
    .maybeSingle();
  const existingStates = (existing?.config as { states?: Record<string, unknown> } | null)?.states ?? {};

  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' });

  try {
    // Run the model with the web search tool; continue across pause_turn.
    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: userPrompt(year) },
    ];
    let response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: 'web_search_20260209',
          name: 'web_search',
          allowed_domains: ['irs.gov', 'www.irs.gov'],
          max_uses: 8,
        },
      ],
      messages,
    });
    for (let i = 0; i < 5 && response.stop_reason === 'pause_turn'; i++) {
      messages.push({ role: 'assistant', content: response.content });
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        system: SYSTEM_PROMPT,
        tools: [
          { type: 'web_search_20260209', name: 'web_search', allowed_domains: ['irs.gov', 'www.irs.gov'], max_uses: 8 },
        ],
        messages,
      });
    }

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    const extracted = extractJson(text) as Record<string, unknown>;

    const candidate = {
      tax_year: year,
      last_updated: new Date().toISOString(),
      source_urls: extracted.source_urls ?? [],
      se: extracted.se,
      federal: extracted.federal,
      quarterly_deadlines: extracted.quarterly_deadlines,
      states: existingStates, // curated separately — preserve
    };

    const result = validateTaxConfig(candidate);
    if (!result.ok) {
      // Validation failed — do NOT overwrite the live config (PRD §9.1).
      console.error('refresh-config validation failed', result.errors);
      return jsonResponse({ ok: false, errors: result.errors }, 422);
    }

    await admin.from('tax_configs').upsert(
      {
        tax_year: year,
        config: result.config,
        last_updated: candidate.last_updated,
        source_urls: candidate.source_urls,
      },
      { onConflict: 'tax_year' },
    );

    return jsonResponse({ ok: true, tax_year: year, source_urls: candidate.source_urls });
  } catch (err) {
    console.error('ai-refresh-config error', err);
    return jsonResponse({ ok: false, error: String(err) }, 500);
  }
});
