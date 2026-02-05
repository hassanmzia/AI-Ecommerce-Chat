const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:3067';
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT, 10) || 30000;

/**
 * Create a pre-configured axios instance for the AI service.
 */
const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: AI_SERVICE_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for logging
aiClient.interceptors.response.use(
  (response) => {
    console.log(`AI Service [${response.config.method.toUpperCase()}] ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    const status = error.response ? error.response.status : 'NETWORK_ERROR';
    const url = error.config ? error.config.url : 'unknown';
    console.error(`AI Service Error [${status}] ${url}:`, error.message);
    return Promise.reject(error);
  }
);

/**
 * Send a chat message to the AI service and get a response.
 *
 * @param {string} message          The user's message text
 * @param {string} conversationId   The conversation UUID (optional)
 * @param {string} userId           The user UUID (optional)
 * @param {object} context          Additional context (user profile, order history, etc.)
 * @returns {Promise<object>}       The AI service response
 */
const sendMessage = async (message, conversationId = null, userId = null, context = {}) => {
  try {
    const payload = {
      message,
      conversation_id: conversationId,
      user_id: userId,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
      },
    };

    const response = await aiClient.post('/api/chat/message', payload);

    return {
      success: true,
      data: {
        response: response.data.response || response.data.message || response.data,
        tool_calls: response.data.tool_calls || null,
        metadata: response.data.metadata || {},
        conversation_id: response.data.conversation_id || conversationId,
      },
    };
  } catch (error) {
    // If the AI service is unavailable, return a fallback response
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('AI Service unavailable:', error.message);
      return {
        success: false,
        data: {
          response: 'I apologize, but I am currently unable to process your request. Our AI service is temporarily unavailable. Please try again in a few moments.',
          tool_calls: null,
          metadata: { error: 'ai_service_unavailable', timestamp: new Date().toISOString() },
          conversation_id: conversationId,
        },
      };
    }

    // If the AI service returned an error response
    if (error.response) {
      return {
        success: false,
        data: {
          response: error.response.data?.error || 'An error occurred while processing your request.',
          tool_calls: null,
          metadata: {
            error: 'ai_service_error',
            status: error.response.status,
            timestamp: new Date().toISOString(),
          },
          conversation_id: conversationId,
        },
      };
    }

    throw error;
  }
};

/**
 * Validate user input text using the AI service's input guard.
 *
 * @param {string} text  The input text to validate
 * @returns {Promise<object>}  Validation result
 */
const validateInput = async (text) => {
  try {
    const response = await aiClient.post('/api/validate/input', {
      text,
      timestamp: new Date().toISOString(),
    });

    return {
      is_valid: response.data.is_valid !== false,
      category: response.data.category || 'general',
      flags: response.data.flags || [],
      confidence: response.data.confidence || 1.0,
    };
  } catch (error) {
    console.error('Input validation error:', error.message);
    // Default to allowing the input if validation service is down
    return {
      is_valid: true,
      category: 'unvalidated',
      flags: ['validation_service_unavailable'],
      confidence: 0,
    };
  }
};

/**
 * Validate AI output text using the AI service's output guard.
 *
 * @param {string} text  The output text to validate
 * @returns {Promise<object>}  Validation result
 */
const validateOutput = async (text) => {
  try {
    const response = await aiClient.post('/api/validate/output', {
      text,
      timestamp: new Date().toISOString(),
    });

    return {
      is_valid: response.data.is_valid !== false,
      contains_pii: response.data.contains_pii || false,
      factual_accuracy: response.data.factual_accuracy || 'unverified',
      flags: response.data.flags || [],
      sanitized_text: response.data.sanitized_text || text,
    };
  } catch (error) {
    console.error('Output validation error:', error.message);
    return {
      is_valid: true,
      contains_pii: false,
      factual_accuracy: 'unverified',
      flags: ['validation_service_unavailable'],
      sanitized_text: text,
    };
  }
};

/**
 * Check the health of the AI service.
 *
 * @returns {Promise<object>}  Health status
 */
const getAgentHealth = async () => {
  try {
    const startTime = Date.now();
    const response = await aiClient.get('/api/health', { timeout: 5000 });
    const latency = Date.now() - startTime;

    return {
      status: 'healthy',
      latency_ms: latency,
      service_url: AI_SERVICE_URL,
      details: response.data || {},
      checked_at: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency_ms: null,
      service_url: AI_SERVICE_URL,
      error: error.message,
      checked_at: new Date().toISOString(),
    };
  }
};

/**
 * Get available agent types from the AI service.
 *
 * @returns {Promise<object>}
 */
const getAgentTypes = async () => {
  try {
    const response = await aiClient.get('/api/agents');
    return {
      success: true,
      agents: response.data.agents || response.data || [],
    };
  } catch (error) {
    console.error('Get agent types error:', error.message);
    return {
      success: false,
      agents: [],
      error: error.message,
    };
  }
};

module.exports = {
  sendMessage,
  validateInput,
  validateOutput,
  getAgentHealth,
  getAgentTypes,
  aiClient,
};
