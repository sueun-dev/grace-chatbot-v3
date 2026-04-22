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

jest.mock('@/utils/db', () => ({
  hasRecordedActivity: jest.fn(),
}))

import { POST } from '@/app/api/completion-code/route'
import { hasRecordedActivity } from '@/utils/db'

const makeRequest = (body) => ({
  text: async () => (body === undefined ? '' : JSON.stringify(body)),
})

describe('/api/completion-code', () => {
  beforeEach(() => {
    hasRecordedActivity.mockReset()
  })

  test('returns a 6-character alphanumeric code for a session with activity', async () => {
    hasRecordedActivity.mockReturnValue(true)
    const response = await POST(makeRequest({ sessionId: 's1' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.code).toBeDefined()
    expect(data.code).toHaveLength(6)
    expect(data.code).toMatch(/^[A-Z0-9]{6}$/)
  })

  test('generates unique codes across calls', async () => {
    hasRecordedActivity.mockReturnValue(true)
    const codes = new Set()
    for (let i = 0; i < 20; i++) {
      const response = await POST(makeRequest({ sessionId: `s${i}` }))
      const data = await response.json()
      codes.add(data.code)
    }
    // With 36^6 = ~2.2 billion possible codes, 20 should all be unique
    expect(codes.size).toBe(20)
  })

  test('uses only uppercase letters and digits', async () => {
    hasRecordedActivity.mockReturnValue(true)
    const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    for (let i = 0; i < 10; i++) {
      const response = await POST(makeRequest({ sessionId: 's1' }))
      const data = await response.json()
      for (const char of data.code) {
        expect(validChars).toContain(char)
      }
    }
  })

  test('accepts userIdentifier when sessionId is not provided', async () => {
    hasRecordedActivity.mockReturnValue(true)
    const response = await POST(makeRequest({ userIdentifier: 'USER123' }))
    expect(response.status).toBe(200)
    expect(hasRecordedActivity).toHaveBeenCalledWith({
      sessionId: '',
      userIdentifier: 'USER123',
    })
  })

  test('rejects requests without sessionId or userIdentifier', async () => {
    const response = await POST(makeRequest({}))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/sessionId or userIdentifier/i)
    expect(hasRecordedActivity).not.toHaveBeenCalled()
  })

  test('rejects empty body', async () => {
    const response = await POST(makeRequest(undefined))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/sessionId or userIdentifier/i)
  })

  test('rejects malformed JSON', async () => {
    const response = await POST({ text: async () => 'not json' })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/invalid json/i)
  })

  test('returns 403 when session has no recorded activity', async () => {
    hasRecordedActivity.mockReturnValue(false)
    const response = await POST(makeRequest({ sessionId: 'unknown' }))
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toMatch(/no training activity/i)
  })

  test('ignores non-string identifiers (type confusion guard)', async () => {
    const response = await POST(
      makeRequest({ sessionId: [1, 2, 3], userIdentifier: { foo: 'bar' } })
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toMatch(/sessionId or userIdentifier/i)
    expect(hasRecordedActivity).not.toHaveBeenCalled()
  })

  test('rejects oversized body', async () => {
    const big = 'x'.repeat(5000)
    const response = await POST({ text: async () => big })
    const data = await response.json()

    expect(response.status).toBe(413)
    expect(data.error).toMatch(/too large/i)
  })
})
