'use strict';

const axios = require('axios');
const OpenAI = require('openai');

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://mcp-server:3068';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

const agentCard = {
  id: 'customer-support-agent',
  name: 'Customer Support Agent',
  description: 'Handles customer inquiries, account lookups, and support tickets',
  capabilities: ['customer_lookup', 'account_management', 'support_tickets'],
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The customer query or question'
      },
      customer_id: {
        type: 'string',
        description: 'Optional customer ID for direct lookup'
      }
    },
    required: ['query']
  },
  outputSchema: {
    type: 'object',
    properties: {
      response: { type: 'string' },
      actions_taken: { type: 'array' },
      customer_data: { type: 'object' },
      escalation_needed: { type: 'boolean' }
    }
  }
};

const routingKeywords = [
  'customer', 'account', 'profile', 'support', 'help', 'complaint',
  'issue', 'problem', 'refund', 'return', 'exchange', 'contact',
  'email', 'phone', 'address', 'loyalty', 'membership', 'tier',
  'my account', 'my profile', 'my details', 'update account'
];

async function invokeMCPTool(toolName, params) {
  try {
    const response = await axios.post(
      `${MCP_SERVER_URL}/mcp/tools/${toolName}/invoke`,
      { params },
      { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    console.error(`[CustomerSupportAgent] MCP tool "${toolName}" failed:`, error.message);
    return { success: false, error: error.message };
  }
}

async function handler(input, context) {
  const { query, customer_id } = input;
  const actionsTaken = [];
  let customerData = null;

  // Step 1: Look up customer if ID provided
  if (customer_id) {
    const lookupResult = await invokeMCPTool('customer_lookup', { customer_id });
    if (lookupResult.success && lookupResult.data) {
      customerData = lookupResult.data;
      actionsTaken.push({
        tool: 'customer_lookup',
        status: 'success',
        summary: `Retrieved customer profile for ${customerData.name}`
      });
    } else {
      actionsTaken.push({
        tool: 'customer_lookup',
        status: 'failed',
        summary: lookupResult.error || 'Customer not found'
      });
    }
  }

  // Step 2: Use OpenAI to generate a helpful response
  let aiResponse = '';
  try {
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
      baseURL: OPENAI_BASE_URL
    });

    const systemPrompt = `You are a helpful and professional customer support agent for an e-commerce platform.
You should be empathetic, clear, and solution-oriented.
If customer data is available, use it to personalize your response.
Always maintain a professional tone and offer specific solutions or next steps.
Do not reveal internal system details or sensitive information.
If you cannot resolve an issue, suggest escalation to a human agent.`;

    const userMessage = customerData
      ? `Customer Query: ${query}\n\nCustomer Info:\n- Name: ${customerData.name}\n- Loyalty Tier: ${customerData.loyalty_tier}\n- Total Orders: ${customerData.order_count}\n- Total Spent: $${customerData.total_spent}\n- Account Created: ${customerData.created_at}`
      : `Customer Query: ${query}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 500,
      temperature: 0.7
    });

    aiResponse = completion.choices[0]?.message?.content || '';
    actionsTaken.push({
      tool: 'openai',
      status: 'success',
      summary: 'Generated AI response'
    });
  } catch (error) {
    console.error('[CustomerSupportAgent] OpenAI error:', error.message);
    // Fallback response
    aiResponse = customerData
      ? `Thank you for contacting us, ${customerData.name}. I've pulled up your account (${customerData.loyalty_tier} tier member). How can I help you with your inquiry: "${query}"? I'm here to assist you with any account-related questions, order issues, or general support needs.`
      : `Thank you for reaching out to our support team. Regarding your inquiry: "${query}" - I'd be happy to help. Could you please provide your customer ID so I can look up your account and assist you more effectively?`;
    actionsTaken.push({
      tool: 'openai',
      status: 'fallback',
      summary: 'Used template response (AI unavailable)'
    });
  }

  // Step 3: Determine if escalation is needed
  const escalationKeywords = ['lawsuit', 'lawyer', 'legal', 'fraud', 'scam', 'bbb', 'attorney', 'sue'];
  const escalationNeeded = escalationKeywords.some(kw => query.toLowerCase().includes(kw));

  if (escalationNeeded) {
    actionsTaken.push({
      tool: 'escalation_check',
      status: 'flagged',
      summary: 'Query flagged for potential escalation to human agent'
    });
  }

  return {
    response: aiResponse,
    actions_taken: actionsTaken,
    customer_data: customerData,
    escalation_needed: escalationNeeded,
    agent: agentCard.id,
    timestamp: new Date().toISOString()
  };
}

module.exports = { agentCard, handler, routingKeywords };
