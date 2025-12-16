import { renderHook, act } from '@testing-library/react'
import { useScenarioSimulationEnhanced } from '@/app/[role]/hooks/useScenarioSimulationEnhanced'

// Mock fetch
global.fetch = jest.fn()

describe('useScenarioSimulationEnhanced Hook Tests', () => {
  let mockSetMessages

  beforeEach(() => {
    mockSetMessages = jest.fn()
    global.fetch.mockClear()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    test('should initialize with correct default state', () => {
      const { result } = renderHook(() => useScenarioSimulationEnhanced())
      
      expect(result.current.simulationState).toEqual({
        isActive: false,
        currentScenario: null,
        scenarios: [],
        currentScenarioIndex: 0,
        retryCount: 0,
        maxRetries: 3,
        evaluationHistory: [],
        waitingForInput: false,
        allResponses: [],
        isCompletelyDone: false
      })
    })

    test('should provide all required functions', () => {
      const { result } = renderHook(() => useScenarioSimulationEnhanced())
      
      expect(typeof result.current.startScenarioSimulation).toBe('function')
      expect(typeof result.current.handleSimulationOptionSelect).toBe('function')
      expect(typeof result.current.handleUserInput).toBe('function')
      expect(typeof result.current.resetSimulationState).toBe('function')
    })
  })

  describe('startScenarioSimulation', () => {
    test('should start simulation with scenarios', () => {
      const { result } = renderHook(() => useScenarioSimulationEnhanced())
      
      const mockScenarios = [
        {
          id: 1,
          type: 'peer_pressure',
          description: 'Test scenario 1',
          context: 'Test context 1'
        },
        {
          id: 2,
          type: 'stress',
          description: 'Test scenario 2',
          context: 'Test context 2'
        }
      ]
      
      act(() => {
        result.current.startScenarioSimulation(mockScenarios, mockSetMessages)
      })
      
      expect(result.current.simulationState.isActive).toBe(true)
      expect(result.current.simulationState.currentScenario).toEqual(mockScenarios[0])
      expect(result.current.simulationState.scenarios).toEqual(mockScenarios)
      expect(result.current.simulationState.waitingForInput).toBe(true)
      expect(mockSetMessages).toHaveBeenCalled()
    })

    test('should add scenario message with correct structure', () => {
      const { result } = renderHook(() => useScenarioSimulationEnhanced())
      
      const mockScenarios = [{
        id: 1,
        type: 'test',
        description: 'Test description',
        context: 'Test context'
      }]
      
      act(() => {
        result.current.startScenarioSimulation(mockScenarios, mockSetMessages)
      })
      
      const messageCall = mockSetMessages.mock.calls[0][0]
      const messages = messageCall([])
      
      expect(messages[0]).toMatchObject({
        type: 'scenario-simulation',
        content: 'Test description',
        scenario: mockScenarios[0],
        isUser: false,
        requiresInput: true
      })
    })
  })

  describe('handleUserInput', () => {
    test('should handle appropriate response correctly', async () => {
      const { result } = renderHook(() => useScenarioSimulationEnhanced())
      
      // Start simulation first
      const mockScenarios = [{
        id: 1,
        type: 'test',
        description: 'Test scenario',
        context: 'Test context'
      }]
      
      act(() => {
        result.current.startScenarioSimulation(mockScenarios, mockSetMessages)
      })
      
      // Mock successful evaluation
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          isAppropriate: true,
          reason: 'Good response',
          score: 90
        })
      })
      
      const handled = await act(async () => {
        return await result.current.handleUserInput('Test response', mockSetMessages)
      })
      
      expect(handled).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith('/api/evaluate-response', expect.any(Object))
    })

    test('should handle inappropriate response with retry', async () => {
      const { result } = renderHook(() => useScenarioSimulationEnhanced())
      
      // Start simulation
      const mockScenarios = [{
        id: 1,
        type: 'test',
        description: 'Test scenario',
        context: 'Test context'
      }]
      
      act(() => {
        result.current.startScenarioSimulation(mockScenarios, mockSetMessages)
      })
      
      // Mock inappropriate evaluation
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          isAppropriate: false,
          reason: 'Needs improvement',
          suggestions: ['Try this', 'Consider that'],
          score: 30
        })
      })
      
      await act(async () => {
        await result.current.handleUserInput('Poor response', mockSetMessages)
      })
      
      expect(result.current.simulationState.retryCount).toBe(1)
      expect(result.current.simulationState.waitingForInput).toBe(false)
    })

    test('should handle max retries reached', async () => {
      const { result } = renderHook(() => useScenarioSimulationEnhanced())

      // Start simulation
      const mockScenarios = [{
        id: 1,
        type: 'test',
        description: 'Test scenario',
        context: 'Test context'
      }]

      act(() => {
        result.current.startScenarioSimulation(mockScenarios, mockSetMessages)
      })

      // Mock inappropriate evaluations for all retries
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            isAppropriate: false,
            reason: 'Needs improvement',
            score: 40
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            isAppropriate: false,
            reason: 'Still needs improvement',
            score: 45
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            isAppropriate: false,
            reason: 'Not quite there',
            score: 50
          })
        })

      // First attempt (retryCount = 0)
      await act(async () => {
        await result.current.handleUserInput('First attempt', mockSetMessages)
      })

      // Handle retry option to try again (retryCount = 1)
      act(() => {
        result.current.handleSimulationOptionSelect('retry', mockSetMessages)
      })

      // Second attempt
      await act(async () => {
        await result.current.handleUserInput('Second attempt', mockSetMessages)
      })

      // Handle retry option again (retryCount = 2)
      act(() => {
        result.current.handleSimulationOptionSelect('retry', mockSetMessages)
      })

      // Third attempt - should trigger max retries message
      await act(async () => {
        await result.current.handleUserInput('Third attempt', mockSetMessages)
      })

      // Wait a bit for the setTimeout in the code
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
      })

      // Check that retryCount reached max (maxRetries is 3, so retryCount should be 2 when reaching the limit)
      expect(result.current.simulationState.retryCount).toBe(2)

      // Check that maximum attempts message was shown
      const hasMaxAttemptsMsg = mockSetMessages.mock.calls.some(call => {
        if (typeof call[0] === 'function') {
          const messages = call[0]([])
          return messages.some(msg =>
            msg && msg.content && typeof msg.content === 'string' &&
            msg.content.includes('Maximum attempts')
          )
        } else if (Array.isArray(call[0])) {
          return call[0].some(msg =>
            msg && msg.content && typeof msg.content === 'string' &&
            msg.content.includes('Maximum attempts')
          )
        }
        return false
      })

      expect(hasMaxAttemptsMsg).toBe(true)
    })

    test('should not handle input when not waiting', async () => {
      const { result } = renderHook(() => useScenarioSimulationEnhanced())
      
      // Don't start simulation, so waitingForInput is false
      const handled = await act(async () => {
        return await result.current.handleUserInput('Test', mockSetMessages)
      })
      
      expect(handled).toBe(false)
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('handleSimulationOptionSelect', () => {
    test('should handle retry option correctly', () => {
      const { result } = renderHook(() => useScenarioSimulationEnhanced())
      
      // Start simulation
      act(() => {
        result.current.startScenarioSimulation([{
          id: 1,
          type: 'test',
          description: 'Test',
          context: 'Context'
        }], mockSetMessages)
      })
      
      // handleSimulationOptionSelect is not async, it returns boolean directly
      let handled;
      act(() => {
        handled = result.current.handleSimulationOptionSelect(
          { value: 'retry' },
          mockSetMessages
        )
      })

      expect(handled).toBe(true)
      expect(result.current.simulationState.waitingForInput).toBe(true)
    })

    test('should handle skip option correctly', () => {
      const { result } = renderHook(() => useScenarioSimulationEnhanced())
      
      // Start simulation with multiple scenarios
      const scenarios = [
        { id: 1, type: 'test1', description: 'Test 1', context: 'Context 1' },
        { id: 2, type: 'test2', description: 'Test 2', context: 'Context 2' }
      ]
      
      act(() => {
        result.current.startScenarioSimulation(scenarios, mockSetMessages)
      })
      
      let handled;
      act(() => {
        handled = result.current.handleSimulationOptionSelect(
          { value: 'skip' },
          mockSetMessages
        )
      })

      expect(handled).toBe(true)
    })

    test('should normalize option values correctly', () => {
      const { result } = renderHook(() => useScenarioSimulationEnhanced())
      
      act(() => {
        result.current.startScenarioSimulation([{
          id: 1,
          type: 'test',
          description: 'Test',
          context: 'Context'
        }], mockSetMessages)
      })
      
      // Test with string option
      let handled;
      act(() => {
        handled = result.current.handleSimulationOptionSelect('retry', mockSetMessages)
      })
      expect(handled).toBe(true)
      
      // Test with object option
      act(() => {
        handled = result.current.handleSimulationOptionSelect(
          { value: 'skip', text: 'Skip' },
          mockSetMessages
        )
      })
      expect(handled).toBe(true)
    })
  })

  describe('resetSimulationState', () => {
    test('should reset state to initial values', () => {
      const { result } = renderHook(() => useScenarioSimulationEnhanced())
      
      // Start simulation to change state
      act(() => {
        result.current.startScenarioSimulation([{
          id: 1,
          type: 'test',
          description: 'Test',
          context: 'Context'
        }], mockSetMessages)
      })
      
      expect(result.current.simulationState.isActive).toBe(true)
      
      // Reset state
      act(() => {
        result.current.resetSimulationState()
      })
      
      expect(result.current.simulationState).toEqual({
        isActive: false,
        currentScenario: null,
        scenarios: [],
        currentScenarioIndex: 0,
        retryCount: 0,
        maxRetries: 3,
        evaluationHistory: [],
        waitingForInput: false,
        allResponses: []
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle evaluation API errors gracefully', async () => {
      const { result } = renderHook(() => useScenarioSimulationEnhanced())
      
      // Start simulation
      act(() => {
        result.current.startScenarioSimulation([{
          id: 1,
          type: 'test',
          description: 'Test',
          context: 'Context'
        }], mockSetMessages)
      })
      
      // Mock API error
      global.fetch.mockRejectedValueOnce(new Error('API Error'))
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      
      await act(async () => {
        await result.current.handleUserInput('Test response', mockSetMessages)
      })
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error evaluating response:',
        expect.any(Error)
      )
      
      consoleErrorSpy.mockRestore()
    })
  })
})
