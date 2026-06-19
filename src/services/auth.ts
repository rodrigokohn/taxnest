import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { supabase } from '@/services/supabase';

WebBrowser.maybeCompleteAuthSession();

/** Native Sign in with Apple → Supabase session (signInWithIdToken, no nonce). */
export async function signInWithApple(): Promise<void> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) throw new Error('No Apple identity token returned');
  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;
}

/**
 * Google sign-in via Supabase OAuth (PKCE) + an in-app browser session. We use
 * the web flow instead of the native id_token flow because the native Google
 * SDK bakes a nonce into its id_token that Supabase can't validate without the
 * raw value (which the SDK doesn't expose).
 */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data?.url) throw new Error('No OAuth URL returned');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) return; // user dismissed the sheet

  const params = new URL(result.url).searchParams;
  const code = params.get('code');
  if (!code) throw new Error(params.get('error_description') ?? 'Sign-in was not completed');

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

/** True when the error is just the user dismissing the sign-in sheet. */
export function isCancel(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === 'ERR_REQUEST_CANCELED' || code === 'SIGN_IN_CANCELLED';
}
