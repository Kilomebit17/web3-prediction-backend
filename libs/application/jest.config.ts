import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: './tsconfig.spec.json' }] },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.spec.ts', '!**/index.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@pred/domain$': '<rootDir>/../../domain/src/index.ts',
    '^@pred/domain/(.*)$': '<rootDir>/../../domain/src/$1',
    '^@pred/shared$': '<rootDir>/../../shared/src/index.ts',
    '^@pred/shared/(.*)$': '<rootDir>/../../shared/src/$1',
  },
};

export default config;
