jest.mock('next/server', () => ({
  NextResponse: {
    json: (body, init = {}) => ({
      status: init.status || 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/utils/csvLogger', () => ({
  logUserAction: jest.fn(),
}))

import { logUserAction } from '@/utils/csvLogger'
import { POST } from '@/app/api/log-action/route'

const createRequest = (rawBody) => ({
  url: 'http://localhost:3001/api/log-action',
  headers: {
    get: () => null,
  },
  text: async () => rawBody,
})

describe('/api/log-action validation', () => {
  beforeEach(() => {
    logUserAction.mockReset()
  })

  test('returns 413 when body exceeds limit', async () => {
    const big = 'x'.repeat(82 * 1024)
    const raw = JSON.stringify({ actionType: 'A', messageContent: big })

    const response = await POST(createRequest(raw))
    const data = await response.json()

    expect(response.status).toBe(413)
    expect(data).toEqual({ error: 'Payload too large' })
    expect(logUserAction).not.toHaveBeenCalled()
  })

  test('returns 400 on invalid JSON', async () => {
    const response = await POST(createRequest('{invalid json'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Invalid JSON' })
    expect(logUserAction).not.toHaveBeenCalled()
  })

  test('returns 400 on too many fields', async () => {
    const payload = { actionType: 'A', sessionId: 's1' }
    for (let index = 0; index < 51; index++) {
      payload[`field_${index}`] = 'x'
    }

    const response = await POST(createRequest(JSON.stringify(payload)))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Too many fields')
  })

  test('stringifies and clamps fields before logging', async () => {
    const huge = 'a'.repeat(6000)
    const raw = JSON.stringify({
      actionType: 'A',
      sessionId: 's1',
      messageContent: huge,
      response: { ok: true },
      somethingNull: null,
    })

    const response = await POST(createRequest(raw))
    expect(response.status).toBe(200)
    expect(logUserAction).toHaveBeenCalledTimes(1)

    const sanitized = logUserAction.mock.calls[0][0]
    expect(typeof sanitized.response).toBe('string')
    expect(sanitized.response).toBe(JSON.stringify({ ok: true }))
    expect(typeof sanitized.messageContent).toBe('string')
    expect(sanitized.messageContent.length).toBe(5000)
    expect(sanitized.somethingNull).toBe('')
  })
})
