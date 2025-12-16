import React from 'react'
import { render, screen } from '@testing-library/react'
import ChatBox from '@/app/[role]/page'
import { useParams } from 'next/navigation'

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
}))

jest.mock('@/app/[role]/components/AiChatbot', () => () => <div>AI_CHATBOT</div>)
jest.mock('@/app/[role]/components/MedicalProfessionalChatbot', () => () => <div>MEDICAL_CHATBOT</div>)
jest.mock('@/app/[role]/components/StudentChatbot', () => () => <div>STUDENT_CHATBOT</div>)

describe('Role page router', () => {
  test('renders AiChatbot for ai-chatbot role', () => {
    useParams.mockReturnValue({ role: 'ai-chatbot' })
    render(<ChatBox />)
    expect(screen.getByText('AI_CHATBOT')).toBeInTheDocument()
  })

  test('renders MedicalProfessionalChatbot for medical-professional role', () => {
    useParams.mockReturnValue({ role: 'medical-professional' })
    render(<ChatBox />)
    expect(screen.getByText('MEDICAL_CHATBOT')).toBeInTheDocument()
  })

  test('renders StudentChatbot for student role', () => {
    useParams.mockReturnValue({ role: 'student' })
    render(<ChatBox />)
    expect(screen.getByText('STUDENT_CHATBOT')).toBeInTheDocument()
  })

  test('renders empty shell for unknown role', () => {
    useParams.mockReturnValue({ role: 'unknown' })
    render(<ChatBox />)
    expect(screen.queryByText('AI_CHATBOT')).not.toBeInTheDocument()
    expect(screen.queryByText('MEDICAL_CHATBOT')).not.toBeInTheDocument()
    expect(screen.queryByText('STUDENT_CHATBOT')).not.toBeInTheDocument()
  })
})

