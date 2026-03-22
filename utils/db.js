// SQLite-based data persistence — drop-in replacement for csvLogger.js + logQueue.js
// Handles 10,000+ concurrent users without file lock contention or CSV corruption.
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = process.env.CSV_LOG_DIR
  ? path.resolve(String(process.env.CSV_LOG_DIR).trim())
  : path.join(process.cwd(), 'user_logs');

const DB_PATH = process.env.DB_PATH
  ? path.resolve(String(process.env.DB_PATH).trim())
  : path.join(DB_DIR, 'grace.db');

let _db = null;

const getDb = () => {
  if (_db) return _db;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  _db = new Database(DB_PATH);

  // WAL mode for concurrent reads + writes without locking
  _db.pragma('journal_mode = WAL');
  _db.pragma('busy_timeout = 10000');
  _db.pragma('synchronous = NORMAL');
  _db.pragma('cache_size = -64000'); // 64MB cache

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_key TEXT PRIMARY KEY,
      user_identifier TEXT NOT NULL DEFAULT 'unknown',
      chatbot_type TEXT NOT NULL DEFAULT 'general-ai',
      risk_level TEXT DEFAULT '',
      risk_description TEXT DEFAULT '',
      risk_recommendation TEXT DEFAULT '',
      total_score TEXT DEFAULT '0',
      completion_code TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_key TEXT NOT NULL,
      action_index INTEGER NOT NULL,
      timestamp TEXT DEFAULT '',
      session_id TEXT DEFAULT '',
      action_type TEXT DEFAULT '',
      action_details TEXT DEFAULT '',
      question_id TEXT DEFAULT '',
      response TEXT DEFAULT '',
      score TEXT DEFAULT '',
      scenario_type TEXT DEFAULT '',
      message_content TEXT DEFAULT '',
      option_selected TEXT DEFAULT '',
      page_visited TEXT DEFAULT '',
      extra_fields TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_key) REFERENCES users(user_key)
    );

    CREATE INDEX IF NOT EXISTS idx_actions_user_key ON actions(user_key);
    CREATE INDEX IF NOT EXISTS idx_actions_session_id ON actions(session_id);
    CREATE INDEX IF NOT EXISTS idx_users_user_identifier ON users(user_identifier);
  `);

  return _db;
};

// Graceful shutdown
if (typeof process !== 'undefined') {
  const cleanup = () => {
    if (_db) {
      try { _db.close(); } catch {}
      _db = null;
    }
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
}

// ── Helpers ──

const toSnakeCase = (value = '') =>
  String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();

const sanitizeUserIdentifier = (userIdentifier) => {
  if (!userIdentifier) return 'unknown';
  return userIdentifier.replace(/[^a-zA-Z0-9_-]/g, '_');
};

const getSessionRowKey = (sessionId) => {
  if (!sessionId) return '';
  const safe = String(sessionId).trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return safe ? `__session__${safe}` : '';
};

const RESERVED_DATA_KEYS = new Set([
  'userIdentifier', 'sessionId', 'chatbotType', 'timestamp',
  'actionType', 'actionDetails', 'questionId', 'response',
  'score', 'scenarioType', 'messageContent', 'optionSelected',
  'pageVisited', 'totalScore', 'total_score', 'assessmentScore',
  'finalScore', 'riskLevel', 'risk_level', 'riskDescription',
  'risk_description', 'riskRecommendation', 'risk_recommendation',
  'completionCode', 'completion_code',
]);

const BASE_HEADERS = [
  'user_key', 'user_identifier', 'chatbot_type', 'risk_level',
  'risk_description', 'risk_recommendation', 'total_score',
  'action_count', 'completion_code',
];

const DEFAULT_ACTION_FIELDS = [
  'timestamp', 'session_id', 'action_type', 'action_details',
  'question_id', 'response', 'score', 'scenario_type',
  'message_content', 'option_selected', 'page_visited',
];

// ── Core Write Operations ──

const upsertUser = (db, userKey, data) => {
  const existing = db.prepare('SELECT * FROM users WHERE user_key = ?').get(userKey);
  if (existing) {
    const updates = {};
    if (data.userIdentifier) updates.user_identifier = data.userIdentifier;
    if (data.chatbotType) updates.chatbot_type = data.chatbotType;
    if (data.riskLevel || data.risk_level) updates.risk_level = data.riskLevel || data.risk_level;
    if (data.riskDescription || data.risk_description) updates.risk_description = data.riskDescription || data.risk_description;
    if (data.riskRecommendation || data.risk_recommendation) updates.risk_recommendation = data.riskRecommendation || data.risk_recommendation;

    const totalScore = data.totalScore ?? data.total_score ?? data.assessmentScore ?? data.finalScore;
    if (totalScore !== undefined && totalScore !== null && totalScore !== '') {
      const num = Number(totalScore);
      if (Number.isFinite(num)) updates.total_score = String(num);
    }

    const completionCode = data.completionCode || data.completion_code;
    if (typeof completionCode === 'string' && completionCode.trim()) {
      updates.completion_code = completionCode.trim();
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();
      const setClauses = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
      db.prepare(`UPDATE users SET ${setClauses} WHERE user_key = @user_key`).run({
        ...updates,
        user_key: userKey,
      });
    }
    return existing;
  }

  db.prepare(`
    INSERT INTO users (user_key, user_identifier, chatbot_type, risk_level,
      risk_description, risk_recommendation, total_score, completion_code)
    VALUES (@user_key, @user_identifier, @chatbot_type, @risk_level,
      @risk_description, @risk_recommendation, @total_score, @completion_code)
  `).run({
    user_key: userKey,
    user_identifier: data.userIdentifier || 'unknown',
    chatbot_type: data.chatbotType || 'general-ai',
    risk_level: data.riskLevel || data.risk_level || '',
    risk_description: data.riskDescription || data.risk_description || '',
    risk_recommendation: data.riskRecommendation || data.risk_recommendation || '',
    total_score: '0',
    completion_code: '',
  });

  return null;
};

const insertAction = (db, userKey, actionIndex, data) => {
  const extraFields = {};
  Object.keys(data || {}).forEach((key) => {
    if (RESERVED_DATA_KEYS.has(key)) return;
    const snakeKey = toSnakeCase(key);
    if (!snakeKey) return;
    let value = data[key];
    if (typeof value === 'object') {
      try { value = JSON.stringify(value); } catch { value = String(value); }
    }
    extraFields[snakeKey] = value ?? '';
  });

  db.prepare(`
    INSERT INTO actions (user_key, action_index, timestamp, session_id,
      action_type, action_details, question_id, response, score,
      scenario_type, message_content, option_selected, page_visited, extra_fields)
    VALUES (@user_key, @action_index, @timestamp, @session_id,
      @action_type, @action_details, @question_id, @response, @score,
      @scenario_type, @message_content, @option_selected, @page_visited, @extra_fields)
  `).run({
    user_key: userKey,
    action_index: actionIndex,
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
    page_visited: data.pageVisited || '',
    extra_fields: JSON.stringify(extraFields),
  });
};

const getNextActionIndex = (db, userKey) => {
  const row = db.prepare('SELECT MAX(action_index) as max_idx FROM actions WHERE user_key = ?').get(userKey);
  return (row?.max_idx || 0) + 1;
};

// Merge session actions into user row
const mergeSessionIntoUser = (db, sessionKey, userKey) => {
  const sessionActions = db.prepare('SELECT * FROM actions WHERE user_key = ? ORDER BY action_index').all(sessionKey);
  if (sessionActions.length === 0) return;

  let nextIndex = getNextActionIndex(db, userKey);
  const reindex = db.prepare('UPDATE actions SET user_key = ?, action_index = ? WHERE id = ?');
  const insertMany = db.transaction(() => {
    for (const action of sessionActions) {
      reindex.run(userKey, nextIndex, action.id);
      nextIndex++;
    }
  });
  insertMany();

  // Merge user metadata from session
  const sessionUser = db.prepare('SELECT * FROM users WHERE user_key = ?').get(sessionKey);
  if (sessionUser) {
    const userRow = db.prepare('SELECT * FROM users WHERE user_key = ?').get(userKey);
    if (userRow) {
      const updates = {};
      if ((!userRow.risk_level) && sessionUser.risk_level) updates.risk_level = sessionUser.risk_level;
      if ((!userRow.risk_description) && sessionUser.risk_description) updates.risk_description = sessionUser.risk_description;
      if ((!userRow.risk_recommendation) && sessionUser.risk_recommendation) updates.risk_recommendation = sessionUser.risk_recommendation;
      if ((!userRow.total_score || userRow.total_score === '0') && sessionUser.total_score && sessionUser.total_score !== '0') {
        updates.total_score = sessionUser.total_score;
      }
      if ((!userRow.completion_code) && sessionUser.completion_code) updates.completion_code = sessionUser.completion_code;

      if (Object.keys(updates).length > 0) {
        const setClauses = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
        db.prepare(`UPDATE users SET ${setClauses} WHERE user_key = @user_key`).run({ ...updates, user_key: userKey });
      }
    }
    db.prepare('DELETE FROM users WHERE user_key = ?').run(sessionKey);
  }
};

// ── Public API (same interface as csvLogger.js + logQueue.js) ──

export const ensureCSVDirectory = async () => {
  getDb(); // Initializes DB and tables
};

export const initializeUserCSV = async (userIdentifier) => {
  const db = getDb();
  const userKey = sanitizeUserIdentifier(userIdentifier);
  upsertUser(db, userKey, { userIdentifier });
};

export const logUserAction = async (data) => {
  const db = getDb();
  const userIdentifier = data?.userIdentifier ? String(data.userIdentifier).trim() : '';
  const sessionId = data?.sessionId ? String(data.sessionId).trim() : '';

  if (!userIdentifier && !sessionId) {
    throw new Error('userIdentifier or sessionId is required');
  }

  const sessionRowKey = getSessionRowKey(sessionId);

  // Determine the user key
  let userKey;
  if (userIdentifier) {
    userKey = sanitizeUserIdentifier(userIdentifier);

    // If session had prior actions, merge them
    if (sessionRowKey && sessionRowKey !== userKey) {
      const sessionExists = db.prepare('SELECT 1 FROM users WHERE user_key = ?').get(sessionRowKey);
      if (sessionExists) {
        upsertUser(db, userKey, data);
        mergeSessionIntoUser(db, sessionRowKey, userKey);
      }
    }
  } else {
    // No user identifier — check if session is linked to a known user
    if (sessionRowKey) {
      const linkedAction = db.prepare(
        'SELECT user_key FROM actions WHERE session_id = ? AND user_key NOT LIKE ? LIMIT 1'
      ).get(sessionId, '__session__%');
      userKey = linkedAction ? linkedAction.user_key : sessionRowKey;
    } else {
      userKey = 'unknown';
    }
  }

  // Use transaction for atomicity
  const run = db.transaction(() => {
    upsertUser(db, userKey, data);
    const nextIndex = getNextActionIndex(db, userKey);
    insertAction(db, userKey, nextIndex, data);
  });
  run();
};

export const logUserActionsBatch = async (actions = []) => {
  if (!Array.isArray(actions) || actions.length === 0) return;

  const db = getDb();
  const batchInsert = db.transaction(() => {
    for (const action of actions) {
      // Inline logUserAction logic for performance (avoids per-action transaction overhead)
      const userIdentifier = action?.userIdentifier ? String(action.userIdentifier).trim() : '';
      const sessionId = action?.sessionId ? String(action.sessionId).trim() : '';
      if (!userIdentifier && !sessionId) continue;

      const sessionRowKey = getSessionRowKey(sessionId);
      let userKey;

      if (userIdentifier) {
        userKey = sanitizeUserIdentifier(userIdentifier);
        if (sessionRowKey && sessionRowKey !== userKey) {
          const sessionExists = db.prepare('SELECT 1 FROM users WHERE user_key = ?').get(sessionRowKey);
          if (sessionExists) {
            upsertUser(db, userKey, action);
            mergeSessionIntoUser(db, sessionRowKey, userKey);
          }
        }
      } else {
        if (sessionRowKey) {
          const linkedAction = db.prepare(
            'SELECT user_key FROM actions WHERE session_id = ? AND user_key NOT LIKE ? LIMIT 1'
          ).get(sessionId, '__session__%');
          userKey = linkedAction ? linkedAction.user_key : sessionRowKey;
        } else {
          userKey = 'unknown';
        }
      }

      upsertUser(db, userKey, action);
      const nextIndex = getNextActionIndex(db, userKey);
      insertAction(db, userKey, nextIndex, action);
    }
  });
  batchInsert();
};

// Direct queue — no file queue needed, SQLite handles concurrency
export const enqueueLogAction = async (payload) => {
  await logUserAction(payload);
};

export const flushLogQueue = async () => {
  // No-op: SQLite writes are immediate, no queue to flush
};

export const getUserLogs = (userIdentifier) => {
  const db = getDb();
  const userKey = sanitizeUserIdentifier(userIdentifier);

  const user = db.prepare('SELECT * FROM users WHERE user_key = ? OR user_identifier = ?').get(userKey, userIdentifier);
  if (!user) return [];

  const actions = db.prepare('SELECT * FROM actions WHERE user_key = ? ORDER BY action_index').all(user.user_key);

  return actions.map((action) => {
    const entry = {};
    DEFAULT_ACTION_FIELDS.forEach((field) => {
      entry[field] = action[field] ?? '';
    });
    entry.chatbot_type = user.chatbot_type || 'general-ai';
    entry.risk_level = user.risk_level || '';
    entry.total_score = user.total_score || '0';

    // Include extra fields
    try {
      const extra = JSON.parse(action.extra_fields || '{}');
      Object.assign(entry, extra);
    } catch {}

    return entry;
  });
};

export const getAllUsers = () => {
  const db = getDb();
  const rows = db.prepare('SELECT user_identifier, user_key FROM users').all();
  return rows.map((r) => r.user_identifier || r.user_key || 'unknown');
};

export const getAggregatedCSVData = () => {
  const db = getDb();
  const users = db.prepare('SELECT * FROM users ORDER BY created_at').all();

  // Collect all unique extra field keys across all actions
  const allExtraKeys = new Set();
  const userActions = new Map();

  for (const user of users) {
    const actions = db.prepare('SELECT * FROM actions WHERE user_key = ? ORDER BY action_index').all(user.user_key);
    userActions.set(user.user_key, actions);

    for (const action of actions) {
      try {
        const extra = JSON.parse(action.extra_fields || '{}');
        Object.keys(extra).forEach((k) => allExtraKeys.add(k));
      } catch {}
    }
  }

  // Build headers dynamically
  const headers = [...BASE_HEADERS];
  let maxActions = 0;

  for (const [, actions] of userActions) {
    if (actions.length > maxActions) maxActions = actions.length;
  }

  const allActionFields = [...DEFAULT_ACTION_FIELDS, ...Array.from(allExtraKeys)];

  for (let i = 1; i <= maxActions; i++) {
    for (const field of allActionFields) {
      headers.push(`action_${i}_${field}`);
    }
  }

  // Build records
  const records = users.map((user) => {
    const actions = userActions.get(user.user_key) || [];
    const record = {
      user_key: user.user_key,
      user_identifier: user.user_identifier,
      chatbot_type: user.chatbot_type,
      risk_level: user.risk_level || '',
      risk_description: user.risk_description || '',
      risk_recommendation: user.risk_recommendation || '',
      total_score: user.total_score || '0',
      action_count: String(actions.length),
      completion_code: user.completion_code || '',
    };

    actions.forEach((action, idx) => {
      const actionNum = idx + 1;
      DEFAULT_ACTION_FIELDS.forEach((field) => {
        record[`action_${actionNum}_${field}`] = action[field] ?? '';
      });
      try {
        const extra = JSON.parse(action.extra_fields || '{}');
        Object.keys(extra).forEach((key) => {
          record[`action_${actionNum}_${key}`] = extra[key] ?? '';
        });
      } catch {}
    });

    return record;
  });

  return { headers, records };
};

// Legacy compatibility
export const getAggregatedCSVFilePath = () => {
  return process.env.CSV_LOG_FILE
    ? path.resolve(String(process.env.CSV_LOG_FILE).trim())
    : path.join(DB_DIR, 'user_actions.csv');
};

export const listUserCsvFiles = () => {
  // No individual CSV files in SQLite mode — return empty
  return [];
};

export const getUserCsvFilePath = (userIdentifier) => {
  const safe = sanitizeUserIdentifier(userIdentifier);
  return path.join(DB_DIR, 'users', `user_${safe}.csv`);
};

// Export DB path for tests
export const getDbPath = () => DB_PATH;

// Close DB (for tests)
export const closeDb = () => {
  if (_db) {
    _db.close();
    _db = null;
  }
};
