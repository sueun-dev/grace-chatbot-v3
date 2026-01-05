#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const USER_COUNT = Number(process.env.USER_COUNT || 500);
const USER_CONCURRENCY = Number(process.env.USER_CONCURRENCY || USER_COUNT);
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 120000);
const MAX_CONNECTIONS = Number(
  process.env.MAX_CONNECTIONS || Math.min(USER_CONCURRENCY, 100)
);
const RUN_ID = process.env.RUN_ID || `${Date.now()}-${process.pid}`;
const CSV_LOG_DIR = process.env.CSV_LOG_DIR || path.join(process.cwd(), 'user_logs');
const QUEUE_FILE = process.env.LOG_QUEUE_FILE || path.join(CSV_LOG_DIR, 'action_queue.jsonl');
const OFFSET_FILE = process.env.LOG_QUEUE_OFFSET_FILE || path.join(CSV_LOG_DIR, 'action_queue.offset');
const USERS_DIR = path.join(CSV_LOG_DIR, 'users');
const EXPECTED_ACTIONS_PER_USER = 12;
const SPECIAL_USER_INDEX = 42;
const SPECIAL_MESSAGE = 'Hello, "CSV"\nLine2, with comma';
const QUEUE_DRAIN_TIMEOUT_MS = Number(process.env.QUEUE_DRAIN_TIMEOUT_MS || 180000);
const QUEUE_DRAIN_POLL_MS = Number(process.env.QUEUE_DRAIN_POLL_MS || 500);
const VERIFY_ONLY = process.env.VERIFY_ONLY === '1';
const SKIP_MERGE_VERIFY = process.env.SKIP_MERGE_VERIFY === '1';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  // Increase connection pool limits for high-concurrency local tests.
  // eslint-disable-next-line global-require
  const { Agent, setGlobalDispatcher } = require('undici');
  if (Agent && setGlobalDispatcher) {
    setGlobalDispatcher(
      new Agent({
        connections: Math.max(1, MAX_CONNECTIONS),
        connectTimeout: REQUEST_TIMEOUT_MS,
        headersTimeout: 0,
        bodyTimeout: 0,
      })
    );
  }
} catch {
  // undici may not be available; fall back to default fetch dispatcher.
}

const safeUserKey = (userIdentifier) => String(userIdentifier).replace(/[^a-zA-Z0-9_-]/g, '_');

const parseCsv = (content) => {
  const rows = [];
  let current = '';
  let inQuotes = false;
  let row = [];

  const pushField = () => {
    row.push(current);
    current = '';
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      pushField();
    } else if (char === '\n' && !inQuotes) {
      pushField();
      pushRow();
    } else {
      current += char;
    }
  }

  if (current.length > 0 || row.length > 0) {
    pushField();
    pushRow();
  }

  return rows;
};

const loadCsvRecords = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const rows = parseCsv(content);
  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1).filter((r) => r.some((cell) => String(cell ?? '').trim() !== ''));
  const records = dataRows.map((r) => {
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[header] = r[index] ?? '';
    });
    return record;
  });
  return { headers, records };
};

const readOffset = () => {
  if (!fs.existsSync(OFFSET_FILE)) return 0;
  const raw = fs.readFileSync(OFFSET_FILE, 'utf-8').trim();
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : 0;
};

const waitForQueueDrain = async () => {
  const deadline = Date.now() + QUEUE_DRAIN_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const size = fs.existsSync(QUEUE_FILE) ? fs.statSync(QUEUE_FILE).size : 0;
    const offset = readOffset();
    if (size === 0 || offset >= size) {
      await wait(200);
      const sizeCheck = fs.existsSync(QUEUE_FILE) ? fs.statSync(QUEUE_FILE).size : 0;
      const offsetCheck = readOffset();
      if (sizeCheck === 0 || offsetCheck >= sizeCheck) {
        return;
      }
    }
    await wait(QUEUE_DRAIN_POLL_MS);
  }
  const size = fs.existsSync(QUEUE_FILE) ? fs.statSync(QUEUE_FILE).size : 0;
  const offset = readOffset();
  throw new Error(`Queue not fully drained (offset=${offset}, size=${size})`);
};

const fetchWithTimeout = async (url, options) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
};

const sendLog = async (payload) => {
  let response;
  try {
    response = await fetchWithTimeout(`${BASE_URL}/api/log-action`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const detail = err?.cause?.code || err?.code || err?.message || 'unknown error';
    throw new Error(`fetch failed: ${detail}`);
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body ? JSON.stringify(body) : '';
    } catch {
      detail = '';
    }
    throw new Error(`log-action failed (status=${response.status}) ${detail}`);
  }
};

const runPool = async (tasks, concurrency) => {
  const results = new Array(tasks.length);
  let index = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const current = index;
      index += 1;
      if (current >= tasks.length) break;
      results[current] = await tasks[current]();
    }
  });
  await Promise.all(workers);
  return results;
};

const waitForServer = async () => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/`, { method: 'GET' });
      if (res.status < 500) return;
    } catch {
      // ignore and retry
    }
    await wait(500);
  }
  throw new Error(`Server not ready at ${BASE_URL}`);
};

const buildUserFlow = (index) => async () => {
  const code = `U${String(index).padStart(4, '0')}`;
  const sessionId = `session_http_${RUN_ID}_${index}`;
  const completionCode = `T${String(index).padStart(5, '0')}`;
  const startDelayMs = (index % 100) * 50;
  if (startDelayMs) {
    await wait(startDelayMs);
  }

  await sendLog({
    userIdentifier: '',
    sessionId,
    chatbotType: 'general-ai',
    actionType: 'page_visited',
    actionDetails: 'User visited home page',
    pageVisited: 'home',
  });
  await sendLog({
    userIdentifier: '',
    sessionId,
    chatbotType: 'general-ai',
    actionType: 'button_clicked',
    actionDetails: 'Get Started button clicked',
    pageVisited: 'home',
  });
  await sendLog({
    userIdentifier: code,
    sessionId,
    chatbotType: 'general-ai',
    actionType: 'code_entered',
    actionDetails: 'User entered verification code',
    pageVisited: 'home',
  });
  await sendLog({
    userIdentifier: code,
    sessionId,
    chatbotType: 'general-ai',
    actionType: 'code_verified',
    actionDetails: 'Code verification successful',
    pageVisited: 'home',
  });
  await sendLog({
    userIdentifier: '',
    sessionId,
    chatbotType: 'general-ai',
    actionType: 'page_visited',
    actionDetails: 'User entered AI chatbot page',
    pageVisited: 'ai-chatbot',
  });
  await sendLog({
    userIdentifier: code,
    sessionId,
    chatbotType: 'general-ai',
    actionType: 'questionnaire_started',
    actionDetails: 'Questionnaire started',
    pageVisited: 'ai-chatbot',
  });
  await sendLog({
    userIdentifier: code,
    sessionId,
    chatbotType: 'general-ai',
    actionType: 'questionnaire_option_selected',
    actionDetails: 'Question: age_check',
    questionId: 'age_check',
    response: 'Never',
    optionSelected: 'never',
    score: 0,
  });
  await sendLog({
    userIdentifier: code,
    sessionId,
    chatbotType: 'general-ai',
    actionType: 'questionnaire_option_selected',
    actionDetails: 'Question: q1',
    questionId: 'q1',
    response: 'Sometimes',
    optionSelected: 'sometimes',
    score: 1,
  });
  await sendLog({
    userIdentifier: code,
    sessionId,
    chatbotType: 'general-ai',
    actionType: 'assessment_completed',
    actionDetails: 'Assessment completed',
    assessmentScore: 17,
    riskLevel: 'Moderate Risk',
    riskDescription: 'Moderate',
    riskRecommendation: 'Reduce intake',
    totalScore: 17,
  });
  await sendLog({
    userIdentifier: code,
    sessionId,
    chatbotType: 'general-ai',
    actionType: 'simulation_started',
    actionDetails: 'Started scenario 1: peer_pressure',
    scenarioType: 'peer_pressure',
  });
  await sendLog({
    userIdentifier: code,
    sessionId,
    chatbotType: 'general-ai',
    actionType: 'simulation_input',
    actionDetails: 'Scenario response evaluated: appropriate',
    scenarioType: 'peer_pressure',
    scenarioIndex: 0,
    retryCount: 0,
    response: 'No thanks, I am the designated driver tonight.',
    evaluationReason: 'Clear refusal and responsible decision-making.',
    evaluationSuggestions: ['Keep it brief', 'Offer an alternative'],
    score: 85,
    isAppropriate: true,
    messageContent: index === SPECIAL_USER_INDEX ? SPECIAL_MESSAGE : 'ok',
  });
  await sendLog({
    userIdentifier: code,
    sessionId,
    chatbotType: 'general-ai',
    actionType: 'simulation_completed',
    actionDetails: 'Simulation completed',
    completionCode,
    totalScenarios: 3,
    totalResponses: 1,
    appropriateResponses: 1,
    inappropriateResponses: 0,
    averageScore: 85,
  });

  return { code, completionCode };
};

const buildExpectedResults = () => {
  return Array.from({ length: USER_COUNT }, (_, idx) => {
    const index = idx + 1;
    return {
      code: `U${String(index).padStart(4, '0')}`,
      completionCode: `T${String(index).padStart(5, '0')}`,
    };
  });
};

const verifyPerUserFiles = (results) => {
  if (!fs.existsSync(USERS_DIR)) {
    throw new Error(`Missing users directory: ${USERS_DIR}`);
  }

  const entries = fs.readdirSync(USERS_DIR).filter((name) => name.endsWith('.csv'));
  const sessionFiles = entries.filter((name) => name.startsWith('session_'));
  const userFiles = entries.filter((name) => name.startsWith('user_'));

  if (sessionFiles.length !== 0) {
    throw new Error(`Expected 0 session files, found ${sessionFiles.length}`);
  }
  if (userFiles.length !== results.length) {
    throw new Error(`Expected ${results.length} user files, found ${userFiles.length}`);
  }

  userFiles.forEach((fileName) => {
    const filePath = path.join(USERS_DIR, fileName);
    const { records } = loadCsvRecords(filePath);
    if (records.length !== 1) {
      throw new Error(`Expected 1 row in ${fileName}, found ${records.length}`);
    }
  });
};

const loadCsvRecordsFromContent = (content) => {
  const rows = parseCsv(content);
  const headers = rows[0] ?? [];
  const dataRows = rows.slice(1).filter((r) => r.some((cell) => String(cell ?? '').trim() !== ''));
  const records = dataRows.map((r) => {
    const record = {};
    headers.forEach((header, index) => {
      if (header) record[header] = r[index] ?? '';
    });
    return record;
  });
  return { headers, records };
};

const verifyMergedCsv = async (results) => {
  const response = await fetchWithTimeout(`${BASE_URL}/api/download-csv?token=admin`, {
    method: 'GET',
  });
  if (!response.ok) {
    throw new Error(`download-csv failed (status=${response.status})`);
  }
  const csvContent = await response.text();
  const { records } = loadCsvRecordsFromContent(csvContent);

  if (records.length !== results.length) {
    throw new Error(`Expected ${results.length} merged rows, found ${records.length}`);
  }

  const byUser = new Map(records.map((record) => [record.user_identifier, record]));
  if (byUser.size !== results.length) {
    throw new Error(`Merged CSV has duplicate/missing users (size=${byUser.size})`);
  }

  results.forEach(({ code, completionCode }) => {
    const row = byUser.get(code);
    if (!row) {
      throw new Error(`Missing row for ${code}`);
    }
    if (row.user_key !== safeUserKey(code)) {
      throw new Error(`user_key mismatch for ${code}`);
    }
    if (row.completion_code !== completionCode) {
      throw new Error(`completion_code mismatch for ${code}`);
    }
    if (row.action_count !== String(EXPECTED_ACTIONS_PER_USER)) {
      throw new Error(`action_count mismatch for ${code}`);
    }
  });

  if (results.length >= SPECIAL_USER_INDEX) {
    const specialUserCode = `U${String(SPECIAL_USER_INDEX).padStart(4, '0')}`;
    const specialRow = byUser.get(specialUserCode);
    if (!specialRow) {
      throw new Error(`Missing special user ${specialUserCode}`);
    }
    if (specialRow.action_11_message_content !== SPECIAL_MESSAGE) {
      throw new Error('Special message content mismatch');
    }
  }
};

const main = async () => {
  if (typeof fetch !== 'function') {
    throw new Error('Node 18+ required for fetch');
  }

  console.log(`[http-load] base=${BASE_URL}`);
  console.log(`[http-load] users=${USER_COUNT} concurrency=${USER_CONCURRENCY}`);
  console.log(`[http-load] max_connections=${MAX_CONNECTIONS}`);
  console.log(`[http-load] queue_drain_timeout_ms=${QUEUE_DRAIN_TIMEOUT_MS}`);
  console.log(`[http-load] csv_dir=${CSV_LOG_DIR}`);

  await waitForServer();

  const results = buildExpectedResults();

  if (!VERIFY_ONLY) {
    const tasks = Array.from({ length: USER_COUNT }, (_, idx) => buildUserFlow(idx + 1));
    const start = Date.now();
    await runPool(tasks, Math.min(USER_CONCURRENCY, USER_COUNT));
    const elapsed = Date.now() - start;
    console.log(`[http-load] completed in ${elapsed}ms`);
  } else {
    console.log('[http-load] verify-only mode enabled');
  }

  await waitForQueueDrain();

  verifyPerUserFiles(results);
  if (SKIP_MERGE_VERIFY) {
    console.log('[http-load] merge verification skipped');
  } else {
    await verifyMergedCsv(results);
  }

  console.log('[http-load] per-user files + merge verification passed');
};

main().catch((err) => {
  console.error('[http-load] failed:', err?.message || err);
  process.exit(1);
});
