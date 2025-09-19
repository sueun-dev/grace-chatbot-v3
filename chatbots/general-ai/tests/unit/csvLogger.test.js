/**
 * Unit tests for csvLogger utility
 * Tests CSV file creation, writing, and user log management
 */

import fs from 'fs';
import path from 'path';
import {
  ensureCSVDirectory,
  initializeUserCSV,
  logUserAction,
  getUserLogs,
  getAllUsers
} from '@/utils/csvLogger';

// Mock fs module
jest.mock('fs');

describe('CSV Logger Unit Tests', () => {
  const mockCsvDir = path.join(process.cwd(), 'user_logs');
  const testUserId = 'test_user_123';
  const mockCsvPath = path.join(mockCsvDir, `user_${testUserId}.csv`);

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    fs.existsSync.mockReturnValue(false);
    fs.mkdirSync.mockReturnValue(undefined);
    fs.writeFileSync.mockReturnValue(undefined);
    fs.appendFileSync.mockReturnValue(undefined);
    fs.readdirSync.mockReturnValue([]);
  });

  describe('ensureCSVDirectory', () => {
    test('should create directory if it does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      ensureCSVDirectory();

      expect(fs.existsSync).toHaveBeenCalledWith(mockCsvDir);
      expect(fs.mkdirSync).toHaveBeenCalledWith(mockCsvDir, { recursive: true });
    });

    test('should not create directory if it already exists', () => {
      fs.existsSync.mockReturnValue(true);

      ensureCSVDirectory();

      expect(fs.existsSync).toHaveBeenCalledWith(mockCsvDir);
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('initializeUserCSV', () => {
    test('should create CSV file with headers for new user', () => {
      fs.existsSync.mockReturnValue(false);

      initializeUserCSV(testUserId);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`user_${testUserId}.csv`),
        expect.stringContaining('timestamp,user_identifier,session_id')
      );
    });

    test('should not create file if it already exists', () => {
      fs.existsSync.mockImplementation((path) => {
        if (path === mockCsvDir) return true;
        if (path.includes(`user_${testUserId}.csv`)) return true;
        return false;
      });

      initializeUserCSV(testUserId);

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    test('should handle special characters in user identifier', () => {
      const specialUserId = 'user@#$%^&*()';
      fs.existsSync.mockReturnValue(false);

      initializeUserCSV(specialUserId);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('user_user_________.csv'),  // 9 special chars = 9 underscores
        expect.any(String)
      );
    });

    test('should handle null or undefined user identifier', () => {
      fs.existsSync.mockReturnValue(false);

      initializeUserCSV(null);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('user_unknown.csv'),
        expect.any(String)
      );
    });
  });

  describe('logUserAction', () => {
    test('should log action to user-specific CSV file', () => {
      const actionData = {
        userIdentifier: testUserId,
        sessionId: 'session_123',
        actionType: 'BUTTON_CLICKED',
        actionDetails: 'Start button clicked',
        messageContent: 'Hello',
        score: 100
      };

      fs.existsSync.mockImplementation((path) => {
        if (path === mockCsvDir) return true;
        return false;
      });

      logUserAction(actionData);

      // Check that file was created with headers
      expect(fs.writeFileSync).toHaveBeenCalled();

      // Check that data was appended
      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`user_${testUserId}.csv`),
        expect.stringContaining(actionData.sessionId)
      );
    });

    test('should escape CSV special characters', () => {
      const actionData = {
        userIdentifier: testUserId,
        messageContent: 'Message with, comma and "quotes" and\nnewline',
        actionType: 'MESSAGE_SENT'
      };

      fs.existsSync.mockImplementation((path) => {
        if (path === mockCsvDir) return true;
        return false;
      });

      logUserAction(actionData);

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"Message with, comma and ""quotes"" and\nnewline"')
      );
    });

    test('should handle missing user identifier', () => {
      const actionData = {
        actionType: 'ANONYMOUS_ACTION'
      };

      fs.existsSync.mockImplementation((path) => {
        if (path === mockCsvDir) return true;
        return false;
      });

      logUserAction(actionData);

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.stringContaining('user_unknown.csv'),
        expect.any(String)
      );
    });

    test('should include timestamp in logged data', () => {
      const actionData = {
        userIdentifier: testUserId,
        actionType: 'TEST_ACTION'
      };

      fs.existsSync.mockImplementation((path) => {
        if (path === mockCsvDir) return true;
        return false;
      });

      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      const originalDate = global.Date;
      global.Date = jest.fn(() => mockDate);
      global.Date.now = originalDate.now;

      logUserAction(actionData);

      expect(fs.appendFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('2024-01-01T12:00:00.000Z')
      );

      global.Date = originalDate;
    });
  });

  describe('getUserLogs', () => {
    test('should return empty array if file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const logs = getUserLogs(testUserId);

      expect(logs).toEqual([]);
    });

    test('should parse and return user logs correctly', () => {
      const csvContent = `timestamp,user_identifier,session_id,action_type,action_details,question_id,response,score,scenario_type,message_content,option_selected,page_visited,chatbot_type
2024-01-01T12:00:00.000Z,${testUserId},session_123,BUTTON_CLICKED,Start clicked,,,,,Hello,,,general-ai
2024-01-01T12:01:00.000Z,${testUserId},session_123,MESSAGE_SENT,User message,,,,,Hi there,,,general-ai`;

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(csvContent);

      const logs = getUserLogs(testUserId);

      expect(logs).toHaveLength(2);
      expect(logs[0]).toMatchObject({
        timestamp: '2024-01-01T12:00:00.000Z',
        user_identifier: testUserId,
        session_id: 'session_123',
        action_type: 'BUTTON_CLICKED'
      });
    });

    test('should handle empty CSV file', () => {
      const csvContent = 'timestamp,user_identifier,session_id,action_type\n';

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(csvContent);

      const logs = getUserLogs(testUserId);

      expect(logs).toEqual([]);
    });

    test('should filter out empty lines', () => {
      const csvContent = `timestamp,user_identifier,session_id,action_type
2024-01-01T12:00:00.000Z,${testUserId},session_123,TEST_ACTION

2024-01-01T12:01:00.000Z,${testUserId},session_123,ANOTHER_ACTION`;

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(csvContent);

      const logs = getUserLogs(testUserId);

      expect(logs).toHaveLength(2);
    });
  });

  describe('getAllUsers', () => {
    test('should return empty array when no CSV files exist', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([]);

      const users = getAllUsers();

      expect(users).toEqual([]);
    });

    test('should return list of users from CSV files', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([
        'user_alice.csv',
        'user_bob_123.csv',
        'user_charlie.csv',
        'other_file.txt'
      ]);

      const users = getAllUsers();

      expect(users).toEqual(['alice', 'bob_123', 'charlie']);
    });

    test('should handle directory not existing', () => {
      fs.existsSync.mockReturnValue(false);

      const users = getAllUsers();

      expect(fs.mkdirSync).toHaveBeenCalledWith(mockCsvDir, { recursive: true });
      expect(users).toEqual([]);
    });

    test('should ignore non-CSV files and files not matching pattern', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue([
        'user_valid.csv',
        'invalid.csv',
        'user_valid.txt',
        '.hidden_user.csv',
        'user_.csv', // Edge case: empty user id
        'temp_user_file.csv',
        'users.csv' // Not matching pattern
      ]);

      const users = getAllUsers();

      expect(users).toEqual(['valid', '']); // Only 'user_valid.csv' and 'user_.csv' match
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle file system errors gracefully', () => {
      fs.existsSync.mockImplementation(() => {
        throw new Error('File system error');
      });

      expect(() => ensureCSVDirectory()).toThrow('File system error');
    });

    test('should handle very long user identifiers', () => {
      const longUserId = 'a'.repeat(300);
      fs.existsSync.mockReturnValue(false);

      initializeUserCSV(longUserId);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`user_${'a'.repeat(300)}.csv`),
        expect.any(String)
      );
    });

    test('should handle concurrent writes to same user file', () => {
      const actionData1 = {
        userIdentifier: testUserId,
        actionType: 'ACTION_1'
      };

      const actionData2 = {
        userIdentifier: testUserId,
        actionType: 'ACTION_2'
      };

      fs.existsSync.mockImplementation((path) => {
        if (path === mockCsvDir) return true;
        if (path.includes('.csv')) return true;
        return false;
      });

      logUserAction(actionData1);
      logUserAction(actionData2);

      expect(fs.appendFileSync).toHaveBeenCalledTimes(2);
    });

    test('should handle malformed CSV content when reading', () => {
      const malformedCsv = `timestamp,user_identifier
2024-01-01T12:00:00.000Z,${testUserId},extra,fields,that,should,not,be,here
incomplete_line`;

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(malformedCsv);

      const logs = getUserLogs(testUserId);

      // Should still parse what it can
      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe('Performance Considerations', () => {
    test('should handle large number of users efficiently', () => {
      const userFiles = Array.from({ length: 3000 }, (_, i) => `user_user${i}.csv`);

      fs.existsSync.mockReturnValue(true);
      fs.readdirSync.mockReturnValue(userFiles);

      const startTime = performance.now();
      const users = getAllUsers();
      const endTime = performance.now();

      expect(users).toHaveLength(3000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
    });

    test('should handle large log files efficiently', () => {
      // Simulate a large CSV with many entries
      const headers = 'timestamp,user_identifier,session_id,action_type';
      const rows = Array.from({ length: 10000 }, (_, i) =>
        `2024-01-01T12:00:${i}.000Z,${testUserId},session_${i},ACTION_${i}`
      );
      const largeCsv = [headers, ...rows].join('\n');

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(largeCsv);

      const startTime = performance.now();
      const logs = getUserLogs(testUserId);
      const endTime = performance.now();

      expect(logs).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete in less than 2 seconds
    });
  });
});