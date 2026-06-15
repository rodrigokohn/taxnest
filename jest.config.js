/**
 * Jest configuration.
 *
 * The "engine" project runs the deterministic TaxEngine and other pure-TS
 * modules in a plain Node environment with a hermetic Babel transform (no
 * React Native / Metro coupling) so the tax logic stays fast and portable.
 * Component tests (jest-expo) will be added as a second project in Phase 4.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  projects: [
    {
      displayName: 'engine',
      testEnvironment: 'node',
      roots: ['<rootDir>/src'],
      testMatch: ['**/__tests__/**/*.test.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
      transform: {
        '^.+\\.ts$': [
          'babel-jest',
          {
            configFile: false,
            babelrc: false,
            presets: [
              ['@babel/preset-env', { targets: { node: 'current' } }],
              '@babel/preset-typescript',
            ],
          },
        ],
      },
    },
  ],
};
