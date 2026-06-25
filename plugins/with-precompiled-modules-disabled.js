const { withPodfileProperties } = require('@expo/config-plugins');

/**
 * Forces `EXPO_USE_PRECOMPILED_MODULES=false` into ios/Podfile.properties.json so
 * Expo modules build from source against the local Xcode/Swift toolchain instead
 * of Expo's prebuilt XCFrameworks.
 *
 * The prebuilt binaries are compiled with an older Swift and break on Xcode 26.5
 * with `missing required module 'SwiftShims'` / `precompiled file ... is broken`.
 * Building from source avoids that mismatch. Applied as a config plugin so the
 * setting survives `expo prebuild`, which otherwise regenerates the properties
 * file and reverts to the precompiled (default) path.
 */
module.exports = function withPrecompiledModulesDisabled(config) {
  return withPodfileProperties(config, (cfg) => {
    cfg.modResults['EXPO_USE_PRECOMPILED_MODULES'] = 'false';
    return cfg;
  });
};
