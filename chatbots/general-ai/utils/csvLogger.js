// CSV Logging Utility for tracking user interactions
import fs from 'fs';
import path from 'path';

const CSV_DIR = path.join(process.cwd(), 'user_logs');

// Get CSV file path for specific user
const getUserCSVPath = (userIdentifier) => {
  const safeUserId = userIdentifier ? userIdentifier.replace(/[^a-zA-Z0-9_-]/g, '_') : 'unknown';
  return path.join(CSV_DIR, `user_${safeUserId}.csv`);
};

// Ensure CSV directory exists
export const ensureCSVDirectory = () => {
  if (!fs.existsSync(CSV_DIR)) {
    fs.mkdirSync(CSV_DIR, { recursive: true });
  }
};

// Initialize CSV file with headers if it doesn't exist for specific user
export const initializeUserCSV = (userIdentifier) => {
  ensureCSVDirectory();

  const csvPath = getUserCSVPath(userIdentifier);

  if (!fs.existsSync(csvPath)) {
    const headers = [
      'timestamp',
      'user_identifier',
      'session_id',
      'action_type',
      'action_details',
      'question_id',
      'response',
      'score',
      'scenario_type',
      'message_content',
      'option_selected',
      'page_visited',
      'chatbot_type'
    ].join(',');

    fs.writeFileSync(csvPath, headers + '\n');
  }
};

// Log user action to CSV
export const logUserAction = (data) => {
  const userIdentifier = data.userIdentifier || 'unknown';

  ensureCSVDirectory();
  initializeUserCSV(userIdentifier);

  const csvPath = getUserCSVPath(userIdentifier);

  const row = [
    new Date().toISOString(),
    data.userIdentifier || '',
    data.sessionId || '',
    data.actionType || '',
    data.actionDetails || '',
    data.questionId || '',
    data.response || '',
    data.score || '',
    data.scenarioType || '',
    data.messageContent || '',
    data.optionSelected || '',
    data.pageVisited || '',
    data.chatbotType || 'general-ai'
  ].map(field => {
    // Escape fields containing commas, quotes, or newlines
    const fieldStr = String(field);
    if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n')) {
      return `"${fieldStr.replace(/"/g, '""')}"`;
    }
    return fieldStr;
  }).join(',');

  fs.appendFileSync(csvPath, row + '\n');
};

// Get all logs for a specific user
export const getUserLogs = (userIdentifier) => {
  const csvPath = getUserCSVPath(userIdentifier);

  if (!fs.existsSync(csvPath)) {
    return [];
  }

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');

  if (lines.length <= 1) {
    return [];
  }

  const headers = lines[0].split(',');
  const userLogs = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const log = {};
    headers.forEach((header, index) => {
      log[header] = values[index];
    });
    userLogs.push(log);
  }

  return userLogs;
};

// Get list of all users with CSV files
export const getAllUsers = () => {
  ensureCSVDirectory();

  const files = fs.readdirSync(CSV_DIR);
  const users = [];

  files.forEach(file => {
    if (file.startsWith('user_') && file.endsWith('.csv')) {
      const userId = file.replace('user_', '').replace('.csv', '');
      users.push(userId);
    }
  });

  return users;
};