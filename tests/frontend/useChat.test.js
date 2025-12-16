import { renderHook, act, waitFor } from '@testing-library/react'
import { useChat } from '@/app/[role]/hooks/useChat'
import { logAction, ACTION_TYPES } from '@/utils/clientLogger'
import { simulateAIResponse } from '@/app/[role]/components/chatService'

jest.mock('@/utils/clientLogger', () => {
  const actual = jest.requireActual('@/utils/clientLogger')
  return { ...actual, logAction: jest.fn().mockResolvedValue(undefined) }
})

jest.mock('@/app/[role]/components/chatService', () => ({
  generateTimestamp: () => '10:00',
  simulateAIResponse: jest.fn(),
}))

describe('useChat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('short-circuits to scenario simulation handler and avoids duplicate MESSAGE_SENT logging', async () => {
    const { result } = renderHook(() => useChat())
    const simulationHandler = jest.fn(async () => true)

    await act(async () => {
      await result.current.handleSendMessage('hello', simulationHandler)
    })

    expect(simulationHandler).toHaveBeenCalledWith('hello', expect.any(Function))
    expect(logAction).not.toHaveBeenCalledWith(
      expect.objectContaining({ actionType: ACTION_TYPES.MESSAGE_SENT })
    )
    expect(result.current.messages).toEqual([])
  })

  test('adds user message and AI response for normal sends', async () => {
    simulateAIResponse.mockResolvedValueOnce({
      type: 'text',
      content: 'AI reply',
      timestamp: '10:00',
    })

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.handleSendMessage('hi')
    })

    await waitFor(() => {
      expect(result.current.messages.some(m => m.isUser && m.content === 'hi')).toBe(true)
      expect(result.current.messages.some(m => !m.isUser && m.content === 'AI reply')).toBe(true)
      expect(result.current.messages.some(m => m.type === 'loading')).toBe(false)
    })

    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: ACTION_TYPES.MESSAGE_SENT,
        messageContent: 'hi',
      })
    )
  })

  test('does not add message when pendingInteractiveMessage is true', async () => {
    simulateAIResponse.mockResolvedValueOnce({
      type: 'text',
      content: 'AI reply',
      timestamp: '10:00',
    })

    const { result } = renderHook(() => useChat())

    act(() => {
      result.current.setPendingInteractiveMessage(true)
    })

    await act(async () => {
      await result.current.handleSendMessage('blocked')
    })

    expect(result.current.messages).toEqual([])
  })
})

