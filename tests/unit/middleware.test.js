/**
 * Tests for rate limiting middleware
 */

// We test the core rate-limiting logic by importing the middleware module
// and simulating requests with a mock NextResponse/NextRequest

jest.mock('next/server', () => ({
  NextResponse: {
    next: () => ({ status: 200, type: 'next' }),
    json: (body, init = {}) => ({
      status: init.status || 200,
      json: async () => body,
    }),
  },
}))

// We need to test the middleware function directly
let middleware

beforeAll(async () => {
  jest.resetModules()
  const mod = await import('@/middleware')
  middleware = mod.middleware
})

const createMockRequest = (pathname, ip = '127.0.0.1') => ({
  nextUrl: { pathname },
  headers: {
    get: (key) => {
      if (key === 'x-forwarded-for') return ip
      if (key === 'x-real-ip') return ip
      return null
    },
  },
})

describe('Rate Limiting Middleware', () => {
  test('allows non-API routes through', () => {
    const request = createMockRequest('/')
    const response = middleware(request)
    expect(response.status).toBe(200)
    expect(response.type).toBe('next')
  })

  test('allows API routes within rate limit', () => {
    const request = createMockRequest('/api/chat', '10.0.0.1')
    const response = middleware(request)
    expect(response.status).toBe(200)
  })

  test('blocks API routes exceeding rate limit', async () => {
    const ip = '10.0.0.99'
    const request = createMockRequest('/api/admin-auth', ip)

    // admin-auth limit is 5/min
    for (let i = 0; i < 5; i++) {
      const res = middleware(request)
      expect(res.status).toBe(200)
    }

    // 6th request should be blocked
    const blocked = middleware(request)
    expect(blocked.status).toBe(429)
    const body = await blocked.json()
    expect(body.error).toContain('Too many requests')
  })

  test('rate limits are per-IP', () => {
    const request1 = createMockRequest('/api/completion-code', '10.0.1.1')
    const request2 = createMockRequest('/api/completion-code', '10.0.1.2')

    // Fill up limit for IP 1
    for (let i = 0; i < 10; i++) {
      middleware(request1)
    }

    // IP 2 should still be allowed
    const response = middleware(request2)
    expect(response.status).toBe(200)
  })

  test('rate limits are per-route', () => {
    const ip = '10.0.2.1'
    const chatRequest = createMockRequest('/api/chat', ip)
    const evalRequest = createMockRequest('/api/evaluate-response', ip)

    // Fill up chat limit (20/min)
    for (let i = 0; i < 20; i++) {
      middleware(chatRequest)
    }

    // evaluate-response should still be allowed (separate counter)
    const response = middleware(evalRequest)
    expect(response.status).toBe(200)
  })

  test('passes through unmatched API routes', () => {
    const request = createMockRequest('/api/unknown-route', '10.0.3.1')
    const response = middleware(request)
    expect(response.status).toBe(200)
    expect(response.type).toBe('next')
  })

  test('completion-code endpoint is rate limited', async () => {
    const ip = '10.0.4.1'
    const request = createMockRequest('/api/completion-code', ip)

    // completion-code limit is 10/min
    for (let i = 0; i < 10; i++) {
      middleware(request)
    }

    const blocked = middleware(request)
    expect(blocked.status).toBe(429)
  })
})
