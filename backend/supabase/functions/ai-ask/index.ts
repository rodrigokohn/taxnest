// POST /ai/ask — freelance tax Q&A (Pro, PRD §9.2).
// The app computes its numbers locally and sends an ANONYMIZED snapshot as
// context; this function only explains in natural language. It never produces
// the numbers it talks about.
import Anthropic from 'npm:@anthropic-ai/sdk@^0.70';
import { createClient } from 'npm:@supabase/supabase-js@^2';

import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

const MODEL = 'claude-sonnet-4-6'; // PRD §9; bump to claude-opus-4-8 for more depth
const DAILY_LIMIT = 40;

const SYSTEM_PROMPT = `You are a helpful assistant inside FreelanceTax, an app for US freelancers.
Answer general questions about US self-employment taxes (Schedule C / SE tax, estimated
quarterly taxes, deductions, QBI, safe harbor, filing status) clearly and concisely.

Rules:
- Use the user's anonymized context to make the answer relevant, but never ask for or
  reference personal identity.
- ALWAYS end with: "This is general information, not tax advice."
- If a question depends on specifics you can't know, say so briefly and suggest consulting
  a CPA. Do not invent numbers or guarantee outcomes.
- Keep answers short and plain — no jargon without a one-line gloss.`;

type AskContext = {
  projected_income?: number;
  state?: string;
  filing_status?: string;
  total_set_aside?: number;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  let body: { question?: string; context?: AskContext; user_key?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid JSON body' }, 400);
  }

  const question = (body.question ?? '').trim();
  if (!question) return jsonResponse({ error: 'question is required' }, 400);

  // Lightweight per-user daily rate limit (PRD §9.2). Keyed by an anonymized
  // user_key today; re-keyed to the Supabase auth user once auth lands.
  const userKey = body.user_key ?? 'anonymous';
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await admin
    .from('ai_ask_usage')
    .select('count')
    .eq('user_key', userKey)
    .eq('day', today)
    .maybeSingle();
  if ((usage?.count ?? 0) >= DAILY_LIMIT) {
    return jsonResponse({ error: 'Daily question limit reached. Try again tomorrow.' }, 429);
  }

  const context = body.context ?? {};
  const contextLines = [
    context.filing_status && `Filing status: ${context.filing_status}`,
    context.state && `State: ${context.state}`,
    context.projected_income != null && `Projected annual income: $${context.projected_income}`,
    context.total_set_aside != null && `Set aside so far this year: $${context.total_set_aside}`,
  ].filter(Boolean);

  const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') ?? '' });

  try {
    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content:
            (contextLines.length ? `My situation (anonymized):\n${contextLines.join('\n')}\n\n` : '') +
            `Question: ${question}`,
        },
      ],
    });

    const answer = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();

    await admin.from('ai_ask_usage').upsert(
      { user_key: userKey, day: today, count: (usage?.count ?? 0) + 1 },
      { onConflict: 'user_key,day' },
    );

    return jsonResponse({ answer });
  } catch (err) {
    console.error('ai-ask error', err);
    return jsonResponse({ error: 'Could not reach the assistant — try again.' }, 502);
  }
});
