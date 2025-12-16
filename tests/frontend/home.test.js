import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Home from '@/app/page'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { logAction, ACTION_TYPES } from '@/utils/clientLogger'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/utils/clientLogger', () => {
  const actual = jest.requireActual('@/utils/clientLogger')
  return {
    ...actual,
    logAction: jest.fn().mockResolvedValue(undefined),
  }
})

describe('Home page flow', () => {
  beforeEach(() => {
    sessionStorage.clear()
    jest.clearAllMocks()
  })

  test('logs page visit, verifies code, and navigates to ai-chatbot', async () => {
    const push = jest.fn()
    useRouter.mockReturnValue({ push })

    render(<Home />)

    await waitFor(() => {
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: ACTION_TYPES.PAGE_VISITED })
      )
    })

    fireEvent.click(screen.getByRole('button', { name: /let's get started/i }))
    expect(screen.getByText('Section Code Verification')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Enter 6-character code'), {
      target: { value: 'ABC123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Verification successful')
      expect(screen.getByText('Welcome to the Alcohol Prevention Training')).toBeInTheDocument()
    })

    expect(sessionStorage.getItem('userIdentifier')).toBe('ABC123')
    expect(sessionStorage.getItem('dwellStart')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

    await waitFor(() => {
      expect(logAction).toHaveBeenCalledWith(
        expect.objectContaining({ actionType: ACTION_TYPES.CHAT_STARTED })
      )
      expect(push).toHaveBeenCalledWith('/ai-chatbot')
    })
  })
})

