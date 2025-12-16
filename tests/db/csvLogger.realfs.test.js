import fs from 'fs'
import path from 'path'

const makeSandbox = () => {
  const runId = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const dir = path.join(process.cwd(), 'temp', 'jest-db', runId)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, 'user_actions.csv')
  return { dir, file }
}

describe('csvLogger real filesystem round-trip', () => {
  const previousEnv = {
    CSV_LOG_DIR: process.env.CSV_LOG_DIR,
    CSV_LOG_FILE: process.env.CSV_LOG_FILE,
    CSV_LOCK_RETRIES: process.env.CSV_LOCK_RETRIES,
    CSV_LOCK_STALE_MS: process.env.CSV_LOCK_STALE_MS,
  }

  afterEach(() => {
    process.env.CSV_LOG_DIR = previousEnv.CSV_LOG_DIR
    process.env.CSV_LOG_FILE = previousEnv.CSV_LOG_FILE
    process.env.CSV_LOCK_RETRIES = previousEnv.CSV_LOCK_RETRIES
    process.env.CSV_LOCK_STALE_MS = previousEnv.CSV_LOCK_STALE_MS
  })

  test('escapes and parses commas/quotes/newlines correctly', async () => {
    const { dir, file } = makeSandbox()
    const message = 'Hello, "CSV"\nLine2, with comma'

    try {
      process.env.CSV_LOG_FILE = file
      delete process.env.CSV_LOG_DIR
      jest.resetModules()

      const { logUserAction, getAggregatedCSVData, getUserLogs } = await import('@/utils/csvLogger')

      await logUserAction({
        userIdentifier: 'USER001',
        sessionId: 's1',
        actionType: 'simulation_input',
        messageContent: message,
      })

      const { headers, records } = getAggregatedCSVData()
      expect(new Set(headers).size).toBe(headers.length)
      const row = records.find((record) => record.user_key === 'USER001')
      expect(row).toBeTruthy()
      expect(row.action_1_message_content).toBe(message)

      const logs = getUserLogs('USER001')
      expect(logs).toHaveLength(1)
      expect(logs[0].message_content).toBe(message)

      const raw = fs.readFileSync(file, 'utf-8')
      expect(raw).toContain('""CSV""')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('merges session-keyed rows into the identified user row', async () => {
    const { dir, file } = makeSandbox()
    try {
      process.env.CSV_LOG_FILE = file
      delete process.env.CSV_LOG_DIR
      jest.resetModules()

      const { logUserAction, getAggregatedCSVData } = await import('@/utils/csvLogger')

      await logUserAction({
        userIdentifier: '',
        sessionId: 'session_abc',
        actionType: 'page_visited',
        pageVisited: 'home',
      })
      await logUserAction({
        userIdentifier: 'USER123',
        sessionId: 'session_abc',
        actionType: 'code_entered',
      })

      const { records } = getAggregatedCSVData()
      expect(records).toHaveLength(1)
      expect(records.some((record) => String(record.user_key).startsWith('__session__'))).toBe(false)

      const row = records[0]
      expect(row.user_key).toBe('USER123')
      expect(row.action_count).toBe('2')
      expect(row.action_1_action_type).toBe('page_visited')
      expect(row.action_1_page_visited).toBe('home')
      expect(row.action_2_action_type).toBe('code_entered')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('persists completion_code without clearing on empty updates', async () => {
    const { dir, file } = makeSandbox()
    try {
      process.env.CSV_LOG_FILE = file
      delete process.env.CSV_LOG_DIR
      jest.resetModules()

      const { logUserAction, getAggregatedCSVData } = await import('@/utils/csvLogger')

      await logUserAction({
        userIdentifier: 'USER001',
        sessionId: 's1',
        actionType: 'simulation_completed',
        completionCode: 'AAA',
      })
      let row = getAggregatedCSVData().records.find((r) => r.user_key === 'USER001')
      expect(row.completion_code).toBe('AAA')

      await logUserAction({
        userIdentifier: 'USER001',
        sessionId: 's1',
        actionType: 'simulation_completed',
        completionCode: '   ',
      })
      row = getAggregatedCSVData().records.find((r) => r.user_key === 'USER001')
      expect(row.completion_code).toBe('AAA')

      await logUserAction({
        userIdentifier: 'USER001',
        sessionId: 's1',
        actionType: 'simulation_completed',
        completionCode: 'BBB',
      })
      row = getAggregatedCSVData().records.find((r) => r.user_key === 'USER001')
      expect(row.completion_code).toBe('BBB')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('stores risk fields on the base row (not as action columns)', async () => {
    const { dir, file } = makeSandbox()
    try {
      process.env.CSV_LOG_FILE = file
      delete process.env.CSV_LOG_DIR
      jest.resetModules()

      const { logUserAction, getAggregatedCSVData } = await import('@/utils/csvLogger')

      await logUserAction({
        userIdentifier: 'USER777',
        sessionId: 's777',
        actionType: 'assessment_completed',
        totalScore: 17,
        riskLevel: 'Moderate Risk',
        riskDescription: 'Moderate',
        riskRecommendation: 'Reduce intake',
      })

      const { headers, records } = getAggregatedCSVData()
      expect(headers.some((h) => /^action_\d+_risk_description$/.test(h))).toBe(false)
      expect(headers.some((h) => /^action_\d+_risk_recommendation$/.test(h))).toBe(false)

      const row = records.find((record) => record.user_key === 'USER777')
      expect(row).toMatchObject({
        total_score: '17',
        risk_level: 'Moderate Risk',
        risk_description: 'Moderate',
        risk_recommendation: 'Reduce intake',
      })
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  test('keeps 1-user-1-row under concurrent writes (smoke)', async () => {
    const { dir, file } = makeSandbox()
    try {
      process.env.CSV_LOG_FILE = file
      delete process.env.CSV_LOG_DIR
      process.env.CSV_LOCK_RETRIES = '200'
      process.env.CSV_LOCK_STALE_MS = '60000'
      jest.resetModules()

      const { logUserAction, getAggregatedCSVData } = await import('@/utils/csvLogger')

      const userCount = 50
      await Promise.all(
        Array.from({ length: userCount }, (_, index) =>
          logUserAction({
            userIdentifier: `U${String(index + 1).padStart(4, '0')}`,
            sessionId: `s_${index + 1}`,
            actionType: 'page_visited',
            pageVisited: 'home',
          })
        )
      )

      const { headers, records } = getAggregatedCSVData()
      expect(new Set(headers).size).toBe(headers.length)
      expect(records).toHaveLength(userCount)
      expect(records.some((record) => String(record.user_key).startsWith('__session__'))).toBe(false)
      records.forEach((record) => {
        expect(record.action_count).toBe('1')
      })
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
