/**
 * Unit tests for csvLogger utility (aggregated CSV design)
 */

import fs from 'fs'
import path from 'path'
import {
  ensureCSVDirectory,
  initializeUserCSV,
  logUserAction,
  getUserLogs,
  getAllUsers,
  getAggregatedCSVData,
  getAggregatedCSVFilePath,
  getUserCsvFilePath
} from '@/utils/csvLogger'

jest.mock('fs')
jest.mock('proper-lockfile', () => ({
  lock: jest.fn(async () => async () => {})
}))

describe('Per-user CSV Logger', () => {
  const csvDir = path.join(process.cwd(), 'user_logs')
  const usersDir = path.join(csvDir, 'users')
  const csvFile = path.join(csvDir, 'user_actions.csv')
  const baseHeader =
    'user_key,user_identifier,chatbot_type,risk_level,risk_description,risk_recommendation,total_score,action_count,completion_code\n'

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

    for (let index = 0; index < content.length; index++) {
      const char = content[index]
      if (char === '"') {
        if (inQuotes && content[index + 1] === '"') {
          current += '"'
          index++
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

  const csvToRecords = (content) => {
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

  const getLastWriteCall = () => {
    const calls = fs.writeFileSync.mock.calls
    return calls[calls.length - 1]
  }

  const setFsExistsState = ({
    csvDirExists = true,
    usersDirExists = true,
    aggregatedFileExists = true,
    fileStates = {}
  } = {}) => {
    fs.existsSync.mockImplementation((target) => {
      if (target === csvDir) return csvDirExists
      if (target === usersDir) return usersDirExists
      if (target === csvFile) return aggregatedFileExists
      if (Object.prototype.hasOwnProperty.call(fileStates, target)) {
        return fileStates[target]
      }
      return true
    })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    setFsExistsState({ csvDirExists: true, usersDirExists: true, aggregatedFileExists: true })
    fs.mkdirSync.mockImplementation(() => {})
    fs.writeFileSync.mockImplementation(() => {})
    fs.renameSync.mockImplementation(() => {})
    fs.readdirSync.mockReturnValue([])
    fs.readFileSync.mockReturnValue(baseHeader)
  })

  describe('ensureCSVDirectory', () => {
    test('creates directory and base CSV when missing', async () => {
      setFsExistsState({ csvDirExists: false, usersDirExists: false, aggregatedFileExists: false })

      await ensureCSVDirectory()

      expect(fs.mkdirSync).toHaveBeenCalledWith(csvDir, { recursive: true })
      expect(fs.mkdirSync).toHaveBeenCalledWith(usersDir, { recursive: true })
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        csvFile,
        expect.stringContaining('user_key,user_identifier,chatbot_type,risk_level,risk_description,risk_recommendation,total_score,action_count,completion_code')
      )
    })

    test('skips creation when already present', async () => {
      await ensureCSVDirectory()
      expect(fs.mkdirSync).not.toHaveBeenCalled()
      expect(fs.writeFileSync).not.toHaveBeenCalledWith(csvFile, expect.any(String))
    })
  })

  describe('initializeUserCSV', () => {
    test('adds an empty row for a new user', async () => {
      const userFile = getUserCsvFilePath('user-123')
      setFsExistsState({ fileStates: { [userFile]: false } })
      const csvContent = 'user_key,user_identifier,chatbot_type,risk_level,total_score,action_count\n'
      fs.readFileSync.mockReturnValue(csvContent)

      await initializeUserCSV('user-123')

      const output = getLastWriteCall()[1]
      const { records } = csvToRecords(output)
      const row = records.find((record) => record.user_key === 'user-123')
      expect(row).toMatchObject({
        user_key: 'user-123',
        user_identifier: 'user-123',
        chatbot_type: 'general-ai',
        risk_level: '',
        risk_description: '',
        risk_recommendation: '',
        total_score: '0',
        action_count: '0',
        completion_code: ''
      })
      const tempPath = getLastWriteCall()[0]
      expect(fs.renameSync).toHaveBeenCalledWith(tempPath, userFile)
    })

    test('does not duplicate an existing user row', async () => {
      const existing = [
        'user_key,user_identifier,chatbot_type,risk_level,total_score,action_count',
        'Original_User,Original User,general-ai,,5,1'
      ].join('\n')
      const userFile = getUserCsvFilePath('Original User')
      setFsExistsState({ fileStates: { [userFile]: true } })
      fs.readFileSync.mockReturnValue(existing)

      await initializeUserCSV('Original User')

      expect(fs.writeFileSync).not.toHaveBeenCalled()
    })
  })

  describe('logUserAction', () => {
    test('creates action columns and stores first user action', async () => {
      const userFile = getUserCsvFilePath('MatrixUser01')
      setFsExistsState({ fileStates: { [userFile]: false } })
      const payload = {
        userIdentifier: 'MatrixUser01',
        sessionId: 'session-xyz',
        actionType: 'BUTTON_CLICKED',
        actionDetails: 'Start test',
        messageContent: 'hello'
      }

      await logUserAction(payload)

      const output = getLastWriteCall()[1]
      const { headers, records } = csvToRecords(output)
      expect(headers).toEqual(expect.arrayContaining(['action_1_timestamp', 'action_1_action_type', 'action_1_session_id']))
      const row = records.find((record) => record.user_key === 'MatrixUser01')
      expect(row).toBeTruthy()
      expect(row.action_count).toBe('1')
      expect(row.action_1_session_id).toBe('session-xyz')
      expect(row.action_1_action_type).toBe('BUTTON_CLICKED')
      expect(row.action_1_message_content).toBe('hello')
      const tempPath = getLastWriteCall()[0]
      expect(fs.renameSync).toHaveBeenCalledWith(tempPath, userFile)
    })

    test('appends additional actions to the same user row', async () => {
      const userFile = getUserCsvFilePath('MatrixUser01')
      setFsExistsState({ fileStates: { [userFile]: true } })
      const existing = [
        'user_key,user_identifier,chatbot_type,risk_level,total_score,action_count,action_1_timestamp,action_1_action_type',
        'MatrixUser01,MatrixUser01,general-ai,,5,1,2024-01-01T00:00:00.000Z,INIT'
      ].join('\n')
      fs.readFileSync.mockReturnValue(existing)

      await logUserAction({
        userIdentifier: 'MatrixUser01',
        actionType: 'ANSWERED',
        response: '42'
      })

      const output = getLastWriteCall()[1]
      const { headers, records } = csvToRecords(output)
      expect(headers).toEqual(expect.arrayContaining(['action_2_timestamp', 'action_2_action_type', 'action_2_response']))
      const row = records.find((record) => record.user_key === 'MatrixUser01')
      expect(row.action_count).toBe('2')
      expect(row.action_2_action_type).toBe('ANSWERED')
      expect(row.action_2_response).toBe('42')
    })

    test('sanitizes user identifier for row key while keeping original label', async () => {
      const userFile = getUserCsvFilePath('user@domain.com')
      setFsExistsState({ fileStates: { [userFile]: false } })
      await logUserAction({ userIdentifier: 'user@domain.com', actionType: 'STEP' })
      const output = getLastWriteCall()[1]
      const { records } = csvToRecords(output)
      const row = records.find((record) => record.user_key === 'user_domain_com')
      expect(row).toBeTruthy()
      expect(row.user_identifier).toBe('user@domain.com')
    })

    test('captures dynamic fields and updates total score', async () => {
      const userFile = getUserCsvFilePath('Dynamic User')
      setFsExistsState({ fileStates: { [userFile]: true } })
      const existing = [
        'user_key,user_identifier,chatbot_type,risk_level,total_score,action_count,completion_code,action_1_timestamp,action_1_action_type,action_1_score',
        'Dynamic_User,Dynamic User,general-ai,,5,1,,2024-01-01T00:00:00.000Z,INIT,5'
      ].join('\n')
      fs.readFileSync.mockReturnValue(existing)

      await logUserAction({
        userIdentifier: 'Dynamic User',
        actionType: 'ASSESSMENT_COMPLETED',
        assessmentScore: 25,
        riskLevel: 'moderate',
        riskDescription: 'desc',
        riskRecommendation: 'rec',
        totalScore: 25
      })

      const output = getLastWriteCall()[1]
      const { headers, records } = csvToRecords(output)
      expect(headers).not.toContain('action_2_total_score')
      expect(headers).not.toContain('action_2_risk_level')
      expect(headers).not.toContain('action_2_risk_description')
      expect(headers).not.toContain('action_2_risk_recommendation')
      const row = records.find((record) => record.user_key === 'Dynamic_User')
      expect(row).toMatchObject({
        user_identifier: 'Dynamic User',
        risk_level: 'moderate',
        risk_description: 'desc',
        risk_recommendation: 'rec',
        total_score: '25',
        action_count: '2',
      })
    })

    test('uses a session-keyed row before user identifier exists', async () => {
      const sessionFile = path.join(usersDir, 'session_session_abc.csv')
      setFsExistsState({ fileStates: { [sessionFile]: false } })
      fs.readdirSync.mockReturnValue([])
      fs.readFileSync.mockReturnValue(baseHeader)

      await logUserAction({
        sessionId: 'session_abc',
        actionType: 'PAGE_VISITED',
        actionDetails: 'Entered site'
      })

      const output = getLastWriteCall()[1]
      const { records } = csvToRecords(output)
      const row = records.find((record) => record.user_key === '__session__session_abc')
      expect(row).toBeTruthy()
      expect(row.user_identifier).toBe('unknown')
      expect(row.action_1_action_type).toBe('PAGE_VISITED')
    })

    test('merges a session-keyed row into the user row once identified', async () => {
      const existing = [
        'user_key,user_identifier,chatbot_type,risk_level,total_score,action_count,completion_code,action_1_timestamp,action_1_session_id,action_1_action_type',
        '__session__session_abc,unknown,general-ai,,0,1,,2024-01-01T00:00:00.000Z,session_abc,PAGE_VISITED'
      ].join('\n')
      const sessionFile = path.join(usersDir, 'session_session_abc.csv')
      const userFile = getUserCsvFilePath('USER001')
      setFsExistsState({ fileStates: { [sessionFile]: true, [userFile]: false } })
      fs.readFileSync.mockImplementation((target) => {
        if (target === sessionFile) return existing
        return baseHeader
      })

      await logUserAction({
        userIdentifier: 'USER001',
        sessionId: 'session_abc',
        actionType: 'CODE_ENTERED'
      })

      const output = getLastWriteCall()[1]
      const { records } = csvToRecords(output)
      const sessionRow = records.find((record) => record.user_key === '__session__session_abc')
      expect(sessionRow).toBeFalsy()
      const userRow = records.find((record) => record.user_key === 'USER001')
      expect(userRow).toBeTruthy()
      expect(userRow.action_count).toBe('2')
      expect(userRow.action_1_action_type).toBe('PAGE_VISITED')
      expect(userRow.action_2_action_type).toBe('CODE_ENTERED')
      expect(fs.unlinkSync).toHaveBeenCalledWith(sessionFile)
    })

    test('avoids creating a late session row when user row already exists for the session', async () => {
      const existing = [
        'user_key,user_identifier,chatbot_type,risk_level,total_score,action_count,completion_code,action_1_timestamp,action_1_session_id,action_1_action_type',
        'USER001,USER001,general-ai,,0,1,,2024-01-01T00:00:00.000Z,session_abc,CODE_ENTERED'
      ].join('\n')
      const userFile = getUserCsvFilePath('USER001')
      const sessionFile = path.join(usersDir, 'session_session_abc.csv')
      setFsExistsState({ fileStates: { [sessionFile]: false, [userFile]: true } })
      fs.readdirSync.mockReturnValue([path.basename(userFile)])
      fs.readFileSync.mockReturnValue(existing)

      await logUserAction({
        sessionId: 'session_abc',
        actionType: 'PAGE_VISITED'
      })

      const output = getLastWriteCall()[1]
      const { records } = csvToRecords(output)
      const sessionRow = records.find((record) => record.user_key === '__session__session_abc')
      expect(sessionRow).toBeFalsy()
      const userRow = records.find((record) => record.user_key === 'USER001')
      expect(userRow).toBeTruthy()
      expect(userRow.action_count).toBe('2')
      expect(userRow.action_2_action_type).toBe('PAGE_VISITED')
    })

    test('stores completion code on the base user row', async () => {
      const userFile = getUserCsvFilePath('USER001')
      setFsExistsState({ fileStates: { [userFile]: false } })
      fs.readFileSync.mockReturnValue(baseHeader)

      await logUserAction({
        userIdentifier: 'USER001',
        sessionId: 'session_abc',
        actionType: 'SIMULATION_COMPLETED',
        completionCode: 'ABC123'
      })

      const output = getLastWriteCall()[1]
      const { records } = csvToRecords(output)
      const row = records.find((record) => record.user_key === 'USER001')
      expect(row).toBeTruthy()
      expect(row.completion_code).toBe('ABC123')
    })
  })

  describe('getUserLogs', () => {
    test('returns structured actions for an existing user', () => {
      const csvContent = [
        'user_key,user_identifier,chatbot_type,risk_level,total_score,action_count,completion_code,action_1_timestamp,action_1_action_type,action_1_response,action_2_timestamp,action_2_action_type',
        'MatrixUser01,MatrixUser01,doctor-ai,High Risk,15,2,,2024-01-01T00:00:00.000Z,INIT,,2024-01-01T00:05:00.000Z,ANSWERED'
      ].join('\n')
      fs.readdirSync.mockReturnValue([])
      fs.readFileSync.mockReturnValue(csvContent)

      const logs = getUserLogs('MatrixUser01')

      expect(logs).toHaveLength(2)
      expect(logs[0]).toMatchObject({ timestamp: '2024-01-01T00:00:00.000Z', action_type: 'INIT', chatbot_type: 'doctor-ai', risk_level: 'High Risk', total_score: '15' })
      expect(logs[1]).toMatchObject({ action_type: 'ANSWERED', chatbot_type: 'doctor-ai', risk_level: 'High Risk', total_score: '15' })
    })

    test('returns empty array for users without entries', () => {
      fs.readdirSync.mockReturnValue([])
      fs.readFileSync.mockReturnValue(baseHeader)
      const logs = getUserLogs('Missing')
      expect(logs).toEqual([])
    })
  })

  describe('getAllUsers & getAggregatedCSVData', () => {
    test('returns user labels from CSV data', () => {
      const csvContent = [
        'user_key,user_identifier,chatbot_type,risk_level,total_score,action_count,completion_code',
        'safe1,First User,general-ai,,0,0,',
        'safe2,Second User,doctor-ai,Moderate,10,1,'
      ].join('\n')
      fs.readdirSync.mockReturnValue([])
      fs.readFileSync.mockReturnValue(csvContent)

      expect(getAllUsers()).toEqual(['First User', 'Second User'])
    })

    test('exposes raw headers and rows for download routes', () => {
      const csvContent = [
        'user_key,user_identifier,action_count,action_1_action_type',
        'user1,User One,1,CLICK'
      ].join('\n')
      fs.readdirSync.mockReturnValue([])
      fs.readFileSync.mockReturnValue(csvContent)

      const { headers, records } = getAggregatedCSVData()

      expect(headers).toEqual([
        'user_key',
        'user_identifier',
        'chatbot_type',
        'risk_level',
        'risk_description',
        'risk_recommendation',
        'total_score',
        'action_count',
        'completion_code',
        'action_1_action_type'
      ])
      expect(records[0]).toMatchObject({ user_key: 'user1', action_count: '1' })
    })

    test('exposes resolved aggregated CSV file path', () => {
      expect(getAggregatedCSVFilePath()).toBe(csvFile)
    })
  })
})
