/**
 * Load test: 10,000 concurrent users writing to SQLite
 * Run with: RUN_LOAD_TESTS=1 npx jest tests/load/sqlite10k.loadtest.test.js --no-coverage
 */
import fs from 'fs';
import path from 'path';

const SKIP = !process.env.RUN_LOAD_TESTS;

const TEST_DB_DIR = path.join(process.cwd(), 'temp', `jest-load-10k-${process.pid}-${Date.now()}`);

beforeAll(() => {
  if (SKIP) return;
  fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  process.env.CSV_LOG_DIR = TEST_DB_DIR;
});

beforeEach(async () => {
  if (SKIP) return;
  // Each test gets a fresh DB
  const dbPath = path.join(TEST_DB_DIR, `load_${Date.now()}.db`);
  process.env.DB_PATH = dbPath;
  jest.resetModules();
});

afterEach(async () => {
  if (SKIP) return;
  try {
    const { closeDb } = await import('@/utils/db');
    closeDb();
  } catch {}
});

afterAll(() => {
  if (SKIP) return;
  fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
});

const maybeDescribe = SKIP ? describe.skip : describe;

maybeDescribe('SQLite 10K Concurrent Users Load Test', () => {
  test('10,000 users write simultaneously without errors', async () => {
    jest.resetModules();
    const { logUserAction, getAggregatedCSVData } = await import('@/utils/db');

    const TOTAL_USERS = 10_000;
    const promises = [];

    const start = Date.now();

    for (let i = 0; i < TOTAL_USERS; i++) {
      promises.push(
        logUserAction({
          userIdentifier: `USER_${String(i).padStart(5, '0')}`,
          sessionId: `sess_${i}`,
          actionType: 'QUESTIONNAIRE_STARTED',
          actionDetails: `User ${i} started`,
        })
      );
    }

    await Promise.all(promises);

    const writeTime = Date.now() - start;
    console.log(`10K concurrent writes completed in ${writeTime}ms (${(TOTAL_USERS / writeTime * 1000).toFixed(0)} writes/sec)`);

    // Verify all users exist
    const { records } = getAggregatedCSVData();
    expect(records).toHaveLength(TOTAL_USERS);

    // Verify each user has exactly 1 action
    const actionCounts = records.map(r => parseInt(r.action_count));
    expect(actionCounts.every(c => c === 1)).toBe(true);

    // Verify no duplicate user keys
    const userKeys = new Set(records.map(r => r.user_key));
    expect(userKeys.size).toBe(TOTAL_USERS);
  }, 120_000);

  test('10,000 users each do 5 actions (50K total)', async () => {
    jest.resetModules();
    const { logUserActionsBatch, getAggregatedCSVData } = await import('@/utils/db');

    const TOTAL_USERS = 10_000;
    const ACTIONS_PER_USER = 5;

    // Build all actions
    const allActions = [];
    for (let u = 0; u < TOTAL_USERS; u++) {
      const userId = `MULTI_${String(u).padStart(5, '0')}`;
      for (let a = 0; a < ACTIONS_PER_USER; a++) {
        allActions.push({
          userIdentifier: userId,
          sessionId: `sess_multi_${u}`,
          actionType: `ACTION_${a + 1}`,
          actionDetails: `User ${u} action ${a + 1}`,
        });
      }
    }

    const start = Date.now();

    // Process in batches of 1000 for realistic throughput
    const BATCH_SIZE = 1000;
    const batchPromises = [];
    for (let i = 0; i < allActions.length; i += BATCH_SIZE) {
      const batch = allActions.slice(i, i + BATCH_SIZE);
      batchPromises.push(logUserActionsBatch(batch));
    }
    await Promise.all(batchPromises);

    const writeTime = Date.now() - start;
    const totalActions = TOTAL_USERS * ACTIONS_PER_USER;
    console.log(`${totalActions} batch actions completed in ${writeTime}ms (${(totalActions / writeTime * 1000).toFixed(0)} actions/sec)`);

    // Verify
    const { records } = getAggregatedCSVData();
    expect(records).toHaveLength(TOTAL_USERS);

    // Each user should have exactly 5 actions
    const wrongCounts = records.filter(r => parseInt(r.action_count) !== ACTIONS_PER_USER);
    expect(wrongCounts).toHaveLength(0);
  }, 300_000);

  test('CSV export of 10K users completes in reasonable time', async () => {
    jest.resetModules();
    const { logUserActionsBatch, getAggregatedCSVData } = await import('@/utils/db');

    // Insert 10K users with 3 actions each
    const actions = [];
    for (let u = 0; u < 10_000; u++) {
      for (let a = 0; a < 3; a++) {
        actions.push({
          userIdentifier: `EXPORT_${String(u).padStart(5, '0')}`,
          actionType: `ACT_${a}`,
        });
      }
    }

    await logUserActionsBatch(actions);

    const start = Date.now();
    const { headers, records } = getAggregatedCSVData();
    const exportTime = Date.now() - start;

    console.log(`CSV export of ${records.length} users (${headers.length} columns) in ${exportTime}ms`);

    expect(records).toHaveLength(10_000);
    expect(exportTime).toBeLessThan(30_000); // Should be under 30 seconds
  }, 300_000);

  test('session merging at scale — 1000 anonymous then identified', async () => {
    jest.resetModules();
    const { logUserAction, getAggregatedCSVData } = await import('@/utils/db');

    const USERS = 1000;

    // Phase 1: anonymous sessions
    const anonPromises = [];
    for (let i = 0; i < USERS; i++) {
      anonPromises.push(
        logUserAction({
          sessionId: `merge_sess_${i}`,
          actionType: 'ANON_ACTION',
        })
      );
    }
    await Promise.all(anonPromises);

    // Phase 2: identify with user IDs
    const identifyPromises = [];
    for (let i = 0; i < USERS; i++) {
      identifyPromises.push(
        logUserAction({
          userIdentifier: `MERGE_USER_${i}`,
          sessionId: `merge_sess_${i}`,
          actionType: 'IDENTIFIED_ACTION',
        })
      );
    }
    await Promise.all(identifyPromises);

    const { records } = getAggregatedCSVData();

    // All sessions should be merged into user rows
    const sessionRows = records.filter(r => r.user_key.startsWith('__session__'));
    expect(sessionRows).toHaveLength(0);

    // Each user should have 2 actions (anon + identified)
    const userRows = records.filter(r => r.user_key.startsWith('MERGE_USER_'));
    expect(userRows).toHaveLength(USERS);

    const wrongMerge = userRows.filter(r => parseInt(r.action_count) !== 2);
    if (wrongMerge.length > 0) {
      console.log(`${wrongMerge.length} users with incorrect merge (expected 2 actions)`);
    }
    expect(wrongMerge).toHaveLength(0);
  }, 120_000);
});
