import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { AnimatedEntrance } from '@/components/animated-entrance';
import { GoogleSignInButton } from '@/components/google-signin-button';
import { IconSymbol, type IconSymbolName } from '@/components/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { Radius, ScreenPadding, Spacing, useTheme } from '@/design';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { isCancel, signInWithApple, signInWithGoogle } from '@/services/auth';

const VALUE_PROPS: { icon: IconSymbolName; text: string }[] = [
  { icon: 'chart.bar.fill', text: 'Know what to set aside on every payment' },
  { icon: 'building.columns.fill', text: 'Federal + state estimates' },
  { icon: 'bell.fill', text: 'Quarterly reminders so nothing slips' },
];

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
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <GlowBg color={theme.primary} />
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <View style={styles.hero}>
          <AnimatedEntrance index={0}>
            <GlowIcon icon="leaf.fill" />
          </AnimatedEntrance>
          <AnimatedEntrance index={1}>
            <ThemedText variant="screenTitle" style={styles.title}>
              Never get surprised by taxes again.
            </ThemedText>
          </AnimatedEntrance>
          <AnimatedEntrance index={2}>
            <ThemedText variant="body" color="textSecondary" style={styles.subtitle}>
              Track how much to set aside from every payment you receive.
            </ThemedText>
          </AnimatedEntrance>

          <AnimatedEntrance index={3} style={styles.valueList}>
            {VALUE_PROPS.map((v) => (
              <View key={v.text} style={styles.valueRow}>
                <View style={[styles.valueIcon, { backgroundColor: theme.primaryTint }]}>
                  <IconSymbol name={v.icon} color={theme.primary} size={15} />
                </View>
                <ThemedText variant="secondary" color="textSecondary" style={styles.valueText}>
                  {v.text}
                </ThemedText>
              </View>
            ))}
          </AnimatedEntrance>
        </View>

        <AnimatedEntrance index={4}>
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

            <ThemedText variant="caption" color="textTertiary" style={styles.disclaimer}>
              Estimates for planning purposes only — not tax advice.
            </ThemedText>
          </View>
        </AnimatedEntrance>
      </SafeAreaView>
    </View>
  );
}

function GlowBg({ color }: { color: string }) {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="signInGlow" cx="50%" cy="22%" r="75%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#signInGlow)" />
    </Svg>
  );
}

function GlowIcon({ icon }: { icon: IconSymbolName }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.glowIcon, { backgroundColor: theme.primaryTint, shadowColor: theme.primary }]}>
      <IconSymbol name={icon} color={theme.primary} size={40} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: ScreenPadding },
  hero: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  glowIcon: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  title: { textAlign: 'center', fontSize: 26, lineHeight: 32 },
  subtitle: { textAlign: 'center', maxWidth: 300 },
  valueList: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.sm,
  },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  valueIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: { flex: 1 },
  buttons: { gap: Spacing.md, alignItems: 'center' },
  appleButton: { height: 52, width: '100%' },
  disclaimer: { textAlign: 'center', paddingTop: Spacing.sm },
});
