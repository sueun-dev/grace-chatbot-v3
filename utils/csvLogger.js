// CSV Logging Utility for per-user CSV files with on-demand merging
import fs from 'fs';
import path from 'path';
import lockfile from 'proper-lockfile';

const CSV_LOG_DIR_ENV = process.env.CSV_LOG_DIR ? String(process.env.CSV_LOG_DIR).trim() : '';
const CSV_LOG_FILE_ENV = process.env.CSV_LOG_FILE ? String(process.env.CSV_LOG_FILE).trim() : '';
const DEFAULT_CSV_DIR = path.join(process.cwd(), 'user_logs');
const CSV_FILE = CSV_LOG_FILE_ENV
  ? path.resolve(CSV_LOG_FILE_ENV)
  : path.join(CSV_LOG_DIR_ENV ? path.resolve(CSV_LOG_DIR_ENV) : DEFAULT_CSV_DIR, 'user_actions.csv');
const CSV_DIR = path.dirname(CSV_FILE);
const USERS_DIR = path.join(CSV_DIR, 'users');
const USER_FILE_PREFIX = 'user_';
const SESSION_FILE_PREFIX = 'session_';
const CSV_LOCK_STALE_MS = Number(process.env.CSV_LOCK_STALE_MS) || 30_000;
const CSV_LOCK_RETRIES = Number(process.env.CSV_LOCK_RETRIES) || 60;

const BASE_HEADERS = [
  'user_key',
  'user_identifier',
  'chatbot_type',
  'risk_level',
  'risk_description',
  'risk_recommendation',
  'total_score',
  'action_count',
  'completion_code'
];
const DEFAULT_ACTION_FIELDS = [
  'timestamp',
  'session_id',
  'action_type',
  'action_details',
  'question_id',
  'response',
  'score',
  'scenario_type',
  'message_content',
  'option_selected',
  'page_visited'
];
const RESERVED_DATA_KEYS = new Set([
  'userIdentifier',
  'sessionId',
  'chatbotType',
  'timestamp',
  'actionType',
  'actionDetails',
  'questionId',
  'response',
  'score',
  'scenarioType',
  'messageContent',
  'optionSelected',
  'pageVisited',
  // keep totals/risk on the base row only
  'totalScore',
  'total_score',
  'assessmentScore',
  'finalScore',
  'riskLevel',
  'risk_level',
  'riskDescription',
  'risk_description',
  'riskRecommendation',
  'risk_recommendation',
  'completionCode',
  'completion_code'
]);

// Cross-process lock to serialize read-modify-write cycles per file.
const withCsvLocks = async (filePaths, task) => {
  const targets = Array.isArray(filePaths) ? filePaths : [filePaths];
  const uniqueTargets = Array.from(new Set(targets.filter(Boolean)));
  if (!uniqueTargets.length) {
    return task();
  }
  uniqueTargets.forEach((filePath) => {
    ensureBaseCSVFile(filePath);
  });
  const locks = uniqueTargets.slice().sort();
  const releases = [];
  for (const filePath of locks) {
    const release = await lockfile.lock(filePath, {
      stale: CSV_LOCK_STALE_MS,
      retries: {
        retries: CSV_LOCK_RETRIES,
        factor: 1.2,
        minTimeout: 100,
        maxTimeout: 2_000,
        randomize: true
      }
    });
    releases.push(release);
  }
  try {
    return await task();
  } finally {
    for (const release of releases.reverse()) {
      await release();
    }
  }
};

const ensureDirectory = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const ensureBaseCSVFile = (filePath) => {
  ensureDirectory(path.dirname(filePath));
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, BASE_HEADERS.join(',') + '\n');
  }
};

const toSnakeCase = (value = '') => {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
};

const sanitizeUserIdentifier = (userIdentifier) => {
  if (!userIdentifier) return 'unknown';
  return userIdentifier.replace(/[^a-zA-Z0-9_-]/g, '_');
};

const sanitizeKeyComponent = (value) => {
  if (value === undefined || value === null) return '';
  const normalized = String(value).trim();
  if (!normalized) return '';
  return normalized.replace(/[^a-zA-Z0-9_-]/g, '_');
};

const getSessionRowKey = (sessionId) => {
  const safeSessionId = sanitizeKeyComponent(sessionId);
  return safeSessionId ? `__session__${safeSessionId}` : '';
};

const getUserCsvFilePath = (userIdentifier) => {
  const safeUserKey = sanitizeUserIdentifier(userIdentifier);
  return path.join(USERS_DIR, `${USER_FILE_PREFIX}${safeUserKey}.csv`);
};

const getSessionCsvFilePath = (sessionId) => {
  const safeSessionId = sanitizeKeyComponent(sessionId);
  if (!safeSessionId) return '';
  return path.join(USERS_DIR, `${SESSION_FILE_PREFIX}${safeSessionId}.csv`);
};

const escapeCsvValue = (value) => {
  const str = value ?? '';
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const parseCsv = (content) => {
  const rows = [];
  let current = '';
  let inQuotes = false;
  const pushField = () => {
    row.push(current);
    current = '';
  };
  const pushRow = () => {
    rows.push(row);
    row = [];
  };
  let row = [];

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"';
        i++;
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

const normalizeHeaders = (headers = []) => {
  const ordered = [];
  const add = (value) => {
    if (value && !ordered.includes(value)) {
      ordered.push(value);
    }
  };

  BASE_HEADERS.forEach(add);
  headers.forEach(add);
  return ordered;
};

const loadCsv = (filePath) => {
  ensureBaseCSVFile(filePath);
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.trim()) {
    return { headers: [...BASE_HEADERS], records: [] };
  }

  const rows = parseCsv(content);
  if (!rows.length) {
    return { headers: [...BASE_HEADERS], records: [] };
  }

  const rawHeaders = rows[0];
  const headers = normalizeHeaders(rawHeaders);
  const dataRows = rows.slice(1).filter(row => row.some(cell => (cell ?? '').trim() !== ''));

  const records = dataRows.map(row => {
    const record = {};
    rawHeaders.forEach((header, index) => {
      if (header) {
        record[header] = row[index] ?? '';
      }
    });
    return record;
  });

  records.forEach(record => {
    normalizeRecordDefaults(record);
  });

  return { headers, records };
};

const persistCsv = (filePath, headers, records) => {
  const normalizedHeaders = normalizeHeaders(headers);
  const lines = [normalizedHeaders.map(escapeCsvValue).join(',')];

  records.forEach(record => {
    const row = normalizedHeaders.map(header => escapeCsvValue(record[header] ?? ''));
    lines.push(row.join(','));
  });

  const content = lines.join('\n') + '\n';
  const tempFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFile, content);
  fs.renameSync(tempFile, filePath);
  return normalizedHeaders;
};

const getActionColumn = (actionIndex, field) => `action_${actionIndex}_${field}`;

const ensureActionHeaders = (headers, actionIndex, fields) => {
  fields.forEach(field => {
    const column = getActionColumn(actionIndex, field);
    if (!headers.includes(column)) {
      headers.push(column);
    }
  });
};

const deriveActionFieldOrder = (headers) => {
  const seen = new Set();
  const order = [...DEFAULT_ACTION_FIELDS];
  order.forEach(field => seen.add(field));

  headers.forEach(header => {
    const match = header.match(/^action_\d+_(.+)$/);
    if (match) {
      const field = match[1];
      if (!seen.has(field)) {
        seen.add(field);
        order.push(field);
      }
    }
  });

  return order;
};

const normalizeRecordDefaults = (record) => {
  if (!record.chatbot_type) {
    record.chatbot_type = 'general-ai';
  }
  if (record.risk_level === undefined) {
    record.risk_level = '';
  }
  if (record.risk_description === undefined) {
    record.risk_description = '';
  }
  if (record.risk_recommendation === undefined) {
    record.risk_recommendation = '';
  }
  if (!record.total_score || Number.isNaN(Number(record.total_score))) {
    record.total_score = '0';
  }
  if (record.action_count === undefined) {
    record.action_count = '0';
  }
  if (record.completion_code === undefined) {
    record.completion_code = '';
  }
  return record;
};

const findRowByLastSessionId = (records, sessionId) => {
  if (!sessionId) return null;
  const target = String(sessionId);
  for (const record of records) {
    const actionCount = parseInt(record.action_count, 10) || 0;
    if (!actionCount) continue;
    const lastSession = record[getActionColumn(actionCount, 'session_id')];
    if (lastSession === target) {
      return record;
    }
  }
  return null;
};

const applyUserAction = (data, headers, records) => {
  const userIdentifierRaw =
    data && typeof data.userIdentifier === 'string'
      ? data.userIdentifier
      : (data?.userIdentifier ?? '');
  const userIdentifier = String(userIdentifierRaw).trim();
  const sessionId = data?.sessionId === undefined || data?.sessionId === null ? '' : String(data.sessionId);
  if (!userIdentifier && !sessionId.trim()) {
    throw new Error('userIdentifier or sessionId is required');
  }
  const sessionRowKey = getSessionRowKey(sessionId);
  let safeUserKey = userIdentifier ? sanitizeUserIdentifier(userIdentifier) : (sessionRowKey || 'unknown');

  if (!userIdentifier && sessionRowKey) {
    const existingSessionRow = records.find(record => record.user_key === sessionRowKey);
    if (!existingSessionRow) {
      const matchingRow = findRowByLastSessionId(records, sessionId);
      if (matchingRow?.user_key) {
        safeUserKey = matchingRow.user_key;
      }
    }
  }

  let userRow = records.find(record => record.user_key === safeUserKey);

  if (!userRow) {
    userRow = {
      user_key: safeUserKey,
      user_identifier: userIdentifier || 'unknown',
      chatbot_type: data.chatbotType || 'general-ai',
      risk_level: '',
      risk_description: '',
      risk_recommendation: '',
      total_score: '0',
      action_count: '0',
      completion_code: ''
    };
    records.push(userRow);
  } else {
    if (userIdentifier) {
      userRow.user_identifier = userIdentifier;
    }
    if (data.chatbotType) {
      userRow.chatbot_type = data.chatbotType;
    } else if (!userRow.chatbot_type) {
      userRow.chatbot_type = 'general-ai';
    }
    if (!userRow.risk_level) {
      userRow.risk_level = '';
    }
    if (!userRow.risk_description) {
      userRow.risk_description = '';
    }
    if (!userRow.risk_recommendation) {
      userRow.risk_recommendation = '';
    }
    if (!userRow.total_score) {
      userRow.total_score = '0';
    }
    if (!userRow.completion_code) {
      userRow.completion_code = '';
    }
  }

  // If user identifies mid-session, merge any prior session-keyed row into the user row.
  if (sessionRowKey && sessionRowKey !== userRow.user_key) {
    const sessionRowIndex = records.findIndex(record => record.user_key === sessionRowKey);
    if (sessionRowIndex !== -1) {
      const sessionRow = records[sessionRowIndex];
      const userActionCount = parseInt(userRow.action_count, 10) || 0;
      const sessionActionCount = parseInt(sessionRow.action_count, 10) || 0;

      if (sessionActionCount > 0) {
        headers.forEach((header) => {
          const match = header.match(/^action_(\d+)_(.+)$/);
          if (!match) return;
          const actionIndex = parseInt(match[1], 10);
          if (!Number.isFinite(actionIndex) || actionIndex <= 0 || actionIndex > sessionActionCount) {
            return;
          }
          const field = match[2];
          const newIndex = userActionCount + actionIndex;
          const newHeader = getActionColumn(newIndex, field);
          if (!headers.includes(newHeader)) {
            headers.push(newHeader);
          }
          userRow[newHeader] = sessionRow[header] ?? '';
        });

        userRow.action_count = String(userActionCount + sessionActionCount);
      }

      if (!userRow.total_score || userRow.total_score === '0') {
        if (sessionRow.total_score && sessionRow.total_score !== '0') {
          userRow.total_score = sessionRow.total_score;
        }
      }

      if (!userRow.risk_level) {
        if (sessionRow.risk_level) {
          userRow.risk_level = sessionRow.risk_level;
        }
      }

      if (!userRow.risk_description) {
        if (sessionRow.risk_description) {
          userRow.risk_description = sessionRow.risk_description;
        }
      }

      if (!userRow.risk_recommendation) {
        if (sessionRow.risk_recommendation) {
          userRow.risk_recommendation = sessionRow.risk_recommendation;
        }
      }

      if (!userRow.completion_code) {
        if (sessionRow.completion_code) {
          userRow.completion_code = sessionRow.completion_code;
        }
      }

      records.splice(sessionRowIndex, 1);
    }
  }

  const nextActionIndex = (parseInt(userRow.action_count, 10) || 0) + 1;
  const baseActionPayload = {
    timestamp: data.timestamp || new Date().toISOString(),
    session_id: data.sessionId || '',
    action_type: data.actionType || '',
    action_details: data.actionDetails || '',
    question_id: data.questionId || '',
    response: data.response || '',
    score: data.score ?? '',
    scenario_type: data.scenarioType || '',
    message_content: data.messageContent || '',
    option_selected: data.optionSelected || '',
    page_visited: data.pageVisited || ''
  };

  const dynamicPayload = {};
  Object.keys(data || {}).forEach(key => {
    if (RESERVED_DATA_KEYS.has(key)) {
      return;
    }
    const normalizedKey = toSnakeCase(key);
    if (!normalizedKey) {
      return;
    }
    let value = data[key];
    if (typeof value === 'object') {
      try {
        value = JSON.stringify(value);
      } catch (err) {
        value = String(value);
      }
    }
    dynamicPayload[normalizedKey] = value ?? '';
  });

  const actionPayload = { ...baseActionPayload, ...dynamicPayload };
  const actionFields = Array.from(new Set([...DEFAULT_ACTION_FIELDS, ...Object.keys(dynamicPayload)]));
  ensureActionHeaders(headers, nextActionIndex, actionFields);

  actionFields.forEach(field => {
    const column = getActionColumn(nextActionIndex, field);
    userRow[column] = actionPayload[field] ?? '';
  });

  userRow.action_count = String(nextActionIndex);

  const parseScoreValue = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const derivedTotalScore = () => {
    return parseScoreValue(data.totalScore ?? data.total_score ?? data.assessmentScore ?? data.finalScore);
  };

  const totalScoreValue = derivedTotalScore();
  if (totalScoreValue !== null) {
    userRow.total_score = String(totalScoreValue);
  }

  if (data.riskLevel || data.risk_level) {
    userRow.risk_level = data.riskLevel || data.risk_level;
  }

  if (data.riskDescription || data.risk_description) {
    userRow.risk_description = data.riskDescription || data.risk_description;
  }

  if (data.riskRecommendation || data.risk_recommendation) {
    userRow.risk_recommendation = data.riskRecommendation || data.risk_recommendation;
  }

  const completionCode = data.completionCode || data.completion_code;
  if (typeof completionCode === 'string' && completionCode.trim()) {
    userRow.completion_code = completionCode.trim();
  }

  normalizeRecordDefaults(userRow);
};

const mergeUserRecords = (headers, target, source) => {
  const targetActionCount = parseInt(target.action_count, 10) || 0;
  const sourceActionCount = parseInt(source.action_count, 10) || 0;

  if (sourceActionCount > 0) {
    Object.keys(source).forEach((key) => {
      const match = key.match(/^action_(\d+)_(.+)$/);
      if (!match) return;
      const actionIndex = parseInt(match[1], 10);
      if (!Number.isFinite(actionIndex) || actionIndex <= 0 || actionIndex > sourceActionCount) {
        return;
      }
      const field = match[2];
      const newIndex = targetActionCount + actionIndex;
      const newHeader = getActionColumn(newIndex, field);
      if (!headers.includes(newHeader)) {
        headers.push(newHeader);
      }
      target[newHeader] = source[key] ?? '';
    });

    target.action_count = String(targetActionCount + sourceActionCount);
  }

  const isBlank = (value) => value === undefined || value === null || String(value).trim() === '';
  if (isBlank(target.user_identifier) || target.user_identifier === 'unknown') {
    if (!isBlank(source.user_identifier)) {
      target.user_identifier = source.user_identifier;
    }
  }
  if (!target.chatbot_type) {
    target.chatbot_type = source.chatbot_type || 'general-ai';
  }
  if (isBlank(target.risk_level) && !isBlank(source.risk_level)) {
    target.risk_level = source.risk_level;
  }
  if (isBlank(target.risk_description) && !isBlank(source.risk_description)) {
    target.risk_description = source.risk_description;
  }
  if (isBlank(target.risk_recommendation) && !isBlank(source.risk_recommendation)) {
    target.risk_recommendation = source.risk_recommendation;
  }
  if (!target.total_score || target.total_score === '0') {
    if (source.total_score && source.total_score !== '0') {
      target.total_score = source.total_score;
    }
  }
  if (isBlank(target.completion_code) && !isBlank(source.completion_code)) {
    target.completion_code = source.completion_code;
  }

  normalizeRecordDefaults(target);
};

const findUserCsvFileBySessionId = (sessionId) => {
  if (!sessionId) return null;
  if (!fs.existsSync(USERS_DIR)) return null;
  const targetSession = String(sessionId);
  const files = fs.readdirSync(USERS_DIR).filter((name) => name.endsWith('.csv'));
  for (const file of files) {
    if (file.startsWith(SESSION_FILE_PREFIX)) continue;
    const filePath = path.join(USERS_DIR, file);
    const { records } = loadCsv(filePath);
    const record = records[0];
    if (!record) continue;
    const actionCount = parseInt(record.action_count, 10) || 0;
    if (!actionCount) continue;
    const lastSession = record[getActionColumn(actionCount, 'session_id')];
    if (lastSession === targetSession) {
      return filePath;
    }
  }
  return null;
};

// Ensure CSV directory exists
export const ensureCSVDirectory = async () => {
  return withCsvLocks([CSV_FILE], () => {
    ensureBaseCSVFile(CSV_FILE);
    ensureDirectory(USERS_DIR);
  });
};

// Initialize CSV row for user if it doesn't exist
export const initializeUserCSV = async (userIdentifier) => {
  const userFilePath = getUserCsvFilePath(userIdentifier);
  return withCsvLocks([userFilePath], () => {
    ensureDirectory(USERS_DIR);
    const { headers, records } = loadCsv(userFilePath);
    const safeUserKey = sanitizeUserIdentifier(userIdentifier);
    const existing = records.find(record => record.user_key === safeUserKey);
    if (!existing) {
      records.push({
        user_key: safeUserKey,
        user_identifier: userIdentifier || 'unknown',
        chatbot_type: 'general-ai',
        risk_level: '',
        risk_description: '',
        risk_recommendation: '',
        total_score: '0',
        action_count: '0',
        completion_code: ''
      });
      persistCsv(userFilePath, headers, records);
    }
  });
};

// Log user action in a per-user CSV file
export const logUserAction = async (data) => {
  const userIdentifierRaw =
    data && typeof data.userIdentifier === 'string'
      ? data.userIdentifier
      : (data?.userIdentifier ?? '');
  const userIdentifier = String(userIdentifierRaw).trim();
  const sessionId = data?.sessionId === undefined || data?.sessionId === null ? '' : String(data.sessionId).trim();

  if (!userIdentifier && !sessionId) {
    throw new Error('userIdentifier or sessionId is required');
  }

  ensureDirectory(USERS_DIR);

  if (userIdentifier) {
    const userFilePath = getUserCsvFilePath(userIdentifier);
    const sessionFilePath = sessionId ? getSessionCsvFilePath(sessionId) : '';
    const sessionExists = sessionFilePath && fs.existsSync(sessionFilePath);
    const filesToLock = sessionExists ? [userFilePath, sessionFilePath] : [userFilePath];

    return withCsvLocks(filesToLock, () => {
      let { headers, records } = loadCsv(userFilePath);
      if (sessionExists) {
        const sessionData = loadCsv(sessionFilePath);
        const sessionKey = getSessionRowKey(sessionId);
        const sessionRecord = sessionData.records.find(record => record.user_key === sessionKey) || sessionData.records[0];
        if (sessionRecord) {
          headers = normalizeHeaders([...headers, ...sessionData.headers]);
          records.push(sessionRecord);
        }
      }

      applyUserAction(data, headers, records);
      persistCsv(userFilePath, headers, records);

      if (sessionExists) {
        try {
          fs.unlinkSync(sessionFilePath);
        } catch {
          // no-op
        }
      }
    });
  }

  const sessionFilePath = getSessionCsvFilePath(sessionId);
  let targetFilePath = sessionFilePath;
  if (!sessionFilePath) {
    throw new Error('sessionId is required');
  }

  if (!fs.existsSync(sessionFilePath)) {
    const matchedUserFile = findUserCsvFileBySessionId(sessionId);
    if (matchedUserFile) {
      targetFilePath = matchedUserFile;
    }
  }

  return withCsvLocks([targetFilePath], () => {
    const { headers, records } = loadCsv(targetFilePath);
    applyUserAction(data, headers, records);
    persistCsv(targetFilePath, headers, records);
  });
};

const runPool = async (tasks, concurrency) => {
  if (!tasks.length) return;
  const limit = Math.max(1, Math.min(concurrency, tasks.length));
  let index = 0;
  const workers = Array.from({ length: limit }, async () => {
    while (true) {
      const current = index;
      index += 1;
      if (current >= tasks.length) break;
      await tasks[current]();
    }
  });
  await Promise.all(workers);
};

export const logUserActionsBatch = async (actions = []) => {
  if (!Array.isArray(actions) || actions.length === 0) {
    return;
  }

  const sessionToUser = new Map();
  actions.forEach((action) => {
    const userIdentifier = action?.userIdentifier ? String(action.userIdentifier).trim() : '';
    const sessionId = action?.sessionId ? String(action.sessionId).trim() : '';
    if (userIdentifier && sessionId) {
      sessionToUser.set(sessionId, userIdentifier);
    }
  });

  const groups = new Map();
  actions.forEach((action) => {
    const userIdentifier = action?.userIdentifier ? String(action.userIdentifier).trim() : '';
    const sessionId = action?.sessionId ? String(action.sessionId).trim() : '';
    const resolvedUser = userIdentifier || (sessionId ? sessionToUser.get(sessionId) : '');
    const key = resolvedUser
      ? `user:${resolvedUser}`
      : sessionId
        ? `session:${sessionId}`
        : 'unknown';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(action);
  });

  const tasks = Array.from(groups.values(), (group) => async () => {
    for (const action of group) {
      await logUserAction(action);
    }
  });

  const concurrency =
    Number(process.env.CSV_LOG_BATCH_CONCURRENCY) || Math.min(tasks.length, 5);
  await runPool(tasks, concurrency);
};

// Get all action logs as structured objects for a specific user
export const getUserLogs = (userIdentifier) => {
  const safeUserKey = sanitizeUserIdentifier(userIdentifier);
  const { headers, records } = getAggregatedCSVData();
  const actionFields = deriveActionFieldOrder(headers);
  const userRow = records.find(record => record.user_key === safeUserKey || record.user_identifier === userIdentifier);

  if (!userRow) {
    return [];
  }

  const totalActions = parseInt(userRow.action_count, 10) || 0;
  const logs = [];

  for (let index = 1; index <= totalActions; index++) {
    const entry = {};
    actionFields.forEach(field => {
      const column = getActionColumn(index, field);
      entry[field] = userRow[column] ?? '';
    });
    entry.chatbot_type = userRow.chatbot_type || userRow[getActionColumn(index, 'chatbot_type')] || 'general-ai';
    entry.risk_level = userRow.risk_level || '';
    entry.total_score = userRow.total_score || '0';
    logs.push(entry);
  }

  return logs;
};

// Get list of all users present in the aggregated CSV
export const getAllUsers = () => {
  const { records } = getAggregatedCSVData();
  return records.map(record => record.user_identifier || record.user_key || 'unknown');
};

const mergeAggregatedRecords = (
  headers,
  records,
  aggregatedHeaders,
  aggregatedRecords,
  skipKeys = new Set()
) => {
  aggregatedHeaders.forEach((header) => {
    if (header && !headers.includes(header)) {
      headers.push(header);
    }
  });

  aggregatedRecords.forEach((record) => {
    if (!record || Object.keys(record).length === 0) return;
    const rawKey = record.user_key || record.user_identifier || 'unknown';
    const safeKey = sanitizeUserIdentifier(String(rawKey));
    if (skipKeys.has(safeKey)) {
      return;
    }
    record.user_key = safeKey;
    if (!record.user_identifier) {
      record.user_identifier = rawKey || safeKey || 'unknown';
    }
    normalizeRecordDefaults(record);

    const existing = records.get(safeKey);
    if (!existing) {
      records.set(safeKey, { ...record });
      return;
    }

    mergeUserRecords(headers, existing, record);
    records.set(safeKey, existing);
  });
};

// Helper for routes/tests to grab raw CSV data
export const getAggregatedCSVData = () => {
  ensureDirectory(USERS_DIR);
  const headers = [...BASE_HEADERS];
  const records = new Map();
  const existingKeys = new Set();

  if (fs.existsSync(USERS_DIR)) {
    const files = fs.readdirSync(USERS_DIR).filter(
      (name) =>
        name.endsWith('.csv') &&
        (name.startsWith(USER_FILE_PREFIX) || name.startsWith(SESSION_FILE_PREFIX))
    );
    files.forEach((name) => {
      if (name.startsWith(USER_FILE_PREFIX)) {
        const key = sanitizeUserIdentifier(
          name.slice(USER_FILE_PREFIX.length, -'.csv'.length)
        );
        if (key) existingKeys.add(key);
      }
      if (name.startsWith(SESSION_FILE_PREFIX)) {
        const sessionId = name.slice(SESSION_FILE_PREFIX.length, -'.csv'.length);
        const sessionKey = getSessionRowKey(sessionId);
        if (sessionKey) existingKeys.add(sessionKey);
      }
      const filePath = path.join(USERS_DIR, name);
      const data = loadCsv(filePath);
      mergeAggregatedRecords(headers, records, data.headers, data.records);
    });
  }

  if (fs.existsSync(CSV_FILE)) {
    const legacy = loadCsv(CSV_FILE);
    mergeAggregatedRecords(headers, records, legacy.headers, legacy.records, existingKeys);
  }

  return { headers: normalizeHeaders(headers), records: Array.from(records.values()) };
};

export const getAggregatedCSVFilePath = () => CSV_FILE;
export const listUserCsvFiles = () => {
  if (!fs.existsSync(USERS_DIR)) return [];
  return fs.readdirSync(USERS_DIR)
    .filter(
      (name) =>
        name.endsWith('.csv') &&
        (name.startsWith(USER_FILE_PREFIX) || name.startsWith(SESSION_FILE_PREFIX))
    )
    .map((name) => path.join(USERS_DIR, name));
};
export { getUserCsvFilePath };
