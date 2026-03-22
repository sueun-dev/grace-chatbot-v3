/**
 * Tests for shared download auth & CSV sanitization utilities
 */

import { sanitizeCsvValue, escapeCsvValue, buildCsvContent } from '@/utils/downloadAuth'

describe('downloadAuth utilities', () => {
  describe('sanitizeCsvValue', () => {
    test('returns empty string for null/undefined', () => {
      expect(sanitizeCsvValue(null)).toBe('')
      expect(sanitizeCsvValue(undefined)).toBe('')
    })

    test('passes through safe values', () => {
      expect(sanitizeCsvValue('hello')).toBe('hello')
      expect(sanitizeCsvValue('123')).toBe('123')
    })

    test('prefixes formula-like values with single quote', () => {
      expect(sanitizeCsvValue('=SUM(A1)')).toBe("'=SUM(A1)")
      expect(sanitizeCsvValue('+cmd')).toBe("'+cmd")
      expect(sanitizeCsvValue('-cmd')).toBe("'-cmd")
      expect(sanitizeCsvValue('@import')).toBe("'@import")
    })
  })

  describe('escapeCsvValue', () => {
    test('wraps values with commas in quotes', () => {
      expect(escapeCsvValue('hello, world')).toBe('"hello, world"')
    })

    test('escapes internal quotes', () => {
      expect(escapeCsvValue('say "hi"')).toBe('"say ""hi"""')
    })

    test('wraps values with newlines', () => {
      expect(escapeCsvValue('line1\nline2')).toBe('"line1\nline2"')
    })

    test('sanitizes and escapes formula values', () => {
      const result = escapeCsvValue('=2+3')
      expect(result).toContain("'=2+3")
    })
  })

  describe('buildCsvContent', () => {
    test('builds CSV with headers and records', () => {
      const headers = ['name', 'score']
      const records = [
        { name: 'Alice', score: '95' },
        { name: 'Bob', score: '87' },
      ]

      const csv = buildCsvContent(headers, records)
      const lines = csv.trim().split('\n')

      expect(lines).toHaveLength(3)
      expect(lines[0]).toBe('name,score')
      expect(lines[1]).toBe('Alice,95')
      expect(lines[2]).toBe('Bob,87')
    })

    test('handles missing fields with empty string', () => {
      const headers = ['name', 'score', 'grade']
      const records = [{ name: 'Alice', score: '95' }]

      const csv = buildCsvContent(headers, records)
      expect(csv).toContain('Alice,95,')
    })

    test('sanitizes formula values in records', () => {
      const headers = ['name', 'formula']
      const records = [{ name: 'Test', formula: '=EVIL()' }]

      const csv = buildCsvContent(headers, records)
      expect(csv).toContain("'=EVIL()")
      expect(csv).not.toContain(',=EVIL()')
    })
  })
})
