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

describe('/api/download-all-csv', () => {
  test('rejects unauthorized requests', async () => {
    jest.resetModules()
    const { GET } = await import('@/app/api/download-all-csv/route')

    const response = await GET(
      createRequest({
        url: 'http://localhost:3001/api/download-all-csv',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  test('returns 404 when no CSV files exist', async () => {
    const existsSpy = jest.spyOn(fs, 'existsSync').mockReturnValue(false)
    try {
      jest.resetModules()
      const { GET } = await import('@/app/api/download-all-csv/route')

      const response = await GET(
        createRequest({
          url: 'http://localhost:3001/api/download-all-csv?token=admin',
        })
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ error: 'No CSV files found across chatbots' })
    } finally {
      existsSpy.mockRestore()
    }
  })

  test('returns a ZIP when at least one CSV exists', async () => {
    const runId = `${process.pid}-${Date.now()}`
    const outDir = path.join(process.cwd(), 'temp', 'jest-download')
    fs.mkdirSync(outDir, { recursive: true })

    const csvFile = path.join(outDir, `user_actions.zipsource.${runId}.csv`)
    fs.writeFileSync(
      csvFile,
      [
        'user_key,user_identifier,chatbot_type,risk_level,total_score,action_count,completion_code',
        'u1,USER1,general-ai,,0,0,',
        '',
      ].join('\n')
    )

    const previousEnv = {
      CSV_LOG_FILE: process.env.CSV_LOG_FILE,
      CSV_LOG_DIR: process.env.CSV_LOG_DIR,
    }

    try {
      process.env.CSV_LOG_FILE = csvFile
      delete process.env.CSV_LOG_DIR
      jest.resetModules()

      const { GET } = await import('@/app/api/download-all-csv/route')
      const response = await GET(
        createRequest({
          url: 'http://localhost:3001/api/download-all-csv?token=admin',
        })
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('application/zip')
      expect(response.headers.get('content-disposition')).toContain('attachment')

      const dateString = new Date().toISOString().split('T')[0]
      const tempZipPath = path.join(process.cwd(), 'temp', `all_csv_files_${dateString}.zip`)
      expect(fs.existsSync(tempZipPath)).toBe(false)
    } finally {
      process.env.CSV_LOG_FILE = previousEnv.CSV_LOG_FILE
      process.env.CSV_LOG_DIR = previousEnv.CSV_LOG_DIR
      fs.rmSync(csvFile, { force: true })
    }
  }, 20000)
})
