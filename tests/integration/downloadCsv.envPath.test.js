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

const TEST_DB_DIR = path.join(process.cwd(), 'temp', `jest-dl-csv-${process.pid}-${Date.now()}`)

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

describe('/api/download-csv with SQLite', () => {
  test('returns 404 when no data exists', async () => {
    jest.resetModules()
    const { GET } = await import('@/app/api/download-csv/route')
    const response = await GET(
      createRequest({ url: 'http://localhost:3001/api/download-csv?token=admin' })
    )
    expect(response.status).toBe(404)
  })

  test('downloads aggregated CSV after inserting data', async () => {
    jest.resetModules()
    const { logUserAction } = await import('@/utils/db')
    await logUserAction({ userIdentifier: 'USER1', actionType: 'TEST_ACTION' })

    const { GET } = await import('@/app/api/download-csv/route')
    const response = await GET(
      createRequest({ url: 'http://localhost:3001/api/download-csv?token=admin' })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/csv')
    const text = await response.text()
    expect(text).toContain('USER1')
    expect(text).toContain('TEST_ACTION')
  })

  test('returns single-row CSV when userId is provided', async () => {
    jest.resetModules()
    const { logUserAction } = await import('@/utils/db')
    await logUserAction({ userIdentifier: 'ALICE', actionType: 'A' })
    await logUserAction({ userIdentifier: 'BOB', actionType: 'B' })

    const { GET } = await import('@/app/api/download-csv/route')
    const response = await GET(
      createRequest({ url: 'http://localhost:3001/api/download-csv?token=admin&userId=ALICE' })
    )

    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toContain('ALICE')
    expect(text).not.toContain('BOB,BOB')
  })

  test('sanitizes formula-like cells in CSV download output', async () => {
    jest.resetModules()
    const { logUserAction } = await import('@/utils/db')
    await logUserAction({
      userIdentifier: 'FORMULA_USER',
      actionType: 'TEST',
      response: '=2+3',
    })

    const { GET } = await import('@/app/api/download-csv/route')
    const response = await GET(
      createRequest({ url: 'http://localhost:3001/api/download-csv?token=admin' })
    )

    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toContain("'=2+3")
  })
})
