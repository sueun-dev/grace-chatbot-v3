const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverage: true,
  collectCoverageFrom: [
    'utils/csvLogger.js',
  ],
  testMatch: [
    '<rootDir>/tests/unit/csvLogger.test.js',
    '<rootDir>/tests/db/**/*.test.{js,jsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/frontend/',
    '<rootDir>/tests/integration/',
    '<rootDir>/tests/load/',
  ],
}

module.exports = createJestConfig(customJestConfig)

