// CSV Logging Utility for tracking user flow in a single aggregated matrix
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

// Cross-process lock + in-process queue to serialize read-modify-write cycles.
let writeQueue = Promise.resolve();
const withCsvLock = (task) => {
  const run = async () => {
    ensureBaseCSVFile();
    const release = await lockfile.lock(CSV_FILE, {
      stale: CSV_LOCK_STALE_MS,
      retries: {
        retries: CSV_LOCK_RETRIES,
        factor: 1.2,
        minTimeout: 100,
        maxTimeout: 2_000,
        randomize: true
      }
    });
    try {
      return await task();
    } finally {
      await release();
    }
  };

  const chained = writeQueue.then(run, run);
  // Keep queue progressing even if a task fails.
  writeQueue = chained.catch(() => {});
  return chained;
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

const ensureBaseCSVFile = () => {
  if (!fs.existsSync(CSV_DIR)) {
    fs.mkdirSync(CSV_DIR, { recursive: true });
  }

  if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, BASE_HEADERS.join(',') + '\n');
  }
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

const loadCsv = () => {
  ensureBaseCSVFile();
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
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

  // Ensure legacy rows get the latest base fields
  records.forEach(record => {
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
    if (record.completion_code === undefined) {
      record.completion_code = '';
    }
  });

  return { headers, records };
};

const persistCsv = (headers, records) => {
  const normalizedHeaders = normalizeHeaders(headers);
  const lines = [normalizedHeaders.map(escapeCsvValue).join(',')];

  records.forEach(record => {
    const row = normalizedHeaders.map(header => escapeCsvValue(record[header] ?? ''));
    lines.push(row.join(','));
  });

  const content = lines.join('\n') + '\n';
  const tempFile = `${CSV_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFile, content);
  fs.renameSync(tempFile, CSV_FILE);
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

// Ensure CSV directory exists
export const ensureCSVDirectory = async () => {
  return withCsvLock(() => {
    ensureBaseCSVFile();
  });
};

// Initialize CSV row for user if it doesn't exist
export const initializeUserCSV = async (userIdentifier) => {
  return withCsvLock(() => {
    const { headers, records } = loadCsv();
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
      persistCsv(headers, records);
    }
  });
};

// Log user action in a single-row-per-user matrix
export const logUserAction = async (data) => {
  return withCsvLock(() => {
    const { headers, records } = loadCsv();
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

    persistCsv(headers, records);
  });
};

// Get all action logs as structured objects for a specific user
export const getUserLogs = (userIdentifier) => {
  const safeUserKey = sanitizeUserIdentifier(userIdentifier);
  const { headers, records } = loadCsv();
  const actionFields = deriveActionFieldOrder(headers);
  const userRow = records.find(record => record.user_key === safeUserKey);

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
  const { records } = loadCsv();
  return records.map(record => record.user_identifier || record.user_key || 'unknown');
};

// Helper for routes/tests to grab raw CSV data
export const getAggregatedCSVData = () => {
  const { headers, records } = loadCsv();
  return { headers, records };
};

export const getAggregatedCSVFilePath = () => CSV_FILE;
