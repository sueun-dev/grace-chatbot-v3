import fs from 'fs'
import path from 'path'

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body, init = {}) => ({
      status: init.status || 200,
      json: async () => body,
      headers: {
        get: (key) => {
          const headers = init.headers || {}
          return headers[key] || headers[key?.toLowerCase?.()] || null
        },
      },
    }),
  },
}))

const TEST_DB_DIR = path.join(process.cwd(), 'temp', `jest-dl-all-${process.pid}-${Date.now()}`)

beforeAll(() => {
  fs.mkdirSync(TEST_DB_DIR, { recursive: true })
  process.env.DB_PATH = path.join(TEST_DB_DIR, 'test.db')
  process.env.CSV_LOG_DIR = TEST_DB_DIR
  process.env.DOWNLOAD_TOKEN = 'admin'
})

afterAll(async () => {
  jest.resetModules()
  const { closeDb } = await import('@/utils/db')
  closeDb()
  delete process.env.DOWNLOAD_TOKEN
  fs.rmSync(TEST_DB_DIR, { recursive: true, force: true })
})

const createRequest = ({ url, headers = {}, method = 'GET' } = {}) => ({
  url,
  method,
  headers: {
    get: (key) => headers[key?.toLowerCase?.()] ?? headers[key],
  },
})

describe('/api/download-all-csv with SQLite', () => {
  test('rejects unauthorized requests', async () => {
    jest.resetModules()
    const { GET } = await import('@/app/api/download-all-csv/route')
    const response = await GET(
      createRequest({ url: 'http://localhost:3001/api/download-all-csv' })
    )
    expect(response.status).toBe(401)
  })

  test('returns 404 when no data exists', async () => {
    jest.resetModules()
    const { GET } = await import('@/app/api/download-all-csv/route')
    const response = await GET(
      createRequest({ url: 'http://localhost:3001/api/download-all-csv?token=admin' })
    )
    expect(response.status).toBe(404)
  })

  test('returns a ZIP when data exists', async () => {
    jest.resetModules()
    const { logUserAction } = await import('@/utils/db')
    await logUserAction({ userIdentifier: 'ZIP_USER', actionType: 'ZIP_TEST' })

    const { GET } = await import('@/app/api/download-all-csv/route')
    const response = await GET(
      createRequest({ url: 'http://localhost:3001/api/download-all-csv?token=admin' })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/zip')
    expect(response.headers.get('content-disposition')).toContain('attachment')
  }, 20000)

  test('uses unique ZIP filenames across consecutive requests', async () => {
    jest.resetModules()
    const { logUserAction } = await import('@/utils/db')
    await logUserAction({ userIdentifier: 'UNIQUE_USER', actionType: 'UNIQUE_TEST' })

    const { GET } = await import('@/app/api/download-all-csv/route')
    const first = await GET(
      createRequest({ url: 'http://localhost:3001/api/download-all-csv?token=admin' })
    )
    const second = await GET(
      createRequest({ url: 'http://localhost:3001/api/download-all-csv?token=admin' })
    )

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    const d1 = first.headers.get('content-disposition')
    const d2 = second.headers.get('content-disposition')
    expect(d1).not.toBe(d2)
  }, 20000)
})
