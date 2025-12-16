/**
 * Load test: simulate ~300 concurrent users hitting /api/log-action in a realistic order.
 *
 * Run:
 *   RUN_LOAD_TESTS=1 npm test -- tests/load/csvLoad300.loadtest.test.js
 */

import fs from 'fs'
import path from 'path'

jest.setTimeout(10 * 60 * 1000)

const createRequest = ({ body, headers = {}, method = 'POST', url = 'http://localhost:3001/api/log-action' } = {}) => ({
  url,
  method,
  headers: {
    get: (key) => headers[key?.toLowerCase?.()] ?? headers[key],
  },
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body ?? {})),
})

const parseCsv = (content) => {
  const rows = []
  let current = ''
  let inQuotes = false
  let row = []

  const pushField = () => {
    row.push(current)
    current = ''
  }
  const pushRow = () => {
    rows.push(row)
    row = []
  }

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      pushField()
    } else if (char === '\n' && !inQuotes) {
      pushField()
      pushRow()
    } else {
      current += char
    }
  }

  if (current.length > 0 || row.length > 0) {
    pushField()
    pushRow()
  }

  return rows
}

const loadCsvRecords = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8')
  const rows = parseCsv(content)
  const headers = rows[0] ?? []
  const dataRows = rows.slice(1).filter((r) => r.some((cell) => String(cell ?? '').trim() !== ''))
  const records = dataRows.map((r) => {
    const record = {}
    headers.forEach((header, index) => {
      if (header) record[header] = r[index] ?? ''
    })
    return record
  })
  return { headers, records }
}

const safeUserKey = (userIdentifier) => String(userIdentifier).replace(/[^a-zA-Z0-9_-]/g, '_')

describe('CSV aggregated matrix load test (300 users)', () => {
  const loadTest = process.env.RUN_LOAD_TESTS === '1' ? test : test.skip

  loadTest(
    'keeps 1-user-1-row with completion_code and valid CSV under concurrency',
    async () => {
      jest.setTimeout(10 * 60 * 1000)

      const runId = `${process.pid}-${Date.now()}`
      const outDir = path.join(process.cwd(), 'temp', 'loadtest')
      fs.mkdirSync(outDir, { recursive: true })

      const csvFile = path.join(outDir, `user_actions.loadtest.${runId}.csv`)

      const previousEnv = {
        CSV_LOG_FILE: process.env.CSV_LOG_FILE,
        CSV_LOG_DIR: process.env.CSV_LOG_DIR,
        CSV_LOCK_RETRIES: process.env.CSV_LOCK_RETRIES,
        CSV_LOCK_STALE_MS: process.env.CSV_LOCK_STALE_MS,
      }

      process.env.CSV_LOG_FILE = csvFile
      delete process.env.CSV_LOG_DIR
      process.env.CSV_LOCK_RETRIES = '300'
      process.env.CSV_LOCK_STALE_MS = '60000'

      jest.resetModules()
      const { POST: logPost } = await import('@/app/api/log-action/route')

      const userCount = 300
      const expectedActionsPerUser = 12

      const specialUserIndex = 42
      const specialMessage = 'Hello, "CSV"\nLine2, with comma'

      const simulateUser = async (index) => {
        const code = `U${String(index).padStart(4, '0')}` // U0001..U0300
        const sessionId = `session_load_${runId}_${index}`
        const completionCode = `T${String(index).padStart(5, '0')}` // T00001..T00300 (6 chars)

        const send = async (payload) => {
          const response = await logPost(
            createRequest({
              method: 'POST',
              url: 'http://localhost:3001/api/log-action',
              headers: { 'content-type': 'application/json' },
              body: payload,
            })
          )
          if (!response?.status || response.status >= 400) {
            const body = response?.json ? await response.json() : null
            const details = body ? JSON.stringify(body) : ''
            throw new Error(`log-action failed (status=${response?.status}) ${details}`)
          }
        }

        // 1) Initial page events before code entry (userIdentifier empty string)
        await send({
          userIdentifier: '',
          sessionId,
          chatbotType: 'general-ai',
          actionType: 'page_visited',
          actionDetails: 'User visited home page',
          pageVisited: 'home',
        })
        await send({
          userIdentifier: '',
          sessionId,
          chatbotType: 'general-ai',
          actionType: 'button_clicked',
          actionDetails: 'Get Started button clicked',
          pageVisited: 'home',
        })

        // 2) Code entry identifies user (must merge session row into user row)
        await send({
          userIdentifier: code,
          sessionId,
          chatbotType: 'general-ai',
          actionType: 'code_entered',
          actionDetails: 'User entered verification code',
          pageVisited: 'home',
        })
        await send({
          userIdentifier: code,
          sessionId,
          chatbotType: 'general-ai',
          actionType: 'code_verified',
          actionDetails: 'Code verification successful',
          pageVisited: 'home',
        })

        // 3) Late event with missing userIdentifier (should still attach to same user row by sessionId)
        await send({
          userIdentifier: '',
          sessionId,
          chatbotType: 'general-ai',
          actionType: 'page_visited',
          actionDetails: 'User entered AI chatbot page',
          pageVisited: 'ai-chatbot',
        })

        // 4) Questionnaire actions
        await send({
          userIdentifier: code,
          sessionId,
          chatbotType: 'general-ai',
          actionType: 'questionnaire_started',
          actionDetails: 'Questionnaire started',
          pageVisited: 'ai-chatbot',
        })
        await send({
          userIdentifier: code,
          sessionId,
          chatbotType: 'general-ai',
          actionType: 'questionnaire_option_selected',
          actionDetails: 'Question: age_check',
          questionId: 'age_check',
          response: 'Never',
          optionSelected: 'never',
          score: 0,
        })
        await send({
          userIdentifier: code,
          sessionId,
          chatbotType: 'general-ai',
          actionType: 'questionnaire_option_selected',
          actionDetails: 'Question: q1',
          questionId: 'q1',
          response: 'Sometimes',
          optionSelected: 'sometimes',
          score: 1,
        })
        await send({
          userIdentifier: code,
          sessionId,
          chatbotType: 'general-ai',
          actionType: 'assessment_completed',
          actionDetails: 'Assessment completed',
          assessmentScore: 17,
          riskLevel: 'Moderate Risk',
          riskDescription: 'Moderate',
          riskRecommendation: 'Reduce intake',
          totalScore: 17,
        })

        // 5) Simulation actions (+ completion code)
        await send({
          userIdentifier: code,
          sessionId,
          chatbotType: 'general-ai',
          actionType: 'simulation_started',
          actionDetails: 'Started scenario 1: peer_pressure',
          scenarioType: 'peer_pressure',
        })
        await send({
          userIdentifier: code,
          sessionId,
          chatbotType: 'general-ai',
          actionType: 'simulation_input',
          actionDetails: 'Scenario response evaluated: appropriate',
          scenarioType: 'peer_pressure',
          scenarioIndex: 0,
          retryCount: 0,
          response: 'No thanks, I am the designated driver tonight.',
          evaluationReason: 'Clear refusal and responsible decision-making.',
          evaluationSuggestions: ['Keep it brief', 'Offer an alternative'],
          score: 85,
          isAppropriate: true,
          messageContent: index === specialUserIndex ? specialMessage : 'ok',
        })
        await send({
          userIdentifier: code,
          sessionId,
          chatbotType: 'general-ai',
          actionType: 'simulation_completed',
          actionDetails: 'Simulation completed',
          completionCode,
          totalScenarios: 3,
          totalResponses: 1,
          appropriateResponses: 1,
          inappropriateResponses: 0,
          averageScore: 85,
        })

        return { code, completionCode }
      }

      let keepArtifacts = false
      try {
        const results = await Promise.all(
          Array.from({ length: userCount }, (_, idx) => simulateUser(idx + 1))
        )

        const { headers, records } = loadCsvRecords(csvFile)

        // CSV structural validity
        expect(headers.length).toBeGreaterThan(0)
        expect(new Set(headers).size).toBe(headers.length)

        // 1-user-1-row (no session rows remain)
        expect(records).toHaveLength(userCount)
        expect(records.some((r) => String(r.user_key).startsWith('__session__'))).toBe(false)

        // Map by user_identifier for fast lookup
        const byUser = new Map(records.map((r) => [r.user_identifier, r]))
        expect(byUser.size).toBe(userCount)

        // Validate each user's row
        results.forEach(({ code, completionCode }) => {
          const row = byUser.get(code)
          expect(row).toBeTruthy()
          expect(row.user_key).toBe(safeUserKey(code))
          expect(row.completion_code).toBe(completionCode)
          expect(row.action_count).toBe(String(expectedActionsPerUser))
        })

        // Validate parsing of special characters survived round-trip
        const specialUserCode = `U${String(specialUserIndex).padStart(4, '0')}`
        const specialRow = byUser.get(specialUserCode)
        expect(specialRow).toBeTruthy()
        expect(specialRow.action_11_message_content).toBe(specialMessage)
      } catch (err) {
        keepArtifacts = true
        throw err
      } finally {
        process.env.CSV_LOG_FILE = previousEnv.CSV_LOG_FILE
        process.env.CSV_LOG_DIR = previousEnv.CSV_LOG_DIR
        process.env.CSV_LOCK_RETRIES = previousEnv.CSV_LOCK_RETRIES
        process.env.CSV_LOCK_STALE_MS = previousEnv.CSV_LOCK_STALE_MS

        if (!keepArtifacts) {
          try {
            fs.rmSync(csvFile, { force: true })
          } catch {}
        }
      }
    }
  )
})
