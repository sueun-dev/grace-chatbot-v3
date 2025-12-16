import React from 'react'
import { render, screen } from '@testing-library/react'
import ChatMessage from '@/app/[role]/components/ChatMessage'

jest.mock('@/app/[role]/components/message-types/MultipleChoiceMessage', () => () => <div>MultipleChoice</div>)
jest.mock('@/app/[role]/components/message-types/SuccessMessage', () => () => <div>Success</div>)
jest.mock('@/app/[role]/components/message-types/OptionsMessage', () => () => <div>Options</div>)
jest.mock('@/app/[role]/components/message-types/TextMessage', () => (props) => (
  <div>{`Text:${props.userName || 'Sky'}`}</div>
))
jest.mock('@/app/[role]/components/message-types/LoadingMessage', () => () => <div>Loading</div>)
jest.mock('@/app/[role]/components/message-types/ResultsMessage', () => () => <div>Results</div>)
jest.mock('@/app/[role]/components/message-types/ScenarioMessage', () => () => <div>Scenario</div>)
jest.mock('@/app/[role]/components/message-types/ScenarioSimulationMessage', () => () => <div>ScenarioSimulation</div>)
jest.mock('@/app/[role]/components/message-types/MotivationalMessage', () => () => <div>Motivational</div>)
jest.mock('@/app/[role]/components/message-types/ThankYouMessage', () => () => <div>ThankYou</div>)
jest.mock('@/app/[role]/components/message-types/CompletionMessage', () => () => <div>Completion</div>)

describe('ChatMessage type routing', () => {
  test('renders loading message', () => {
    render(<ChatMessage message={{ id: 1, type: 'loading' }} />)
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  test('renders user text message with User label', () => {
    render(<ChatMessage message={{ id: 2, type: 'text' }} isUser currentUser={{ avatar: '/x.png' }} />)
    expect(screen.getByText('Text:User')).toBeInTheDocument()
  })

  test('routes known bot message types', () => {
    const cases = [
      ['multiple-choice', 'MultipleChoice'],
      ['success', 'Success'],
      ['options', 'Options'],
      ['results', 'Results'],
      ['scenario', 'Scenario'],
      ['scenario-simulation', 'ScenarioSimulation'],
      ['motivational', 'Motivational'],
      ['thank-you', 'ThankYou'],
      ['completion-code', 'Completion'],
      ['completion-message', 'Completion'],
    ]

    cases.forEach(([type, label]) => {
      const { unmount } = render(<ChatMessage message={{ id: type, type }} />)
      expect(screen.getByText(label)).toBeInTheDocument()
      unmount()
    })
  })

  test('defaults to TextMessage for unknown types', () => {
    render(<ChatMessage message={{ id: 3, type: 'unknown' }} />)
    expect(screen.getByText('Text:Sky')).toBeInTheDocument()
  })
})
