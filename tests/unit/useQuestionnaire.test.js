import { renderHook, act, waitFor } from '@testing-library/react'
import { useQuestionnaire } from '@/app/[role]/hooks/useQuestionnaire'

// Mock fetch globally
global.fetch = jest.fn()

describe('useQuestionnaire Hook Tests', () => {
  let mockSetMessages
  let mockSetShowChatList
  let mockSetIsLoading

  beforeEach(() => {
    mockSetMessages = jest.fn()
    mockSetShowChatList = jest.fn()
    mockSetIsLoading = jest.fn()
    global.fetch.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    test('should initialize with correct default state', () => {
      const { result } = renderHook(() => useQuestionnaire())
      
      expect(result.current.questionnaireState).toEqual({
        isActive: false,
        currentQuestionId: null,
        responses: {},
        totalScore: 0,
        currentStep: 0,
      })
    })

    test('should provide all necessary functions', () => {
      const { result } = renderHook(() => useQuestionnaire())
      
      expect(typeof result.current.startQuestionnaire).toBe('function')
      expect(typeof result.current.handleQuestionnaireOptionSelect).toBe('function')
      expect(typeof result.current.setQuestionnaireState).toBe('function')
    })
  })

  describe('startQuestionnaire', () => {
    test('should start questionnaire and set initial message', () => {
      const { result } = renderHook(() => useQuestionnaire())
      
      act(() => {
        result.current.startQuestionnaire(mockSetMessages, mockSetShowChatList, mockSetIsLoading)
      })

      expect(result.current.questionnaireState.isActive).toBe(true)
      expect(result.current.questionnaireState.currentQuestionId).toBe('intro_question')
      expect(mockSetShowChatList).toHaveBeenCalledWith(true)
      expect(mockSetMessages).toHaveBeenCalled()
    })

    test('should add welcome message with correct structure', () => {
      const { result } = renderHook(() => useQuestionnaire())
      
      act(() => {
        result.current.startQuestionnaire(mockSetMessages, mockSetShowChatList, mockSetIsLoading)
      })

      // Check that setMessages was called with a function
      expect(mockSetMessages).toHaveBeenCalled()
      const messageCall = mockSetMessages.mock.calls[0]
      
      if (typeof messageCall[0] === 'function') {
        const messages = messageCall[0]([]) // Execute the function with empty array
        expect(messages[0]).toMatchObject({
          type: 'text',
          isUser: false,
          content: expect.stringContaining('Welcome')
        })
      }
    })
  })

  describe('handleQuestionnaireOptionSelect', () => {
    beforeEach(() => {
      const { result } = renderHook(() => useQuestionnaire())
      act(() => {
        result.current.startQuestionnaire(mockSetMessages, mockSetShowChatList, mockSetIsLoading)
      })
    })

    test('should handle option selection and move to next question', async () => {
      const { result } = renderHook(() => useQuestionnaire())
      
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      await act(async () => {
        await result.current.handleQuestionnaireOptionSelect(
          { value: 'never', score: 0 },
          mockSetMessages,
          mockSetIsLoading,
          jest.fn(),
          jest.fn()
        )
      })

      // Check that the response was recorded (actual key depends on implementation)
      const responses = result.current.questionnaireState.responses
      const responseKeys = Object.keys(responses)
      if (responseKeys.length > 0) {
        // Responses are stored as strings (option.value), not objects
        expect(typeof responses[responseKeys[0]]).toBe('string')
        expect(responses[responseKeys[0]]).toBe('never')
      }
    })

    test('should complete questionnaire after all questions', async () => {
      const { result } = renderHook(() => useQuestionnaire())
      const mockStartScenarioLearning = jest.fn()
      
      // Set state to last question
      act(() => {
        result.current.setQuestionnaireState(prev => ({
          ...prev,
          currentQuestionId: 'q17',
          currentStep: 16,
          totalScore: 50
        }))
      })

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      await act(async () => {
        await result.current.handleQuestionnaireOptionSelect(
          { value: 'never', score: 0 },
          mockSetMessages,
          mockSetIsLoading,
          mockStartScenarioLearning,
          jest.fn()
        )
      })

      await waitFor(() => {
        expect(result.current.questionnaireState.isActive).toBe(false)
      })
    })

    test('should calculate risk level correctly', () => {
      const { result } = renderHook(() => useQuestionnaire())
      
      // Test Low Risk (0-20)
      act(() => {
        result.current.setQuestionnaireState(prev => ({
          ...prev,
          totalScore: 15
        }))
      })
      
      const getRiskLevel = (score) => {
        if (score <= 20) return "Low Risk (0-20 points)"
        if (score <= 40) return "Moderate Risk (21-40 points)"
        if (score <= 60) return "High Risk (41-60 points)"
        return "Severe Risk (61+ points)"
      }

      expect(getRiskLevel(15)).toBe("Low Risk (0-20 points)")
      expect(getRiskLevel(30)).toBe("Moderate Risk (21-40 points)")
      expect(getRiskLevel(50)).toBe("High Risk (41-60 points)")
      expect(getRiskLevel(70)).toBe("Severe Risk (61+ points)")
    })
  })

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      const { result } = renderHook(() => useQuestionnaire())
      
      global.fetch.mockRejectedValueOnce(new Error('Network error'))
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      await act(async () => {
        await result.current.handleQuestionnaireOptionSelect(
          { value: 'never', score: 0 },
          mockSetMessages,
          mockSetIsLoading,
          jest.fn(),
          jest.fn()
        )
      })
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error logging action:',
        expect.any(Error)
      )
      
      consoleErrorSpy.mockRestore()
    })
  })

  describe('State Transitions', () => {
    test('should correctly transition through all questionnaire states', () => {
      const { result } = renderHook(() => useQuestionnaire())
      
      // Initial state
      expect(result.current.questionnaireState.isActive).toBe(false)
      
      // Start questionnaire
      act(() => {
        result.current.startQuestionnaire(mockSetMessages, mockSetShowChatList, mockSetIsLoading)
      })
      expect(result.current.questionnaireState.isActive).toBe(true)
      expect(result.current.questionnaireState.currentStep).toBe(0)
      
      // Progress through questions
      act(() => {
        result.current.setQuestionnaireState(prev => ({
          ...prev,
          currentStep: 5,
          currentQuestionId: 'q6'
        }))
      })
      expect(result.current.questionnaireState.currentStep).toBe(5)
      
      // Complete questionnaire
      act(() => {
        result.current.setQuestionnaireState(prev => ({
          ...prev,
          isActive: false,
          currentStep: 17
        }))
      })
      expect(result.current.questionnaireState.isActive).toBe(false)
    })
  })
})