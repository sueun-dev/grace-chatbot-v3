/**
 * Tests for /api/completion-code route
 */

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body, init = {}) => ({
      status: init.status || 200,
      json: async () => body,
    }),
  },
}))

import { POST } from '@/app/api/completion-code/route'

describe('/api/completion-code', () => {
  test('returns a 6-character alphanumeric code', async () => {
    const response = await POST()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.code).toBeDefined()
    expect(data.code).toHaveLength(6)
    expect(data.code).toMatch(/^[A-Z0-9]{6}$/)
  })

  test('generates unique codes across calls', async () => {
    const codes = new Set()
    for (let i = 0; i < 20; i++) {
      const response = await POST()
      const data = await response.json()
      codes.add(data.code)
    }
    // With 36^6 = ~2.2 billion possible codes, 20 should all be unique
    expect(codes.size).toBe(20)
  })

  test('uses only uppercase letters and digits', async () => {
    const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    for (let i = 0; i < 10; i++) {
      const response = await POST()
      const data = await response.json()
      for (const char of data.code) {
        expect(validChars).toContain(char)
      }
    }
  })
})
