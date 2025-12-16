import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AiChatbot from '@/app/[role]/components/AiChatbot'
import { useRouter } from 'next/navigation'
import { logAction, ACTION_TYPES } from '@/utils/clientLogger'

import { useChat } from '@/app/[role]/hooks/useChat'
import { useQuestionnaire } from '@/app/[role]/hooks/useQuestionnaire'
import { useScenarioLearning } from '@/app/[role]/hooks/useScenarioLearning'
import { useScenarioSimulationEnhanced } from '@/app/[role]/hooks/useScenarioSimulationEnhanced'
import { useFreeChat } from '@/app/[role]/hooks/useFreeChat'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/utils/clientLogger', () => {
  const actual = jest.requireActual('@/utils/clientLogger')
  return { ...actual, logAction: jest.fn().mockResolvedValue(undefined) }
})

jest.mock('@/app/[role]/components/ChatList', () => (props) => (
  <div>
    <button type="button" onClick={() => props.onOptionSelect('start_free_chat')}>
      start_free_chat
    </button>
    <button type="button" onClick={() => props.onOptionSelect('go_home')}>
      go_home
    </button>
    <button
      type="button"
      onClick={() => props.onOptionSelect({ text: 'Yes', value: 'yes', score: 0, points: 0 })}
    >
      questionnaire_yes
    </button>
    <button type="button" onClick={() => props.onSendMessage('hello')}>
      send_message
    </button>
  </div>
))

jest.mock('@/app/[role]/hooks/useChat', () => ({
  useChat: jest.fn(),
}))
jest.mock('@/app/[role]/hooks/useQuestionnaire', () => ({
  useQuestionnaire: jest.fn(),
}))
jest.mock('@/app/[role]/hooks/useScenarioLearning', () => ({
  useScenarioLearning: jest.fn(),
}))
jest.mock('@/app/[role]/hooks/useScenarioSimulationEnhanced', () => ({
  useScenarioSimulationEnhanced: jest.fn(),
}))
jest.mock('@/app/[role]/hooks/useFreeChat', () => ({
  useFreeChat: jest.fn(),
}))

describe('AiChatbot orchestration', () => {
  const push = jest.fn()
  const setMessages = jest.fn()
  const setIsLoading = jest.fn()

  const resetChat = jest.fn()
  const resetScenarioState = jest.fn()
  const resetSimulationState = jest.fn()

  const startQuestionnaire = jest.fn()
  const handleQuestionnaireOptionSelect = jest.fn()
  const setQuestionnaireState = jest.fn()

  const handleScenarioOptionSelect = jest.fn(() => false)
  const startScenarioLearning = jest.fn()

  const handleSimulationOptionSelect = jest.fn(() => false)
  const handleUserInput = jest.fn()
  const startScenarioSimulation = jest.fn()

  const startFreeChat = jest.fn()
  const sendMessageToAI = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    useRouter.mockReturnValue({ push })

    useChat.mockReturnValue({
      messages: [{ id: 1, type: 'results', riskLevel: { level: 'Low Risk' } }],
      setMessages,
      isLoading: false,
      setIsLoading,
      pendingInteractiveMessage: false,
      setPendingInteractiveMessage: jest.fn(),
      handleSendMessage: jest.fn(),
      handleGeneralOptionSelect: jest.fn(),
      resetChat,
    })

    useQuestionnaire.mockReturnValue({
      questionnaireState: { isActive: false, currentQuestionId: 'intro_question' },
      setQuestionnaireState,
      startQuestionnaire,
      handleQuestionnaireOptionSelect,
    })

    useScenarioLearning.mockReturnValue({
      scenarioState: { isActive: false },
      startScenarioLearning,
      handleScenarioOptionSelect,
      resetScenarioState,
    })

    useScenarioSimulationEnhanced.mockReturnValue({
      simulationState: { waitingForInput: false, isCompletelyDone: false, isActive: false },
      startScenarioSimulation,
      handleSimulationOptionSelect,
      handleUserInput,
      resetSimulationState,
    })

    useFreeChat.mockReturnValue({
      isFreeChatActive: false,
      startFreeChat,
      sendMessageToAI,
      endFreeChat: jest.fn(),
    })
  })

  test('logs page visit and starts questionnaire on mount', async () => {
    render(<AiChatbot />)

    await waitFor(() => {
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: ACTION_TYPES.PAGE_VISITED })
      )
    })

    expect(startQuestionnaire).toHaveBeenCalled()
    await waitFor(() => {
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: ACTION_TYPES.QUESTIONNAIRE_STARTED })
      )
    })
  })

  test('routes start_free_chat option to startFreeChat', async () => {
    render(<AiChatbot />)
    fireEvent.click(screen.getByRole('button', { name: 'start_free_chat' }))

    await waitFor(() => {
      expect(startFreeChat).toHaveBeenCalled()
    })
  })

  test('routes go_home option to reset flows and push home', async () => {
    render(<AiChatbot />)
    fireEvent.click(screen.getByRole('button', { name: 'go_home' }))

    await waitFor(() => {
      expect(resetChat).toHaveBeenCalled()
      expect(resetScenarioState).toHaveBeenCalled()
      expect(resetSimulationState).toHaveBeenCalled()
      expect(setQuestionnaireState).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false, totalScore: 0, currentStep: 0 })
      )
      expect(push).toHaveBeenCalledWith('/')
    })
  })

  test('delegates option to questionnaire handler when questionnaire is active', async () => {
    useQuestionnaire.mockReturnValueOnce({
      questionnaireState: { isActive: true, currentQuestionId: 'intro_question' },
      setQuestionnaireState,
      startQuestionnaire,
      handleQuestionnaireOptionSelect,
    })

    render(<AiChatbot />)
    fireEvent.click(screen.getByRole('button', { name: 'questionnaire_yes' }))

    await waitFor(() => {
      expect(handleQuestionnaireOptionSelect).toHaveBeenCalled()
    })
  })

  test('uses free chat sender when isFreeChatActive is true', async () => {
    useFreeChat.mockReturnValueOnce({
      isFreeChatActive: true,
      startFreeChat,
      sendMessageToAI,
      endFreeChat: jest.fn(),
    })

    render(<AiChatbot />)
    fireEvent.click(screen.getByRole('button', { name: 'send_message' }))

    await waitFor(() => {
      expect(sendMessageToAI).toHaveBeenCalledWith('hello', setMessages, setIsLoading)
    })
  })

  test('uses chat handler when not in free chat', async () => {
    const handleSendMessage = jest.fn()
    useChat.mockReturnValueOnce({
      messages: [],
      setMessages,
      isLoading: false,
      setIsLoading,
      pendingInteractiveMessage: false,
      setPendingInteractiveMessage: jest.fn(),
      handleSendMessage,
      handleGeneralOptionSelect: jest.fn(),
      resetChat,
    })

    render(<AiChatbot />)
    fireEvent.click(screen.getByRole('button', { name: 'send_message' }))

    await waitFor(() => {
      expect(handleSendMessage).toHaveBeenCalledWith('hello', handleUserInput)
    })
  })
})

