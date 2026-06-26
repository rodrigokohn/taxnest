import { type ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Taxnest',
  slug: 'freelancetax',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon-light.png',
  scheme: 'freelancetax',
  userInterfaceStyle: 'automatic',
  ios: {
    // iOS 18 light/dark app icons. Light is opaque (also the App Store marketing
    // icon); dark is transparent so the system composites it on a dark background.
    icon: {
      light: './assets/images/icon-light.png',
      dark: './assets/images/icon-dark.png',
    },
    supportsTablet: false,
    bundleIdentifier: 'com.rodrigokohn.freelancetax',
    buildNumber: '3',
    usesAppleSignIn: true,
    // The app only uses standard HTTPS/TLS (exempt) — declare it so the App Store
    // upload doesn't ask the export-compliance question on every build.
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#E1F5EE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0F6E56',
        android: { image: './assets/images/splash-icon.png', imageWidth: 76 },
      },
    ],
    'expo-sqlite',
    'expo-notifications',
    'expo-sharing',
    '@react-native-community/datetimepicker',
    'expo-apple-authentication',
    './plugins/with-modular-headers',
    './plugins/with-precompiled-modules-disabled',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
