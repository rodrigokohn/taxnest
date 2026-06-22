// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'ios/*', 'android/*', '.expo/*'],
  },
  {
    rules: {
      // Experimental React Compiler rules that misfire on this codebase:
      // Reanimated shared values are mutated via `.value` by design, and a few
      // effects intentionally set state on mount (data load / web hydration).
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
