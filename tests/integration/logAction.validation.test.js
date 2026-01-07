jest.mock('next/server', () => ({
  NextResponse: {
    json: (body, init = {}) => ({
      status: init.status || 200,
      json: async () => body,
    }),
  },
}))

jest.mock('@/utils/logQueue', () => ({
  enqueueLogAction: jest.fn(),
}))

import { enqueueLogAction } from '@/utils/logQueue'
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
    enqueueLogAction.mockReset()
  })

  test('returns 413 when body exceeds limit', async () => {
    const big = 'x'.repeat(260 * 1024)
    const raw = JSON.stringify({ actionType: 'A', messageContent: big })

    const response = await POST(createRequest(raw))
    const data = await response.json()

    expect(response.status).toBe(413)
    expect(data).toEqual({ error: 'Payload too large' })
    expect(enqueueLogAction).not.toHaveBeenCalled()
  })

  test('returns 400 on invalid JSON', async () => {
    const response = await POST(createRequest('{invalid json'))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Invalid JSON' })
    expect(enqueueLogAction).not.toHaveBeenCalled()
  })

  test('accepts payloads with many fields', async () => {
    const payload = { actionType: 'A', sessionId: 's1' }
    for (let index = 0; index < 120; index++) {
      payload[`field_${index}`] = 'x'
    }

    const response = await POST(createRequest(JSON.stringify(payload)))
    expect(response.status).toBe(200)
    expect(enqueueLogAction).toHaveBeenCalledTimes(1)
  })

  test('stringifies fields before logging', async () => {
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
    expect(enqueueLogAction).toHaveBeenCalledTimes(1)

    const sanitized = enqueueLogAction.mock.calls[0][0]
    expect(typeof sanitized.response).toBe('string')
    expect(sanitized.response).toBe(JSON.stringify({ ok: true }))
    expect(typeof sanitized.messageContent).toBe('string')
    expect(sanitized.messageContent.length).toBe(6000)
    expect(sanitized.somethingNull).toBe('')
  })
})
