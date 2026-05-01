import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@pred/domain$': '<rootDir>/../../../libs/domain/src/index.ts',
    '^@pred/domain/(.*)$': '<rootDir>/../../../libs/domain/src/$1',
    '^@pred/application$': '<rootDir>/../../../libs/application/src/index.ts',
    '^@pred/application/(.*)$': '<rootDir>/../../../libs/application/src/$1',
    '^@pred/infrastructure$': '<rootDir>/../../../libs/infrastructure/src/index.ts',
    '^@pred/infrastructure/(.*)$': '<rootDir>/../../../libs/infrastructure/src/$1',
    '^@pred/shared$': '<rootDir>/../../../libs/shared/src/index.ts',
    '^@pred/shared/(.*)$': '<rootDir>/../../../libs/shared/src/$1',
  },
};

export default config;
