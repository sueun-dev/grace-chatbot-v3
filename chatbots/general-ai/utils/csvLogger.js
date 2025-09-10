// CSV Logging Utility for tracking user interactions
import fs from 'fs';
import path from 'path';

const CSV_DIR = path.join(process.cwd(), 'user_logs');
const CSV_FILE = path.join(CSV_DIR, 'user_interactions.csv');

// Ensure CSV directory exists
export const ensureCSVDirectory = () => {
  if (!fs.existsSync(CSV_DIR)) {
    fs.mkdirSync(CSV_DIR, { recursive: true });
  }
};

// Initialize CSV file with headers if it doesn't exist
export const initializeCSV = () => {
  ensureCSVDirectory();
  
  if (!fs.existsSync(CSV_FILE)) {
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
    
    fs.writeFileSync(CSV_FILE, headers + '\n');
  }
};

// Log user action to CSV
export const logUserAction = (data) => {
  ensureCSVDirectory();
  initializeCSV();
  
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
  
  fs.appendFileSync(CSV_FILE, row + '\n');
};

// Get all logs for a specific user
export const getUserLogs = (userIdentifier) => {
  if (!fs.existsSync(CSV_FILE)) {
    return [];
  }
  
  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  const userLogs = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].includes(userIdentifier)) {
      const values = lines[i].split(',');
      const log = {};
      headers.forEach((header, index) => {
        log[header] = values[index];
      });
      if (log.user_identifier === userIdentifier) {
        userLogs.push(log);
      }
    }
  }
  
  return userLogs;
};