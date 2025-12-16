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
    'app/**/*.{js,jsx}',
    'utils/**/*.{js,jsx}',
    '!app/api/**',
    '!utils/csvLogger.js',
    '!app/**/*.test.{js,jsx}',
    '!app/layout.jsx',
    '!app/globals.css',
  ],
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/integration/',
    '<rootDir>/tests/load/',
    '<rootDir>/tests/db/',
    '<rootDir>/tests/unit/csvLogger.test.js',
  ],
}

module.exports = createJestConfig(customJestConfig)
