import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';

import { env } from '@/config/env';
import { supabase } from '@/services/supabase';

let googleConfigured = false;
function ensureGoogleConfigured() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: env.googleWebClientId,
    iosClientId: env.googleIosClientId,
  });
  googleConfigured = true;
}

/** Native Sign in with Apple → Supabase session (signInWithIdToken). */
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

/** Native Google Sign-In → Supabase session (signInWithIdToken). */
export async function signInWithGoogle(): Promise<void> {
  ensureGoogleConfigured();
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) return; // user cancelled the sheet
  const idToken = response.data.idToken;
  if (!idToken) throw new Error('No Google idToken returned');
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw error;
}

/** True when the error is just the user dismissing the sign-in sheet. */
export function isCancel(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === 'ERR_REQUEST_CANCELED' || code === 'SIGN_IN_CANCELLED';
}
