const db = require('../config/database');
const aiService = require('../services/aiService');
const { cacheGet, cacheSet } = require('../config/redis');
const wsHandler = require('../websocket/handler');

/**
 * Handle an incoming chat message:
 *  1. Resolve or create a conversation
 *  2. Validate user input
 *  3. Store the user message in the database
 *  4. Send the message to the AI service
 *  5. Validate AI output
 *  6. Store the assistant response in the database
 *  7. Log the agent execution
 *  8. Send real-time WebSocket updates
 *
 * @param {object} params
 * @param {string} params.message         The user's message text
 * @param {string} params.conversationId  Existing conversation UUID (optional)
 * @param {string} params.userId          The authenticated user's UUID (optional for anonymous)
 * @param {object} params.user            The full user object (optional)
 * @returns {Promise<object>}
 */
const handleMessage = async ({ message, conversationId, userId, user }) => {
  const startTime = Date.now();

  try {
    // ----------------------------------------------------------
    // 1. Resolve or create the conversation
    // ----------------------------------------------------------
    let conversation;

    if (conversationId) {
      const convResult = await db.query(
        'SELECT * FROM conversations WHERE id = $1',
        [conversationId]
      );

      if (convResult.rows.length === 0) {
        // Guest users have transient conversation IDs not stored in DB
        // Treat as anonymous — skip DB storage but still process via AI
        if (!userId) {
          conversation = null;
        } else {
          throw Object.assign(new Error('Conversation not found'), { statusCode: 404 });
        }
      } else {
        conversation = convResult.rows[0];

        // Verify ownership if user is authenticated
        if (userId && conversation.user_id !== userId) {
          throw Object.assign(new Error('Access denied to this conversation'), { statusCode: 403 });
        }
      }
    } else if (userId) {
      // Create a new conversation for the authenticated user
      const title = message.length > 60 ? message.substring(0, 57) + '...' : message;
      const convResult = await db.query(
        `INSERT INTO conversations (user_id, title, metadata)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [userId, title, JSON.stringify({ source: 'web', started_at: new Date().toISOString() })]
      );
      conversation = convResult.rows[0];
    } else {
      // Anonymous: return conversation_id as null and skip DB storage
      // We still send to the AI service
    }

    // ----------------------------------------------------------
    // 2. Validate user input
    // ----------------------------------------------------------
    let inputValidation = { is_valid: true, category: 'general', flags: [] };
    try {
      inputValidation = await aiService.validateInput(message);
    } catch (err) {
      console.error('Input validation failed (non-blocking):', err.message);
    }

    const validationStatus = inputValidation.is_valid ? 'valid' : 'flagged';

    // ----------------------------------------------------------
    // 3. Store user message in the database
    // ----------------------------------------------------------
    let userMessageRecord = null;
    if (conversation) {
      const msgResult = await db.query(
        `INSERT INTO messages (conversation_id, role, content, validation_status, metadata)
         VALUES ($1, 'user', $2, $3, $4)
         RETURNING id, conversation_id, role, content, validation_status, metadata, created_at`,
        [
          conversation.id,
          message,
          validationStatus,
          JSON.stringify({
            input_validation: inputValidation,
          }),
        ]
      );
      userMessageRecord = msgResult.rows[0];
    }

    // ----------------------------------------------------------
    // 4. Send typing indicator via WebSocket
    // ----------------------------------------------------------
    if (userId) {
      wsHandler.sendToUser(userId, {
        type: 'typing_indicator',
        data: {
          conversation_id: conversation ? conversation.id : null,
          is_typing: true,
        },
      });
    }

    // ----------------------------------------------------------
    // 5. Send to AI service
    // ----------------------------------------------------------
    const userContext = user
      ? {
          user_name: user.full_name,
          user_email: user.email,
          loyalty_tier: user.loyalty_tier,
          loyalty_points: user.loyalty_points,
        }
      : {};

    const aiResponse = await aiService.sendMessage(
      message,
      conversation ? conversation.id : null,
      userId,
      userContext
    );

    const assistantMessage = aiResponse.data.response;
    const toolCalls = aiResponse.data.tool_calls;

    // ----------------------------------------------------------
    // 6. Validate AI output
    // ----------------------------------------------------------
    let outputValidation = { is_valid: true, flags: [], sanitized_text: assistantMessage };
    try {
      outputValidation = await aiService.validateOutput(
        typeof assistantMessage === 'string' ? assistantMessage : JSON.stringify(assistantMessage)
      );
    } catch (err) {
      console.error('Output validation failed (non-blocking):', err.message);
    }

    const responseText = outputValidation.sanitized_text || assistantMessage;
    const outputStatus = outputValidation.is_valid ? 'valid' : 'flagged';

    // ----------------------------------------------------------
    // 7. Store assistant message in the database
    // ----------------------------------------------------------
    let assistantMessageRecord = null;
    if (conversation) {
      const asstResult = await db.query(
        `INSERT INTO messages (conversation_id, role, content, tool_calls, validation_status, metadata)
         VALUES ($1, 'assistant', $2, $3, $4, $5)
         RETURNING id, conversation_id, role, content, tool_calls, validation_status, metadata, created_at`,
        [
          conversation.id,
          typeof responseText === 'string' ? responseText : JSON.stringify(responseText),
          toolCalls ? JSON.stringify(toolCalls) : null,
          outputStatus,
          JSON.stringify({
            ai_service_success: aiResponse.success,
            output_validation: outputValidation,
            ...aiResponse.data.metadata,
          }),
        ]
      );
      assistantMessageRecord = asstResult.rows[0];

      // Update conversation title and updated_at
      await db.query(
        'UPDATE conversations SET updated_at = NOW() WHERE id = $1',
        [conversation.id]
      );
    }

    // ----------------------------------------------------------
    // 8. Log agent execution
    // ----------------------------------------------------------
    const executionTime = Date.now() - startTime;
    if (conversation) {
      await db.query(
        `INSERT INTO agent_executions (agent_type, conversation_id, input_data, output_data, status, execution_time_ms)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'chat_agent',
          conversation.id,
          JSON.stringify({ message, user_id: userId, input_validation: inputValidation }),
          JSON.stringify({
            response: typeof responseText === 'string'
              ? responseText.substring(0, 500)
              : JSON.stringify(responseText).substring(0, 500),
            tool_calls: toolCalls,
            output_validation: outputValidation,
          }),
          aiResponse.success ? 'completed' : 'failed',
          executionTime,
        ]
      );
    }

    // ----------------------------------------------------------
    // 9. Send real-time updates via WebSocket
    // ----------------------------------------------------------
    if (userId) {
      // Stop typing indicator
      wsHandler.sendToUser(userId, {
        type: 'typing_indicator',
        data: {
          conversation_id: conversation ? conversation.id : null,
          is_typing: false,
        },
      });

      // Send the assistant message
      wsHandler.sendToUser(userId, {
        type: 'chat_message',
        data: {
          conversation_id: conversation ? conversation.id : null,
          message: assistantMessageRecord || {
            role: 'assistant',
            content: responseText,
            tool_calls: toolCalls,
            created_at: new Date().toISOString(),
          },
        },
      });
    }

    // ----------------------------------------------------------
    // 10. Build and return the response
    // ----------------------------------------------------------
    return {
      conversation_id: conversation ? conversation.id : null,
      user_message: userMessageRecord
        ? {
            id: userMessageRecord.id,
            role: 'user',
            content: message,
            created_at: userMessageRecord.created_at,
          }
        : null,
      assistant_message: {
        id: assistantMessageRecord ? assistantMessageRecord.id : null,
        role: 'assistant',
        content: responseText,
        tool_calls: toolCalls,
        validation_status: outputStatus,
        created_at: assistantMessageRecord ? assistantMessageRecord.created_at : new Date().toISOString(),
      },
      metadata: {
        execution_time_ms: executionTime,
        input_validation: {
          is_valid: inputValidation.is_valid,
          category: inputValidation.category,
        },
        output_validation: {
          is_valid: outputValidation.is_valid,
        },
        ai_service_available: aiResponse.success,
      },
    };
  } catch (error) {
    // Stop typing indicator on error
    if (userId) {
      wsHandler.sendToUser(userId, {
        type: 'typing_indicator',
        data: {
          conversation_id: conversationId || null,
          is_typing: false,
        },
      });
    }

    throw error;
  }
};

module.exports = {
  handleMessage,
};
