// Client-side logging helper
export const logAction = async (actionData) => {
  try {
    // Get user identifier from sessionStorage
    const userIdentifier = sessionStorage.getItem('userIdentifier') || '';
    const sessionId = sessionStorage.getItem('sessionId') || generateSessionId();
    
    // Store session ID if not exists
    if (!sessionStorage.getItem('sessionId')) {
      sessionStorage.setItem('sessionId', sessionId);
    }
    
    const logData = {
      ...actionData,
      userIdentifier,
      sessionId,
      chatbotType: 'doctor-ai'
    };
    
    const response = await fetch('/api/log-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData),
    });
    
    if (!response.ok) {
      console.error('Failed to log action');
    }
  } catch (error) {
    console.error('Error logging action:', error);
  }
};

// Generate unique session ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Action types for consistent logging
export const ACTION_TYPES = {
  // Authentication
  CODE_ENTERED: 'code_entered',
  CODE_VERIFIED: 'code_verified',
  
  // Navigation
  PAGE_VISITED: 'page_visited',
  CHAT_STARTED: 'chat_started',
  
  // Questionnaire
  QUESTIONNAIRE_STARTED: 'questionnaire_started',
  QUESTIONNAIRE_OPTION_SELECTED: 'questionnaire_option_selected',
  QUESTIONNAIRE_COMPLETED: 'questionnaire_completed',
  
  // Scenario
  SCENARIO_STARTED: 'scenario_started',
  SCENARIO_OPTION_SELECTED: 'scenario_option_selected',
  SCENARIO_COMPLETED: 'scenario_completed',
  
  // Simulation
  SIMULATION_STARTED: 'simulation_started',
  SIMULATION_INPUT: 'simulation_input',
  SIMULATION_OPTION_SELECTED: 'simulation_option_selected',
  SIMULATION_COMPLETED: 'simulation_completed',
  
  // Messages
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  OPTION_SELECTED: 'option_selected',
  
  // General
  BUTTON_CLICKED: 'button_clicked',
  SESSION_ENDED: 'session_ended',
};