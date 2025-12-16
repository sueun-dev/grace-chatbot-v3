import '@testing-library/jest-dom'
jest.mock('proper-lockfile', () => ({
  lock: jest.fn(async () => async () => {})
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    reload: jest.fn(),
    forward: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Polyfill fetch primitives for Next APIs in Jest (jsdom may lack Request constructor)
const { Request: GlobalRequest, Response: GlobalResponse, Headers: GlobalHeaders, FormData: GlobalFormData } = globalThis
if (!global.Request && GlobalRequest) global.Request = GlobalRequest
if (!global.Response && GlobalResponse) global.Response = GlobalResponse
if (!global.Headers && GlobalHeaders) global.Headers = GlobalHeaders
if (!global.FormData && GlobalFormData) global.FormData = GlobalFormData
// Fallback minimal Request polyfill if environment doesn't provide one
if (!global.Request) {
  class SimpleRequest {
    constructor(input, init = {}) {
      this.url = input
      this.method = init.method || 'GET'
      this.headers = new Map(Object.entries(init.headers || {}))
      this.body = init.body
    }
    async json() {
      if (typeof this.body === 'string') return JSON.parse(this.body)
      return this.body
    }
  }
  global.Request = SimpleRequest
}

// Fallback minimal Response polyfill if environment doesn't provide one
if (!global.Response) {
  class SimpleResponse {
    constructor(body, init = {}) {
      this._body = body
      this.status = init.status || 200
      this.headers = new Map()
      Object.entries(init.headers || {}).forEach(([k, v]) => this.headers.set(k.toLowerCase(), v))
    }
    async json() {
      if (typeof this._body === 'string') return JSON.parse(this._body)
      return this._body
    }
    async text() {
      if (typeof this._body === 'string') return this._body
      return String(this._body ?? '')
    }
  }
  global.Response = SimpleResponse
}

// Ensure Response.json static exists (NextResponse.json relies on it)
if (global.Response && typeof global.Response.json !== 'function') {
  global.Response.json = (data, init = {}) => {
    const headers = init.headers || {}
    return new global.Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    })
  }
}

// Mock fetch globally
global.fetch = jest.fn()

// Some libraries (e.g. archiver) expect setImmediate to exist (it may be missing in jsdom)
if (typeof global.setImmediate !== 'function') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args)
}

// Mock console methods to reduce noise in tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = jest.fn()
  console.warn = jest.fn()
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})
