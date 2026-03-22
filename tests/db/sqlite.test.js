/**
 * SQLite database layer tests
 * Tests data integrity, concurrency, session merging, and CSV export
 */
import fs from 'fs';
import path from 'path';

const TEST_DB_DIR = path.join(process.cwd(), 'temp', `jest-sqlite-${process.pid}-${Date.now()}`);

beforeAll(() => {
  process.env.DB_PATH = path.join(TEST_DB_DIR, 'test.db');
  process.env.CSV_LOG_DIR = TEST_DB_DIR;
  fs.mkdirSync(TEST_DB_DIR, { recursive: true });
});

afterAll(async () => {
  const { closeDb } = await import('@/utils/db');
  closeDb();
  fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
});

beforeEach(async () => {
  // Reset DB between tests
  const { closeDb } = await import('@/utils/db');
  closeDb();
  const dbPath = path.join(TEST_DB_DIR, 'test.db');
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  // Also remove WAL/SHM files
  if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
  if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
  jest.resetModules();
});

describe('SQLite Database Layer', () => {
  describe('Basic Operations', () => {
    test('logUserAction creates user and action', async () => {
      const { logUserAction, getAggregatedCSVData } = await import('@/utils/db');

      await logUserAction({
        userIdentifier: 'USER001',
        sessionId: 'sess1',
        actionType: 'QUESTIONNAIRE_STARTED',
        actionDetails: 'Started questionnaire',
      });

      const { records } = getAggregatedCSVData();
      expect(records).toHaveLength(1);
      expect(records[0].user_key).toBe('USER001');
      expect(records[0].action_count).toBe('1');
      expect(records[0].action_1_action_type).toBe('QUESTIONNAIRE_STARTED');
    });

    test('multiple actions accumulate on same user', async () => {
      const { logUserAction, getAggregatedCSVData } = await import('@/utils/db');

      await logUserAction({ userIdentifier: 'USER001', actionType: 'ACTION_1' });
      await logUserAction({ userIdentifier: 'USER001', actionType: 'ACTION_2' });
      await logUserAction({ userIdentifier: 'USER001', actionType: 'ACTION_3' });

      const { records } = getAggregatedCSVData();
      expect(records).toHaveLength(1);
      expect(records[0].action_count).toBe('3');
      expect(records[0].action_1_action_type).toBe('ACTION_1');
      expect(records[0].action_2_action_type).toBe('ACTION_2');
      expect(records[0].action_3_action_type).toBe('ACTION_3');
    });

    test('different users get separate rows', async () => {
      const { logUserAction, getAggregatedCSVData } = await import('@/utils/db');

      await logUserAction({ userIdentifier: 'ALICE', actionType: 'VISIT' });
      await logUserAction({ userIdentifier: 'BOB', actionType: 'VISIT' });

      const { records } = getAggregatedCSVData();
      expect(records).toHaveLength(2);
    });
  });

  describe('Session Merging', () => {
    test('session-only actions merge into user when identified', async () => {
      const { logUserAction, getAggregatedCSVData } = await import('@/utils/db');

      // Step 1: anonymous session action
      await logUserAction({ sessionId: 'sess-abc', actionType: 'ANON_ACTION' });

      let { records } = getAggregatedCSVData();
      expect(records).toHaveLength(1);
      expect(records[0].user_key).toBe('__session__sess-abc');

      // Step 2: user identifies with same session
      await logUserAction({
        userIdentifier: 'REALUSER',
        sessionId: 'sess-abc',
        actionType: 'IDENTIFIED_ACTION',
      });

      ({ records } = getAggregatedCSVData());
      expect(records).toHaveLength(1);
      expect(records[0].user_key).toBe('REALUSER');
      expect(records[0].action_count).toBe('2');
      expect(records[0].action_1_action_type).toBe('ANON_ACTION');
      expect(records[0].action_2_action_type).toBe('IDENTIFIED_ACTION');
    });
  });

  describe('Metadata Updates', () => {
    test('updates risk level and completion code', async () => {
      const { logUserAction, getAggregatedCSVData } = await import('@/utils/db');

      await logUserAction({ userIdentifier: 'USER001', actionType: 'START' });
      await logUserAction({
        userIdentifier: 'USER001',
        actionType: 'COMPLETE',
        riskLevel: 'moderate',
        completionCode: 'ABC123',
        totalScore: 75,
      });

      const { records } = getAggregatedCSVData();
      expect(records[0].risk_level).toBe('moderate');
      expect(records[0].completion_code).toBe('ABC123');
      expect(records[0].total_score).toBe('75');
    });
  });

  describe('Batch Operations', () => {
    test('logUserActionsBatch inserts all actions in one transaction', async () => {
      const { logUserActionsBatch, getAggregatedCSVData } = await import('@/utils/db');

      const actions = [];
      for (let i = 1; i <= 100; i++) {
        actions.push({
          userIdentifier: `USER_${String(i).padStart(3, '0')}`,
          actionType: 'BATCH_ACTION',
          actionDetails: `Action for user ${i}`,
        });
      }

      await logUserActionsBatch(actions);

      const { records } = getAggregatedCSVData();
      expect(records).toHaveLength(100);
    });

    test('batch handles mixed session and user actions', async () => {
      const { logUserActionsBatch, getAggregatedCSVData } = await import('@/utils/db');

      await logUserActionsBatch([
        { sessionId: 'sess-1', actionType: 'ANON' },
        { userIdentifier: 'USER1', sessionId: 'sess-1', actionType: 'IDENTIFY' },
        { userIdentifier: 'USER2', actionType: 'DIRECT' },
      ]);

      const { records } = getAggregatedCSVData();
      // sess-1 merged into USER1, so 2 users total
      expect(records).toHaveLength(2);
      const user1 = records.find(r => r.user_key === 'USER1');
      expect(user1.action_count).toBe('2');
    });
  });

  describe('CSV Export', () => {
    test('getAggregatedCSVData returns correct headers', async () => {
      const { logUserAction, getAggregatedCSVData } = await import('@/utils/db');

      await logUserAction({ userIdentifier: 'U1', actionType: 'TEST' });

      const { headers } = getAggregatedCSVData();
      expect(headers).toContain('user_key');
      expect(headers).toContain('user_identifier');
      expect(headers).toContain('action_count');
      expect(headers).toContain('action_1_action_type');
      expect(headers).toContain('action_1_timestamp');
    });

    test('extra fields appear in CSV export', async () => {
      const { logUserAction, getAggregatedCSVData } = await import('@/utils/db');

      await logUserAction({
        userIdentifier: 'U1',
        actionType: 'CUSTOM',
        customField: 'custom_value',
        retryCount: 3,
      });

      const { headers, records } = getAggregatedCSVData();
      expect(headers).toContain('action_1_custom_field');
      expect(headers).toContain('action_1_retry_count');
      expect(records[0].action_1_custom_field).toBe('custom_value');
      expect(String(records[0].action_1_retry_count)).toBe('3');
    });
  });

  describe('enqueueLogAction (direct write)', () => {
    test('enqueueLogAction writes directly without queue', async () => {
      const { enqueueLogAction, getAggregatedCSVData } = await import('@/utils/db');

      await enqueueLogAction({
        userIdentifier: 'DIRECT_USER',
        actionType: 'DIRECT_WRITE',
      });

      const { records } = getAggregatedCSVData();
      expect(records).toHaveLength(1);
      expect(records[0].user_key).toBe('DIRECT_USER');
    });
  });

  describe('Edge Cases', () => {
    test('rejects action without userIdentifier or sessionId', async () => {
      const { logUserAction } = await import('@/utils/db');
      await expect(logUserAction({ actionType: 'NO_ID' })).rejects.toThrow('userIdentifier or sessionId is required');
    });

    test('handles special characters in user identifier', async () => {
      const { logUserAction, getAggregatedCSVData } = await import('@/utils/db');

      await logUserAction({
        userIdentifier: 'user@email.com',
        actionType: 'SPECIAL_CHARS',
      });

      const { records } = getAggregatedCSVData();
      expect(records).toHaveLength(1);
      expect(records[0].user_key).toBe('user_email_com');
    });

    test('handles empty batch gracefully', async () => {
      const { logUserActionsBatch } = await import('@/utils/db');
      await expect(logUserActionsBatch([])).resolves.toBeUndefined();
    });

    test('getAllUsers returns all user identifiers', async () => {
      const { logUserAction, getAllUsers } = await import('@/utils/db');

      await logUserAction({ userIdentifier: 'ALICE', actionType: 'A' });
      await logUserAction({ userIdentifier: 'BOB', actionType: 'B' });

      const users = getAllUsers();
      expect(users).toContain('ALICE');
      expect(users).toContain('BOB');
      expect(users).toHaveLength(2);
    });

    test('getUserLogs returns structured action logs', async () => {
      const { logUserAction, getUserLogs } = await import('@/utils/db');

      await logUserAction({ userIdentifier: 'U1', actionType: 'FIRST', response: 'yes' });
      await logUserAction({ userIdentifier: 'U1', actionType: 'SECOND', score: '85' });

      const logs = getUserLogs('U1');
      expect(logs).toHaveLength(2);
      expect(logs[0].action_type).toBe('FIRST');
      expect(logs[0].response).toBe('yes');
      expect(logs[1].action_type).toBe('SECOND');
      expect(logs[1].score).toBe('85');
    });
  });

  describe('Concurrency (simulated)', () => {
    test('50 concurrent users writing simultaneously', async () => {
      const { logUserAction, getAggregatedCSVData } = await import('@/utils/db');

      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          logUserAction({
            userIdentifier: `CONCURRENT_${i}`,
            actionType: 'CONCURRENT_WRITE',
            actionDetails: `User ${i} action`,
          })
        );
      }

      await Promise.all(promises);

      const { records } = getAggregatedCSVData();
      expect(records).toHaveLength(50);

      // Verify each user has exactly 1 action
      records.forEach((record) => {
        expect(record.action_count).toBe('1');
      });
    });

    test('multiple actions per user concurrently', async () => {
      const { logUserAction, getAggregatedCSVData } = await import('@/utils/db');

      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          logUserAction({
            userIdentifier: 'SAME_USER',
            actionType: `ACTION_${i}`,
          })
        );
      }

      await Promise.all(promises);

      const { records } = getAggregatedCSVData();
      expect(records).toHaveLength(1);
      expect(parseInt(records[0].action_count)).toBe(20);
    });
  });
});
