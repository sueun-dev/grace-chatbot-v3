import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ChatInput from '@/app/[role]/components/ChatInput'

describe('ChatInput', () => {
  test('disables input and send when scenarioMode is false', () => {
    const onSendMessage = jest.fn()
    render(<ChatInput onSendMessage={onSendMessage} scenarioMode={false} />)

    const input = screen.getByPlaceholderText('Type your message here...')
    const sendButton = screen.getByRole('button', { name: /send message/i })

    expect(input).toBeDisabled()
    expect(sendButton).toBeDisabled()
  })

  test('sends trimmed message on click when scenarioMode is true', () => {
    const onSendMessage = jest.fn()
    render(<ChatInput onSendMessage={onSendMessage} scenarioMode />)

    const input = screen.getByPlaceholderText('Type your response to the scenario...')
    const sendButton = screen.getByRole('button', { name: /send message/i })

    fireEvent.change(input, { target: { value: '  hello  ' } })
    fireEvent.click(sendButton)

    expect(onSendMessage).toHaveBeenCalledWith('hello')
    expect(input).toHaveValue('')
  })

  test('sends on Enter but not on Shift+Enter', () => {
    const onSendMessage = jest.fn()
    render(<ChatInput onSendMessage={onSendMessage} scenarioMode />)

    const input = screen.getByPlaceholderText('Type your response to the scenario...')

    fireEvent.change(input, { target: { value: 'hi' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(onSendMessage).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false })
    expect(onSendMessage).toHaveBeenCalledWith('hi')
  })

  test('shows interactive placeholder when pendingInteractiveMessage is true', () => {
    render(<ChatInput pendingInteractiveMessage scenarioMode={false} />)
    expect(screen.getByPlaceholderText('Please respond to the question above...')).toBeInTheDocument()
  })
})

