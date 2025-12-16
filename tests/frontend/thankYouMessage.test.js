import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ThankYouMessage from '@/app/[role]/components/message-types/ThankYouMessage'

describe('ThankYouMessage', () => {
  test('calls onGoHome with go_home when button clicked', () => {
    const onGoHome = jest.fn()
    const message = { id: 1, type: 'thank-you', timestamp: '10:00' }

    render(<ThankYouMessage message={message} onGoHome={onGoHome} />)

    fireEvent.click(screen.getByRole('button', { name: /go to home/i }))
    expect(onGoHome).toHaveBeenCalledWith('go_home')
  })
})

