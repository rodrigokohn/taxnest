import { supabase } from '@/services/supabase';

/** Anonymized numeric snapshot sent as context to the Q&A (PRD §9.2). No identity. */
export type AskContext = {
  projected_income: number;
  state: string;
  filing_status: string;
  total_set_aside: number;
};

/** Ask a freelance tax question (Pro). Calls the server-side ai-ask Edge Function. */
export async function askTaxQuestion(
  question: string,
  context: AskContext,
  userKey: string,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-ask', {
    body: { question, context, user_key: userKey },
  });
  if (error) throw error;
  const payload = data as { answer?: string; error?: string };
  if (payload.error) throw new Error(payload.error);
  return payload.answer ?? '';
}
