import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { GoogleSignInButton } from '@/components/google-signin-button';
import { IconSymbol } from '@/components/icon-symbol';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, useTheme } from '@/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isCancel, signInWithApple, signInWithGoogle } from '@/services/auth';

/** Sign in (Google + Apple). The root gate routes onward once a session exists. */
export default function SignInScreen() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);

  async function run(provider: 'apple' | 'google', fn: () => Promise<void>) {
    setBusy(provider);
    try {
      await fn();
    } catch (err) {
      if (!isCancel(err)) {
        const message = (err as { message?: string })?.message ?? String(err);
        console.warn('[sign-in]', provider, message);
        Alert.alert("Couldn't sign you in", 'Please try again.');
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.hero}>
        <IconSymbol name="leaf.fill" color={theme.primary} size={44} />
        <ThemedText variant="screenTitle" style={styles.title}>
          Never get surprised by taxes again.
        </ThemedText>
        <ThemedText variant="body" color="textSecondary" style={styles.center}>
          Sign in to start tracking how much to set aside from every payment.
        </ThemedText>
      </View>

      <View style={styles.buttons} pointerEvents={busy ? 'none' : 'auto'}>
        {Platform.OS === 'ios' && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={
              scheme === 'dark'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={Radius.lg}
            style={styles.appleButton}
            onPress={() => run('apple', signInWithApple)}
          />
        )}

        <GoogleSignInButton
          onPress={() => run('google', signInWithGoogle)}
          disabled={busy !== null}
        />
      </View>

      <ThemedText variant="caption" color="textTertiary" style={styles.disclaimer}>
        Estimates for planning purposes only — not tax advice.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  title: { textAlign: 'center', fontSize: 26, lineHeight: 32 },
  center: { textAlign: 'center', maxWidth: 300 },
  buttons: { gap: Spacing.md, alignItems: 'center' },
  appleButton: { height: 52, width: '100%' },
  disclaimer: { textAlign: 'center', paddingVertical: Spacing.lg },
});
