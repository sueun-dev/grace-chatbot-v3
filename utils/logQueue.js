import fs from 'fs';
import path from 'path';
import lockfile from 'proper-lockfile';
import { getAggregatedCSVFilePath, logUserActionsBatch } from './csvLogger';

const QUEUE_FILE_ENV = process.env.LOG_QUEUE_FILE ? String(process.env.LOG_QUEUE_FILE).trim() : '';
const QUEUE_OFFSET_ENV = process.env.LOG_QUEUE_OFFSET_FILE ? String(process.env.LOG_QUEUE_OFFSET_FILE).trim() : '';
const CSV_FILE_PATH = getAggregatedCSVFilePath();
const DEFAULT_QUEUE_DIR = path.dirname(CSV_FILE_PATH);
const QUEUE_FILE = QUEUE_FILE_ENV
  ? path.resolve(QUEUE_FILE_ENV)
  : path.join(DEFAULT_QUEUE_DIR, 'action_queue.jsonl');
const OFFSET_FILE = QUEUE_OFFSET_ENV
  ? path.resolve(QUEUE_OFFSET_ENV)
  : path.join(path.dirname(QUEUE_FILE), 'action_queue.offset');

const QUEUE_LOCK_STALE_MS = Number(process.env.QUEUE_LOCK_STALE_MS) || 30_000;
const QUEUE_LOCK_RETRIES = Number(process.env.QUEUE_LOCK_RETRIES) || 20;
const FLUSH_DELAY_MS = Number(process.env.QUEUE_FLUSH_DELAY_MS) || 250;
const DEFAULT_FLUSH_MAX_ACTIONS = 500;
const FLUSH_MAX_ACTIONS_ENV = process.env.QUEUE_FLUSH_MAX_ACTIONS;
const FLUSH_MAX_ACTIONS = FLUSH_MAX_ACTIONS_ENV === undefined
  ? DEFAULT_FLUSH_MAX_ACTIONS
  : Number(FLUSH_MAX_ACTIONS_ENV) || 0;
const DEFAULT_READ_MAX_BYTES = 2 * 1024 * 1024;
const MIN_READ_BYTES = 128 * 1024;
const QUEUE_READ_MAX_BYTES = Math.max(
  MIN_READ_BYTES,
  Number(process.env.QUEUE_READ_MAX_BYTES) || DEFAULT_READ_MAX_BYTES
);
const QUEUE_COMPACT_THRESHOLD_BYTES = Number(process.env.QUEUE_COMPACT_THRESHOLD_BYTES) || 50 * 1024 * 1024;
const QUEUE_COMPACT_CHUNK_BYTES = Number(process.env.QUEUE_COMPACT_CHUNK_BYTES) || 1024 * 1024;

let flushTimer = null;
let flushInFlight = null;
let flushRequested = false;
let fileOpQueue = Promise.resolve();

const enqueueFileOp = (task) => {
  const run = async () => task();
  const chained = fileOpQueue.then(run, run);
  fileOpQueue = chained.catch(() => {});
  return chained;
};

const ensureQueueFiles = () => {
  const dir = path.dirname(QUEUE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(QUEUE_FILE)) {
    fs.writeFileSync(QUEUE_FILE, '');
  }
  if (!fs.existsSync(OFFSET_FILE)) {
    fs.writeFileSync(OFFSET_FILE, '0');
  }
};

const withQueueLock = async (task) => {
  ensureQueueFiles();
  const release = await lockfile.lock(QUEUE_FILE, {
    stale: QUEUE_LOCK_STALE_MS,
    retries: {
      retries: QUEUE_LOCK_RETRIES,
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

const readOffset = (fileSize) => {
  try {
    const raw = fs.readFileSync(OFFSET_FILE, 'utf8').trim();
    const value = Number.parseInt(raw, 10);
    if (!Number.isFinite(value) || value < 0) return 0;
    if (value > fileSize) {
      return 0;
    }
    return value;
  } catch {
    return 0;
  }
};

const writeOffset = (offset) => {
  const temp = `${OFFSET_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(temp, String(offset));
  fs.renameSync(temp, OFFSET_FILE);
};

const compactQueueFile = async (processedOffset) => {
  if (processedOffset < QUEUE_COMPACT_THRESHOLD_BYTES) {
    return;
  }

  await enqueueFileOp(() => {
    const stats = fs.statSync(QUEUE_FILE);
    if (processedOffset >= stats.size) {
      fs.truncateSync(QUEUE_FILE, 0);
      writeOffset(0);
      return;
    }

    const tempPath = `${QUEUE_FILE}.${process.pid}.${Date.now()}.compact`;
    const readFd = fs.openSync(QUEUE_FILE, 'r');
    const writeFd = fs.openSync(tempPath, 'w');
    try {
      let position = processedOffset;
      const bufferSize = Math.min(
        QUEUE_COMPACT_CHUNK_BYTES,
        Math.max(stats.size - processedOffset, 1)
      );
      const buffer = Buffer.alloc(bufferSize);
      while (position < stats.size) {
        const bytesToRead = Math.min(buffer.length, stats.size - position);
        const bytesRead = fs.readSync(readFd, buffer, 0, bytesToRead, position);
        if (!bytesRead) break;
        fs.writeSync(writeFd, buffer, 0, bytesRead);
        position += bytesRead;
      }
    } finally {
      fs.closeSync(readFd);
      fs.closeSync(writeFd);
    }

    fs.renameSync(tempPath, QUEUE_FILE);
    writeOffset(0);
  });
};

const readQueueBuffer = (offset, maxBytes) => {
  const fd = fs.openSync(QUEUE_FILE, 'r');
  try {
    const stats = fs.fstatSync(fd);
    if (offset >= stats.size) {
      return { buffer: Buffer.alloc(0), size: stats.size };
    }
    const remaining = stats.size - offset;
    const length = Math.min(remaining, maxBytes);
    if (length <= 0) {
      return { buffer: Buffer.alloc(0), size: stats.size };
    }
    const buffer = Buffer.alloc(length);
    fs.readSync(fd, buffer, 0, length, offset);
    return { buffer, size: stats.size };
  } finally {
    fs.closeSync(fd);
  }
};

const parseQueueBuffer = (buffer, maxActions) => {
  if (!buffer.length) {
    return { actions: [], bytesProcessed: 0 };
  }
  const lastNewline = buffer.lastIndexOf(0x0A);
  if (lastNewline === -1) {
    return { actions: [], bytesProcessed: 0 };
  }

  const slice = buffer.subarray(0, lastNewline);
  const lines = slice.toString('utf8').split('\n');
  const limited = maxActions > 0 ? lines.slice(0, maxActions) : lines;
  const actions = [];

  limited.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return;
    }
    try {
      actions.push(JSON.parse(trimmed));
    } catch (err) {
      throw new Error(`Invalid queue line: ${err?.message || err}`);
    }
  });

  const bytesProcessed = limited.length === lines.length
    ? lastNewline + 1
    : limited.reduce((sum, line) => sum + Buffer.byteLength(line, 'utf8') + 1, 0);

  return { actions, bytesProcessed };
};

const scheduleFlush = () => {
  flushRequested = true;
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    triggerFlush();
  }, FLUSH_DELAY_MS);
};

const triggerFlush = () => {
  if (!flushRequested) return;
  if (flushInFlight) {
    return;
  }
  flushRequested = false;
  flushInFlight = flushLogQueue()
    .catch((err) => {
      console.error('Queue flush failed', { error: err?.message, stack: err?.stack });
    })
    .finally(() => {
      flushInFlight = null;
      if (flushRequested) {
        scheduleFlush();
      }
    });
};

export const enqueueLogAction = async (payload) => {
  ensureQueueFiles();
  const line = `${JSON.stringify(payload)}\n`;
  await enqueueFileOp(() => fs.promises.appendFile(QUEUE_FILE, line, 'utf8'));
  scheduleFlush();
};

export const flushLogQueue = async () => {
  return withQueueLock(async () => {
    const stats = fs.statSync(QUEUE_FILE);
    const offset = readOffset(stats.size);
    if (offset >= stats.size) {
      return;
    }

    const { buffer, size } = readQueueBuffer(offset, QUEUE_READ_MAX_BYTES);
    if (!buffer.length) {
      return;
    }

    const { actions, bytesProcessed } = parseQueueBuffer(buffer, FLUSH_MAX_ACTIONS);
    if (!bytesProcessed) {
      return;
    }

    if (actions.length) {
      await logUserActionsBatch(actions);
    }

    const nextOffset = offset + bytesProcessed;
    writeOffset(nextOffset);
    await compactQueueFile(nextOffset);

    if (FLUSH_MAX_ACTIONS > 0 && actions.length >= FLUSH_MAX_ACTIONS) {
      scheduleFlush();
    } else if (offset + bytesProcessed < size) {
      scheduleFlush();
    }
  });
};
