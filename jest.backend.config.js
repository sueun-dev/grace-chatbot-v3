const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'app/api/**/*.{js,jsx}',
    'utils/**/*.{js,jsx}',
    '!utils/clientLogger.js',
    '!app/**/*.test.{js,jsx}',
  ],
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.{js,jsx}',
    '<rootDir>/tests/unit/csvLogger.test.js',
    '<rootDir>/tests/load/**/*.test.{js,jsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/frontend/',
  ],
}

module.exports = createJestConfig(customJestConfig)

