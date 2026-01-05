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

const createRequest = ({ url, headers = {}, method = 'GET' } = {}) => ({
  url,
  method,
  headers: {
    get: (key) => headers[key?.toLowerCase?.()] ?? headers[key],
  },
})

describe('/api/download-csv uses CSV_LOG_FILE override', () => {
  test('returns 404 when resolved file is missing', async () => {
    const runId = `${process.pid}-${Date.now()}`
    const outDir = path.join(process.cwd(), 'temp', 'jest-download')
    fs.mkdirSync(outDir, { recursive: true })
    const missingFile = path.join(outDir, `missing.${runId}.csv`)

    const previousEnv = {
      CSV_LOG_FILE: process.env.CSV_LOG_FILE,
      CSV_LOG_DIR: process.env.CSV_LOG_DIR,
    }

    try {
      process.env.CSV_LOG_FILE = missingFile
      delete process.env.CSV_LOG_DIR
      jest.resetModules()

      const { GET } = await import('@/app/api/download-csv/route')
      const response = await GET(
        createRequest({
          url: 'http://localhost:3001/api/download-csv?token=admin',
        })
      )

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toEqual({ error: 'No user logs found' })
    } finally {
      process.env.CSV_LOG_FILE = previousEnv.CSV_LOG_FILE
      process.env.CSV_LOG_DIR = previousEnv.CSV_LOG_DIR
      fs.rmSync(missingFile, { force: true })
    }
  })

  test('downloads aggregated CSV from the resolved path', async () => {
    const runId = `${process.pid}-${Date.now()}`
    const outDir = path.join(process.cwd(), 'temp', 'jest-download')
    fs.mkdirSync(outDir, { recursive: true })

    const csvFile = path.join(outDir, `user_actions.${runId}.csv`)
    const content = [
      'user_key,user_identifier,chatbot_type,risk_level,risk_description,risk_recommendation,total_score,action_count,completion_code',
      'u1,USER1,general-ai,,,,0,0,',
      '',
    ].join('\n')
    fs.writeFileSync(csvFile, content)

    const previousEnv = {
      CSV_LOG_FILE: process.env.CSV_LOG_FILE,
      CSV_LOG_DIR: process.env.CSV_LOG_DIR,
    }

    try {
      process.env.CSV_LOG_FILE = csvFile
      delete process.env.CSV_LOG_DIR
      jest.resetModules()

      const { GET } = await import('@/app/api/download-csv/route')
      const response = await GET(
        createRequest({
          url: 'http://localhost:3001/api/download-csv?token=admin',
        })
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/csv')
      const text = await response.text()
      expect(text).toBe(content)
    } finally {
      process.env.CSV_LOG_FILE = previousEnv.CSV_LOG_FILE
      process.env.CSV_LOG_DIR = previousEnv.CSV_LOG_DIR
      fs.rmSync(csvFile, { force: true })
    }
  })

  test('returns single-row CSV when userId is provided', async () => {
    const runId = `${process.pid}-${Date.now()}`
    const outDir = path.join(process.cwd(), 'temp', 'jest-download')
    fs.mkdirSync(outDir, { recursive: true })

    const csvFile = path.join(outDir, `user_actions.single.${runId}.csv`)
    const content = [
      'user_key,user_identifier,chatbot_type,risk_level,total_score,action_count,completion_code',
      'USER001,USER001,general-ai,,0,2,ABC123',
      'USER002,USER002,general-ai,,0,1,XYZ999',
      '',
    ].join('\n')
    fs.writeFileSync(csvFile, content)

    const previousEnv = {
      CSV_LOG_FILE: process.env.CSV_LOG_FILE,
      CSV_LOG_DIR: process.env.CSV_LOG_DIR,
    }

    try {
      process.env.CSV_LOG_FILE = csvFile
      delete process.env.CSV_LOG_DIR
      jest.resetModules()

      const { GET } = await import('@/app/api/download-csv/route')
      const response = await GET(
        createRequest({
          url: 'http://localhost:3001/api/download-csv?token=admin&userId=USER001',
        })
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/csv')
      const text = await response.text()
      expect(text.trim().split('\n')).toHaveLength(2)
      expect(text).toContain('USER001')
      expect(text).not.toContain('USER002,USER002')
    } finally {
      process.env.CSV_LOG_FILE = previousEnv.CSV_LOG_FILE
      process.env.CSV_LOG_DIR = previousEnv.CSV_LOG_DIR
      fs.rmSync(csvFile, { force: true })
    }
  })
})
