/**
 * Integration tests for API routes
 * Tests the complete flow of API endpoints including request/response handling
 */

import { POST } from '@/app/api/chat/route'
import { POST as evaluatePost } from '@/app/api/evaluate-response/route'
import { POST as logPost } from '@/app/api/log-action/route'
import { POST as authPost } from '@/app/api/admin-auth/route'
import { GET as downloadGet } from '@/app/api/download-csv/route'
import { NextRequest } from 'next/server'

// Mock OpenAI API
global.fetch = jest.fn()

// Mock file system for CSV operations
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  appendFileSync: jest.fn(),
  readFileSync: jest.fn(() => 'timestamp,user_identifier,session_id\n2024-01-01,USER001,session123'),
}))

describe('API Integration Tests', () => {
  beforeEach(() => {
    global.fetch.mockClear()
  })

  describe('/api/chat', () => {
    test('should handle chat request successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'Hello! How can I help you?'
          }
        }]
      }
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      })

      const request = new NextRequest('http://localhost:3001/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          systemPrompt: 'You are a helpful assistant'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(data).toEqual({
        content: 'Hello! How can I help you?',
        role: 'assistant'
      })
      
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      )
    })

    test('should handle OpenAI API errors', async () => {
      global.fetch.mockRejectedValueOnce(new Error('OpenAI API error'))

      const request = new NextRequest('http://localhost:3001/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({
        error: 'Failed to get AI response'
      })
    })
  })

  describe('/api/evaluate-response', () => {
    test('should evaluate user response correctly', async () => {
      const mockEvaluation = {
        choices: [{
          message: {
            content: JSON.stringify({
              isAppropriate: true,
              reason: 'Good response showing responsibility',
              score: 85,
              suggestions: []
            })
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvaluation
      })

      const request = new NextRequest('http://localhost:3001/api/evaluate-response', {
        method: 'POST',
        body: JSON.stringify({
          userResponse: 'No thanks, I am the designated driver',
          scenario: 'Someone offers you a drink at a party',
          context: 'Peer pressure situation'
        })
      })

      const response = await evaluatePost(request)
      const data = await response.json()

      expect(data).toMatchObject({
        isAppropriate: true,
        reason: expect.stringContaining('Good response'),
        score: 85
      })
    })

    test('should handle inappropriate responses', async () => {
      const mockEvaluation = {
        choices: [{
          message: {
            content: JSON.stringify({
              isAppropriate: false,
              reason: 'Response shows risk-taking behavior',
              score: 20,
              suggestions: [
                'Consider the consequences',
                'Think about your safety',
                'Remember your goals'
              ]
            })
          }
        }]
      }

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEvaluation
      })

      const request = new NextRequest('http://localhost:3001/api/evaluate-response', {
        method: 'POST',
        body: JSON.stringify({
          userResponse: 'Sure, why not!',
          scenario: 'Someone offers you drugs',
          context: 'High-risk situation'
        })
      })

      const response = await evaluatePost(request)
      const data = await response.json()

      expect(data).toMatchObject({
        isAppropriate: false,
        reason: expect.stringContaining('risk'),
        score: 20,
        suggestions: expect.arrayContaining([
          expect.stringContaining('Consider')
        ])
      })
    })
  })

  describe('/api/log-action', () => {
    test('should log user action successfully', async () => {
      const request = new NextRequest('http://localhost:3001/api/log-action', {
        method: 'POST',
        body: JSON.stringify({
          userIdentifier: 'USER001',
          sessionId: 'session123',
          actionType: 'QUESTIONNAIRE_STARTED',
          actionDetails: 'Started questionnaire',
          chatbotType: 'general-ai'
        })
      })

      const response = await logPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        success: true,
        message: 'Action logged successfully'
      })
    })

    test('should handle missing data gracefully', async () => {
      const request = new NextRequest('http://localhost:3001/api/log-action', {
        method: 'POST',
        body: JSON.stringify({
          actionType: 'OPTION_SELECTED'
        })
      })

      const response = await logPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  describe('/api/admin-auth', () => {
    test('should authenticate with correct credentials', async () => {
      const request = new NextRequest('http://localhost:3001/api/admin-auth', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          password: 'grace2024!@#'
        })
      })

      const response = await authPost(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        authenticated: true,
        message: 'Authentication successful'
      })
    })

    test('should reject invalid credentials', async () => {
      const request = new NextRequest('http://localhost:3001/api/admin-auth', {
        method: 'POST',
        body: JSON.stringify({
          username: 'wrong',
          password: 'incorrect'
        })
      })

      const response = await authPost(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({
        authenticated: false,
        message: 'Invalid credentials'
      })
    })
  })

  describe('/api/download-csv', () => {
    test('should download CSV with proper authorization', async () => {
      const request = new NextRequest('http://localhost:3001/api/download-csv', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer admin'
        }
      })

      const response = await downloadGet(request)
      
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/csv')
      expect(response.headers.get('content-disposition')).toContain('attachment')
    })

    test('should reject unauthorized requests', async () => {
      const request = new NextRequest('http://localhost:3001/api/download-csv', {
        method: 'GET',
        headers: {}
      })

      const response = await downloadGet(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({
        error: 'Unauthorized'
      })
    })
  })

  describe('API Error Handling', () => {
    test('should handle malformed JSON', async () => {
      const request = {
        json: async () => {
          throw new Error('Invalid JSON')
        }
      }

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })

    test('should handle network timeouts', async () => {
      global.fetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      )

      const request = new NextRequest('http://localhost:3001/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }]
        })
      })

      const response = await POST(request)
      
      expect(response.status).toBe(500)
    })
  })

  describe('CSV Logging Integration', () => {
    test('should create CSV file if not exists', async () => {
      const fs = require('fs')
      fs.existsSync.mockReturnValueOnce(false)

      const request = new NextRequest('http://localhost:3001/api/log-action', {
        method: 'POST',
        body: JSON.stringify({
          userIdentifier: 'USER001',
          actionType: 'FIRST_ACTION'
        })
      })

      await logPost(request)

      expect(fs.writeFileSync).toHaveBeenCalled()
    })

    test('should append to existing CSV', async () => {
      const fs = require('fs')
      fs.existsSync.mockReturnValue(true)

      const request = new NextRequest('http://localhost:3001/api/log-action', {
        method: 'POST',
        body: JSON.stringify({
          userIdentifier: 'USER002',
          actionType: 'SUBSEQUENT_ACTION'
        })
      })

      await logPost(request)

      expect(fs.appendFileSync).toHaveBeenCalled()
    })
  })
})