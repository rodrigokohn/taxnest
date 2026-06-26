import * as AppleAuthentication from 'expo-apple-authentication';

import { supabase } from '@/services/supabase';

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

/** True when the error is just the user dismissing the Apple sign-in sheet. */
export function isCancel(err: unknown): boolean {
  return (err as { code?: string })?.code === 'ERR_REQUEST_CANCELED';
}
