/**
 * Unit tests for clientLogger utility
 * Tests client-side logging functions and action types
 */

import { logAction, ACTION_TYPES } from '@/utils/clientLogger';

// Mock fetch globally
global.fetch = jest.fn();

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true
});

// Mock Date.now() and Math.random() for consistent session ID generation
const mockDateNow = 1704067200000; // 2024-01-01T00:00:00.000Z
const mockRandom = 0.123456789;
// When Math.random() returns 0.123456789, toString(36).substr(2,9) = "4fzzzxjyl"

describe('Client Logger Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.clear();
    global.fetch.mockClear();

    // Setup default successful response
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('logAction', () => {
    test('should log action with user identifier and session ID', async () => {
      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'userIdentifier') return 'USER123';
        if (key === 'sessionId') return 'session_existing';
        return null;
      });

      const actionData = {
        actionType: 'BUTTON_CLICKED',
        actionDetails: 'Start button clicked'
      };

      await logAction(actionData);

      expect(global.fetch).toHaveBeenCalledWith('/api/log-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...actionData,
          userIdentifier: 'USER123',
          sessionId: 'session_existing',
          chatbotType: 'general-ai'
        })
      });
    });

    test('should generate new session ID if not exists', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);
      jest.spyOn(Math, 'random').mockReturnValue(mockRandom);

      sessionStorageMock.getItem.mockReturnValue(null);

      const actionData = {
        actionType: 'FIRST_ACTION'
      };

      await logAction(actionData);

      // Check that session ID was generated and stored
      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'sessionId',
        `session_${mockDateNow}_4fzzzxjyl`
      );

      // Check that the generated session ID was used in the request
      expect(global.fetch).toHaveBeenCalledWith('/api/log-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining(`session_${mockDateNow}_4fzzzxjyl`)
      });
    });

    test('should handle missing user identifier', async () => {
      sessionStorageMock.getItem.mockReturnValue(null);

      const actionData = {
        actionType: 'ANONYMOUS_ACTION'
      };

      await logAction(actionData);

      expect(global.fetch).toHaveBeenCalledWith('/api/log-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('"userIdentifier":""')
      });
    });

    test('should not overwrite existing session ID', async () => {
      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'sessionId') return 'existing_session_123';
        return null;
      });

      await logAction({ actionType: 'TEST' });

      expect(sessionStorageMock.setItem).not.toHaveBeenCalledWith(
        'sessionId',
        expect.any(String)
      );
    });

    test('should include all action data in request', async () => {
      const complexActionData = {
        actionType: 'QUESTIONNAIRE_OPTION_SELECTED',
        actionDetails: 'Selected option A',
        questionId: 'q1',
        response: 'never',
        score: 0,
        scenarioType: 'peer_pressure',
        messageContent: 'User selected never',
        optionSelected: 'option_a'
      };

      await logAction(complexActionData);

      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body).toMatchObject({
        ...complexActionData,
        chatbotType: 'general-ai'
      });
    });

    test('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await logAction({ actionType: 'TEST' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error logging action:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    test('should handle API error responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await logAction({ actionType: 'TEST' });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to log action');

      consoleErrorSpy.mockRestore();
    });

    test('should not throw error on logging failure', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Fatal error'));

      const actionData = { actionType: 'TEST' };

      // Should not throw, just log error
      await expect(logAction(actionData)).resolves.toBeUndefined();
    });
  });

  describe('Session ID Generation', () => {
    test('should generate unique session IDs', async () => {
      const randomValues = [0.123, 0.456, 0.789];
      let randomIndex = 0;

      jest.spyOn(Math, 'random').mockImplementation(() => randomValues[randomIndex++]);
      jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);

      sessionStorageMock.getItem.mockReturnValue(null);

      // Generate three session IDs
      const sessionIds = [];
      for (let i = 0; i < 3; i++) {
        sessionStorageMock.clear();
        sessionStorageMock.getItem.mockReturnValue(null);
        await logAction({ actionType: `ACTION_${i}` });

        const setItemCall = sessionStorageMock.setItem.mock.calls[i];
        if (setItemCall && setItemCall[0] === 'sessionId') {
          sessionIds.push(setItemCall[1]);
        }
      }

      // Check that all session IDs are unique
      const uniqueSessionIds = new Set(sessionIds);
      expect(uniqueSessionIds.size).toBe(sessionIds.length);
    });

    test('should include timestamp in session ID', async () => {
      const testTimestamp = 1704067200000;
      jest.spyOn(Date, 'now').mockReturnValue(testTimestamp);

      sessionStorageMock.getItem.mockReturnValue(null);

      await logAction({ actionType: 'TEST' });

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'sessionId',
        expect.stringContaining(`session_${testTimestamp}`)
      );
    });
  });

  describe('ACTION_TYPES', () => {
    test('should have all required action types', () => {
      const expectedActionTypes = [
        'CODE_ENTERED',
        'CODE_VERIFIED',
        'PAGE_VISITED',
        'CHAT_STARTED',
        'QUESTIONNAIRE_STARTED',
        'QUESTIONNAIRE_OPTION_SELECTED',
        'QUESTIONNAIRE_COMPLETED',
        'SCENARIO_STARTED',
        'SCENARIO_OPTION_SELECTED',
        'SCENARIO_COMPLETED',
        'SIMULATION_STARTED',
        'SIMULATION_INPUT',
        'SIMULATION_OPTION_SELECTED',
        'SIMULATION_COMPLETED',
        'MESSAGE_SENT',
        'MESSAGE_RECEIVED',
        'OPTION_SELECTED',
        'BUTTON_CLICKED',
        'SESSION_ENDED'
      ];

      expectedActionTypes.forEach(actionType => {
        expect(ACTION_TYPES).toHaveProperty(actionType);
      });
    });

    test('should have correct string values for action types', () => {
      expect(ACTION_TYPES.CODE_ENTERED).toBe('code_entered');
      expect(ACTION_TYPES.QUESTIONNAIRE_STARTED).toBe('questionnaire_started');
      expect(ACTION_TYPES.MESSAGE_SENT).toBe('message_sent');
    });

    test('should be used correctly in logAction', async () => {
      const actionData = {
        actionType: ACTION_TYPES.BUTTON_CLICKED,
        actionDetails: 'Using constant action type'
      };

      await logAction(actionData);

      expect(global.fetch).toHaveBeenCalledWith('/api/log-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: expect.stringContaining('"actionType":"button_clicked"')
      });
    });
  });

  describe('Integration Scenarios', () => {
    test('should handle complete user flow logging', async () => {
      // Simulate a complete user journey
      const userJourney = [
        { actionType: ACTION_TYPES.PAGE_VISITED, pageVisited: 'home' },
        { actionType: ACTION_TYPES.CODE_ENTERED, actionDetails: 'Entry code submitted' },
        { actionType: ACTION_TYPES.CODE_VERIFIED, actionDetails: 'Code verified successfully' },
        { actionType: ACTION_TYPES.CHAT_STARTED },
        { actionType: ACTION_TYPES.QUESTIONNAIRE_STARTED },
        { actionType: ACTION_TYPES.QUESTIONNAIRE_OPTION_SELECTED, response: 'yes', score: 1 },
        { actionType: ACTION_TYPES.QUESTIONNAIRE_COMPLETED, totalScore: 15 },
        { actionType: ACTION_TYPES.SESSION_ENDED }
      ];

      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'userIdentifier') return 'USER_JOURNEY_TEST';
        if (key === 'sessionId') return 'session_journey_123';
        return null;
      });

      for (const action of userJourney) {
        await logAction(action);
      }

      expect(global.fetch).toHaveBeenCalledTimes(userJourney.length);

      // Verify all actions were logged with correct user/session
      userJourney.forEach((action, index) => {
        const callBody = JSON.parse(global.fetch.mock.calls[index][1].body);
        expect(callBody).toMatchObject({
          ...action,
          userIdentifier: 'USER_JOURNEY_TEST',
          sessionId: 'session_journey_123',
          chatbotType: 'general-ai'
        });
      });
    });

    test('should handle rapid successive logging', async () => {
      const actions = Array.from({ length: 10 }, (_, i) => ({
        actionType: ACTION_TYPES.MESSAGE_SENT,
        messageContent: `Message ${i}`
      }));

      // Log all actions concurrently
      await Promise.all(actions.map(action => logAction(action)));

      expect(global.fetch).toHaveBeenCalledTimes(10);
    });

    test('should handle session expiry and regeneration', async () => {
      // First action with existing session
      sessionStorageMock.getItem.mockImplementation((key) => {
        if (key === 'sessionId') return 'old_session';
        return null;
      });

      await logAction({ actionType: 'FIRST_ACTION' });

      // Simulate session expiry (clear storage)
      sessionStorageMock.clear();
      sessionStorageMock.getItem.mockReturnValue(null);

      jest.spyOn(Date, 'now').mockReturnValue(mockDateNow);
      jest.spyOn(Math, 'random').mockReturnValue(mockRandom);

      // Second action should generate new session
      await logAction({ actionType: 'AFTER_EXPIRY' });

      const firstCallBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      const secondCallBody = JSON.parse(global.fetch.mock.calls[1][1].body);

      expect(firstCallBody.sessionId).toBe('old_session');
      expect(secondCallBody.sessionId).toBe(`session_${mockDateNow}_4fzzzxjyl`);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle very large action data', async () => {
      const largeMessage = 'x'.repeat(10000);
      const actionData = {
        actionType: ACTION_TYPES.MESSAGE_SENT,
        messageContent: largeMessage,
        actionDetails: 'Large message test'
      };

      await logAction(actionData);

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.messageContent).toBe(largeMessage);
    });

    test('should handle special characters in action data', async () => {
      const actionData = {
        actionType: ACTION_TYPES.MESSAGE_SENT,
        messageContent: 'Message with 特殊文字 and emoji 😀',
        actionDetails: 'Special chars: \n\t\r"\'\\',
        response: '{"nested": "json"}'
      };

      await logAction(actionData);

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody).toMatchObject(actionData);
    });

    test('should not block on logging failures', async () => {
      // Make fetch very slow
      global.fetch.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 5000))
      );

      const startTime = performance.now();

      // This should not wait for the 5 second timeout
      const logPromise = logAction({ actionType: 'TEST' });

      // The function should return quickly even though fetch is slow
      await Promise.race([
        logPromise,
        new Promise(resolve => setTimeout(resolve, 100))
      ]);

      const endTime = performance.now();

      // Should complete much faster than the 5 second fetch timeout
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});