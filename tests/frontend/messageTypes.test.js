import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import OptionsMessage from '@/app/[role]/components/message-types/OptionsMessage'
import MultipleChoiceMessage from '@/app/[role]/components/message-types/MultipleChoiceMessage'
import ScenarioMessage from '@/app/[role]/components/message-types/ScenarioMessage'
import CompletionMessage from '@/app/[role]/components/message-types/CompletionMessage'

describe('Message components', () => {
  describe('OptionsMessage', () => {
    test('calls onOptionSelect and disables buttons after selection (2 options)', async () => {
      const onOptionSelect = jest.fn()
      const message = {
        id: 1,
        type: 'options',
        content: 'Pick one',
        options: ['A', 'B'],
        timestamp: '10:00',
        isUser: false,
      }

      render(<OptionsMessage message={message} onOptionSelect={onOptionSelect} />)

      fireEvent.click(screen.getByRole('button', { name: /^A$/ }))
      expect(onOptionSelect).toHaveBeenCalledWith('A')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^A$/ })).toBeDisabled()
        expect(screen.getByRole('button', { name: /^B$/ })).toBeDisabled()
      })
    })

    test('renders suggestions and disables radios after selection (3+ options)', async () => {
      const onOptionSelect = jest.fn()
      const options = [
        { text: 'One', value: 'one' },
        { text: 'Two', value: 'two' },
        { text: 'Three', value: 'three' },
      ]
      const message = {
        id: 2,
        type: 'options',
        content: 'Pick one',
        options,
        suggestions: ['Try again', 'Be specific'],
        timestamp: '10:00',
        isUser: false,
      }

      render(<OptionsMessage message={message} onOptionSelect={onOptionSelect} />)

      expect(screen.getByText('Suggestions for improvement:')).toBeInTheDocument()
      expect(screen.getByText('Try again')).toBeInTheDocument()

      const radio = screen.getByRole('radio', { name: 'One' })
      fireEvent.click(radio)

      expect(onOptionSelect).toHaveBeenCalledWith(options[0])

      await waitFor(() => {
        expect(screen.getByRole('radio', { name: 'One' })).toBeDisabled()
        expect(screen.getByRole('radio', { name: 'Two' })).toBeDisabled()
        expect(screen.getByRole('radio', { name: 'Three' })).toBeDisabled()
      })
    })
  })

  describe('MultipleChoiceMessage', () => {
    test('requires selection before Next and calls onAnswer', () => {
      const onAnswer = jest.fn()
      const message = {
        id: 123,
        type: 'multiple-choice',
        content: 'Question?',
        options: ['1 hour', '15 minutes'],
        timestamp: '10:00',
        isUser: false,
      }

      render(<MultipleChoiceMessage message={message} onAnswer={onAnswer} />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).toBeDisabled()

      fireEvent.click(screen.getByRole('radio', { name: '1 hour' }))
      expect(nextButton).toBeEnabled()

      fireEvent.click(nextButton)
      expect(onAnswer).toHaveBeenCalledWith('1 hour')
      expect(nextButton).toBeDisabled()
    })
  })

  describe('ScenarioMessage', () => {
    test('shows Continue after countdown for scenario content and emits continue_scenario', () => {
      jest.useFakeTimers()
      const onAnswer = jest.fn()
      const message = {
        id: 10,
        type: 'scenario',
        scenarioData: {
          title: 'Scenario Title',
          learningPoints: ['Point 1'],
          sections: [],
        },
        timestamp: '10:00',
        isUser: false,
      }

      render(<ScenarioMessage message={message} onAnswer={onAnswer} />)
      expect(screen.getByText(/Continue button will appear in 2 second/i)).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(2000)
      })

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      expect(onAnswer).toHaveBeenCalledWith({ type: 'continue_scenario' })

      jest.useRealTimers()
    })

    test('renders myths section content when provided', () => {
      const onAnswer = jest.fn()
      const message = {
        id: 12,
        type: 'scenario',
        scenarioData: {
          title: 'Myths vs. Facts',
          sections: [
            {
              content: "Let's clear up some common misconceptions:",
              myths: [
                {
                  myth: 'Drinking coffee will sober you up.',
                  fact: 'Only time helps your body process alcohol.'
                },
                {
                  myth: "If I don't feel drunk, I'm okay to drive.",
                  fact: 'Alcohol can impair judgment before you feel drunk.'
                }
              ]
            }
          ]
        },
        timestamp: '10:00',
        isUser: false,
      }

      render(<ScenarioMessage message={message} onAnswer={onAnswer} />)

      expect(screen.getAllByText('Myth').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Fact').length).toBeGreaterThan(0)
      expect(screen.getByText('Drinking coffee will sober you up.')).toBeInTheDocument()
      expect(screen.getByText('Only time helps your body process alcohol.')).toBeInTheDocument()
      expect(screen.getByText("If I don't feel drunk, I'm okay to drive.")).toBeInTheDocument()
      expect(screen.getByText('Alcohol can impair judgment before you feel drunk.')).toBeInTheDocument()
    })

    test('shows feedback for question and emits continue_question', () => {
      const onAnswer = jest.fn()
      const message = {
        id: 11,
        type: 'scenario',
        questionData: {
          question: 'Pick the best answer',
          options: [
            { text: 'Option A', value: 'a' },
            { text: 'Option B', value: 'b' },
          ],
          correctAnswer: 'a',
          correctFeedback: 'Correct!',
          incorrectFeedback: 'Nope.',
        },
        timestamp: '10:00',
        isUser: false,
      }

      render(<ScenarioMessage message={message} onAnswer={onAnswer} />)

      fireEvent.click(screen.getByRole('button', { name: 'Option B' }))
      expect(screen.getByText('Incorrect!')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
      expect(onAnswer).toHaveBeenCalledWith({ type: 'continue_question' })
    })
  })

  describe('CompletionMessage', () => {
    test('copies completion code and toggles button text', async () => {
      jest.useFakeTimers()
      const writeText = jest.fn(() => Promise.resolve())
      Object.assign(navigator, { clipboard: { writeText } })

      const message = {
        id: 99,
        type: 'completion-code',
        content: 'ABC123',
        timestamp: '10:00',
        isUser: false,
      }

      render(<CompletionMessage message={message} />)

      fireEvent.click(screen.getByRole('button', { name: 'Copy Code' }))
      expect(writeText).toHaveBeenCalledWith('ABC123')

      // handleCopy awaits clipboard writes; flush microtasks before asserting UI state
      await act(async () => {})
      expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(2000)
      })
      expect(screen.getByRole('button', { name: 'Copy Code' })).toBeInTheDocument()

      jest.useRealTimers()
    })

    test('renders plain completion message without copy controls', () => {
      const message = {
        id: 100,
        type: 'completion-message',
        content: 'Done',
        timestamp: '10:00',
        isUser: false,
      }

      render(<CompletionMessage message={message} />)
      expect(screen.getByText('Done')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    })
  })
})
