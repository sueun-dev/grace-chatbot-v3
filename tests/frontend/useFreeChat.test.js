import { renderHook, act, waitFor } from '@testing-library/react'
import { useFreeChat } from '@/app/[role]/hooks/useFreeChat'
import { logAction, ACTION_TYPES } from '@/utils/clientLogger'

jest.mock('@/utils/clientLogger', () => {
  const actual = jest.requireActual('@/utils/clientLogger')
  return { ...actual, logAction: jest.fn().mockResolvedValue(undefined) }
})

jest.mock('@/app/[role]/components/chatService', () => ({
  generateTimestamp: () => '10:00',
}))

describe('useFreeChat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  test('startFreeChat sets active and appends welcome message', () => {
    const { result } = renderHook(() => useFreeChat())
    const setMessages = jest.fn()

    act(() => {
      result.current.startFreeChat(setMessages)
    })

    expect(result.current.isFreeChatActive).toBe(true)
    expect(setMessages).toHaveBeenCalled()
    expect(logAction).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: ACTION_TYPES.CHAT_STARTED })
    )
  })

  test('sendMessageToAI returns false when not active', async () => {
    const { result } = renderHook(() => useFreeChat())
    const ok = await result.current.sendMessageToAI('hi', jest.fn(), jest.fn())
    expect(ok).toBe(false)
  })

  test('sendMessageToAI sends message, calls API, and appends AI response', async () => {
    const { result } = renderHook(() => useFreeChat())
    const setMessages = jest.fn()
    const setIsLoading = jest.fn()

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: 'AI response' }),
    })

    act(() => {
      result.current.startFreeChat(setMessages)
    })

    await act(async () => {
      const ok = await result.current.sendMessageToAI('hello', setMessages, setIsLoading)
      expect(ok).toBe(true)
    })

    // Replay state updates applied to setMessages to ensure both user + AI msgs are present.
    const operations = setMessages.mock.calls.map(call => call[0])
    let messages = []
    operations.forEach(op => {
      messages = typeof op === 'function' ? op(messages) : op
    })

    expect(messages.some(m => m.isUser && m.content === 'hello')).toBe(true)
    expect(messages.some(m => !m.isUser && m.content === 'AI response')).toBe(true)
    expect(messages.some(m => m.type === 'loading')).toBe(false)

    await waitFor(() => {
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: ACTION_TYPES.MESSAGE_SENT })
      )
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: ACTION_TYPES.MESSAGE_RECEIVED })
      )
    })
  })
})

