const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Adds `use_modular_headers!` to the iOS Podfile. Required by
 * @react-native-google-signin/google-signin's transitive Google pods
 * (GoogleUtilities / RecaptchaInterop / AppCheckCore), which otherwise cannot be
 * integrated as static libraries (they don't define modules). Applied as a
 * config plugin so it survives `expo prebuild`.
 */
module.exports = function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');
      if (!contents.includes('use_modular_headers!')) {
        contents = contents.replace(/^(platform :ios.*)$/m, '$1\nuse_modular_headers!');
        fs.writeFileSync(podfilePath, contents);
      }
      return cfg;
    },
  ]);
};
