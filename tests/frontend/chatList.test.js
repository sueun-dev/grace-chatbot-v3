import React from 'react'
import { render, screen } from '@testing-library/react'
import ChatList from '@/app/[role]/components/ChatList'

jest.mock('@/app/[role]/components/ChatInput', () => (props) => (
  <div
    data-testid="chat-input"
    data-disabled={String(props.disabled)}
    data-scenario={String(props.scenarioMode)}
  />
))

jest.mock('@/app/[role]/components/ChatMessage', () => (props) => (
  <div>{`MSG:${props.message.type}:${props.message.content || ''}`}</div>
))

describe('ChatList', () => {
  test('scrolls to bottom when messages change', () => {
    const scrollIntoView = jest.fn()
    Element.prototype.scrollIntoView = scrollIntoView

    const baseProps = {
      onSendMessage: jest.fn(),
      onOptionSelect: jest.fn(),
      isLoading: false,
      currentUser: { name: 'User' },
      pendingInteractiveMessage: false,
      scenarioMode: false,
    }

    const { rerender } = render(
      <ChatList
        {...baseProps}
        messages={[{ id: 1, type: 'text', content: 'a', isUser: true }]}
      />
    )

    expect(screen.getByText(/Today/i)).toBeInTheDocument()
    expect(scrollIntoView).toHaveBeenCalledTimes(1)

    rerender(
      <ChatList
        {...baseProps}
        messages={[
          { id: 1, type: 'text', content: 'a', isUser: true },
          { id: 2, type: 'text', content: 'b', isUser: false },
        ]}
      />
    )

    expect(scrollIntoView).toHaveBeenCalledTimes(2)
  })

  test('forwards isLoading and scenarioMode to ChatInput', () => {
    render(
      <ChatList
        messages={[{ id: 1, type: 'text', content: 'x', isUser: true }]}
        onSendMessage={jest.fn()}
        onOptionSelect={jest.fn()}
        isLoading
        currentUser={{ name: 'User' }}
        pendingInteractiveMessage
        scenarioMode
      />
    )

    const chatInput = screen.getByTestId('chat-input')
    expect(chatInput).toHaveAttribute('data-disabled', 'true')
    expect(chatInput).toHaveAttribute('data-scenario', 'true')
  })
})

